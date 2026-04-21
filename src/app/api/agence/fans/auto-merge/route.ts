import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { findMergeCandidates, toFanHandles } from "@/lib/fan-matcher";

/**
 * Auto-merge candidate scanner.
 *
 * GET  /api/agence/fans/auto-merge?model_id=&threshold=0.85&limit=50
 *   → Returns { pairs: [{ source, target, score, reason }] } without mutating anything.
 *   → Used by the admin UI to review proposed merges before confirming.
 *
 * POST /api/agence/fans/auto-merge
 *   Body : { model_id?: string, threshold?: number, apply?: boolean }
 *   → With apply=true and threshold >= 0.95 (default), applies merges automatically.
 *   → Otherwise returns the same pairs as GET.
 *
 * Auth : root only.
 *
 * Strategy :
 *   - Scan all non-merged fans (optionally scoped to a model).
 *   - For each fan, compute candidates via findMergeCandidates().
 *   - Keep pairs above threshold, dedupe (source<target by id string).
 *   - In `apply` mode : call the merge logic for pairs with score >= 0.95.
 */
export async function GET(req: NextRequest) {
  return handle(req, { method: "GET" });
}

export async function POST(req: NextRequest) {
  return handle(req, { method: "POST" });
}

async function handle(req: NextRequest, opts: { method: "GET" | "POST" }) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json({ error: "Root access required" }, { status: 403 });
  }

  let body: { model_id?: string; threshold?: number; apply?: boolean; limit?: number } = {};
  if (opts.method === "POST") {
    body = await req.json().catch(() => ({}));
  }
  const sp = req.nextUrl.searchParams;
  const modelId = body.model_id || sp.get("model_id") || undefined;
  const threshold = Math.min(
    Math.max(Number(body.threshold ?? sp.get("threshold") ?? 0.85), 0.5),
    1
  );
  const limit = Math.min(Math.max(Number(body.limit ?? sp.get("limit") ?? 50), 1), 200);
  const apply = opts.method === "POST" && body.apply === true;
  const applyThreshold = 0.95; // high-confidence auto-apply floor

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Load active (non-merged) fans, optionally scoped to a model
  const selectCols =
    "id, handles, fingerprint_hash, last_seen, pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle, merged_into_id";
  let fanQuery = db
    .from("agence_fans")
    .select(selectCols)
    .is("merged_into_id", null)
    .order("last_seen", { ascending: false, nullsFirst: false })
    .limit(500);

  if (modelId) {
    // Scope via linked clients or IG conversations
    const [clientsRes, igRes] = await Promise.all([
      db.from("agence_clients").select("fan_id").eq("model", modelId).not("fan_id", "is", null),
      db
        .from("instagram_conversations")
        .select("fan_id")
        .eq("model_slug", modelId)
        .not("fan_id", "is", null),
    ]);
    const scoped = new Set<string>();
    for (const c of (clientsRes.data as Array<{ fan_id: string }> | null) || []) scoped.add(c.fan_id);
    for (const c of (igRes.data as Array<{ fan_id: string }> | null) || []) scoped.add(c.fan_id);
    if (scoped.size === 0) {
      return NextResponse.json({ pairs: [], scanned: 0, model_id: modelId });
    }
    fanQuery = fanQuery.in("id", Array.from(scoped));
  }

  const { data: fans, error: fansErr } = await fanQuery;
  if (fansErr) {
    return NextResponse.json({ error: fansErr.message }, { status: 500 });
  }

  const rows = (fans as Array<{
    id: string;
    handles: Record<string, string> | null;
    fingerprint_hash: string | null;
    last_seen: string | null;
    pseudo_web: string | null;
    pseudo_insta: string | null;
    pseudo_snap: string | null;
    fanvue_handle: string | null;
  }> | null) || [];

  // Pair collection, dedupe by unordered (a,b) key
  type Pair = {
    source_id: string;
    target_id: string;
    score: number;
    reason: string;
    matched_on: string[];
  };
  const pairs = new Map<string, Pair>();

  for (const row of rows) {
    const handles = toFanHandles(row);
    if (Object.keys(handles).length === 0 && !row.fingerprint_hash) continue;

    const candidates = await findMergeCandidates(db, handles, row.fingerprint_hash, {
      excludeFanId: row.id,
      limit: 5,
    });

    for (const c of candidates) {
      if (c.score < threshold) continue;
      // Stable ordering : lower id becomes target (canonical survivor) only when applying.
      // For review we keep source = the fan being scanned, target = the candidate.
      const key = [row.id, c.id].sort().join("|");
      const existing = pairs.get(key);
      if (!existing || c.score > existing.score) {
        pairs.set(key, {
          source_id: row.id,
          target_id: c.id,
          score: c.score,
          reason: c.reason,
          matched_on: c.matched_on,
        });
      }
    }
  }

  const pairList = Array.from(pairs.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If not applying, return as a review payload
  if (!apply) {
    return NextResponse.json({
      pairs: pairList,
      scanned: rows.length,
      threshold,
      apply: false,
      model_id: modelId || null,
    });
  }

  // Apply : only pairs >= applyThreshold, sequentially (avoid cascading conflicts)
  const applied: Array<{ source_id: string; target_id: string; score: number }> = [];
  const skipped: Array<{ source_id: string; target_id: string; reason: string }> = [];
  const mergedNow = new Set<string>();
  const actor = String((user as { sub?: string }).sub || "unknown");
  const now = new Date().toISOString();

  for (const p of pairList) {
    if (p.score < applyThreshold) {
      skipped.push({ ...p, reason: `score ${p.score.toFixed(2)} < ${applyThreshold}` });
      continue;
    }
    // Skip if either side was already merged in this batch
    if (mergedNow.has(p.source_id) || mergedNow.has(p.target_id)) {
      skipped.push({ ...p, reason: "cascading merge avoided" });
      continue;
    }

    // Canonical survivor = side with older last_seen fan (or lowest id as deterministic tiebreak)
    // Simpler: source merges into target (as reported). Ensure target is still alive.
    const { data: tgt } = await db
      .from("agence_fans")
      .select("id, handles, merge_history, merged_into_id")
      .eq("id", p.target_id)
      .maybeSingle();
    if (!tgt || tgt.merged_into_id) {
      skipped.push({ ...p, reason: "target already merged" });
      continue;
    }
    const { data: src } = await db
      .from("agence_fans")
      .select("id, handles, merge_history, merged_into_id, pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle")
      .eq("id", p.source_id)
      .maybeSingle();
    if (!src || src.merged_into_id) {
      skipped.push({ ...p, reason: "source already merged" });
      continue;
    }

    // Reparent
    await db.from("agence_clients").update({ fan_id: p.target_id }).eq("fan_id", p.source_id);
    await db
      .from("instagram_conversations")
      .update({ fan_id: p.target_id })
      .eq("fan_id", p.source_id);

    // Merge handles
    const srcHandles = toFanHandles(src);
    const tgtHandles = toFanHandles(tgt);
    const merged = { ...srcHandles, ...tgtHandles };

    const targetHistory = Array.isArray(tgt.merge_history) ? tgt.merge_history : [];
    const sourceHistory = Array.isArray(src.merge_history) ? src.merge_history : [];

    await db
      .from("agence_fans")
      .update({
        handles: merged,
        merge_history: [
          ...targetHistory,
          {
            at: now,
            direction: "in",
            peer_id: p.source_id,
            by: actor,
            reason: `auto-merge score=${p.score.toFixed(2)} matched=${p.matched_on.join(",")}`,
            merged_handles: srcHandles,
          },
        ],
        updated_at: now,
      })
      .eq("id", p.target_id);

    await db
      .from("agence_fans")
      .update({
        merged_into_id: p.target_id,
        merge_history: [
          ...sourceHistory,
          {
            at: now,
            direction: "out",
            peer_id: p.target_id,
            by: actor,
            reason: `auto-merge score=${p.score.toFixed(2)} matched=${p.matched_on.join(",")}`,
          },
        ],
        updated_at: now,
      })
      .eq("id", p.source_id);

    mergedNow.add(p.source_id);
    applied.push({ source_id: p.source_id, target_id: p.target_id, score: p.score });
  }

  return NextResponse.json({
    applied,
    skipped,
    scanned: rows.length,
    threshold,
    apply_threshold: applyThreshold,
    model_id: modelId || null,
  });
}

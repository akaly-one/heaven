import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { bigramSimilarity, normalizeHandle, toFanHandles, type FanHandles } from "@/lib/fan-matcher";

/**
 * GET /api/agence/fans/search
 *   ?q=          : free-text search across handles + legacy pseudos + phone + email
 *   ?exclude=    : optional fan id to exclude from results (e.g. when picking a merge target)
 *   ?model_id=   : optional model scope (filters to fans linked to a model via agence_clients or IG)
 *   ?fuzzy=0     : disable bigram fuzzy matching (default on)
 *   ?limit=      : max results (default 20, max 50)
 *
 * Returns : { results: [{ id, handles, score, matched_on, last_seen, ... }] }
 *
 * Auth : root only — global fan search, sensitive data.
 *
 * Scoring :
 *   - exact handle match                       → 1.00
 *   - substring (ilike) match                  → 0.60 + 0.30 * (q/field)
 *   - bigram similarity > 0.5                  → sim * 0.90 (capped below exact)
 *
 * Used by the fan-merge picker AND by the auto-merge candidate review.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const exclude = sp.get("exclude");
  const modelId = sp.get("model_id");
  const fuzzy = sp.get("fuzzy") !== "0";
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "20", 10) || 20, 1), 50);

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const normQ = normalizeHandle(q) || q.toLowerCase();
  const qEscaped = normQ.replace(/[%,]/g, "");

  const cols = ["pseudo_web", "pseudo_insta", "pseudo_snap", "fanvue_handle", "phone", "email"];
  const orParts: string[] = cols.map((c) => `${c}.ilike.%${qEscaped}%`);
  orParts.push(`handles::text.ilike.%${qEscaped}%`);

  let query = db
    .from("agence_fans")
    .select(
      "id, handles, pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle, phone, email, last_seen, fingerprint_hash"
    )
    .or(orParts.join(","))
    .is("merged_into_id", null)
    .order("last_seen", { ascending: false, nullsFirst: false })
    .limit(100);

  if (exclude) query = query.neq("id", exclude);

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional model scope — restrict to fans attached to the given model via
  // agence_clients.model or instagram_conversations.model_slug.
  let scopeFilter: Set<string> | null = null;
  if (modelId) {
    const [clientsRes, igRes] = await Promise.all([
      db.from("agence_clients").select("fan_id").eq("model", modelId).not("fan_id", "is", null),
      db
        .from("instagram_conversations")
        .select("fan_id")
        .eq("model_slug", modelId)
        .not("fan_id", "is", null),
    ]);
    const ids = new Set<string>();
    for (const c of (clientsRes.data as Array<{ fan_id: string }> | null) || []) ids.add(c.fan_id);
    for (const c of (igRes.data as Array<{ fan_id: string }> | null) || []) ids.add(c.fan_id);
    scopeFilter = ids;
  }

  type Row = {
    id: string;
    handles: FanHandles | null;
    pseudo_web: string | null;
    pseudo_insta: string | null;
    pseudo_snap: string | null;
    fanvue_handle: string | null;
    phone: string | null;
    email: string | null;
    last_seen: string | null;
    fingerprint_hash: string | null;
  };

  const scored = ((rows as Row[] | null) || [])
    .filter((r) => !scopeFilter || scopeFilter.has(r.id))
    .map((r) => {
      const handles = toFanHandles(r);
      const fields: Array<[string, string | null | undefined]> = [
        ["web", handles.web],
        ["insta", handles.insta],
        ["snap", handles.snap],
        ["fanvue", handles.fanvue],
        ["phone", r.phone],
        ["email", r.email],
      ];
      let bestScore = 0;
      let bestField = "";
      let bestMode: "exact" | "partial" | "fuzzy" = "partial";
      for (const [name, val] of fields) {
        if (!val) continue;
        const v = String(val).trim().toLowerCase();
        if (v === normQ) {
          if (1 > bestScore) {
            bestScore = 1;
            bestField = name;
            bestMode = "exact";
          }
          continue;
        }
        if (v.includes(qEscaped)) {
          const score = 0.6 + 0.3 * (qEscaped.length / Math.max(v.length, qEscaped.length));
          if (score > bestScore) {
            bestScore = score;
            bestField = name;
            bestMode = "partial";
          }
        }
        if (fuzzy) {
          const sim = bigramSimilarity(normQ, v);
          if (sim > 0.5) {
            const score = sim * 0.9;
            if (score > bestScore) {
              bestScore = score;
              bestField = name;
              bestMode = "fuzzy";
            }
          }
        }
      }
      return {
        id: r.id,
        handles,
        pseudo_web: r.pseudo_web,
        pseudo_insta: r.pseudo_insta,
        pseudo_snap: r.pseudo_snap,
        fanvue_handle: r.fanvue_handle,
        phone: r.phone,
        email: r.email,
        last_seen: r.last_seen,
        score: Number(bestScore.toFixed(3)),
        matched_on: bestField ? `${bestMode}:${bestField}` : "partial",
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (b.last_seen || "").localeCompare(a.last_seen || ""))
    .slice(0, limit);

  return NextResponse.json({ results: scored });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toFanHandles, type FanHandles } from "@/lib/fan-matcher";

/**
 * Merge fan `:id` INTO target fan. Soft merge.
 *
 * POST /api/agence/fans/:id/merge
 *   Body : { target_fan_id: uuid, reason?: string }
 *
 * Effects :
 *   - agence_clients.fan_id = target WHERE fan_id = source
 *   - instagram_conversations.fan_id = target WHERE fan_id = source
 *   - agence_fans.handles = merged(target.handles, source.handles) on target
 *   - agence_fans.merged_into_id = target on source
 *   - agence_fans.merge_history = append entry on BOTH rows
 *
 * Handle merge rule : target wins on conflicts, source fills gaps (target
 * is the canonical survivor, so its existing handles are authoritative).
 *
 * Auth : root only (fan identity authority).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json({ error: "Root access required" }, { status: 403 });
  }

  const { id: sourceId } = await ctx.params;
  if (!sourceId) {
    return NextResponse.json({ error: "Missing source fan id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const targetId: string | undefined = body.target_fan_id;
  const reason: string = typeof body.reason === "string" ? body.reason.slice(0, 200) : "manual";
  if (!targetId) {
    return NextResponse.json({ error: "Missing target_fan_id" }, { status: 400 });
  }
  if (sourceId === targetId) {
    return NextResponse.json({ error: "Source and target must differ" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Load both rows
  const selectCols =
    "id, handles, merge_history, merged_into_id, pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle";

  const { data: source } = await db
    .from("agence_fans")
    .select(selectCols)
    .eq("id", sourceId)
    .maybeSingle();
  if (!source) {
    return NextResponse.json({ error: "Source fan not found" }, { status: 404 });
  }
  if (source.merged_into_id) {
    return NextResponse.json({ error: "Source already merged" }, { status: 409 });
  }

  const { data: target } = await db
    .from("agence_fans")
    .select(selectCols)
    .eq("id", targetId)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "Target fan not found" }, { status: 404 });
  }
  if (target.merged_into_id) {
    return NextResponse.json({ error: "Target already merged elsewhere" }, { status: 409 });
  }

  // Reparent clients
  const { error: cErr } = await db
    .from("agence_clients")
    .update({ fan_id: targetId })
    .eq("fan_id", sourceId);
  if (cErr) {
    return NextResponse.json({ error: "Clients reparent failed" }, { status: 500 });
  }

  // Reparent IG conversations
  const { error: icErr } = await db
    .from("instagram_conversations")
    .update({ fan_id: targetId })
    .eq("fan_id", sourceId);
  if (icErr) {
    return NextResponse.json({ error: "IG conversations reparent failed" }, { status: 500 });
  }

  // Merge handles : target wins on conflicts
  const sourceHandles: FanHandles = toFanHandles(source);
  const targetHandles: FanHandles = toFanHandles(target);
  const mergedHandles: FanHandles = { ...sourceHandles, ...targetHandles };

  const now = new Date().toISOString();
  const actor = String((user as { sub?: string }).sub || "unknown");

  const targetHistory = Array.isArray(target.merge_history) ? target.merge_history : [];
  const sourceHistory = Array.isArray(source.merge_history) ? source.merge_history : [];

  const targetEntry = {
    at: now,
    direction: "in",
    peer_id: sourceId,
    by: actor,
    reason,
    merged_handles: sourceHandles,
  };
  const sourceEntry = {
    at: now,
    direction: "out",
    peer_id: targetId,
    by: actor,
    reason,
  };

  // Update target : merged handles + history entry
  const { error: tErr } = await db
    .from("agence_fans")
    .update({
      handles: mergedHandles,
      merge_history: [...targetHistory, targetEntry],
      updated_at: now,
    })
    .eq("id", targetId);
  if (tErr) {
    return NextResponse.json({ error: `Target update failed: ${tErr.message}` }, { status: 500 });
  }

  // Update source : mark merged + history entry
  const { error: mErr } = await db
    .from("agence_fans")
    .update({
      merged_into_id: targetId,
      merge_history: [...sourceHistory, sourceEntry],
      updated_at: now,
    })
    .eq("id", sourceId);
  if (mErr) {
    return NextResponse.json({ error: `Source update failed: ${mErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    source_id: sourceId,
    target_id: targetId,
    merged_handles: mergedHandles,
  });
}

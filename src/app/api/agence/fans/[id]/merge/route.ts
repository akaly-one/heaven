import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * Merge fan `:id` INTO target fan. Soft merge.
 *
 * POST /api/agence/fans/:id/merge
 *   Body : { target_fan_id: uuid }
 *
 * Effects :
 *   - agence_clients.fan_id = target WHERE fan_id = source
 *   - instagram_conversations.fan_id = target WHERE fan_id = source
 *   - agence_fans.merged_into_id = target on the source row
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

  // Verify both fans exist (prevent orphan merges)
  const { data: source } = await db
    .from("agence_fans")
    .select("id, merged_into_id")
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
    .select("id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "Target fan not found" }, { status: 404 });
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

  // Mark source merged
  const { error: mErr } = await db
    .from("agence_fans")
    .update({ merged_into_id: targetId, updated_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (mErr) {
    return NextResponse.json({ error: "Merge flag failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, source_id: sourceId, target_id: targetId });
}

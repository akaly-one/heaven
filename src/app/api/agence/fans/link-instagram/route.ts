import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * Link an Instagram handle to an existing fan.
 *
 * POST /api/agence/fans/link-instagram
 *   Body : { fan_id: uuid, ig_username: string }
 *
 * Logic :
 *   - Normalize ig_username (lowercase, strip leading @).
 *   - If the handle is already taken by ANOTHER fan, soft-merge the other fan
 *     into the given fan_id.
 *   - Otherwise set agence_fans.pseudo_insta on fan_id.
 *   - Backfill any instagram_conversations whose ig_username matches the handle
 *     and currently has NULL fan_id → set fan_id.
 *
 * Auth : root only.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json({ error: "Root access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const fanId: string | undefined = body.fan_id;
  const rawHandle: string | undefined = body.ig_username;

  if (!fanId || !rawHandle) {
    return NextResponse.json({ error: "Missing fan_id or ig_username" }, { status: 400 });
  }

  const handle = rawHandle.replace(/^@/, "").trim().toLowerCase();
  if (!handle) {
    return NextResponse.json({ error: "Empty ig_username" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Target fan must exist
  const { data: fan } = await db
    .from("agence_fans")
    .select("id, pseudo_insta, merged_into_id")
    .eq("id", fanId)
    .maybeSingle();
  if (!fan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }
  if (fan.merged_into_id) {
    return NextResponse.json({ error: "Fan is merged ; target the canonical fan" }, { status: 409 });
  }

  // Check if another fan already owns this handle
  const { data: existingHolder } = await db
    .from("agence_fans")
    .select("id")
    .ilike("pseudo_insta", handle)
    .neq("id", fanId)
    .maybeSingle();

  let merged_from: string | null = null;

  if (existingHolder) {
    // Soft-merge existing holder into fanId
    await db.from("agence_clients").update({ fan_id: fanId }).eq("fan_id", existingHolder.id);
    await db
      .from("instagram_conversations")
      .update({ fan_id: fanId })
      .eq("fan_id", existingHolder.id);

    await db
      .from("agence_fans")
      .update({ merged_into_id: fanId, updated_at: new Date().toISOString() })
      .eq("id", existingHolder.id);

    merged_from = existingHolder.id;

    // Ensure canonical fan carries the handle (release it from merged row first)
    await db.from("agence_fans").update({ pseudo_insta: null }).eq("id", existingHolder.id);
  }

  const { error: updErr } = await db
    .from("agence_fans")
    .update({ pseudo_insta: handle, updated_at: new Date().toISOString() })
    .eq("id", fanId);

  if (updErr) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Backfill instagram_conversations that point to this handle with NULL fan_id
  await db
    .from("instagram_conversations")
    .update({ fan_id: fanId })
    .is("fan_id", null)
    .ilike("ig_username", handle);

  return NextResponse.json({ ok: true, fan_id: fanId, ig_username: handle, merged_from });
}

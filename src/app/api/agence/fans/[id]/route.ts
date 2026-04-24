import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Fan detail (consolidated view).
 *
 * GET /api/agence/fans/:id
 *   Returns : { fan, linked_clients, purchases, timeline, instagram_conversations }
 *
 * Auth :
 *   - root : full access
 *   - model : only if fan is linked to caller's model (clients or IG conversations)
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing fan id" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Load fan
  const { data: fan, error: fanErr } = await db
    .from("agence_fans")
    .select(
      "id, pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle, phone, email, first_seen, last_seen, notes, merged_into_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (fanErr || !fan) {
    return NextResponse.json({ error: "Fan not found" }, { status: 404 });
  }

  // Linked clients (one per model scope)
  // BRIEF-10 AG06/AG10 : inclure age_certified + access_level pour la section
  // de certification majorité et validation handle dans le drawer admin.
  // NB 2026-04-24 — colonnes réelles uniquement (agence_clients n'a pas
  // pseudo / display_name / avatar_url / badge_grade). On log les erreurs
  // pour ne plus silent-fail (bug P0 identifié par DEBUG v2).
  const { data: linkedClients, error: linkedError } = await db
    .from("agence_clients")
    .select(
      "id, model, pseudo_insta, pseudo_snap, nickname, firstname, tier, last_active, created_at, age_certified, age_certified_at, access_level, validated_at, validated_by, rejected_at, rejected_reason, verified_handle, verified_platform"
    )
    .eq("fan_id", id);

  if (linkedError) {
    console.warn("[api/agence/fans/:id] linkedClients error:", linkedError);
  }

  // Access check for model role
  if (user.role === "model") {
    const userSlug = String(user.sub || "").toLowerCase();
    const userModelId = toModelId(userSlug);
    const clientModels = new Set((linkedClients || []).map((c) => c.model));
    // Also accept IG conv on caller's model
    const { data: igScopeCheck } = await db
      .from("instagram_conversations")
      .select("id")
      .eq("fan_id", id)
      .eq("model_slug", userModelId)
      .limit(1);
    const hasIgScope = (igScopeCheck || []).length > 0;
    if (!clientModels.has(userModelId) && !hasIgScope) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Purchases linked via client_id on the fan's clients
  const clientIds = (linkedClients || []).map((c) => c.id);
  let purchases: unknown[] = [];
  if (clientIds.length > 0) {
    const { data: p } = await db
      .from("agence_purchases")
      .select("*")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false })
      .limit(200);
    purchases = p || [];
  }

  // Timeline
  let timelineQuery = db
    .from("agence_messages_timeline")
    .select("source, id, model, fan_id, client_id, ig_conversation_id, text, direction, read_flag, created_at")
    .eq("fan_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (user.role === "model") {
    const userSlug = String(user.sub || "").toLowerCase();
    timelineQuery = timelineQuery.eq("model", toModelId(userSlug));
  }
  const { data: timeline } = await timelineQuery;

  // Instagram conversations
  let igQuery = db
    .from("instagram_conversations")
    .select("id, model_slug, ig_username, ig_user_id, mode, status, last_message_at, message_count")
    .eq("fan_id", id)
    .order("last_message_at", { ascending: false });
  if (user.role === "model") {
    const userSlug = String(user.sub || "").toLowerCase();
    igQuery = igQuery.eq("model_slug", toModelId(userSlug));
  }
  const { data: igConvs } = await igQuery;

  return NextResponse.json({
    fan,
    linked_clients: linkedClients || [],
    purchases,
    timeline: timeline || [],
    instagram_conversations: igConvs || [],
  });
}

// PATCH /api/agence/fans/:id — update non-IG handles (web/snap/fanvue) + notes
// IG goes through /api/agence/fans/link-instagram (handles uniqueness conflicts)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing fan id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const ALLOWED = new Set(["pseudo_web", "pseudo_snap", "fanvue_handle", "phone", "email", "notes"]);
  const update: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED.has(k)) continue;
    if (v === null || v === "") update[k] = null;
    else if (typeof v === "string") update[k] = v.trim();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { data, error } = await db
    .from("agence_fans")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    // Most likely UNIQUE constraint conflict on a handle
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, fan: data });
}

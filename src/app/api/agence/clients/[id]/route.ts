/**
 * BRIEF-15 Lot B — GET /api/agence/clients/[id]
 *
 * Fiche fan drawer : accès data pour pseudo-fan (visiteur sans agence_fans row).
 *
 * Retourne la même shape que /api/agence/fans/[id] pour que <ContactsDrawer>
 * puisse consommer indifféremment un vrai fan (UUID agence_fans) ou un
 * pseudo-fan (UUID agence_clients préfixé `pseudo:` côté UI).
 *
 * Shape :
 *  - fan     : { id, pseudo_insta, pseudo_snap, pseudo_web, fanvue_handle?, phone?, email?, first_seen?, last_seen?, notes? }
 *  - linked_clients : [ client row complet age-gate/validation ] (1 seul, celui demandé)
 *  - purchases : []
 *  - message_count : int (agence_messages_timeline par client_id OU ig_conversation_id)
 *
 * Auth : root ou model (scope propre model).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

interface AgenceClientRow {
  id: string;
  model: string;
  fan_id: string | null;
  pseudo_insta: string | null;
  pseudo_snap: string | null;
  nickname: string | null;
  firstname: string | null;
  tier: string | null;
  last_active: string | null;
  created_at: string;
  age_certified: boolean | null;
  age_certified_at: string | null;
  access_level: string | null;
  validated_at: string | null;
  validated_by: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  verified_handle: string | null;
  verified_platform: string | null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing client id" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { data: client, error: clientErr } = await db
    .from("agence_clients")
    .select(
      "id, model, fan_id, pseudo_insta, pseudo_snap, nickname, firstname, tier, last_active, created_at, age_certified, age_certified_at, access_level, validated_at, validated_by, rejected_at, rejected_reason, verified_handle, verified_platform"
    )
    .eq("id", id)
    .maybeSingle<AgenceClientRow>();

  if (clientErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Scope model role à sa propre model
  if (user.role === "model") {
    const userModelId = toModelId(user.sub);
    if (String(client.model).toLowerCase() !== userModelId.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Pseudo_web display fallback : si nickname ressemble à visiteur-NNN on le
  // garde, sinon on dérive de l'id (last 4 chars) pour rester aligné avec
  // getConversationPseudo helper.
  const rawNickname = client.nickname || client.firstname || null;
  const nicknameIsPseudo = rawNickname && /^(visiteur|guest)/i.test(rawNickname);
  const shortId = client.id.slice(-4).toLowerCase();
  const pseudoWebFallback = nicknameIsPseudo
    ? rawNickname
    : !client.pseudo_insta && !client.pseudo_snap
    ? `visiteur-${shortId}`
    : null;

  // Compte messages par client_id (web) — et si ig présent, on cumule via
  // ig_conversation_id associé. On utilise message_count via count query.
  const { count: webMessageCount } = await db
    .from("agence_messages_timeline")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client.id);

  // Last message (tout canal) pour "dernière activité" plus précise que last_active
  const { data: lastMsg } = await db
    .from("agence_messages_timeline")
    .select("created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>();

  // Purchases liés à ce client (agence_purchases n'a pas pack_name ni price_eur
  // natifs — on mappe `price` et on laisse `pack_name` null; shape identique à
  // /api/agence/fans/[id] consommée par ContactsDrawer).
  const { data: purchasesRaw } = await db
    .from("agence_purchases")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(50);

  interface PurchaseRow {
    id: string;
    pack_name?: string | null;
    price?: number | null;
    price_eur?: number | null;
    created_at: string;
  }

  const purchases = (purchasesRaw || []).map((p: PurchaseRow) => ({
    id: String(p.id),
    pack_name: p.pack_name ?? null,
    price_eur: p.price_eur ?? p.price ?? null,
    created_at: String(p.created_at),
  }));

  const fan = {
    id: client.fan_id || `pseudo:${client.id}`,
    pseudo_insta: client.pseudo_insta,
    pseudo_snap: client.pseudo_snap,
    pseudo_web: pseudoWebFallback,
    fanvue_handle: null,
    phone: null,
    email: null,
    first_seen: client.created_at,
    last_seen: lastMsg?.created_at || client.last_active || null,
    notes: null,
  };

  const linked_clients = [
    {
      id: client.id,
      model: client.model,
      pseudo_insta: client.pseudo_insta,
      pseudo_snap: client.pseudo_snap,
      nickname: client.nickname,
      firstname: client.firstname,
      tier: client.tier,
      age_certified: client.age_certified,
      age_certified_at: client.age_certified_at,
      access_level: client.access_level,
      validated_at: client.validated_at,
      validated_by: client.validated_by,
      rejected_at: client.rejected_at,
      rejected_reason: client.rejected_reason,
    },
  ];

  return NextResponse.json({
    fan,
    linked_clients,
    purchases,
    message_count: webMessageCount || 0,
    // Mode = pseudo-fan (utile pour placeholder insights UI)
    is_pseudo_fan: !client.fan_id,
  });
}

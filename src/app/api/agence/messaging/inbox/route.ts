import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Unified messaging inbox (web + Instagram).
 *
 * GET /api/agence/messaging/inbox
 *   Query :
 *     source  = all | web | instagram  (default = all)
 *     model   = mN or slug             (default = current user's scope ;
 *                                       root = m1 unless overridden)
 *   Returns : list of conversations grouped by fan_id (or handle fallback),
 *             with last message preview + unread count + sources touched.
 *
 * Auth : role=root OR role=model (model restricted to own scope).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const params = req.nextUrl.searchParams;
  const source = (params.get("source") || "all").toLowerCase();
  if (!["all", "web", "instagram"].includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  const fanIdParam = params.get("fan_id");
  // NB 2026-04-24 : pseudo-fan keys pour les conversations sans agence_fans row.
  // Format : "pseudo:<client_id|ig_conv_id>" — suffix = UUID, unique et lookupable.
  const isPseudoFan = fanIdParam?.startsWith("pseudo:");
  const pseudoFanSuffix = isPseudoFan ? fanIdParam!.slice("pseudo:".length) : null;

  // Resolve model scope
  const requestedModel = params.get("model");
  const userSlug = String(user.sub || "").toLowerCase();
  let modelId: string;
  if (user.role === "root") {
    modelId = toModelId(requestedModel || userSlug || "yumi");
  } else {
    // Model role : force own scope
    modelId = toModelId(userSlug);
  }

  // Fetch last ~500 timeline rows for this model, then group in memory (view is pre-scoped by model).
  let query = db
    .from("agence_messages_timeline")
    .select("source, id, model, fan_id, client_id, ig_conversation_id, text, direction, read_flag, created_at")
    .eq("model", modelId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (source !== "all") {
    query = query.eq("source", source);
  }

  const { data: timeline, error: timelineErr } = await query;
  if (timelineErr) {
    return NextResponse.json({ error: "Timeline fetch failed" }, { status: 500 });
  }

  // Collect identifiers for enrichment
  const fanIds = new Set<string>();
  const clientIds = new Set<string>();
  const igConvIds = new Set<string>();
  for (const row of timeline || []) {
    if (row.fan_id) fanIds.add(row.fan_id);
    if (row.client_id) clientIds.add(row.client_id);
    if (row.ig_conversation_id) igConvIds.add(row.ig_conversation_id);
  }

  // Fetch fans
  const fansMap = new Map<string, {
    id: string;
    pseudo_web: string | null;
    pseudo_insta: string | null;
    pseudo_snap: string | null;
    fanvue_handle: string | null;
  }>();
  if (fanIds.size > 0) {
    const { data: fans } = await db
      .from("agence_fans")
      .select("id, pseudo_web, pseudo_insta, pseudo_snap, fanvue_handle")
      .in("id", Array.from(fanIds));
    for (const f of fans || []) fansMap.set(f.id, f);
  }

  // Fetch clients (web fallback handle when no fan_id)
  const clientsMap = new Map<
    string,
    {
      id: string;
      nickname: string | null;
      firstname: string | null;
      pseudo_insta: string | null;
      pseudo_snap: string | null;
    }
  >();
  if (clientIds.size > 0) {
    const { data: clients } = await db
      .from("agence_clients")
      .select("id, nickname, firstname, pseudo_insta, pseudo_snap")
      .in("id", Array.from(clientIds));
    for (const c of clients || []) clientsMap.set(c.id, c);
  }

  // Fetch IG conversations (for usernames)
  const igConvMap = new Map<string, { id: string; ig_username: string | null; ig_user_id: string }>();
  if (igConvIds.size > 0) {
    const { data: convs } = await db
      .from("instagram_conversations")
      .select("id, ig_username, ig_user_id")
      .in("id", Array.from(igConvIds));
    for (const c of convs || []) igConvMap.set(c.id, c);
  }

  // Group by fan_id (preferred). Fallback grouping by ig_conversation_id or client_id.
  type ConvKey = { kind: "fan" | "ig_conv" | "client"; key: string };
  const groups = new Map<string, {
    group_id: string;
    fan_id: string | null;
    client_id: string | null;
    ig_conversation_id: string | null;
    display_handle: string;
    sources: Set<string>;
    last_text: string;
    last_direction: "in" | "out";
    last_at: string;
    unread_count: number;
    message_count: number;
  }>();

  const makeKey = (k: ConvKey) => `${k.kind}:${k.key}`;

  for (const row of timeline || []) {
    let gk: ConvKey;
    if (row.fan_id) gk = { kind: "fan", key: row.fan_id };
    else if (row.ig_conversation_id) gk = { kind: "ig_conv", key: row.ig_conversation_id };
    else if (row.client_id) gk = { kind: "client", key: row.client_id };
    else continue;

    const k = makeKey(gk);
    let g = groups.get(k);
    if (!g) {
      // Resolve display handle
      let handle = "Unknown";
      if (gk.kind === "fan") {
        const f = fansMap.get(gk.key);
        handle = f?.pseudo_web || f?.pseudo_insta || f?.pseudo_snap || f?.fanvue_handle || "Fan";
      } else if (gk.kind === "ig_conv") {
        const c = igConvMap.get(gk.key);
        handle = c?.ig_username ? `@${c.ig_username}` : "Instagram user";
      } else {
        const c = clientsMap.get(gk.key);
        handle =
          c?.nickname ||
          c?.firstname ||
          c?.pseudo_insta ||
          c?.pseudo_snap ||
          "Web visitor";
      }
      g = {
        group_id: k,
        fan_id: gk.kind === "fan" ? gk.key : null,
        client_id: row.client_id,
        ig_conversation_id: row.ig_conversation_id,
        display_handle: handle,
        sources: new Set(),
        last_text: row.text,
        last_direction: row.direction as "in" | "out",
        last_at: row.created_at,
        unread_count: 0,
        message_count: 0,
      };
      groups.set(k, g);
    }
    g.sources.add(row.source as string);
    g.message_count += 1;
    if (row.direction === "in" && !row.read_flag) g.unread_count += 1;
    // Timeline already ordered desc — first occurrence is latest
  }

  // Sort by last_at desc, cap at 50, and shape for the frontend
  const conversations = Array.from(groups.values())
    .sort((a, b) => (a.last_at < b.last_at ? 1 : -1))
    .slice(0, 50)
    .map((g) => {
      const fan = g.fan_id ? fansMap.get(g.fan_id) : null;
      const igConv = g.ig_conversation_id ? igConvMap.get(g.ig_conversation_id) : null;
      const client = g.client_id ? clientsMap.get(g.client_id) : null;
      const sourcesArr = Array.from(g.sources) as ("web" | "instagram")[];

      // NB 2026-04-24 : pseudo-fan key = suffix UUID (client_id ou ig_conv_id),
      // jamais le display_handle (conflit si 2 clients ont le même nickname "v").
      const pseudoSuffix = g.client_id || g.ig_conversation_id || g.display_handle;
      const fan_id = g.fan_id || `pseudo:${pseudoSuffix}`;

      // Pseudo web normalisé — on respecte la norme "visiteur-NNN" partout (header + messagerie + profil).
      // Priorité : pseudo_web DB (migration 052) → nickname s'il ressemble à visiteur-NNN → fallback
      // stable "visiteur-<4 derniers chars du client_id>" (pas de collision).
      const shortId = (g.client_id || g.ig_conversation_id || "").slice(-4).toLowerCase();
      const normalizedVisitor = shortId ? `visiteur-${shortId}` : "visiteur";
      const rawNickname = client?.nickname || client?.firstname || null;
      const nicknameIsPseudo = rawNickname && /^(visiteur|guest)/i.test(rawNickname);
      const pseudo_web = fan?.pseudo_web
        || (nicknameIsPseudo ? rawNickname : null)
        || (!fan?.pseudo_insta && !fan?.pseudo_snap ? normalizedVisitor : null);

      const displayName = fan?.pseudo_insta
        ? `@${fan.pseudo_insta}`
        : igConv?.ig_username
        ? `@${igConv.ig_username}`
        : pseudo_web || g.display_handle;

      return {
        fan_id,
        pseudo_insta: fan?.pseudo_insta || igConv?.ig_username || null,
        pseudo_web,
        pseudo_snap: fan?.pseudo_snap || null,
        fanvue_handle: fan?.fanvue_handle || null,
        display_name: displayName,
        avatar_url: null,
        sources: sourcesArr,
        last_message: {
          text: g.last_text,
          source: sourcesArr[0] || "web",
          direction: g.last_direction,
          created_at: g.last_at,
        },
        unread_count: g.unread_count,
        last_message_at: g.last_at,
        tier: null,
        message_count: g.message_count,
      };
    });

  // If a specific fan_id was requested, return its full thread + fan info
  let messages: Array<{
    id: string;
    source: "web" | "instagram";
    direction: "in" | "out";
    text: string;
    created_at: string;
    media_url: string | null;
  }> = [];
  let fanInfo: {
    id: string;
    pseudo_insta: string | null;
    pseudo_web: string | null;
    sources: ("web" | "instagram")[];
    avatar_url: string | null;
    display_name: string | null;
  } | null = null;

  // NB 2026-04-24 : 2 chemins — vrai fan (agence_fans) ou pseudo-fan (client_id / ig_conv_id)
  if (fanIdParam && !isPseudoFan) {
    const { data: fan } = await db
      .from("agence_fans")
      .select("id, pseudo_insta, pseudo_web, pseudo_snap, fanvue_handle")
      .eq("id", fanIdParam)
      .maybeSingle();
    if (fan) {
      const { data: thread } = await db
        .from("agence_messages_timeline")
        .select("source, id, text, direction, created_at")
        .eq("model", modelId)
        .eq("fan_id", fanIdParam)
        .order("created_at", { ascending: true })
        .limit(200);
      messages = (thread || []).map((m) => ({
        id: String(m.id),
        source: m.source as "web" | "instagram",
        direction: m.direction as "in" | "out",
        text: m.text,
        created_at: m.created_at,
        media_url: null,
      }));
      const sourcesSet = new Set<"web" | "instagram">();
      for (const m of messages) sourcesSet.add(m.source);
      fanInfo = {
        id: fan.id,
        pseudo_insta: fan.pseudo_insta,
        pseudo_web: fan.pseudo_web,
        sources: Array.from(sourcesSet),
        avatar_url: null,
        display_name: fan.pseudo_web || fan.pseudo_insta || null,
      };
    }
  } else if (isPseudoFan && pseudoFanSuffix) {
    // Pseudo-fan : suffix = client_id (UUID web) OU ig_conv_id.
    // On tente agence_messages (web) par client_id, puis instagram_messages par conversation_id.
    let threadRows: Array<{ source: "web" | "instagram"; id: string | number; text: string; direction: "in" | "out"; created_at: string }> = [];
    let resolvedClient: { id: string; nickname: string | null; firstname: string | null; pseudo_insta: string | null; pseudo_snap: string | null } | null = null;

    // 1. Essai client_id (web)
    const { data: webThread } = await db
      .from("agence_messages_timeline")
      .select("source, id, text, direction, created_at, client_id")
      .eq("model", modelId)
      .eq("client_id", pseudoFanSuffix)
      .order("created_at", { ascending: true })
      .limit(200);
    if (webThread && webThread.length > 0) {
      threadRows = webThread.map((m) => ({
        source: m.source as "web" | "instagram",
        id: m.id,
        text: m.text,
        direction: m.direction as "in" | "out",
        created_at: m.created_at,
      }));
      resolvedClient = clientsMap.get(pseudoFanSuffix) || null;
    }

    // 2. Fallback ig_conversation_id
    if (threadRows.length === 0) {
      const { data: igThread } = await db
        .from("agence_messages_timeline")
        .select("source, id, text, direction, created_at, ig_conversation_id")
        .eq("model", modelId)
        .eq("ig_conversation_id", pseudoFanSuffix)
        .order("created_at", { ascending: true })
        .limit(200);
      if (igThread && igThread.length > 0) {
        threadRows = igThread.map((m) => ({
          source: m.source as "web" | "instagram",
          id: m.id,
          text: m.text,
          direction: m.direction as "in" | "out",
          created_at: m.created_at,
        }));
      }
    }

    messages = threadRows.map((m) => ({
      id: String(m.id),
      source: m.source,
      direction: m.direction,
      text: m.text,
      created_at: m.created_at,
      media_url: null,
    }));
    const sourcesSet = new Set<"web" | "instagram">();
    for (const m of messages) sourcesSet.add(m.source);

    const shortId = pseudoFanSuffix.slice(-4).toLowerCase();
    const visitorLabel = `visiteur-${shortId}`;

    fanInfo = {
      id: fanIdParam!,
      pseudo_insta: resolvedClient?.pseudo_insta || null,
      pseudo_web: (resolvedClient?.nickname && /^(visiteur|guest)/i.test(resolvedClient.nickname))
        ? resolvedClient.nickname
        : visitorLabel,
      sources: Array.from(sourcesSet),
      avatar_url: null,
      display_name: resolvedClient?.pseudo_insta
        ? `@${resolvedClient.pseudo_insta}`
        : visitorLabel,
    };
  }

  return NextResponse.json({
    model: modelId,
    source,
    conversations,
    messages,
    fan: fanInfo,
  });
}

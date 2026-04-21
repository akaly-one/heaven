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
  const clientsMap = new Map<string, { id: string; pseudo: string | null; pseudo_insta: string | null }>();
  if (clientIds.size > 0) {
    const { data: clients } = await db
      .from("agence_clients")
      .select("id, pseudo, pseudo_insta")
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
        handle = c?.pseudo || c?.pseudo_insta || "Web visitor";
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
    g.sources.add(row.source);
    g.message_count += 1;
    if (row.direction === "in" && !row.read_flag) g.unread_count += 1;
    // Timeline already ordered desc — first occurrence is latest
  }

  // Sort by last_at desc, cap at 50
  const conversations = Array.from(groups.values())
    .map((g) => ({
      ...g,
      sources: Array.from(g.sources),
    }))
    .sort((a, b) => (a.last_at < b.last_at ? 1 : -1))
    .slice(0, 50);

  return NextResponse.json({
    model: modelId,
    source,
    conversations,
  });
}

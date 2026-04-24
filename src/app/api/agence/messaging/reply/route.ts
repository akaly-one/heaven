import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";
import { sendInstagramReply } from "@/lib/instagram";

/**
 * Unified reply : pick channel automatically from last inbound message,
 * or honor `prefer_channel` override.
 *
 * POST /api/agence/messaging/reply
 *   Body : { fan_id: uuid, text: string, media_url?: string, prefer_channel?: 'web'|'instagram' }
 *   Returns : { ok: true, channel: 'web'|'instagram', message_id: string }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const fanId: string | undefined = body.fan_id;
  const text: string | undefined = typeof body.text === "string" ? body.text.trim() : undefined;
  const mediaUrl: string | null = body.media_url || null;
  const preferChannel: "web" | "instagram" | undefined = body.prefer_channel;

  if (!fanId || !text) {
    return NextResponse.json({ error: "Missing fan_id or text" }, { status: 400 });
  }
  if (preferChannel && !["web", "instagram"].includes(preferChannel)) {
    return NextResponse.json({ error: "Invalid prefer_channel" }, { status: 400 });
  }

  // Resolve current model scope
  const userSlug = String(user.sub || "").toLowerCase();
  const currentModelId = toModelId(userSlug || "yumi");

  // NB 2026-04-24 : pseudo-fans (visiteurs sans fan_id réel dans agence_fans)
  // arrivent avec fan_id="pseudo:<client_id|ig_conv_id>". On extrait le suffix
  // et on route directement via client_id pour le web reply.
  const isPseudoFan = fanId.startsWith("pseudo:");
  const pseudoSuffix = isPseudoFan ? fanId.slice("pseudo:".length) : null;

  // Determine channel
  let channel: "web" | "instagram";
  if (preferChannel) {
    channel = preferChannel;
  } else if (isPseudoFan) {
    // Pseudo-fans : channel déduit via agence_clients (web) ou instagram_conversations (ig)
    const { data: asClient } = await db
      .from("agence_clients")
      .select("id")
      .eq("id", pseudoSuffix)
      .eq("model", currentModelId)
      .maybeSingle();
    channel = asClient ? "web" : "instagram";
  } else {
    // Lookup last inbound message for this fan on the current model
    const { data: lastIn } = await db
      .from("agence_messages_timeline")
      .select("source, created_at")
      .eq("model", currentModelId)
      .eq("fan_id", fanId)
      .eq("direction", "in")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    channel = lastIn?.source === "instagram" ? "instagram" : "web";
  }

  if (channel === "instagram") {
    // Resolve ig_user_id for fan on current model
    const { data: conv } = await db
      .from("instagram_conversations")
      .select("id, ig_user_id, model_slug")
      .eq("fan_id", fanId)
      .eq("model_slug", currentModelId)
      .maybeSingle();

    if (!conv) {
      return NextResponse.json(
        { error: "No Instagram conversation linked to this fan for current model" },
        { status: 404 }
      );
    }

    // Model scoping check
    if (user.role === "model" && toModelId(userSlug) !== conv.model_slug) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await sendInstagramReply(conv.ig_user_id, text);
    if (!result.success) {
      return NextResponse.json({ error: "Instagram send failed" }, { status: 502 });
    }

    // Persist outbound message
    const { data: inserted, error: insErr } = await db
      .from("instagram_messages")
      .insert({
        conversation_id: conv.id,
        role: "human",
        content: text,
        ig_message_id: result.messageId,
      })
      .select("id")
      .single();

    if (insErr) {
      return NextResponse.json({ error: "Store failed" }, { status: 500 });
    }

    await db
      .from("instagram_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conv.id);

    return NextResponse.json({ ok: true, channel: "instagram", message_id: inserted.id });
  }

  // Web channel : need a client row on current model.
  // NB 2026-04-24 : 2 voies de résolution :
  //   1. fan_id UUID réel → lookup agence_clients.fan_id (fan unifié)
  //   2. fan_id="pseudo:<client_id>" → lookup direct agence_clients.id (visiteur sans fan_id)
  let client: { id: string; model: string } | null = null;

  if (isPseudoFan && pseudoSuffix) {
    const { data } = await db
      .from("agence_clients")
      .select("id, model")
      .eq("id", pseudoSuffix)
      .eq("model", currentModelId)
      .maybeSingle();
    client = data;
  } else {
    const { data } = await db
      .from("agence_clients")
      .select("id, model")
      .eq("fan_id", fanId)
      .eq("model", currentModelId)
      .maybeSingle();
    client = data;
  }

  if (!client) {
    return NextResponse.json(
      { error: "No web client linked to this fan for current model" },
      { status: 404 }
    );
  }

  const payload: Record<string, unknown> = {
    model: currentModelId,
    client_id: client.id,
    sender_type: "admin",
    content: text,
    read: false,
  };
  if (mediaUrl) payload.media_url = mediaUrl;

  const { data: inserted, error: insErr } = await db
    .from("agence_messages")
    .insert(payload)
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json({ error: "Store failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, channel: "web", message_id: inserted.id });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  verifyWebhookSignature,
  verifyChallenge,
  parseMessagingEvents,
  sendInstagramReply,
} from "@/lib/instagram";
import { generateReply } from "@/lib/openrouter";

// ═══ GET — Meta webhook verification ═══
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const challenge = verifyChallenge(
    params.get("hub.mode"),
    params.get("hub.verify_token"),
    params.get("hub.challenge")
  );

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ═══ POST — Receive Instagram messages ═══
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify signature
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const messages = parseMessagingEvents(body);

  if (messages.length === 0) {
    return NextResponse.json({ received: true });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Check if agent is enabled
  const enabled = process.env.INSTAGRAM_AGENT_ENABLED === "true";
  if (!enabled) {
    return NextResponse.json({ received: true, agent: "disabled" });
  }

  for (const msg of messages) {
    await processMessage(db, msg);
  }

  return NextResponse.json({ received: true, processed: messages.length });
}

// ═══ Process a single incoming message ═══
async function processMessage(
  db: ReturnType<typeof getServerSupabase>,
  msg: { senderId: string; recipientId: string; messageId: string; text: string }
) {
  if (!db) return;

  // Default model_slug — will be configurable per IG account
  const modelSlug = "yumi";

  // Dedup check
  const { data: existing } = await db
    .from("instagram_messages")
    .select("id")
    .eq("ig_message_id", msg.messageId)
    .maybeSingle();

  if (existing) return; // Already processed

  // Upsert conversation
  const { data: conv } = await db
    .from("instagram_conversations")
    .upsert(
      {
        model_slug: modelSlug,
        ig_user_id: msg.senderId,
        last_message_at: new Date().toISOString(),
        mode: process.env.INSTAGRAM_DEFAULT_MODE || "human",
      },
      { onConflict: "model_slug,ig_user_id" }
    )
    .select("id, mode")
    .single();

  if (!conv) return;

  // Increment message count
  const { data: current } = await db
    .from("instagram_conversations")
    .select("message_count")
    .eq("id", conv.id)
    .single();

  await db
    .from("instagram_conversations")
    .update({ message_count: (current?.message_count || 0) + 1 })
    .eq("id", conv.id);

  // Store incoming message
  await db.from("instagram_messages").insert({
    conversation_id: conv.id,
    role: "user",
    content: msg.text,
    ig_message_id: msg.messageId,
  });

  // If agent mode → generate and send AI reply
  if (conv.mode === "agent") {
    await handleAgentReply(db, conv.id, modelSlug, msg.senderId);
  }
}

// ═══ Generate AI reply and send ═══
async function handleAgentReply(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  conversationId: string,
  modelSlug: string,
  recipientId: string
) {
  const startTime = Date.now();

  try {
    // Load config
    const { data: config } = await db
      .from("instagram_config")
      .select("system_prompt, ai_model, max_history")
      .eq("model_slug", modelSlug)
      .single();

    if (!config?.system_prompt) return;

    // Load recent messages for context
    const { data: history } = await db
      .from("instagram_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(config.max_history || 10);

    // Build messages array for OpenRouter
    const aiMessages = [
      { role: "system" as const, content: config.system_prompt },
      ...(history || []).map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Generate reply
    const reply = await generateReply(aiMessages, {
      model: config.ai_model,
      maxTokens: 200,
      temperature: 0.8,
    });

    const responseTime = Date.now() - startTime;

    // Send via Instagram
    const sendResult = await sendInstagramReply(recipientId, reply.content);

    if (sendResult.success) {
      // Store AI reply
      await db.from("instagram_messages").insert({
        conversation_id: conversationId,
        role: "agent",
        content: reply.content,
        ai_model_used: reply.model,
        response_time_ms: responseTime,
        ig_message_id: sendResult.messageId,
      });
    }
  } catch (error) {
    console.error("[Instagram Agent] AI reply failed:", error);
    // Fallback: switch conversation to human mode
    await db
      .from("instagram_conversations")
      .update({ mode: "human" })
      .eq("id", conversationId);
  }
}

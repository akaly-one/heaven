import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { sendInstagramReply } from "@/lib/instagram";

// ═══ POST — Send manual reply from dashboard ═══
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversation_id, content } = await req.json();
  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: "Missing conversation_id or content" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Load conversation
  const { data: conv } = await db
    .from("instagram_conversations")
    .select("id, ig_user_id, model_slug")
    .eq("id", conversation_id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Model can only send for own conversations (sub = model_slug)
  if (user.role === "model" && user.sub !== conv.model_slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Send via Meta Graph API
  const result = await sendInstagramReply(conv.ig_user_id, content.trim());

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Store message
  await db.from("instagram_messages").insert({
    conversation_id: conv.id,
    role: "human",
    content: content.trim(),
    ig_message_id: result.messageId,
  });

  // Update conversation timestamp
  await db
    .from("instagram_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conv.id);

  return NextResponse.json({ success: true, messageId: result.messageId });
}

// Instagram / Meta Graph API helpers
// Docs: https://developers.facebook.com/docs/instagram-messaging

import crypto from "crypto";

// ═══ Webhook verification ═══

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signature) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export function verifyChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null
): string | null {
  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return challenge;
  }
  return null;
}

// ═══ Parse incoming webhook ═══

export interface IncomingMessage {
  senderId: string;
  recipientId: string;
  messageId: string;
  text: string;
  timestamp: number;
}

export function parseMessagingEvents(body: Record<string, unknown>): IncomingMessage[] {
  const messages: IncomingMessage[] = [];
  const entry = body.entry as Array<Record<string, unknown>> | undefined;
  if (!entry) return messages;

  for (const e of entry) {
    const messaging = e.messaging as Array<Record<string, unknown>> | undefined;
    if (!messaging) continue;

    for (const event of messaging) {
      const sender = event.sender as { id: string } | undefined;
      const recipient = event.recipient as { id: string } | undefined;
      const message = event.message as { mid: string; text?: string } | undefined;

      if (sender?.id && recipient?.id && message?.text) {
        messages.push({
          senderId: sender.id,
          recipientId: recipient.id,
          messageId: message.mid,
          text: message.text,
          timestamp: (event.timestamp as number) || Date.now(),
        });
      }
    }
  }

  return messages;
}

// ═══ Send message via Graph API ═══

export async function sendInstagramReply(
  recipientId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return { success: false, error: "META_PAGE_ACCESS_TOKEN not configured" };

  const igBusinessId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!igBusinessId) return { success: false, error: "INSTAGRAM_BUSINESS_ACCOUNT_ID not configured" };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${igBusinessId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Graph API ${res.status}: ${err}` };
  }

  const data = await res.json();
  return { success: true, messageId: data.message_id };
}

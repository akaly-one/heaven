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

// ═══ Fetch Instagram username for a DM sender ═══

/**
 * Resolve an Instagram username from its IGSID (sender id).
 * Requires a page access token with instagram_basic permission.
 * Returns null on failure — caller should handle missing handle gracefully.
 */
export async function fetchInstagramUsername(
  igsid: string,
  pageAccessToken: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(igsid)}?fields=username&access_token=${encodeURIComponent(pageAccessToken)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const username = typeof data.username === "string" ? data.username : null;
    return username ? username.toLowerCase() : null;
  } catch {
    return null;
  }
}

// ═══ Send message via Graph API ═══

/**
 * Thrown when Meta Graph API returns a rate-limit error.
 * Graph error codes we treat as rate-limit:
 *   - 4    : application request limit reached
 *   - 17   : user request limit reached
 *   - 32   : page request limit reached
 *   - 613  : calls to messaging API exceeded
 *   - 429  : HTTP too-many-requests (non-Graph path)
 * The worker should re-queue the job and back off.
 */
export class MetaRateLimitError extends Error {
  code: number | null;
  constructor(message: string, code: number | null = null) {
    super(message);
    this.name = "MetaRateLimitError";
    this.code = code;
  }
}

type GraphError = {
  code?: number;
  error_subcode?: number;
  message?: string;
  type?: string;
};

function isRateLimitCode(code: number | undefined): boolean {
  if (code === undefined || code === null) return false;
  return code === 4 || code === 17 || code === 32 || code === 429 || code === 613;
}

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
    const errText = await res.text();
    // Try to parse as Graph error for structured handling.
    let parsed: GraphError | undefined;
    try {
      const json = JSON.parse(errText);
      parsed = (json?.error || json) as GraphError;
    } catch {
      parsed = undefined;
    }

    if (res.status === 429 || isRateLimitCode(parsed?.code)) {
      throw new MetaRateLimitError(
        parsed?.message || `Graph API rate-limited (${res.status})`,
        parsed?.code ?? res.status
      );
    }

    return { success: false, error: `Graph API ${res.status}: ${errText}` };
  }

  const data = await res.json();
  return { success: true, messageId: data.message_id };
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  verifyWebhookSignature,
  verifyChallenge,
  parseMessagingEvents,
  type IncomingMessage,
} from "@/lib/instagram";

// Force Node runtime (crypto + service-role DB access required).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════════════════
// GET — Meta webhook verification (unchanged)
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// In-memory cache for model resolution by ig_business_id (60s TTL)
// ═══════════════════════════════════════════════════════════════════════════
type ModelCacheEntry = { modelSlug: string; defaultMode: string; expiresAt: number };
const modelCache = new Map<string, ModelCacheEntry>();
const MODEL_CACHE_TTL_MS = 60_000;
const FALLBACK_MODEL_SLUG = "m1"; // YUMI

async function resolveModelForRecipient(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  recipientId: string
): Promise<{ modelSlug: string; defaultMode: string }> {
  const now = Date.now();
  const cached = modelCache.get(recipientId);
  if (cached && cached.expiresAt > now) {
    return { modelSlug: cached.modelSlug, defaultMode: cached.defaultMode };
  }

  const { data } = await db
    .from("instagram_config")
    .select("model_slug, default_mode")
    .eq("ig_business_id", recipientId)
    .limit(1)
    .maybeSingle();

  const modelSlug = data?.model_slug || FALLBACK_MODEL_SLUG;
  const defaultMode =
    data?.default_mode || process.env.INSTAGRAM_DEFAULT_MODE || "human";

  modelCache.set(recipientId, {
    modelSlug,
    defaultMode,
    expiresAt: now + MODEL_CACHE_TTL_MS,
  });
  return { modelSlug, defaultMode };
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — Receive Instagram messages (async pattern)
//
// Target: <500ms / msg. No OpenRouter, no Graph API send. DB writes only.
// Pipeline per msg:
//   1. INSERT instagram_messages ON CONFLICT DO NOTHING → atomic dedup
//   2. Resolve model_slug (cache 60s, fallback m1)
//   3. Resolve / upsert fan by pseudo_insta (IG username = senderId fallback)
//   4. UPSERT instagram_conversations ON CONFLICT (model_slug, ig_user_id)
//   5. RPC ig_conv_increment_count(conv_id) — atomic counter
//   6. If agent mode → enqueue ig_reply_queue ON CONFLICT DO NOTHING
//   7. Log ops_metrics (webhook_message_received, webhook_dedup, webhook_latency_ms)
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const rawBody = await req.text();

  // Verify signature
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // Meta should never send invalid JSON after signature pass; 200 anyway.
    return NextResponse.json({ received: true, invalid_json: true });
  }

  const messages = parseMessagingEvents(body);

  if (messages.length === 0) {
    return NextResponse.json({ received: true, processed: 0 });
  }

  const db = getServerSupabase();
  if (!db) {
    // Meta dislikes retries; log and 200.
    console.error("[IG webhook] DB not configured");
    return NextResponse.json({ received: true, db: "unavailable" });
  }

  // Global kill-switch : if agent disabled, still persist messages but skip enqueue.
  const agentGloballyEnabled = process.env.INSTAGRAM_AGENT_ENABLED === "true";

  let processed = 0;
  for (const msg of messages) {
    try {
      await ingestMessage(db, msg, agentGloballyEnabled);
      processed += 1;
    } catch (err) {
      // Agressive catch : never propagate — Meta would retry the batch.
      console.error("[IG webhook] ingest failed for", msg.messageId, err);
      await safeMetric(db, "webhook_ingest_error", 1, {
        source: "instagram",
        error: String(err).slice(0, 200),
      });
    }
  }

  const elapsed =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  await safeMetric(db, "webhook_latency_ms", elapsed, {
    source: "instagram",
    batch_size: messages.length,
    processed,
  });

  return NextResponse.json({ received: true, processed });
}

// ═══════════════════════════════════════════════════════════════════════════
// ingestMessage — persist one incoming IG message, enqueue if agent mode
// ═══════════════════════════════════════════════════════════════════════════
async function ingestMessage(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  msg: IncomingMessage,
  agentGloballyEnabled: boolean
): Promise<void> {
  // (a) Resolve model first — needed for conversation upsert AND for metric tags.
  const { modelSlug, defaultMode } = await resolveModelForRecipient(
    db,
    msg.recipientId
  );

  // (b) Resolve or create fan by Instagram handle.
  //     At webhook time we only have senderId (IGSID). If the webhook payload
  //     carried a username we would prefer it; since it doesn't, we store
  //     the IGSID as pseudo_insta (prefix `ig:` to avoid collisions with real @handles).
  //     The worker can later call fetchInstagramUsername and reconcile.
  const pseudoInsta = `ig:${msg.senderId}`;
  const fanId = await resolveFanIdByPseudo(db, pseudoInsta);

  // (c) Upsert conversation — ON CONFLICT (model_slug, ig_user_id).
  const upsertPayload: Record<string, unknown> = {
    model_slug: modelSlug,
    ig_user_id: msg.senderId,
    last_message_at: new Date().toISOString(),
  };
  if (fanId) upsertPayload.fan_id = fanId;

  const { data: conv, error: convErr } = await db
    .from("instagram_conversations")
    .upsert(upsertPayload, { onConflict: "model_slug,ig_user_id" })
    .select("id, mode, fan_id")
    .single();

  if (convErr || !conv) {
    console.error("[IG webhook] conversation upsert failed", convErr);
    return;
  }

  // (d) Atomic dedup-aware INSERT of the incoming message.
  //     Relies on UNIQUE(ig_message_id) added in migration 038.
  const { data: inserted, error: msgErr } = await db
    .from("instagram_messages")
    .insert({
      conversation_id: conv.id,
      role: "user",
      content: msg.text,
      ig_message_id: msg.messageId,
    })
    .select("id")
    .maybeSingle();

  // ON CONFLICT DO NOTHING is not directly expressible via supabase-js insert.
  // We rely on the UNIQUE constraint to return a 23505 duplicate error, which
  // we interpret as "already processed — skip".
  if (msgErr) {
    const code = (msgErr as { code?: string }).code;
    if (code === "23505") {
      // Duplicate — dedup hit. Metric and early return (no enqueue, no counter).
      await safeMetric(db, "webhook_dedup", 1, {
        source: "instagram",
        model: modelSlug,
      });
      return;
    }
    console.error("[IG webhook] message insert failed", msgErr);
    return;
  }
  if (!inserted) {
    // No row returned — treat as noop.
    return;
  }

  // (e) Atomic increment via RPC (migration 038).
  try {
    await db.rpc("ig_conv_increment_count", { p_conv_id: conv.id });
  } catch (err) {
    // Non-fatal — we just lose a tick on the counter.
    console.warn("[IG webhook] ig_conv_increment_count failed", err);
  }

  // (f) Enqueue a reply job when the conversation is (or defaults to) agent mode.
  const effectiveMode = conv.mode || defaultMode;
  if (agentGloballyEnabled && effectiveMode === "agent") {
    const { error: qErr } = await db.from("ig_reply_queue").insert({
      conversation_id: conv.id,
      ig_message_id: msg.messageId,
      status: "pending",
    });
    if (qErr) {
      const code = (qErr as { code?: string }).code;
      if (code !== "23505") {
        // 23505 = already enqueued for this ig_message_id — silent.
        console.error("[IG webhook] enqueue failed", qErr);
      }
    }
  }

  // (g) Metric: message received.
  await safeMetric(db, "webhook_message_received", 1, {
    source: "instagram",
    model: modelSlug,
    enqueued: agentGloballyEnabled && effectiveMode === "agent",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// resolveFanIdByPseudo — find fan by pseudo_insta, insert if missing
// ═══════════════════════════════════════════════════════════════════════════
async function resolveFanIdByPseudo(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  pseudoInsta: string
): Promise<string | null> {
  const handle = pseudoInsta.toLowerCase();

  const { data: existing } = await db
    .from("agence_fans")
    .select("id, merged_into_id")
    .ilike("pseudo_insta", handle)
    .maybeSingle();

  if (existing) return existing.merged_into_id || existing.id;

  // UNIQUE (pseudo_insta) + ON CONFLICT DO UPDATE SET updated_at=now() pattern.
  const { data: created, error } = await db
    .from("agence_fans")
    .upsert(
      { pseudo_insta: handle, updated_at: new Date().toISOString() },
      { onConflict: "pseudo_insta" }
    )
    .select("id")
    .single();

  if (error) {
    console.warn("[IG webhook] resolveFan upsert failed", error);
    return null;
  }
  return created?.id || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// safeMetric — fire-and-log metric write (never throws)
// ═══════════════════════════════════════════════════════════════════════════
async function safeMetric(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  metric: string,
  value: number,
  tags: Record<string, unknown>
): Promise<void> {
  try {
    await db.from("ops_metrics").insert({ metric, value, tags });
  } catch (err) {
    console.warn("[IG webhook] metric write failed", metric, err);
  }
}

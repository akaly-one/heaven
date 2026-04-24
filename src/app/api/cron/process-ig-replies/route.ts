import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  sendInstagramReply,
  MetaRateLimitError,
} from "@/lib/instagram";
import { generateReply } from "@/lib/openrouter";
import { generateReplyGroq, hasGroqKey, GROQ_DEFAULT_MODEL } from "@/lib/groq";

// Force Node runtime — crypto / Graph / service-role.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max jobs processed per tick. Vercel cron = every minute ; keep under 60s.
const BATCH_SIZE = 5;

// Ceiling of Meta send calls per sliding hour (conservative wrt app-level limit).
const META_CALLS_PER_HOUR_LIMIT = 180;

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/cron/process-ig-replies
//
// Auth: CRON_SECRET header (Bearer) OR Vercel Cron signature header.
// Behaviour:
//   1. Rate-limit gate (ops_metrics.meta_api_call count over last hour).
//   2. Claim up to BATCH_SIZE pending jobs via RPC claim_ig_reply_jobs
//      (FOR UPDATE SKIP LOCKED).
//   3. For each job → generate placeholder reply → sendInstagramReply →
//      persist agent message → mark done.
//   4. On failure: increment retry_count. After 3 retries → status=failed.
//   5. On MetaRateLimitError: re-queue immediately (status=pending) and
//      short-circuit the rest of the batch.
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  const t0 = Date.now();

  // ─── 1. Rate-limit gate (Meta app-level send limit) ───────────────────────
  const sinceIso = new Date(Date.now() - 3_600_000).toISOString();
  const { count: metaCallsLastHour } = await db
    .from("ops_metrics")
    .select("*", { count: "exact", head: true })
    .eq("metric", "meta_api_call")
    .gte("created_at", sinceIso);

  if ((metaCallsLastHour || 0) >= META_CALLS_PER_HOUR_LIMIT) {
    await safeMetric(db, "worker_skipped_rate_limit", 1, {
      calls_last_hour: metaCallsLastHour,
    });
    return NextResponse.json({
      skipped: "rate_limit",
      calls_last_hour: metaCallsLastHour,
      limit: META_CALLS_PER_HOUR_LIMIT,
    });
  }

  // ─── 2. Claim pending jobs ────────────────────────────────────────────────
  type Job = {
    id: string;
    conversation_id: string;
    ig_message_id: string;
    recipient_id: string;
    retry_count: number;
  };

  const { data: jobs, error: claimErr } = await db.rpc("claim_ig_reply_jobs", {
    p_limit: BATCH_SIZE,
  });
  if (claimErr) {
    console.error("[IG worker] claim_ig_reply_jobs failed", claimErr);
    return NextResponse.json({ error: "claim_failed", detail: claimErr.message }, { status: 500 });
  }
  const claimed: Job[] = (jobs as Job[]) || [];
  if (claimed.length === 0) {
    await safeMetric(db, "worker_run_ms", Date.now() - t0, { processed: 0 });
    return NextResponse.json({ processed: 0 });
  }

  // ─── 3. Process each claimed job ──────────────────────────────────────────
  // Phase 4 V1 : Groq direct en priorité (free tier 14 400 req/jour),
  // fallback OpenRouter si Groq absent. Canned si aucun provider configuré.
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = hasGroqKey();
  const aiConfigured = groqKey || openrouterKey;
  const results: Array<{ id: string; status: string; error?: string }> = [];
  let halted = false;

  for (const job of claimed) {
    if (halted) {
      // Rate-limit short-circuit — re-queue remainder as pending.
      await db
        .from("ig_reply_queue")
        .update({ status: "pending", started_at: null })
        .eq("id", job.id);
      results.push({ id: job.id, status: "requeued_rate_limit" });
      continue;
    }

    try {
      // --- (a) Generate reply text via IA (Phase 4 activated) ---------------
      // Pipeline : fetch persona active + history + appelle provider via OpenRouter
      const aiRunStart = Date.now();
      let replyText = "";
      let aiRunId: string | null = null;
      let providerId = "groq-llama-3.3-70b";
      let personaVersion = 1;

      if (aiConfigured) {
        // Resolve model_slug from conversation
        const { data: conv } = await db
          .from("instagram_conversations")
          .select("model_slug")
          .eq("id", job.conversation_id)
          .maybeSingle();
        const modelSlug = conv?.model_slug || "yumi";

        // Load active persona
        const { data: persona } = await db
          .from("agent_personas")
          .select("base_prompt, default_provider, version, trait_warmth, trait_flirt, favorite_emojis, favorite_endings")
          .eq("model_slug", modelSlug)
          .eq("is_active", true)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Load provider config (au cas où on route via OpenRouter fallback)
        const providerKey = persona?.default_provider || "groq-llama-3.3-70b";
        const { data: provider } = await db
          .from("ai_providers")
          .select("id, endpoint, max_tokens, temperature")
          .eq("id", providerKey)
          .eq("active", true)
          .maybeSingle();
        providerId = provider?.id || providerKey;
        personaVersion = persona?.version || 1;

        // Load last 5 messages in conversation (history)
        const { data: history } = await db
          .from("instagram_messages")
          .select("role, content")
          .eq("conversation_id", job.conversation_id)
          .order("created_at", { ascending: false })
          .limit(5);
        const historyOrdered = (history || []).reverse();

        // Build system prompt with traits
        const systemPrompt = persona?.base_prompt
          || "Tu es Yumi, créatrice de contenu. Réponds court et naturel en français.";

        // Build messages array
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: systemPrompt },
          ...historyOrdered.map((m) => ({
            role: (m.role === "agent" ? "assistant" : "user") as "assistant" | "user",
            content: m.content,
          })),
        ];

        try {
          let content = "";
          let tokensIn = 0;
          let tokensOut = 0;

          if (groqKey) {
            // V1 : Groq direct (gratuit, 14 400/jour)
            providerId = "groq-direct-llama-3.3-70b";
            const aiResp = await generateReplyGroq(messages, {
              model: GROQ_DEFAULT_MODEL,
              maxTokens: provider?.max_tokens ?? 256,
              temperature: Number(provider?.temperature) || 0.8,
            });
            content = aiResp.content;
            tokensIn = aiResp.tokensIn;
            tokensOut = aiResp.tokensOut;
          } else {
            // Fallback : OpenRouter (multi-provider)
            const modelId = provider?.endpoint?.replace(/^openrouter:\/\//, "")
              || "meta-llama/llama-3.3-70b-instruct";
            const aiResp = await generateReply(messages, {
              model: modelId,
              maxTokens: provider?.max_tokens ?? 256,
              temperature: Number(provider?.temperature) || 0.8,
            });
            content = aiResp.content;
            tokensIn = aiResp.tokens;
            tokensOut = 0;
          }

          replyText = content || "Hey 💜";

          const { data: runRow } = await db
            .from("ai_runs")
            .insert({
              conversation_id: job.conversation_id,
              conversation_source: "instagram",
              model_slug: modelSlug,
              provider_id: providerId,
              persona_version: personaVersion,
              input_message: historyOrdered[historyOrdered.length - 1]?.content ?? null,
              output_message: replyText,
              tokens_in: tokensIn,
              tokens_out: tokensOut,
              latency_ms: Date.now() - aiRunStart,
            })
            .select("id")
            .maybeSingle();
          aiRunId = runRow?.id || null;
        } catch (aiErr) {
          console.warn("[IG worker] AI generate failed, fallback canned:", aiErr);
          replyText = "Hey mon cœur 💜 je te réponds très vite";
          await db.from("ai_runs").insert({
            conversation_id: job.conversation_id,
            conversation_source: "instagram",
            model_slug: modelSlug,
            provider_id: providerId,
            persona_version: personaVersion,
            error_message: String(aiErr).slice(0, 500),
            latency_ms: Date.now() - aiRunStart,
          });
        }
      } else {
        // Aucune clé IA configurée
        replyText = "[IA not configured — placeholder]";
      }

      // --- (b) Send via Meta Graph -----------------------------------------
      const sendRes = await sendInstagramReply(job.recipient_id, replyText);

      if (!sendRes.success) {
        // Non-rate-limit send failure → treat as retryable error.
        throw new Error(sendRes.error || "send_failed");
      }

      // --- (c) Log the Meta API call (feeds the rate-limit gate) -----------
      await safeMetric(db, "meta_api_call", 1, {
        method: "send",
        model: "m1", // resolved server-side at send-time; placeholder for now.
      });

      // --- (d) Persist the agent reply --------------------------------------
      const messageId = sendRes.messageId;
      const insertPayload: Record<string, unknown> = {
        conversation_id: job.conversation_id,
        role: "agent",
        content: replyText,
      };
      if (messageId) insertPayload.ig_message_id = messageId;
      if (aiRunId) insertPayload.ai_run_id = aiRunId;

      const { error: insertErr } = await db
        .from("instagram_messages")
        .insert(insertPayload);

      if (insertErr) {
        const code = (insertErr as { code?: string }).code;
        // 23505 (duplicate ig_message_id) means we already logged this reply
        // on a previous run — still count as success to let the job close.
        if (code !== "23505") {
          console.error("[IG worker] insert agent msg failed", insertErr);
        }
      }

      // --- (e) Mark job done ------------------------------------------------
      await db
        .from("ig_reply_queue")
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      results.push({ id: job.id, status: "done" });
    } catch (err) {
      if (err instanceof MetaRateLimitError) {
        // Re-queue this job as pending and halt the batch.
        await db
          .from("ig_reply_queue")
          .update({
            status: "pending",
            started_at: null,
            last_error: `rate_limit:${err.code ?? "?"}:${err.message}`.slice(0, 500),
          })
          .eq("id", job.id);
        await safeMetric(db, "worker_rate_limit_hit", 1, {
          code: err.code ?? null,
        });
        results.push({ id: job.id, status: "requeued_rate_limit" });
        halted = true;
        continue;
      }

      // Generic failure path — retry up to 3 times.
      const newRetry = (job.retry_count || 0) + 1;
      const status = newRetry >= 3 ? "failed" : "pending";
      await db
        .from("ig_reply_queue")
        .update({
          status,
          retry_count: newRetry,
          started_at: null,
          last_error: String(err).slice(0, 500),
        })
        .eq("id", job.id);

      results.push({ id: job.id, status, error: String(err).slice(0, 200) });
    }
  }

  await safeMetric(db, "worker_run_ms", Date.now() - t0, {
    processed: results.length,
    halted,
  });

  return NextResponse.json({
    processed: results.length,
    halted,
    results,
    elapsed_ms: Date.now() - t0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Auth: Vercel Cron header OR CRON_SECRET (Bearer)
// ═══════════════════════════════════════════════════════════════════════════
function isAuthorizedCron(req: NextRequest): boolean {
  // Vercel Cron injects an `x-vercel-cron` header (value = schedule or "1").
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron) return true;

  // Fallback: manual / external trigger via bearer secret.
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
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
    console.warn("[IG worker] metric write failed", metric, err);
  }
}

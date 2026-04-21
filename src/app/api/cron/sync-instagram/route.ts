import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

// Force Node runtime — Graph fetch + service-role writes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Soft tick budget — Vercel cron invokes this every 15 min; keep comfortably under 60s.
const PER_MODEL_LIMIT = 25;

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/cron/sync-instagram
//
// Auth:   Vercel Cron header OR CRON_SECRET (Bearer) — mirrors process-ig-replies.
// Behaviour:
//   1. For every active instagram_config row → fetch last PER_MODEL_LIMIT posts
//      via Meta Graph v19.0 /{ig_business_id}/media.
//   2. Upsert each post into agence_feed_items on (model, source_type, external_id).
//   3. Soft-delete posts (deleted_at) that disappear from the window (<7j old).
//   4. Log meta_api_call + sync_instagram_run_ms via ops_metrics.
//
// NOTE (Phase 2):
//   Meta CDN URLs for videos expire in 24h and images in ~48h. We keep them as-is
//   for now — the cron refresh every 15 min is enough to keep them fresh. Phase 2
//   will re-upload media to Cloudinary (durable storage + CDN) and store the
//   Cloudinary URL in media_url alongside the original Meta URL in source_payload.
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

  // ─── 1. Active IG configs ────────────────────────────────────────────────
  const { data: configs, error: cfgErr } = await db
    .from("instagram_config")
    .select("model_slug, ig_business_id, page_access_token")
    .eq("is_active", true);

  if (cfgErr) {
    return NextResponse.json({ error: "config_query_failed", detail: cfgErr.message }, { status: 500 });
  }

  let totalCreated = 0;
  let totalDeleted = 0;
  const errors: string[] = [];

  for (const cfg of configs || []) {
    const modelSlug = cfg.model_slug as string;
    if (!cfg.ig_business_id || !cfg.page_access_token) {
      errors.push(`${modelSlug}: missing ig_business_id or token`);
      continue;
    }

    try {
      // ─── 2. Fetch last N posts via Graph API ────────────────────────────
      const url = new URL(`https://graph.facebook.com/v19.0/${cfg.ig_business_id}/media`);
      url.searchParams.set(
        "fields",
        "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
      );
      url.searchParams.set("limit", String(PER_MODEL_LIMIT));
      url.searchParams.set("access_token", cfg.page_access_token as string);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        data?: IgMediaItem[];
        error?: { message?: string; code?: number };
      };

      if (!res.ok || !Array.isArray(json.data)) {
        errors.push(`${modelSlug}: ${json.error?.message || res.statusText}`);
        // Still log the call attempt — it counts against app-level rate limit.
        await safeMetric(db, "meta_api_call", 1, {
          method: "media_list",
          model: modelSlug,
          ok: false,
        });
        continue;
      }

      const fetched = json.data;

      // ─── 3. Upsert each post ──────────────────────────────────────────
      for (const post of fetched) {
        const mediaType = (post.media_type || "image")
          .toLowerCase()
          .replace("_album", "")
          .replace("carousel", "carousel");

        const upsert = {
          model: modelSlug,
          source_type: "instagram" as const,
          external_id: post.id,
          external_url: post.permalink ?? null,
          media_type: mediaType,
          media_url: post.media_url || post.thumbnail_url || null,
          thumbnail_url: post.thumbnail_url || null,
          caption: post.caption ?? null,
          like_count: post.like_count ?? 0,
          comment_count: post.comments_count ?? 0,
          posted_at: post.timestamp,
          synced_at: new Date().toISOString(),
          source_payload: post as unknown as Record<string, unknown>,
        };

        const { error: upErr } = await db
          .from("agence_feed_items")
          .upsert(upsert, { onConflict: "model,source_type,external_id" });

        if (upErr) {
          errors.push(`upsert ${post.id}: ${upErr.message}`);
        } else {
          totalCreated += 1;
        }
      }

      // ─── 4. Soft-delete vanished posts (window = last 7 days) ─────────
      const fetchedIds = new Set(fetched.map((p) => p.id));
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

      const { data: recent } = await db
        .from("agence_feed_items")
        .select("id, external_id")
        .eq("model", modelSlug)
        .eq("source_type", "instagram")
        .gte("posted_at", sevenDaysAgo)
        .is("deleted_at", null);

      for (const row of (recent || []) as Array<{ id: string; external_id: string | null }>) {
        if (row.external_id && !fetchedIds.has(row.external_id)) {
          const { error: delErr } = await db
            .from("agence_feed_items")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", row.id);
          if (delErr) errors.push(`soft-delete ${row.id}: ${delErr.message}`);
          else totalDeleted += 1;
        }
      }

      // ─── 5. Log meta call (feeds rate-limit gate) ─────────────────────
      await safeMetric(db, "meta_api_call", 1, {
        method: "media_list",
        model: modelSlug,
        ok: true,
        fetched: fetched.length,
      });
    } catch (err) {
      errors.push(`${modelSlug}: ${String(err).slice(0, 200)}`);
    }
  }

  await safeMetric(db, "sync_instagram_run_ms", Date.now() - t0, {
    models: (configs || []).length,
    created: totalCreated,
    deleted: totalDeleted,
    errors: errors.length,
  });

  return NextResponse.json({
    ok: true,
    models: (configs || []).length,
    created: totalCreated,
    deleted: totalDeleted,
    errors,
    elapsed_ms: Date.now() - t0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════
type IgMediaItem = {
  id: string;
  caption?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  permalink?: string | null;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

// ═══════════════════════════════════════════════════════════════════════════
// Auth: Vercel Cron header OR CRON_SECRET (Bearer)
// ═══════════════════════════════════════════════════════════════════════════
function isAuthorizedCron(req: NextRequest): boolean {
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron) return true;
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
    console.warn("[sync-instagram] metric write failed", metric, err);
  }
}

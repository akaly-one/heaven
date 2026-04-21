import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { uploadToCloudinary } from "@/lib/cloudinary";

// Force Node runtime — Graph fetch + service-role writes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Soft tick budget — Vercel cron invokes this every 15 min; keep comfortably under 60s.
const PER_MODEL_LIMIT = 25;
// Budget for Cloudinary re-uploads in a single tick — keep the cron snappy.
// Any items over this cap will be picked up on the next run.
const REUPLOAD_BUDGET_PER_TICK = 6;
// Consider a Meta CDN URL "at risk" once the post is older than this threshold.
// Meta's documented expiry is ~24h for videos, ~48h for images. 20h gives us a
// safety margin inside the image window while forcing rotation before videos die.
const MIRROR_AGE_THRESHOLD_HOURS = 20;

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/cron/sync-instagram
//
// Auth:   Vercel Cron header OR CRON_SECRET (Bearer) — mirrors process-ig-replies.
// Behaviour:
//   1. For every active instagram_config row → fetch last PER_MODEL_LIMIT posts
//      via Meta Graph v19.0 /{ig_business_id}/media.
//   2. Upsert each post into agence_feed_items on (model, source_type, external_id).
//   3. Soft-delete posts (deleted_at) that disappear from the window (<7j old).
//   4. Re-upload Meta CDN URLs to Cloudinary for posts older than
//      MIRROR_AGE_THRESHOLD_HOURS so we have a durable copy before the CDN URL
//      expires (24h videos / 48h images). See `mirrorMetaMediaToCloudinary`.
//   5. Log meta_api_call + sync_instagram_run_ms + mirror_created via ops_metrics.
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
  let totalMirrored = 0;
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

      // ─── 5. Mirror aging Meta CDN URLs → Cloudinary ───────────────────
      // Picks up to REUPLOAD_BUDGET_PER_TICK posts for THIS model that are
      // older than MIRROR_AGE_THRESHOLD_HOURS and still pointing at a Meta URL
      // (no `mirror_url` stamp in source_payload), then re-uploads each.
      try {
        const mirrored = await mirrorMetaMediaToCloudinary(
          db,
          modelSlug,
          REUPLOAD_BUDGET_PER_TICK,
          errors,
        );
        totalMirrored += mirrored;
      } catch (mErr) {
        errors.push(`${modelSlug} mirror: ${String(mErr).slice(0, 200)}`);
      }

      // ─── 6. Log meta call (feeds rate-limit gate) ─────────────────────
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
    mirrored: totalMirrored,
    errors: errors.length,
  });

  return NextResponse.json({
    ok: true,
    models: (configs || []).length,
    created: totalCreated,
    deleted: totalDeleted,
    mirrored: totalMirrored,
    errors,
    elapsed_ms: Date.now() - t0,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// mirrorMetaMediaToCloudinary
//
// Why: Meta CDN URLs returned by /media are signed and expire in 24-48h.
// We re-upload each post's media into Cloudinary once it crosses the threshold
// (MIRROR_AGE_THRESHOLD_HOURS) so we always have a durable copy.
//
// After a successful re-upload:
//   - `agence_feed_items.media_url` is swapped to the Cloudinary secure_url
//   - `source_payload.mirror` records the public_id + timestamp for audit
//   - `source_payload.meta_url_original` keeps the expired Meta URL for debugging
//
// Idempotency: we only process rows where `source_payload.mirror` is NOT set.
// Budget is bounded per tick to keep the cron well under the lambda limit.
// ═══════════════════════════════════════════════════════════════════════════
async function mirrorMetaMediaToCloudinary(
  db: NonNullable<ReturnType<typeof getServerSupabase>>,
  modelSlug: string,
  budget: number,
  errorsSink: string[],
): Promise<number> {
  const staleIso = new Date(
    Date.now() - MIRROR_AGE_THRESHOLD_HOURS * 3600_000
  ).toISOString();

  // Candidate rows: posted more than MIRROR_AGE_THRESHOLD_HOURS ago, still
  // have a media_url, not yet mirrored. We can't filter JSON path efficiently
  // without an index — fetch a small pool and filter in-memory.
  const { data: rows, error } = await db
    .from("agence_feed_items")
    .select("id, external_id, media_url, media_type, source_payload")
    .eq("model", modelSlug)
    .eq("source_type", "instagram")
    .is("deleted_at", null)
    .lt("posted_at", staleIso)
    .not("media_url", "is", null)
    .order("posted_at", { ascending: false })
    .limit(budget * 3); // over-fetch to account for already-mirrored rows

  if (error) {
    errorsSink.push(`${modelSlug} mirror query: ${error.message}`);
    return 0;
  }

  type Row = {
    id: string;
    external_id: string | null;
    media_url: string | null;
    media_type: string | null;
    source_payload: Record<string, unknown> | null;
  };

  let count = 0;
  for (const r of (rows as Row[]) || []) {
    if (count >= budget) break;
    const payload = (r.source_payload || {}) as Record<string, unknown>;
    if (payload.mirror) continue; // already done
    if (!r.media_url) continue;
    // Only re-upload Meta CDN URLs (avoid re-uploading our own Cloudinary URLs
    // in case a manual post was merged into the feed).
    if (!/fbcdn|cdninstagram|scontent/.test(r.media_url)) continue;

    try {
      const resourceType: "image" | "video" =
        r.media_type === "video" || r.media_type === "reels" ? "video" : "image";
      const up = await uploadToCloudinary(r.media_url, {
        folder: `heaven/${modelSlug}/instagram-mirror`,
        resource_type: resourceType,
      });

      const newPayload = {
        ...payload,
        meta_url_original: r.media_url,
        mirror: {
          public_id: up.public_id,
          url: up.url,
          at: new Date().toISOString(),
        },
      };

      const { error: upErr } = await db
        .from("agence_feed_items")
        .update({
          media_url: up.url,
          source_payload: newPayload,
        })
        .eq("id", r.id);

      if (upErr) {
        errorsSink.push(`mirror update ${r.id}: ${upErr.message}`);
      } else {
        count += 1;
      }
    } catch (err) {
      errorsSink.push(
        `mirror ${r.external_id || r.id}: ${String(err).slice(0, 150)}`
      );
    }
  }

  return count;
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

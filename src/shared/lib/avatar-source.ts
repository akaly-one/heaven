/**
 * avatar-source — Phase 3 Agent 3.A (B9 / P0-12 / P1-7)
 *
 * Resolution strategy for dashboard avatars.
 *
 * Priority order:
 *   1. Meta Graph API (live `profile_picture_url`, TTL 1h in-memory cache)
 *      → requires instagram_config.ig_business_id + page_access_token for the model.
 *   2. DB mirror (`agence_media_config.folder_avatar`-derived Cloudinary URL if any,
 *      otherwise `agence_models.avatar_url`) — kept in sync by the sync-instagram cron.
 *   3. Fallback: first letter of the display name (or slug) in uppercase.
 *
 * Server-only module (reads service-role DB + calls Meta Graph).
 * Safe to import from route handlers.
 *
 * The shape returned lets the consumer render either an <img> (when src is an http(s) url)
 * or an initial badge (when source === 'fallback_initial').
 */

import { getServerSupabase } from "./supabase-server";
import { toModelId, toSlug } from "./model-utils";

export type AvatarSource =
  | "meta_live"
  | "cloudinary_mirror"
  | "db_mirror"
  | "fallback_initial";

export interface ResolvedAvatar {
  /** Either an http(s) URL (meta_live / cloudinary_mirror / db_mirror) or a single uppercase letter (fallback_initial). */
  src: string;
  source: AvatarSource;
  fetched_at: Date;
  /** Instagram business identifiers when available — useful for consumers that want to render badges. */
  username?: string | null;
}

// In-memory TTL cache (Meta live avatar) — keyed by model_id.
// TTL = 1h. Profile picture URLs returned by Graph are already CDN-signed, so
// this cache exists mostly to avoid Meta API hits on every dashboard poll.
const META_TTL_MS = 60 * 60 * 1000;
const metaCache = new Map<
  string,
  { url: string; username: string | null; expires_at: number }
>();

/**
 * Resolve the best available avatar for a given model identifier (slug or model_id).
 *
 * Never throws — always returns a renderable value. If the Meta call fails (token missing,
 * rate-limit, network error) we silently fall back to the DB mirror then to the initial.
 */
export async function resolveAvatarSrc(
  modelRef: string,
): Promise<ResolvedAvatar> {
  const modelId = toModelId(modelRef);
  const slug = toSlug(modelId);
  const fallbackChar = (slug || modelId || "M").charAt(0).toUpperCase();

  const db = getServerSupabase();
  if (!db) {
    return {
      src: fallbackChar,
      source: "fallback_initial",
      fetched_at: new Date(),
    };
  }

  // ── 1. Meta Graph live (cached 1h) ──────────────────────────────────────
  const cached = metaCache.get(modelId);
  if (cached && cached.expires_at > Date.now()) {
    return {
      src: cached.url,
      source: "meta_live",
      fetched_at: new Date(),
      username: cached.username,
    };
  }

  try {
    const { data: cfg } = await db
      .from("instagram_config")
      .select("ig_business_id, page_access_token, ig_handle")
      .eq("model_slug", modelId)
      .maybeSingle();

    if (cfg?.ig_business_id && cfg.page_access_token) {
      const url =
        `https://graph.facebook.com/v19.0/${encodeURIComponent(cfg.ig_business_id as string)}` +
        `?fields=username,profile_picture_url` +
        `&access_token=${encodeURIComponent(cfg.page_access_token as string)}`;

      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          username?: string;
          profile_picture_url?: string;
        };
        if (data.profile_picture_url) {
          metaCache.set(modelId, {
            url: data.profile_picture_url,
            username: data.username || null,
            expires_at: Date.now() + META_TTL_MS,
          });
          return {
            src: data.profile_picture_url,
            source: "meta_live",
            fetched_at: new Date(),
            username: data.username || null,
          };
        }
      }
    }
  } catch {
    // fall through to DB mirror
  }

  // ── 2. DB mirror — Cloudinary avatar folder / agence_models.avatar_url ──
  try {
    const { data: model } = await db
      .from("agence_models")
      .select("avatar_url, display_name")
      .eq("model_id", modelId)
      .maybeSingle();

    const mirror =
      (model as { avatar_url?: string | null } | null)?.avatar_url || null;
    if (mirror) {
      return {
        src: mirror,
        source: "cloudinary_mirror",
        fetched_at: new Date(),
      };
    }
  } catch {
    // fall through
  }

  // ── 3. Fallback: initial letter ──────────────────────────────────────────
  return {
    src: fallbackChar,
    source: "fallback_initial",
    fetched_at: new Date(),
  };
}

/**
 * Clear the in-memory Meta cache (useful for tests or after a manual avatar rotation).
 */
export function clearAvatarCache(modelRef?: string) {
  if (!modelRef) {
    metaCache.clear();
    return;
  }
  metaCache.delete(toModelId(modelRef));
}

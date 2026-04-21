// ══════════════════════════════════════════════════════════════════════════
//  Instagram Business — Content Publishing API
//
//  Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
//
//  Required Meta permissions (App Review gated — see Phase 11):
//    - instagram_basic
//    - instagram_content_publish
//    - pages_read_engagement
//    - pages_show_list
//
//  ⚠️  DEVELOPMENT MODE:
//    Until App Review is granted, publishing only works for:
//      - test accounts added as Instagram Testers
//      - users with Developer / Tester roles on the App
//    Calling this with a non-tester account returns Graph error #200.
//    Callers should treat that as expected in DevMode — surface a friendly
//    message ("Publication IG désactivée en DevMode") rather than a hard fail.
//
//  Publishing flow (2-step):
//    1. POST /{ig-user-id}/media
//         image_url=... & caption=...
//       → returns { id: "creation_id" }
//    2. POST /{ig-user-id}/media_publish
//         creation_id=...
//       → returns { id: "media_id" }  (final IG media id)
//
//  Media URL constraints:
//    - Must be publicly accessible (no auth / cookies).
//    - JPEG for images, MP4 for videos.
//    - Cloudinary secure_url is fine.
// ══════════════════════════════════════════════════════════════════════════

const GRAPH_VERSION = "v21.0";

export interface PublishToInstagramParams {
  igBusinessAccountId: string;
  accessToken: string;
  imageUrl: string;   // public URL (Cloudinary OK). Use imageUrl for IMAGE media.
  videoUrl?: string;  // if set, publishes as VIDEO (Reels). Takes precedence over imageUrl.
  caption: string;
  mediaType?: "IMAGE" | "VIDEO" | "REELS";
}

export interface PublishToInstagramResult {
  creation_id: string;
  media_id?: string;
  raw?: Record<string, unknown>;
}

export class InstagramPublishError extends Error {
  code: number | null;
  graphSubcode: number | null;
  phase: "create" | "publish" | "poll";
  devModeLikely: boolean;

  constructor(
    message: string,
    phase: "create" | "publish" | "poll",
    opts: { code?: number; subcode?: number; devModeLikely?: boolean } = {},
  ) {
    super(message);
    this.name = "InstagramPublishError";
    this.phase = phase;
    this.code = opts.code ?? null;
    this.graphSubcode = opts.subcode ?? null;
    this.devModeLikely = Boolean(opts.devModeLikely);
  }
}

function isDevModeError(code: number | undefined, message: string | undefined): boolean {
  // Graph returns code 200 "Only the App Owner/Tester can..." in DevMode.
  // Also #10 / #190 subcodes can indicate permission / token issues on unverified app.
  if (code === 200) return true;
  if (!message) return false;
  return /app owner|tester|permission|not approved|development mode/i.test(message);
}

async function graphPost(
  url: string,
  body: Record<string, string>,
  accessToken: string,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const form = new URLSearchParams({ ...body, access_token: accessToken });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

/**
 * Publish a post to an Instagram Business account.
 *
 * For images: returns once media_publish succeeds → final media_id returned.
 * For videos: the creation container needs to finish processing server-side.
 *   This helper polls /{creation_id}?fields=status_code up to 10 times with
 *   backoff before attempting the final publish. If polling exhausts, the
 *   creation_id is returned and the caller can finalize later.
 */
export async function publishToInstagram(
  params: PublishToInstagramParams,
): Promise<PublishToInstagramResult> {
  const { igBusinessAccountId, accessToken, caption, mediaType } = params;
  if (!igBusinessAccountId) throw new InstagramPublishError("igBusinessAccountId required", "create");
  if (!accessToken) throw new InstagramPublishError("accessToken required", "create");

  const isVideo = Boolean(params.videoUrl) || mediaType === "VIDEO" || mediaType === "REELS";
  if (!isVideo && !params.imageUrl) {
    throw new InstagramPublishError("imageUrl required for IMAGE media", "create");
  }

  const base = `https://graph.facebook.com/${GRAPH_VERSION}`;

  // ── Step 1: create media container ──────────────────────────────────────
  const createBody: Record<string, string> = { caption: caption || "" };
  if (isVideo) {
    createBody.media_type = mediaType === "REELS" ? "REELS" : "VIDEO";
    if (params.videoUrl) createBody.video_url = params.videoUrl;
    else if (params.imageUrl) createBody.video_url = params.imageUrl;
  } else {
    createBody.image_url = params.imageUrl;
  }

  const create = await graphPost(
    `${base}/${igBusinessAccountId}/media`,
    createBody,
    accessToken,
  );

  if (!create.ok || typeof create.json.id !== "string") {
    const err = (create.json.error || create.json) as {
      code?: number;
      error_subcode?: number;
      message?: string;
    };
    throw new InstagramPublishError(
      err.message || `Graph create failed (HTTP ${create.status})`,
      "create",
      {
        code: err.code,
        subcode: err.error_subcode,
        devModeLikely: isDevModeError(err.code, err.message),
      },
    );
  }

  const creationId = create.json.id as string;

  // ── Step 2 (video only): poll container status ──────────────────────────
  if (isVideo) {
    let ready = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 1500 + attempt * 500)); // 1.5s → 6s
      const statusUrl = `${base}/${creationId}?fields=status_code&access_token=${encodeURIComponent(
        accessToken,
      )}`;
      const res = await fetch(statusUrl, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        status_code?: string;
        error?: { message?: string };
      };
      if (json.status_code === "FINISHED") {
        ready = true;
        break;
      }
      if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
        throw new InstagramPublishError(
          `media container ${json.status_code}`,
          "poll",
        );
      }
    }
    if (!ready) {
      // Defer — caller can retry publish later with the creation_id.
      return { creation_id: creationId, raw: create.json };
    }
  }

  // ── Step 3: publish ─────────────────────────────────────────────────────
  const publish = await graphPost(
    `${base}/${igBusinessAccountId}/media_publish`,
    { creation_id: creationId },
    accessToken,
  );

  if (!publish.ok || typeof publish.json.id !== "string") {
    const err = (publish.json.error || publish.json) as {
      code?: number;
      error_subcode?: number;
      message?: string;
    };
    throw new InstagramPublishError(
      err.message || `Graph publish failed (HTTP ${publish.status})`,
      "publish",
      {
        code: err.code,
        subcode: err.error_subcode,
        devModeLikely: isDevModeError(err.code, err.message),
      },
    );
  }

  return {
    creation_id: creationId,
    media_id: publish.json.id as string,
    raw: { create: create.json, publish: publish.json },
  };
}

/**
 * Fetch a Cloudinary URL + re-upload it to Cloudinary under a canonical folder.
 * Useful to replace Meta CDN URLs (expire in 24-48h) with durable storage.
 *
 * Implementation lives in /lib/cloudinary.ts — this helper is the signature
 * consumed by the cron re-upload loop; the cron imports uploadToCloudinary()
 * directly, so nothing else needed here.
 */

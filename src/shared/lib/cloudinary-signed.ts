// ══════════════════════════════════════════════════════════════════════════
//  Cloudinary Signed Upload (B8 — client-direct upload, no base64 round-trip)
//
//  Why:
//   - The legacy `/api/upload` route forces the browser to base64-encode the
//     whole file and POST it to Next.js, which buffers in memory before
//     forwarding to Cloudinary. Limits: ~10MB, Vercel function duration 30s,
//     double bandwidth usage.
//   - A signed upload lets the browser PUT directly to Cloudinary with
//     a timestamp+signature signed by our server (api_secret never leaves
//     the server). Supports up to 100MB without touching our lambda budget.
//
//  Security:
//   - `api_secret` is server-only — never exposed.
//   - Signature includes `folder=` so the server dictates the upload path.
//     The client cannot forge a folder belonging to another model.
//   - Signature TTL is Cloudinary-side ~5 min (timestamp rejected beyond that).
//
//  Caller responsibility:
//   - Call `generateSignedUpload(folder, modelId, apiSecret)` inside the
//     /api/upload/signed-url route after validating the folder matches
//     `heaven/{model_id}/…`.
// ══════════════════════════════════════════════════════════════════════════

import crypto from "crypto";

export interface SignedUploadParams {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string; // e.g. "heaven/m1/packs/summer-2026"
  upload_preset?: string;
  eager?: string; // optional eager transformation
  tags?: string;
}

export interface SignedUploadOptions {
  folder: string;
  eager?: string;
  tags?: string[];
  uploadPreset?: string;
}

/**
 * Generate a signed upload payload for client-direct Cloudinary upload.
 *
 * The browser will POST to https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload
 * with multipart form-data containing:
 *   - file
 *   - api_key
 *   - timestamp
 *   - signature
 *   - folder
 *   - tags (optional)
 *   - eager (optional)
 *
 * @param folder  Fully-qualified Cloudinary folder (e.g. "heaven/m1/packs/...")
 * @param modelId Model ID (m1, m2, ...) — used for sanity check + tag
 * @param apiSecret Server-side Cloudinary api_secret (never exposed)
 * @param options Additional signed params (eager transforms, tags, preset)
 */
export function generateSignedUpload(
  folder: string,
  modelId: string,
  apiSecret: string,
  options: Omit<SignedUploadOptions, "folder"> = {},
): SignedUploadParams {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  if (!cloudName || !apiKey) {
    throw new Error("cloudinary env missing (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY)");
  }
  if (!apiSecret) {
    throw new Error("apiSecret required");
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // Build tag list — always include `model:{id}` for observability.
  const tagSet = new Set<string>([`model:${modelId}`, ...(options.tags || [])]);
  const tagsStr = Array.from(tagSet).join(",");

  // Cloudinary signature format:
  //   sha1( sortedParams_joined_by_& + api_secret )
  // Only params that participate in the signature are included (NOT api_key,
  // NOT cloud_name, NOT file, NOT resource_type). All included params must be
  // sent verbatim by the client when uploading.
  const signedParams: Record<string, string> = {
    folder,
    tags: tagsStr,
    timestamp: String(timestamp),
  };
  if (options.eager) signedParams.eager = options.eager;
  if (options.uploadPreset) signedParams.upload_preset = options.uploadPreset;

  const toSign = Object.keys(signedParams)
    .sort()
    .map((k) => `${k}=${signedParams[k]}`)
    .join("&");

  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  const payload: SignedUploadParams = {
    cloud_name: cloudName,
    api_key: apiKey,
    timestamp,
    signature,
    folder,
    tags: tagsStr,
  };
  if (options.eager) payload.eager = options.eager;
  if (options.uploadPreset) payload.upload_preset = options.uploadPreset;

  return payload;
}

/**
 * Validate a folder path belongs to a model (`heaven/{modelId}/...`).
 * Shared between signed-url route and the legacy /api/upload route.
 */
export function isFolderOwnedByModel(folder: string, modelId: string): boolean {
  const prefix = `heaven/${modelId}/`;
  return folder === `heaven/${modelId}` || folder.startsWith(prefix);
}

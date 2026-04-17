import { v2 as cloudinary } from "cloudinary";

// CLOUDINARY_URL auto-configures the SDK if present.
// Explicit config as fallback ensures env vars are read at runtime.
if (!process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export default cloudinary;

/**
 * Upload a file (base64 or URL) to Cloudinary.
 * Returns the secure URL + public_id.
 */
export async function uploadToCloudinary(
  file: string, // base64 data URL or external URL
  options: {
    folder: string;       // e.g. "heaven/yumi/gallery"
    resource_type?: "image" | "video" | "auto";
    transformation?: Record<string, unknown>[];
  },
): Promise<{ url: string; public_id: string; width: number; height: number; format: string; bytes: number }> {
  const result = await cloudinary.uploader.upload(file, {
    folder: options.folder,
    resource_type: options.resource_type || "auto",
    transformation: options.transformation,
    quality: "auto",
    fetch_format: "auto",
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/**
 * Delete a file from Cloudinary by public_id.
 */
export async function deleteFromCloudinary(publicId: string, resourceType: "image" | "video" = "image") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Generate optimized URL with transformations.
 */
export function cloudinaryUrl(publicId: string, transforms: Record<string, unknown> = {}): string {
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: "auto",
    quality: "auto",
    ...transforms,
  });
}

/**
 * Generate a blurred preview URL (for locked content).
 */
export function cloudinaryBlurUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { effect: "blur:2000", quality: 30, fetch_format: "auto" },
    ],
  });
}

/**
 * List all resources in a folder (paginated).
 */
export async function listCloudinaryResources(
  folder: string,
  resourceType: "image" | "video" = "image",
  maxResults = 500,
): Promise<{ public_id: string; secure_url: string; bytes: number; created_at: string }[]> {
  const allResources: { public_id: string; secure_url: string; bytes: number; created_at: string }[] = [];
  let nextCursor: string | undefined;

  do {
    const result = await cloudinary.api.resources({
      type: "upload",
      resource_type: resourceType,
      prefix: folder,
      max_results: Math.min(maxResults - allResources.length, 500),
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    });

    for (const r of result.resources || []) {
      allResources.push({
        public_id: r.public_id,
        secure_url: r.secure_url,
        bytes: r.bytes,
        created_at: r.created_at,
      });
    }

    nextCursor = result.next_cursor;
  } while (nextCursor && allResources.length < maxResults);

  return allResources;
}

/**
 * Bulk delete resources by public_id.
 */
export async function bulkDeleteCloudinary(
  publicIds: string[],
  resourceType: "image" | "video" = "image",
): Promise<{ deleted: Record<string, string>; partial: boolean }> {
  // Cloudinary allows max 100 per bulk delete call
  const results: Record<string, string> = {};
  for (let i = 0; i < publicIds.length; i += 100) {
    const batch = publicIds.slice(i, i + 100);
    const res = await cloudinary.api.delete_resources(batch, { resource_type: resourceType });
    Object.assign(results, res.deleted || {});
  }
  return { deleted: results, partial: false };
}

/**
 * Generate a thumbnail URL.
 */
export function cloudinaryThumb(publicId: string, size = 300): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: size, height: size, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" },
    ],
  });
}

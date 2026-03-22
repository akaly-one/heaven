import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

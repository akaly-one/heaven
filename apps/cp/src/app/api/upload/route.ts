import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * Validate that a folder path belongs to the specified model.
 * Prevents model A from uploading into model B's Cloudinary folder.
 */
function validateFolderOwnership(folder: string, model: string): boolean {
  // Must start with heaven/{model}/ — strict isolation
  const expectedPrefix = `heaven/${model}/`;
  return folder.startsWith(expectedPrefix) || folder === `heaven/${model}`;
}

/**
 * POST /api/upload
 * Uploads a file to Cloudinary.
 *
 * Body: { file: string (base64 data URL), model: string, folder?: string, type?: "image"|"video"|"auto" }
 * Returns: { url, public_id, width, height, format, bytes }
 */
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { file, model, folder, type } = body;
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    if (!file) {
      return NextResponse.json({ error: "file required (base64 data URL)" }, { status: 400, headers: cors });
    }

    // Validate it's a data URL or http URL
    if (!file.startsWith("data:") && !file.startsWith("http")) {
      return NextResponse.json({ error: "Invalid file format" }, { status: 400, headers: cors });
    }

    // Resolve folder: if model provided, enforce isolation
    const targetFolder = folder || (model ? `heaven/${model}/content` : "heaven/uploads");

    // If model is specified, validate folder ownership
    if (model && isValidModelSlug(model)) {
      if (!validateFolderOwnership(targetFolder, model)) {
        return NextResponse.json(
          { error: `Folder ${targetFolder} does not belong to model ${model}` },
          { status: 403, headers: cors }
        );
      }

      // Check media config exists and model is active
      const supabase = getServerSupabase();
      if (supabase) {
        // Try both slug and model_id formats for compatibility
        const normalizedModel = toModelId(model);
        const { data: config } = await supabase
          .from("agence_media_config")
          .select("max_storage_mb, max_uploads, max_file_size_mb, total_files, total_bytes, is_active")
          .or(`model_slug.eq.${model},model_slug.eq.${normalizedModel}`)
          .single();

        if (config) {
          if (!config.is_active) {
            return NextResponse.json({ error: "Media disabled for this model" }, { status: 403, headers: cors });
          }
          // Check upload count quota
          if (config.total_files >= config.max_uploads) {
            return NextResponse.json({ error: `Upload limit reached (${config.max_uploads})` }, { status: 429, headers: cors });
          }
          // Check storage quota
          const usedMb = (config.total_bytes || 0) / (1024 * 1024);
          if (usedMb >= config.max_storage_mb) {
            return NextResponse.json({ error: `Storage limit reached (${config.max_storage_mb}MB)` }, { status: 429, headers: cors });
          }
        }
      }
    }

    // Estimate size from base64 (rough: base64 length * 0.75)
    if (file.startsWith("data:")) {
      const base64Part = file.split(",")[1] || "";
      const estimatedBytes = base64Part.length * 0.75;
      const maxBytes = 10 * 1024 * 1024; // 10MB
      if (estimatedBytes > maxBytes) {
        return NextResponse.json({ error: "File too large (10MB max)" }, { status: 400, headers: cors });
      }
    }

    const result = await uploadToCloudinary(file, {
      folder: targetFolder,
      resource_type: type || "auto",
    });

    return NextResponse.json(result, { headers: cors });
  } catch (err) {
    // Cloudinary errors can be objects with nested message/error properties
    let errMsg = "Unknown error";
    if (err instanceof Error) {
      errMsg = err.message;
    } else if (typeof err === "object" && err !== null) {
      const e = err as Record<string, unknown>;
      errMsg = (e.message || e.error || e.http_code ? `Cloudinary ${e.http_code}: ${e.message || e.error}` : JSON.stringify(err)) as string;
    } else {
      errMsg = String(err);
    }
    console.error("[API/upload] POST:", errMsg, err);
    return NextResponse.json({ error: `Upload failed: ${errMsg}` }, { status: 500, headers: cors });
  }
}

/**
 * DELETE /api/upload?public_id=xxx&type=image&model=yumi
 * Deletes a file from Cloudinary.
 * If model is provided, validates the public_id belongs to that model's folder.
 */
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const publicId = req.nextUrl.searchParams.get("public_id");
    const type = (req.nextUrl.searchParams.get("type") || "image") as "image" | "video";
    const model = req.nextUrl.searchParams.get("model");
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    if (!publicId) {
      return NextResponse.json({ error: "public_id required" }, { status: 400, headers: cors });
    }

    // If model specified, ensure the file belongs to this model
    if (model && isValidModelSlug(model)) {
      const expectedPrefix = `heaven/${model}/`;
      if (!publicId.startsWith(expectedPrefix)) {
        return NextResponse.json(
          { error: "Cannot delete files from another model" },
          { status: 403, headers: cors }
        );
      }
    }

    await deleteFromCloudinary(publicId, type);
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/upload] DELETE:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500, headers: cors });
  }
}

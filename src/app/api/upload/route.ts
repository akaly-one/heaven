import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";
const cors = getCorsHeaders();

// Max body size: Next.js default is 4MB, we increase via route config
export const maxDuration = 30;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/**
 * POST /api/upload
 * Uploads a file to Cloudinary.
 *
 * Body: { file: string (base64 data URL), folder?: string, type?: "image"|"video"|"auto" }
 * Returns: { url, public_id, width, height, format, bytes }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { file, folder, type } = body;

    if (!file) {
      return NextResponse.json({ error: "file required (base64 data URL)" }, { status: 400, headers: cors });
    }

    // Validate it's a data URL or http URL
    if (!file.startsWith("data:") && !file.startsWith("http")) {
      return NextResponse.json({ error: "Invalid file format" }, { status: 400, headers: cors });
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
      folder: folder || "heaven/uploads",
      resource_type: type || "auto",
    });

    return NextResponse.json(result, { headers: cors });
  } catch (err) {
    console.error("[API/upload] POST:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500, headers: cors });
  }
}

/**
 * DELETE /api/upload?public_id=xxx&type=image
 * Deletes a file from Cloudinary.
 */
export async function DELETE(req: NextRequest) {
  try {
    const publicId = req.nextUrl.searchParams.get("public_id");
    const type = (req.nextUrl.searchParams.get("type") || "image") as "image" | "video";

    if (!publicId) {
      return NextResponse.json({ error: "public_id required" }, { status: 400, headers: cors });
    }

    await deleteFromCloudinary(publicId, type);
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/upload] DELETE:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500, headers: cors });
  }
}

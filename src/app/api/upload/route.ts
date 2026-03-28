import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
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
  const cors = getCorsHeaders(req);
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
 * DELETE /api/upload?public_id=xxx&type=image
 * Deletes a file from Cloudinary.
 */
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
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

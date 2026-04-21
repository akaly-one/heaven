// ══════════════════════════════════════════════════════════════════════════
//  POST /api/upload/signed-url
//
//  Returns a short-lived signed payload so the browser can PUT a file
//  directly to Cloudinary — bypasses the Next.js function (no 10MB /
//  30s / memory-buffer limits).
//
//  Body: { model_id: string, folder_suffix: string, tags?: string[], eager?: string }
//  Auth: heaven_session cookie
//        - role=root (admin) → allowed for any model_id
//        - role=model         → allowed only for their own model_id
//
//  Folder enforcement: always `heaven/{model_id}/{folder_suffix}`.
//  The client cannot escape this prefix because the signature is pinned to
//  the server-chosen folder string.
//
//  TTL: implicit ~5 min (Cloudinary rejects stale timestamps).
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";
import {
  generateSignedUpload,
  isFolderOwnedByModel,
} from "@/lib/cloudinary-signed";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }

    // ── Parse body ────────────────────────────────────────────────────────
    const body = (await req.json().catch(() => ({}))) as {
      model_id?: string;
      folder_suffix?: string;
      tags?: string[];
      eager?: string;
    };

    const rawModel = body.model_id;
    if (!rawModel || !isValidModelSlug(rawModel)) {
      return NextResponse.json(
        { error: "model_id required (slug or mN)" },
        { status: 400, headers: cors }
      );
    }
    const modelId = toModelId(rawModel);

    // ── Authorization (root = any model, model = self only) ───────────────
    if (user.role === "model") {
      if (toModelId(user.sub) !== modelId) {
        return NextResponse.json(
          { error: "Access denied (cross-model upload)" },
          { status: 403, headers: cors }
        );
      }
    }

    // ── Build folder (server enforces prefix isolation) ───────────────────
    const rawSuffix = (body.folder_suffix || "content").toString();
    // Sanitise suffix: allow a-z 0-9 . _ - and `/`; strip leading/trailing slashes.
    const safeSuffix = rawSuffix
      .replace(/^\/+|\/+$/g, "")
      .replace(/[^a-zA-Z0-9._/-]/g, "");
    if (!safeSuffix) {
      return NextResponse.json(
        { error: "invalid folder_suffix" },
        { status: 400, headers: cors }
      );
    }
    const folder = `heaven/${modelId}/${safeSuffix}`;
    if (!isFolderOwnedByModel(folder, modelId)) {
      // Defensive — should never trigger given the construction above.
      return NextResponse.json(
        { error: "folder ownership check failed" },
        { status: 403, headers: cors }
      );
    }

    // ── Secret access ─────────────────────────────────────────────────────
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return NextResponse.json(
        { error: "server misconfigured (CLOUDINARY_API_SECRET)" },
        { status: 500, headers: cors }
      );
    }

    // ── Generate signed payload ───────────────────────────────────────────
    const signed = generateSignedUpload(folder, modelId, apiSecret, {
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 8) : undefined,
      eager: typeof body.eager === "string" ? body.eager : undefined,
    });

    return NextResponse.json(
      {
        ...signed,
        // convenience URL for the browser
        upload_url: `https://api.cloudinary.com/v1_1/${signed.cloud_name}/auto/upload`,
        expires_in_seconds: 300,
      },
      { headers: { ...cors, "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[API/upload/signed-url] POST:", err);
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: `Signed URL failed: ${msg}` },
      { status: 500, headers: cors }
    );
  }
}

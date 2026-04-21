// ══════════════════════════════════════════════════════════════════════════
//  /api/agence/dmca/[model_id]/upload — Signed URL generator (admin)
//
//  Body : { doc_type, file_name, content_type }
//  doc_type ∈ {release_form_pdf, id_recto, id_verso, headshot_dated, full_body, faceswap_before, faceswap_after}
//
//  Retourne : { upload_url, path, expires_in } (TTL signed = 15 min)
//
//  - Valide content_type (pdf pour release_form, image/* pour ID/headshot/full_body)
//  - Path canonique : dmca-dossiers/{model_id}/{doc_type}-{timestamp}.{ext}
//  - Log dans agence_dmca_access_log (action=signed_url_generated)
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

const AGENCY_ADMIN_SLUGS = ["yumi"];
const BUCKET = "dmca-dossiers";

const DOC_TYPES = new Set([
  "release_form_pdf",
  "id_recto",
  "id_verso",
  "headshot_dated",
  "full_body",
  "faceswap_before",
  "faceswap_after",
]);

const ALLOWED_MIME_PDF = new Set(["application/pdf"]);
const ALLOWED_MIME_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);

function getExtFromMime(mime: string): string | null {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

function authorizeAdmin(user: { role?: string; sub?: string } | null): string | null {
  if (!user) return "Unauthorized";
  const slug = String(user.sub || "").toLowerCase();
  if (user.role === "root") return null;
  if (user.role === "model" && AGENCY_ADMIN_SLUGS.includes(slug)) return null;
  return "Forbidden";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ model_id: string }> }) {
  const user = await getAuthUser();
  const err = authorizeAdmin(user);
  if (err) return NextResponse.json({ error: err }, { status: err === "Unauthorized" ? 401 : 403 });

  const { model_id: rawId } = await ctx.params;
  const modelId = toModelId(rawId);

  const body = await req.json().catch(() => ({}));
  const docType = String(body.doc_type || "");
  const contentType = String(body.content_type || "");

  if (!DOC_TYPES.has(docType)) {
    return NextResponse.json({ error: `Invalid doc_type (allowed: ${[...DOC_TYPES].join(", ")})` }, { status: 400 });
  }

  const allowedMime = docType === "release_form_pdf" ? ALLOWED_MIME_PDF : ALLOWED_MIME_IMAGE;
  if (!allowedMime.has(contentType)) {
    return NextResponse.json(
      { error: `Invalid content_type for ${docType}. Allowed: ${[...allowedMime].join(", ")}` },
      { status: 400 }
    );
  }

  const ext = getExtFromMime(contentType);
  if (!ext) return NextResponse.json({ error: "Unsupported mime" }, { status: 400 });

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const timestamp = Date.now();
  const path = `${modelId}/${docType}-${timestamp}.${ext}`;

  // Create signed upload URL (valid ~15 min by default — Supabase default token lifetime)
  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Signed URL failed" }, { status: 500 });
  }

  // Audit trail (best-effort, non-blocking)
  try {
    await db.from("agence_dmca_access_log").insert({
      accessor_sub: String(user?.sub || "unknown"),
      accessor_role: String(user?.role || "unknown"),
      model_id: modelId,
      resource_type: docType,
      resource_url: path,
      action: "signed_url_generated",
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent") || null,
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({
    upload_url: data.signedUrl,
    token: data.token,
    path: data.path,
    full_path: path,
    bucket: BUCKET,
    expires_in: 900, // 15 min (Supabase default)
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  /api/portal/release-form/[token]/upload  (PUBLIC — token-gated)
//
//  POST : génère un signed upload URL pour le bucket dmca-dossiers, scopé au
//         model_id résolu depuis le token. Ne consomme pas le token (reste
//         réutilisable pour les 5 uploads successifs avant le POST final qui
//         marque le token comme used).
//
//  Body : { doc_type, content_type }
//  Retourne : { upload_url, path, bucket, expires_in }
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

const BUCKET = "dmca-dossiers";

const DOC_TYPES = new Set([
  "id_recto",
  "id_verso",
  "headshot_dated",
  "full_body",
  "release_form_pdf",
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

function gone(m: string) {
  return NextResponse.json({ error: m }, { status: 410 });
}

// Same simple in-memory rate-limit as the submit route (10 req / 60s per token)
const rateLimit = new Map<string, number[]>();
function rateLimited(key: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (rateLimit.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return true;
  arr.push(now);
  rateLimit.set(key, arr);
  return false;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 32) return gone("Invalid token");
  if (rateLimited(`portal-upload:${token}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { data: vData, error: vErr } = await db.rpc("verify_portal_token", {
    p_token: token,
    p_expected_purpose: "release_form",
  });
  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
  if (!vData || (Array.isArray(vData) && vData.length === 0)) return gone("Token invalid, used, or expired");
  const row = Array.isArray(vData) ? vData[0] : vData;
  const modelId = row.model_id;

  const body = await req.json().catch(() => ({}));
  const docType = String(body.doc_type || "");
  const contentType = String(body.content_type || "");

  if (!DOC_TYPES.has(docType)) {
    return NextResponse.json({ error: `Invalid doc_type` }, { status: 400 });
  }
  const allowedMime = docType === "release_form_pdf" ? ALLOWED_MIME_PDF : ALLOWED_MIME_IMAGE;
  if (!allowedMime.has(contentType)) {
    return NextResponse.json({ error: `Invalid content_type for ${docType}` }, { status: 400 });
  }
  const ext = getExtFromMime(contentType);
  if (!ext) return NextResponse.json({ error: "Unsupported mime" }, { status: 400 });

  const timestamp = Date.now();
  const path = `${modelId}/portal/${docType}-${timestamp}.${ext}`;

  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Signed URL failed" }, { status: 500 });
  }

  // Audit trail
  try {
    await db.from("agence_dmca_access_log").insert({
      accessor_sub: "portal",
      accessor_role: "portal",
      model_id: modelId,
      resource_type: docType,
      resource_url: path,
      action: "signed_url_generated",
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent") || null,
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({
    upload_url: data.signedUrl,
    token: data.token,
    path: data.path,
    full_path: path,
    bucket: BUCKET,
    expires_in: 900,
  });
}

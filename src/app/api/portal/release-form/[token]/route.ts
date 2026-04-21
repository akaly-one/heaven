// ══════════════════════════════════════════════════════════════════════════
//  /api/portal/release-form/[token]  (PUBLIC — no auth, token-gated)
//
//  GET  : vérifie token, retourne alias de la modèle + platform target
//  POST : soumet le formulaire pré-rempli + marque le token 'used' (atomique)
//
//  P0 :
//   - Aucun vrai prénom stocké en clair côté plan affiché ici
//   - Rate-limit simple en mémoire (1 POST par 10s par token)
//   - Token 32 bytes hex, SECURITY DEFINER côté DB
//   - Retourne 410 Gone pour token invalide / utilisé / expiré
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

const BUCKET = "dmca-dossiers";

// In-memory rate-limit (1 POST / 10s per token)
const rateLimit = new Map<string, number>();
function rateLimited(key: string, windowMs = 10_000): boolean {
  const now = Date.now();
  const last = rateLimit.get(key) || 0;
  if (now - last < windowMs) return true;
  rateLimit.set(key, now);
  // GC: drop old entries when map > 500
  if (rateLimit.size > 500) {
    const cutoff = now - 60_000;
    for (const [k, t] of rateLimit.entries()) {
      if (t < cutoff) rateLimit.delete(k);
    }
  }
  return false;
}

function gone(message: string) {
  return NextResponse.json({ error: message }, { status: 410 });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 32) return gone("Invalid token");

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { data, error } = await db.rpc("verify_portal_token", {
    p_token: token,
    p_expected_purpose: "release_form",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return gone("Token invalid, used, or expired");
  }

  const row = Array.isArray(data) ? data[0] : data;
  const modelId = row.model_id;
  const expiresAt = row.expires_at;

  // Fetch only the alias (display_name) + slug — AUCUN vrai prénom ici
  const { data: model } = await db
    .from("agence_models")
    .select("model_id, slug, display_name")
    .eq("model_id", modelId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    alias: model?.display_name || model?.slug || "Modèle",
    model_slug: model?.slug || "modele",
    platform: "fanvue",
    agency_username: "yumiclub",
    expires_at: expiresAt,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 32) return gone("Invalid token");
  if (rateLimited(`portal:${token}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    signature,
    consent,
    id_recto_path,
    id_verso_path,
    headshot_path,
    full_body_path,
    release_form_pdf_path,
  } = body;

  if (!signature || typeof signature !== "string" || signature.trim().length < 2) {
    return NextResponse.json({ error: "Signature required" }, { status: 400 });
  }
  if (consent !== true) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }
  // Require at least the 4 ID/photo uploads — release_form_pdf_path optional (admin finalizes)
  if (!id_recto_path || !id_verso_path || !headshot_path || !full_body_path) {
    return NextResponse.json({ error: "All 4 documents (id recto+verso, headshot, full body) required" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Atomically consume the token (returns model_id or NULL)
  const { data: consumeData, error: consumeErr } = await db.rpc("consume_portal_token", {
    p_token: token,
    p_expected_purpose: "release_form",
  });
  if (consumeErr) return NextResponse.json({ error: consumeErr.message }, { status: 500 });
  if (!consumeData) return gone("Token invalid, used, or expired");
  const modelId = String(consumeData);

  // Build paths as stored references (the actual URLs are signed on demand admin-side)
  const upsert: Record<string, unknown> = {
    model_id: modelId,
    platform: "fanvue",
    id_document_recto_url: id_recto_path,
    id_document_verso_url: id_verso_path,
    headshot_dated_url: headshot_path,
    full_body_url: full_body_path,
    updated_at: new Date().toISOString(),
  };
  if (release_form_pdf_path) upsert.release_form_pdf_url = release_form_pdf_path;

  const { data: dossier, error: upsertErr } = await db
    .from("agence_releaseform_dossier")
    .upsert(upsert, { onConflict: "model_id,platform" })
    .select()
    .maybeSingle();

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // Consent log (RGPD Art. 7) — best-effort
  try {
    await db.from("agence_consent_log").insert({
      model_id: modelId,
      consent_type: "release_form_submission",
      action: "confirmation_sent",
      notes: `Portal submission via token. Signature hash: ${hashSignature(signature)}`,
    });
  } catch {
    /* non-blocking */
  }

  // Access log
  try {
    await db.from("agence_dmca_access_log").insert({
      accessor_sub: "portal",
      accessor_role: "portal",
      model_id: modelId,
      resource_type: "release_form_submission",
      action: "signed_url_generated",
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent") || null,
    });
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({
    ok: true,
    status: "documents_collected",
    dossier_id: dossier?.id,
  });
}

// POST endpoint helper for portal to request a signed upload URL
// This is exposed as a nested route to avoid exposing admin endpoints to portal clients.
// Moved to a dedicated signed-upload subroute for clarity.

// Simple one-way signature hash — store reference only, not raw signature
function hashSignature(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `sig_${(h >>> 0).toString(16)}`;
}

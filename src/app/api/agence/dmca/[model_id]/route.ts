// ══════════════════════════════════════════════════════════════════════════
//  /api/agence/dmca/[model_id] — DMCA dossier (admin CRUD)
//
//  GET  → retourne le dossier courant (platform=fanvue par défaut)
//  POST → crée/met à jour le dossier (upsert sur UNIQUE (model_id, platform))
//
//  Scope RLS : dmca:read (lecture) / dmca:write (écriture).
//  Auth : root OR model=yumi (agency admin).
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

const AGENCY_ADMIN_SLUGS = ["yumi"];

function authorizeAdmin(user: { role?: string; sub?: string } | null): string | null {
  if (!user) return "Unauthorized";
  const slug = String(user.sub || "").toLowerCase();
  if (user.role === "root") return null;
  if (user.role === "model" && AGENCY_ADMIN_SLUGS.includes(slug)) return null;
  return "Forbidden: agency admin required";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ model_id: string }> }) {
  const user = await getAuthUser();
  const err = authorizeAdmin(user);
  if (err) return NextResponse.json({ error: err }, { status: err === "Unauthorized" ? 401 : 403 });

  const { model_id: rawId } = await ctx.params;
  const modelId = toModelId(rawId);
  const platform = req.nextUrl.searchParams.get("platform") || "fanvue";

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { data, error } = await db
    .from("agence_releaseform_dossier")
    .select("*")
    .eq("model_id", modelId)
    .eq("platform", platform)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // State machine status
  let status: "pending" | "documents_collected" | "submitted_dmca" | "validated" | "rejected" = "pending";
  if (data) {
    if (data.rejected_at) status = "rejected";
    else if (data.validated_at) status = "validated";
    else if (data.submitted_at) status = "submitted_dmca";
    else {
      const hasAll = data.release_form_pdf_url
        && data.id_document_recto_url
        && data.id_document_verso_url
        && data.headshot_dated_url
        && data.full_body_url;
      if (hasAll) status = "documents_collected";
    }
  }

  return NextResponse.json({ dossier: data, status, model_id: modelId, platform });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ model_id: string }> }) {
  const user = await getAuthUser();
  const err = authorizeAdmin(user);
  if (err) return NextResponse.json({ error: err }, { status: err === "Unauthorized" ? 401 : 403 });

  const { model_id: rawId } = await ctx.params;
  const modelId = toModelId(rawId);
  const body = await req.json().catch(() => ({}));
  const platform = body.platform || "fanvue";

  const ALLOWED = [
    "release_form_pdf_url",
    "id_document_recto_url",
    "id_document_verso_url",
    "headshot_dated_url",
    "full_body_url",
    "faceswap_before_url",
    "faceswap_after_url",
  ];
  const update: Record<string, unknown> = {};
  for (const k of ALLOWED) if (k in body) update[k] = body[k];

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Upsert
  const { data, error } = await db
    .from("agence_releaseform_dossier")
    .upsert(
      { model_id: modelId, platform, ...update, updated_at: new Date().toISOString() },
      { onConflict: "model_id,platform" }
    )
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, dossier: data });
}

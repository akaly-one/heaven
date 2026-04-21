// ══════════════════════════════════════════════════════════════════════════
//  /api/agence/dmca/[model_id]/submit — Mark dossier as submitted to DMCA
//
//  POST : valide que les 5 docs obligatoires sont présents, passe status à
//         'submitted_dmca' (submitted_at = now()).
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
  return "Forbidden";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ model_id: string }> }) {
  const user = await getAuthUser();
  const err = authorizeAdmin(user);
  if (err) return NextResponse.json({ error: err }, { status: err === "Unauthorized" ? 401 : 403 });

  const { model_id: rawId } = await ctx.params;
  const modelId = toModelId(rawId);
  const body = await req.json().catch(() => ({}));
  const platform = body.platform || "fanvue";

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Fetch current
  const { data: existing } = await db
    .from("agence_releaseform_dossier")
    .select("*")
    .eq("model_id", modelId)
    .eq("platform", platform)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Dossier not found" }, { status: 404 });
  }

  const required = [
    "release_form_pdf_url",
    "id_document_recto_url",
    "id_document_verso_url",
    "headshot_dated_url",
    "full_body_url",
  ] as const;

  const missing = required.filter((k) => !existing[k]);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required documents: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const { data, error } = await db
    .from("agence_releaseform_dossier")
    .update({
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rejected_at: null,
      rejection_reason: null,
    })
    .eq("model_id", modelId)
    .eq("platform", platform)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, dossier: data, status: "submitted_dmca" });
}

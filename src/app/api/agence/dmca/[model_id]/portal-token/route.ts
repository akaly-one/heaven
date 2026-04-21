// ══════════════════════════════════════════════════════════════════════════
//  /api/agence/dmca/[model_id]/portal-token
//
//  POST : génère un token portail pour pré-remplissage release form par la
//         modèle. Retourne { token, url, expires_at }.
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

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Call generate_portal_token RPC
  const generatedBy = String(user?.sub || "unknown");
  const { data, error } = await db.rpc("generate_portal_token", {
    p_model_id: modelId,
    p_purpose: "release_form",
    p_generated_by: generatedBy,
  });

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Token generation failed" }, { status: 500 });
  }

  const token = String(data);
  const origin = req.nextUrl.origin;
  const url = `${origin}/portal/release-form/${token}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return NextResponse.json({ token, url, expires_at: expiresAt });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Agent 7.C — Model BP fields (GET/PATCH).
 *
 * GET  /api/agence/models/:id
 *    → retourne toutes les infos BP du modele (mode, identity_plan, palier,
 *      fiscal_voie, statut_initial, release_form_status, contract_signed_at, ...)
 *
 * PATCH /api/agence/models/:id
 *    → update champs BP (admin uniquement, scopes verifies)
 *
 * Auth :
 *   - root : full access
 *   - model : read-only sur son propre profil (id doit matcher son model_id/slug)
 */

const BP_FIELDS = [
  "model_id",
  "slug",
  "display_name",
  "mode_operation",
  "identity_plan",
  "palier_remuneration",
  "fiscal_voie",
  "statut_initial",
  "statut_initial_verified",
  "caming_active",
  "caming_platforms",
  "caming_weekly_hours_target",
  "release_form_status",
  "release_form_submitted_at",
  "release_form_validated_at",
  "contract_signed_at",
  "contract_url",
  "revenue_monthly_avg_3m",
  "palier_escalation_locked_until",
] as const;

const PATCHABLE_FIELDS = new Set<string>([
  "mode_operation",
  "identity_plan",
  "palier_remuneration",
  "fiscal_voie",
  "statut_initial",
  "statut_initial_verified",
  "caming_active",
  "caming_platforms",
  "caming_weekly_hours_target",
  "release_form_status",
  "contract_signed_at",
]);

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || (user.role !== "root" && user.role !== "model")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing model id" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  // Normalize id → model_id canonical (accepts slug or mN)
  const targetId = toModelId(id);

  const { data, error } = await db
    .from("agence_models")
    .select(BP_FIELDS.join(","))
    .eq("model_id", targetId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  // Scope check for model role: only own profile
  if (user.role === "model") {
    const userModelId = toModelId(String(user.sub || user.model_slug || ""));
    if (userModelId !== targetId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Derived : palier_escalation_triggered from matview 042
  const { data: matview } = await db
    .from("agence_commission_calcul")
    .select("palier_escalation_triggered, part_modele, part_sqwensy, net_distribuable")
    .eq("model_id", targetId)
    .order("period", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    model: data,
    latest_commission: matview || null,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json(
      { error: "Admin only" },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing model id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Whitelist
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE_FIELDS.has(k)) patch[k] = v;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const targetId = toModelId(id);

  const { data, error } = await db
    .from("agence_models")
    .update(patch)
    .eq("model_id", targetId)
    .select(BP_FIELDS.join(","))
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ model: data });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Agent 7.C — Identity Plan workflow (bascule Decouverte <-> Shadow).
 *
 * POST /api/agence/models/:id/identity-plan
 * Body: { to: 'discovery' | 'shadow', reason?: string }
 *
 * - Role model (auto-target propre profil) → INSERT agence_identity_plan_changes (requested_at)
 *   sans modifier agence_models (approval admin required).
 * - Role root (admin avec scope identity_plan:switch) → INSERT + UPDATE agence_models
 *   approved_at = now().
 *
 * Tous les changes loggs append-only dans agence_identity_plan_changes (migration 045).
 */

export async function POST(
  req: NextRequest,
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

  const body = (await req.json().catch(() => null)) as {
    to?: string;
    reason?: string;
  } | null;

  const toPlan = body?.to;
  if (toPlan !== "discovery" && toPlan !== "shadow") {
    return NextResponse.json(
      { error: "Invalid target plan (discovery|shadow)" },
      { status: 400 }
    );
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const targetId = toModelId(id);

  // Scope check pour role model : on peut seulement request pour son propre profil
  if (user.role === "model") {
    const userModelId = toModelId(String(user.sub || user.model_slug || ""));
    if (userModelId !== targetId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Charger plan courant
  const { data: model, error: mErr } = await db
    .from("agence_models")
    .select("model_id, identity_plan")
    .eq("model_id", targetId)
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });

  const fromPlan = (model.identity_plan as "discovery" | "shadow") || "discovery";
  if (fromPlan === toPlan) {
    return NextResponse.json(
      { error: `Already on ${toPlan}` },
      { status: 400 }
    );
  }

  const requester = String(user.sub || user.model_slug || "unknown");
  const isAdmin = user.role === "root";

  // INSERT append-only log entry
  const nowIso = new Date().toISOString();
  const logRow: Record<string, unknown> = {
    model_id: targetId,
    from_plan: fromPlan,
    to_plan: toPlan,
    reason: body?.reason || null,
    requested_by: requester,
    requested_at: nowIso,
  };
  if (isAdmin) {
    logRow.approved_by = requester;
    logRow.approved_at = nowIso;
  }

  const { data: logEntry, error: logErr } = await db
    .from("agence_identity_plan_changes")
    .insert(logRow)
    .select("*")
    .maybeSingle();

  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  // Si admin, mise a jour directe du profil modele
  if (isAdmin) {
    const { error: upErr } = await db
      .from("agence_models")
      .update({ identity_plan: toPlan })
      .eq("model_id", targetId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    status: isAdmin ? "approved" : "requested",
    change: logEntry,
  });
}

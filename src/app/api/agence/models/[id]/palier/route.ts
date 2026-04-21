import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

/**
 * Agent 7.C — Palier escalation trigger.
 *
 * POST /api/agence/models/:id/palier
 * Body: { to_palier: 'P1'|'P2'|'P3'|'P4', revenue_3m_avg?: number,
 *         contract_amendment_url?: string }
 *
 * Admin uniquement (scope palier:escalate). Append-only entry dans
 * agence_palier_history + update agence_models.palier_remuneration.
 *
 * Pour recharger le palier courant + historique, faire GET
 * /api/agence/models/:id (palier dans la reponse BP) et lire la table
 * agence_palier_history via une vue dediee (non expose ici : data lourde).
 */

const PALIER_FLOW: Record<string, string> = {
  P1: "P2",
  P2: "P3",
  P3: "P4",
};

// Mapping voie fiscale auto par palier
const FISCAL_VOIE_BY_PALIER: Record<string, string> = {
  P1: "droit_image",
  P2: "droit_image",
  P3: "indep_complementaire",
  P4: "indep_principal",
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json(
      { error: "Admin only (scope palier:escalate)" },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing model id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    to_palier?: string;
    revenue_3m_avg?: number;
    contract_amendment_url?: string;
  } | null;

  const toPalier = body?.to_palier;
  if (!toPalier || !["P1", "P2", "P3", "P4"].includes(toPalier)) {
    return NextResponse.json(
      { error: "Invalid target palier (P1-P4)" },
      { status: 400 }
    );
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const targetId = toModelId(id);

  const { data: model, error: mErr } = await db
    .from("agence_models")
    .select("model_id, palier_remuneration")
    .eq("model_id", targetId)
    .maybeSingle();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });

  const fromPalier = (model.palier_remuneration as string) || "P1";
  if (fromPalier === toPalier) {
    return NextResponse.json({ error: `Already on ${toPalier}` }, { status: 400 });
  }

  // Validate ordering (no jump down)
  const order = ["P1", "P2", "P3", "P4"];
  if (order.indexOf(toPalier) < order.indexOf(fromPalier)) {
    return NextResponse.json(
      { error: "Cannot downgrade palier" },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  // INSERT append-only history
  const { data: historyRow, error: logErr } = await db
    .from("agence_palier_history")
    .insert({
      model_id: targetId,
      from_palier: fromPalier,
      to_palier: toPalier,
      revenue_3m_avg: body?.revenue_3m_avg ?? null,
      triggered_at: nowIso,
      contract_amendment_url: body?.contract_amendment_url ?? null,
    })
    .select("*")
    .maybeSingle();

  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  // Update agence_models palier + fiscal voie
  const { error: upErr } = await db
    .from("agence_models")
    .update({
      palier_remuneration: toPalier,
      fiscal_voie: FISCAL_VOIE_BY_PALIER[toPalier],
    })
    .eq("model_id", targetId);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({
    status: "escalated",
    from_palier: fromPalier,
    to_palier: toPalier,
    expected_next: PALIER_FLOW[toPalier] || null,
    history: historyRow,
  });
}

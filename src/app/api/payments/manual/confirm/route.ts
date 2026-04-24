import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { fulfillPayment } from "@/lib/payment-utils";
import { normalizeTier } from "@/lib/tier-utils";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   POST /api/payments/manual/confirm
   Validation manuelle d'un pending_payment V1 PayPal.me
   BRIEF-16 — T16-A4
   Body : { referenceCode, action: 'approve'|'reject', reason? }
   Auth : model ou root uniquement
   ══════════════════════════════════════════════ */

interface ConfirmBody {
  referenceCode: string;
  action: "approve" | "reject";
  reason?: string;
}

interface PendingPaymentRow {
  id: string;
  model: string;
  pack_id: string;
  pack_name: string | null;
  tier: string | null;
  amount: string | number;
  currency: string | null;
  client_pseudo: string | null;
  client_platform: string | null;
  client_id: string | null;
  reference_code: string;
  pseudo_web: string | null;
  pack_breakdown: unknown;
  status: string;
}

// 30 jours uniformes pour tous les packs (décision NB BRIEF-16)
const DEFAULT_DURATION_HOURS = 720;

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    // ── Auth guard : model ou root uniquement ──
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }
    if (user.role !== "root" && user.role !== "model") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cors });
    }

    const body = (await req.json().catch(() => null)) as ConfirmBody | null;
    if (!body) {
      return NextResponse.json({ error: "Body JSON invalide" }, { status: 400, headers: cors });
    }

    const { referenceCode, action, reason } = body;

    if (!referenceCode || typeof referenceCode !== "string") {
      return NextResponse.json(
        { error: "referenceCode requis" },
        { status: 400, headers: cors },
      );
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action doit être 'approve' ou 'reject'" },
        { status: 400, headers: cors },
      );
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB non configurée" },
        { status: 502, headers: cors },
      );
    }

    // ── SELECT pending_payment ──
    const { data: pending, error: fetchErr } = await supabase
      .from("agence_pending_payments")
      .select(
        "id, model, pack_id, pack_name, tier, amount, currency, client_pseudo, client_platform, client_id, reference_code, pseudo_web, pack_breakdown, status",
      )
      .eq("reference_code", referenceCode.trim())
      .eq("status", "awaiting_manual_confirm")
      .maybeSingle();

    if (fetchErr) {
      console.error("[API/payments/manual/confirm] fetch error:", fetchErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }
    if (!pending) {
      return NextResponse.json(
        { error: "Référence introuvable ou déjà traitée" },
        { status: 404, headers: cors },
      );
    }

    const row = pending as PendingPaymentRow;

    // ── Model-scoping : model ne peut valider que ses propres paiements ──
    if (user.role === "model") {
      const { toModelId } = await import("@/lib/model-utils");
      if (toModelId(row.model) !== toModelId(user.sub)) {
        return NextResponse.json(
          { error: "Access denied — autre modèle" },
          { status: 403, headers: cors },
        );
      }
    }

    // ══════════════════════════════════════════════
    //   APPROVE : fulfillPayment + update status
    // ══════════════════════════════════════════════
    if (action === "approve") {
      const tier = normalizeTier(row.tier || row.pack_id);
      const clientPseudo = row.pseudo_web || row.client_pseudo || "";
      const clientPlatform = row.client_platform || "snapchat";
      const amountNum = typeof row.amount === "string" ? parseFloat(row.amount) : row.amount;

      let result;
      try {
        result = await fulfillPayment({
          model: row.model,
          tier,
          duration: DEFAULT_DURATION_HOURS,
          clientPseudo,
          clientPlatform,
          paymentId: row.reference_code,      // référence = paymentId pour manual
          paymentMethod: "manual",
          packId: row.pack_id,
          packName: row.pack_name || row.pack_id,
          amount: amountNum,
          currency: row.currency || "EUR",
        });
      } catch (err) {
        console.error("[API/payments/manual/confirm] fulfillPayment error:", err);
        return NextResponse.json(
          { error: "Erreur fulfillment" },
          { status: 500, headers: cors },
        );
      }

      // ── UPDATE status=completed (fulfillPayment fait un UPSERT mais on sécurise) ──
      const { error: updateErr } = await supabase
        .from("agence_pending_payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          generated_code: result.code,
          code_sent: !!result.clientId,
        })
        .eq("id", row.id);

      if (updateErr) {
        console.error("[API/payments/manual/confirm] update completed error:", updateErr);
        // On renvoie quand même succès car le code est déjà généré
      }

      return NextResponse.json(
        {
          ok: true,
          generatedCode: result.code,
          clientId: result.clientId,
          referenceCode: row.reference_code,
        },
        { headers: cors },
      );
    }

    // ══════════════════════════════════════════════
    //   REJECT : update status + raison
    // ══════════════════════════════════════════════
    const rejectedReason = (reason || "other").trim().slice(0, 64);

    const { error: rejectErr } = await supabase
      .from("agence_pending_payments")
      .update({
        status: "rejected",
        rejected_reason: rejectedReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (rejectErr) {
      console.error("[API/payments/manual/confirm] reject update error:", rejectErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }

    // Note : l'event `heaven:payment-rejected` (dispatch navigateur) sera émis côté UI
    // cockpit après réception de la réponse OK. Ici on ne peut pas dispatch d'event
    // côté serveur — on retourne juste ok et l'UI notifiera l'agent IA.

    return NextResponse.json(
      {
        ok: true,
        referenceCode: row.reference_code,
        rejectedReason,
      },
      { headers: cors },
    );
  } catch (err) {
    console.error("[API/payments/manual/confirm] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

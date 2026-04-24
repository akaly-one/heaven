/* ══════════════════════════════════════════════
   Provider "manual" — PayPal.me V1
   BRIEF-16 (2026-04-25) : flow immédiat sans API PayPal
   - Crée pending_payment avec référence copiable
   - Retourne URL PayPal.me pour redirect
   - Fulfillment manuel via /api/payments/manual/confirm
   ══════════════════════════════════════════════ */

import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";
import { generateReferenceCode } from "../reference";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
} from "../types";

const PAYPAL_ME_BASE = "https://www.paypal.com/paypalme";
const DEFAULT_LOCALE = "fr_BE";

/**
 * Récupère le handle PayPal du modèle depuis agence_models.config.
 * Fallback sur handle global si non configuré par modèle.
 */
async function getPaypalHandleForModel(model: string): Promise<string | null> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const modelId = toModelId(model);

  // Cherche par model_id OU slug (compatibilité DB)
  const { data, error } = await supabase
    .from("agence_models")
    .select("config, slug, model_id")
    .or(`model_id.eq.${modelId},slug.eq.${model}`)
    .maybeSingle();

  if (error) {
    console.error("[payment/manual] getPaypalHandleForModel error:", error);
    return null;
  }

  const config = (data?.config ?? null) as { paypal_handle?: string } | null;
  return config?.paypal_handle ?? null;
}

export const manualProvider: PaymentProvider = {
  id: "manual",
  displayName: "PayPal (manuel)",
  mode: "manual",

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const supabase = getServerSupabase();
    if (!supabase) throw new Error("Supabase not configured");

    const {
      amount,
      currency,
      packId,
      packSlug,
      model,
      clientPseudo,
      clientId,
      breakdown,
    } = input;

    // ── 1. Récupère PayPal handle du modèle ──
    const paypalHandle = await getPaypalHandleForModel(model);
    if (!paypalHandle) {
      throw new Error(
        `PayPal handle not configured for model ${model}. ` +
          "Set agence_models.config.paypal_handle.",
      );
    }

    // ── 2. Génère référence copiable ──
    const referenceCode = generateReferenceCode(model, packSlug);

    // ── 3. INSERT pending_payment ──
    const normalizedModel = toModelId(model);
    const normalizedPseudo = (clientPseudo || "").trim().toLowerCase();
    const amountEur = (amount / 100).toFixed(2);

    const insertPayload: Record<string, unknown> = {
      model: normalizedModel,
      pack_id: packId,
      pack_name: packSlug,
      tier: packSlug,
      amount: amountEur,
      currency,
      client_pseudo: normalizedPseudo,
      pseudo_web: clientPseudo,
      client_id: clientId ?? null,
      payment_method: "manual",
      status: "awaiting_manual_confirm",
      reference_code: referenceCode,
      pack_breakdown: breakdown ?? null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("agence_pending_payments")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr) {
      // Idempotence : UNIQUE constraint sur reference_code
      if (insertErr.code === "23505") {
        throw Object.assign(
          new Error("Duplicate reference_code — retry once"),
          { code: "DUPLICATE_REFERENCE", status: 409 },
        );
      }
      console.error("[payment/manual] pending_payment insert error:", insertErr);
      throw new Error("Failed to create pending payment");
    }

    if (!inserted?.id) {
      throw new Error("pending_payment insert returned no id");
    }

    // ── 4. Construit URL PayPal.me ──
    // Note : PayPal.me ne supporte pas ?note= en query. La note se fait à la main côté fan.
    const redirectUrl = `${PAYPAL_ME_BASE}/${paypalHandle}/${amountEur}EUR?locale.x=${DEFAULT_LOCALE}`;

    return {
      providerPaymentId: inserted.id,
      pendingPaymentId: inserted.id,
      redirectUrl,
      referenceCode,
    };
  },
};

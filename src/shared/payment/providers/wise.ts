import type { PaymentProvider, CreatePaymentInput, CreatePaymentResult } from "../types";
import { getServerSupabase } from "@/lib/supabase-server";
import { generateReferenceCode } from "../reference";
import { toModelId } from "@/lib/model-utils";

// BRIEF-16 Phase C — Wise Payment Requests
// ─────────────────────────────────────────────────────────────────────────
// Wise n'est PAS un PSP classique (pas d'Apple Pay natif). Mais l'API
// payment-requests génère des liens `wise.com/pay/...` partageables où le
// fan paye par carte (Visa/MC) ou virement bancaire. Le fond arrive sur le
// compte Wise Business NB en EUR / multi-devises.
//
// Stratégie recommandée :
// - Wise = compte de consolidation (IBAN BE, multi-currency)
// - Revolut Merchant = acquisition Apple Pay natif → payout IBAN Wise
// - Wise direct = backup si fan veut payer sans Apple Pay et Revolut down
//
// Docs officielles : https://docs.wise.com/api-docs/api-reference/payment-request
// ─────────────────────────────────────────────────────────────────────────

interface WisePaymentRequestResponse {
  id: string;
  url?: string;           // URL wise.com/pay/xxx
  shortUrl?: string;
  status?: string;
  amount?: { value: number; currency: string };
}

function getWiseConfig() {
  const token = process.env.WISE_API_TOKEN;
  const profileId = process.env.WISE_BUSINESS_PROFILE_ID;
  const apiUrl = process.env.WISE_API_URL || "https://api.wise.com";
  if (!token || !profileId) {
    throw new Error(
      "Wise non configuré : définir WISE_API_TOKEN et WISE_BUSINESS_PROFILE_ID",
    );
  }
  return { token, profileId, apiUrl };
}

async function createWisePaymentRequest(params: {
  amountEur: number;
  reference: string;
  description: string;
}): Promise<WisePaymentRequestResponse> {
  const { token, profileId, apiUrl } = getWiseConfig();
  const res = await fetch(`${apiUrl}/v3/profiles/${profileId}/payment-requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: { value: params.amountEur, currency: "EUR" },
      description: params.description,
      reference: params.reference,
      payerSummary: params.description,
      selectedPaymentMethods: ["CARD", "BANK_TRANSFER"],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Wise payment request failed: ${res.status} ${errText}`);
  }
  return (await res.json()) as WisePaymentRequestResponse;
}

export const wiseProvider: PaymentProvider = {
  id: "wise",
  displayName: "Wise (carte/virement)",
  mode: "checkout",

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const modelId = toModelId(input.model);
    const amountEur = input.amount / 100;
    const referenceCode = generateReferenceCode(input.model, input.packSlug);

    // ── Crée le payment request Wise ──
    const wiseRes = await createWisePaymentRequest({
      amountEur,
      reference: referenceCode,
      description: `Heaven — pack ${input.packSlug} (${input.clientPseudo})`,
    });

    if (!wiseRes?.id || !(wiseRes.url || wiseRes.shortUrl)) {
      throw new Error("Wise : réponse incomplète (id ou URL manquant)");
    }
    const redirectUrl = wiseRes.shortUrl || wiseRes.url!;

    // ── INSERT pending_payment ──
    const supabase = getServerSupabase();
    if (!supabase) throw new Error("DB unavailable");

    const { data, error } = await supabase
      .from("agence_pending_payments")
      .insert({
        payment_provider_id: wiseRes.id,
        provider: "wise",
        model: modelId,
        client_pseudo: input.clientPseudo.trim().toLowerCase(),
        client_platform: "snapchat",
        client_id: input.clientId || null,
        pack_id: input.packId,
        amount: amountEur,
        currency: "EUR",
        payment_method: "wise",
        status: "pending",
        reference_code: referenceCode,
        pseudo_web: input.clientPseudo.trim().toLowerCase(),
        pack_breakdown: input.breakdown || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Wise : erreur insert pending_payment (${error?.message || "unknown"})`);
    }

    return {
      providerPaymentId: wiseRes.id,
      redirectUrl,
      referenceCode,
      pendingPaymentId: data.id,
    };
  },

  async verifyWebhook() {
    // Wise ne fournit pas encore de webhook sur payment-requests v3 au moment
    // de l'écriture (25/04/2026). Validation via polling getStatus() ou
    // webhook générique Wise (transfer-state-change) à wire plus tard.
    return null;
  },

  async getStatus(providerPaymentId: string) {
    const { token, profileId, apiUrl } = getWiseConfig();
    const res = await fetch(
      `${apiUrl}/v3/profiles/${profileId}/payment-requests/${providerPaymentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return "pending" as const;
    const data = (await res.json()) as WisePaymentRequestResponse;
    switch ((data.status || "").toLowerCase()) {
      case "paid":
      case "completed":
      case "succeeded":
        return "completed" as const;
      case "failed":
      case "cancelled":
      case "expired":
        return "failed" as const;
      default:
        return "pending" as const;
    }
  },
};

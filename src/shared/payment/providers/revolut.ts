/* ══════════════════════════════════════════════
   Provider "revolut" — Revolut Merchant API
   BRIEF-16 (2026-04-25) — Phase C
   Wrapper autour du flow existant :
     - /api/payments/revolut/create  : POST /api/orders Revolut + insert pending
     - /api/payments/revolut/status  : GET status + fulfillment fallback
     - /api/payments/revolut/webhook : ORDER_COMPLETED signature v1=<hmac_sha256>
   Ce provider utilise directement REVOLUT_API_SECRET_KEY + fetch pour rester
   autonome depuis un registry call.
   ══════════════════════════════════════════════ */

import crypto from "crypto";
import { getServerSupabase } from "@/lib/supabase-server";
import { getRevolutBaseUrl } from "@/lib/payment-utils";
import { toModelId } from "@/lib/model-utils";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  WebhookEvent,
} from "../types";

/**
 * Map un statut Revolut vers notre PaymentStatus unifié.
 * Sources Revolut order state :
 *   PENDING | PROCESSING | AUTHORISED | COMPLETED | CANCELLED | FAILED | DECLINED | REFUNDED
 */
function mapRevolutStatus(state: string | undefined | null): PaymentStatus {
  if (!state) return "pending";
  const s = state.toUpperCase();
  if (s === "COMPLETED" || s === "AUTHORISED") return "completed";
  if (s === "FAILED" || s === "CANCELLED" || s === "DECLINED") return "failed";
  if (s === "REFUNDED") return "refunded";
  return "pending";
}

/**
 * Vérifie signature Revolut : header `Revolut-Signature` = `v1=<hex>,...`.
 * HMAC SHA-256 sur rawBody + REVOLUT_WEBHOOK_SECRET.
 * Utilise crypto.timingSafeEqual pour éviter timing attacks.
 */
function verifyRevolutSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  try {
    const parts = signatureHeader.split(",");
    const sigPart = parts.find((p) => p.trim().startsWith("v1="));
    if (!sigPart) return false;

    const receivedHex = sigPart.trim().slice(3); // strip "v1="
    const expectedHex = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const received = Buffer.from(receivedHex, "hex");
    const expected = Buffer.from(expectedHex, "hex");
    if (received.length !== expected.length) return false;

    return crypto.timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

export const revolutProvider: PaymentProvider = {
  id: "revolut",
  displayName: "Revolut",
  mode: "checkout",

  /**
   * Crée un ordre Revolut Merchant + insère pending_payment.
   * Retourne redirectUrl = checkout_url hosted page Revolut.
   */
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
      metadata,
    } = input;

    const apiKey = process.env.REVOLUT_API_SECRET_KEY;
    if (!apiKey) {
      throw new Error("REVOLUT_API_SECRET_KEY not configured");
    }

    const baseUrl = getRevolutBaseUrl();
    const normalizedModel = toModelId(model);
    const normalizedPseudo = (clientPseudo || "").trim().toLowerCase();
    const amountEur = (amount / 100).toFixed(2);

    // merchant_order_ext_ref transporte le contexte jusqu'au webhook
    const extRef = JSON.stringify({
      model: normalizedModel,
      pack_id: packId,
      pack_slug: packSlug,
      client_pseudo: normalizedPseudo,
      client_platform: metadata?.client_platform || "snapchat",
      client_id: clientId ?? null,
    });

    const description = `Heaven – ${packSlug} (${normalizedModel})`;

    // ── Call Revolut Merchant API ──
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Revolut-Api-Version": "2024-09-01",
      },
      body: JSON.stringify({
        amount,
        currency,
        description,
        merchant_order_ext_ref: extRef,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[payment/revolut] order creation failed:", res.status, text);
      throw new Error("Revolut order creation failed");
    }

    const order = (await res.json()) as {
      id: string;
      token?: string;
      checkout_url?: string;
      state?: string;
    };

    // ── Insert pending_payment ──
    const insertPayload: Record<string, unknown> = {
      payment_provider_id: order.id,
      model: normalizedModel,
      client_pseudo: normalizedPseudo,
      pseudo_web: clientPseudo,
      client_platform: metadata?.client_platform || "snapchat",
      client_id: clientId ?? null,
      pack_id: packId,
      pack_name: packSlug,
      tier: packSlug,
      amount: amountEur,
      currency,
      payment_method: "revolut",
      status: "pending",
      pack_breakdown: breakdown ?? null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("agence_pending_payments")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr) {
      console.error("[payment/revolut] pending_payment insert error:", insertErr);
    }

    return {
      providerPaymentId: order.id,
      pendingPaymentId: inserted?.id || order.id,
      redirectUrl: order.checkout_url || "",
    };
  },

  /**
   * Vérifie signature webhook Revolut + retourne WebhookEvent normalisé.
   * Retourne null si signature invalide ou payload malformé.
   */
  async verifyWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<WebhookEvent | null> {
    const signatureHeader = headers.get("Revolut-Signature");
    const secret = process.env.REVOLUT_WEBHOOK_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        console.error(
          "[payment/revolut] REVOLUT_WEBHOOK_SECRET not configured (prod)",
        );
        return null;
      }
      console.warn("[payment/revolut] REVOLUT_WEBHOOK_SECRET missing (dev skip)");
      // En dev on accepte mais on marque verified=false côté webhook-store
    } else {
      const valid = verifyRevolutSignature(rawBody, signatureHeader, secret);
      if (!valid) {
        console.error("[payment/revolut] signature invalid");
        return null;
      }
    }

    let parsed: {
      event?: string;
      order_id?: string;
      merchant_order_ext_ref?: string;
      [k: string]: unknown;
    };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const eventType = parsed.event;
    // Revolut ne fournit pas d'event_id unique → on synthétise depuis order_id+event+timestamp hash
    const orderId = parsed.order_id || "";
    if (!eventType || !orderId) return null;

    // event_id synthétique stable pour anti-replay (provider+eventType+orderId)
    const eventId = `${eventType}:${orderId}`;

    return {
      eventId,
      eventType,
      data: parsed,
    };
  },

  /**
   * Lit l'état d'un ordre Revolut.
   * Utilisé par /status route existante pour fallback si webhook manqué.
   */
  async getStatus(providerPaymentId: string): Promise<PaymentStatus> {
    if (!providerPaymentId) return "pending";
    const apiKey = process.env.REVOLUT_API_SECRET_KEY;
    if (!apiKey) return "pending";

    const baseUrl = getRevolutBaseUrl();
    const res = await fetch(`${baseUrl}/api/orders/${providerPaymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Revolut-Api-Version": "2024-09-01",
      },
    });

    if (!res.ok) {
      console.error(
        "[payment/revolut] getStatus error:",
        res.status,
        providerPaymentId,
      );
      return "pending";
    }

    const data = (await res.json()) as { state?: string };
    return mapRevolutStatus(data.state);
  },
};

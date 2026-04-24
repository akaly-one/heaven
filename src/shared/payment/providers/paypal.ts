/* ══════════════════════════════════════════════
   Provider "paypal" — PayPal Checkout V2 (auto)
   BRIEF-16 (2026-04-25) — Phase C
   Wrapper autour du flow existant :
     - /api/payments/paypal/create : création ordre CHECKOUT + insert pending
     - /api/payments/paypal/capture : capture ordre côté fan
     - /api/payments/paypal/webhook : réception PAYMENT.CAPTURE.COMPLETED
   Ce provider utilise directement getPayPalAccessToken() + fetch PayPal API
   (identique à la route /create) pour rester autonome depuis un registry call.
   ══════════════════════════════════════════════ */

import crypto from "crypto";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  getPayPalAccessToken,
  getPayPalBaseUrl,
} from "@/lib/payment-utils";
import { toModelId } from "@/lib/model-utils";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  WebhookEvent,
} from "../types";

/**
 * Map un statut PayPal (ORDER ou CAPTURE) vers notre PaymentStatus unifié.
 * Sources :
 *   ORDER : CREATED | SAVED | APPROVED | VOIDED | COMPLETED | PAYER_ACTION_REQUIRED
 *   CAPTURE : PENDING | FAILED | COMPLETED | DECLINED | PARTIALLY_REFUNDED | REFUNDED
 */
function mapPayPalStatus(status: string | undefined | null): PaymentStatus {
  if (!status) return "pending";
  const s = status.toUpperCase();
  if (s === "COMPLETED" || s === "APPROVED") return "completed";
  if (s === "VOIDED" || s === "FAILED" || s === "DECLINED") return "failed";
  if (s === "REFUNDED" || s === "PARTIALLY_REFUNDED") return "refunded";
  return "pending";
}

/**
 * Vérifie la signature webhook PayPal via l'API officielle verify-webhook-signature.
 * Besoin de : PAYPAL_WEBHOOK_ID + headers paypal-* présents.
 */
async function verifyPayPalSignature(
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    if (process.env.NODE_ENV === "production") {
      console.error("[payment/paypal] PAYPAL_WEBHOOK_ID not configured (prod)");
      return false;
    }
    console.warn("[payment/paypal] PAYPAL_WEBHOOK_ID missing (dev skip)");
    return true;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const res = await fetch(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: headers.get("paypal-auth-algo") || "",
          cert_url: headers.get("paypal-cert-url") || "",
          transmission_id: headers.get("paypal-transmission-id") || "",
          transmission_sig: headers.get("paypal-transmission-sig") || "",
          transmission_time: headers.get("paypal-transmission-time") || "",
          webhook_id: webhookId,
          webhook_event: parsed,
        }),
      },
    );

    if (!res.ok) {
      console.error("[payment/paypal] verify API error:", res.status);
      return false;
    }

    const data = (await res.json()) as { verification_status?: string };
    return data.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[payment/paypal] signature verify error:", err);
    return false;
  }
}

export const paypalProvider: PaymentProvider = {
  id: "paypal",
  displayName: "PayPal",
  mode: "checkout",

  /**
   * Crée un ordre PayPal Checkout V2 + insère pending_payment.
   * Retourne redirectUrl = approve link PayPal (lien HATEOAS "approve").
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

    // ── 1. Access token ──
    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken();
    } catch (err) {
      console.error("[payment/paypal] access token error:", err);
      throw new Error("PayPal credentials not configured");
    }

    // ── 2. Custom ID (transporté jusqu'au webhook) ──
    const normalizedModel = toModelId(model);
    const normalizedPseudo = (clientPseudo || "").trim().toLowerCase();
    const amountEur = (amount / 100).toFixed(2);

    const customId = JSON.stringify({
      model: normalizedModel,
      pack_id: packId,
      pack_slug: packSlug,
      client_pseudo: normalizedPseudo,
      client_platform: metadata?.client_platform || "snapchat",
      client_id: clientId ?? null,
    });

    // ── 3. Create order ──
    const baseUrl = getPayPalBaseUrl();
    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: packId,
            description: `${packSlug} — ${normalizedModel}`,
            custom_id: customId,
            amount: {
              currency_code: currency,
              value: amountEur,
            },
          },
        ],
        application_context: {
          brand_name: "Heaven",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
        },
      }),
    });

    if (!orderRes.ok) {
      const text = await orderRes.text();
      console.error(
        "[payment/paypal] order creation failed:",
        orderRes.status,
        text,
      );
      throw new Error("PayPal order creation failed");
    }

    const orderData = (await orderRes.json()) as {
      id: string;
      status?: string;
      links?: Array<{ rel: string; href: string; method?: string }>;
    };

    const orderId = orderData.id;
    const approveLink =
      orderData.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")
        ?.href || "";

    // ── 4. Insert pending_payment ──
    const insertPayload: Record<string, unknown> = {
      payment_provider_id: orderId,
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
      payment_method: "paypal",
      status: "pending",
      pack_breakdown: breakdown ?? null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("agence_pending_payments")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr) {
      console.error(
        "[payment/paypal] pending_payment insert error:",
        insertErr,
      );
      // On ne throw pas : l'ordre est créé côté PayPal, le webhook pourra upsert.
    }

    return {
      providerPaymentId: orderId,
      pendingPaymentId: inserted?.id || orderId,
      redirectUrl: approveLink,
    };
  },

  /**
   * Vérifie signature webhook PayPal + retourne un WebhookEvent normalisé.
   * Retourne null si signature invalide ou payload malformé.
   *
   * Note : le rawBody DOIT être la string brute reçue (req.text()),
   * pour reproduire la forme utilisée par la signature PayPal.
   */
  async verifyWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<WebhookEvent | null> {
    // timingSafeEqual ne s'applique pas à l'API verify de PayPal (call API distant).
    // Sécurité via webhook_id + signature RSA côté serveur PayPal.
    // On expose le check côté caller : il peut persister signature pour audit.
    const verified = await verifyPayPalSignature(rawBody, headers);
    if (!verified) return null;

    let parsed: {
      id?: string;
      event_type?: string;
      resource?: unknown;
    };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const eventId = parsed.id;
    const eventType = parsed.event_type;
    if (!eventId || !eventType) return null;

    // Hash du rawBody pour audit (pas comparaison : PayPal ne fournit pas hmac).
    const signatureDigest = crypto
      .createHash("sha256")
      .update(rawBody)
      .digest("hex");

    return {
      eventId,
      eventType,
      data: parsed.resource ?? parsed,
      // signatureDigest est hors du type mais on le range sur data pour audit.
      ...({ signatureDigest } as Record<string, unknown>),
    };
  },

  /**
   * Lit l'état d'un ordre PayPal (checkout order).
   * Utilisé pour polling cockpit côté modèle ou resync.
   */
  async getStatus(providerPaymentId: string): Promise<PaymentStatus> {
    if (!providerPaymentId) return "pending";

    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken();
    } catch {
      return "pending";
    }

    const baseUrl = getPayPalBaseUrl();
    const res = await fetch(
      `${baseUrl}/v2/checkout/orders/${providerPaymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      console.error(
        "[payment/paypal] getStatus error:",
        res.status,
        providerPaymentId,
      );
      return "pending";
    }

    const data = (await res.json()) as { status?: string };
    return mapPayPalStatus(data.status);
  },
};

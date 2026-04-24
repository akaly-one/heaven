/* ══════════════════════════════════════════════
   Provider "stripe" — squelette feature-flagged
   BRIEF-16 (2026-04-25) — Phase C (T16-C3)
   ⚠️ V2 emergency only — TOS Stripe interdit contenu adult en prod.
   Feature flag hard guard : ALLOW_STRIPE=true requis pour activer.
   Implem minimale : la surface d'API existe, mais createPayment() throw
   tant que le flag n'est pas actif. Permet au registry + UI toggle de
   connaître le provider sans l'utiliser en production.
   ══════════════════════════════════════════════ */

import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
  WebhookEvent,
} from "../types";

const STRIPE_ALLOWED = process.env.ALLOW_STRIPE === "true";

/**
 * Guard serveur : refuse toute opération tant que ALLOW_STRIPE !== 'true'.
 * Utilisé aussi côté route /api/payment/providers pour empêcher toggle=true.
 */
export function isStripeAllowed(): boolean {
  return STRIPE_ALLOWED;
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  displayName: "Stripe (urgence)",
  mode: "checkout",

  async createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!STRIPE_ALLOWED) {
      throw new Error(
        "Stripe provider is disabled. Set ALLOW_STRIPE=true to enable (V2 emergency only).",
      );
    }
    // Marker : squelette. Si ALLOW_STRIPE=true un jour, implémenter Stripe Checkout ici
    // (stripe.checkout.sessions.create + insert pending_payment).
    throw new Error(
      "Stripe provider not yet implemented (V2 emergency only — see BRIEF-16).",
    );
  },

  async verifyWebhook(
    _rawBody: string,
    _headers: Headers,
  ): Promise<WebhookEvent | null> {
    // Pas d'implem : retourne null (webhook-store ignorera).
    return null;
  },

  async getStatus(_providerPaymentId: string): Promise<PaymentStatus> {
    return "pending";
  },
};

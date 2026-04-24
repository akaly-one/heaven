/* ══════════════════════════════════════════════
   Payment Providers — types unifiés
   BRIEF-16 (2026-04-25) : Phase C architecture modulaire V2
   ══════════════════════════════════════════════ */

export type PaymentProviderId = "paypal" | "revolut" | "stripe" | "manual" | "wise";

export interface CreatePaymentInput {
  amount: number;          // centimes
  currency: "EUR";
  packId: string;          // p1..p5 ou "custom"
  packSlug: string;        // "silver","gold","vip_black","vip_platinum","custom"
  model: string;           // mN id
  clientPseudo: string;
  clientId?: string;
  breakdown?: unknown;     // JSONB pour custom cart
  metadata?: Record<string, string>;
}

export interface CreatePaymentResult {
  providerPaymentId: string;   // id pending_payment interne OU id provider externe
  redirectUrl: string;         // URL PayPal.me ou Checkout
  referenceCode?: string;      // code humain-lisible pour flow manuel
  pendingPaymentId: string;    // UUID ligne agence_pending_payments
}

export interface WebhookEvent {
  eventId: string;
  eventType: string;
  data: unknown;
}

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly displayName: string;
  readonly mode?: "manual" | "checkout";
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook?(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
  getStatus?(providerPaymentId: string): Promise<PaymentStatus>;
}

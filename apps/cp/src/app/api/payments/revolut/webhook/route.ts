import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase } from "@/lib/supabase-server";
import { fulfillPayment } from "@/lib/payment-utils";
import { normalizeTier } from "@/lib/tier-utils";

export const runtime = "nodejs";

/* ── Signature verification ── */
function verifySignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  try {
    // Revolut sends: v1=<hmac_hex>
    const parts = signatureHeader.split(",");
    const sigPart = parts.find((p) => p.trim().startsWith("v1="));
    if (!sigPart) return false;

    const receivedSig = sigPart.trim().replace("v1=", "");
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(receivedSig, "hex"),
      Buffer.from(expectedSig, "hex"),
    );
  } catch {
    return false;
  }
}

/* ── POST /api/payments/revolut/webhook ── */
export async function POST(req: NextRequest) {
  // Always return 200 on processing errors — Revolut retries on non-200
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("Revolut-Signature");
    const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;

    // ── Signature check (required in production) ──
    if (!webhookSecret) {
      if (process.env.NODE_ENV === "production") {
        console.error("[Revolut/webhook] REVOLUT_WEBHOOK_SECRET not configured in production");
        return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
      }
      console.warn("[Revolut/webhook] REVOLUT_WEBHOOK_SECRET not set — skipping signature verification (dev)");
    } else {
      const valid = verifySignature(rawBody, signatureHeader, webhookSecret);
      if (!valid) {
        console.error("[Revolut/webhook] Invalid signature");
        return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      order_id?: string;
      merchant_order_ext_ref?: string;
      [key: string]: unknown;
    };

    const eventType = event.event;
    const orderId = event.order_id || "";

    console.log(`[Revolut/webhook] Event: ${eventType}, Order: ${orderId}`);

    // ── ORDER_COMPLETED ──
    if (eventType === "ORDER_COMPLETED") {
      // Idempotency check
      const supabase = getServerSupabase();
      if (supabase) {
        const { data: existing } = await supabase
          .from("agence_pending_payments")
          .select("id")
          .eq("payment_provider_id", orderId)
          .eq("status", "completed")
          .maybeSingle();

        if (existing) {
          console.log(`[Revolut/webhook] Order ${orderId} already fulfilled — skipping`);
          return NextResponse.json({ received: true, already_processed: true });
        }
      }

      // Parse merchant_order_ext_ref for context
      let extRef: {
        model?: string;
        pack_id?: string;
        pack_name?: string;
        client_pseudo?: string;
        client_platform?: string;
      } = {};

      try {
        extRef = JSON.parse(event.merchant_order_ext_ref || "{}");
      } catch {
        console.error("[Revolut/webhook] Failed to parse merchant_order_ext_ref");
      }

      const model = extRef.model || "unknown";
      const packId = extRef.pack_id || "";
      const clientPseudo = extRef.client_pseudo || "anonymous";
      const clientPlatform = extRef.client_platform || "unknown";

      await fulfillPayment({
        model,
        tier: normalizeTier(packId),
        duration: 720,
        clientPseudo,
        clientPlatform,
        paymentId: orderId,
        paymentMethod: "revolut",
      });

      console.log(`[Revolut/webhook] Order ${orderId} fulfilled for ${model}`);
      return NextResponse.json({ received: true, fulfilled: true });
    }

    // ── ORDER_PAYMENT_FAILED / ORDER_PAYMENT_DECLINED ──
    if (
      eventType === "ORDER_PAYMENT_FAILED" ||
      eventType === "ORDER_PAYMENT_DECLINED"
    ) {
      console.warn(`[Revolut/webhook] Payment ${eventType} for order ${orderId}`);

      const supabase = getServerSupabase();
      if (supabase) {
        await supabase
          .from("agence_pending_payments")
          .update({ status: "failed" })
          .eq("payment_provider_id", orderId)
          .eq("status", "pending");
      }

      return NextResponse.json({ received: true, status: "failed" });
    }

    // ── Other events — acknowledge ──
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Revolut/webhook] Error:", err);
    // Always 200 to prevent Revolut retries
    return NextResponse.json({ received: true, error: "internal" });
  }
}

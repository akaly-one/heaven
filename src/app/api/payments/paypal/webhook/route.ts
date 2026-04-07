import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getPayPalAccessToken, getPayPalBaseUrl, fulfillPayment } from "@/lib/payment-utils";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/* ══════════════════════════════════════════════
   POST /api/payments/paypal/webhook
   PayPal webhook handler (backup confirmation)
   Always returns 200 — PayPal retries on non-200
   ══════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const eventType = body.event_type as string | undefined;
    const resourceId = body.id as string | undefined;

    console.log("[PayPal/webhook] Received event:", eventType, "id:", resourceId);

    // ── Verify webhook signature (optional — depends on PAYPAL_WEBHOOK_ID) ──
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (webhookId) {
      const verified = await verifyWebhookSignature(req, body, webhookId);
      if (!verified) {
        console.warn("[PayPal/webhook] Signature verification failed for event:", resourceId);
        // Still return 200 to prevent retries, but don't process
        return NextResponse.json({ received: true, verified: false }, { headers: cors });
      }
    } else {
      console.warn("[PayPal/webhook] PAYPAL_WEBHOOK_ID not set — skipping signature verification");
    }

    // ── Handle PAYMENT.CAPTURE.COMPLETED ──
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      await handleCaptureCompleted(body.resource);
    } else {
      console.log("[PayPal/webhook] Unhandled event type:", eventType);
    }

    return NextResponse.json({ received: true }, { headers: cors });
  } catch (err) {
    console.error("[PayPal/webhook] Error:", err);
    // Always return 200 to prevent infinite retries
    return NextResponse.json({ received: true, error: "processing_error" }, { headers: cors });
  }
}

// ── Verify PayPal webhook signature ──

async function verifyWebhookSignature(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  webhookId: string,
): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo") || "",
        cert_url: req.headers.get("paypal-cert-url") || "",
        transmission_id: req.headers.get("paypal-transmission-id") || "",
        transmission_sig: req.headers.get("paypal-transmission-sig") || "",
        transmission_time: req.headers.get("paypal-transmission-time") || "",
        webhook_id: webhookId,
        webhook_event: body,
      }),
    });

    if (!verifyRes.ok) {
      console.error("[PayPal/webhook] Verify API error:", verifyRes.status);
      return false;
    }

    const verifyData = await verifyRes.json();
    return verifyData.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[PayPal/webhook] Verification error:", err);
    return false;
  }
}

// ── Handle capture completed event ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCaptureCompleted(resource: any): Promise<void> {
  if (!resource) {
    console.warn("[PayPal/webhook] No resource in capture event");
    return;
  }

  const captureId = resource.id as string;
  const customIdRaw = resource.custom_id as string | undefined;

  console.log("[PayPal/webhook] Processing capture:", captureId, "custom_id:", customIdRaw);

  // ── Idempotency check ──
  const supabase = getServerSupabase();
  if (!supabase) {
    console.error("[PayPal/webhook] Supabase not configured — cannot process webhook");
    return;
  }

  // Check if this capture was already processed (by capture route or previous webhook)
  const { data: existing } = await supabase
    .from("agence_pending_payments")
    .select("id, status, code_generated")
    .eq("payment_id", captureId)
    .maybeSingle();

  if (existing?.status === "completed" && existing?.code_generated) {
    console.log("[PayPal/webhook] Capture already processed:", captureId);
    return;
  }

  // Also check by looking for the parent order ID in supplementary_data
  const orderId = resource.supplementary_data?.related_ids?.order_id as string | undefined;
  if (orderId) {
    const { data: orderPayment } = await supabase
      .from("agence_pending_payments")
      .select("id, status, code_generated")
      .eq("payment_id", orderId)
      .maybeSingle();

    if (orderPayment?.status === "completed" && orderPayment?.code_generated) {
      console.log("[PayPal/webhook] Order already fulfilled:", orderId);
      return;
    }
  }

  // ── Parse custom_id ──
  if (!customIdRaw) {
    console.warn("[PayPal/webhook] No custom_id — cannot fulfill payment");
    return;
  }

  let customData: { model?: string; pack_id?: string; client_pseudo?: string; client_platform?: string };
  try {
    customData = JSON.parse(customIdRaw);
  } catch {
    console.error("[PayPal/webhook] Failed to parse custom_id:", customIdRaw);
    return;
  }

  const model = customData.model || "";
  if (!isValidModelSlug(model)) {
    console.error("[PayPal/webhook] Invalid model in custom_id:", model);
    return;
  }

  // ── Extract amount ──
  const amount = parseFloat(resource.amount?.value || "0");
  const currency = (resource.amount?.currency_code || "EUR") as string;

  // ── Fulfill ──
  try {
    const result = await fulfillPayment({
      model,
      tier: "vip",  // Default tier for webhook-based fulfillment
      duration: 720,
      clientPseudo: customData.client_pseudo || "",
      clientPlatform: customData.client_platform || "snapchat",
      paymentId: orderId || captureId,
      paymentMethod: "paypal",
      packId: customData.pack_id,
      amount,
      currency,
    });

    console.log("[PayPal/webhook] Fulfilled capture:", captureId, "code:", result.code);
  } catch (err) {
    console.error("[PayPal/webhook] Fulfillment error:", err);
  }
}

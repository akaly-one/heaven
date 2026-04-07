import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getPayPalAccessToken, getPayPalBaseUrl, fulfillPayment } from "@/lib/payment-utils";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/* ══════════════════════════════════════════════
   POST /api/payments/paypal/capture
   Captures (confirms) a PayPal order after buyer approval
   ══════════════════════════════════════════════ */

interface CaptureBody {
  orderID: string;
  model: string;
  pack_id: string;
  pack_name?: string;
  client_pseudo: string;
  client_platform: string;
  tier: string;
  duration?: number;
  amount?: number;
  currency?: string;
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = (await req.json()) as CaptureBody;
    const {
      orderID, model, pack_id, client_pseudo, client_platform, tier,
    } = body;
    const duration = body.duration || 720; // 30 days default
    const packName = body.pack_name || pack_id;
    const amount = body.amount || 0;
    const currency = body.currency || "EUR";

    // ── Validation ──
    if (!orderID) {
      return NextResponse.json({ error: "orderID requis" }, { status: 400, headers: cors });
    }
    if (!isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    if (!tier) {
      return NextResponse.json({ error: "tier requis" }, { status: 400, headers: cors });
    }

    // ── Get PayPal access token ──
    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken();
    } catch {
      return NextResponse.json(
        { error: "PayPal non configure" },
        { status: 503, headers: cors },
      );
    }

    // ── Capture the order ──
    const baseUrl = getPayPalBaseUrl();
    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!captureRes.ok) {
      const errText = await captureRes.text();
      console.error("[PayPal/capture] Capture failed:", captureRes.status, errText);
      return NextResponse.json(
        { error: "Erreur PayPal lors de la capture", details: errText },
        { status: 502, headers: cors },
      );
    }

    const captureData = await captureRes.json();
    const captureStatus = captureData.status as string;

    if (captureStatus !== "COMPLETED") {
      console.warn("[PayPal/capture] Order not completed:", captureStatus, orderID);
      return NextResponse.json(
        { error: `Paiement non complete: ${captureStatus}`, status: captureStatus },
        { status: 402, headers: cors },
      );
    }

    // ── Payment confirmed — fulfill ──
    const result = await fulfillPayment({
      model,
      tier,
      duration,
      clientPseudo: client_pseudo || "",
      clientPlatform: client_platform || "snapchat",
      paymentId: orderID,
      paymentMethod: "paypal",
      packId: pack_id,
      packName,
      amount,
      currency,
    });

    return NextResponse.json(
      {
        success: true,
        code: result.code,
        tier,
        message: "Paiement confirme",
      },
      { headers: cors },
    );
  } catch (err) {
    console.error("[PayPal/capture] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

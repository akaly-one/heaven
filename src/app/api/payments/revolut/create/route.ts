import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getRevolutBaseUrl } from "@/lib/payment-utils";

export const runtime = "nodejs";

/* ── CORS preflight ── */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

/* ── POST /api/payments/revolut/create ── */
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  try {
    const body = await req.json();
    const {
      model,
      pack_id,
      pack_name,
      amount,
      currency,
      client_pseudo,
      client_platform,
    } = body as {
      model?: string;
      pack_id?: string;
      pack_name?: string;
      amount?: number;
      currency?: string;
      client_pseudo?: string;
      client_platform?: string;
    };

    // ── Validation ──
    if (!model || !isValidModelSlug(model)) {
      return NextResponse.json(
        { error: "model invalide" },
        { status: 400, headers: cors },
      );
    }
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "amount invalide" },
        { status: 400, headers: cors },
      );
    }
    if (!pack_id || !pack_name) {
      return NextResponse.json(
        { error: "pack_id et pack_name requis" },
        { status: 400, headers: cors },
      );
    }

    const apiKey = process.env.REVOLUT_API_SECRET_KEY;
    if (!apiKey) {
      console.warn("[Revolut/create] REVOLUT_API_SECRET_KEY not configured");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 503, headers: cors },
      );
    }

    const baseUrl = getRevolutBaseUrl();
    const amountInCents = Math.round(amount * 100);
    const orderCurrency = currency?.toUpperCase() || "EUR";

    // merchant_order_ext_ref carries context for webhook fulfillment
    const extRef = JSON.stringify({
      model,
      pack_id,
      pack_name,
      client_pseudo: client_pseudo || "anonymous",
      client_platform: client_platform || "unknown",
    });

    const description = `Heaven – ${pack_name} (${model})`;

    // ── Call Revolut Merchant API ──
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Revolut-Api-Version": "2024-09-01",
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: orderCurrency,
        description,
        merchant_order_ext_ref: extRef,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Revolut/create] API error:", res.status, errBody);
      return NextResponse.json(
        { error: "Revolut order creation failed" },
        { status: 502, headers: cors },
      );
    }

    const order = await res.json();

    return NextResponse.json(
      {
        id: order.id,
        token: order.token,
        checkout_url: order.checkout_url,
      },
      { headers: cors },
    );
  } catch (err) {
    console.error("[Revolut/create] Error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors },
    );
  }
}

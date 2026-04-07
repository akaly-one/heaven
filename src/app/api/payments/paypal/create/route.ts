import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getPayPalAccessToken, getPayPalBaseUrl } from "@/lib/payment-utils";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/* ══════════════════════════════════════════════
   POST /api/payments/paypal/create
   Creates a PayPal order for client checkout
   ══════════════════════════════════════════════ */

interface CreateOrderBody {
  model: string;
  pack_id: string;
  pack_name: string;
  amount: number;
  currency?: string;
  client_pseudo: string;
  client_platform: string;
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = (await req.json()) as CreateOrderBody;
    const { model, pack_id, pack_name, amount, client_pseudo, client_platform } = body;
    const currency = body.currency || "EUR";

    // ── Validation ──
    if (!isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    if (!pack_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "pack_id et amount requis" }, { status: 400, headers: cors });
    }
    if (!client_pseudo) {
      return NextResponse.json({ error: "client_pseudo requis" }, { status: 400, headers: cors });
    }

    // ── Get PayPal access token ──
    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken();
    } catch {
      console.error("[PayPal/create] Cannot get access token — credentials not configured");
      return NextResponse.json(
        { error: "PayPal non configure. Contactez l'administrateur." },
        { status: 503, headers: cors },
      );
    }

    // ── Custom ID for tracking ──
    const customId = JSON.stringify({
      model,
      pack_id,
      client_pseudo,
      client_platform: client_platform || "snapchat",
    });

    // ── Create PayPal order ──
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
            reference_id: pack_id,
            description: `${pack_name || pack_id} — ${model}`,
            custom_id: customId,
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
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
      const errText = await orderRes.text();
      console.error("[PayPal/create] Order creation failed:", orderRes.status, errText);
      return NextResponse.json(
        { error: "Erreur PayPal lors de la creation de commande" },
        { status: 502, headers: cors },
      );
    }

    const orderData = await orderRes.json();
    const orderId = orderData.id as string;

    // ── Store pending payment in DB ──
    const supabase = getServerSupabase();
    if (supabase) {
      await supabase.from("agence_pending_payments").insert({
        payment_id: orderId,
        model,
        client_pseudo: (client_pseudo || "").trim().toLowerCase(),
        client_platform: client_platform || "snapchat",
        pack_id,
        pack_name: pack_name || pack_id,
        amount,
        currency,
        payment_method: "paypal",
        status: "pending",
      }).then(({ error }) => {
        if (error) console.error("[PayPal/create] Pending payment insert error:", error);
      });
    }

    return NextResponse.json({ id: orderId }, { headers: cors });
  } catch (err) {
    console.error("[PayPal/create] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

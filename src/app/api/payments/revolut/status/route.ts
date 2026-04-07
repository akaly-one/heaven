import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { fulfillPayment, getRevolutBaseUrl } from "@/lib/payment-utils";

export const runtime = "nodejs";

/* ── CORS preflight ── */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

/* ── GET /api/payments/revolut/status?order_id=xxx ── */
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);

  try {
    const orderId = req.nextUrl.searchParams.get("order_id");
    if (!orderId) {
      return NextResponse.json(
        { error: "order_id requis" },
        { status: 400, headers: cors },
      );
    }

    const apiKey = process.env.REVOLUT_API_SECRET_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 503, headers: cors },
      );
    }

    const baseUrl = getRevolutBaseUrl();

    // ── Fetch order from Revolut ──
    const res = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Revolut-Api-Version": "2024-09-01",
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Revolut/status] API error:", res.status, errBody);
      return NextResponse.json(
        { error: "Failed to fetch order status" },
        { status: 502, headers: cors },
      );
    }

    const order = await res.json() as {
      id: string;
      state: string;
      merchant_order_ext_ref?: string;
      [key: string]: unknown;
    };

    // ── If COMPLETED and not yet fulfilled, trigger fulfillment (webhook fallback) ──
    if (order.state === "COMPLETED") {
      const supabase = getServerSupabase();
      let alreadyFulfilled = false;

      if (supabase) {
        const { data: existing } = await supabase
          .from("payments")
          .select("id")
          .eq("payment_id", orderId)
          .eq("status", "completed")
          .maybeSingle();

        alreadyFulfilled = !!existing;
      }

      if (!alreadyFulfilled) {
        console.log(
          `[Revolut/status] Order ${orderId} COMPLETED but not fulfilled — triggering fulfillment`,
        );

        let extRef: {
          model?: string;
          pack_id?: string;
          client_pseudo?: string;
          client_platform?: string;
        } = {};

        try {
          extRef = JSON.parse(order.merchant_order_ext_ref || "{}");
        } catch {
          console.error("[Revolut/status] Failed to parse merchant_order_ext_ref");
        }

        await fulfillPayment({
          model: extRef.model || "unknown",
          tier: extRef.pack_id || "",
          duration: 720,
          clientPseudo: extRef.client_pseudo || "anonymous",
          clientPlatform: extRef.client_platform || "unknown",
          paymentId: orderId,
          paymentMethod: "revolut",
        });
      }
    }

    return NextResponse.json(
      {
        order_id: order.id,
        status: order.state,
      },
      { headers: cors },
    );
  } catch (err) {
    console.error("[Revolut/status] Error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors },
    );
  }
}

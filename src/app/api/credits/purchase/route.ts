import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/* /api/credits/purchase — Debit credits from client, unlock media */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, upload_id, model, price } = body;

    if (!client_id || !upload_id || !model || !price) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400, headers: cors });
    }

    const sb = getServerSupabase();
    if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 500, headers: cors });

    const { data: client, error: clientErr } = await sb
      .from("agence_clients")
      .select("id, total_tokens_bought, total_tokens_spent")
      .eq("id", client_id)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404, headers: cors });
    }

    const balance = (client.total_tokens_bought || 0) - (client.total_tokens_spent || 0);
    if (balance < price) {
      return NextResponse.json({ error: "Insufficient credits", balance }, { status: 402, headers: cors });
    }

    // Record purchase
    const { error: purchErr } = await sb.from("agence_purchases").insert({
      client_id, upload_id, model, price,
      created_at: new Date().toISOString(),
    });

    if (purchErr) {
      console.error("[Credits/purchase] insert error:", purchErr);
      return NextResponse.json({ error: "Database error", detail: purchErr.message }, { status: 502, headers: cors });
    }

    // Deduct credits
    const { error: deductErr } = await sb
      .from("agence_clients")
      .update({ total_tokens_spent: (client.total_tokens_spent || 0) + price })
      .eq("id", client_id);

    if (deductErr) {
      console.error("[Credits/purchase] deduct error:", deductErr);
    }

    return NextResponse.json({ success: true, remaining: balance - price }, { headers: cors });
  } catch (err) {
    console.error("Credits purchase error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

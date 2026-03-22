import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/credits/purchase — Debit credits from client, unlock media
   ══════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, upload_id, model, price } = body;

    if (!client_id || !upload_id || !model || !price) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const sb = getServerSupabase();
    if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    // Check client exists and has enough credits
    const { data: client, error: clientErr } = await sb
      .from("agence_clients")
      .select("id, total_tokens_bought, total_tokens_spent")
      .eq("id", client_id)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const balance = (client.total_tokens_bought || 0) - (client.total_tokens_spent || 0);
    if (balance < price) {
      return NextResponse.json({ error: "Insufficient credits", balance }, { status: 402 });
    }

    // Record purchase
    await sb.from("agence_purchases").insert({
      client_id,
      upload_id,
      model,
      price,
      created_at: new Date().toISOString(),
    });

    // Deduct credits
    await sb
      .from("agence_clients")
      .update({ total_tokens_spent: (client.total_tokens_spent || 0) + price })
      .eq("id", client_id);

    return NextResponse.json({ success: true, remaining: balance - price });
  } catch (err) {
    console.error("Credits purchase error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

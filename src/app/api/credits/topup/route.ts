import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/* /api/credits/topup — Add credits to a client account */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, credits, model, price } = body;

    if (!client_id || !credits || !model) {
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

    const newBought = (client.total_tokens_bought || 0) + credits;

    // Update client token balance
    const { error: updateErr } = await sb
      .from("agence_clients")
      .update({ total_tokens_bought: newBought })
      .eq("id", client_id);

    if (updateErr) {
      console.error("[Credits/topup] update error:", updateErr);
      return NextResponse.json({ error: "Database error", detail: updateErr.message }, { status: 502, headers: cors });
    }

    // Record the transaction
    const { error: txErr } = await sb.from("agence_purchases").insert({
      client_id,
      model,
      price: price || 0,
      credits_added: credits,
      type: "topup",
      created_at: new Date().toISOString(),
    });

    if (txErr) {
      console.error("[Credits/topup] transaction log failed:", txErr);
      // Non-blocking: credits were added, but log the failure
    }

    const balance = newBought - (client.total_tokens_spent || 0);
    return NextResponse.json({ success: true, balance }, { headers: cors });
  } catch (err) {
    console.error("Credits topup error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

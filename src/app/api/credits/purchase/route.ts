import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/* GET /api/credits/purchase?client_id=XXX — Purchase history */
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ purchases: [] }, { headers: cors });

  try {
    const sb = getServerSupabase();
    if (!sb) return NextResponse.json({ purchases: [] }, { headers: cors });

    const { data, error } = await sb
      .from("agence_purchases")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Credits/purchase] GET error:", error);
      return NextResponse.json({ purchases: [] }, { headers: cors });
    }
    return NextResponse.json({ purchases: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[Credits/purchase] GET:", err);
    return NextResponse.json({ purchases: [] }, { headers: cors });
  }
}

/* POST /api/credits/purchase — Debit credits from client, unlock media */
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
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

    // Atomic deduct: only succeeds if balance is still sufficient (prevents double-spend race)
    const newSpent = (client.total_tokens_spent || 0) + price;
    const { data: deducted, error: deductErr } = await sb
      .from("agence_clients")
      .update({ total_tokens_spent: newSpent })
      .eq("id", client_id)
      .lte("total_tokens_spent", (client.total_tokens_bought || 0) - price)
      .select("total_tokens_bought, total_tokens_spent")
      .maybeSingle();

    if (deductErr) {
      console.error("[Credits/purchase] deduct error:", deductErr);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!deducted) {
      return NextResponse.json({ error: "Insufficient credits (concurrent request)", balance }, { status: 402, headers: cors });
    }

    // Record purchase after successful deduction
    const { error: purchErr } = await sb.from("agence_purchases").insert({
      client_id, upload_id, model, price,
      created_at: new Date().toISOString(),
    });

    if (purchErr) {
      console.error("[Credits/purchase] insert error:", purchErr);
      // Credits already deducted — log for manual reconciliation
    }

    const remaining = (deducted.total_tokens_bought || 0) - (deducted.total_tokens_spent || 0);
    return NextResponse.json({ success: true, remaining }, { headers: cors });
  } catch (err) {
    console.error("Credits purchase error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

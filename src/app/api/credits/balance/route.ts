import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

/* Public endpoint — returns credit balance for a client_id */

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "Missing client_id" }, { status: 400 });

  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

  const { data, error } = await sb
    .from("agence_clients")
    .select("total_tokens_bought, total_tokens_spent")
    .eq("id", clientId)
    .single();

  if (error || !data) return NextResponse.json({ balance: 0 });

  const balance = (data.total_tokens_bought || 0) - (data.total_tokens_spent || 0);
  return NextResponse.json({ balance });
}

// /api/agence/bot-activity
// Retourne les dernières interactions agent IA + derniers prospects convertis Fanvue.
//
// Query: ?model=<slug>&limit=5
// Response: { ai_runs: [...], conversions: [...] }

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("model")?.trim().toLowerCase() || "";
  const limit = Math.max(1, Math.min(20, Number(req.nextUrl.searchParams.get("limit")) || 5));

  if (!slug) {
    return NextResponse.json({ ai_runs: [], conversions: [], note: "model param required" });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // 1. Dernières réponses agent IA (succès uniquement, pas les errors)
  const { data: aiRuns } = await db
    .from("ai_runs")
    .select("id, conversation_id, conversation_source, input_message, output_message, intent_classified, latency_ms, created_at, safety_blocked, error_message")
    .eq("model_slug", slug)
    .is("error_message", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  // 2. Prospects convertis Fanvue (table conversion_attribution pas encore créée)
  // Placeholder jusqu'à migration 056. Renvoyer [] pour l'instant.
  const conversions: unknown[] = [];

  return NextResponse.json({
    ai_runs: aiRuns || [],
    conversions,
  });
}

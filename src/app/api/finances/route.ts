import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { requireRoot } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/* ══════════════════════════════════════════════
   GET /api/finances?model=yumi
   Returns aggregated finance data from 3 sources:
   1. agence_pending_payments (completed) — automated payments
   2. agence_revenue_log — trigger-generated history
   3. agence_clients.total_spent — legacy/manual fallback
   ══════════════════════════════════════════════ */

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try { await requireRoot(); } catch {
    return NextResponse.json({ error: "Root access required" }, { status: 403, headers: cors });
  }
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const modelFilter = req.nextUrl.searchParams.get("model");
    if (modelFilter && !isValidModelSlug(modelFilter)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }

    // ── 1. Completed payments from agence_pending_payments ──
    let paymentsQuery = supabase
      .from("agence_pending_payments")
      .select("id, model, client_pseudo, client_platform, pack_name, amount, currency, payment_method, status, completed_at, created_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(500);

    if (modelFilter) paymentsQuery = paymentsQuery.eq("model", modelFilter);

    const { data: payments, error: paymentsErr } = await paymentsQuery;
    if (paymentsErr) console.error("[API/finances] payments error:", paymentsErr);

    // ── 2. Revenue log entries ──
    let revenueQuery = supabase
      .from("agence_revenue_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (modelFilter) revenueQuery = revenueQuery.eq("model", modelFilter);

    let revenueLog = null;
    let revenueLogErr = null;
    try {
      const res = await revenueQuery;
      revenueLog = res.data;
      revenueLogErr = res.error;
    } catch {
      // Table may not exist yet
      console.warn("[API/finances] agence_revenue_log not available");
    }
    if (revenueLogErr) console.warn("[API/finances] revenue_log error:", revenueLogErr);

    // ── 3. Legacy client totals ──
    let clientsQuery = supabase
      .from("agence_clients")
      .select("id, model, pseudo_snap, pseudo_insta, total_spent, tier")
      .order("total_spent", { ascending: false })
      .limit(200);

    if (modelFilter) clientsQuery = clientsQuery.eq("model", modelFilter);

    const { data: clients, error: clientsErr } = await clientsQuery;
    if (clientsErr) console.error("[API/finances] clients error:", clientsErr);

    return NextResponse.json({
      payments: payments || [],
      revenue_log: revenueLog || [],
      clients: clients || [],
    }, { headers: cors });
  } catch (err) {
    console.error("[API/finances] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

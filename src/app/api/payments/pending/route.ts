import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

// GET /api/payments/pending?model=mN
// Liste les paiements en attente de validation manuelle.
// Auth : model (scoped) ou root (all models).
// BRIEF-16 T16-A5 — consommé par /agence/payments + PaymentPendingDrawer.
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    if (user.role !== "model" && user.role !== "root" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cors });
    }

    const url = new URL(req.url);
    const modelParam = url.searchParams.get("model");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 502, headers: cors });

    let query = supabase
      .from("agence_pending_payments")
      .select(
        "id, model, provider, pack_id, pack_name, tier, amount, currency, client_pseudo, client_platform, client_id, reference_code, pseudo_web, pack_breakdown, status, created_at"
      )
      .eq("status", "awaiting_manual_confirm")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (user.role === "model") {
      query = query.eq("model", toModelId(user.sub));
    } else if (modelParam) {
      query = query.eq("model", toModelId(modelParam));
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ payments: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/payments/pending] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

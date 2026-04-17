import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  const handle = req.nextUrl.searchParams.get("handle");

  if (!isValidModelSlug(model) || !handle) {
    return NextResponse.json({ error: "model + handle requis" }, { status: 400, headers: cors });
  }

  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ orders: [] }, { headers: cors });
    }

    // ── Primary: query agence_pending_payments ──
    const normalizedModel = toModelId(model);
    const normalizedHandle = handle.trim().toLowerCase();
    const { data: payments, error: payErr } = await supabase
      .from("agence_pending_payments")
      .select("id, pack_name, tier, amount, currency, status, payment_method, generated_code, created_at, completed_at")
      .eq("model", normalizedModel)
      .or(`client_pseudo.ilike.${normalizedHandle},client_pseudo.ilike.@${normalizedHandle}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!payErr && payments && payments.length > 0) {
      const orders = payments.map(p => ({
        id: p.id,
        pack_name: p.pack_name || p.tier || "Pack",
        tier: p.tier || "p1",
        amount: Number(p.amount) || 0,
        currency: p.currency || "EUR",
        status: p.status as "completed" | "pending" | "failed",
        payment_method: p.payment_method || "manual",
        generated_code: p.generated_code || null,
        created_at: p.created_at,
        completed_at: p.completed_at || null,
      }));
      return NextResponse.json({ orders, source: "payments" }, { headers: cors });
    }

    // ── Fallback: parse SYSTEM wall posts (legacy) ──
    if (payErr) {
      console.warn("[API/clients/orders] pending_payments query failed, falling back to wall posts:", payErr.message);
    }

    const { data, error } = await supabase
      .from("agence_wall_posts")
      .select("id, content, created_at")
      .eq("model", normalizedModel)
      .eq("pseudo", "SYSTEM")
      .ilike("content", `%@${handle}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[API/clients/orders] wall fallback error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 502, headers: cors });
    }

    const orders = (data || []).map(post => {
      const content = post.content || "";
      let status: "completed" | "pending" | "failed" = "pending";
      if (content.startsWith("\u2705")) status = "completed";
      else if (content.startsWith("\u274C")) status = "failed";

      const amountMatch = content.match(/\((\d+)\u20AC\)/);
      const amount = amountMatch ? Number(amountMatch[1]) : 0;

      const itemMatch = content.match(/commande:\s*(.+?)(?:\s*\(\d+\u20AC\)|\s*\u2014)/);
      const item = itemMatch ? itemMatch[1].trim() : content.slice(2, 60);

      return {
        id: post.id,
        pack_name: item || "Commande",
        tier: "p1",
        amount,
        currency: "EUR",
        status,
        payment_method: "manual",
        generated_code: null,
        created_at: post.created_at,
        completed_at: status === "completed" ? post.created_at : null,
      };
    });

    return NextResponse.json({ orders, source: "wall_fallback" }, { headers: cors });
  } catch (err) {
    console.error("[API/clients/orders]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

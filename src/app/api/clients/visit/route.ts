import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { calculateBadgeGrade } from "@/constants/badges";

export const runtime = "nodejs";

const TIER_HIERARCHY = ["silver", "gold", "feet", "black", "platinum"];

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { model, client_id, action } = body;
    if (!isValidModelSlug(model) || !client_id) {
      return NextResponse.json({ error: "model + client_id requis" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: cors });
    }

    // Get or create lifecycle entry
    const { data: existing } = await supabase
      .from("agence_fan_lifecycle")
      .select("*")
      .eq("model_slug", model)
      .eq("client_id", client_id)
      .single();

    let lifecycle = existing;

    if (!lifecycle) {
      const { data: created, error: createErr } = await supabase
        .from("agence_fan_lifecycle")
        .insert({ model_slug: model, client_id, stage: "active", visit_count: 0, wall_posts_count: 0, orders_completed: 0 })
        .select()
        .single();
      if (createErr) {
        console.error("[API/clients/visit] create error:", createErr);
        return NextResponse.json({ error: "DB error" }, { status: 502, headers: cors });
      }
      lifecycle = created;
    }

    // Update based on action
    const updates: Record<string, unknown> = { last_interaction: new Date().toISOString() };

    if (action === "order_completed") {
      updates.orders_completed = (lifecycle.orders_completed || 0) + 1;
    } else if (action === "wall_post") {
      updates.wall_posts_count = (lifecycle.wall_posts_count || 0) + 1;
    } else {
      // Default: visit
      updates.visit_count = (lifecycle.visit_count || 0) + 1;
      updates.last_visit_at = new Date().toISOString();
    }

    const { error: updErr } = await supabase
      .from("agence_fan_lifecycle")
      .update(updates)
      .eq("id", lifecycle.id);

    if (updErr) {
      console.error("[API/clients/visit] update error:", updErr);
      return NextResponse.json({ error: "DB update error" }, { status: 502, headers: cors });
    }

    // Recalculate badge
    const newStats = { ...lifecycle, ...updates };
    // Get client tier
    const { data: clientData } = await supabase
      .from("agence_clients")
      .select("tier")
      .eq("id", client_id)
      .single();

    const tierRank = TIER_HIERARCHY.indexOf(clientData?.tier || "");
    const badge = calculateBadgeGrade({
      visit_count: newStats.visit_count || 0,
      messages_count: newStats.messages_count || 0,
      orders_completed: newStats.orders_completed || 0,
      tier_rank: tierRank,
    });

    // Update badge on client
    await supabase
      .from("agence_clients")
      .update({ badge_grade: badge })
      .eq("id", client_id);

    return NextResponse.json({
      visit_count: newStats.visit_count || 0,
      orders_completed: newStats.orders_completed || 0,
      badge_grade: badge,
    }, { headers: cors });
  } catch (err) {
    console.error("[API/clients/visit]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

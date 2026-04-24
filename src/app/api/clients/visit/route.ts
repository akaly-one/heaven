import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { toModelId } from "@/lib/model-utils";
import { calculateBadgeGrade } from "@/constants/badges";

export const runtime = "nodejs";

const TIER_HIERARCHY = ["p1", "p2", "p3", "p4", "p5"];

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    // Parse body safely — a malformed/empty body must not crash the route
    let body: { model?: unknown; client_id?: unknown; action?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: cors });
    }
    const model = typeof body.model === "string" ? body.model : "";
    const client_id = typeof body.client_id === "string" ? body.client_id : "";
    const action = typeof body.action === "string" ? body.action : "";

    if (!isValidModelSlug(model) || !client_id) {
      return NextResponse.json({ error: "model + client_id requis" }, { status: 400, headers: cors });
    }
    const normalizedModel = toModelId(model);

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: cors });
    }

    // Get or create lifecycle entry — use maybeSingle so "not found" is not an error
    const { data: existing, error: selErr } = await supabase
      .from("agence_fan_lifecycle")
      .select("*")
      .eq("model_slug", normalizedModel)
      .eq("client_id", client_id)
      .maybeSingle();

    if (selErr) {
      console.error("[API/clients/visit] select error:", selErr);
      return NextResponse.json({ error: "DB select error", detail: selErr.message }, { status: 500, headers: cors });
    }

    let lifecycle: Record<string, unknown>;
    if (existing) {
      lifecycle = existing as Record<string, unknown>;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("agence_fan_lifecycle")
        .insert({ model_slug: normalizedModel, client_id, stage: "active", visit_count: 0, wall_posts_count: 0, orders_completed: 0 })
        .select()
        .maybeSingle();
      if (createErr || !created) {
        console.error("[API/clients/visit] create error:", createErr);
        return NextResponse.json({ error: "DB insert error", detail: createErr?.message || "no row returned" }, { status: 500, headers: cors });
      }
      lifecycle = created as Record<string, unknown>;
    }

    // Update based on action
    const updates: Record<string, unknown> = { last_interaction: new Date().toISOString() };

    if (action === "order_completed") {
      updates.orders_completed = ((lifecycle.orders_completed as number) || 0) + 1;
    } else if (action === "wall_post") {
      updates.wall_posts_count = ((lifecycle.wall_posts_count as number) || 0) + 1;
    } else {
      // Default: visit
      updates.visit_count = ((lifecycle.visit_count as number) || 0) + 1;
      updates.last_visit_at = new Date().toISOString();
    }

    const lifecycleId = lifecycle.id;
    if (!lifecycleId) {
      return NextResponse.json({ error: "lifecycle row missing id" }, { status: 500, headers: cors });
    }

    const { error: updErr } = await supabase
      .from("agence_fan_lifecycle")
      .update(updates)
      .eq("id", lifecycleId as string);

    if (updErr) {
      console.error("[API/clients/visit] update error:", updErr);
      return NextResponse.json({ error: "DB update error", detail: updErr.message }, { status: 500, headers: cors });
    }

    // Recalculate badge
    const newStats = { ...lifecycle, ...updates } as Record<string, unknown>;
    // Get client tier
    const { data: clientData } = await supabase
      .from("agence_clients")
      .select("tier")
      .eq("id", client_id)
      .maybeSingle();

    const tierRank = TIER_HIERARCHY.indexOf((clientData?.tier as string) || "");
    const badge = calculateBadgeGrade({
      visit_count: (newStats.visit_count as number) || 0,
      messages_count: (newStats.messages_count as number) || 0,
      orders_completed: (newStats.orders_completed as number) || 0,
      tier_rank: tierRank,
    });

    // Update badge on client (best-effort — don't fail the endpoint if this silent update errors)
    await supabase
      .from("agence_clients")
      .update({ badge_grade: badge })
      .eq("id", client_id);

    return NextResponse.json({
      visit_count: (newStats.visit_count as number) || 0,
      orders_completed: (newStats.orders_completed as number) || 0,
      badge_grade: badge,
    }, { headers: cors });
  } catch (err) {
    console.error("[API/clients/visit]:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: "Server error", detail: msg }, { status: 500, headers: cors });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/packs — Supabase-only (agence_packs)
   ══════════════════════════════════════════════ */

import { DEFAULT_PACKS } from "@/constants/packs";

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  if (!isValidModelSlug(model)) {
    return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
  }
  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ packs: DEFAULT_PACKS }, { headers: cors });
    }
    const normalizedModel = toModelId(model);
    const { data, error } = await supabase
      .from("agence_packs").select("*")
      .eq("model", normalizedModel)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[API/packs] GET Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }

    // If no packs in DB for this model, return defaults
    if (!data || data.length === 0) {
      return NextResponse.json({ packs: DEFAULT_PACKS }, { headers: cors });
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const mapped = data.map((r: any) => ({
      id: r.pack_id, name: r.name, price: Number(r.price), color: r.color,
      code: r.code || `AG-P${Math.round(Number(r.price))}`,
      features: r.features || [], bonuses: r.bonuses || {},
      face: r.face, badge: r.badge, active: r.active,
      wise_url: r.wise_url || "", stripe_link: r.stripe_link || "",
      revolut_url: r.revolut_url || "",
    }));
    return NextResponse.json({ packs: mapped }, { headers: cors });
  } catch (err) {
    console.error("[API/packs] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const model = body.model;
    if (!isValidModelSlug(model)) return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    const packs = body.packs;
    if (!Array.isArray(packs)) return NextResponse.json({ error: "packs array requis" }, { status: 400, headers: cors });

    const supabase = requireSupabase();

    const normalizedModel = toModelId(model);
    const rows = packs.map((p: Record<string, unknown>, i: number) => ({
      model: normalizedModel, pack_id: p.id || `pack-${i}`, name: p.name || "", price: p.price || 0,
      color: p.color || "#C9A84C", features: p.features || [], bonuses: p.bonuses || {},
      face: p.face || false, badge: p.badge || null, active: p.active !== false, sort_order: i,
      revolut_url: p.revolut_url || null,
    }));

    // Step 1: delete all existing packs for this model
    const { error: delErr } = await supabase.from("agence_packs").delete().eq("model", normalizedModel);
    if (delErr) {
      console.error("[API/packs] POST delete error:", delErr);
      return NextResponse.json({ error: "Database delete error", detail: delErr.message }, { status: 502, headers: cors });
    }

    // Step 2: small delay to ensure delete is committed
    await new Promise(r => setTimeout(r, 200));

    // Step 3: insert new packs
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("agence_packs").insert(rows);
      if (insErr) {
        console.error("[API/packs] POST insert error:", insErr);
        return NextResponse.json({ error: "Database insert error", detail: insErr.message }, { status: 502, headers: cors });
      }
    }

    return NextResponse.json({ success: true, count: packs.length }, { headers: cors });
  } catch (err) {
    console.error("[API/packs] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

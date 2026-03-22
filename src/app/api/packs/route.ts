import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/packs — Supabase-only (agence_packs)
   ══════════════════════════════════════════════ */

const DEFAULT_PACKS = [
  { id: "vip", name: "VIP Glamour", price: 150, color: "#E84393",
    features: ["Pieds glamour/sales + accessoires", "Lingerie sexy + haul", "Teasing + demandes custom", "Dedicaces personnalisees"],
    bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false },
    face: false, badge: null, active: true },
  { id: "gold", name: "Gold", price: 200, color: "#C9A84C",
    features: ["TOUT du VIP inclus", "Nudes complets", "Cosplay", "Sextape sans visage"],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false },
    face: false, badge: "Populaire", active: true },
  { id: "diamond", name: "Diamond", price: 250, color: "#5B8DEF",
    features: ["TOUT du Gold inclus", "Nudes avec visage", "Cosplay avec visage", "Sextape avec visage", "Hard illimite"],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false },
    face: true, badge: null, active: true },
  { id: "platinum", name: "Platinum All-Access", price: 320, color: "#A882FF",
    features: ["Acces TOTAL aux 3 packs", "Demandes personnalisees", "Video calls prives", "Contenu exclusif illimite"],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: true },
    face: true, badge: "Ultimate", active: true },
];

const cors = getCorsHeaders();

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model") || "yumi";
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_packs").select("*")
      .eq("model", model)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[API/packs] GET Supabase error:", error);
      return NextResponse.json({ error: "Database error", detail: error.message }, { status: 502, headers: cors });
    }

    // If no packs in DB for this model, return defaults
    if (!data || data.length === 0) {
      return NextResponse.json({ packs: DEFAULT_PACKS }, { headers: cors });
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const mapped = data.map((r: any) => ({
      id: r.pack_id, name: r.name, price: Number(r.price), color: r.color,
      features: r.features || [], bonuses: r.bonuses || {},
      face: r.face, badge: r.badge, active: r.active,
    }));
    return NextResponse.json({ packs: mapped }, { headers: cors });
  } catch (err) {
    console.error("[API/packs] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = body.model || "yumi";
    const packs = body.packs;
    if (!Array.isArray(packs)) return NextResponse.json({ error: "packs array requis" }, { status: 400, headers: cors });

    const supabase = requireSupabase();

    const { error: delErr } = await supabase.from("agence_packs").delete().eq("model", model);
    if (delErr) {
      console.error("[API/packs] POST delete error:", delErr);
      return NextResponse.json({ error: "Database error", detail: delErr.message }, { status: 502, headers: cors });
    }

    const rows = packs.map((p: Record<string, unknown>, i: number) => ({
      model, pack_id: p.id || `pack-${i}`, name: p.name || "", price: p.price || 0,
      color: p.color || "#C9A84C", features: p.features || [], bonuses: p.bonuses || {},
      face: p.face || false, badge: p.badge || null, active: p.active !== false, sort_order: i,
    }));

    const { error: insErr } = await supabase.from("agence_packs").insert(rows);
    if (insErr) {
      console.error("[API/packs] POST insert error:", insErr);
      return NextResponse.json({ error: "Database error", detail: insErr.message }, { status: 502, headers: cors });
    }

    return NextResponse.json({ success: true, count: packs.length }, { headers: cors });
  } catch (err) {
    console.error("[API/packs] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

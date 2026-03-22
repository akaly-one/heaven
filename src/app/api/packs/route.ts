import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/packs — Supabase (agence_packs) + globalThis fallback
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

const g = globalThis as unknown as { _packs: Record<string, typeof DEFAULT_PACKS> };
if (!g._packs) g._packs = {};

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const sb = () => getServerSupabase();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model") || "yumi";
  try {
    const supabase = sb();
    if (supabase) {
      const { data, error } = await supabase.from("agence_packs").select("*").eq("model", model).order("sort_order", { ascending: true });
      if (!error && data && data.length > 0) {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const mapped = data.map((r: any) => ({
          id: r.pack_id, name: r.name, price: Number(r.price), color: r.color,
          features: r.features || [], bonuses: r.bonuses || {},
          face: r.face, badge: r.badge, active: r.active,
        }));
        g._packs[model] = mapped;
        return NextResponse.json({ packs: mapped }, { headers: cors });
      }
    }
    return NextResponse.json({ packs: g._packs[model] || DEFAULT_PACKS }, { headers: cors });
  } catch (err) {
    console.error("[API/packs] GET:", err);
    return NextResponse.json({ packs: g._packs[model] || DEFAULT_PACKS }, { headers: cors });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = body.model || "yumi";
    const packs = body.packs;
    if (!Array.isArray(packs)) return NextResponse.json({ error: "packs array requis" }, { status: 400, headers: cors });

    g._packs[model] = packs;

    const supabase = sb();
    if (supabase) {
      await supabase.from("agence_packs").delete().eq("model", model);
      const rows = packs.map((p: Record<string, unknown>, i: number) => ({
        model, pack_id: p.id || `pack-${i}`, name: p.name || "", price: p.price || 0,
        color: p.color || "#C9A84C", features: p.features || [], bonuses: p.bonuses || {},
        face: p.face || false, badge: p.badge || null, active: p.active !== false, sort_order: i,
      }));
      await supabase.from("agence_packs").insert(rows);
    }

    return NextResponse.json({ success: true, count: packs.length }, { headers: cors });
  } catch (err) {
    console.error("[API/packs] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

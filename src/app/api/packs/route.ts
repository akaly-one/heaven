import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface PackConfig {
  id: string;
  name: string;
  price: number;
  color: string;
  features: string[];
  bonuses: Record<string, boolean>;
  face: boolean;
  badge: string | null;
  active: boolean;
}

const DEFAULT_PACKS: PackConfig[] = [
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

const g = globalThis as unknown as { _packs: PackConfig[] | null };
if (!g._packs) g._packs = null;

export async function GET() {
  return NextResponse.json({ packs: g._packs || DEFAULT_PACKS }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body.packs)) {
      g._packs = body.packs;
    }
    return NextResponse.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

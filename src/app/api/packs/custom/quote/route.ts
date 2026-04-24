import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase-server";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   POST /api/packs/custom/quote
   Calcul total panier custom (photos + vidéos multi-catégories).
   BRIEF-16 — T16-F2
   Body : { model, items: [{type, category, quantity, durationMin?, isPied?}], description? }
   ══════════════════════════════════════════════ */

type MediaType = "photo" | "video";
type PackCategory = "silver" | "gold" | "vip_black" | "vip_platinum";

const VALID_MEDIA_TYPES: readonly MediaType[] = ["photo", "video"];
const VALID_CATEGORIES: readonly PackCategory[] = [
  "silver",
  "gold",
  "vip_black",
  "vip_platinum",
];

interface QuoteItemInput {
  type: MediaType;
  category: PackCategory;
  quantity: number;
  durationMin?: number;
  isPied?: boolean;
}

interface QuoteBody {
  model: string;
  items: QuoteItemInput[];
  description?: string;
}

interface QuoteItemOutput {
  type: MediaType;
  category: PackCategory;
  quantity: number;
  durationMin: number | null;
  isPied: boolean;
  unitPriceCents: number;   // prix unitaire après multiplicateurs (par pièce ou par minute)
  lineTotalCents: number;   // unitPrice × quantity (× durationMin si video)
}

interface PricingRow {
  base_price_cents: number;
  multiplier: string | number;      // NUMERIC → peut arriver string
  pied_multiplier: string | number | null;
  active: boolean | null;
}

function isMediaType(v: unknown): v is MediaType {
  return typeof v === "string" && (VALID_MEDIA_TYPES as readonly string[]).includes(v);
}
function isCategory(v: unknown): v is PackCategory {
  return typeof v === "string" && (VALID_CATEGORIES as readonly string[]).includes(v);
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = (await req.json().catch(() => null)) as QuoteBody | null;
    if (!body) {
      return NextResponse.json({ error: "Body JSON invalide" }, { status: 400, headers: cors });
    }

    const { model, items, description } = body;

    // ── Validation ──
    if (!isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items doit être un tableau non vide" },
        { status: 400, headers: cors },
      );
    }

    // Validation par item
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || typeof it !== "object") {
        return NextResponse.json(
          { error: `items[${i}] invalide` },
          { status: 400, headers: cors },
        );
      }
      if (!isMediaType(it.type)) {
        return NextResponse.json(
          { error: `items[${i}].type doit être 'photo' ou 'video'` },
          { status: 400, headers: cors },
        );
      }
      if (!isCategory(it.category)) {
        return NextResponse.json(
          { error: `items[${i}].category doit être silver/gold/vip_black/vip_platinum` },
          { status: 400, headers: cors },
        );
      }
      if (typeof it.quantity !== "number" || !Number.isFinite(it.quantity) || it.quantity <= 0) {
        return NextResponse.json(
          { error: `items[${i}].quantity > 0 requis` },
          { status: 400, headers: cors },
        );
      }
      if (it.type === "video") {
        if (
          typeof it.durationMin !== "number" ||
          !Number.isFinite(it.durationMin) ||
          it.durationMin <= 0
        ) {
          return NextResponse.json(
            { error: `items[${i}].durationMin > 0 requis pour type=video` },
            { status: 400, headers: cors },
          );
        }
      }
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB non configurée" },
        { status: 502, headers: cors },
      );
    }

    const modelId = toModelId(model);

    // ── Fetch pricing grid for this model ──
    const { data: pricingRows, error: pricingErr } = await supabase
      .from("agence_custom_pricing")
      .select("media_type, category, base_price_cents, multiplier, pied_multiplier, active")
      .eq("model", modelId)
      .eq("active", true);

    if (pricingErr) {
      console.error("[API/packs/custom/quote] pricing fetch error:", pricingErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }
    if (!pricingRows || pricingRows.length === 0) {
      return NextResponse.json(
        { error: `Grille tarifaire introuvable pour le modèle ${modelId}` },
        { status: 404, headers: cors },
      );
    }

    // Index pricing par "type:category" pour lookup O(1)
    const pricingMap = new Map<string, PricingRow>();
    for (const row of pricingRows as Array<PricingRow & { media_type: string; category: string }>) {
      pricingMap.set(`${row.media_type}:${row.category}`, row);
    }

    // ── Compute total ──
    const breakdown: QuoteItemOutput[] = [];
    let totalCents = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const key = `${it.type}:${it.category}`;
      const pricing = pricingMap.get(key);
      if (!pricing) {
        return NextResponse.json(
          { error: `Tarif introuvable pour ${key} (modèle ${modelId})` },
          { status: 404, headers: cors },
        );
      }

      const base = pricing.base_price_cents;
      const multiplier = typeof pricing.multiplier === "string"
        ? parseFloat(pricing.multiplier)
        : pricing.multiplier;
      const piedMult = pricing.pied_multiplier == null
        ? 3
        : (typeof pricing.pied_multiplier === "string"
          ? parseFloat(pricing.pied_multiplier)
          : pricing.pied_multiplier);

      // Prix unitaire = base × multiplier catégorie
      let unitPriceCents = Math.round(base * multiplier);
      // Si isPied : ×pied_multiplier (=3 par défaut)
      if (it.isPied === true) {
        unitPriceCents = Math.round(unitPriceCents * piedMult);
      }

      // Line total = unit × quantity ; si video : ×durationMin
      let lineTotalCents = unitPriceCents * it.quantity;
      if (it.type === "video" && typeof it.durationMin === "number") {
        lineTotalCents = Math.round(lineTotalCents * it.durationMin);
      }

      totalCents += lineTotalCents;

      breakdown.push({
        type: it.type,
        category: it.category,
        quantity: it.quantity,
        durationMin: it.type === "video" ? (it.durationMin ?? null) : null,
        isPied: it.isPied === true,
        unitPriceCents,
        lineTotalCents,
      });
    }

    const totalEur = totalCents / 100;

    return NextResponse.json(
      {
        totalCents,
        totalEur,
        currency: "EUR",
        breakdown,
        description: description ?? null,
        model: modelId,
      },
      { headers: cors },
    );
  } catch (err) {
    console.error("[API/packs/custom/quote] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

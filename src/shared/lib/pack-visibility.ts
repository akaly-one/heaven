/**
 * Pack visibility rules — Agent 5.B (Phase 5 B8)
 *
 * Détermine comment un pack doit être rendu pour un fan donné :
 * - public         → visible à tous, jamais flouté
 * - if_purchased   → visible uniquement aux acheteurs, sinon caché
 * - preview_blur   → N premiers items nets (previewCount), reste flouté (blurIntensity)
 *
 * Source de vérité : les colonnes agence_packs.{visibility_rule, blur_intensity, preview_count}
 * (ajoutées par la migration 047).
 */

export type VisibilityRule = "public" | "if_purchased" | "preview_blur";

export interface PackVisibility {
  rule: VisibilityRule;
  blurIntensity: number;
  previewCount: number;
}

export interface FanContext {
  id: string;
  purchasedPackIds: string[];
}

export interface VisibilityComputed {
  /** Le média doit-il apparaître dans le feed ? (si false → item à masquer intégralement) */
  visible: boolean;
  /** Faut-il appliquer un flou sur le média ? */
  blurred: boolean;
  /** Niveau de flou CSS à appliquer (0-20, pertinent uniquement si blurred=true) */
  blurIntensity: number;
  /** Faut-il overlay un paywall (CTA "débloquer / acheter") ? */
  showPaywall: boolean;
}

export const DEFAULT_VISIBILITY: PackVisibility = {
  rule: "if_purchased",
  blurIntensity: 10,
  previewCount: 0,
};

/**
 * Normalise une ligne `agence_packs` en objet `PackVisibility`.
 * Tolère les valeurs null/undefined venant de la DB.
 */
export function normalizePackVisibility(row: {
  visibility_rule?: string | null;
  blur_intensity?: number | null;
  preview_count?: number | null;
}): PackVisibility {
  const rule = (
    row.visibility_rule === "public" ||
    row.visibility_rule === "if_purchased" ||
    row.visibility_rule === "preview_blur"
      ? row.visibility_rule
      : DEFAULT_VISIBILITY.rule
  ) as VisibilityRule;

  const blurIntensity = clamp(
    Number.isFinite(row.blur_intensity) ? Number(row.blur_intensity) : DEFAULT_VISIBILITY.blurIntensity,
    0,
    20
  );

  const previewCount = Math.max(
    0,
    Number.isFinite(row.preview_count) ? Math.floor(Number(row.preview_count)) : DEFAULT_VISIBILITY.previewCount
  );

  return { rule, blurIntensity, previewCount };
}

/**
 * Calcule l'état de rendu d'un item d'un pack pour un fan (ou un visiteur anonyme).
 *
 * @param packId            Identifiant du pack auquel l'item appartient
 * @param visibility        Règles du pack (rule + blurIntensity + previewCount)
 * @param fan               Contexte fan (null = visiteur non connecté, traité comme non-acheteur)
 * @param itemIndexInPack   Index 0-based de l'item au sein du pack (tri stable côté API)
 */
export function computeFeedItemState(
  packId: string,
  visibility: PackVisibility,
  fan: FanContext | null,
  itemIndexInPack: number
): VisibilityComputed {
  const hasPurchased = !!fan && fan.purchasedPackIds.includes(packId);

  // Règle 1 — public : toujours visible, jamais flouté
  if (visibility.rule === "public") {
    return { visible: true, blurred: false, blurIntensity: 0, showPaywall: false };
  }

  // Règle 2 — if_purchased
  if (visibility.rule === "if_purchased") {
    if (hasPurchased) {
      return { visible: true, blurred: false, blurIntensity: 0, showPaywall: false };
    }
    // Non-acheteur : item caché intégralement, mais on signale le paywall
    return { visible: false, blurred: false, blurIntensity: 0, showPaywall: true };
  }

  // Règle 3 — preview_blur
  if (hasPurchased) {
    return { visible: true, blurred: false, blurIntensity: 0, showPaywall: false };
  }

  // Non-acheteur + preview_blur
  const isPreview = itemIndexInPack < visibility.previewCount;
  if (isPreview) {
    return { visible: true, blurred: false, blurIntensity: 0, showPaywall: false };
  }

  // Au-delà du quota de previews → flouté + paywall visible
  return {
    visible: true,
    blurred: true,
    blurIntensity: visibility.blurIntensity,
    showPaywall: true,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Classe CSS Tailwind à appliquer à un item flouté.
 * Utilisation : `className={className(blurIntensity)}`.
 * Mapping intensity (0-20) → utility `blur-*` (step 2).
 */
export function blurClassName(intensity: number): string {
  if (intensity <= 0) return "";
  if (intensity <= 2) return "blur-sm";
  if (intensity <= 5) return "blur";
  if (intensity <= 8) return "blur-md";
  if (intensity <= 12) return "blur-lg";
  if (intensity <= 16) return "blur-xl";
  if (intensity <= 20) return "blur-2xl";
  return "blur-3xl";
}

/**
 * Style CSS inline pour un flou précis (fallback si Tailwind arbitrary values désactivés).
 */
export function blurInlineStyle(intensity: number): { filter?: string } {
  if (intensity <= 0) return {};
  return { filter: `blur(${intensity}px)` };
}

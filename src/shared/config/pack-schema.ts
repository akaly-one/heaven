/**
 * ════════════════════════════════════════════════════════════════
 *  Heaven OS — Pack Schema (SSOT)
 * ════════════════════════════════════════════════════════════════
 *
 *  Schema générique pour les packs modèles. Chaque champ a un ID
 *  stable, un type, un label humain + valeurs par défaut.
 *
 *  Les modèles éditent TOUT depuis leur CP (prix, features, bonuses,
 *  couleur, nom, badge) sans barrière backend.
 *
 *  Ajout d'un nouveau "bonus" = ajouter 1 entrée à BONUS_CATALOG.
 *  Ajout d'un nouveau "tier" = ajouter 1 entrée à TIER_CATALOG.
 *  Zéro code à modifier — la UI se régénère automatiquement.
 * ════════════════════════════════════════════════════════════════
 */

/**
 * Tier slots disponibles. Chaque modèle peut en activer 1-N.
 * Alias legacy p0-p5 conservés pour compat DB historique.
 */
export const TIER_CATALOG = [
  { id: "p0", key: "teaser",       label: "Teaser",         defaultPrice: 0,   order: 0, color: "#94A3B8" },
  { id: "p1", key: "silver",       label: "Silver",         defaultPrice: 50,  order: 1, color: "#C0C0C0" },
  { id: "p2", key: "gold",         label: "Gold",           defaultPrice: 150, order: 2, color: "#D4AF37" },
  { id: "p3", key: "platinum",     label: "Platinum",       defaultPrice: 250, order: 3, color: "#E5E4E2" },
  { id: "p4", key: "diamond",      label: "Diamond",        defaultPrice: 350, order: 4, color: "#B9F2FF" },
  { id: "p5", key: "all_access",   label: "All-Access",     defaultPrice: 500, order: 5, color: "#9B6BFF" },
  { id: "p6", key: "custom",       label: "Custom",         defaultPrice: 0,   order: 6, color: "#E63329" },
] as const;

export type TierId = (typeof TIER_CATALOG)[number]["id"];

/**
 * Bonuses disponibles — chaque pack peut en activer N.
 * Types : "boolean" | "number" | "text".
 * Ajouter ici → apparait automatiquement dans l'UI d'édition.
 */
export const BONUS_CATALOG: Array<{
  id: string;
  label: string;
  icon?: string;
  type: "boolean" | "number" | "text";
  defaultValue?: unknown;
  help?: string;
}> = [
  { id: "fanvueAccess",     label: "Accès Fanvue privé",       icon: "🔗", type: "boolean", defaultValue: false },
  { id: "snapAccess",       label: "Accès Snap privé",         icon: "👻", type: "boolean", defaultValue: false },
  { id: "telegramAccess",   label: "Accès Telegram privé",     icon: "✈️", type: "boolean", defaultValue: false },
  { id: "freeNudeExpress",  label: "Nude express offert",      icon: "🎁", type: "boolean", defaultValue: false },
  { id: "freeVideoOffer",   label: "Vidéo gratuite offerte",   icon: "🎥", type: "boolean", defaultValue: false },
  { id: "nudeDedicaceLevres", label: "Dédicace lèvres",        icon: "💋", type: "boolean", defaultValue: false },
  { id: "videoCallAccess",  label: "Video call privé",         icon: "📞", type: "boolean", defaultValue: false },
  { id: "customContent",    label: "Contenu custom sur demande", icon: "🎨", type: "boolean", defaultValue: false },
  { id: "nudesIncluded",    label: "Nombre de nudes inclus",   icon: "🔢", type: "number",  defaultValue: 0 },
  { id: "videoMinutes",     label: "Minutes de vidéo",         icon: "⏱️", type: "number",  defaultValue: 0 },
  { id: "cosplayCount",     label: "Cosplay inclus",           icon: "🎭", type: "number",  defaultValue: 0 },
  { id: "deliveryDays",     label: "Délai livraison (jours)",  icon: "📦", type: "number",  defaultValue: 7 },
  { id: "welcomeMessage",   label: "Message d'accueil custom", icon: "💌", type: "text",    defaultValue: "" },
];

export type Bonus = (typeof BONUS_CATALOG)[number];

/**
 * Badges possibles pour un pack (affichage marketing).
 */
export const BADGE_OPTIONS = [
  { id: "", label: "Aucun" },
  { id: "Populaire", label: "🔥 Populaire" },
  { id: "Nouveau",   label: "✨ Nouveau" },
  { id: "VIP",       label: "👑 VIP" },
  { id: "Best",      label: "⭐ Best-seller" },
  { id: "Limited",   label: "⏳ Édition limitée" },
] as const;

/**
 * Sections structurées d'un pack (UI card) — ordre d'affichage.
 */
export const PACK_SECTIONS = [
  { id: "header",     label: "En-tête",         required: true  }, // name + price + color + badge
  { id: "features",   label: "Inclusions",      required: true  }, // text[] features
  { id: "bonuses",    label: "Bonus",           required: false }, // keyed bonuses
  { id: "payment",    label: "Paiement",        required: false }, // revolut_url, paypal
  { id: "visibility", label: "Visibilité",      required: false }, // active, sort_order
] as const;

/**
 * Build a new empty pack for a given model + tier id.
 */
export function buildEmptyPack(modelId: string, tierId: TierId) {
  const tier = TIER_CATALOG.find((t) => t.id === tierId);
  if (!tier) throw new Error(`Tier ${tierId} inconnu`);
  return {
    model: modelId,
    pack_id: tier.id,
    name: tier.label,
    price: tier.defaultPrice,
    color: tier.color,
    badge: "",
    features: [] as string[],
    bonuses: {} as Record<string, unknown>,
    active: true,
    sort_order: tier.order,
    revolut_url: null as string | null,
  };
}

/**
 * Pack shape from DB (typed).
 */
export interface Pack {
  id: string;
  model: string;
  pack_id: string;
  name: string;
  price: number;
  color: string | null;
  badge: string | null;
  features: string[];
  bonuses: Record<string, unknown>;
  active: boolean;
  sort_order: number;
  revolut_url: string | null;
  face?: boolean | null;
}

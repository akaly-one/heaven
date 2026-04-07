// ══════════════════════════════════════════════
//  Heaven OS — Tier Configuration (single source)
//  Silver → Gold → VIP Black → VIP Platinum
//  Luxe metallic branding
// ══════════════════════════════════════════════

export interface TierConfig {
  color: string;   // CSS var reference
  hex: string;     // fallback hex
  symbol: string;  // unicode symbol
  label: string;   // display name
  bg: string;      // rgba for badges/backgrounds
  description: string; // short tier description
}

export const TIER_CONFIG: Record<string, TierConfig> = {
  public: {
    color: "var(--text-muted)",
    hex: "#7A7A6E",
    symbol: "",
    label: "Public",
    bg: "rgba(122,122,110,0.08)",
    description: "Contenu gratuit",
  },
  free: {
    color: "var(--text-muted)",
    hex: "#64748B",
    symbol: "",
    label: "Free",
    bg: "rgba(100,116,139,0.08)",
    description: "Contenu gratuit",
  },
  promo: {
    color: "var(--text-muted)",
    hex: "#64748B",
    symbol: "",
    label: "Promo",
    bg: "rgba(100,116,139,0.08)",
    description: "Contenu promotionnel",
  },
  silver: {
    color: "var(--tier-silver)",
    hex: "#C0C0C0",
    symbol: "✦",
    label: "Silver",
    bg: "rgba(192,192,192,0.10)",
    description: "Photos, shootings, promos — sans nudité",
  },
  gold: {
    color: "var(--tier-gold)",
    hex: "#D4AF37",
    symbol: "★",
    label: "Gold",
    bg: "rgba(212,175,55,0.10)",
    description: "Tenue dentelle, sensuel, poses suggestives",
  },
  black: {
    color: "var(--tier-black)",
    hex: "#1C1C1C",
    symbol: "♠",
    label: "VIP Black",
    bg: "rgba(28,28,28,0.12)",
    description: "Sextapes & nudes — visage caché",
  },
  feet: {
    color: "var(--tier-feet)",
    hex: "#E8A87C",
    symbol: "🦶",
    label: "Feet Lovers",
    bg: "rgba(232,168,124,0.10)",
    description: "Photos pieds glamour, accessoires, dédicaces",
  },
  platinum: {
    color: "var(--tier-platinum)",
    hex: "#B8860B",
    symbol: "♛",
    label: "VIP Platinum",
    bg: "rgba(184,134,11,0.10)",
    description: "Visage découvert, contenu explicite premium",
  },
  // ── Legacy aliases (backward compat with existing DB data) ──
  vip: {
    color: "var(--tier-silver)",
    hex: "#C0C0C0",
    symbol: "✦",
    label: "Silver",
    bg: "rgba(192,192,192,0.10)",
    description: "Photos, shootings, promos — sans nudité",
  },
  diamond: {
    color: "var(--tier-black)",
    hex: "#1C1C1C",
    symbol: "♠",
    label: "VIP Black",
    bg: "rgba(28,28,28,0.12)",
    description: "Sextapes & nudes — visage caché",
  },
};

/** Backward-compatible TIER_COLORS (hex values only) */
export const TIER_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(TIER_CONFIG).map(([k, v]) => [k, v.hex])
);

/** Backward-compatible TIER_META (color as CSS var, symbol, label) */
export const TIER_META: Record<string, { color: string; symbol: string; label: string; description?: string }> = Object.fromEntries(
  Object.entries(TIER_CONFIG).map(([k, v]) => [k, { color: v.color, symbol: v.symbol, label: v.label, description: v.description }])
);

/** Backward-compatible TIER_HEX */
export const TIER_HEX: Record<string, string> = Object.fromEntries(
  Object.entries(TIER_CONFIG)
    .filter(([k]) => !["public", "free", "promo"].includes(k))
    .map(([k, v]) => [k, v.hex])
);

/** Canonical tier order (new IDs) */
export const TIER_HIERARCHY = ["silver", "gold", "black", "platinum"] as const;

/** Platform colors (used in pipeline, messages) */
export const PLATFORM_COLORS: Record<string, string> = {
  onlyfans: "#00AFF0",
  fanvue: "#E040FB",
  instagram: "#E1306C",
  tiktok: "#69C9D0",
  twitter: "#1DA1F2",
  snapchat: "#997A00",
  youtube: "#FF0000",
};

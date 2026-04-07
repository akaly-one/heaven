// ══════════════════════════════════════════════
//  Heaven OS — Tier Configuration (single source)
//  p0 (Public) → p1 (Silver) → p2 (Gold) → p3 (Feet) → p4 (Black) → p5 (Platinum)
//  Generic positional slots + legacy aliases
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
  // ── Generic positional slots (primary keys) ──
  p0: {
    color: "var(--text-muted)",
    hex: "#7A7A6E",
    symbol: "",
    label: "Public",
    bg: "rgba(122,122,110,0.08)",
    description: "Contenu gratuit",
  },
  p1: {
    color: "var(--tier-silver)",
    hex: "#C0C0C0",
    symbol: "♣",
    label: "Silver",
    bg: "rgba(192,192,192,0.10)",
    description: "Photos, shootings, promos — sans nudité",
  },
  p2: {
    color: "var(--tier-gold)",
    hex: "#D4AF37",
    symbol: "♦",
    label: "Gold",
    bg: "rgba(212,175,55,0.10)",
    description: "Tenue dentelle, sensuel, poses suggestives",
  },
  p3: {
    color: "var(--tier-feet)",
    hex: "#E8A87C",
    symbol: "🦶",
    label: "Feet Lovers",
    bg: "rgba(232,168,124,0.10)",
    description: "Photos pieds glamour, accessoires, dédicaces",
  },
  p4: {
    color: "var(--tier-black)",
    hex: "#1C1C1C",
    symbol: "♠",
    label: "VIP Black",
    bg: "rgba(28,28,28,0.12)",
    description: "Sextapes & nudes — visage caché",
  },
  p5: {
    color: "var(--tier-platinum)",
    hex: "#B8860B",
    symbol: "♥",
    label: "VIP Platinum",
    bg: "rgba(184,134,11,0.10)",
    description: "Visage découvert, contenu explicite premium",
  },
  // ── Legacy aliases (backward compat with existing DB/code) ──
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
    symbol: "♣",
    label: "Silver",
    bg: "rgba(192,192,192,0.10)",
    description: "Photos, shootings, promos — sans nudité",
  },
  gold: {
    color: "var(--tier-gold)",
    hex: "#D4AF37",
    symbol: "♦",
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
    symbol: "♥",
    label: "VIP Platinum",
    bg: "rgba(184,134,11,0.10)",
    description: "Visage découvert, contenu explicite premium",
  },
  vip: {
    color: "var(--tier-silver)",
    hex: "#C0C0C0",
    symbol: "♣",
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

/** Canonical TIER_HEX (pN paid slots only) */
export const TIER_HEX: Record<string, string> = Object.fromEntries(
  Object.entries(TIER_CONFIG)
    .filter(([k]) => /^p[1-5]$/.test(k))
    .map(([k, v]) => [k, v.hex])
);

/** Canonical tier order (generic positional slots) */
export const TIER_HIERARCHY = ["p1", "p2", "p3", "p4", "p5"] as const;

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

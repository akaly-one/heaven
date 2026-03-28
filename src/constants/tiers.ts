// ══════════════════════════════════════════════
//  Heaven OS — Tier Configuration (single source)
//  Replaces TIER_COLORS / TIER_META / TIER_HEX
//  duplicated across 5+ files
// ══════════════════════════════════════════════

export interface TierConfig {
  color: string;   // CSS var reference
  hex: string;     // fallback hex
  symbol: string;  // unicode symbol
  label: string;   // display name
  bg: string;      // rgba for badges/backgrounds
}

export const TIER_CONFIG: Record<string, TierConfig> = {
  public: {
    color: "var(--text-muted)",
    hex: "#7A7A6E",
    symbol: "",
    label: "Public",
    bg: "rgba(122,122,110,0.08)",
  },
  free: {
    color: "var(--text-muted)",
    hex: "#64748B",
    symbol: "",
    label: "Free",
    bg: "rgba(100,116,139,0.08)",
  },
  vip: {
    color: "var(--tier-vip)",
    hex: "#E63329",
    symbol: "\u2665",
    label: "VIP",
    bg: "rgba(230,51,41,0.08)",
  },
  gold: {
    color: "var(--tier-gold)",
    hex: "#9E7C1F",
    symbol: "\u2605",
    label: "Gold",
    bg: "rgba(158,124,31,0.08)",
  },
  diamond: {
    color: "var(--tier-diamond)",
    hex: "#4F46E5",
    symbol: "\u2666",
    label: "Diamond",
    bg: "rgba(79,70,229,0.08)",
  },
  platinum: {
    color: "var(--tier-platinum)",
    hex: "#7C3AED",
    symbol: "\u265B",
    label: "Platinum",
    bg: "rgba(124,58,237,0.08)",
  },
};

/** Backward-compatible TIER_COLORS (hex values only) */
export const TIER_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(TIER_CONFIG).map(([k, v]) => [k, v.hex])
);

/** Backward-compatible TIER_META (color as CSS var, symbol, label) */
export const TIER_META: Record<string, { color: string; symbol: string; label: string }> = Object.fromEntries(
  Object.entries(TIER_CONFIG).map(([k, v]) => [k, { color: v.color, symbol: v.symbol, label: v.label }])
);

/** Backward-compatible TIER_HEX */
export const TIER_HEX: Record<string, string> = Object.fromEntries(
  Object.entries(TIER_CONFIG)
    .filter(([k]) => !["public", "free"].includes(k))
    .map(([k, v]) => [k, v.hex])
);

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

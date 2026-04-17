// ══════════════════════════════════════════════
//  Heaven OS — Tier-Based Badge System
//  Badge reflects the active pack tier
// ══════════════════════════════════════════════

export interface BadgeConfig {
  label: string;
  emoji: string;
  color: string;
  bg: string;
}

const TIER_BADGES: Record<string, BadgeConfig> = {
  // Generic slot IDs
  p1:       { label: "Silver",       emoji: "✦", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  p2:       { label: "Gold",         emoji: "★", color: "#D4AF37", bg: "rgba(212,175,55,0.12)" },
  p3:       { label: "Feet",         emoji: "\uD83E\uDDB6", color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  p4:       { label: "VIP Black",    emoji: "♠", color: "#111111", bg: "rgba(0,0,0,0.10)" },
  p5:       { label: "Platinum",     emoji: "♛", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  // Legacy aliases
  silver:   { label: "Silver",       emoji: "✦", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  gold:     { label: "Gold",         emoji: "★", color: "#D4AF37", bg: "rgba(212,175,55,0.12)" },
  feet:     { label: "Feet",         emoji: "\uD83E\uDDB6", color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  black:    { label: "VIP Black",    emoji: "♠", color: "#111111", bg: "rgba(0,0,0,0.10)" },
  platinum: { label: "Platinum",     emoji: "♛", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
};

const VISITOR_BADGE: BadgeConfig = {
  label: "Visiteur",
  emoji: "○",
  color: "#6B7280",
  bg: "rgba(107,114,128,0.10)",
};

// Legacy — kept for API backward compatibility (agence_fan_lifecycle badge_grade)
export function calculateBadgeGrade(stats: {
  visit_count: number;
  messages_count: number;
  orders_completed: number;
  tier_rank: number;
}): string {
  const { visit_count, messages_count, orders_completed, tier_rank } = stats;
  if (orders_completed >= 5 && tier_rank >= 3) return "top_fan";
  if (orders_completed >= 3 || tier_rank >= 1) return "vip";
  if (orders_completed >= 1 || visit_count >= 10) return "fan";
  if (visit_count >= 3 && messages_count >= 1) return "regulier";
  return "nouveau";
}

/** Return badge config based on active pack tier (null = no pack). */
export function getTierBadge(tier: string | null): BadgeConfig {
  if (!tier) return VISITOR_BADGE;
  const key = tier.toLowerCase().trim();
  return TIER_BADGES[key] || VISITOR_BADGE;
}

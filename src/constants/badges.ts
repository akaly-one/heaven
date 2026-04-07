// ══════════════════════════════════════════════
//  Heaven OS — Client Badge / Grade System
//  Hierarchy: Nouveau → Régulier → Fan → VIP → Top Fan
// ══════════════════════════════════════════════

export interface BadgeConfig {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  description: string;
}

export const BADGE_CONFIG: Record<string, BadgeConfig> = {
  nouveau:  { label: "Nouveau",  emoji: "🌱", color: "#94A3B8", bg: "rgba(148,163,184,0.10)", description: "Bienvenue !" },
  regulier: { label: "Régulier", emoji: "⭐", color: "#F59E0B", bg: "rgba(245,158,11,0.10)", description: "Visiteur fidèle" },
  fan:      { label: "Fan",      emoji: "💎", color: "#3B82F6", bg: "rgba(59,130,246,0.10)", description: "Supporter confirmé" },
  vip:      { label: "VIP",      emoji: "👑", color: "#D4AF37", bg: "rgba(212,175,55,0.10)", description: "Client premium" },
  top_fan:  { label: "Top Fan",  emoji: "🔥", color: "#EF4444", bg: "rgba(239,68,68,0.10)", description: "Fan ultime" },
};

export const BADGE_HIERARCHY = ["nouveau", "regulier", "fan", "vip", "top_fan"] as const;

// Thresholds: visits, messages, orders_completed, min tier rank in TIER_HIERARCHY
export function calculateBadgeGrade(stats: {
  visit_count: number;
  messages_count: number;
  orders_completed: number;
  tier_rank: number; // index in TIER_HIERARCHY, -1 if none
}): string {
  const { visit_count, messages_count, orders_completed, tier_rank } = stats;
  if (orders_completed >= 5 && tier_rank >= 3) return "top_fan";
  if (orders_completed >= 3 || tier_rank >= 1) return "vip";
  if (orders_completed >= 1 || visit_count >= 10) return "fan";
  if (visit_count >= 3 && messages_count >= 1) return "regulier";
  return "nouveau";
}

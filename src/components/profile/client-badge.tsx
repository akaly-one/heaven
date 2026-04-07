"use client";

import { BADGE_CONFIG } from "@/constants/badges";

interface ClientBadgeProps {
  grade: string;
  tierColor?: string; // CSS var or hex for active pack tier ring
  size?: "sm" | "md";
}

export function ClientBadge({ grade, tierColor, size = "sm" }: ClientBadgeProps) {
  const badge = BADGE_CONFIG[grade] || BADGE_CONFIG.nouveau;
  const isSm = size === "sm";

  return (
    <span
      className="inline-flex items-center gap-1 font-bold rounded-full whitespace-nowrap"
      style={{
        fontSize: isSm ? "9px" : "11px",
        padding: isSm ? "2px 6px" : "3px 10px",
        background: badge.bg,
        color: badge.color,
        border: tierColor ? `1.5px solid ${tierColor}` : `1px solid ${badge.color}25`,
      }}
    >
      <span>{badge.emoji}</span>
      <span>{badge.label}</span>
    </span>
  );
}

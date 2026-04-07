"use client";

import { getTierBadge } from "@/constants/badges";

interface ClientBadgeProps {
  tier: string | null;
  size?: "sm" | "md";
}

export function ClientBadge({ tier, size = "sm" }: ClientBadgeProps) {
  const badge = getTierBadge(tier);
  const isSm = size === "sm";

  return (
    <span
      className="inline-flex items-center gap-1 font-bold rounded-full whitespace-nowrap"
      style={{
        fontSize: isSm ? "9px" : "11px",
        padding: isSm ? "2px 6px" : "3px 10px",
        background: badge.bg,
        color: badge.color,
        border: `1px solid ${badge.color}25`,
      }}
    >
      <span>{badge.emoji}</span>
      <span>{badge.label}</span>
    </span>
  );
}

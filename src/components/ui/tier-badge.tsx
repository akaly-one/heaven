"use client";

import { TIER_CONFIG } from "@/constants/tiers";

interface TierBadgeProps {
  tier: string;
  size?: "sm" | "md";
  showSymbol?: boolean;
}

export function TierBadge({ tier, size = "sm", showSymbol = true }: TierBadgeProps) {
  const config = TIER_CONFIG[tier.toLowerCase()] || TIER_CONFIG.public;
  const isSmall = size === "sm";

  return (
    <span
      className="inline-flex items-center gap-1 font-bold uppercase tracking-wider"
      style={{
        fontSize: isSmall ? 10 : 11,
        padding: isSmall ? "1px 6px" : "2px 8px",
        borderRadius: 6,
        background: config.bg,
        color: config.hex,
        letterSpacing: "0.04em",
      }}
    >
      {showSymbol && config.symbol && (
        <span style={{ fontSize: isSmall ? 9 : 10 }}>{config.symbol}</span>
      )}
      {config.label}
    </span>
  );
}

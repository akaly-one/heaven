"use client";

import { Instagram, Crown, Users } from "lucide-react";

/**
 * Visual badge that distinguishes the source of a feed item.
 *
 * Used by `feed-item-card.tsx` to overlay a top-right pill on each card.
 *
 * - `instagram` : IG gradient pill (violet → rose → orange) with IG glyph
 *                 → posts synced from @<model>'s Instagram via cron
 * - `crown`     : gold pill with crown glyph
 *                 → exclusive web-only content (manual posts)
 * - `wall`      : subtle neutral pill with author pseudo
 *                 → messages posted by fans on the model's wall
 *
 * Resolves Brief B10 (badges distinctifs) — cards are visually distinguishable
 * at a glance without reading content.
 */

export type BadgeType = "instagram" | "crown" | "wall";

interface ContentBadgeProps {
  type: BadgeType;
  /** Only used when type === "wall" — fan pseudo shown inside the pill. */
  authorPseudo?: string | null;
  /** Slim variant for crowded headers / thumbnails. Default false. */
  compact?: boolean;
}

export function ContentBadge({ type, authorPseudo, compact = false }: ContentBadgeProps) {
  const paddingY = compact ? "py-0.5" : "py-1";
  const paddingX = compact ? "px-2" : "px-2.5";
  const iconSize = compact ? "w-2.5 h-2.5" : "w-3 h-3";
  const textSize = compact ? "text-[9px]" : "text-[10px]";

  if (type === "instagram") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full ${paddingX} ${paddingY} ${textSize} font-bold uppercase tracking-wide`}
        style={{
          background:
            "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
          color: "#fff",
          boxShadow: "0 2px 8px rgba(220,39,67,0.25)",
        }}
        title="Post synchronisé depuis Instagram"
      >
        <Instagram className={iconSize} />
        Instagram
      </span>
    );
  }

  if (type === "crown") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full ${paddingX} ${paddingY} ${textSize} font-bold uppercase tracking-wide`}
        style={{
          background: "linear-gradient(135deg, #F7D774 0%, #D4AF37 50%, #B8860B 100%)",
          color: "#3A2A00",
          boxShadow: "0 2px 8px rgba(184,134,11,0.3)",
        }}
        title="Contenu exclusif web"
      >
        <Crown className={iconSize} />
        Exclusif
      </span>
    );
  }

  // wall
  const label = authorPseudo ? `@${authorPseudo}` : "Fan";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${paddingX} ${paddingY} ${textSize} font-semibold`}
      style={{
        background: "rgba(255,255,255,0.06)",
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
      }}
      title="Message d'un fan"
    >
      <Users className={iconSize} />
      {label}
    </span>
  );
}

"use client";

/**
 * IgCtaButtons — Phase 3 Agent 3.A (B9).
 *
 * Two native-Instagram CTA links for the dashboard header:
 *   - "Voir sur Insta" → https://instagram.com/<username>
 *   - "Envoyer un DM" → https://ig.me/m/<username>
 *
 * Styling : rose/violet Heaven gradient consistent with the InstagramStatsWidget
 * (linear-gradient 135deg #833AB4 → #E1306C → #F77737).
 *
 * Responsive : on small screens (md breakpoint ⬇) only the icons are shown to
 * keep the header compact. Labels re-appear on md+.
 */

import { Instagram, Send } from "lucide-react";

export interface IgCtaButtonsProps {
  /** IG handle without the leading `@`. */
  username: string | null | undefined;
  /** When true renders a more compact (pill) variant. */
  compact?: boolean;
}

export function IgCtaButtons({ username, compact = false }: IgCtaButtonsProps) {
  const cleaned = (username || "").replace(/^@/, "").trim();
  if (!cleaned) return null;

  const igUrl = `https://instagram.com/${encodeURIComponent(cleaned)}`;
  const dmUrl = `https://ig.me/m/${encodeURIComponent(cleaned)}`;

  const basePad = compact ? "px-2.5 py-1.5" : "px-3 py-1.5";
  const baseText = compact ? "text-[11px]" : "text-xs";

  return (
    <div className="flex items-center gap-2 shrink-0">
      <a
        href={igUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1.5 ${basePad} rounded-lg ${baseText} font-semibold no-underline transition-all hover:brightness-110 active:brightness-95`}
        style={{
          background: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
          color: "#fff",
        }}
        title="Voir sur Instagram"
        aria-label="Voir sur Instagram"
      >
        <Instagram className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Voir sur Insta</span>
      </a>
      <a
        href={dmUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1.5 ${basePad} rounded-lg ${baseText} font-semibold no-underline transition-all border bg-transparent hover:bg-white/[0.06]`}
        style={{
          borderColor: "rgba(225,48,108,0.35)",
          color: "#E1306C",
        }}
        title="Envoyer un DM"
        aria-label="Envoyer un DM Instagram"
      >
        <Send className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Envoyer un DM</span>
      </a>
    </div>
  );
}

export default IgCtaButtons;

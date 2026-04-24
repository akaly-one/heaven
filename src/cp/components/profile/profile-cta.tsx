"use client";

import { Instagram, MessageCircle, Sparkles } from "lucide-react";

/**
 * Public-profile CTA buttons — « Suivre sur Insta » + « Envoyer un DM ».
 *
 * Mirrors the private Dashboard CTA (Agent 3.A) but exposed to anonymous
 * visitors on `/m/{slug}`. Uses native Instagram URL schemes so the click
 * leaves Heaven and lands in the IG app (mobile) or web (desktop).
 *
 * - Follow → `https://instagram.com/<handle>` (new tab)
 * - DM     → `https://ig.me/m/<handle>` (new tab) — opens native DM thread
 *
 * Resolves Brief B9 (CTA Insta on public profile).
 *
 * Behaviour
 * - If `handle` is empty/null → renders nothing (no broken links).
 * - If `dmDisabled` is true → only the Follow button is shown.
 */

interface ProfileCtaProps {
  /** Instagram handle without leading @. Accepts values with or without @. */
  handle: string | null | undefined;
  /** Hide the DM button (e.g. when instagram_config.dm_disabled = true). */
  dmDisabled?: boolean;
  /** Visual size — `sm` for mobile/inline, `md` for hero. Default `md`. */
  size?: "sm" | "md";
  /** Optional className override for layout. */
  className?: string;
  /** Fanvue URL (full https://fanvue.com/...) OR handle. Active CTA gold si présent. */
  fanvueUrl?: string | null;
}

function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").replace(/\/$/, "");
}

export function ProfileCta({ handle, dmDisabled = false, size = "md", className, fanvueUrl }: ProfileCtaProps) {
  const h = handle ? cleanHandle(handle) : "";
  const hasIg = !!h;

  // NB 2026-04-24 : construire fanvue URL complète
  const fanvueFull = fanvueUrl
    ? (fanvueUrl.startsWith("http") ? fanvueUrl : `https://fanvue.com/${cleanHandle(fanvueUrl)}`)
    : null;

  if (!hasIg && !fanvueFull) return null;

  const followUrl = `https://instagram.com/${h}`;
  const dmUrl = `https://ig.me/m/${h}`;

  const pad = size === "sm" ? "px-3 py-1.5" : "px-4 py-2.5";
  const text = size === "sm" ? "text-[11px]" : "text-xs";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className || ""}`}>
      {hasIg && (
        <a
          href={followUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-xl ${pad} ${text} font-semibold no-underline transition-all hover:brightness-110 active:scale-[0.97]`}
          style={{
            background:
              "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            color: "#fff",
            boxShadow: "0 2px 10px rgba(220,39,67,0.25)",
          }}
          aria-label={`Suivre @${h} sur Instagram`}
        >
          <Instagram className={iconSize} />
          Suivre
        </a>
      )}

      {hasIg && !dmDisabled && (
        <a
          href={dmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-xl ${pad} ${text} font-semibold no-underline transition-all hover:brightness-110 active:scale-[0.97]`}
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(6px)",
          }}
          aria-label={`Envoyer un DM à @${h} sur Instagram`}
        >
          <MessageCircle className={iconSize} />
          DM
        </a>
      )}

      {fanvueFull && (
        <a
          href={fanvueFull}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-xl ${pad} ${text} font-semibold no-underline transition-all hover:brightness-110 active:scale-[0.97]`}
          style={{
            background: "linear-gradient(135deg, #D4AF37, #E6C974, #B8860B)",
            color: "#0A0A0C",
            boxShadow: "0 2px 10px rgba(212,175,55,0.35)",
          }}
          aria-label="Voir sur Fanvue"
        >
          <Sparkles className={iconSize} />
          Fanvue
        </a>
      )}
    </div>
  );
}

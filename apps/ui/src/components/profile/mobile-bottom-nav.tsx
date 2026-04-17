"use client";

import { Lock, Newspaper, Sparkles } from "lucide-react";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import type { PackConfig } from "@/types/heaven";

// ── Tier helpers ──
const TIER_HIERARCHY = ["p1", "p2", "p3", "p4", "p5"];
const TIER_ALIASES: Record<string, string> = {
  vip: "p1", diamond: "p4",
  silver: "p1", gold: "p2", feet: "p3", black: "p4", platinum: "p5",
  public: "p0", free: "p0", promo: "p0",
};
function normalizeTier(t: string): string {
  if (/^p\d$/.test(t)) return t;
  return TIER_ALIASES[t?.toLowerCase()] || t;
}
function tierIncludes(unlockedTier: string, contentTier: string): boolean {
  const ui = TIER_HIERARCHY.indexOf(normalizeTier(unlockedTier));
  const ci = TIER_HIERARCHY.indexOf(normalizeTier(contentTier));
  if (ui === -1 || ci === -1) return false;
  return ui >= ci;
}

export interface MobileBottomNavProps {
  activePacks: PackConfig[];
  galleryTier: string;
  setGalleryTier: (tier: string) => void;
  setFocusPack: (id: string | null) => void;
  unlockedTier: string | null;
  isModelLoggedIn: boolean;
}

export function MobileBottomNav({
  activePacks,
  galleryTier,
  setGalleryTier,
  setFocusPack,
  unlockedTier,
  isModelLoggedIn,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden safe-area-bottom"
      style={{ background: "color-mix(in srgb, var(--bg) 95%, transparent)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center overflow-x-auto no-scrollbar px-2 py-2.5 gap-1">
        {/* Feed */}
        <button onClick={() => { setGalleryTier("feed"); setFocusPack(null); }}
          className="relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl cursor-pointer transition-all shrink-0"
          style={{
            color: galleryTier === "feed" ? "#fff" : "var(--text-muted)",
            background: galleryTier === "feed" ? "var(--accent)" : "transparent",
          }}>
          <Newspaper className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.05em" }}>Feed</span>
        </button>
        {/* Pack tiers — all packs */}
        {activePacks.map(p => {
          const hex = TIER_HEX[p.id] || p.color;
          const isActive = galleryTier === p.id;
          const isLocked = !isModelLoggedIn && !(unlockedTier && tierIncludes(unlockedTier, p.id));
          return (
            <button key={p.id} onClick={() => { setGalleryTier(p.id); setFocusPack(null); }}
              className="relative flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-xl cursor-pointer transition-all shrink-0"
              style={{
                color: isActive ? "#fff" : hex,
                background: isActive ? hex : "transparent",
                opacity: isLocked && !isActive ? 0.5 : 1,
              }}>
              <span className="text-lg relative leading-none">
                {TIER_META[p.id]?.symbol}
                {isLocked && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-2" style={{ color: isActive ? "#fff" : hex, opacity: 0.7 }} />}
              </span>
              <span className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.04em" }}>{TIER_META[p.id]?.label}</span>
            </button>
          );
        })}
        {/* Custom */}
        <button onClick={() => { setGalleryTier("custom"); setFocusPack(null); }}
          className="relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl cursor-pointer transition-all shrink-0"
          style={{
            color: galleryTier === "custom" ? "#fff" : "var(--text-muted)",
            background: galleryTier === "custom" ? "var(--gold, #D4A017)" : "transparent",
          }}>
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.05em" }}>Custom</span>
        </button>
      </div>
    </nav>
  );
}

"use client";

import { Lock, Newspaper, Sparkles } from "lucide-react";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import type { PackConfig, UploadedContent } from "@/types/heaven";

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

export interface TierNavDesktopProps {
  activePacks: PackConfig[];
  galleryTier: string;
  setGalleryTier: (tier: string) => void;
  setFocusPack: (id: string | null) => void;
  unlockedTier: string | null;
  isModelLoggedIn: boolean;
  uploads: UploadedContent[];
}

export function TierNavDesktop({
  activePacks,
  galleryTier,
  setGalleryTier,
  setFocusPack,
  unlockedTier,
  isModelLoggedIn,
  uploads,
}: TierNavDesktopProps) {
  const packTiers = activePacks.map(p => p.id);

  return (
    <div className="sticky top-[36px] md:top-[40px] z-30 py-2 hidden md:block"
      style={{ background: "color-mix(in srgb, var(--bg) 92%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12">
        <div className="flex gap-2 justify-center pb-1" role="tablist" aria-label="Navigation profil">
          {/* Feed tile */}
          <button
            role="tab"
            id="heaven-tab-feed"
            aria-controls="heaven-tabpanel-feed"
            aria-selected={galleryTier === "feed" || galleryTier === "home"}
            aria-label="Onglet Feed"
            onClick={() => { setGalleryTier("feed"); setFocusPack(null); }}
            className="relative flex-1 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] group overflow-hidden"
            style={{
              minWidth: "70px",
              padding: "12px 16px",
              background: galleryTier === "feed"
                ? "linear-gradient(135deg, var(--accent), #F43F5E)"
                : "var(--surface)",
              border: galleryTier === "feed" ? "none" : "1px solid var(--border)",
              boxShadow: galleryTier === "feed" ? "0 4px 16px rgba(230,51,41,0.25)" : "none",
            }}>
            <div className="flex flex-col items-center gap-1">
              <Newspaper className="w-4 h-4" aria-hidden="true" style={{ color: galleryTier === "feed" ? "#fff" : "var(--text-muted)" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: galleryTier === "feed" ? "#fff" : "var(--text-muted)" }}>Feed</span>
            </div>
          </button>

          {/* Pack tier tiles — metallic dynamic cards */}
          {packTiers.map(t => {
            const tierHex = TIER_HEX[t] || "var(--text-muted)";
            const tierLabel = TIER_META[t]?.label || t.toUpperCase();
            const tierSymbol = TIER_META[t]?.symbol || "";
            const isLocked = !isModelLoggedIn && !(unlockedTier && tierIncludes(unlockedTier, t));
            const isActive = galleryTier === t;
            const previewImg = uploads.find(u => normalizeTier(u.tier) === t && u.dataUrl && u.type === "photo")?.dataUrl;
            return (
              <button
                key={t}
                role="tab"
                id={`heaven-tab-${t}`}
                aria-controls={`heaven-tabpanel-${t}`}
                aria-selected={isActive}
                aria-label={`Onglet ${tierLabel}${isLocked ? " (verrouillé)" : ""}`}
                onClick={() => { setGalleryTier(t); setFocusPack(null); }}
                className="relative flex-1 rounded-xl cursor-pointer poker-tile group overflow-hidden"
                style={{
                  minWidth: "70px",
                  height: "72px",
                  background: isActive ? `linear-gradient(135deg, ${tierHex}, ${tierHex}CC)` : "var(--surface)",
                  border: isActive ? `2px solid ${tierHex}` : "1px solid var(--border)",
                  boxShadow: isActive ? `0 4px 20px ${tierHex}40` : "none",
                  opacity: isLocked && !isActive ? 0.7 : 1,
                }}>
                {/* Background — preview image or tier gradient */}
                <div className="absolute inset-0" aria-hidden="true">
                  {previewImg && !isActive ? (
                    <img src={previewImg} alt="" draggable={false}
                      className="w-full h-full object-cover"
                      style={{ filter: isLocked ? "blur(8px) brightness(0.3)" : "brightness(0.35)", transform: isLocked ? "scale(1.1)" : "none" }} />
                  ) : !isActive ? (
                    <div className="w-full h-full"
                      style={{ background: `linear-gradient(135deg, ${tierHex}12, ${tierHex}06)` }} />
                  ) : null}
                </div>
                {/* Content — white by default, tier color on hover/active */}
                <div className="relative flex flex-col items-center justify-center h-full gap-0.5 px-3">
                  {/* Poker card corners — visible on hover, purely decorative */}
                  <span aria-hidden="true" className="absolute top-1 left-1.5 text-[8px] font-bold opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ color: isActive ? "#fff" : tierHex }}>{tierSymbol}</span>
                  <span aria-hidden="true" className="absolute bottom-1 right-1.5 text-[8px] font-bold opacity-0 group-hover:opacity-60 transition-opacity rotate-180"
                    style={{ color: isActive ? "#fff" : tierHex }}>{tierSymbol}</span>
                  <span aria-hidden="true" className="text-xl transition-all duration-200 group-hover:scale-110 relative"
                    style={{ color: isActive ? "#fff" : "var(--text-muted)", filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.15))` }}>
                    {tierSymbol}
                    {isLocked && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-2" aria-hidden="true" style={{ color: "#fff", opacity: 0.7 }} />}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider transition-colors duration-200"
                    style={{ color: isActive ? "#fff" : "var(--text-muted)", textShadow: isActive || previewImg ? "0 1px 4px rgba(0,0,0,0.5)" : "none" }}>
                    {tierLabel}
                  </span>
                </div>
                {/* Bottom glow line when active */}
                {isActive && (
                  <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-[3px]"
                    style={{ background: tierHex, boxShadow: `0 0 10px ${tierHex}` }} />
                )}
              </button>
            );
          })}

          {/* Custom tile */}
          <button
            role="tab"
            id="heaven-tab-custom"
            aria-controls="heaven-tabpanel-custom"
            aria-selected={galleryTier === "custom"}
            aria-label="Onglet Custom"
            onClick={() => { setGalleryTier("custom"); setFocusPack(null); }}
            className="relative flex-1 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] group overflow-hidden"
            style={{
              minWidth: "70px",
              padding: "12px 16px",
              background: galleryTier === "custom"
                ? "linear-gradient(135deg, #D4AF37, #B8860B)"
                : "var(--surface)",
              border: galleryTier === "custom" ? "none" : "1px solid var(--border)",
              boxShadow: galleryTier === "custom" ? "0 4px 16px rgba(184,134,11,0.25)" : "none",
            }}>
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4" aria-hidden="true" style={{ color: galleryTier === "custom" ? "#fff" : "var(--text-muted)" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: galleryTier === "custom" ? "#fff" : "var(--text-muted)" }}>Custom</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

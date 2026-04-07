"use client";

import React, { useState } from "react";
import { Lock, Crown, Star, Heart, Diamond, ChevronDown, ShoppingBag, Sparkles } from "lucide-react";
import type { PackConfig, UploadedContent } from "@/types/heaven";
import { TIER_HEX } from "@/constants/tiers";

const PACK_ICONS: Record<string, React.ReactNode> = {
  vip: <Heart className="w-3.5 h-3.5" />,
  gold: <Star className="w-3.5 h-3.5" />,
  diamond: <Diamond className="w-3.5 h-3.5" />,
  platinum: <Crown className="w-3.5 h-3.5" />,
};

interface PackTilesProps {
  packs: PackConfig[];
  uploads: UploadedContent[];
  unlockedTier: string | null;
  isModelLoggedIn: boolean;
  tierIncludes: (unlocked: string, content: string) => boolean;
  onPackClick: (packId: string) => void;
  layout?: "horizontal" | "vertical" | "sidebar";
}

export function PackTiles({ packs, uploads, unlockedTier, isModelLoggedIn, tierIncludes, onPackClick, layout = "horizontal" }: PackTilesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activePacks = packs.filter(p => p.active);
  if (activePacks.length === 0) return null;

  const getPreviewImage = (tier: string) => {
    const items = uploads.filter(u => u.visibility !== "promo" && u.tier === tier && u.dataUrl);
    return items[0]?.dataUrl || null;
  };

  const hasAccess = (tier: string) => isModelLoggedIn || (unlockedTier ? tierIncludes(unlockedTier, tier) : false);

  // ── Sidebar layout (vertical single column for left/right of feed) ──
  if (layout === "sidebar") {
    return (
      <div className="space-y-2.5">
        {activePacks.map(pack => {
          const preview = getPreviewImage(pack.id);
          const unlocked = hasAccess(pack.id);
          const isExpanded = expandedId === pack.id;
          const hex = pack.color || TIER_HEX[pack.id] || "#E63329";

          return (
            <div key={pack.id} className="rounded-xl overflow-hidden transition-all duration-300"
              style={{ border: `1px solid ${hex}20`, background: "var(--surface)" }}>
              {/* Tile header — always visible */}
              <button onClick={() => setExpandedId(isExpanded ? null : pack.id)}
                className="w-full relative overflow-hidden cursor-pointer transition-all duration-300 group"
                style={{ border: "none", background: "none" }}>
                {/* Preview bg */}
                <div className="h-20 relative overflow-hidden">
                  {preview ? (
                    <img src={preview} alt="" draggable={false}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      style={{ filter: unlocked ? "brightness(0.5)" : "blur(14px) brightness(0.35)", transform: unlocked ? undefined : "scale(1.2)" }} />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hex}15, ${hex}05)` }} />
                  )}
                  {/* Glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ boxShadow: `inset 0 0 30px ${hex}25`, background: `radial-gradient(circle at center, ${hex}12, transparent 70%)` }} />
                  {/* Content overlay */}
                  <div className="absolute inset-0 flex items-center px-3 gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${hex}25`, color: hex }}>
                      {unlocked ? PACK_ICONS[pack.id] || <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-[11px] font-bold block truncate" style={{ color: "#fff" }}>{pack.name}</span>
                      {/* prix masqué — visible uniquement au paiement */}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-300"
                      style={{ color: "rgba(255,255,255,0.4)", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }} />
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              <div className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: isExpanded ? "200px" : "0", opacity: isExpanded ? 1 : 0 }}>
                <div className="p-3 space-y-1.5">
                  {pack.features?.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[9px] mt-0.5" style={{ color: hex }}>●</span>
                      <span className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{f}</span>
                    </div>
                  ))}
                  <button onClick={() => onPackClick(pack.id)}
                    className="w-full mt-2 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: `${hex}15`, color: hex, border: `1px solid ${hex}30` }}>
                    {unlocked ? "Voir le contenu" : "Débloquer"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Horizontal layout (collapsible tiles row above feed/gallery) ──
  return (
    <div className="mb-6">
      <div className={`grid gap-2 ${activePacks.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {activePacks.map(pack => {
          const preview = getPreviewImage(pack.id);
          const unlocked = hasAccess(pack.id);
          const isExpanded = expandedId === pack.id;
          const hex = pack.color || TIER_HEX[pack.id] || "#E63329";

          return (
            <div key={pack.id} className="rounded-xl overflow-hidden transition-all duration-300"
              style={{ border: `1px solid ${hex}20`, background: "var(--surface)" }}>
              {/* Mini tile */}
              <button onClick={() => setExpandedId(isExpanded ? null : pack.id)}
                className="w-full relative overflow-hidden cursor-pointer transition-all duration-300 group"
                style={{ border: "none", background: "none" }}>
                <div className="h-16 sm:h-20 relative overflow-hidden">
                  {preview ? (
                    <img src={preview} alt="" draggable={false}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      style={{ filter: unlocked ? "brightness(0.5)" : "blur(14px) brightness(0.35)", transform: unlocked ? undefined : "scale(1.2)" }} />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hex}15, ${hex}05)` }} />
                  )}
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ boxShadow: `inset 0 0 40px ${hex}30`, background: `radial-gradient(circle at center, ${hex}15, transparent 70%)` }} />
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${hex}25`, color: unlocked ? "#fff" : hex }}>
                      {unlocked ? PACK_ICONS[pack.id] || <Sparkles className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: "#fff" }}>{pack.name}</span>
                    {/* prix masqué — visible uniquement au paiement */}
                  </div>
                </div>
              </button>

              {/* Expanded — unfolds below */}
              <div className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: isExpanded ? "220px" : "0", opacity: isExpanded ? 1 : 0 }}>
                <div className="p-3 space-y-1.5">
                  {pack.features?.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[9px] mt-0.5" style={{ color: hex }}>●</span>
                      <span className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{f}</span>
                    </div>
                  ))}
                  {pack.badge && (
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold mt-1" style={{ background: `${hex}15`, color: hex }}>
                      {pack.badge}
                    </span>
                  )}
                  <button onClick={() => onPackClick(pack.id)}
                    className="w-full mt-2 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: `${hex}15`, color: hex, border: `1px solid ${hex}30` }}>
                    {unlocked ? "Voir le contenu" : "Débloquer maintenant"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

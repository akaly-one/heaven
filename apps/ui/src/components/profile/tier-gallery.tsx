"use client";

import { useState } from "react";
import {
  Lock, Camera, Eye, X, Check, Edit3, Plus,
  ToggleLeft, ToggleRight, Trash2,
} from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import type { Post, PackConfig, UploadedContent } from "@/types/heaven";

// ── Tier helpers (mirror page.tsx logic) ──
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

// ── Daily shuffle for gallery masonry ──
function dailyShuffle<T>(arr: T[]): T[] {
  const seed = new Date().toDateString();
  const shuffled = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
  for (let i = shuffled.length - 1; i > 0; i--) {
    h = (h * 16807 + 0) % 2147483647;
    const j = Math.abs(h) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
const MASONRY_ASPECTS = ["aspect-[3/4]", "aspect-square", "aspect-[4/3]", "aspect-[3/4]", "aspect-[2/3]"];
const getMasonryAspect = (i: number) => MASONRY_ASPECTS[i % MASONRY_ASPECTS.length];

export interface TierGalleryProps {
  galleryTier: string;
  posts: Post[];
  uploads: UploadedContent[];
  packs: PackConfig[];
  displayPacks: PackConfig[];
  editPacks: PackConfig[] | null;
  activePacks: PackConfig[];
  unlockedTier: string | null;
  isModelLoggedIn: boolean;
  isEditMode: boolean;
  subscriberUsername: string;
  hasSubscriberIdentity: boolean;
  modelId: string;
  setGalleryTier: (tier: string) => void;
  setFocusPack: (id: string | null) => void;
  setShowUnlock: (v: boolean) => void;
  setUploads: React.Dispatch<React.SetStateAction<UploadedContent[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setEditPacks: React.Dispatch<React.SetStateAction<PackConfig[] | null>>;
  setEditDirty: (v: boolean) => void;
}

export function TierGallery({
  galleryTier,
  posts,
  uploads,
  packs,
  displayPacks,
  editPacks,
  activePacks,
  unlockedTier,
  isModelLoggedIn,
  isEditMode,
  subscriberUsername,
  hasSubscriberIdentity,
  modelId,
  setGalleryTier,
  setFocusPack,
  setShowUnlock,
  setUploads,
  setPosts,
  setEditPacks,
  setEditDirty,
}: TierGalleryProps) {
  const [zoomedItem, setZoomedItem] = useState<string | null>(null);

  const allImagePosts = posts.filter(p => p.media_url);

  return (
    <div className="fade-up">

      {/* ── Pack editor (edit mode only) ── */}
      {isEditMode && (() => {
        const packIdx = displayPacks.findIndex(p => p.id === galleryTier);
        if (packIdx === -1) return null;
        const pack = displayPacks[packIdx];
        const tierHex = TIER_HEX[galleryTier] || "#E63329";

        const updatePack = (updates: Partial<PackConfig>) => {
          const newPacks = [...(editPacks ?? packs)];
          newPacks[packIdx] = { ...newPacks[packIdx], ...updates };
          setEditPacks(newPacks);
          setEditDirty(true);
        };

        return (
          <div className="mb-6 rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface)", border: `1.5px solid ${tierHex}25` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" style={{ color: tierHex }} />
                <span className="text-sm font-bold" style={{ color: tierHex }}>Éditer le pack</span>
              </div>
              <button onClick={() => updatePack({ active: !pack.active })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                style={{
                  background: pack.active ? `${tierHex}15` : "var(--bg3)",
                  color: pack.active ? tierHex : "var(--text-muted)",
                  border: `1px solid ${pack.active ? `${tierHex}30` : "var(--border)"}`,
                }}>
                {pack.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {pack.active ? "Actif" : "Désactivé"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Pack name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Nom du pack</label>
                <input value={pack.name} onChange={e => updatePack({ name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{ background: "var(--bg2)", color: "var(--text)", border: `1px solid var(--border)` }} />
              </div>
              {/* Price */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Prix (€)</label>
                <input type="number" value={pack.price} onChange={e => updatePack({ price: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none transition-all"
                  style={{ background: "var(--bg2)", color: tierHex, border: `1px solid var(--border)` }} />
              </div>
            </div>

            {/* Badge */}
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Badge (optionnel)</label>
              <input value={pack.badge || ""} onChange={e => updatePack({ badge: e.target.value || null })}
                placeholder="ex: Populaire, Nouveau..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--bg2)", color: "var(--text)", border: `1px solid var(--border)` }} />
            </div>

            {/* Features */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Avantages inclus</label>
              <div className="space-y-2">
                {(pack.features || []).map((f: string, j: number) => (
                  <div key={j} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: tierHex }} />
                    <input value={f} onChange={e => {
                      const newFeatures = [...(pack.features || [])];
                      newFeatures[j] = e.target.value;
                      updatePack({ features: newFeatures });
                    }}
                      className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
                    <button onClick={() => {
                      const newFeatures = (pack.features || []).filter((_: string, k: number) => k !== j);
                      updatePack({ features: newFeatures });
                    }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-all shrink-0"
                      style={{ background: "rgba(220,38,38,0.08)", color: "var(--danger)" }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button onClick={() => updatePack({ features: [...(pack.features || []), ""] })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ background: `${tierHex}08`, color: tierHex, border: `1px dashed ${tierHex}30` }}>
                  <Plus className="w-3 h-3" /> Ajouter un avantage
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Locked tier overlay — shows pack details + CTA ── */}
      {!isModelLoggedIn && !(unlockedTier && tierIncludes(unlockedTier, galleryTier)) && (() => {
        const pack = activePacks.find(p => p.id === galleryTier);
        const tierHex = TIER_HEX[galleryTier] || "#E63329";
        const tierSymbol = TIER_META[galleryTier]?.symbol || "";
        const tierPosts = allImagePosts.filter(p => normalizeTier(p.tier_required || "public") === galleryTier);
        const tierUploads = uploads.filter(u => normalizeTier(u.tier) === galleryTier && u.dataUrl);
        const previewImages = [...tierPosts.map(p => p.media_url!), ...tierUploads.map(u => u.dataUrl)].filter(Boolean).slice(0, 6);
        if (!pack) return null;

        const ctaLink = pack.stripe_link || pack.wise_url || null;
        const ctaAction = ctaLink
          ? () => window.open(ctaLink, "_blank")
          : () => { setFocusPack(galleryTier); setShowUnlock(true); };

        return (
          <div className="mb-6">
            {/* ── 2-column layout: blurred previews left + pack info right ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 rounded-2xl overflow-hidden p-4 md:p-6"
              style={{ background: "var(--surface)", border: `1px solid ${tierHex}15` }}>

              {/* Left — blurred preview grid */}
              <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "280px" }}>
                {previewImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1 h-full">
                    {previewImages.map((url, i) => (
                      <div key={i} className="aspect-[3/4] relative overflow-hidden rounded-lg">
                        <img src={url} alt="" className="w-full h-full object-cover"
                          style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-xl" style={{ background: `linear-gradient(135deg, ${tierHex}10, ${tierHex}05)`, minHeight: "280px" }} />
                )}
                {/* Center lock badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                    style={{ background: `${tierHex}25`, border: `1.5px solid ${tierHex}40` }}>
                    <span className="text-3xl">{tierSymbol}</span>
                  </div>
                </div>
              </div>

              {/* Right — pack info + features + CTA */}
              <div className="flex flex-col justify-center gap-4 py-2">
                {/* Title */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{tierSymbol}</span>
                    <h3 className="text-xl font-black" style={{ color: "var(--text)" }}>{pack.name}</h3>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {previewImages.length > 0
                      ? `${previewImages.length} contenu${previewImages.length > 1 ? "s" : ""} exclusif${previewImages.length > 1 ? "s" : ""}`
                      : "Contenu exclusif bientôt disponible"}
                  </p>
                </div>

                {/* Features list */}
                {pack.features && pack.features.length > 0 && (
                  <div className="space-y-2">
                    {pack.features.map((f, j) => (
                      <div key={j} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tierHex }} />
                        <span className="text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA button */}
                <button onClick={ctaAction}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{ background: tierHex, color: "#fff", border: "none", boxShadow: `0 4px 24px ${tierHex}35` }}>
                  Débloquer — {pack.price}€
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Unlocked content grid (posts + uploads) ── */}
      {(() => {
        const filteredPosts = allImagePosts.filter(p => normalizeTier(p.tier_required || "public") === galleryTier);
        const filteredUploads = uploads.filter(u => normalizeTier(u.tier) === galleryTier && u.dataUrl);

        const isLockedTier = !isModelLoggedIn && !(unlockedTier && tierIncludes(unlockedTier, galleryTier));
        if (isLockedTier) return null;

        const totalItems = filteredPosts.length + filteredUploads.length;
        if (totalItems === 0) return (
          <div className="text-center py-20 sm:py-24">
            <Camera className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas encore de shootings</p>
          </div>
        );

        const allMedia = dailyShuffle([
          ...filteredUploads.map(u => ({ id: u.id, url: u.dataUrl, type: "upload" as const, tier: galleryTier, mediaType: u.type })),
          ...filteredPosts.map(p => ({ id: p.id, url: p.media_url!, type: "post" as const, tier: normalizeTier(p.tier_required || "public"), mediaType: "image" as string })),
        ]);

        return (
          <>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-2">
              {allMedia.map((item, i) => {
                const aspect = getMasonryAspect(i);
                const tierHex = TIER_HEX[item.tier] || "var(--text-muted)";
                const unlocked = item.tier === "p0" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, item.tier));

                return (
                  <div key={`${item.type}-${item.id}`}
                    className={`break-inside-avoid mb-2 relative ${aspect} overflow-hidden rounded-xl cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                    style={{ animation: `slideUp 0.4s ease-out ${i * 0.03}s both` }}>
                    {unlocked ? (
                      <>
                        <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn} className="w-full h-full">
                          {item.mediaType === "video" ? (
                            <video src={item.url} className="w-full h-full object-cover" onClick={() => setZoomedItem(item.id)} data-clickable />
                          ) : (
                            <img src={item.url} alt="" className="w-full h-full object-cover"
                              onClick={() => setZoomedItem(item.id)} loading="lazy" data-clickable />
                          )}
                        </ContentProtection>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        {item.tier !== "p0" && (
                          <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)" }}>
                            {TIER_META[item.tier]?.label || item.tier.toUpperCase()}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full" onClick={() => { setGalleryTier(item.tier); }}>
                        {item.url && (
                          <img src={item.url} alt="" className="absolute inset-0 w-full h-full object-cover"
                            style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />
                        )}
                        <div className="absolute inset-0" style={{
                          background: `linear-gradient(160deg, ${tierHex}20 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)`,
                        }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <Lock className="w-5 h-5" style={{ color: tierHex, opacity: 0.8 }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tierHex }}>
                            {TIER_META[item.tier]?.label || item.tier}
                          </span>
                        </div>
                      </div>
                    )}
                    {isEditMode && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={async () => {
                          if (item.type === "upload") {
                            if (confirm("Supprimer ce contenu ?")) {
                              await fetch(`/api/uploads?model=${modelId}&id=${item.id}`, { method: "DELETE" });
                              setUploads(prev => prev.filter(u => u.id !== item.id));
                            }
                          } else {
                            if (confirm("Supprimer ce post ?")) {
                              await fetch(`/api/posts?id=${item.id}&model=${modelId}`, { method: "DELETE" });
                              setPosts(prev => prev.filter(p => p.id !== item.id));
                            }
                          }
                        }} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110" style={{ background: "rgba(220,38,38,0.8)" }}>
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zoom overlay (Google Photos style) */}
            {zoomedItem && (() => {
              const zItem = allMedia.find(x => x.id === zoomedItem);
              const zUrl = zItem?.url;
              if (!zUrl) return null;
              return (
                <div className="fixed inset-0 z-[55] flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.92)", animation: "fadeIn 0.2s ease" }}
                  onClick={() => setZoomedItem(null)}>
                  <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-10 cursor-pointer transition-all hover:scale-110 hover:bg-white/20"
                    style={{ background: "rgba(255,255,255,0.1)", border: "none" }}
                    onClick={() => setZoomedItem(null)}>
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                    <img src={zUrl} alt="" className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
                      style={{ animation: "scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
                      onClick={e => e.stopPropagation()} />
                  </ContentProtection>
                </div>
              );
            })()}
          </>
        );
      })()}

    </div>
  );
}

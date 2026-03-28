"use client";

import React from "react";
import {
  Lock, Image, Coins, Eye, Camera, Video, Play, X,
  Plus, Upload, Pencil, Trash2,
} from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import type { UploadedContent } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

interface GalleryTabProps {
  isEditMode: boolean;
  isModelLoggedIn: boolean;
  uploads: UploadedContent[];
  galleryItems: UploadedContent[];
  galleryTier: string;
  setGalleryTier: (v: string) => void;
  tierCounts: Record<string, number>;
  unlockedTier: string | null;
  purchasedItems: Set<string>;
  handleCreditPurchase: (item: UploadedContent) => void;
  setShowUnlock: (v: boolean) => void;
  subscriberUsername: string;
  hasSubscriberIdentity: boolean;
  editingUploadId: string | null;
  setEditingUploadId: (v: string | null) => void;
  editUploadData: Partial<UploadedContent>;
  setEditUploadData: (v: Partial<UploadedContent> | ((prev: Partial<UploadedContent>) => Partial<UploadedContent>)) => void;
  handleDeleteMedia: (id: string) => void;
  handleUpdateMedia: (id: string, updates: Partial<UploadedContent>) => void;
  handleAddMedia: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mediaInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  tierIncludes: (unlockedTier: string, contentTier: string) => boolean;
}

export function GalleryTab({
  isEditMode, isModelLoggedIn, uploads, galleryItems, galleryTier, setGalleryTier,
  tierCounts, unlockedTier, purchasedItems, handleCreditPurchase, setShowUnlock,
  subscriberUsername, hasSubscriberIdentity, editingUploadId, setEditingUploadId,
  editUploadData, setEditUploadData, handleDeleteMedia, handleUpdateMedia,
  handleAddMedia, mediaInputRef, uploading, tierIncludes,
}: GalleryTabProps) {
  return (
    <div className="fade-up">
      {/* Pack folders — Instagram-style tab bar */}
      {!isEditMode && (
        <div className="flex mb-4 -mx-4 px-4" style={{ borderBottom: "1px solid var(--border2)" }}>
          <button onClick={() => setGalleryTier("all")}
            className="flex-1 py-2.5 text-center text-[11px] font-semibold cursor-pointer transition-all relative"
            style={{ color: galleryTier === "all" ? "var(--text)" : "var(--text-muted)" }}>
            All
            {galleryTier === "all" && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
            )}
          </button>
          {(["vip", "gold", "diamond", "platinum"] as const).filter(k => tierCounts[k]).map(tier => {
            const hex = TIER_HEX[tier];
            return (
              <button key={tier} onClick={() => setGalleryTier(tier)}
                className="flex-1 py-2.5 text-center text-[11px] font-semibold cursor-pointer transition-all relative"
                style={{ color: galleryTier === tier ? hex : "var(--text-muted)" }}>
                {TIER_META[tier]?.symbol} {TIER_META[tier]?.label}
                {galleryTier === tier && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: hex }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Edit mode: header with add button */}
      {isEditMode && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{uploads.length} médias</p>
          <button onClick={() => mediaInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all hover:scale-[1.02]"
            style={{ background: "rgba(230,51,41,0.12)", color: "var(--accent)", border: "1px solid rgba(230,51,41,0.25)" }}
            disabled={uploading}>
            {uploading ? (
              <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Ajouter
          </button>
          <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddMedia} />
        </div>
      )}

      {(isEditMode ? uploads : galleryItems).length === 0 ? (
        isEditMode ? (
          <div className="text-center py-8">
            <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Utilisez le bouton ci-dessus pour ajouter des medias</p>
          </div>
        ) : (
          <EmptyState icon={Image} text="No content available" />
        )
      ) : (
        <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
          {(isEditMode ? uploads : galleryItems).map((item, i) => {
            const hex = TIER_HEX[item.tier] || "#64748B";
            const isCreditItem = (item.tokenPrice || 0) > 0;
            const isCreditUnlocked = purchasedItems.has(item.id);
            const isUnlocked = item.visibility === "promo" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, item.tier)) || isCreditUnlocked;
            return (
              <div key={item.id} className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg"
                style={{ animationDelay: `${i * 20}ms` }}>
                {isEditMode || isUnlocked ? (
                  <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn} className="w-full h-full">
                    <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </ContentProtection>
                ) : isCreditItem ? (
                  <div className="w-full h-full flex items-center justify-center relative cursor-pointer"
                    onClick={() => handleCreditPurchase(item)}
                    style={{ background: `${hex}08` }}>
                    <img src={item.dataUrl} alt="" className="absolute inset-0 w-full h-full object-cover content-locked" />
                    <div className="relative text-center z-10">
                      <Coins className="w-5 h-5 mx-auto mb-1" style={{ color: "var(--gold)" }} />
                      <span className="text-[10px] font-bold block" style={{ color: "var(--gold)" }}>
                        {item.tokenPrice}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--gold2)" }}>
                        crédits
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center relative cursor-pointer" onClick={() => setShowUnlock(true)} style={{ background: `${hex}08` }}>
                    <div className="absolute inset-0 content-locked" style={{ background: `linear-gradient(135deg, ${hex}12, rgba(0,0,0,0.25))` }} />
                    <div className="relative text-center z-10">
                      <Lock className="w-4 h-4 mx-auto mb-0.5" style={{ color: hex }} />
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: hex }}>
                        {TIER_META[item.tier]?.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Edit mode overlay: edit + delete */}
                {isEditMode ? (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                    <button onClick={() => { setEditingUploadId(item.id); setEditUploadData({ tier: item.tier, label: item.label, visibility: item.visibility, tokenPrice: item.tokenPrice }); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                      <Pencil className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button onClick={() => handleDeleteMedia(item.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(239,68,68,0.4)", backdropFilter: "blur(4px)" }}>
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    {item.type === "video" ? <Play className="w-5 h-5 text-white" /> :
                     item.type === "reel" ? <Camera className="w-4 h-4 text-white" /> :
                     <Eye className="w-4 h-4 text-white" />}
                  </div>
                )}

                {/* Tier badge */}
                {!isEditMode && isCreditItem && !isCreditUnlocked && !isModelLoggedIn && (
                  <div className="absolute top-1.5 right-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(230,51,41,0.9)", color: "#000" }}>
                      {item.tokenPrice} 💰
                    </span>
                  </div>
                )}

                {isEditMode && (
                  <div className="absolute top-1.5 left-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `${hex}CC`, color: "#fff" }}>
                      {TIER_META[item.tier]?.label || item.tier}
                    </span>
                  </div>
                )}

                {!isEditMode && item.type !== "photo" && (
                  <div className="absolute top-1.5 right-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                      {item.type === "video" ? <Video className="w-2.5 h-2.5 inline" /> : "REEL"}
                    </span>
                  </div>
                )}

                {!isEditMode && item.isNew && (
                  <div className="absolute top-1.5 left-1.5">
                    <span className="badge badge-success text-[10px]">NEW</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Upload Sheet ── */}
      {isEditMode && editingUploadId && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => { setEditingUploadId(null); setEditUploadData({}); }}>
          <div className="w-full max-w-sm rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
            </div>
            <div className="p-5 space-y-4">
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Modifier le média</h3>

              {/* Label */}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Label</label>
                <input value={editUploadData.label || ""} onChange={e => setEditUploadData(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
              </div>

              {/* Tier */}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Tier</label>
                <div className="flex gap-1.5">
                  {Object.entries(TIER_HEX).map(([tier, hex]) => (
                    <button key={tier} onClick={() => setEditUploadData(prev => ({ ...prev, tier: tier as UploadedContent["tier"] }))}
                      className="flex-1 py-2 rounded-lg text-[10px] font-semibold cursor-pointer transition-all"
                      style={{
                        background: editUploadData.tier === tier ? `${hex}20` : "rgba(255,255,255,0.03)",
                        color: editUploadData.tier === tier ? hex : "var(--text-muted)",
                        border: `1px solid ${editUploadData.tier === tier ? `${hex}40` : "var(--border2)"}`,
                      }}>
                      {TIER_META[tier]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Visibilité</label>
                <div className="flex gap-1.5">
                  {(["pack", "promo", "credits"] as const).map(vis => (
                    <button key={vis} onClick={() => setEditUploadData(prev => ({ ...prev, visibility: vis === "credits" ? "pack" : vis, tokenPrice: vis === "credits" ? (prev.tokenPrice || 5) : 0 }))}
                      className="flex-1 py-2 rounded-lg text-[10px] font-semibold cursor-pointer transition-all"
                      style={{
                        background: (vis === "credits" ? (editUploadData.tokenPrice || 0) > 0 : editUploadData.visibility === vis && !(editUploadData.tokenPrice || 0)) ? "rgba(230,51,41,0.12)" : "rgba(255,255,255,0.03)",
                        color: (vis === "credits" ? (editUploadData.tokenPrice || 0) > 0 : editUploadData.visibility === vis && !(editUploadData.tokenPrice || 0)) ? "var(--accent)" : "var(--text-muted)",
                        border: `1px solid ${(vis === "credits" ? (editUploadData.tokenPrice || 0) > 0 : editUploadData.visibility === vis && !(editUploadData.tokenPrice || 0)) ? "rgba(230,51,41,0.25)" : "var(--border2)"}`,
                      }}>
                      {vis === "pack" ? "Privé" : vis === "promo" ? "Public" : "Crédits"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit price */}
              {(editUploadData.tokenPrice || 0) > 0 && (
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Prix crédits</label>
                  <div className="flex gap-1.5">
                    {[3, 5, 10, 20, 50].map(p => (
                      <button key={p} onClick={() => setEditUploadData(prev => ({ ...prev, tokenPrice: p }))}
                        className="flex-1 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                        style={{
                          background: editUploadData.tokenPrice === p ? "rgba(230,51,41,0.15)" : "rgba(255,255,255,0.03)",
                          color: editUploadData.tokenPrice === p ? "var(--gold)" : "var(--text-muted)",
                          border: `1px solid ${editUploadData.tokenPrice === p ? "rgba(230,51,41,0.3)" : "var(--border2)"}`,
                        }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setEditingUploadId(null); setEditUploadData({}); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                  Annuler
                </button>
                <button onClick={() => handleUpdateMedia(editingUploadId, editUploadData)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ background: "var(--accent)", color: "#000" }}>
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{text}</p>
    </div>
  );
}

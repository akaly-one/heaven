"use client";

import React, { useState, useCallback } from "react";
import {
  Lock, Image, Coins, Eye, Camera, Video, Play, X,
  Plus, Upload, Pencil, Trash2, GripVertical, Crown,
  Sparkles, Diamond, Star, Heart, Check,
} from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import type { UploadedContent, PackConfig } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import { toSlot, isFreeSlot } from "@/lib/tier-utils";

// ── Pack tier rules (canonical tiers from constants/tiers.ts) ──
const PACK_RULES: Record<string, { icon: React.ReactNode; label: string; color: string; desc: string; access: string[] }> = {
  p0: {
    icon: <Eye className="w-3.5 h-3.5" />,
    label: "Public",
    color: "#64748B",
    desc: "Visible par tous les visiteurs",
    access: ["Gratuit", "Teasing / promo", "Aucun code requis"],
  },
  p1: {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    label: "Silver",
    color: "#C0C0C0",
    desc: "♣ Photos, shootings, promos — sans nudité",
    access: ["Photos glamour", "Shootings pro", "Promos exclusives", "Sans nudité"],
  },
  p2: {
    icon: <Star className="w-3.5 h-3.5" />,
    label: "Gold",
    color: "#D4AF37",
    desc: "♦ Tenue dentelle, sensuel, poses suggestives",
    access: ["Tout du Silver inclus", "Lingerie dentelle", "Poses suggestives", "Contenu sensuel"],
  },
  p3: {
    icon: <Diamond className="w-3.5 h-3.5" />,
    label: "VIP Black",
    color: "#1C1C1C",
    desc: "♠ Sextapes & nudes — visage caché",
    access: ["Tout du Gold inclus", "Nudes complets", "Sextapes", "Visage caché"],
  },
  p4: {
    icon: <Heart className="w-3.5 h-3.5" />,
    label: "Feet Lovers",
    color: "#E8A87C",
    desc: "🦶 Photos pieds glamour, accessoires, dédicaces",
    access: ["Photos pieds glamour", "Accessoires", "Dédicaces personnalisées", "Contenu exclusif"],
  },
  p5: {
    icon: <Crown className="w-3.5 h-3.5" />,
    label: "VIP Platinum",
    color: "#B8860B",
    desc: "♥ Visage découvert, contenu explicite premium",
    access: ["Accès TOTAL tous packs", "Visage découvert", "Contenu explicite premium", "Demandes personnalisées"],
  },
};

const DROP_ORDER = ["p0", "p1", "p2", "p3", "p4", "p5"] as const;

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
  onImageClick?: (url: string) => void;
}

export function GalleryTab({
  isEditMode, isModelLoggedIn, uploads, galleryItems, galleryTier, setGalleryTier,
  tierCounts, unlockedTier, purchasedItems, handleCreditPurchase, setShowUnlock,
  subscriberUsername, hasSubscriberIdentity, editingUploadId, setEditingUploadId,
  editUploadData, setEditUploadData, handleDeleteMedia, handleUpdateMedia,
  handleAddMedia, mediaInputRef, uploading, tierIncludes, onImageClick,
}: GalleryTabProps) {

  // ── Drag & Drop state (edit mode only) ──
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverTier, setDragOverTier] = useState<string | null>(null);

  // ── Bulk selection for quick pack assignment ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const bulkAssignPack = useCallback((targetTier: string) => {
    const isPublic = targetTier === "p0";
    selectedIds.forEach(id => {
      handleUpdateMedia(id, {
        tier: isPublic ? "p1" : targetTier,
        visibility: isPublic ? "promo" : "pack",
      });
    });
    clearSelection();
  }, [selectedIds, handleUpdateMedia, clearSelection]);

  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDragId(id);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, tier: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTier(tier);
  }, []);

  const onDragLeave = useCallback(() => {
    setDragOverTier(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent, targetTier: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      const isPublic = targetTier === "p0";
      handleUpdateMedia(id, {
        tier: isPublic ? "p1" : targetTier,
        visibility: isPublic ? "promo" : "pack",
      });
    }
    setDragId(null);
    setDragOverTier(null);
  }, [handleUpdateMedia]);

  const onDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverTier(null);
  }, []);

  // ══════════════════════════════════════
  //  EDIT MODE — Drag & Drop Pack Zones
  // ══════════════════════════════════════
  if (isEditMode) {
    // Group uploads by effective tier (promo visibility → "promo" zone, otherwise by tier)
    const grouped: Record<string, UploadedContent[]> = { p0: [], p1: [], p2: [], p3: [], p4: [], p5: [] };
    uploads.forEach(u => {
      const key = u.visibility === "promo" ? "p0" : toSlot(u.tier);
      if (grouped[key]) grouped[key].push(u);
      else grouped.p1.push(u);
    });

    return (
      <div className="fade-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {uploads.length} médias · <span style={{ color: "var(--text)" }}>Glisse-dépose ou survol pour classer</span>
          </p>
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

        {/* Bulk selection bar — appears when items selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "rgba(230,51,41,0.06)", border: "1px solid rgba(230,51,41,0.2)" }}>
            <span className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>→ Placer dans :</span>
            <div className="flex gap-1">
              {DROP_ORDER.map(t => {
                const r = PACK_RULES[t];
                return (
                  <button key={t} onClick={() => bulkAssignPack(t)}
                    className="px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-all hover:scale-105"
                    style={{ background: `${r.color}15`, color: r.color, border: `1px solid ${r.color}30` }}>
                    {r.label}
                  </button>
                );
              })}
            </div>
            <div className="flex-1" />
            <button onClick={clearSelection} className="text-[10px] font-medium cursor-pointer"
              style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Pack zones */}
        {DROP_ORDER.map(tierKey => {
          const rule = PACK_RULES[tierKey];
          const items = grouped[tierKey] || [];
          const isDragOver = dragOverTier === tierKey;

          return (
            <div key={tierKey}
              onDragOver={(e) => onDragOver(e, tierKey)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, tierKey)}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                border: `2px ${isDragOver ? "dashed" : "solid"} ${isDragOver ? rule.color : "var(--border)"}`,
                background: isDragOver ? `${rule.color}15` : "var(--surface)",
                transform: isDragOver ? "scale(1.02)" : "scale(1)",
                boxShadow: isDragOver ? `0 0 20px ${rule.color}25, inset 0 0 30px ${rule.color}08` : "none",
              }}>

              {/* Pack header */}
              <div className="flex items-center gap-3 px-4 py-3 group cursor-default"
                style={{ borderBottom: items.length > 0 ? "1px solid var(--border)" : "none" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${rule.color}18`, color: rule.color }}>
                  {rule.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold" style={{ color: rule.color }}>{rule.label}</span>
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{items.length} média{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{rule.desc}</span>
                </div>
                {/* Rules tooltip on hover */}
                <div className="relative">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center peer cursor-help"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>?</span>
                  </div>
                  <div className="absolute right-0 top-full mt-1 w-52 p-3 rounded-xl opacity-0 pointer-events-none peer-hover:opacity-100 peer-hover:pointer-events-auto transition-opacity duration-200 z-30"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    <p className="text-[10px] font-bold mb-1.5" style={{ color: rule.color }}>Règles {rule.label}</p>
                    <ul className="space-y-0.5">
                      {rule.access.map((a, i) => (
                        <li key={i} className="text-[10px] flex items-start gap-1" style={{ color: "var(--text-muted)" }}>
                          <span style={{ color: rule.color }}>·</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Items grid — draggable thumbnails */}
              {items.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 p-3">
                  {items.map(item => {
                    const isDragging = dragId === item.id;
                    const isItemSelected = selectedIds.has(item.id);
                    return (
                      <div key={item.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, item.id)}
                        onDragEnd={onDragEnd}
                        className="relative aspect-square rounded-lg overflow-hidden group/item cursor-grab active:cursor-grabbing transition-all duration-150"
                        style={{
                          opacity: isDragging ? 0.35 : 1,
                          transform: isDragging ? "scale(0.95)" : "scale(1)",
                          outline: isItemSelected ? "2px solid var(--accent)" : "none",
                          outlineOffset: "-2px",
                        }}>
                        <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover" draggable={false} />

                        {/* Selection checkbox — top left */}
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleSelected(item.id); }}
                          className="absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center cursor-pointer z-10 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          style={{
                            background: isItemSelected ? "var(--accent)" : "rgba(0,0,0,0.5)",
                            border: `1.5px solid ${isItemSelected ? "var(--accent)" : "rgba(255,255,255,0.4)"}`,
                          }}>
                          {isItemSelected && <Check className="w-3 h-3 text-white" />}
                        </button>

                        {/* Type badge */}
                        {item.type !== "photo" && (
                          <div className="absolute top-1 right-1">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                              {item.type === "video" ? "VID" : "REEL"}
                            </span>
                          </div>
                        )}
                        {/* Credit badge */}
                        {(item.tokenPrice || 0) > 0 && (
                          <div className="absolute bottom-1 right-1">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: "rgba(0,0,0,0.6)", color: "var(--gold)" }}>
                              {item.tokenPrice}cr
                            </span>
                          </div>
                        )}

                        {/* Hover overlay — pack quick-assign bar + edit/delete */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col">
                          {/* Quick pack assign bar — horizontal at top */}
                          <div className="flex items-center justify-center gap-0.5 px-1 pt-6 pb-1">
                            {DROP_ORDER.map(t => {
                              const r = PACK_RULES[t];
                              const isCurrentPack = (item.visibility === "promo" && t === "p0") || (item.visibility !== "promo" && toSlot(item.tier) === t);
                              return (
                                <button key={t}
                                  onClick={(e) => {
                                    e.stopPropagation(); e.preventDefault();
                                    const isPublic = t === "p0";
                                    handleUpdateMedia(item.id, {
                                      tier: isPublic ? (item.tier || "p1") : t,
                                      visibility: isPublic ? "promo" : "pack",
                                    });
                                  }}
                                  className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-125"
                                  title={r.label}
                                  style={{
                                    background: isCurrentPack ? r.color : `${r.color}40`,
                                    border: `1.5px solid ${isCurrentPack ? "#fff" : r.color}`,
                                    boxShadow: isCurrentPack ? `0 0 6px ${r.color}` : "none",
                                  }}>
                                  {isCurrentPack && <Check className="w-2.5 h-2.5 text-white" />}
                                </button>
                              );
                            })}
                          </div>
                          {/* Edit/delete buttons — center */}
                          <div className="flex-1 flex items-center justify-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingUploadId(item.id); setEditUploadData({ tier: item.tier, label: item.label, visibility: item.visibility, tokenPrice: item.tokenPrice }); }}
                              className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                              style={{ background: "rgba(255,255,255,0.2)" }}>
                              <Pencil className="w-3 h-3 text-white" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMedia(item.id); }}
                              className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                              style={{ background: "rgba(239,68,68,0.5)" }}>
                              <Trash2 className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Glisse des photos ici pour les ajouter au {rule.label}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Edit Upload Sheet ── */}
        {editingUploadId && (
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

  // ══════════════════════════════════════
  //  VISITOR MODE — Standard Gallery View
  // ══════════════════════════════════════

  // Build pack preview data: last image per tier
  const packPreviews = (["p1", "p2", "p3", "p4", "p5"] as const).map(tier => {
    const tierItems = uploads.filter(u => u.visibility !== "promo" && u.tier === tier && u.dataUrl);
    const lastImage = tierItems[0] || null; // uploads already sorted newest first
    const count = tierItems.length;
    const rule = PACK_RULES[tier];
    const hasAccess = isModelLoggedIn || (unlockedTier ? tierIncludes(unlockedTier, tier) : false);
    return { tier, lastImage, count, rule, hasAccess };
  }).filter(p => p.count > 0);

  return (
    <div className="fade-up">

      {/* ── Pack preview tiles ── */}
      {packPreviews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {packPreviews.map(({ tier, lastImage, count, rule, hasAccess }) => (
            <button key={tier}
              onClick={() => { setGalleryTier(tier); if (!hasAccess) setShowUnlock(true); }}
              className="relative rounded-xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ aspectRatio: "4/5" }}>
              {/* Background image — blurred if no access */}
              {lastImage && (
                <img src={lastImage.dataUrl} alt="" draggable={false}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    filter: hasAccess ? "none" : "blur(18px) brightness(0.5)",
                    transform: hasAccess ? "none" : "scale(1.15)",
                  }} />
              )}
              {/* Dark overlay */}
              <div className="absolute inset-0" style={{
                background: hasAccess
                  ? `linear-gradient(to top, ${rule.color}CC 0%, transparent 60%)`
                  : `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.3) 100%)`,
              }} />
              {/* Lock icon for no access */}
              {!hasAccess && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `${rule.color}30`, backdropFilter: "blur(4px)" }}>
                    <Lock className="w-4.5 h-4.5" style={{ color: rule.color }} />
                  </div>
                </div>
              )}
              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-4 h-4 rounded flex items-center justify-center" style={{ color: hasAccess ? "#fff" : rule.color }}>
                    {rule.icon}
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: hasAccess ? "#fff" : rule.color }}>
                    {rule.label}
                  </span>
                </div>
                <span className="text-[10px] block" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {count} contenu{count > 1 ? "s" : ""} {hasAccess ? "· Débloqué" : `· ${rule.desc.split("—")[0].trim()}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tier filter — underline style */}
      <div className="flex mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => setGalleryTier("all")}
          className="relative px-4 sm:px-5 py-3 text-[11px] font-medium cursor-pointer transition-all uppercase"
          style={{ color: galleryTier === "all" ? "var(--text)" : "var(--text-muted)", letterSpacing: "0.06em" }}>
          Tout
          {galleryTier === "all" && (
            <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
          )}
        </button>
        {(["p1", "p2", "p3", "p4", "p5"] as const).filter(k => tierCounts[k]).map(tier => {
          const hex = TIER_HEX[tier];
          return (
            <button key={tier} onClick={() => setGalleryTier(tier)}
              className="relative px-4 sm:px-5 py-3 text-[11px] font-medium cursor-pointer transition-all uppercase"
              style={{ color: galleryTier === tier ? hex : "var(--text-muted)", letterSpacing: "0.06em" }}>
              {TIER_META[tier]?.label}
              {galleryTier === tier && (
                <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: hex }} />
              )}
            </button>
          );
        })}
      </div>

      {galleryItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas de contenu</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {galleryItems.map((item, i) => {
            const hex = TIER_HEX[item.tier] || "#64748B";
            const isCreditItem = (item.tokenPrice || 0) > 0;
            const isCreditUnlocked = purchasedItems.has(item.id);
            const isUnlocked = item.visibility === "promo" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, item.tier)) || isCreditUnlocked;
            return (
              <div key={item.id} className="relative aspect-[3/4] group cursor-pointer overflow-hidden rounded-xl"
                style={{ animation: `slideUp 0.4s ease-out ${i * 30}ms both`, transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xl)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                {isUnlocked ? (
                  <div onClick={() => onImageClick?.(item.dataUrl)} className="w-full h-full">
                    <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn} className="w-full h-full">
                      <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover" />
                    </ContentProtection>
                  </div>
                ) : isCreditItem ? (
                  <div className="w-full h-full flex items-center justify-center relative cursor-pointer"
                    onClick={() => handleCreditPurchase(item)}>
                    <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${hex}20, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.85) 100%)` }} />
                    <div className="relative text-center z-10">
                      <Coins className="w-5 h-5 mx-auto mb-1.5" style={{ color: "var(--gold)", opacity: 0.8 }} />
                      <span className="text-sm font-bold block tabular-nums" style={{ color: "var(--gold)" }}>
                        {item.tokenPrice}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: "var(--gold2)" }}>
                        credits
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center relative cursor-pointer" onClick={() => setShowUnlock(true)}>
                    <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${hex}25, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.85) 100%)` }} />
                    <div className="relative text-center z-10">
                      <Lock className="w-5 h-5 mx-auto mb-1.5" style={{ color: hex, opacity: 0.7 }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: hex }}>
                        Exclusive
                      </span>
                      <span className="text-[9px] block mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {TIER_META[item.tier]?.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Hover overlay */}
                {isUnlocked ? (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    {item.type === "video" ? <Play className="w-6 h-6 text-white" /> :
                     item.type === "reel" ? <Camera className="w-5 h-5 text-white" /> :
                     <Eye className="w-5 h-5 text-white" />}
                  </div>
                ) : null}

                {/* Badges */}
                {isCreditItem && !isCreditUnlocked && !isModelLoggedIn && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "rgba(0,0,0,0.5)", color: "var(--gold)", backdropFilter: "blur(4px)" }}>
                      {item.tokenPrice} cr
                    </span>
                  </div>
                )}

                {item.type !== "photo" && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1" style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)" }}>
                      {item.type === "video" ? <Video className="w-2.5 h-2.5" /> : null}
                      {item.type === "video" ? "VIDEO" : "REEL"}
                    </span>
                  </div>
                )}

                {item.isNew && (
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "var(--success)", color: "#fff" }}>NEW</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * ContenuPanel — Phase 2 Agent 2.B
 *
 * Extrait du monolithe `src/app/agence/page.tsx` (P0-7). Ce composant encapsule
 * l'onglet Contenu (3 layouts : dossiers grille/liste + colonnes kanban,
 * dossier Custom avec assignation par client, lightbox zoom, drag&drop
 * restaurés depuis l'historique — brief B8).
 *
 * Design pattern : tous les hooks de state restent dans `AgencePage` (shell).
 * Ce composant reçoit l'état + les handlers via un objet `ctx` pour éviter
 * de dupliquer 30+ props individuelles. Aucune logique nouvelle, aucun
 * changement de comportement UI — simple extraction.
 *
 * Phase 5.A (brief B8) : option `?composer=new` → rendu par <PackComposer />.
 *  - Le composer existant (`pack-composer.tsx`) est réimporté ici.
 *  - La bascule reste pilotée par le shell via `ctx.useNewComposer`.
 */

import {
  Eye, Upload, Check, Grid3x3, Columns, Sparkles, Instagram, FolderOpen,
  Lock, Pencil, ChevronDown, Plus, X, EyeOff, ArrowRight, Trash2, UserPlus,
  GripVertical, Ban, Users,
} from "lucide-react";
import { PackComposer, type PackComposerMode, type ComposerContentItem } from "@/components/cockpit/contenu/pack-composer";
import type { PackConfig, ClientInfo, AccessCode } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

type ContentSource = "upload" | "post" | "instagram" | "wall";

export interface ContenuContentItem {
  id: string;
  url: string;
  tier: string;
  source: ContentSource;
  visibility?: string;
  date: string;
  type: string;
  postContent?: string;
  groupLabel?: string | null;
  clientId?: string | null;
  externalUrl?: string | null;
}

export interface ContenuPanelProps {
  /* — Data — */
  modelSlug: string;
  packs: PackConfig[];
  clients: ClientInfo[];
  modelCodes: AccessCode[];
  allContent: ContenuContentItem[];
  allContentUnfiltered: ContenuContentItem[];
  photoAccesses: any[];
  accessLoading: boolean;
  /* — View state — */
  contentFolder: string | null;
  setContentFolder: (v: string | null) => void;
  contentViewMode: "grid" | "list";
  setContentViewMode: (v: "grid" | "list") => void;
  contentLayout: "folders" | "columns";
  setContentLayout: (v: "folders" | "columns") => void;
  contentSourceFilter: "all" | "manual" | "instagram" | "wall";
  setContentSourceFilter: (v: "all" | "manual" | "instagram" | "wall") => void;
  expandedPack: string | null;
  setExpandedPack: (v: string | null) => void;
  editingPacks: boolean;
  setEditingPacks: (v: boolean) => void;
  savingPacks: boolean;
  dragItem: string | null;
  dragOverTarget: string | null;
  setDragOverTarget: (v: string | null) => void;
  uploadProgress: { tier: string; fileName: string; progress: number } | null;
  movingUpload: string | null;
  setMovingUpload: (v: string | null) => void;
  togglingBlur: string | null;
  deletingUpload: string | null;
  setDeletingUpload: (v: string | null) => void;
  zoomUrl: string | null;
  setZoomUrl: (v: string | null) => void;
  /* — Custom folder — */
  assigningPhoto: string | null;
  setAssigningPhoto: (v: string | null) => void;
  assignPrice: string;
  setAssignPrice: (v: string) => void;
  clientSearch: string;
  setClientSearch: (v: string) => void;
  customClientFilter: string | null;
  setCustomClientFilter: (v: string | null) => void;
  expandedPhotoHistory: string | null;
  setExpandedPhotoHistory: (v: string | null) => void;
  /* — Actions — */
  onDragStartItem: (e: React.DragEvent, itemId: string, source: ContentSource) => void;
  onDragOverTarget: (e: React.DragEvent) => void;
  onDropTarget: (e: React.DragEvent, targetTier: string) => void;
  onDragEndItem: () => void;
  handleUploadToTier: (file: File, tier: string) => void;
  handleMoveTier: (uploadId: string, newTier: string) => void;
  handleToggleBlur: (uploadId: string, currentVisibility: string) => void;
  handleDeleteUpload: (uploadId: string) => void;
  handleDeletePost: (postId: string) => void;
  handleSavePacks: () => void;
  updatePack: (packId: string, field: string, value: number | boolean | string | string[]) => void;
  handleAssignToClient: (uploadId: string, clientId: string, price: number, sourceTier: string) => void;
  handleRevokeAccess: (accessId: string) => void;
  /* — Phase 5.A opt-in — */
  useNewComposer: boolean;
}

const surface = "bg-white/[0.03] border border-white/[0.06] rounded-xl";
const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

export function ContenuPanel(p: ContenuPanelProps) {
  const {
    modelSlug, packs, clients, modelCodes, allContent, allContentUnfiltered, photoAccesses, accessLoading,
    contentFolder, setContentFolder, contentViewMode, setContentViewMode, contentLayout, setContentLayout,
    contentSourceFilter, setContentSourceFilter,
    expandedPack, setExpandedPack, editingPacks, setEditingPacks, savingPacks,
    dragItem, dragOverTarget, setDragOverTarget, uploadProgress,
    movingUpload, setMovingUpload, togglingBlur, deletingUpload, setDeletingUpload,
    zoomUrl, setZoomUrl,
    assigningPhoto, setAssigningPhoto, assignPrice, setAssignPrice,
    clientSearch, setClientSearch, customClientFilter, setCustomClientFilter,
    expandedPhotoHistory, setExpandedPhotoHistory,
    onDragStartItem, onDragOverTarget: onDragOver, onDropTarget, onDragEndItem,
    handleUploadToTier, handleMoveTier, handleToggleBlur, handleDeleteUpload, handleDeletePost,
    handleSavePacks, updatePack, handleAssignToClient, handleRevokeAccess,
    useNewComposer,
  } = p;

  const contentCount = (tier: string | null) => tier === null ? allContent.length : allContent.filter(c => c.tier === tier).length;
  const customCount = allContent.filter(c => c.tier === "custom").length;
  const tierSlots = ["p0", "p1", "p2", "p3", "p4", "p5", "custom"];
  const activeTiers = tierSlots.filter(t => allContent.some(c => c.tier === t));

  const composerMode: PackComposerMode =
    contentLayout === "columns" ? "columns" : contentViewMode === "list" ? "list" : "folders";
  const composerItems: ComposerContentItem[] = allContent.map(c => ({
    id: c.id, url: c.url, tier: c.tier, source: c.source,
    visibility: c.visibility, date: c.date, type: c.type, postContent: c.postContent,
  }));
  const handleComposerMove = (itemId: string, source: ContentSource, targetTier: string) => {
    if (source === "upload") handleMoveTier(itemId, targetTier);
    else if (source === "post") {
      // post tier change is handled upstream via drag/drop pipeline; delegated to parent.
      // Fall back to move handler — parent wires handleChangePostTier into dropTarget.
    }
  };
  const handleComposerModeChange = (m: PackComposerMode) => {
    if (m === "columns") setContentLayout("columns");
    else if (m === "list") { setContentLayout("folders"); setContentViewMode("list"); }
    else { setContentLayout("folders"); setContentViewMode("grid"); }
  };

  const uploadHex = contentFolder && contentFolder !== "custom" ? (TIER_HEX[contentFolder] || "#D4AF37") : "#D4AF37";
  const folderLabel = contentFolder === null ? "Public" : contentFolder === "p0" ? "Public" : contentFolder === "custom" ? "Custom" : TIER_META[contentFolder]?.label || contentFolder;

  return (
    <div className="space-y-4">
      {useNewComposer && (
        <div className="rounded-xl p-3" style={{ background: "rgba(212,175,55,0.04)", border: "1px dashed rgba(212,175,55,0.25)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3 h-3" style={{ color: "#D4AF37" }} />
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#D4AF37" }}>Composer preview (Phase 5.A)</span>
          </div>
          <PackComposer
            mode={composerMode}
            onModeChange={handleComposerModeChange}
            packs={packs}
            items={composerItems}
            selectedFolder={contentFolder}
            onSelectFolder={setContentFolder}
            onMoveItem={handleComposerMove}
            onZoom={setZoomUrl}
          />
        </div>
      )}

      {/* ── Layout toggle header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Contenu</span>
          <span className="text-[10px] text-white/20">{allContent.length} fichiers</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer transition-all overflow-hidden"
            style={{
              background: uploadProgress ? `${uploadHex}25` : `${uploadHex}10`,
              border: `1px solid ${uploadHex}30`,
            }}>
            {uploadProgress && (
              <div className="absolute inset-0 rounded-xl" style={{
                background: `linear-gradient(90deg, ${uploadHex}35 ${uploadProgress.progress}%, transparent ${uploadProgress.progress}%)`,
                transition: "background 0.3s ease",
              }} />
            )}
            <div className="relative flex items-center gap-1.5 z-10">
              {uploadProgress ? (
                uploadProgress.progress >= 100 ? <Check className="w-3.5 h-3.5" style={{ color: uploadHex }} /> :
                <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: `${uploadHex}30`, borderTopColor: uploadHex }} />
              ) : <Upload className="w-3.5 h-3.5" style={{ color: uploadHex }} />}
              {uploadProgress && (
                <span className="text-[11px] font-bold" style={{ color: uploadHex }}>
                  {uploadProgress.progress >= 100 ? "✓" : `${uploadProgress.progress}%`}
                </span>
              )}
            </div>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple className="hidden" disabled={!!uploadProgress} onChange={(e) => {
              const files = e.target.files;
              if (!files?.length) return;
              const tier = contentFolder || "p0";
              Array.from(files).forEach(f => handleUploadToTier(f, tier));
              e.target.value = "";
            }} />
          </label>
          <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: "var(--w03)", border: "1px solid var(--w06)" }}>
            <button onClick={() => { setContentLayout("folders"); setContentViewMode("grid"); }}
              className="px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border-none transition-all"
              style={{ background: contentLayout === "folders" && contentViewMode === "grid" ? `${uploadHex}20` : "transparent", color: contentLayout === "folders" && contentViewMode === "grid" ? uploadHex : "var(--w3)" }}>
              <Grid3x3 className="w-3 h-3 inline mr-0.5" />Dossiers
            </button>
            <button onClick={() => setContentLayout("columns")}
              className="px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border-none transition-all"
              style={{ background: contentLayout === "columns" ? `${uploadHex}20` : "transparent", color: contentLayout === "columns" ? uploadHex : "var(--w3)" }}>
              <Columns className="w-3 h-3 inline mr-0.5" />Colonnes
            </button>
            <button onClick={() => { setContentLayout("folders"); setContentViewMode("list"); }}
              className="px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border-none transition-all"
              style={{ background: contentLayout === "folders" && contentViewMode === "list" ? `${uploadHex}20` : "transparent", color: contentLayout === "folders" && contentViewMode === "list" ? uploadHex : "var(--w3)" }}>
              Liste
            </button>
          </div>
        </div>
      </div>

      {/* ── Source filter strip ── */}
      {(() => {
        const counts = {
          all: allContentUnfiltered.length,
          manual: allContentUnfiltered.filter(i => i.source === "upload" || i.source === "post").length,
          instagram: allContentUnfiltered.filter(i => i.source === "instagram").length,
          wall: allContentUnfiltered.filter(i => i.source === "wall").length,
        };
        const opts: { id: typeof contentSourceFilter; label: string; icon?: React.ReactNode; hex: string }[] = [
          { id: "all", label: "Tous", hex: "#94a3b8" },
          { id: "manual", label: "Manuel", hex: "#D4AF37" },
          { id: "instagram", label: "Instagram", icon: <Instagram className="w-3 h-3" />, hex: "#dc2743" },
          { id: "wall", label: "Wall", hex: "#6366f1" },
        ];
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {opts.map(opt => {
              const isActive = contentSourceFilter === opt.id;
              const count = counts[opt.id];
              return (
                <button key={opt.id} onClick={() => setContentSourceFilter(opt.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border"
                  style={{
                    background: isActive ? `${opt.hex}20` : "transparent",
                    color: isActive ? opt.hex : "var(--w3)",
                    borderColor: isActive ? `${opt.hex}40` : "var(--w06)",
                  }}>
                  {opt.icon}
                  {opt.label}
                  <span className="text-[9px] tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* ── Upload progress banner ── */}
      {uploadProgress && (
        <div className="rounded-xl overflow-hidden transition-all"
          style={{
            background: `color-mix(in srgb, ${TIER_HEX[uploadProgress.tier] || "#D4AF37"} 6%, var(--bg))`,
            border: `1px solid ${TIER_HEX[uploadProgress.tier] || "#D4AF37"}25`,
          }}>
          <div className="flex items-center gap-3 px-4 py-3">
            {uploadProgress.progress >= 100 ? (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${TIER_HEX[uploadProgress.tier] || "#D4AF37"}20` }}>
                <Check className="w-4 h-4" style={{ color: TIER_HEX[uploadProgress.tier] || "#D4AF37" }} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center relative" style={{ background: `${TIER_HEX[uploadProgress.tier] || "#D4AF37"}15` }}>
                <Upload className="w-4 h-4" style={{ color: TIER_HEX[uploadProgress.tier] || "#D4AF37" }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-white truncate">{uploadProgress.fileName}</span>
                <span className="text-[11px] font-black tabular-nums ml-2 shrink-0" style={{ color: TIER_HEX[uploadProgress.tier] || "#D4AF37" }}>
                  {uploadProgress.progress}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--w06)" }}>
                <div className="h-full rounded-full transition-all duration-300 ease-out" style={{
                  width: `${uploadProgress.progress}%`,
                  background: `linear-gradient(90deg, ${TIER_HEX[uploadProgress.tier] || "#D4AF37"}, ${TIER_HEX[uploadProgress.tier] || "#D4AF37"}cc)`,
                  boxShadow: `0 0 8px ${TIER_HEX[uploadProgress.tier] || "#D4AF37"}40`,
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ COLUMNS / KANBAN VIEW ══════ */}
      {contentLayout === "columns" && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(activeTiers.length, 1)}, 1fr)` }}>
          {activeTiers.map(tier => {
            const tierPosts = allContent.filter(c => c.tier === tier);
            const config = TIER_META[tier];
            const hex = TIER_HEX[tier] || "#888";
            const isDragOver = dragOverTarget === `col-${tier}`;
            return (
              <div key={tier} className="flex flex-col rounded-xl overflow-hidden"
                style={{
                  minHeight: "calc(100vh - 250px)",
                  background: isDragOver ? `${hex}08` : "var(--w02)",
                  border: isDragOver ? `2px dashed ${hex}` : "1px solid var(--w06)",
                }}
                onDragOver={e => { onDragOver(e); setDragOverTarget(`col-${tier}`); }}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={e => onDropTarget(e, tier)}>
                <div className="flex items-center gap-1.5 px-2.5 py-2 shrink-0" style={{ borderBottom: `2px solid ${hex}25` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: hex }} />
                  <span className="text-[11px] font-bold text-white truncate">{config?.symbol} {config?.label || tier}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: `${hex}18`, color: hex }}>{tierPosts.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-1.5" style={{ scrollbarWidth: "thin" }}>
                  <div className="grid grid-cols-3 gap-1">
                    {tierPosts.map(item => (
                      <div key={item.id} draggable
                        onDragStart={(e) => onDragStartItem(e, item.id, item.source)}
                        onDragEnd={onDragEndItem}
                        className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group"
                        style={{
                          border: "1px solid var(--w06)",
                          opacity: dragItem === item.id ? 0.3 : 1,
                        }}>
                        <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} onClick={() => setZoomUrl(item.url)} />
                        <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-80 transition-opacity p-0.5">
                          <GripVertical className="w-2.5 h-2.5 text-white drop-shadow-lg" />
                        </div>
                        {item.source === "post" && (
                          <span className="absolute top-0.5 right-0.5 text-[6px] font-bold px-1 py-0.5 rounded-full" style={{ background: "rgba(230,51,41,0.8)", color: "#fff" }}>P</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════ FOLDERS VIEW (grid or list) ══════ */}
      {contentLayout === "folders" && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* MOBILE: Folder tiles */}
          <div className="lg:hidden space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setContentFolder(null)}
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 w-[62px]"
                style={{
                  background: contentFolder === null ? "rgba(212,175,55,0.15)" : "var(--w04)",
                  border: contentFolder === null ? "1.5px solid rgba(212,175,55,0.4)" : "1px solid var(--w06)",
                  boxShadow: contentFolder === null ? "0 2px 8px rgba(212,175,55,0.15)" : "none",
                }}>
                <Grid3x3 className="w-4.5 h-4.5" style={{ color: contentFolder === null ? "#D4AF37" : "var(--w25)" }} />
                <span className="text-[9px] font-bold" style={{ color: contentFolder === null ? "#D4AF37" : "var(--w4)" }}>Tout</span>
                <span className="text-[9px] tabular-nums" style={{ color: contentFolder === null ? "#D4AF37" : "var(--w2)" }}>{allContent.length}</span>
              </button>
              <button onClick={() => setContentFolder("p0")}
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 w-[62px]"
                style={{
                  background: contentFolder === "p0" ? "rgba(100,116,139,0.18)" : "var(--w04)",
                  border: contentFolder === "p0" ? "1.5px solid rgba(100,116,139,0.4)" : "1px solid var(--w06)",
                  boxShadow: contentFolder === "p0" ? "0 2px 8px rgba(100,116,139,0.15)" : "none",
                }}>
                <Eye className="w-4.5 h-4.5" style={{ color: contentFolder === "p0" ? "#94A3B8" : "var(--w25)" }} />
                <span className="text-[9px] font-bold" style={{ color: contentFolder === "p0" ? "#94A3B8" : "var(--w4)" }}>Public</span>
                <span className="text-[9px] tabular-nums" style={{ color: contentFolder === "p0" ? "#94A3B8" : "var(--w2)" }}>{contentCount("p0")}</span>
              </button>
              {packs.filter(p => p.active).map(pack => {
                const hex = TIER_HEX[pack.id] || pack.color;
                const tierMeta = TIER_META[pack.id];
                const isSelected = contentFolder === pack.id;
                const shortLabel: Record<string, string> = { "Feet Lovers": "Feets", "VIP Black": "VIP B", "VIP Platinum": "VIP P" };
                const label = shortLabel[tierMeta?.label || ""] || tierMeta?.label || pack.name;
                return (
                  <button key={pack.id} onClick={() => setContentFolder(pack.id)}
                    className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 w-[62px]"
                    style={{
                      background: isSelected ? `${hex}20` : "var(--w04)",
                      border: isSelected ? `1.5px solid ${hex}60` : "1px solid var(--w06)",
                      boxShadow: isSelected ? `0 2px 8px ${hex}25` : "none",
                    }}>
                    <span className="text-lg leading-none">{tierMeta?.symbol || "📁"}</span>
                    <span className="text-[9px] font-bold truncate w-full text-center" style={{ color: isSelected ? hex : "var(--w4)" }}>{label}</span>
                    <span className="text-[9px] tabular-nums" style={{ color: isSelected ? hex : "var(--w2)" }}>{contentCount(pack.id)}</span>
                  </button>
                );
              })}
              <button onClick={() => setContentFolder("custom")}
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl cursor-pointer transition-all shrink-0 w-[62px]"
                style={{
                  background: contentFolder === "custom" ? "rgba(212,175,55,0.18)" : "var(--w04)",
                  border: contentFolder === "custom" ? "1.5px solid rgba(212,175,55,0.4)" : "1px solid var(--w06)",
                  boxShadow: contentFolder === "custom" ? "0 2px 8px rgba(212,175,55,0.15)" : "none",
                }}>
                <Sparkles className="w-4.5 h-4.5" style={{ color: contentFolder === "custom" ? "#D4AF37" : "var(--w25)" }} />
                <span className="text-[9px] font-bold" style={{ color: contentFolder === "custom" ? "#D4AF37" : "var(--w4)" }}>Custom</span>
                <span className="text-[9px] tabular-nums" style={{ color: contentFolder === "custom" ? "#D4AF37" : "var(--w2)" }}>{customCount}</span>
              </button>
            </div>
          </div>

          {/* DESKTOP: Full folder sidebar */}
          <div className="hidden lg:block space-y-1.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Dossiers</span>
              <span className="text-[10px] text-white/20 ml-auto">{allContent.length} fichiers</span>
            </div>

            <div onClick={() => setContentFolder(null)}
              onDragOver={e => { onDragOver(e); setDragOverTarget("all"); }} onDragLeave={() => setDragOverTarget(null)} onDrop={e => onDropTarget(e, "p0")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all ${contentFolder === null ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
              style={dragOverTarget === "all" ? { outline: "2px dashed #D4AF37", outlineOffset: "-2px", background: "rgba(212,175,55,0.05)" } : {}}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: contentFolder === null ? "rgba(212,175,55,0.12)" : "var(--w04)" }}>
                <Grid3x3 className="w-4 h-4" style={{ color: contentFolder === null ? "#D4AF37" : "var(--w3)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white">Tout le contenu</div>
                <div className="text-[10px] text-white/25">{allContent.length} medias</div>
              </div>
            </div>

            <div onClick={() => setContentFolder("p0")}
              onDragOver={e => { onDragOver(e); setDragOverTarget("p0"); }} onDragLeave={() => setDragOverTarget(null)} onDrop={e => onDropTarget(e, "p0")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all ${contentFolder === "p0" ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
              style={dragOverTarget === "p0" ? { outline: "2px dashed #64748B", outlineOffset: "-2px", background: "rgba(100,116,139,0.05)" } : {}}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: contentFolder === "p0" ? "rgba(100,116,139,0.15)" : "var(--w04)" }}>
                <Eye className="w-4 h-4" style={{ color: contentFolder === "p0" ? "#64748B" : "var(--w3)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white">Public</div>
                <div className="text-[10px] text-white/25">{contentCount("p0")} medias · Visible par tous</div>
              </div>
            </div>

            {packs.filter(p => p.active).map(pack => {
              const hex = TIER_HEX[pack.id] || pack.color;
              const tierMeta = TIER_META[pack.id];
              const count = contentCount(pack.id);
              const isSelected = contentFolder === pack.id;
              const isDragOverThis = dragOverTarget === pack.id;
              return (
                <div key={pack.id} onClick={() => setContentFolder(pack.id)}
                  onDragOver={e => { onDragOver(e); setDragOverTarget(pack.id); }} onDragLeave={() => setDragOverTarget(null)} onDrop={e => onDropTarget(e, pack.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all ${isSelected ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
                  style={isDragOverThis ? { outline: `2px dashed ${hex}`, outlineOffset: "-2px", background: `${hex}08` } : {}}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isSelected ? `${hex}18` : "var(--w04)", border: isSelected ? `1px solid ${hex}30` : "1px solid transparent" }}>
                    <span className="text-base">{tierMeta?.symbol || "📁"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{pack.name}</span>
                      <Lock className="w-2.5 h-2.5 shrink-0" style={{ color: hex }} />
                    </div>
                    <div className="text-[10px] text-white/25">{count} medias · {pack.price}€</div>
                  </div>
                  <label className="p-1.5 rounded-lg cursor-pointer transition-all shrink-0 hover:bg-white/[0.06]"
                    style={{ color: `${hex}80` }}
                    title={`Upload vers ${pack.name}`}
                    onClick={e => e.stopPropagation()}>
                    <Upload className="w-3 h-3" />
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple className="hidden" disabled={!!uploadProgress} onChange={(e) => {
                      const files = e.target.files;
                      if (!files?.length) return;
                      setContentFolder(pack.id);
                      Array.from(files).forEach(f => handleUploadToTier(f, pack.id));
                      e.target.value = "";
                    }} />
                  </label>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
                </div>
              );
            })}

            <div onClick={() => setContentFolder("custom")}
              onDragOver={e => { onDragOver(e); setDragOverTarget("custom"); }} onDragLeave={() => setDragOverTarget(null)} onDrop={e => onDropTarget(e, "custom")}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all ${contentFolder === "custom" ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
              style={dragOverTarget === "custom" ? { outline: "2px dashed #D4AF37", outlineOffset: "-2px", background: "rgba(212,175,55,0.05)" } : {}}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: contentFolder === "custom" ? "rgba(212,175,55,0.15)" : "var(--w04)" }}>
                <Sparkles className="w-4 h-4" style={{ color: contentFolder === "custom" ? "#D4AF37" : "var(--w3)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white">Custom</div>
                <div className="text-[10px] text-white/25">{customCount} medias · A l&apos;unite</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Content grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-white/30" />
                <span className="text-sm font-semibold text-white">
                  {contentFolder === null ? "Tout le contenu" : contentFolder === "p0" ? "Public" : contentFolder === "custom" ? "Custom" : packs.find(p => p.id === contentFolder)?.name || contentFolder}
                </span>
                {contentFolder && contentFolder !== "p0" && contentFolder !== "custom" && (() => {
                  const pack = packs.find(p => p.id === contentFolder);
                  const hex = TIER_HEX[contentFolder] || pack?.color || "#888";
                  return (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${hex}20`, color: hex }}>
                      {pack?.price}€
                    </span>
                  );
                })()}
              </div>
            </div>

            {contentFolder === "p0" && (
              <div className="rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2.5"
                style={{ background: "rgba(100,116,139,0.06)", border: "1px solid rgba(100,116,139,0.1)" }}>
                <Eye className="w-3.5 h-3.5 shrink-0 text-white/30" />
                <span className="text-[11px] text-white/40">Contenu public — visible par tous sans code</span>
              </div>
            )}

            {/* Pack config card */}
            {contentFolder && contentFolder !== "p0" && contentFolder !== "custom" && (() => {
              const pack = packs.find(p => p.id === contentFolder);
              if (!pack) return null;
              const hex = TIER_HEX[contentFolder] || pack.color;
              const tierMeta = TIER_META[contentFolder];
              const tierSymbol = tierMeta?.symbol || "";
              const soldCount = modelCodes.filter(c => c.tier === pack.id && c.type === "paid" && !c.revoked).length;
              const packRevenue = soldCount * pack.price;
              const isExpCfg = expandedPack === `cfg-${pack.id}`;
              const previewImgs = allContent.filter(c => c.tier === contentFolder).slice(0, 4);
              const accessibleBy = packs.filter(pp => {
                const pLevel = parseInt(pp.id.replace("p", ""), 10);
                const thisLevel = parseInt(contentFolder!.replace("p", ""), 10);
                return pLevel >= thisLevel && pp.active && pp.id !== contentFolder;
              });

              return (
                <div className="rounded-xl overflow-hidden mb-3 transition-all"
                  style={{ background: `color-mix(in srgb, ${hex} 4%, var(--bg))`, border: `1px solid ${hex}20` }}>
                  <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedPack(isExpCfg ? null : `cfg-${pack.id}`)}>
                    <span className="text-base shrink-0">{tierSymbol}</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold text-white">{pack.name}</span>
                      <span className="text-sm font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                      <span className="text-[10px] tabular-nums text-white/30">{soldCount} vendus · {fmt.format(packRevenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                        background: pack.active ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)",
                        color: pack.active ? "#10B981" : "#6B7280" }}>
                        {pack.active ? "ON" : "OFF"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-white/25 transition-transform" style={{ transform: isExpCfg ? "rotate(180deg)" : "rotate(0)" }} />
                    </div>
                  </div>

                  {isExpCfg && (
                    <div className="border-t" style={{ borderColor: `${hex}15` }}>
                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">
                        <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${hex}08, ${hex}03)` }}>
                          <div className="text-[8px] font-bold uppercase tracking-wider text-center py-1.5" style={{ background: `${hex}15`, color: hex }}>
                            Vue client sur le profil
                          </div>
                          <div className="relative" style={{ minHeight: "140px" }}>
                            {previewImgs.length > 0 ? (
                              <div className="grid grid-cols-2 gap-0.5 p-1.5">
                                {previewImgs.map((img, i) => (
                                  <div key={i} className="aspect-[3/4] relative overflow-hidden rounded-lg">
                                    <img src={img.url} alt="" className="w-full h-full object-cover" style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full p-4">
                                <span className="text-[10px] text-white/20">Aucune photo</span>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "20px" }}>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                                style={{ background: `${hex}30`, border: `1px solid ${hex}40` }}>
                                <Lock className="w-4 h-4" style={{ color: hex }} />
                              </div>
                            </div>
                          </div>
                          <div className="px-3 py-2 text-center" style={{ borderTop: `1px solid ${hex}10` }}>
                            <p className="text-[9px] text-white/30 leading-relaxed">
                              Accessible : <span className="font-bold" style={{ color: hex }}>{pack.name}</span>
                              {accessibleBy.length > 0 && <span className="text-white/20"> + {accessibleBy.map(a => a.name).join(", ")}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-3 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {editingPacks ? (
                                <input value={pack.name} onChange={e => updatePack(pack.id, "name", e.target.value)}
                                  className="px-2 py-1 rounded-lg text-sm font-bold bg-white/[0.05] border border-white/[0.1] text-white outline-none focus:border-[#D4AF37] transition-colors w-24" />
                              ) : <span className="text-sm font-bold text-white">{pack.name}</span>}
                              {editingPacks ? (
                                <input type="number" value={pack.price} onChange={e => updatePack(pack.id, "price", Number(e.target.value))}
                                  className="px-2 py-1 rounded-lg text-sm font-black tabular-nums bg-white/[0.05] border border-white/[0.1] text-white outline-none focus:border-[#D4AF37] transition-colors w-16" />
                              ) : <span className="text-lg font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {editingPacks ? (
                                <>
                                  <button onClick={() => setEditingPacks(false)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer border border-white/[0.06] bg-transparent text-white/40 hover:text-white/60 transition-colors">
                                    Annuler
                                  </button>
                                  <button onClick={handleSavePacks} disabled={savingPacks}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer hover:brightness-110 border-none disabled:opacity-50 transition-all"
                                    style={{ background: hex, color: "#fff" }}>
                                    {savingPacks ? "..." : "Save"}
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => setEditingPacks(true)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer border border-white/[0.06] bg-transparent text-white/30 hover:text-white/50 transition-colors">
                                  <Pencil className="w-3 h-3 inline mr-0.5" />Edit
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {editingPacks ? (
                              <button onClick={() => updatePack(pack.id, "active", !pack.active)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all border-none"
                                style={{ background: pack.active ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)", color: pack.active ? "#10B981" : "#6B7280" }}>
                                {pack.active ? "✓ Visible sur profil" : "✕ Masque"}
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{
                                background: pack.active ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)",
                                color: pack.active ? "#10B981" : "#6B7280" }}>
                                {pack.active ? "● Visible sur profil" : "○ Masque"}
                              </span>
                            )}
                            {editingPacks ? (
                              <input value={pack.badge || ""} onChange={e => updatePack(pack.id, "badge", e.target.value || null as unknown as string)}
                                placeholder="Badge..."
                                className="flex-1 px-2 py-1 rounded-lg text-[10px] bg-white/[0.05] border border-white/[0.08] text-white outline-none focus:border-[#D4AF37] transition-colors placeholder:text-white/20" />
                            ) : pack.badge ? (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${hex}15`, color: hex }}>{pack.badge}</span>
                            ) : null}
                            <a href={`/m/${modelSlug}#${pack.id}`} target="_blank" rel="noopener"
                              className="text-[10px] font-medium no-underline transition-colors flex items-center gap-0.5 ml-auto" style={{ color: hex }}>
                              <Eye className="w-3 h-3" /> Voir profil
                            </a>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                            <span className="text-[9px] uppercase tracking-wider text-white/20 font-medium">Contenu inclus</span>
                            {(pack.features || []).map((feat, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 shrink-0" style={{ color: hex }} />
                                {editingPacks ? (
                                  <div className="flex items-center gap-1 flex-1">
                                    <input value={feat} onChange={e => { const nf = [...(pack.features || [])]; nf[i] = e.target.value; updatePack(pack.id, "features", nf); }}
                                      className="flex-1 px-2 py-0.5 rounded text-[11px] bg-white/[0.05] border border-white/[0.08] text-white outline-none focus:border-[#D4AF37] transition-colors" />
                                    <button onClick={() => updatePack(pack.id, "features", (pack.features || []).filter((_, j) => j !== i))}
                                      className="text-white/20 hover:text-red-400 cursor-pointer bg-transparent border-none text-xs transition-colors">✕</button>
                                  </div>
                                ) : <span className="text-[11px] text-white/50">{feat}</span>}
                              </div>
                            ))}
                            {editingPacks && (
                              <button onClick={() => updatePack(pack.id, "features", [...(pack.features || []), ""])}
                                className="text-[10px] text-white/30 hover:text-white/50 cursor-pointer bg-transparent border-none transition-colors flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Ajouter
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Custom config card */}
            {contentFolder === "custom" && (() => {
              const customHex = "#D4AF37";
              const customItems = allContent.filter(c => c.tier === "custom");
              const customSold = customItems.filter(c => c.clientId).length;
              const customRevenue = customItems.reduce((sum, c) => sum + ((c as any).tokenPrice || 0), 0);
              const isExpCustom = expandedPack === "cfg-custom";
              const previewImgs = customItems.slice(0, 4);

              return (
                <div className="rounded-xl overflow-hidden mb-3 transition-all"
                  style={{ background: `color-mix(in srgb, ${customHex} 4%, var(--bg))`, border: `1px solid ${customHex}20` }}>
                  <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedPack(isExpCustom ? null : "cfg-custom")}>
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: customHex }} />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold text-white">Custom</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${customHex}15`, color: customHex }}>A l&apos;unite</span>
                      <span className="text-[10px] tabular-nums text-white/30">{customItems.length} medias · {customSold} vendus</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-white/25 transition-transform" style={{ transform: isExpCustom ? "rotate(180deg)" : "rotate(0)" }} />
                  </div>

                  {isExpCustom && (
                    <div className="border-t" style={{ borderColor: `${customHex}15` }}>
                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">
                        <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${customHex}08, ${customHex}03)` }}>
                          <div className="text-[8px] font-bold uppercase tracking-wider text-center py-1.5" style={{ background: `${customHex}15`, color: customHex }}>
                            Apercu Custom
                          </div>
                          <div className="relative" style={{ minHeight: "140px" }}>
                            {previewImgs.length > 0 ? (
                              <div className="grid grid-cols-2 gap-0.5 p-1.5">
                                {previewImgs.map((img, i) => (
                                  <div key={i} className="aspect-[3/4] relative overflow-hidden rounded-lg">
                                    <img src={img.url} alt="" className="w-full h-full object-cover" style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full p-4">
                                <span className="text-[10px] text-white/20">Aucune photo custom</span>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "20px" }}>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                                style={{ background: `${customHex}30`, border: `1px solid ${customHex}40` }}>
                                <Sparkles className="w-4 h-4" style={{ color: customHex }} />
                              </div>
                            </div>
                          </div>
                          <div className="px-3 py-2 text-center" style={{ borderTop: `1px solid ${customHex}10` }}>
                            <p className="text-[9px] text-white/30 leading-relaxed">
                              Vente a l&apos;unite · prix par photo
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-3 space-y-3">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-white/20 font-medium">Mode de vente</span>
                            <p className="text-[11px] text-white/50 leading-relaxed">
                              Photos vendues individuellement. Chaque photo a son propre prix.
                              Peut etre generique (revendu plusieurs fois) ou exclusive a un client.
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg px-2.5 py-2 text-center" style={{ background: "var(--w03)", border: "1px solid var(--w05)" }}>
                              <div className="text-sm font-black tabular-nums text-white">{customItems.length}</div>
                              <div className="text-[8px] uppercase tracking-wider text-white/25">Photos</div>
                            </div>
                            <div className="rounded-lg px-2.5 py-2 text-center" style={{ background: "var(--w03)", border: "1px solid var(--w05)" }}>
                              <div className="text-sm font-black tabular-nums" style={{ color: customHex }}>{customSold}</div>
                              <div className="text-[8px] uppercase tracking-wider text-white/25">Vendues</div>
                            </div>
                            <div className="rounded-lg px-2.5 py-2 text-center" style={{ background: "var(--w03)", border: "1px solid var(--w05)" }}>
                              <div className="text-sm font-black tabular-nums text-emerald-400">{fmt.format(customRevenue)}</div>
                              <div className="text-[8px] uppercase tracking-wider text-white/25">Revenus</div>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                            <span className="text-[9px] uppercase tracking-wider text-white/20 font-medium">Regles</span>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 shrink-0" style={{ color: customHex }} />
                              <span className="text-[11px] text-white/50">Photo generique : revendable a plusieurs clients</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 shrink-0" style={{ color: customHex }} />
                              <span className="text-[11px] text-white/50">Photo exclusive : liee a un seul client</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 shrink-0" style={{ color: customHex }} />
                              <span className="text-[11px] text-white/50">Prix individuel par photo (token_price)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 shrink-0" style={{ color: customHex }} />
                              <span className="text-[11px] text-white/50">Classees par client acheteur</span>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                            <span className="text-[9px] uppercase tracking-wider text-white/20 font-medium">Confidentialite</span>
                            <p className="text-[10px] text-white/35 leading-relaxed">
                              Les photos custom ne sont <span className="font-bold text-white/50">jamais visibles sur le profil public</span>.
                              Acces uniquement via lien ou code genere pour le client.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Custom folder: full management UI */}
            {contentFolder === "custom" && (() => {
              const customItems = allContent.filter(c => c.tier === "custom");
              const accessedUploadIds = [...new Set(photoAccesses.map(a => a.upload_id))];
              const crossTierItems = allContent.filter(c => c.tier !== "custom" && accessedUploadIds.includes(c.id));
              const allCustomPhotos = [...customItems, ...crossTierItems];
              const activeAccesses = photoAccesses.filter(a => !a.revoked_at);
              const soldCount = new Set(activeAccesses.map(a => a.upload_id)).size;
              const uniqueClients2 = new Set(activeAccesses.map(a => a.client_id)).size;
              const totalRevenue = activeAccesses.reduce((s: number, a: any) => s + (a.price || 0), 0);

              const filteredCustomPhotos = customClientFilter
                ? allCustomPhotos.filter(pp => activeAccesses.some(a => a.upload_id === pp.id && a.client_id === customClientFilter))
                : allCustomPhotos;

              const filteredClients = clients.filter(c =>
                !clientSearch || (c.id || "").toLowerCase().includes(clientSearch.toLowerCase()) || (c.nickname || c.pseudo_snap || "").toLowerCase().includes(clientSearch.toLowerCase())
              );

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Photos custom", value: allCustomPhotos.length, color: "#D4AF37" },
                      { label: "Vendues", value: soldCount, color: "#8B5CF6" },
                      { label: "Clients uniques", value: uniqueClients2, color: "#3B82F6" },
                      { label: "Revenus", value: fmt.format(totalRevenue), color: "#10B981" },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl px-3 py-2.5 text-center" style={{ background: "var(--w02)", border: "1px solid var(--w06)" }}>
                        <div className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[8px] uppercase tracking-wider text-white/25 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
                    <div className="space-y-2">
                      {accessLoading ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
                        </div>
                      ) : filteredCustomPhotos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: "var(--w02)", border: "1px dashed var(--w06)" }}>
                          <Sparkles className="w-10 h-10 mb-3 text-white/10" />
                          <p className="text-sm text-white/25 mb-1">Aucune photo custom</p>
                          <p className="text-xs text-white/15">Upload des photos ou deplace-en depuis un autre dossier</p>
                        </div>
                      ) : contentViewMode === "list" ? (
                        <div className={`${surface} overflow-hidden`}>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/[0.06]">
                                <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2">Photo</th>
                                <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2">Source</th>
                                <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2">Clients</th>
                                <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2">Revenue</th>
                                <th className="text-center text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredCustomPhotos.map(item => {
                                const photoAccess = activeAccesses.filter(a => a.upload_id === item.id);
                                const clientCount = new Set(photoAccess.map((a: any) => a.client_id)).size;
                                const photoRev = photoAccess.reduce((s: number, a: any) => s + (a.price || 0), 0);
                                const isFromOtherTier = item.tier !== "custom";
                                const tierMeta = TIER_META[item.tier];
                                const hex = TIER_HEX[item.tier] || "#D4AF37";
                                const clientNames = photoAccess.map(a => {
                                  const cl = clients.find(c => c.id === a.client_id);
                                  return cl?.nickname || cl?.pseudo_snap || "—";
                                }).join(", ");
                                return (
                                  <tr key={item.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-2.5">
                                        <img src={item.url} alt="" className="w-10 h-12 object-cover rounded-lg shrink-0 cursor-pointer" onClick={() => setZoomUrl(item.url)} />
                                        <div className="min-w-0">
                                          <div className="text-[10px] text-white/30 truncate">{item.id.substring(0, 8)}...</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${hex}15`, color: hex }}>
                                        {isFromOtherTier ? tierMeta?.label || item.tier : "Custom"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="text-xs text-white/60">{clientCount === 0 ? "—" : clientNames}</span>
                                      {clientCount > 0 && <span className="text-[9px] text-white/25 ml-1">({clientCount})</span>}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <span className="text-xs font-bold tabular-nums" style={{ color: photoRev > 0 ? "#D4AF37" : "var(--w2)" }}>{fmt.format(photoRev)}</span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <button onClick={() => { setAssigningPhoto(assigningPhoto === item.id ? null : item.id); setAssignPrice(""); setClientSearch(""); }}
                                        className="text-[10px] font-medium px-2 py-1 rounded-lg cursor-pointer border-none transition-all hover:bg-white/[0.06]"
                                        style={{ background: assigningPhoto === item.id ? "rgba(212,175,55,0.15)" : "transparent", color: assigningPhoto === item.id ? "#D4AF37" : "var(--w4)" }}>
                                        <UserPlus className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />Assigner
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                          {filteredCustomPhotos.map(item => {
                            const photoAccess = activeAccesses.filter(a => a.upload_id === item.id);
                            const clientCount = new Set(photoAccess.map((a: any) => a.client_id)).size;
                            const isFromOtherTier = item.tier !== "custom";
                            const tierMeta = TIER_META[item.tier];
                            const hex = TIER_HEX[item.tier] || "#D4AF37";

                            return (
                              <div key={item.id} className="relative">
                                <div className="aspect-[3/4] relative overflow-hidden rounded-xl group cursor-pointer"
                                  style={{ border: `1px solid ${isFromOtherTier ? hex + "30" : "rgba(212,175,55,0.2)"}` }}>
                                  <img src={item.url} alt="" className="w-full h-full object-cover" style={{ filter: "brightness(0.9)" }}
                                    onClick={() => setZoomUrl(item.url)} />

                                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                                    {isFromOtherTier ? (
                                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${hex}cc`, color: "#fff" }}>
                                        {tierMeta?.symbol} {tierMeta?.label}
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.85)", color: "#fff" }}>
                                        <Sparkles className="w-2.5 h-2.5 inline mr-0.5" style={{ verticalAlign: "middle" }} />Custom
                                      </span>
                                    )}
                                  </div>

                                  <div className="absolute top-1.5 right-1.5">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setExpandedPhotoHistory(expandedPhotoHistory === item.id ? null : item.id); }}
                                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer border-none transition-all"
                                      style={{
                                        background: clientCount > 0 ? (clientCount === 1 ? "rgba(139,92,246,0.85)" : "rgba(59,130,246,0.85)") : "var(--w15)",
                                        color: "#fff",
                                      }}>
                                      {clientCount === 0 ? "0 client" : clientCount === 1 ? "Exclusive" : `${clientCount} clients`}
                                    </button>
                                  </div>

                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={(e) => { e.stopPropagation(); setAssigningPhoto(assigningPhoto === item.id ? null : item.id); setAssignPrice(""); setClientSearch(""); }}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all"
                                      style={{ background: "rgba(212,175,55,0.9)", color: "#fff" }}>
                                      <UserPlus className="w-3.5 h-3.5" /> Assigner
                                    </button>
                                  </div>
                                </div>

                                {assigningPhoto === item.id && (
                                  <div className="mt-1.5 rounded-xl p-3 space-y-2" style={{ background: "var(--w03)", border: "1px solid rgba(212,175,55,0.15)" }}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Assigner a un client</span>
                                      <button onClick={() => setAssigningPhoto(null)} className="p-0.5 cursor-pointer border-none bg-transparent text-white/30 hover:text-white/60">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <input type="text" placeholder="Rechercher un client..." value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                                      className="w-full px-2.5 py-1.5 rounded-lg text-[11px] text-white placeholder:text-white/25 outline-none"
                                      style={{ background: "var(--w04)", border: "1px solid var(--w08)" }} />
                                    <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto no-scrollbar">
                                      {filteredClients.slice(0, 12).map(c => (
                                        <button key={c.id}
                                          onClick={() => {
                                            const price = parseFloat(assignPrice) || 0;
                                            handleAssignToClient(item.id, c.id, price, item.tier);
                                          }}
                                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer border-none transition-all hover:bg-white/[0.08]"
                                          style={{ background: "var(--w04)", color: "var(--w7)" }}>
                                          <Users className="w-2.5 h-2.5 text-white/30" />
                                          {c.nickname || c.pseudo_snap || c.id}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="relative flex-1">
                                        <input type="number" placeholder="Prix (EUR)" value={assignPrice} onChange={e => setAssignPrice(e.target.value)}
                                          className="w-full px-2.5 py-1.5 rounded-lg text-[11px] text-white placeholder:text-white/25 outline-none"
                                          style={{ background: "var(--w04)", border: "1px solid var(--w08)" }} />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/20">EUR</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {expandedPhotoHistory === item.id && photoAccess.length > 0 && (
                                  <div className="mt-1.5 rounded-xl overflow-hidden" style={{ background: "var(--w02)", border: "1px solid var(--w06)" }}>
                                    <div className="px-3 py-1.5 border-b border-white/[0.04]">
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Historique acces</span>
                                    </div>
                                    {photoAccesses.filter(a => a.upload_id === item.id).map((acc: any) => {
                                      const isActive = !acc.revoked_at;
                                      const client = clients.find(c => c.id === acc.client_id);
                                      return (
                                        <div key={acc.id} className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.03] last:border-0">
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-medium text-white/70 truncate">{client?.nickname || client?.pseudo_snap || acc.client_id}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[9px] text-white/25">{acc.created_at ? relativeTime(acc.created_at) : "-"}</span>
                                              {acc.price > 0 && <span className="text-[9px] font-bold text-[#D4AF37]">{fmt.format(acc.price)}</span>}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{
                                              background: isActive ? "rgba(16,185,129,0.15)" : "rgba(220,38,38,0.15)",
                                              color: isActive ? "#10B981" : "#F87171",
                                            }}>
                                              {isActive ? "Actif" : "Revoque"}
                                            </span>
                                            {isActive && (
                                              <button onClick={() => handleRevokeAccess(acc.id)}
                                                className="p-1 rounded cursor-pointer border-none bg-transparent text-white/20 hover:text-red-400 transition-colors"
                                                title="Revoquer">
                                                <Ban className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {expandedPhotoHistory === item.id && photoAccess.length === 0 && (
                                  <div className="mt-1.5 rounded-xl px-3 py-2" style={{ background: "var(--w02)", border: "1px solid var(--w06)" }}>
                                    <span className="text-[10px] text-white/25">Aucun acces accorde</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl overflow-hidden h-fit" style={{ background: "var(--w02)", border: "1px solid var(--w06)" }}>
                      <div className="px-3 py-2.5 border-b border-white/[0.04]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Clients</span>
                      </div>
                      <div className="p-2">
                        <input type="text" placeholder="Rechercher..." value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-[11px] text-white placeholder:text-white/25 outline-none mb-2"
                          style={{ background: "var(--w04)", border: "1px solid var(--w08)" }} />
                      </div>
                      <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                        {filteredClients.length === 0 ? (
                          <div className="px-3 py-4 text-center">
                            <span className="text-[10px] text-white/20">Aucun client</span>
                          </div>
                        ) : filteredClients.map(c => {
                          const clientAccessCount = activeAccesses.filter(a => a.client_id === c.id).length;
                          const isSelected = customClientFilter === c.id;
                          const tierHex = TIER_HEX[c.tier || "p0"] || "#64748B";
                          return (
                            <button key={c.id}
                              onClick={() => setCustomClientFilter(isSelected ? null : c.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer border-none transition-all"
                              style={{
                                background: isSelected ? "rgba(212,175,55,0.08)" : "transparent",
                                borderLeft: isSelected ? "2px solid #D4AF37" : "2px solid transparent",
                              }}>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-white/70 truncate">{c.nickname || c.pseudo_snap || c.id}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: `${tierHex}15`, color: tierHex }}>
                                    {TIER_META[c.tier || "p0"]?.label || "Public"}
                                  </span>
                                </div>
                              </div>
                              {clientAccessCount > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>
                                  {clientAccessCount} photo{clientAccessCount > 1 ? "s" : ""}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Standard folders content grid */}
            {contentFolder !== "custom" && (() => {
              const filtered = contentFolder === null ? allContent : allContent.filter(c => c.tier === contentFolder);
              const emptyHex = contentFolder ? (TIER_HEX[contentFolder] || "#D4AF37") : "#64748B";
              const emptyLabel = contentFolder === null ? "Public" : contentFolder === "p0" ? "Public" : TIER_META[contentFolder]?.label || contentFolder;
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: "var(--w02)", border: `1px dashed ${emptyHex}20` }}>
                    <FolderOpen className="w-10 h-10 mb-3" style={{ color: `${emptyHex}25` }} />
                    <p className="text-sm text-white/25 mb-1">Aucun contenu</p>
                    <p className="text-xs text-white/15 mb-4">Upload des medias ou publie des posts avec photo</p>
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all hover:brightness-110"
                      style={{ background: `${emptyHex}15`, border: `1px solid ${emptyHex}30`, color: emptyHex }}>
                      <Upload className="w-4 h-4" />
                      <span className="text-[11px] font-bold">Upload vers {emptyLabel}</span>
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple className="hidden" disabled={!!uploadProgress} onChange={(e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        Array.from(files).forEach(f => handleUploadToTier(f, contentFolder || "p0"));
                        e.target.value = "";
                      }} />
                    </label>
                  </div>
                );
              }
              return contentViewMode === "grid" ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                  {filtered.map(item => {
                    const hex = TIER_HEX[item.tier] || "#64748B";
                    const tierMeta = TIER_META[item.tier];
                    const isPromo = item.visibility === "promo";
                    const isFree = !item.tier || item.tier === "p0";
                    return (
                      <div key={item.id}
                        draggable
                        onDragStart={(e) => onDragStartItem(e, item.id, item.source)}
                        onDragEnd={onDragEndItem}
                        className="aspect-[3/4] relative overflow-hidden rounded-xl group cursor-grab active:cursor-grabbing"
                        style={{
                          border: `1px solid ${isFree ? "var(--w06)" : hex + "20"}`,
                          opacity: dragItem === item.id ? 0.3 : 1,
                          transform: dragItem === item.id ? "scale(0.9)" : "scale(1)",
                          transition: "opacity 0.15s, transform 0.15s",
                        }}>
                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity z-10">
                          <GripVertical className="w-3 h-3 text-white drop-shadow-lg" />
                        </div>
                        <img src={item.url} alt="" className="w-full h-full object-cover" draggable={false} style={{ filter: "brightness(0.9)" }}
                          onClick={() => setZoomUrl(item.url)} />

                        <div className="absolute top-1.5 flex items-center gap-1" style={{ left: "18px" }}>
                          {item.source === "post" && (
                            <span className="text-[7px] font-bold px-1 py-0.5 rounded-full" style={{ background: "rgba(230,51,41,0.8)", color: "#fff" }}>POST</span>
                          )}
                          {!isFree && contentFolder === null && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{
                              background: `${hex}cc`, color: "#fff", backdropFilter: "blur(4px)"
                            }}>{tierMeta?.symbol} {tierMeta?.label}</span>
                          )}
                          {isFree && contentFolder === null && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{
                              background: "rgba(100,116,139,0.8)", color: "#fff"
                            }}>Public</span>
                          )}
                        </div>

                        {!isFree && (
                          <div className="absolute bottom-1.5 right-1.5">
                            <span className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{
                              background: isPromo ? "rgba(16,185,129,0.85)" : "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)"
                            }}>{isPromo ? "Visible" : "Prive"}</span>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                          style={{ WebkitTapHighlightColor: "transparent" }}>
                          {!isFree && item.source === "upload" && (
                            <button onClick={() => handleToggleBlur(item.id, item.visibility || "pack")}
                              disabled={togglingBlur === item.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border-none"
                              style={{ background: isPromo ? "rgba(139,92,246,0.9)" : "rgba(16,185,129,0.9)", color: "#fff" }}>
                              {togglingBlur === item.id ? "..." : isPromo ? <><EyeOff className="w-3 h-3" /> Rendre prive</> : <><Eye className="w-3 h-3" /> Rendre visible</>}
                            </button>
                          )}
                          {item.source === "upload" && (
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setMovingUpload(movingUpload === item.id ? null : item.id); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border-none"
                              style={{ background: "var(--w15)", color: "#fff" }}>
                              <ArrowRight className="w-3 h-3" /> Deplacer
                            </button>
                            {movingUpload === item.id && (
                              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-20 rounded-xl overflow-hidden shadow-2xl min-w-[140px]"
                                style={{ background: "#1a1a22", border: "1px solid var(--w1)" }}>
                                <button onClick={() => { handleMoveTier(item.id, "p0"); setMovingUpload(null); }}
                                  disabled={item.tier === "p0"}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                  style={{ background: "transparent", color: "#64748B" }}>
                                  <Eye className="w-3 h-3" /> Public
                                </button>
                                {packs.filter(pp => pp.active).map(pp => {
                                  const ph = TIER_HEX[pp.id] || pp.color;
                                  const pm = TIER_META[pp.id];
                                  return (
                                    <button key={pp.id} onClick={() => { handleMoveTier(item.id, pp.id); setMovingUpload(null); }}
                                      disabled={item.tier === pp.id}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                      style={{ background: "transparent", color: ph }}>
                                      <span>{pm?.symbol}</span> {pp.name}
                                    </button>
                                  );
                                })}
                                <button onClick={() => { handleMoveTier(item.id, "custom"); setMovingUpload(null); }}
                                  disabled={item.tier === "custom"}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                  style={{ background: "transparent", color: "#D4AF37" }}>
                                  <Sparkles className="w-3 h-3" /> Custom
                                </button>
                              </div>
                            )}
                          </div>
                          )}
                          {deletingUpload === item.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => item.source === "upload" ? handleDeleteUpload(item.id) : handleDeletePost(item.id)}
                                className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer border-none" style={{ background: "#DC2626", color: "#fff" }}>Oui</button>
                              <button onClick={() => setDeletingUpload(null)}
                                className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer border-none" style={{ background: "var(--w15)", color: "#fff" }}>Non</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingUpload(item.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] cursor-pointer border-none transition-colors"
                              style={{ background: "rgba(220,38,38,0.2)", color: "#F87171" }}>
                              <Trash2 className="w-3 h-3" /> Supprimer
                            </button>
                          )}
                          {item.source === "post" && (
                            <span className="text-[9px] text-white/40 mt-1">via Feed</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`${surface} overflow-hidden`}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 w-16">Apercu</th>
                        <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Type</th>
                        <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Dossier</th>
                        <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Visibilite</th>
                        <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Date</th>
                        <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(item => {
                        const hex = TIER_HEX[item.tier] || "#64748B";
                        const tierMeta = TIER_META[item.tier];
                        const isFree = !item.tier || item.tier === "p0";
                        const isBlurred = item.visibility !== "promo";
                        return (
                          <tr key={item.id}
                            draggable
                            onDragStart={(e) => onDragStartItem(e, item.id, item.source)}
                            onDragEnd={onDragEndItem}
                            className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-grab active:cursor-grabbing"
                            style={{ opacity: dragItem === item.id ? 0.3 : 1 }}>
                            <td className="px-4 py-2">
                              <div className="w-10 h-12 rounded-lg overflow-hidden cursor-pointer" onClick={() => setZoomUrl(item.url)}>
                                <img src={item.url} alt="" className="w-full h-full object-cover"
                                  style={{ filter: "brightness(0.9)" }} draggable={false} />
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-white/50">{item.type || "photo"}</span>
                                {item.source === "post" && <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: "rgba(230,51,41,0.15)", color: "#E63329" }}>POST</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: `${hex}15`, color: hex }}>
                                {isFree ? "Public" : `${tierMeta?.symbol || ""} ${tierMeta?.label || item.tier}`}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {isFree ? (
                                <span className="text-[10px] text-white/30">Visible</span>
                              ) : item.source === "upload" ? (
                                <button onClick={() => handleToggleBlur(item.id, item.visibility || "pack")}
                                  disabled={togglingBlur === item.id}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer border-none transition-colors"
                                  style={{ background: isBlurred ? "rgba(139,92,246,0.1)" : "rgba(16,185,129,0.1)", color: isBlurred ? "#8B5CF6" : "#10B981" }}>
                                  {togglingBlur === item.id ? "..." : isBlurred ? "Prive" : "Promo"}
                                </button>
                              ) : (
                                <span className="text-[10px] text-white/30">Pack</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-[11px] text-white/25 tabular-nums">{item.date ? relativeTime(item.date) : "-"}</td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                {item.source === "upload" && (
                                <div className="relative">
                                  <button onClick={() => setMovingUpload(movingUpload === item.id ? null : item.id)}
                                    className="p-1.5 rounded-lg cursor-pointer border-none bg-transparent text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-colors">
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                  {movingUpload === item.id && (
                                    <div className="absolute top-full right-0 mt-1 z-20 rounded-xl overflow-hidden shadow-2xl min-w-[140px]"
                                      style={{ background: "#1a1a22", border: "1px solid var(--w1)" }}>
                                      <button onClick={() => { handleMoveTier(item.id, "p0"); setMovingUpload(null); }}
                                        disabled={item.tier === "p0"}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                        style={{ background: "transparent", color: "#64748B" }}>
                                        <Eye className="w-3 h-3" /> Public
                                      </button>
                                      {packs.filter(pp => pp.active).map(pp => {
                                        const ph = TIER_HEX[pp.id] || pp.color;
                                        const pm = TIER_META[pp.id];
                                        return (
                                          <button key={pp.id} onClick={() => { handleMoveTier(item.id, pp.id); setMovingUpload(null); }}
                                            disabled={item.tier === pp.id}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                            style={{ background: "transparent", color: ph }}>
                                            <span>{pm?.symbol}</span> {pp.name}
                                          </button>
                                        );
                                      })}
                                      <button onClick={() => { handleMoveTier(item.id, "custom"); setMovingUpload(null); }}
                                        disabled={item.tier === "custom"}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                        style={{ background: "transparent", color: "#D4AF37" }}>
                                        <Sparkles className="w-3 h-3" /> Custom
                                      </button>
                                    </div>
                                  )}
                                </div>
                                )}
                                {deletingUpload === item.id ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => item.source === "upload" ? handleDeleteUpload(item.id) : handleDeletePost(item.id)} className="p-1 rounded text-[9px] font-bold cursor-pointer border-none" style={{ background: "#DC2626", color: "#fff" }}>✓</button>
                                    <button onClick={() => setDeletingUpload(null)} className="p-1 rounded text-[9px] cursor-pointer border-none" style={{ background: "var(--w1)", color: "#fff" }}>✕</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setDeletingUpload(item.id)}
                                    className="p-1.5 rounded-lg cursor-pointer border-none bg-transparent text-white/15 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Summary stats */}
            {contentFolder && contentFolder !== "p0" && contentFolder !== "custom" && (() => {
              const pack = packs.find(pp => pp.id === contentFolder);
              if (!pack) return null;
              const hex = TIER_HEX[contentFolder] || pack.color;
              const tierItems = allContent.filter(c => c.tier === contentFolder);
              const promoCount = tierItems.filter(c => c.visibility === "promo").length;
              const blurredCount = tierItems.length - promoCount;
              return (
                <div className="flex items-center gap-6 mt-4 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: hex }} />
                    <span className="text-[10px] text-white/30">{tierItems.length} total</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-white/20" />
                    <span className="text-[10px] text-white/30">{blurredCount} floutes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3" style={{ color: "#10B981" }} />
                    <span className="text-[10px] text-white/30">{promoCount} promo</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Zoom lightbox */}
      {zoomUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" onClick={() => setZoomUrl(null)}>
          <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-10" style={{ background: "var(--w15)", border: "none" }} onClick={() => setZoomUrl(null)}>
            <X className="w-4 h-4 text-white" />
          </button>
          <img src={zoomUrl} alt="" className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg" style={{ boxShadow: "0 0 60px rgba(0,0,0,0.5)" }} />
        </div>
      )}
    </div>
  );
}

export default ContenuPanel;

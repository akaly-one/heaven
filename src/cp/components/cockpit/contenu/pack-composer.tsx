"use client";

// ════════════════════════════════════════════════════════════════
//  PackComposer — Heaven CP contenu drag-drop composer
//  3-view toggle: Dossiers (grid) / Colonnes (kanban) / Liste
//
//  This is a low-level building block — it renders the 3 views
//  and wires drag-drop via ContentDraggableItem + PackDropZone.
//  It does NOT own upload, delete, toggle-blur, or pack metadata
//  editing (those stay in the parent agence/page.tsx for now).
//
//  Phase 2 of the multi-agent plan will fully extract the Contenu
//  tab from the monolith and make this composer the sole renderer.
// ════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import { Columns, Grid3x3, List as ListIcon, GripVertical, Sparkles, Eye } from "lucide-react";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import type { PackConfig } from "@/types/heaven";
import { ContentDraggableItem, type DraggableSource, type ContentDraggablePayload } from "./content-draggable-item";
import { PackDropZone } from "./pack-drop-zone";

// ── Types ──────────────────────────────────────────────────────

export type PackComposerMode = "folders" | "columns" | "list";

export interface ComposerContentItem {
  id: string;
  url: string;
  tier: string;
  source: DraggableSource;
  visibility?: string;
  date?: string;
  type?: string;
  postContent?: string;
}

interface PackComposerProps {
  /** Current view mode. */
  mode: PackComposerMode;
  /** Called when the user picks a new view. */
  onModeChange: (mode: PackComposerMode) => void;
  /** Active packs (id must align with tier ids p1..p5). */
  packs: PackConfig[];
  /** All content items (uploads + posts + instagram + wall) — pre-merged by parent. */
  items: ComposerContentItem[];
  /** Currently selected folder (null = "Tout"). Only used in folders mode. */
  selectedFolder: string | null;
  /** Called when user clicks a folder tile/row. */
  onSelectFolder: (folder: string | null) => void;
  /** Called when an item is dropped on a pack (tier id). */
  onMoveItem: (itemId: string, source: DraggableSource, targetTier: string) => void;
  /** Optional: zoom preview callback (click on image). */
  onZoom?: (url: string) => void;
}

// ── Component ──────────────────────────────────────────────────

export function PackComposer({
  mode,
  onModeChange,
  packs,
  items,
  selectedFolder,
  onSelectFolder,
  onMoveItem,
  onZoom,
}: PackComposerProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoverTier, setHoverTier] = useState<string | null>(null);

  const activePacks = useMemo(() => packs.filter(p => p.active !== false), [packs]);

  const handlePick = useCallback((payload: ContentDraggablePayload) => {
    setDraggedId(payload.id);
  }, []);

  const handleRelease = useCallback(() => {
    setDraggedId(null);
    setHoverTier(null);
  }, []);

  const handleDrop = useCallback(
    (tier: string, payload: ContentDraggablePayload) => {
      setDraggedId(null);
      setHoverTier(null);
      onMoveItem(payload.id, payload.source, tier);
    },
    [onMoveItem]
  );

  // ── Mode toggle buttons ─────────────────────────────────────
  const modeButton = (m: PackComposerMode, label: string, icon: React.ReactNode) => {
    const isActive = mode === m;
    return (
      <button
        key={m}
        onClick={() => onModeChange(m)}
        className="px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border-none transition-all"
        style={{
          background: isActive ? "rgba(212,175,55,0.12)" : "transparent",
          color: isActive ? "#D4AF37" : "var(--w3)",
        }}
        data-testid={`pack-composer-mode-${m}`}
      >
        {icon} {label}
      </button>
    );
  };

  // ── Render columns (kanban) ─────────────────────────────────
  const renderColumns = () => {
    const tierSlots = ["p0", "p1", "p2", "p3", "p4", "p5", "custom"];
    const activeTiers = tierSlots.filter(t => items.some(c => c.tier === t));
    if (activeTiers.length === 0) {
      return (
        <div className="py-16 text-center text-xs text-white/30">Aucun contenu</div>
      );
    }
    return (
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${activeTiers.length}, 1fr)` }}
        data-testid="pack-composer-columns"
      >
        {activeTiers.map(tier => {
          const tierItems = items.filter(c => c.tier === tier);
          const config = TIER_META[tier];
          const hex = TIER_HEX[tier] || "#888";
          const isDragOver = hoverTier === `col-${tier}`;
          return (
            <PackDropZone
              key={tier}
              tier={tier}
              onDropItem={handleDrop}
              onDragEnterZone={() => setHoverTier(`col-${tier}`)}
              onDragLeaveZone={() => setHoverTier(null)}
              className="flex flex-col rounded-xl overflow-hidden"
              style={{
                minHeight: "calc(100vh - 250px)",
                background: isDragOver ? `${hex}08` : "var(--w02)",
                border: isDragOver ? `2px dashed ${hex}` : "1px solid var(--w06)",
              }}
            >
              <div
                className="flex items-center gap-1.5 px-2.5 py-2 shrink-0"
                style={{ borderBottom: `2px solid ${hex}25` }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: hex }} />
                <span className="text-[11px] font-bold text-white truncate">
                  {config?.symbol} {config?.label || tier}
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
                  style={{ background: `${hex}18`, color: hex }}
                >
                  {tierItems.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5" style={{ scrollbarWidth: "thin" }}>
                <div className="grid grid-cols-3 gap-1">
                  {tierItems.map(item => (
                    <ContentDraggableItem
                      key={item.id}
                      id={item.id}
                      source={item.source}
                      onPick={handlePick}
                      onRelease={handleRelease}
                      isDragging={draggedId === item.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group"
                      style={{ border: "1px solid var(--w06)" }}
                    >
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        draggable={false}
                        onClick={() => onZoom?.(item.url)}
                      />
                      <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-80 transition-opacity p-0.5">
                        <GripVertical className="w-2.5 h-2.5 text-white drop-shadow-lg" />
                      </div>
                    </ContentDraggableItem>
                  ))}
                </div>
              </div>
            </PackDropZone>
          );
        })}
      </div>
    );
  };

  // ── Render folders (sidebar + grid) ─────────────────────────
  const renderFolders = () => {
    const filtered = selectedFolder === null ? items : items.filter(c => c.tier === selectedFolder);

    const folderRow = (folderId: string | null, label: string, count: number, hex: string, icon: React.ReactNode) => {
      const isSelected = selectedFolder === folderId;
      const dropTier = folderId ?? "p0"; // dropping on "Tout" defaults to p0
      const content = (
        <div
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
            isSelected ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"
          }`}
          style={
            hoverTier === (folderId ?? "all")
              ? { outline: `2px dashed ${hex}`, outlineOffset: "-2px", background: `${hex}10` }
              : undefined
          }
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: isSelected ? `${hex}20` : "var(--w04)" }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white">{label}</div>
            <div className="text-[10px] text-white/25">{count} medias</div>
          </div>
        </div>
      );
      return (
        <PackDropZone
          key={folderId ?? "all"}
          tier={dropTier}
          onDropItem={handleDrop}
          onDragEnterZone={() => setHoverTier(folderId ?? "all")}
          onDragLeaveZone={() => setHoverTier(null)}
          onClick={() => onSelectFolder(folderId)}
        >
          {content}
        </PackDropZone>
      );
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4" data-testid="pack-composer-folders">
        {/* Sidebar */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Dossiers</span>
            <span className="text-[10px] text-white/20 ml-auto">{items.length} fichiers</span>
          </div>
          {folderRow(null, "Tout le contenu", items.length, "#D4AF37", <Grid3x3 className="w-4 h-4 text-white/80" />)}
          {folderRow(
            "p0",
            "Public",
            items.filter(c => c.tier === "p0").length,
            "#64748B",
            <Eye className="w-4 h-4 text-white/80" />
          )}
          {activePacks.map(pack => {
            const hex = TIER_HEX[pack.id] || pack.color || "#888";
            const meta = TIER_META[pack.id];
            return folderRow(
              pack.id,
              pack.name,
              items.filter(c => c.tier === pack.id).length,
              hex,
              <span className="text-sm" style={{ color: hex }}>
                {meta?.symbol || "■"}
              </span>
            );
          })}
          {folderRow(
            "custom",
            "Custom",
            items.filter(c => c.tier === "custom").length,
            "#D4AF37",
            <Sparkles className="w-4 h-4 text-white/80" />
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-white/30">
              Aucun contenu dans ce dossier
            </div>
          ) : (
            filtered.map(item => {
              const hex = TIER_HEX[item.tier] || "#64748B";
              return (
                <ContentDraggableItem
                  key={item.id}
                  id={item.id}
                  source={item.source}
                  onPick={handlePick}
                  onRelease={handleRelease}
                  isDragging={draggedId === item.id}
                  className="aspect-[3/4] relative overflow-hidden rounded-xl group cursor-grab active:cursor-grabbing"
                  style={{ border: `1px solid ${hex}20` }}
                >
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity z-10">
                    <GripVertical className="w-3 h-3 text-white drop-shadow-lg" />
                  </div>
                  <img
                    src={item.url}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                    style={{ filter: "brightness(0.9)" }}
                    onClick={() => onZoom?.(item.url)}
                  />
                </ContentDraggableItem>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ── Render list (table with drop zones in "quick bar") ──────
  const renderList = () => {
    return (
      <div className="space-y-3" data-testid="pack-composer-list">
        {/* Quick drop bar — drag items here to move them */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold shrink-0 mr-1">
            Déposer dans :
          </span>
          {[{ id: "p0", label: "Public", hex: "#64748B" }, ...activePacks.map(p => ({ id: p.id, label: p.name, hex: TIER_HEX[p.id] || p.color || "#888" })), { id: "custom", label: "Custom", hex: "#D4AF37" }].map(target => {
            const isHover = hoverTier === `list-${target.id}`;
            return (
              <PackDropZone
                key={target.id}
                tier={target.id}
                onDropItem={handleDrop}
                onDragEnterZone={() => setHoverTier(`list-${target.id}`)}
                onDragLeaveZone={() => setHoverTier(null)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all"
                style={{
                  background: isHover ? `${target.hex}25` : `${target.hex}10`,
                  color: target.hex,
                  border: isHover ? `2px dashed ${target.hex}` : `1px solid ${target.hex}25`,
                }}
              >
                {target.label}
              </PackDropZone>
            );
          })}
        </div>

        {/* List rows */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2 w-16">Aperçu</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2">Source</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2">Dossier</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2 w-32">Id</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const hex = TIER_HEX[item.tier] || "#64748B";
                const meta = TIER_META[item.tier];
                return (
                  <ContentDraggableItem
                    key={item.id}
                    id={item.id}
                    source={item.source}
                    onPick={handlePick}
                    onRelease={handleRelease}
                    as="tr"
                    isDragging={draggedId === item.id}
                    className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <td className="px-4 py-2">
                      <div className="w-10 h-12 rounded-lg overflow-hidden cursor-pointer" onClick={() => onZoom?.(item.url)}>
                        <img
                          src={item.url}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ filter: "brightness(0.9)" }}
                          draggable={false}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase" style={{ background: "var(--w06)", color: "var(--w4)" }}>
                        {item.source}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: `${hex}15`, color: hex }}>
                        {meta?.symbol || ""} {meta?.label || item.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-[10px] font-mono text-white/30">{item.id.substring(0, 8)}…</span>
                    </td>
                  </ContentDraggableItem>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="pack-composer">
      {/* Header: mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Composer</span>
          <span className="text-[10px] text-white/20">{items.length} fichiers</span>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: "var(--w03)", border: "1px solid var(--w06)" }}>
          {modeButton("folders", "Dossiers", <Grid3x3 className="w-3 h-3 inline mr-0.5" />)}
          {modeButton("columns", "Colonnes", <Columns className="w-3 h-3 inline mr-0.5" />)}
          {modeButton("list", "Liste", <ListIcon className="w-3 h-3 inline mr-0.5" />)}
        </div>
      </div>

      {/* Body */}
      {mode === "folders" && renderFolders()}
      {mode === "columns" && renderColumns()}
      {mode === "list" && renderList()}
    </div>
  );
}

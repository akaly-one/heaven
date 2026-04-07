"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Image, Check, Trash2, Move, ZoomIn, ZoomOut, X, Settings2, GripVertical } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { PackConfigurator } from "@/components/cockpit/pack-configurator";
import type { FeedPost as Post, PackConfig } from "@/types/heaven";
import { DEFAULT_PACKS } from "@/constants/packs";
import { toSlot } from "@/lib/tier-utils";
import { toModelId } from "@/lib/model-utils";
import { TIER_CONFIG } from "@/constants/tiers";

// ── Constants ──

const TIER_SLOTS = ["p0", "p1", "p2", "p3", "p4", "p5"] as const;

// ── Component ──

export default function ContenuPage() {
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "";

  const [activeTab, setActiveTab] = useState<"contenu" | "packs">("contenu");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settingsPacks, setSettingsPacks] = useState<PackConfig[]>([]);

  // ── Drag & Drop state ──
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverTier, setDragOverTier] = useState<string | null>(null);

  // ── Crop state ──
  const [cropPost, setCropPost] = useState<Post | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 50, y: 50 });
  const cropDragging = useRef(false);
  const cropStart = useRef({ x: 0, y: 0, px: 50, py: 50 });

  // ── Fetch ──
  const fetchPosts = useCallback(() => {
    if (!modelSlug) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/posts?model=${toModelId(modelSlug)}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [modelSlug, authHeaders]);

  useEffect(() => {
    fetchPosts();
    if (modelSlug) {
      fetch(`/api/packs?model=${toModelId(modelSlug)}`, { headers: authHeaders() })
        .then(r => r.json())
        .then(d => setSettingsPacks(d.packs?.length ? d.packs : DEFAULT_PACKS))
        .catch(() => setSettingsPacks(DEFAULT_PACKS));
    }
  }, [fetchPosts, modelSlug, authHeaders]);

  // ── Group posts by tier ──
  const grouped = useMemo(() => {
    const g: Record<string, Post[]> = { p0: [], p1: [], p2: [], p3: [], p4: [], p5: [] };
    posts.filter((p) => p.media_url).forEach((p) => {
      const slot = toSlot(p.tier_required);
      if (g[slot]) g[slot].push(p);
      else g.p0.push(p);
    });
    return g;
  }, [posts]);

  const totalImages = posts.filter((p) => p.media_url).length;

  // ── Selection ──
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectNone = () => setSelected(new Set());

  // ── Single post tier change (drag & drop) ──
  const changePostTier = useCallback(async (postId: string, newTier: string) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, tier_required: newTier } : p));
    try {
      await fetch("/api/posts", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, model: toModelId(modelSlug), tier_required: newTier }),
      });
    } catch {
      fetchPosts();
    }
  }, [modelSlug, authHeaders, fetchPosts]);

  // ── Bulk tier change ──
  const changeBulkTier = async (newTier: string) => {
    setPosts((prev) => prev.map((p) => selected.has(p.id) ? { ...p, tier_required: newTier } : p));
    const ids = Array.from(selected);
    selectNone();
    try {
      for (const id of ids) {
        await fetch("/api/posts", {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ id, model: toModelId(modelSlug), tier_required: newTier }),
        });
      }
    } catch {
      fetchPosts();
    }
  };

  // ── Bulk delete ──
  const deleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.size} post(s) ?`)) return;
    const ids = Array.from(selected);
    setPosts((prev) => prev.filter((p) => !selected.has(p.id)));
    selectNone();
    for (const id of ids) {
      await fetch(`/api/posts?id=${id}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
    }
    fetchPosts();
  };

  // ── Drag & Drop handlers ──
  const onDragStart = useCallback((e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData("text/plain", postId);
    e.dataTransfer.effectAllowed = "move";
    setDragId(postId);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, tier: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTier(tier);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDragOverTier(null);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent, targetTier: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("text/plain");
    if (postId) {
      const post = posts.find((p) => p.id === postId);
      const currentTier = post ? toSlot(post.tier_required) : null;
      if (currentTier !== targetTier) {
        changePostTier(postId, targetTier);
      }
    }
    setDragId(null);
    setDragOverTier(null);
  }, [posts, changePostTier]);

  const onDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverTier(null);
  }, []);

  // ── Crop handlers ──
  const onCropMouseDown = (e: React.MouseEvent) => {
    cropDragging.current = true;
    cropStart.current = { x: e.clientX, y: e.clientY, px: cropPos.x, py: cropPos.y };
  };
  const onCropMouseMove = (e: React.MouseEvent) => {
    if (!cropDragging.current) return;
    const dx = ((e.clientX - cropStart.current.x) / 3) * -1;
    const dy = ((e.clientY - cropStart.current.y) / 3) * -1;
    setCropPos({
      x: Math.max(0, Math.min(100, cropStart.current.px + dx)),
      y: Math.max(0, Math.min(100, cropStart.current.py + dy)),
    });
  };
  const onCropMouseUp = () => { cropDragging.current = false; };

  // ── Loading ──
  if (loading) {
    return (
      <OsLayout cpId="agence">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Chargement...</span>
          </div>
        </div>
      </OsLayout>
    );
  }

  if (!modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Chargement...</p>
        </div>
      </OsLayout>
    );
  }

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen pb-28 md:pb-8">
        {/* ── Header ── */}
        <div className="px-4 md:px-8 pt-4 md:pt-8 pb-4">
          <div className="max-w-[100vw] flex items-center justify-between fade-up">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", boxShadow: "0 0 20px rgba(230,51,41,0.15)" }}
              >
                <Image className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Contenu</h1>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {totalImages} media{totalImages !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
              <button
                onClick={() => setActiveTab("contenu")}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                style={{ background: activeTab === "contenu" ? "var(--accent)" : "transparent", color: activeTab === "contenu" ? "#fff" : "var(--text-muted)", border: "none" }}
              >
                <Image className="w-3.5 h-3.5 inline mr-1" />Contenu
              </button>
              <button
                onClick={() => setActiveTab("packs")}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                style={{ background: activeTab === "packs" ? "var(--accent)" : "transparent", color: activeTab === "packs" ? "#fff" : "var(--text-muted)", border: "none" }}
              >
                <Settings2 className="w-3.5 h-3.5 inline mr-1" />Packs
              </button>
            </div>
          </div>
        </div>

        {/* ═══ PACKS TAB ═══ */}
        {activeTab === "packs" && (
          <div className="px-4 md:px-8">
            <div className="max-w-7xl mx-auto fade-up space-y-4">
              <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}>
                <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>Configuration des Packs</h3>
                <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
                  Modifie les prix, noms, contenus et options de chaque pack.
                </p>
                <PackConfigurator packs={settingsPacks} model={modelSlug} onSave={(updated) => setSettingsPacks(updated)} authHeaders={authHeaders} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ CONTENU TAB — KANBAN ═══ */}
        {activeTab === "contenu" && (
          <div className="fade-up">

            {/* ── Bulk actions bar ── */}
            {selected.size > 0 && (
              <div className="mx-4 md:mx-8 mb-3">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "var(--surface)", border: "1px solid var(--accent)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                >
                  <span className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>
                    {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
                  </span>
                  <div className="flex-1" />
                  <select
                    onChange={(e) => { if (e.target.value) changeBulkTier(e.target.value); e.target.value = ""; }}
                    className="text-[11px] px-2 py-1 rounded-lg cursor-pointer outline-none"
                    style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }}
                  >
                    <option value="">Déplacer vers...</option>
                    {TIER_SLOTS.map((t) => (
                      <option key={t} value={t}>{TIER_CONFIG[t]?.symbol} {TIER_CONFIG[t]?.label || t}</option>
                    ))}
                  </select>
                  <button onClick={deleteSelected} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={selectNone} className="cursor-pointer p-1" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Kanban columns — horizontal scroll ── */}
            <div className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-4 no-scrollbar" style={{ scrollSnapType: "x mandatory" }}>
              {TIER_SLOTS.map((tier) => {
                const tierPosts = grouped[tier] || [];
                const config = TIER_CONFIG[tier];
                const isDragOver = dragOverTier === tier;
                const accent = config?.hex || "#888";

                return (
                  <div
                    key={tier}
                    className="shrink-0 flex flex-col rounded-2xl transition-all duration-200"
                    style={{
                      width: "min(260px, 44vw)",
                      minHeight: "calc(100vh - 180px)",
                      background: isDragOver ? `${accent}08` : "var(--surface)",
                      border: isDragOver ? `2px dashed ${accent}` : "1px solid var(--border2)",
                      boxShadow: isDragOver ? `0 0 24px ${accent}30` : "none",
                      scrollSnapAlign: "start",
                    }}
                    onDragOver={(e) => onDragOver(e, tier)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, tier)}
                  >
                    {/* ── Column header ── */}
                    <div className="flex items-center gap-2 px-3 py-3 shrink-0" style={{ borderBottom: `2px solid ${accent}30` }}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent, boxShadow: `0 0 8px ${accent}55` }} />
                      <span className="text-[12px] font-bold truncate" style={{ color: "var(--text)" }}>
                        {config?.symbol} {config?.label || tier}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-auto"
                        style={{ background: `${accent}20`, color: accent }}
                      >
                        {tierPosts.length}
                      </span>
                    </div>

                    {/* ── Column body — scrollable grid ── */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-0" style={{ scrollbarWidth: "thin" }}>
                      {tierPosts.length === 0 ? (
                        <div
                          className="flex items-center justify-center rounded-xl h-32 transition-all"
                          style={{
                            border: isDragOver ? `1px dashed ${accent}80` : "1px dashed var(--border2)",
                            background: isDragOver ? `${accent}12` : "transparent",
                          }}
                        >
                          <p className="text-[11px]" style={{ color: isDragOver ? accent : "var(--text-muted)" }}>
                            {isDragOver ? "Déposer ici" : "Vide"}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          {tierPosts.map((post) => {
                            const isSelected = selected.has(post.id);
                            const isDragging = dragId === post.id;
                            return (
                              <div
                                key={post.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, post.id)}
                                onDragEnd={onDragEnd}
                                className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group"
                                style={{
                                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border2)",
                                  opacity: isDragging ? 0.35 : 1,
                                  transform: isDragging ? "scale(0.9) rotate(-2deg)" : "scale(1)",
                                  transition: "opacity 0.15s, transform 0.15s",
                                }}
                                onClick={() => toggleSelect(post.id)}
                              >
                                <img src={post.media_url!} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />

                                {/* Grip */}
                                <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-90 transition-opacity">
                                  <GripVertical className="w-3 h-3 drop-shadow-lg" style={{ color: "#fff" }} />
                                </div>

                                {/* Selection */}
                                {isSelected && (
                                  <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                                    <Check className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}

                                {/* Hover actions */}
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setCropPost(post); setCropZoom(1); setCropPos({ x: 50, y: 50 }); }}
                                    className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                                    style={{ background: "rgba(255,255,255,0.9)" }}
                                  >
                                    <Move className="w-2.5 h-2.5" style={{ color: "#333" }} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Text-only posts ── */}
            {posts.filter((p) => !p.media_url && p.content).length > 0 && (
              <div className="px-4 md:px-8 mt-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Posts texte ({posts.filter((p) => !p.media_url && p.content).length})
                </h3>
                <div className="space-y-1">
                  {posts.filter((p) => !p.media_url && p.content).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg group" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                      <p className="text-xs flex-1 truncate" style={{ color: "var(--text)" }}>{p.content}</p>
                      <span className="text-[11px] uppercase" style={{ color: "var(--text-muted)" }}>{TIER_CONFIG[toSlot(p.tier_required)]?.label || toSlot(p.tier_required)}</span>
                      <button
                        onClick={async () => { await fetch(`/api/posts?id=${p.id}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() }); fetchPosts(); }}
                        className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        style={{ background: "none", border: "none", color: "var(--text-muted)" }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Crop Modal ── */}
      {cropPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCropPost(null)}>
          <div className="w-[90vw] max-w-md rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Repositionner</h3>
              <button onClick={() => setCropPost(null)} className="cursor-pointer p-1 rounded-lg" style={{ background: "none", border: "none", color: "var(--text-muted)" }}><X className="w-4 h-4" /></button>
            </div>
            <div className="relative aspect-square rounded-xl overflow-hidden cursor-move mb-3" style={{ background: "#111" }} onMouseDown={onCropMouseDown} onMouseMove={onCropMouseMove} onMouseUp={onCropMouseUp} onMouseLeave={onCropMouseUp}>
              <img src={cropPost.media_url!} alt="" className="w-full h-full object-cover select-none pointer-events-none" style={{ transform: `scale(${cropZoom})`, objectPosition: `${cropPos.x}% ${cropPos.y}%`, transition: cropDragging.current ? "none" : "transform 0.2s" }} draggable={false} />
            </div>
            <div className="flex items-center gap-3">
              <ZoomOut className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(e) => setCropZoom(parseFloat(e.target.value))} className="flex-1 accent-[var(--accent)]" />
              <ZoomIn className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-[11px] text-center mt-2" style={{ color: "var(--text-muted)" }}>Glisser pour repositionner, slider pour zoomer</p>
          </div>
        </div>
      )}
    </OsLayout>
  );
}

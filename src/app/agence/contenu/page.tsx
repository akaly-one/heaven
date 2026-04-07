"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Image, Check, Trash2, X, Settings2, GripVertical } from "lucide-react";
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

  // ── Zoom lightbox ──
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

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
  const activeTiers = TIER_SLOTS.filter(t => (grouped[t]?.length || 0) > 0);
  const emptyTiers = TIER_SLOTS.filter(t => (grouped[t]?.length || 0) === 0);

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
        {/* ── Header — full width ── */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))" }}
              >
                <Image className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold" style={{ color: "var(--text)" }}>Contenu</h1>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{totalImages} médias</p>
              </div>
            </div>
            <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
              <button onClick={() => setActiveTab("contenu")}
                className="px-2.5 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-all"
                style={{ background: activeTab === "contenu" ? "var(--accent)" : "transparent", color: activeTab === "contenu" ? "#fff" : "var(--text-muted)", border: "none" }}>
                Contenu
              </button>
              <button onClick={() => setActiveTab("packs")}
                className="px-2.5 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-all"
                style={{ background: activeTab === "packs" ? "var(--accent)" : "transparent", color: activeTab === "packs" ? "#fff" : "var(--text-muted)", border: "none" }}>
                Packs
              </button>
            </div>
          </div>
        </div>

        {/* ═══ PACKS TAB ═══ */}
        {activeTab === "packs" && (
          <div className="px-3">
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}>
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>Configuration des Packs</h3>
              <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>Modifie les prix, noms, contenus et options de chaque pack.</p>
              <PackConfigurator packs={settingsPacks} model={modelSlug} onSave={(updated) => setSettingsPacks(updated)} authHeaders={authHeaders} />
            </div>
          </div>
        )}

        {/* ═══ CONTENU TAB — KANBAN FULL WIDTH ═══ */}
        {activeTab === "contenu" && (
          <div className="fade-up">

            {/* ── Bulk actions bar ── */}
            {selected.size > 0 && (
              <div className="mx-3 mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: "var(--surface)", border: "1px solid var(--accent)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                  <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>
                    {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
                  </span>
                  <div className="flex-1" />
                  <select onChange={(e) => { if (e.target.value) changeBulkTier(e.target.value); e.target.value = ""; }}
                    className="text-[10px] px-2 py-1 rounded-lg cursor-pointer outline-none"
                    style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }}>
                    <option value="">Déplacer vers...</option>
                    {TIER_SLOTS.map((t) => (
                      <option key={t} value={t}>{TIER_CONFIG[t]?.symbol} {TIER_CONFIG[t]?.label || t}</option>
                    ))}
                  </select>
                  <button onClick={deleteSelected} className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button onClick={selectNone} className="cursor-pointer p-0.5" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Empty tiers — collapsed pills row (drop targets) ── */}
            {emptyTiers.length > 0 && (
              <div className="flex gap-1.5 px-3 mb-2 flex-wrap">
                {emptyTiers.map(tier => {
                  const config = TIER_CONFIG[tier];
                  const accent = config?.hex || "#888";
                  const isDragOver = dragOverTier === tier;
                  return (
                    <div
                      key={tier}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 shrink-0"
                      style={{
                        background: isDragOver ? `${accent}20` : "var(--bg3)",
                        border: isDragOver ? `2px dashed ${accent}` : "1px solid var(--border2)",
                        boxShadow: isDragOver ? `0 0 12px ${accent}30` : "none",
                      }}
                      onDragOver={(e) => onDragOver(e, tier)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, tier)}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
                      <span className="text-[10px] font-medium" style={{ color: isDragOver ? accent : "var(--text-muted)" }}>
                        {config?.label || tier}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Kanban columns — only tiers with content, fill all width ── */}
            <div
              className="grid gap-2 px-3 pb-4"
              style={{
                gridTemplateColumns: `repeat(${Math.max(activeTiers.length, 1)}, 1fr)`,
              }}
            >
              {activeTiers.map((tier) => {
                const tierPosts = grouped[tier] || [];
                const config = TIER_CONFIG[tier];
                const isDragOver = dragOverTier === tier;
                const accent = config?.hex || "#888";

                return (
                  <div
                    key={tier}
                    className="flex flex-col rounded-xl overflow-hidden transition-all duration-150"
                    style={{
                      minHeight: "calc(100vh - 200px)",
                      background: isDragOver ? `${accent}06` : "var(--surface)",
                      border: isDragOver ? `2px dashed ${accent}` : "1px solid var(--border2)",
                      boxShadow: isDragOver ? `0 0 16px ${accent}25` : "none",
                    }}
                    onDragOver={(e) => onDragOver(e, tier)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, tier)}
                  >
                    {/* Column header */}
                    <div className="flex items-center gap-1.5 px-2 py-2 shrink-0" style={{ borderBottom: `2px solid ${accent}25` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}55` }} />
                      <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>
                        {config?.symbol} {config?.label || tier}
                      </span>
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded-full ml-auto shrink-0" style={{ background: `${accent}18`, color: accent }}>
                        {tierPosts.length}
                      </span>
                    </div>

                    {/* Column body — small cubes grid */}
                    <div className="flex-1 overflow-y-auto p-1.5" style={{ scrollbarWidth: "thin" }}>
                      <div className="grid grid-cols-3 gap-1">
                        {tierPosts.map((post) => {
                          const isSelected = selected.has(post.id);
                          const isDragging = dragId === post.id;
                          return (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={(e) => onDragStart(e, post.id)}
                              onDragEnd={onDragEnd}
                              className="relative aspect-square rounded-md overflow-hidden cursor-grab active:cursor-grabbing group"
                              style={{
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border2)",
                                opacity: isDragging ? 0.3 : 1,
                                transform: isDragging ? "scale(0.85) rotate(-3deg)" : "scale(1)",
                                transition: "opacity 0.15s, transform 0.15s",
                              }}
                            >
                              <img src={post.media_url!} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />

                              {/* Grip on hover */}
                              <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-80 transition-opacity p-0.5">
                                <GripVertical className="w-2.5 h-2.5 drop-shadow-lg" style={{ color: "#fff" }} />
                              </div>

                              {/* Selection check */}
                              {isSelected && (
                                <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              )}

                              {/* Click overlay — zoom on click, select on shift/ctrl */}
                              <div
                                className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center"
                                onClick={(e) => {
                                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                    toggleSelect(post.id);
                                  } else {
                                    setZoomUrl(post.media_url!);
                                  }
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Fallback if no active tiers */}
              {activeTiers.length === 0 && (
                <div className="col-span-full flex items-center justify-center py-20 rounded-xl" style={{ background: "var(--bg3)", border: "1px dashed var(--border2)" }}>
                  <div className="text-center">
                    <Image className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)", opacity: 0.4 }} />
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Aucun média</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Text-only posts ── */}
            {posts.filter((p) => !p.media_url && p.content).length > 0 && (
              <div className="px-3 mt-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  Posts texte ({posts.filter((p) => !p.media_url && p.content).length})
                </h3>
                <div className="space-y-1">
                  {posts.filter((p) => !p.media_url && p.content).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg group" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                      <p className="text-[10px] flex-1 truncate" style={{ color: "var(--text)" }}>{p.content}</p>
                      <span className="text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>{TIER_CONFIG[toSlot(p.tier_required)]?.label || toSlot(p.tier_required)}</span>
                      <button onClick={async () => { await fetch(`/api/posts?id=${p.id}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() }); fetchPosts(); }}
                        className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Zoom Lightbox ── */}
      {zoomUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" onClick={() => setZoomUrl(null)}>
          <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-10" style={{ background: "rgba(255,255,255,0.15)", border: "none" }} onClick={() => setZoomUrl(null)}>
            <X className="w-4 h-4 text-white" />
          </button>
          <img src={zoomUrl} alt="" className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg" style={{ boxShadow: "0 0 60px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </OsLayout>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Image, Check, Trash2, Move, ZoomIn, ZoomOut, X, Settings2 } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { PackConfigurator } from "@/components/cockpit/pack-configurator";
import type { FeedPost as Post, PackConfig } from "@/types/heaven";
import { DEFAULT_PACKS } from "@/constants/packs";

// ── Constants ──

const TIERS = ["all", "public", "silver", "gold", "black", "feet", "platinum"] as const;
type TierFilter = (typeof TIERS)[number];

const TIER_LABELS: Record<string, string> = {
  all: "Tout",
  public: "Public",
  silver: "♣ Silver",
  gold: "♦ Gold",
  black: "♠ VIP Black",
  feet: "🦶 Feet",
  platinum: "♥ Platinum",
};

// ── Component ──

export default function ContenuPage() {
  const { currentModel, auth, authHeaders, isRoot } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "";

  const [activeTab, setActiveTab] = useState<"contenu" | "packs">("contenu");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<TierFilter>("all");
  const [settingsPacks, setSettingsPacks] = useState<PackConfig[]>([]);
  const [cropPost, setCropPost] = useState<Post | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 50, y: 50 });
  const cropDragging = useRef(false);
  const cropStart = useRef({ x: 0, y: 0, px: 50, py: 50 });

  // ── Fetch posts ──
  const fetchPosts = useCallback(() => {
    if (!modelSlug) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/posts?model=${modelSlug}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [modelSlug, authHeaders]);

  useEffect(() => {
    fetchPosts();
    // Fetch packs
    if (modelSlug) {
      fetch(`/api/packs?model=${modelSlug}`, { headers: authHeaders() })
        .then(r => r.json())
        .then(d => setSettingsPacks(d.packs?.length ? d.packs : DEFAULT_PACKS))
        .catch(() => setSettingsPacks(DEFAULT_PACKS));
    }
  }, [fetchPosts, modelSlug, authHeaders]);

  // ── Derived data ──
  const imagePosts = posts.filter((p) => p.media_url);
  const filtered = filter === "all" ? imagePosts : imagePosts.filter((p) => (p.tier_required || "public") === filter);
  const tierCount = (t: TierFilter) => (t === "all" ? imagePosts.length : imagePosts.filter((p) => (p.tier_required || "public") === t).length);

  // ── Selection ──
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectAll = () => setSelected(new Set(filtered.map((p) => p.id)));
  const selectNone = () => setSelected(new Set());

  // ── Bulk actions ──
  const deleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.size} post(s) ?`)) return;
    for (const id of selected) {
      await fetch(`/api/posts?id=${id}&model=${modelSlug}`, { method: "DELETE", headers: authHeaders() });
    }
    selectNone();
    fetchPosts();
  };

  const changeTier = async (newTier: string) => {
    for (const id of selected) {
      await fetch("/api/posts", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id, model: modelSlug, updates: { tier_required: newTier } }),
      });
    }
    selectNone();
    fetchPosts();
  };

  // ── Crop drag handlers ──
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
  const onCropMouseUp = () => {
    cropDragging.current = false;
  };

  // ── Loading state ──
  if (loading) {
    return (
      <OsLayout cpId="agence">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
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
          <div className="max-w-7xl mx-auto flex items-center justify-between fade-up">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", boxShadow: "0 0 20px rgba(230,51,41,0.15)" }}
              >
                <Image className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Contenu</h1>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {imagePosts.length} media{imagePosts.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {/* Tab switcher: Contenu | Packs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
              <button
                onClick={() => setActiveTab("contenu")}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                style={{
                  background: activeTab === "contenu" ? "var(--accent)" : "transparent",
                  color: activeTab === "contenu" ? "#fff" : "var(--text-muted)",
                  border: "none",
                }}
              >
                <Image className="w-3.5 h-3.5 inline mr-1" />
                Contenu
              </button>
              <button
                onClick={() => setActiveTab("packs")}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
                style={{
                  background: activeTab === "packs" ? "var(--accent)" : "transparent",
                  color: activeTab === "packs" ? "#fff" : "var(--text-muted)",
                  border: "none",
                }}
              >
                <Settings2 className="w-3.5 h-3.5 inline mr-1" />
                Packs
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8">
          <div className="max-w-7xl mx-auto fade-up">

            {/* ═══ PACKS TAB ═══ */}
            {activeTab === "packs" && (
              <div className="space-y-4">
                <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}>
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>Configuration des Packs</h3>
                  <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
                    Modifie les prix, noms, contenus et options de chaque pack. Les changements sont synchronises en temps reel avec le profil public.
                  </p>
                  <PackConfigurator
                    packs={settingsPacks}
                    model={modelSlug}
                    onSave={(updated) => setSettingsPacks(updated)}
                    authHeaders={authHeaders}
                  />
                </div>
              </div>
            )}

            {/* ═══ CONTENU TAB ═══ */}
            {activeTab === "contenu" && (<>
            {/* ── Bulk actions bar ── */}
            {selected.size > 0 && (
              <div
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
                style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
              >
                <span className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>
                  {selected.size} selectionne{selected.size > 1 ? "s" : ""}
                </span>
                <div className="flex-1" />
                <select
                  onChange={(e) => {
                    if (e.target.value) changeTier(e.target.value);
                    e.target.value = "";
                  }}
                  className="text-[11px] px-2 py-1 rounded-lg cursor-pointer outline-none"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }}
                >
                  <option value="">Changer tier...</option>
                  {TIERS.filter((t) => t !== "all").map((t) => (
                    <option key={t} value={t}>{TIER_LABELS[t]}</option>
                  ))}
                </select>
                <button
                  onClick={deleteSelected}
                  className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                  style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={selectNone} className="cursor-pointer p-1" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── Tier filter bar ── */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
              {TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setFilter(t); selectNone(); }}
                  className="px-3 py-2 rounded-lg text-[11px] font-medium cursor-pointer shrink-0 transition-all"
                  style={{
                    background: filter === t ? "var(--accent)" : "var(--bg3)",
                    color: filter === t ? "#fff" : "var(--text-muted)",
                    border: filter === t ? "none" : "1px solid var(--border2)",
                  }}
                >
                  {TIER_LABELS[t]} ({tierCount(t)})
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={selected.size === filtered.length && filtered.length > 0 ? selectNone : selectAll}
                className="px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer shrink-0"
                style={{ background: "var(--bg3)", color: "var(--text-muted)", border: "1px solid var(--border2)" }}
              >
                {selected.size === filtered.length && filtered.length > 0 ? "Aucun" : "Tout"}
              </button>
            </div>

            {/* ── Empty state ── */}
            {filtered.length === 0 && (
              <div className="rounded-xl p-12 text-center" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                <Image className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Aucun media</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                  Les contenus apparaitront ici une fois publies
                </p>
              </div>
            )}

            {/* ── Media grid ── */}
            {filtered.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                {filtered.map((post) => {
                  const isSelected = selected.has(post.id);
                  const tier = post.tier_required || "public";
                  return (
                    <div
                      key={post.id}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => toggleSelect(post.id)}
                      style={{ border: isSelected ? "3px solid var(--accent)" : "1px solid var(--border2)" }}
                    >
                      <img src={post.media_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
                      {isSelected && (
                        <div
                          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "var(--accent)" }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {tier !== "public" && (
                        <span
                          className="absolute bottom-1.5 right-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md uppercase"
                          style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}
                        >
                          {tier}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCropPost(post);
                            setCropZoom(1);
                            setCropPos({ x: 50, y: 50 });
                          }}
                          className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                          style={{ background: "rgba(255,255,255,0.9)" }}
                        >
                          <Move className="w-3.5 h-3.5" style={{ color: "#333" }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Text-only posts ── */}
            {posts.filter((p) => !p.media_url && p.content).length > 0 && (
              <div className="mt-6">
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Posts texte ({posts.filter((p) => !p.media_url && p.content).length})
                </h3>
                <div className="space-y-1">
                  {posts
                    .filter((p) => !p.media_url && p.content)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg group"
                        style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
                      >
                        <p className="text-xs flex-1 truncate" style={{ color: "var(--text)" }}>{p.content}</p>
                        <span className="text-[11px] uppercase" style={{ color: "var(--text-muted)" }}>{p.tier_required || "public"}</span>
                        <button
                          onClick={async () => {
                            await fetch(`/api/posts?id=${p.id}&model=${modelSlug}`, { method: "DELETE", headers: authHeaders() });
                            fetchPosts();
                          }}
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
            </>)}
          </div>
        </div>
      </div>

      {/* ── Crop/Reposition Modal ── */}
      {cropPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCropPost(null)}>
          <div
            className="w-[90vw] max-w-md rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Repositionner</h3>
              <button onClick={() => setCropPost(null)} className="cursor-pointer p-1 rounded-lg" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className="relative aspect-square rounded-xl overflow-hidden cursor-move mb-3"
              style={{ background: "#111" }}
              onMouseDown={onCropMouseDown}
              onMouseMove={onCropMouseMove}
              onMouseUp={onCropMouseUp}
              onMouseLeave={onCropMouseUp}
            >
              <img
                src={cropPost.media_url!}
                alt=""
                className="w-full h-full object-cover select-none pointer-events-none"
                style={{
                  transform: `scale(${cropZoom})`,
                  objectPosition: `${cropPos.x}% ${cropPos.y}%`,
                  transition: cropDragging.current ? "none" : "transform 0.2s",
                }}
                draggable={false}
              />
            </div>
            <div className="flex items-center gap-3">
              <ZoomOut className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
              <ZoomIn className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-[11px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
              Glisser pour repositionner, slider pour zoomer
            </p>
          </div>
        </div>
      )}
    </OsLayout>
  );
}

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  TrendingUp,
  Camera,
  Video,
  Film,
  Radio,
  Sparkles,
  Package,
  Plus,
  X,
  ChevronDown,
  Eye,
  Heart,
  DollarSign,
  Calendar,
  Target,
  Globe,
  Users,
  BarChart3,
  ArrowRight,
  Image,
  Trash2,
  Check,
  ZoomIn,
  ZoomOut,
  Move,
  Layers,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";

import type { ContentItem, PlatformAccount, Goal, FeedPost as Post } from "@/types/heaven";
import { TIER_COLORS, PLATFORM_COLORS } from "@/constants/tiers";

// ── Constants ──

const STAGES = [
  { id: "idea", label: "Idee", color: "#64748B" },
  { id: "planned", label: "Planifie", color: "#7C3AED" },
  { id: "shooting", label: "Shooting", color: "#F59E0B" },
  { id: "editing", label: "Montage", color: "#F97316" },
  { id: "ready", label: "Pret", color: "#10B981" },
  { id: "published", label: "Publie", color: "#C9A84C" },
];

const CONTENT_TYPES: Record<string, { icon: typeof Camera; label: string }> = {
  photo_set: { icon: Camera, label: "Photos" },
  video: { icon: Video, label: "Video" },
  story: { icon: Sparkles, label: "Story" },
  reel: { icon: Film, label: "Reel" },
  live: { icon: Radio, label: "Live" },
  custom: { icon: Package, label: "Custom" },
};

const CATEGORY_ICONS: Record<string, typeof DollarSign> = {
  revenue: DollarSign,
  subscribers: Users,
  content: Camera,
  engagement: Heart,
  platform: Globe,
};

type TabId = "pipeline" | "galerie" | "plateformes" | "objectifs";

const TABS: { id: TabId; label: string; icon: typeof Layers }[] = [
  { id: "pipeline", label: "Pipeline", icon: Layers },
  { id: "galerie", label: "Galerie", icon: Image },
  { id: "plateformes", label: "Plateformes", icon: Globe },
  { id: "objectifs", label: "Objectifs", icon: Target },
];

// ── Component ──

export default function ContenuPage() {
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [activeTab, setActiveTab] = useState<TabId>("pipeline");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformAccount[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Media gallery state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "public" | "vip" | "gold" | "diamond" | "platinum">("all");
  const [cropPost, setCropPost] = useState<Post | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 50, y: 50 });
  const cropDragging = useRef(false);
  const cropStart = useRef({ x: 0, y: 0, px: 50, py: 50 });

  // Modal state
  const [showAddContent, setShowAddContent] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddPlatform, setShowAddPlatform] = useState(false);

  // Form state for new content
  const [newContent, setNewContent] = useState({
    title: "",
    content_type: "photo_set",
    platforms: [] as string[],
    stage: "idea",
    tier: "",
    scheduled_date: "",
    price: "",
    notes: "",
  });

  // Form state for new goal
  const [newGoal, setNewGoal] = useState({
    title: "",
    category: "revenue",
    target_value: "",
    unit: "EUR",
    deadline: "",
  });

  // Form state for new platform
  const [newPlatform, setNewPlatform] = useState({
    platform: "onlyfans",
    handle: "",
    profile_url: "",
    subscribers_count: "",
    monthly_revenue: "",
    commission_rate: "25",
  });

  // ── Fetch pipeline data ──
  const fetchData = useCallback(() => {
    const headers = authHeaders();
    setLoading(true);

    Promise.all([
      fetch(`/api/pipeline?model=${modelSlug}`, { headers }).then((r) => r.json()),
      fetch(`/api/pipeline/platforms?model=${modelSlug}`, { headers }).then((r) => r.json()),
      fetch(`/api/pipeline/goals?model=${modelSlug}`, { headers }).then((r) => r.json()),
    ])
      .then(([contentData, platformData, goalsData]) => {
        setItems(contentData.items || []);
        setPlatforms(platformData.accounts || []);
        setGoals(goalsData.goals || []);
      })
      .catch((err) => console.error("[Pipeline] Failed to fetch:", err))
      .finally(() => setLoading(false));
  }, [modelSlug, authHeaders]);

  // ── Fetch media posts ──
  const fetchPosts = useCallback(() => {
    fetch(`/api/posts?model=${modelSlug}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [modelSlug, authHeaders]);

  useEffect(() => {
    fetchData();
    fetchPosts();
  }, [fetchData, fetchPosts]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const publishedThisMonth = items.filter(
      (i) => i.stage === "published" && i.published_date && i.published_date.startsWith(thisMonth)
    ).length;
    const revenueThisMonth = items
      .filter((i) => i.published_date && i.published_date.startsWith(thisMonth))
      .reduce((sum, i) => sum + (i.revenue || 0), 0);
    const totalViews = items.reduce((sum, i) => sum + (i.views || 0), 0);
    const totalLikes = items.reduce((sum, i) => sum + (i.likes || 0), 0);
    const avgEngagement = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : "0";
    return { total: items.length, publishedThisMonth, revenueThisMonth, avgEngagement };
  }, [items]);

  // ── Stage move handler ──
  const moveStage = useCallback(
    (itemId: string, newStage: string) => {
      const headers = authHeaders();
      const updates: Record<string, unknown> = { id: itemId, stage: newStage };
      if (newStage === "published") {
        updates.published_date = new Date().toISOString().split("T")[0];
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                stage: newStage,
                published_date:
                  newStage === "published" ? new Date().toISOString().split("T")[0] : i.published_date,
              }
            : i
        )
      );
      fetch("/api/pipeline", { method: "PUT", headers, body: JSON.stringify(updates) });
    },
    [authHeaders]
  );

  // ── Create content ──
  const handleCreateContent = useCallback(() => {
    if (!newContent.title.trim()) return;
    const headers = authHeaders();
    const payload = {
      model_slug: modelSlug,
      title: newContent.title.trim(),
      content_type: newContent.content_type,
      platforms: newContent.platforms,
      stage: newContent.stage,
      tier: newContent.tier || null,
      scheduled_date: newContent.scheduled_date || null,
      price: newContent.price ? parseFloat(newContent.price) : null,
      notes: newContent.notes || null,
    };
    fetch("/api/pipeline", { method: "POST", headers, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((data) => {
        if (data.item) setItems((prev) => [data.item, ...prev]);
        setShowAddContent(false);
        setNewContent({ title: "", content_type: "photo_set", platforms: [], stage: "idea", tier: "", scheduled_date: "", price: "", notes: "" });
      })
      .catch((err) => console.error("[Pipeline] Create error:", err));
  }, [newContent, modelSlug, authHeaders]);

  // ── Create goal ──
  const handleCreateGoal = useCallback(() => {
    if (!newGoal.title.trim()) return;
    const headers = authHeaders();
    const payload = {
      model_slug: modelSlug,
      title: newGoal.title.trim(),
      category: newGoal.category,
      target_value: newGoal.target_value ? parseFloat(newGoal.target_value) : 0,
      unit: newGoal.unit,
      deadline: newGoal.deadline || null,
    };
    fetch("/api/pipeline/goals", { method: "POST", headers, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((data) => {
        if (data.goal) setGoals((prev) => [data.goal, ...prev]);
        setShowAddGoal(false);
        setNewGoal({ title: "", category: "revenue", target_value: "", unit: "EUR", deadline: "" });
      })
      .catch((err) => console.error("[Pipeline] Goal create error:", err));
  }, [newGoal, modelSlug, authHeaders]);

  // ── Create platform ──
  const handleCreatePlatform = useCallback(() => {
    if (!newPlatform.handle.trim()) return;
    const headers = authHeaders();
    const payload = {
      model_slug: modelSlug,
      platform: newPlatform.platform,
      handle: newPlatform.handle.trim(),
      profile_url: newPlatform.profile_url || null,
      subscribers_count: newPlatform.subscribers_count ? parseInt(newPlatform.subscribers_count) : 0,
      monthly_revenue: newPlatform.monthly_revenue ? parseFloat(newPlatform.monthly_revenue) : 0,
      commission_rate: newPlatform.commission_rate ? parseFloat(newPlatform.commission_rate) : 25,
    };
    fetch("/api/pipeline/platforms", { method: "POST", headers, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((data) => {
        if (data.account) setPlatforms((prev) => [...prev, data.account]);
        setShowAddPlatform(false);
        setNewPlatform({ platform: "onlyfans", handle: "", profile_url: "", subscribers_count: "", monthly_revenue: "", commission_rate: "25" });
      })
      .catch((err) => console.error("[Pipeline] Platform create error:", err));
  }, [newPlatform, modelSlug, authHeaders]);

  // ── Toggle platform in content form ──
  const togglePlatform = (p: string) => {
    setNewContent((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }));
  };

  // ── Kanban grouping ──
  const itemsByStage = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    for (const s of STAGES) grouped[s.id] = items.filter((i) => i.stage === s.id);
    return grouped;
  }, [items]);

  const getNextStage = (current: string): string | null => {
    const idx = STAGES.findIndex((s) => s.id === current);
    if (idx < 0 || idx >= STAGES.length - 1) return null;
    return STAGES[idx + 1].id;
  };

  // ── Media gallery helpers ──
  const imagePosts = posts.filter((p) => p.media_url);
  const filtered = filter === "all" ? imagePosts : imagePosts.filter((p) => (p.tier_required || "public") === filter);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const selectAll = () => setSelected(new Set(filtered.map((p) => p.id)));
  const selectNone = () => setSelected(new Set());

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
      await fetch("/api/posts", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ id, model: modelSlug, updates: { tier_required: newTier } }) });
    }
    selectNone();
    fetchPosts();
  };

  // ── Tab action button ──
  const tabAction = () => {
    switch (activeTab) {
      case "pipeline":
        return (
          <button
            onClick={() => setShowAddContent(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">Contenu</span>
          </button>
        );
      case "plateformes":
        return (
          <button
            onClick={() => setShowAddPlatform(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", color: "var(--text-muted)" }}
          >
            <Plus className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Ajouter</span>
          </button>
        );
      case "objectifs":
        return (
          <button
            onClick={() => setShowAddGoal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", color: "var(--text-muted)" }}
          >
            <Plus className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Objectif</span>
          </button>
        );
      default:
        return null;
    }
  };

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

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen pb-28 md:pb-8">
        {/* ── Header ── */}
        <div className="px-4 md:px-8 pt-4 md:pt-8 pb-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between fade-up">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", boxShadow: "0 0 20px rgba(230,51,41,0.15)" }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Contenu</h1>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{modelSlug.toUpperCase()} — Pipeline & Media</p>
              </div>
            </div>
            {tabAction()}
          </div>
        </div>

        {/* ── Sticky Tab Bar ── */}
        <div className="sticky top-0 z-30" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border2)" }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex gap-0 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-3 cursor-pointer transition-all shrink-0 relative"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">{tab.label}</span>
                    {/* Active indicator */}
                    {active && (
                      <div
                        className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                        style={{ background: "var(--accent)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="px-4 md:px-8 pt-5">
          <div className="max-w-7xl mx-auto">
            {/* ══════ TAB: Pipeline ══════ */}
            {activeTab === "pipeline" && (
              <div className="space-y-5 fade-up">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard label="Total contenus" value={String(kpis.total)} icon={Package} color="var(--accent)" />
                  <KpiCard label="Publie ce mois" value={String(kpis.publishedThisMonth)} icon={Eye} color="#10B981" />
                  <KpiCard label="Revenu ce mois" value={`${kpis.revenueThisMonth.toFixed(0)} EUR`} icon={DollarSign} color="var(--rose)" />
                  <KpiCard label="Engagement moy." value={`${kpis.avgEngagement}%`} icon={Heart} color="#7C3AED" />
                </div>

                {/* Kanban Board */}
                <div>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>Pipeline de contenu</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                    {STAGES.map((stage) => (
                      <div
                        key={stage.id}
                        className="flex-shrink-0 w-[220px] md:w-[200px] rounded-xl p-3"
                        style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: stage.color }}>
                              {stage.label}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                            style={{ background: `${stage.color}15`, color: stage.color }}
                          >
                            {itemsByStage[stage.id]?.length || 0}
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {(itemsByStage[stage.id] || []).map((item) => {
                            const typeInfo = CONTENT_TYPES[item.content_type] || CONTENT_TYPES.custom;
                            const TypeIcon = typeInfo.icon;
                            const nextStage = getNextStage(item.stage);
                            return (
                              <div
                                key={item.id}
                                className="rounded-lg p-2.5 group"
                                style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
                              >
                                <div className="flex items-start justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <TypeIcon className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                                    <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text)" }}>
                                      {item.title}
                                    </span>
                                  </div>
                                  {nextStage && (
                                    <button
                                      onClick={() => moveStage(item.id, nextStage)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                                      style={{ color: "var(--accent)" }}
                                      title={`Avancer vers ${STAGES.find((s) => s.id === nextStage)?.label}`}
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                {item.platforms && item.platforms.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-1.5">
                                    {item.platforms.map((p: string) => (
                                      <span
                                        key={p}
                                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                                        style={{ background: `${PLATFORM_COLORS[p] || "#666"}20`, color: PLATFORM_COLORS[p] || "#666" }}
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  {item.tier && (
                                    <span
                                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                                      style={{ background: `${TIER_COLORS[item.tier] || "#666"}20`, color: TIER_COLORS[item.tier] || "#666" }}
                                    >
                                      {item.tier}
                                    </span>
                                  )}
                                  {item.scheduled_date && (
                                    <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                                      <Calendar className="w-2.5 h-2.5" />
                                      {item.scheduled_date}
                                    </span>
                                  )}
                                </div>
                                {item.stage === "published" && (
                                  <div className="flex items-center gap-2 mt-1.5 pt-1.5" style={{ borderTop: "1px solid var(--border2)" }}>
                                    <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                                      <Eye className="w-2.5 h-2.5" />
                                      {item.views}
                                    </span>
                                    <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                                      <Heart className="w-2.5 h-2.5" />
                                      {item.likes}
                                    </span>
                                    {item.revenue > 0 && (
                                      <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--accent)" }}>
                                        <DollarSign className="w-2.5 h-2.5" />
                                        {item.revenue}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══════ TAB: Galerie ══════ */}
            {activeTab === "galerie" && (
              <div className="fade-up">
                {/* Selection bar */}
                {selected.size > 0 && (
                  <div
                    className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
                    style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>{selected.size} selectionne(s)</span>
                    <div className="flex-1" />
                    <select
                      onChange={(e) => { if (e.target.value) changeTier(e.target.value); e.target.value = ""; }}
                      className="text-[10px] px-2 py-1 rounded-lg cursor-pointer outline-none"
                      style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }}
                    >
                      <option value="">Changer tier...</option>
                      <option value="public">Public</option>
                      <option value="vip">VIP</option>
                      <option value="gold">Gold</option>
                      <option value="diamond">Diamond</option>
                      <option value="platinum">Platinum</option>
                    </select>
                    <button
                      onClick={deleteSelected}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                      style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button onClick={selectNone} className="cursor-pointer p-1" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Tier filter bar */}
                <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
                  {(["all", "public", "vip", "gold", "diamond", "platinum"] as const).map((t) => {
                    const count = t === "all" ? imagePosts.length : imagePosts.filter((p) => (p.tier_required || "public") === t).length;
                    return (
                      <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer shrink-0 transition-all"
                        style={{
                          background: filter === t ? "var(--accent)" : "var(--bg3)",
                          color: filter === t ? "#fff" : "var(--text-muted)",
                          border: filter === t ? "none" : "1px solid var(--border2)",
                        }}
                      >
                        {t === "all" ? "Tout" : t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                      </button>
                    );
                  })}
                  <div className="flex-1" />
                  <button
                    onClick={selected.size === filtered.length ? selectNone : selectAll}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer shrink-0"
                    style={{ background: "var(--bg3)", color: "var(--text-muted)", border: "1px solid var(--border2)" }}
                  >
                    {selected.size === filtered.length ? "Aucun" : "Tout"}
                  </button>
                </div>

                {postsLoading && (
                  <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Chargement...</p>
                )}

                {!postsLoading && filtered.length === 0 && (
                  <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                    <Image className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun media</p>
                  </div>
                )}

                {/* Responsive grid: 2-col mobile, 3-col tablet, 4-col desktop, 5-col wide */}
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
                            className="absolute bottom-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}
                          >
                            {tier === "vip" ? "VIP" : tier === "gold" ? "GOLD" : tier === "diamond" ? "DIAMOND" : "PLATINUM"}
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
                            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(255,255,255,0.9)" }}
                          >
                            <Move className="w-3.5 h-3.5" style={{ color: "#333" }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Text-only posts */}
                {posts.filter((p) => !p.media_url && p.content).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      Posts texte ({posts.filter((p) => !p.media_url).length})
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
                            <span className="text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>{p.tier_required || "public"}</span>
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
              </div>
            )}

            {/* ══════ TAB: Plateformes ══════ */}
            {activeTab === "plateformes" && (
              <div className="fade-up">
                {platforms.length === 0 ? (
                  <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                    <Globe className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucune plateforme connectee</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {platforms.map((account) => (
                      <div
                        key={account.id}
                        className="rounded-xl p-3"
                        style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black uppercase"
                              style={{ background: `${PLATFORM_COLORS[account.platform] || "#666"}25`, color: PLATFORM_COLORS[account.platform] || "#666" }}
                            >
                              {account.platform.charAt(0)}
                            </div>
                            <div>
                              <span className="text-[11px] font-bold block capitalize" style={{ color: "var(--text)" }}>
                                {account.platform}
                              </span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>@{account.handle}</span>
                            </div>
                          </div>
                          <span
                            className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                            style={{
                              background: account.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                              color: account.status === "active" ? "#10B981" : "#EF4444",
                            }}
                          >
                            {account.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Abonnes</span>
                            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                              {account.subscribers_count.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Rev. mensuel</span>
                            <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                              {Number(account.monthly_revenue).toFixed(0)} EUR
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════ TAB: Objectifs ══════ */}
            {activeTab === "objectifs" && (
              <div className="fade-up">
                {goals.length === 0 ? (
                  <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                    <Target className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun objectif defini</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {goals
                      .filter((g) => g.status === "active")
                      .map((goal) => {
                        const progress = goal.target_value > 0 ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;
                        const CategoryIcon = CATEGORY_ICONS[goal.category] || Target;
                        return (
                          <div key={goal.id} className="rounded-xl p-3" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CategoryIcon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                                <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{goal.title}</span>
                              </div>
                              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                                {goal.current_value} / {goal.target_value} {goal.unit}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${progress}%`,
                                  background: progress >= 100 ? "#10B981" : progress >= 50 ? "var(--accent)" : "var(--rose)",
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>{goal.category}</span>
                              {goal.deadline && (
                                <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                                  <Calendar className="w-2.5 h-2.5" />
                                  {goal.deadline}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════ MODAL: Add Content ══════ */}
      {showAddContent && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddContent(false)} />
          <div
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[440px] z-50 rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Nouveau contenu</h3>
              <button onClick={() => setShowAddContent(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Titre</label>
                <input
                  type="text"
                  value={newContent.title}
                  onChange={(e) => setNewContent((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Set lingerie rouge"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Type</label>
                <div className="relative">
                  <select
                    value={newContent.content_type}
                    onChange={(e) => setNewContent((p) => ({ ...p, content_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  >
                    {Object.entries(CONTENT_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Plateformes</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(PLATFORM_COLORS).map((p) => {
                    const sel = newContent.platforms.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className="text-[10px] font-bold uppercase px-2 py-1 rounded-md cursor-pointer transition-all"
                        style={{
                          background: sel ? `${PLATFORM_COLORS[p]}30` : "var(--bg)",
                          color: sel ? PLATFORM_COLORS[p] : "var(--text-muted)",
                          border: `1px solid ${sel ? PLATFORM_COLORS[p] + "50" : "var(--border2)"}`,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Etape</label>
                <div className="relative">
                  <select
                    value={newContent.stage}
                    onChange={(e) => setNewContent((p) => ({ ...p, stage: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Tier</label>
                  <div className="relative">
                    <select
                      value={newContent.tier}
                      onChange={(e) => setNewContent((p) => ({ ...p, tier: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                      style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                    >
                      <option value="">Aucun</option>
                      <option value="free">Free</option>
                      <option value="vip">VIP Glamour</option>
                      <option value="gold">Gold</option>
                      <option value="diamond">Diamond</option>
                      <option value="platinum">Platinum All-Access</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Prix (EUR)</label>
                  <input
                    type="number"
                    value={newContent.price}
                    onChange={(e) => setNewContent((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Date planifiee</label>
                <input
                  type="date"
                  value={newContent.scheduled_date}
                  onChange={(e) => setNewContent((p) => ({ ...p, scheduled_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Notes</label>
                <textarea
                  value={newContent.notes}
                  onChange={(e) => setNewContent((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Details, instructions..."
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                />
              </div>
              <button
                onClick={handleCreateContent}
                disabled={!newContent.title.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}
              >
                Creer le contenu
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════ MODAL: Add Goal ══════ */}
      {showAddGoal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddGoal(false)} />
          <div
            className="fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 rounded-2xl p-5"
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Nouvel objectif</h3>
              <button onClick={() => setShowAddGoal(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Titre</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: 1000 abonnes OnlyFans"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Categorie</label>
                  <div className="relative">
                    <select
                      value={newGoal.category}
                      onChange={(e) => setNewGoal((p) => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                      style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                    >
                      <option value="revenue">Revenue</option>
                      <option value="subscribers">Abonnes</option>
                      <option value="content">Contenu</option>
                      <option value="engagement">Engagement</option>
                      <option value="platform">Plateforme</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Unite</label>
                  <div className="relative">
                    <select
                      value={newGoal.unit}
                      onChange={(e) => setNewGoal((p) => ({ ...p, unit: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                      style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                    >
                      <option value="EUR">EUR</option>
                      <option value="count">Nombre</option>
                      <option value="percent">%</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Objectif</label>
                  <input
                    type="number"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal((p) => ({ ...p, target_value: e.target.value }))}
                    placeholder="1000"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Deadline</label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal((p) => ({ ...p, deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  />
                </div>
              </div>
              <button
                onClick={handleCreateGoal}
                disabled={!newGoal.title.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}
              >
                Creer objectif
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════ MODAL: Add Platform ══════ */}
      {showAddPlatform && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddPlatform(false)} />
          <div
            className="fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 rounded-2xl p-5"
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Ajouter une plateforme</h3>
              <button onClick={() => setShowAddPlatform(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Plateforme</label>
                <div className="relative">
                  <select
                    value={newPlatform.platform}
                    onChange={(e) => setNewPlatform((p) => ({ ...p, platform: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  >
                    {Object.keys(PLATFORM_COLORS).map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Handle / Pseudo</label>
                <input
                  type="text"
                  value={newPlatform.handle}
                  onChange={(e) => setNewPlatform((p) => ({ ...p, handle: e.target.value }))}
                  placeholder="@username"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>URL du profil</label>
                <input
                  type="url"
                  value={newPlatform.profile_url}
                  onChange={(e) => setNewPlatform((p) => ({ ...p, profile_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Abonnes</label>
                  <input
                    type="number"
                    value={newPlatform.subscribers_count}
                    onChange={(e) => setNewPlatform((p) => ({ ...p, subscribers_count: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Rev/mois</label>
                  <input
                    type="number"
                    value={newPlatform.monthly_revenue}
                    onChange={(e) => setNewPlatform((p) => ({ ...p, monthly_revenue: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Com. %</label>
                  <input
                    type="number"
                    value={newPlatform.commission_rate}
                    onChange={(e) => setNewPlatform((p) => ({ ...p, commission_rate: e.target.value }))}
                    placeholder="25"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  />
                </div>
              </div>
              <button
                onClick={handleCreatePlatform}
                disabled={!newPlatform.handle.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}
              >
                Ajouter la plateforme
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════ MODAL: Crop/Reposition ══════ */}
      {cropPost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "var(--surface, var(--bg3))" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border2)" }}>
              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Recadrer</span>
              <button onClick={() => setCropPost(null)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className="relative aspect-square overflow-hidden cursor-move"
              onMouseDown={(e) => { cropDragging.current = true; cropStart.current = { x: e.clientX, y: e.clientY, px: cropPos.x, py: cropPos.y }; }}
              onMouseMove={(e) => {
                if (!cropDragging.current) return;
                const dx = (e.clientX - cropStart.current.x) * 0.3;
                const dy = (e.clientY - cropStart.current.y) * 0.3;
                setCropPos({ x: Math.max(0, Math.min(100, cropStart.current.px - dx)), y: Math.max(0, Math.min(100, cropStart.current.py - dy)) });
              }}
              onMouseUp={() => { cropDragging.current = false; }}
              onMouseLeave={() => { cropDragging.current = false; }}
              onTouchStart={(e) => { const t = e.touches[0]; cropDragging.current = true; cropStart.current = { x: t.clientX, y: t.clientY, px: cropPos.x, py: cropPos.y }; }}
              onTouchMove={(e) => {
                if (!cropDragging.current) return;
                const t = e.touches[0];
                const dx = (t.clientX - cropStart.current.x) * 0.3;
                const dy = (t.clientY - cropStart.current.y) * 0.3;
                setCropPos({ x: Math.max(0, Math.min(100, cropStart.current.px - dx)), y: Math.max(0, Math.min(100, cropStart.current.py - dy)) });
              }}
              onTouchEnd={() => { cropDragging.current = false; }}
            >
              <img
                src={cropPost.media_url!}
                alt=""
                className="w-full h-full"
                style={{
                  objectFit: "cover",
                  objectPosition: `${cropPos.x}% ${cropPos.y}%`,
                  transform: `scale(${cropZoom})`,
                  transition: cropDragging.current ? "none" : "transform 0.2s",
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(transparent 33%, rgba(255,255,255,0.15) 33%, rgba(255,255,255,0.15) 34%, transparent 34%, transparent 66%, rgba(255,255,255,0.15) 66%, rgba(255,255,255,0.15) 67%, transparent 67%), linear-gradient(90deg, transparent 33%, rgba(255,255,255,0.15) 33%, rgba(255,255,255,0.15) 34%, transparent 34%, transparent 66%, rgba(255,255,255,0.15) 66%, rgba(255,255,255,0.15) 67%, transparent 67%)",
                }}
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setCropZoom((z) => Math.max(1, z - 0.25))}
                className="p-2 rounded-lg cursor-pointer"
                style={{ background: "var(--bg)", border: "1px solid var(--border2)" }}
              >
                <ZoomOut className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
              <input
                type="range"
                min={100}
                max={300}
                value={cropZoom * 100}
                onChange={(e) => setCropZoom(Number(e.target.value) / 100)}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--accent) ${((cropZoom - 1) / 2) * 100}%, var(--border2) ${((cropZoom - 1) / 2) * 100}%)` }}
              />
              <button
                onClick={() => setCropZoom((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-lg cursor-pointer"
                style={{ background: "var(--bg)", border: "1px solid var(--border2)" }}
              >
                <ZoomIn className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
              <span className="text-[10px] font-mono w-8 text-center" style={{ color: "var(--text-muted)" }}>{Math.round(cropZoom * 100)}%</span>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setCropPost(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer btn-gradient"
                style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff", border: "none" }}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </OsLayout>
  );
}

// ── KPI Card Component ──

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof BarChart3; color: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <span className="text-lg font-bold" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";

// ── Types & Constants (centralized) ──
import type { ContentItem, PlatformAccount, Goal } from "@/types/heaven";
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

// ── Component ──

export default function PipelineDashboard() {
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [items, setItems] = useState<ContentItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformAccount[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

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

  // ── Fetch data ──
  const fetchData = useCallback(() => {
    const headers = authHeaders();
    setLoading(true);

    Promise.all([
      fetch(`/api/pipeline?model=${modelSlug}`, { headers }).then((r) =>
        r.json()
      ),
      fetch(`/api/pipeline/platforms?model=${modelSlug}`, { headers }).then(
        (r) => r.json()
      ),
      fetch(`/api/pipeline/goals?model=${modelSlug}`, { headers }).then((r) =>
        r.json()
      ),
    ])
      .then(([contentData, platformData, goalsData]) => {
        setItems(contentData.items || []);
        setPlatforms(platformData.accounts || []);
        setGoals(goalsData.goals || []);
      })
      .catch((err) => console.error("[Pipeline] Failed to fetch:", err))
      .finally(() => setLoading(false));
  }, [modelSlug, authHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const publishedThisMonth = items.filter(
      (i) =>
        i.stage === "published" &&
        i.published_date &&
        i.published_date.startsWith(thisMonth)
    ).length;

    const revenueThisMonth = items
      .filter(
        (i) =>
          i.published_date && i.published_date.startsWith(thisMonth)
      )
      .reduce((sum, i) => sum + (i.revenue || 0), 0);

    const totalViews = items.reduce((sum, i) => sum + (i.views || 0), 0);
    const totalLikes = items.reduce((sum, i) => sum + (i.likes || 0), 0);
    const avgEngagement =
      totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : "0";

    return {
      total: items.length,
      publishedThisMonth,
      revenueThisMonth,
      avgEngagement,
    };
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
                  newStage === "published"
                    ? new Date().toISOString().split("T")[0]
                    : i.published_date,
              }
            : i
        )
      );

      fetch("/api/pipeline", {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });
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

    fetch("/api/pipeline", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.item) {
          setItems((prev) => [data.item, ...prev]);
        }
        setShowAddContent(false);
        setNewContent({
          title: "",
          content_type: "photo_set",
          platforms: [],
          stage: "idea",
          tier: "",
          scheduled_date: "",
          price: "",
          notes: "",
        });
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
      target_value: newGoal.target_value
        ? parseFloat(newGoal.target_value)
        : 0,
      unit: newGoal.unit,
      deadline: newGoal.deadline || null,
    };

    fetch("/api/pipeline/goals", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.goal) {
          setGoals((prev) => [data.goal, ...prev]);
        }
        setShowAddGoal(false);
        setNewGoal({
          title: "",
          category: "revenue",
          target_value: "",
          unit: "EUR",
          deadline: "",
        });
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
      subscribers_count: newPlatform.subscribers_count
        ? parseInt(newPlatform.subscribers_count)
        : 0,
      monthly_revenue: newPlatform.monthly_revenue
        ? parseFloat(newPlatform.monthly_revenue)
        : 0,
      commission_rate: newPlatform.commission_rate
        ? parseFloat(newPlatform.commission_rate)
        : 25,
    };

    fetch("/api/pipeline/platforms", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.account) {
          setPlatforms((prev) => [...prev, data.account]);
        }
        setShowAddPlatform(false);
        setNewPlatform({
          platform: "onlyfans",
          handle: "",
          profile_url: "",
          subscribers_count: "",
          monthly_revenue: "",
          commission_rate: "25",
        });
      })
      .catch((err) => console.error("[Pipeline] Platform create error:", err));
  }, [newPlatform, modelSlug, authHeaders]);

  // ── Toggle platform in new content form ──
  const togglePlatform = (p: string) => {
    setNewContent((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  // ── Group items by stage for kanban ──
  const itemsByStage = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    for (const s of STAGES) {
      grouped[s.id] = items.filter((i) => i.stage === s.id);
    }
    return grouped;
  }, [items]);

  // ── Next stage helper ──
  const getNextStage = (current: string): string | null => {
    const idx = STAGES.findIndex((s) => s.id === current);
    if (idx < 0 || idx >= STAGES.length - 1) return null;
    return STAGES[idx + 1].id;
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
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Chargement pipeline...
            </span>
          </div>
        </div>
      </OsLayout>
    );
  }

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-28 md:pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ── Header ── */}
          <div className="flex items-center justify-between fade-up">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--rose), var(--accent))",
                  boxShadow: "0 0 20px rgba(230,51,41,0.15)",
                }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  className="text-base font-bold"
                  style={{ color: "var(--text)" }}
                >
                  Pipeline Strategique
                </h1>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {modelSlug.toUpperCase()} — Content & Croissance
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddContent(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              style={{
                background: "linear-gradient(135deg, var(--rose), var(--accent))",
                color: "#fff",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">Contenu</span>
            </button>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-up-1">
            <KpiCard
              label="Total contenus"
              value={String(kpis.total)}
              icon={Package}
              color="var(--accent)"
            />
            <KpiCard
              label="Publie ce mois"
              value={String(kpis.publishedThisMonth)}
              icon={Eye}
              color="#10B981"
            />
            <KpiCard
              label="Revenu ce mois"
              value={`${kpis.revenueThisMonth.toFixed(0)} EUR`}
              icon={DollarSign}
              color="var(--rose)"
            />
            <KpiCard
              label="Engagement moy."
              value={`${kpis.avgEngagement}%`}
              icon={Heart}
              color="#7C3AED"
            />
          </div>

          {/* ── Content Pipeline Kanban ── */}
          <div className="fade-up-2">
            <h2
              className="text-sm font-bold mb-3"
              style={{ color: "var(--text)" }}
            >
              Pipeline de contenu
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {STAGES.map((stage) => (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-[220px] md:w-[200px] rounded-xl p-3"
                  style={{
                    background: "var(--bg3)",
                    border: "1px solid var(--border2)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: stage.color }}
                      />
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: stage.color }}
                      >
                        {stage.label}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                      style={{
                        background: `${stage.color}15`,
                        color: stage.color,
                      }}
                    >
                      {itemsByStage[stage.id]?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(itemsByStage[stage.id] || []).map((item) => {
                      const typeInfo =
                        CONTENT_TYPES[item.content_type] || CONTENT_TYPES.custom;
                      const TypeIcon = typeInfo.icon;
                      const nextStage = getNextStage(item.stage);

                      return (
                        <div
                          key={item.id}
                          className="rounded-lg p-2.5 group"
                          style={{
                            background: "var(--bg2)",
                            border: "1px solid var(--border2)",
                          }}
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <TypeIcon
                                className="w-3 h-3 flex-shrink-0"
                                style={{ color: "var(--text-muted)" }}
                              />
                              <span
                                className="text-[11px] font-semibold truncate"
                                style={{ color: "var(--text)" }}
                              >
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

                          {/* Platform badges */}
                          {item.platforms && item.platforms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {item.platforms.map((p: string) => (
                                <span
                                  key={p}
                                  className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                                  style={{
                                    background: `${PLATFORM_COLORS[p] || "#666"}20`,
                                    color: PLATFORM_COLORS[p] || "#666",
                                  }}
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Tier + date row */}
                          <div className="flex items-center justify-between">
                            {item.tier && (
                              <span
                                className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                                style={{
                                  background: `${TIER_COLORS[item.tier] || "#666"}20`,
                                  color: TIER_COLORS[item.tier] || "#666",
                                }}
                              >
                                {item.tier}
                              </span>
                            )}
                            {item.scheduled_date && (
                              <span
                                className="text-[9px] flex items-center gap-0.5"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <Calendar className="w-2.5 h-2.5" />
                                {item.scheduled_date}
                              </span>
                            )}
                          </div>

                          {/* Stats for published */}
                          {item.stage === "published" && (
                            <div className="flex items-center gap-2 mt-1.5 pt-1.5" style={{ borderTop: "1px solid var(--border2)" }}>
                              <span
                                className="text-[9px] flex items-center gap-0.5"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <Eye className="w-2.5 h-2.5" />
                                {item.views}
                              </span>
                              <span
                                className="text-[9px] flex items-center gap-0.5"
                                style={{ color: "var(--text-muted)" }}
                              >
                                <Heart className="w-2.5 h-2.5" />
                                {item.likes}
                              </span>
                              {item.revenue > 0 && (
                                <span
                                  className="text-[9px] flex items-center gap-0.5"
                                  style={{ color: "var(--accent)" }}
                                >
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

          {/* ── Platform Accounts ── */}
          <div className="fade-up-2">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-bold"
                style={{ color: "var(--text)" }}
              >
                Plateformes connectees
              </h2>
              <button
                onClick={() => setShowAddPlatform(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border2)",
                  color: "var(--text-muted)",
                }}
              >
                <Plus className="w-3 h-3" />
                <span className="text-[10px] font-semibold">Ajouter</span>
              </button>
            </div>
            {platforms.length === 0 ? (
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border2)",
                }}
              >
                <Globe
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: "var(--text-muted)" }}
                />
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Aucune plateforme connectee
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {platforms.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-xl p-3"
                    style={{
                      background: "var(--bg3)",
                      border: "1px solid var(--border2)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black uppercase"
                          style={{
                            background: `${PLATFORM_COLORS[account.platform] || "#666"}25`,
                            color:
                              PLATFORM_COLORS[account.platform] || "#666",
                          }}
                        >
                          {account.platform.charAt(0)}
                        </div>
                        <div>
                          <span
                            className="text-[11px] font-bold block capitalize"
                            style={{ color: "var(--text)" }}
                          >
                            {account.platform}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            @{account.handle}
                          </span>
                        </div>
                      </div>
                      <span
                        className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                        style={{
                          background:
                            account.status === "active"
                              ? "rgba(16,185,129,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            account.status === "active"
                              ? "#10B981"
                              : "#EF4444",
                        }}
                      >
                        {account.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span
                          className="text-[10px] block"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Abonnes
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: "var(--text)" }}
                        >
                          {account.subscribers_count.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-[10px] block"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Rev. mensuel
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: "var(--accent)" }}
                        >
                          {Number(account.monthly_revenue).toFixed(0)} EUR
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Goals ── */}
          <div className="fade-up-2">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-bold"
                style={{ color: "var(--text)" }}
              >
                Objectifs strategiques
              </h2>
              <button
                onClick={() => setShowAddGoal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border2)",
                  color: "var(--text-muted)",
                }}
              >
                <Plus className="w-3 h-3" />
                <span className="text-[10px] font-semibold">Objectif</span>
              </button>
            </div>
            {goals.length === 0 ? (
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border2)",
                }}
              >
                <Target
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: "var(--text-muted)" }}
                />
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Aucun objectif defini
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {goals
                  .filter((g) => g.status === "active")
                  .map((goal) => {
                    const progress =
                      goal.target_value > 0
                        ? Math.min(
                            (goal.current_value / goal.target_value) * 100,
                            100
                          )
                        : 0;
                    const CategoryIcon =
                      CATEGORY_ICONS[goal.category] || Target;

                    return (
                      <div
                        key={goal.id}
                        className="rounded-xl p-3"
                        style={{
                          background: "var(--bg3)",
                          border: "1px solid var(--border2)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CategoryIcon
                              className="w-3.5 h-3.5"
                              style={{ color: "var(--accent)" }}
                            />
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: "var(--text)" }}
                            >
                              {goal.title}
                            </span>
                          </div>
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {goal.current_value} / {goal.target_value}{" "}
                            {goal.unit}
                          </span>
                        </div>
                        <div
                          className="w-full h-1.5 rounded-full overflow-hidden"
                          style={{ background: "var(--bg)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background:
                                progress >= 100
                                  ? "#10B981"
                                  : progress >= 50
                                    ? "var(--accent)"
                                    : "var(--rose)",
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span
                            className="text-[9px] capitalize"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {goal.category}
                          </span>
                          {goal.deadline && (
                            <span
                              className="text-[9px] flex items-center gap-0.5"
                              style={{ color: "var(--text-muted)" }}
                            >
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
        </div>
      </div>

      {/* ══════ MODAL: Add Content ══════ */}
      {showAddContent && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddContent(false)}
          />
          <div
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[440px] z-50 rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
            style={{
              background: "var(--bg3)",
              border: "1px solid var(--border2)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm font-bold"
                style={{ color: "var(--text)" }}
              >
                Nouveau contenu
              </h3>
              <button
                onClick={() => setShowAddContent(false)}
                className="cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Titre
                </label>
                <input
                  type="text"
                  value={newContent.title}
                  onChange={(e) =>
                    setNewContent((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Ex: Set lingerie rouge"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                />
              </div>

              {/* Content type */}
              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Type
                </label>
                <div className="relative">
                  <select
                    value={newContent.content_type}
                    onChange={(e) =>
                      setNewContent((p) => ({
                        ...p,
                        content_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  >
                    {Object.entries(CONTENT_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Plateformes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(PLATFORM_COLORS).map((p) => {
                    const selected = newContent.platforms.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className="text-[9px] font-bold uppercase px-2 py-1 rounded-md cursor-pointer transition-all"
                        style={{
                          background: selected
                            ? `${PLATFORM_COLORS[p]}30`
                            : "var(--bg)",
                          color: selected
                            ? PLATFORM_COLORS[p]
                            : "var(--text-muted)",
                          border: `1px solid ${selected ? PLATFORM_COLORS[p] + "50" : "var(--border2)"}`,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stage */}
              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Etape
                </label>
                <div className="relative">
                  <select
                    value={newContent.stage}
                    onChange={(e) =>
                      setNewContent((p) => ({ ...p, stage: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
              </div>

              {/* Tier + Price row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Tier
                  </label>
                  <div className="relative">
                    <select
                      value={newContent.tier}
                      onChange={(e) =>
                        setNewContent((p) => ({ ...p, tier: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border2)",
                        color: "var(--text)",
                      }}
                    >
                      <option value="">Aucun</option>
                      <option value="free">Free</option>
                      <option value="vip">VIP Glamour</option>
                      <option value="gold">Gold</option>
                      <option value="diamond">Diamond</option>
                      <option value="platinum">Platinum All-Access</option>
                    </select>
                    <ChevronDown
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Prix (EUR)
                  </label>
                  <input
                    type="number"
                    value={newContent.price}
                    onChange={(e) =>
                      setNewContent((p) => ({ ...p, price: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              {/* Scheduled date */}
              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Date planifiee
                </label>
                <input
                  type="date"
                  value={newContent.scheduled_date}
                  onChange={(e) =>
                    setNewContent((p) => ({
                      ...p,
                      scheduled_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                />
              </div>

              {/* Notes */}
              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Notes
                </label>
                <textarea
                  value={newContent.notes}
                  onChange={(e) =>
                    setNewContent((p) => ({ ...p, notes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Details, instructions..."
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleCreateContent}
                disabled={!newContent.title.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, var(--rose), var(--accent))",
                  color: "#fff",
                }}
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
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddGoal(false)}
          />
          <div
            className="fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 rounded-2xl p-5"
            style={{
              background: "var(--bg3)",
              border: "1px solid var(--border2)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm font-bold"
                style={{ color: "var(--text)" }}
              >
                Nouvel objectif
              </h3>
              <button
                onClick={() => setShowAddGoal(false)}
                className="cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Titre
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) =>
                    setNewGoal((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Ex: 1000 abonnes OnlyFans"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Categorie
                  </label>
                  <div className="relative">
                    <select
                      value={newGoal.category}
                      onChange={(e) =>
                        setNewGoal((p) => ({ ...p, category: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border2)",
                        color: "var(--text)",
                      }}
                    >
                      <option value="revenue">Revenue</option>
                      <option value="subscribers">Abonnes</option>
                      <option value="content">Contenu</option>
                      <option value="engagement">Engagement</option>
                      <option value="platform">Plateforme</option>
                    </select>
                    <ChevronDown
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Unite
                  </label>
                  <div className="relative">
                    <select
                      value={newGoal.unit}
                      onChange={(e) =>
                        setNewGoal((p) => ({ ...p, unit: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border2)",
                        color: "var(--text)",
                      }}
                    >
                      <option value="EUR">EUR</option>
                      <option value="count">Nombre</option>
                      <option value="percent">%</option>
                    </select>
                    <ChevronDown
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Objectif
                  </label>
                  <input
                    type="number"
                    value={newGoal.target_value}
                    onChange={(e) =>
                      setNewGoal((p) => ({
                        ...p,
                        target_value: e.target.value,
                      }))
                    }
                    placeholder="1000"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) =>
                      setNewGoal((p) => ({ ...p, deadline: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleCreateGoal}
                disabled={!newGoal.title.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, var(--rose), var(--accent))",
                  color: "#fff",
                }}
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
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddPlatform(false)}
          />
          <div
            className="fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 rounded-2xl p-5"
            style={{
              background: "var(--bg3)",
              border: "1px solid var(--border2)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm font-bold"
                style={{ color: "var(--text)" }}
              >
                Ajouter une plateforme
              </h3>
              <button
                onClick={() => setShowAddPlatform(false)}
                className="cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Plateforme
                </label>
                <div className="relative">
                  <select
                    value={newPlatform.platform}
                    onChange={(e) =>
                      setNewPlatform((p) => ({
                        ...p,
                        platform: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  >
                    {Object.keys(PLATFORM_COLORS).map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Handle / Pseudo
                </label>
                <input
                  type="text"
                  value={newPlatform.handle}
                  onChange={(e) =>
                    setNewPlatform((p) => ({ ...p, handle: e.target.value }))
                  }
                  placeholder="@username"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div>
                <label
                  className="text-[10px] font-semibold block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  URL du profil
                </label>
                <input
                  type="url"
                  value={newPlatform.profile_url}
                  onChange={(e) =>
                    setNewPlatform((p) => ({
                      ...p,
                      profile_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Abonnes
                  </label>
                  <input
                    type="number"
                    value={newPlatform.subscribers_count}
                    onChange={(e) =>
                      setNewPlatform((p) => ({
                        ...p,
                        subscribers_count: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Rev/mois
                  </label>
                  <input
                    type="number"
                    value={newPlatform.monthly_revenue}
                    onChange={(e) =>
                      setNewPlatform((p) => ({
                        ...p,
                        monthly_revenue: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold block mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Com. %
                  </label>
                  <input
                    type="number"
                    value={newPlatform.commission_rate}
                    onChange={(e) =>
                      setNewPlatform((p) => ({
                        ...p,
                        commission_rate: e.target.value,
                      }))
                    }
                    placeholder="25"
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border2)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleCreatePlatform}
                disabled={!newPlatform.handle.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, var(--rose), var(--accent))",
                  color: "#fff",
                }}
              >
                Ajouter la plateforme
              </button>
            </div>
          </div>
        </>
      )}
    </OsLayout>
  );
}

// ── KPI Card Component ──

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "var(--bg3)",
        border: "1px solid var(--border2)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <span
          className="text-[10px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
      </div>
      <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

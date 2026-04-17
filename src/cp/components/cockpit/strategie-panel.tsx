"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Target, Globe, BarChart3, DollarSign, Zap, TrendingUp, Users, Eye, EyeOff, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";
import type { Goal, AccessCode, PackConfig, ClientInfo, FeedPost } from "@/types/heaven";
import { TIER_HEX } from "@/constants/tiers";
import { isExpired } from "@/lib/timezone";
import { DEFAULT_PACKS } from "@/constants/packs";
import { PLATFORMS } from "@/constants/strategie-platforms";
import { GLOBAL_CHECKLIST } from "@/constants/strategie-onboarding";
import {
  CONTENT_LEVELS, PIPELINE_STEPS,
  loadSimState, saveSimState,
  type SalesChannel, type SimState,
} from "@/constants/strategie-simulator";
import { type ActiveTab } from "@/constants/strategie-tabs";

import { TabPlateformes } from "@/components/strategie/tab-plateformes";
import { TabSimulateur } from "@/components/strategie/tab-simulateur";
import { TabOnboarding } from "@/components/strategie/tab-onboarding";
import { TabTactique } from "@/components/strategie/tab-tactique";
import { TabObjectifs } from "@/components/strategie/tab-objectifs";
import { AddGoalModal } from "@/components/strategie/add-goal-modal";

const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/* ── Real data shape ── */
interface RealData {
  revenue: number;
  activeCodes: AccessCode[];
  modelCodes: AccessCode[];
  packs: PackConfig[];
  clients: ClientInfo[];
  uniqueClients: number;
  retentionRate: number;
  stories: FeedPost[];
}

interface StrategiePanelProps {
  realData?: RealData;
}

/* ── Data scope for root analytics ── */
type DataScope = "self" | "all" | string; // "self" = current model, "all" = aggregate, string = specific model slug

function computeMetrics(codes: AccessCode[], clients: ClientInfo[], packs: PackConfig[], posts: FeedPost[]) {
  const activePacks = packs.filter(p => p.active);
  const modelCodes = codes;
  const activeCodes = modelCodes.filter(c => c.active && !c.revoked && c.expiresAt && !isExpired(c.expiresAt));
  const paidCodes = modelCodes.filter(c => c.type === "paid" && !c.revoked);
  const revenue = paidCodes.reduce((sum, c) => {
    const pack = packs.find(p => p.id === c.tier);
    return sum + (pack?.price || 0);
  }, 0);
  const uniqueClients = new Set(modelCodes.filter(c => !c.revoked).map(c => c.client.toLowerCase())).size;
  const totalPaid = modelCodes.filter(c => c.type === "paid").length;
  const renewed = modelCodes.filter(c => !c.revoked && c.type === "paid").length;
  const retentionRate = totalPaid > 0 ? Math.round((renewed / totalPaid) * 100) : 0;
  const stories = posts.filter(p => (p as FeedPost & { post_type?: string }).post_type === "story");
  const verifiedClients = clients.filter(c => c.is_verified).length;
  const pendingClients = clients.filter(c => !c.is_verified && !c.is_blocked).length;
  const bannedClients = clients.filter(c => c.is_blocked).length;
  const revokedCodes = modelCodes.filter(c => c.revoked).length;
  const freeCodes = modelCodes.filter(c => c.type !== "paid" && !c.revoked && c.active).length;

  const salesByTier: Record<string, number> = {};
  activePacks.forEach(p => { salesByTier[p.id] = 0; });
  paidCodes.forEach(c => { if (salesByTier[c.tier] !== undefined) salesByTier[c.tier]++; });

  const revenueByPack = activePacks.map(p => ({
    ...p,
    count: salesByTier[p.id] || 0,
    rev: (salesByTier[p.id] || 0) * p.price,
    hex: TIER_HEX[p.id] || p.color || "#888",
  })).sort((a, b) => b.rev - a.rev);

  const expiringCodes = modelCodes
    .filter(c => c.active && !c.revoked && c.expiresAt && !isExpired(c.expiresAt))
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
    .slice(0, 6);

  return {
    revenue, activeCodes, modelCodes, paidCodes, packs: activePacks,
    clients, uniqueClients, retentionRate, stories,
    verifiedClients, pendingClients, bannedClients,
    revokedCodes, freeCodes, salesByTier, revenueByPack, expiringCodes,
  };
}

/* ══════════════════════════════════════════════ */
/*  StrategiePanel                                 */
/* ══════════════════════════════════════════════ */

export function StrategiePanel({ realData }: StrategiePanelProps) {
  const { currentModel, auth, authHeaders, isRoot, models } = useModel();
  const _modelSlug = currentModel || auth?.model_slug || null;
  const modelSlug = _modelSlug ?? "";

  // ── Data scope (root only) ──
  const [dataScope, setDataScope] = useState<DataScope>("self");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeData, setScopeData] = useState<Map<string, { codes: AccessCode[]; clients: ClientInfo[]; packs: PackConfig[]; posts: FeedPost[] }>>(new Map());
  const [scopeLoading, setScopeLoading] = useState(false);

  // Fetch data for a specific model
  const fetchModelData = useCallback(async (slug: string) => {
    if (scopeData.has(slug)) return;
    const mid = toModelId(slug);
    const headers = authHeaders();
    const safeFetch = (url: string) => fetch(url, { headers }).then(r => r.ok ? r.json() : null).catch(() => null);
    const [codesRes, clientsRes, packsRes, postsRes] = await Promise.all([
      safeFetch(`/api/codes?model=${mid}`),
      safeFetch(`/api/clients?model=${mid}`),
      safeFetch(`/api/packs?model=${mid}`),
      safeFetch(`/api/posts?model=${mid}`),
    ]);
    setScopeData(prev => {
      const next = new Map(prev);
      next.set(slug, {
        codes: codesRes?.codes || [],
        clients: clientsRes?.clients || [],
        packs: packsRes?.packs?.length > 0 ? packsRes.packs : DEFAULT_PACKS,
        posts: postsRes?.posts || [],
      });
      return next;
    });
  }, [authHeaders, scopeData]);

  // When scope changes, fetch needed data
  useEffect(() => {
    if (!isRoot || dataScope === "self") return;
    setScopeLoading(true);
    if (dataScope === "all") {
      // Fetch all models
      Promise.all(models.map(m => fetchModelData(m.slug)))
        .finally(() => setScopeLoading(false));
    } else {
      // Fetch specific model
      fetchModelData(dataScope).finally(() => setScopeLoading(false));
    }
  }, [dataScope, isRoot, models]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute active metrics based on scope
  const activeMetrics = useMemo(() => {
    if (dataScope === "self" && realData) {
      // Use parent-provided real data
      const activePacks = realData.packs.filter(p => p.active);
      const paidCodes = realData.modelCodes.filter(c => c.type === "paid" && !c.revoked);
      const salesByTier: Record<string, number> = {};
      activePacks.forEach(p => { salesByTier[p.id] = 0; });
      paidCodes.forEach(c => { if (salesByTier[c.tier] !== undefined) salesByTier[c.tier]++; });
      const revenueByPack = activePacks.map(p => ({
        ...p,
        count: salesByTier[p.id] || 0,
        rev: (salesByTier[p.id] || 0) * p.price,
        hex: TIER_HEX[p.id] || p.color || "#888",
      })).sort((a, b) => b.rev - a.rev);
      const expiringCodes = realData.modelCodes
        .filter(c => c.active && !c.revoked && c.expiresAt && !isExpired(c.expiresAt))
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
        .slice(0, 6);
      return {
        revenue: realData.revenue,
        activeCodes: realData.activeCodes,
        modelCodes: realData.modelCodes,
        paidCodes,
        packs: activePacks,
        clients: realData.clients,
        uniqueClients: realData.uniqueClients,
        retentionRate: realData.retentionRate,
        stories: realData.stories,
        verifiedClients: realData.clients.filter(c => c.is_verified).length,
        pendingClients: realData.clients.filter(c => !c.is_verified && !c.is_blocked).length,
        bannedClients: realData.clients.filter(c => c.is_blocked).length,
        revokedCodes: realData.modelCodes.filter(c => c.revoked).length,
        freeCodes: realData.modelCodes.filter(c => c.type !== "paid" && !c.revoked && c.active).length,
        salesByTier, revenueByPack, expiringCodes,
        label: modelSlug,
      };
    }

    if (dataScope === "all") {
      // Aggregate all models
      let allCodes: AccessCode[] = [];
      let allClients: ClientInfo[] = [];
      let allPacks: PackConfig[] = [];
      let allPosts: FeedPost[] = [];
      for (const [, data] of scopeData) {
        allCodes = [...allCodes, ...data.codes];
        allClients = [...allClients, ...data.clients];
        if (data.packs.length > allPacks.length) allPacks = data.packs;
        allPosts = [...allPosts, ...data.posts];
      }
      return { ...computeMetrics(allCodes, allClients, allPacks, allPosts), label: "Tous" };
    }

    // Specific model
    const d = scopeData.get(dataScope);
    if (!d) return null;
    return { ...computeMetrics(d.codes, d.clients, d.packs, d.posts), label: dataScope };
  }, [dataScope, realData, scopeData, modelSlug]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("objectifs");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  // Onboarding state
  const [onboardingChecked, setOnboardingChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`heaven_onboarding_${modelSlug}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Tactique state
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(["onlyfans", "instagram", "snapchat"]);
    try {
      const saved = localStorage.getItem(`heaven_strategy_${modelSlug}`);
      if (saved) return new Set(JSON.parse(saved).platforms || []);
    } catch {}
    return new Set(["onlyfans", "instagram", "snapchat"]);
  });

  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`heaven_checklist_${modelSlug}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Simulator state
  const [simState, setSimState] = useState<SimState>(() => {
    const base = loadSimState();
    const rev = activeMetrics?.revenue ?? realData?.revenue ?? 0;
    if (rev > 0 && base.monthlyGoal === 1000) {
      const suggestedGoal = Math.ceil(rev * 1.5 / 100) * 100;
      return { ...base, monthlyGoal: Math.max(suggestedGoal, 200) };
    }
    return base;
  });
  const [simTab, setSimTab] = useState<"objectif" | "contenu" | "pipeline" | "projections">("objectif");

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", category: "revenue", target_value: "", unit: "EUR", deadline: "" });

  // Fetch goals
  useEffect(() => {
    if (!modelSlug) return;
    setGoalsLoading(true);
    const headers = authHeaders();
    fetch(`/api/pipeline/goals?model=${toModelId(modelSlug)}`, { headers })
      .then((r) => r.json())
      .then((data) => setGoals(data.goals || []))
      .catch((err) => console.error("[Strategie] Goals fetch error:", err))
      .finally(() => setGoalsLoading(false));
  }, [modelSlug, authHeaders]);

  const handleCreateGoal = useCallback(() => {
    if (!newGoal.title.trim()) return;
    const headers = authHeaders();
    const payload = {
      model_slug: toModelId(modelSlug),
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
      .catch((err) => console.error("[Strategie] Goal create error:", err));
  }, [newGoal, modelSlug, authHeaders]);

  const handleDeleteGoal = useCallback((goalId: string) => {
    const headers = authHeaders();
    fetch(`/api/pipeline/goals?id=${goalId}`, { method: "DELETE", headers })
      .then(() => setGoals((prev) => prev.filter((g) => g.id !== goalId)))
      .catch((err) => console.error("[Strategie] Goal delete error:", err));
  }, [authHeaders]);

  // Persist
  useEffect(() => {
    localStorage.setItem(`heaven_strategy_${modelSlug}`, JSON.stringify({ platforms: [...activePlatforms] }));
  }, [activePlatforms, modelSlug]);
  useEffect(() => {
    localStorage.setItem(`heaven_checklist_${modelSlug}`, JSON.stringify(checklist));
  }, [checklist, modelSlug]);
  useEffect(() => {
    localStorage.setItem(`heaven_onboarding_${modelSlug}`, JSON.stringify(onboardingChecked));
  }, [onboardingChecked, modelSlug]);
  useEffect(() => { saveSimState(simState); }, [simState]);

  // Callbacks
  const togglePlatform = useCallback((id: string) => {
    setActivePlatforms(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleTask = useCallback((taskKey: string) => {
    setChecklist(prev => ({ ...prev, [taskKey]: !prev[taskKey] }));
  }, []);
  const toggleOnboarding = useCallback((label: string) => {
    setOnboardingChecked(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);
  const setSim = useCallback(<K extends keyof SimState>(key: K, val: SimState[K]) => {
    setSimState(prev => ({ ...prev, [key]: val }));
  }, []);
  const toggleLevel = useCallback((lvl: number) => {
    setSimState(prev => {
      const has = prev.activeLevels.includes(lvl);
      if (!has) {
        const newLevels = [...new Set([...prev.activeLevels, ...Array.from({ length: lvl + 1 }, (_, i) => i)])];
        const newVolume = { ...prev.contentVolume };
        for (const l of newLevels) { if (!newVolume[l]) newVolume[l] = l === 0 ? 20 : 8; }
        return { ...prev, activeLevels: newLevels.sort(), contentVolume: newVolume };
      }
      return { ...prev, activeLevels: prev.activeLevels.filter(l => l < lvl) };
    });
  }, []);
  const toggleChannel = useCallback((ch: SalesChannel) => {
    setSimState(prev => ({
      ...prev,
      activeChannels: prev.activeChannels.includes(ch) ? prev.activeChannels.filter(c => c !== ch) : [...prev.activeChannels, ch],
    }));
  }, []);
  const toggleStep = useCallback((stepId: string) => {
    setSimState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepId) ? prev.completedSteps.filter(s => s !== stepId) : [...prev.completedSteps, stepId],
    }));
  }, []);
  const setVolume = useCallback((lvl: number, vol: number) => {
    setSimState(prev => ({ ...prev, contentVolume: { ...prev.contentVolume, [lvl]: vol } }));
  }, []);

  // Tactique computed
  const active = PLATFORMS.filter(p => activePlatforms.has(p.id));
  const totalTasks = active.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = active.reduce((sum, p) => sum + p.tasks.filter((_, i) => checklist[`${p.id}-${i}`]).length, 0);
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const onboardingDone = GLOBAL_CHECKLIST.filter(i => onboardingChecked[i.label]).length;

  // Simulator computed
  const maxActiveLevel = useMemo(() => Math.max(...simState.activeLevels, 0), [simState.activeLevels]);
  const revenueByLevel = useMemo(() => {
    return simState.activeLevels.filter(l => l > 0).map(lvl => {
      const level = CONTENT_LEVELS[lvl];
      const prices = level.marketPrices[simState.experience];
      const volume = simState.contentVolume[lvl] || 0;
      const channelRevenue = simState.activeChannels.reduce((sum, ch) => sum + prices[ch] * volume, 0);
      return { level: lvl, label: level.label, color: level.color, volume, channelRevenue };
    });
  }, [simState.activeLevels, simState.activeChannels, simState.experience, simState.contentVolume]);

  const totalProjectedRevenue = useMemo(() => revenueByLevel.reduce((s, r) => s + r.channelRevenue, 0), [revenueByLevel]);
  const goalProgress = useMemo(() => Math.min((totalProjectedRevenue / Math.max(simState.monthlyGoal, 1)) * 100, 100), [totalProjectedRevenue, simState.monthlyGoal]);
  const goalReached = totalProjectedRevenue >= simState.monthlyGoal;

  const visibleSteps = useMemo(() => {
    return PIPELINE_STEPS.filter(step => {
      if (step.requiresLevel !== undefined && !simState.activeLevels.includes(step.requiresLevel)) return false;
      if (step.requiresChannel && !simState.activeChannels.includes(step.requiresChannel)) return false;
      return true;
    });
  }, [simState.activeLevels, simState.activeChannels]);

  const pipelineProgress = useMemo(() => {
    if (visibleSteps.length === 0) return 0;
    return Math.round((simState.completedSteps.filter(s => visibleSteps.some(vs => vs.id === s)).length / visibleSteps.length) * 100);
  }, [visibleSteps, simState.completedSteps]);

  const recommendedPrices = useMemo(() => {
    return CONTENT_LEVELS.filter(l => simState.activeLevels.includes(l.id) && l.id > 0).map(level => {
      const prices = level.marketPrices[simState.experience];
      const bestChannel = simState.activeChannels.reduce<{ ch: SalesChannel; price: number } | null>((best, ch) => {
        const p = prices[ch];
        if (!best || p > best.price) return { ch, price: p };
        return best;
      }, null);
      return { level, bestChannel };
    });
  }, [simState.activeLevels, simState.activeChannels, simState.experience]);

  const TABS: { id: ActiveTab; label: string; icon: LucideIcon }[] = [
    { id: "objectifs", label: "Objectifs", icon: Target },
    { id: "plateformes", label: "Plateformes", icon: Globe },
    { id: "simulateur", label: "Simulateur", icon: BarChart3 },
  ];

  if (!modelSlug) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {isRoot ? "Selectionne un modele dans le header" : "Chargement..."}
        </p>
      </div>
    );
  }

  // Scope options for root
  const scopeOptions = [
    { id: "self", label: `${modelSlug} (actuel)`, color: "#D4AF37" },
    ...models.filter(m => m.slug !== modelSlug).map(m => ({ id: m.slug, label: m.display_name, color: "#64748B" })),
    { id: "all", label: "Tous les modeles", color: "#8B5CF6" },
  ];
  const activeScopeLabel = dataScope === "self" ? modelSlug : dataScope === "all" ? "Tous" : dataScope;

  const maxSales = Math.max(...Object.values(activeMetrics?.salesByTier ?? {}), 1);

  return (
    <div className="min-h-[50vh] pb-24">

      {/* ═══ Root: Data Scope Selector ═══ */}
      {isRoot && (
        <div className="mb-4">
          <div className="relative inline-block">
            <button
              onClick={() => setScopeOpen(!scopeOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: dataScope === "all" ? "rgba(139,92,246,0.08)" : dataScope !== "self" ? "rgba(100,116,139,0.08)" : "rgba(212,175,55,0.08)",
                border: `1px solid ${dataScope === "all" ? "rgba(139,92,246,0.25)" : dataScope !== "self" ? "rgba(100,116,139,0.25)" : "rgba(212,175,55,0.25)"}`,
              }}
            >
              <Eye className="w-3.5 h-3.5" style={{ color: dataScope === "all" ? "#8B5CF6" : "#D4AF37" }} />
              <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>
                Donnees : {activeScopeLabel}
              </span>
              <ChevronDown className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
            </button>

            {scopeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setScopeOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 rounded-xl py-1 min-w-[200px]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                  {scopeOptions.map(opt => {
                    const isActive = dataScope === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => { setDataScope(opt.id); setScopeOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors"
                        style={{
                          background: isActive ? "rgba(212,175,55,0.08)" : "transparent",
                          border: "none",
                          color: isActive ? "var(--text)" : "var(--text-muted)",
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
                        <span className="text-[11px] font-medium">{opt.label}</span>
                        {isActive && <span className="ml-auto text-[10px] font-bold" style={{ color: "#D4AF37" }}>actif</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {scopeLoading && (
            <span className="ml-3 text-[11px] font-medium animate-pulse" style={{ color: "var(--text-muted)" }}>
              Chargement...
            </span>
          )}
        </div>
      )}

      {/* ═══ Real Data Overview Banner ═══ */}
      {activeMetrics && activeMetrics.revenue >= 0 && (
        <div className="rounded-xl p-3 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                Chiffres reels{dataScope !== "self" ? ` — ${activeScopeLabel}` : ""}
              </span>
              {dataScope === "all" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>
                  Agrege
                </span>
              )}
            </div>
            <span className="text-sm font-black" style={{ color: activeMetrics.revenue > 0 ? "#10B981" : "var(--text-muted)" }}>
              {fmt.format(activeMetrics.revenue)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Revenue by pack */}
            <div className="col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Ventes par pack</span>
              <div className="space-y-1">
                {activeMetrics.revenueByPack.map(p => {
                  const pct = maxSales > 0 ? (p.count / maxSales) * 100 : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.hex }} />
                      <span className="text-[11px] font-medium truncate w-14 shrink-0" style={{ color: "var(--text)" }}>{p.name}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, background: `linear-gradient(90deg, ${p.hex}, ${p.hex}88)` }} />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: p.hex }}>{p.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key metrics */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Metriques</span>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-[11px]" style={{ color: "var(--text)" }}>Clients</span><span className="text-[11px] font-bold" style={{ color: "#10B981" }}>{activeMetrics.clients.length}</span></div>
                <div className="flex justify-between"><span className="text-[11px]" style={{ color: "var(--text)" }}>Verifies</span><span className="text-[11px] font-bold" style={{ color: "#D4AF37" }}>{activeMetrics.verifiedClients}</span></div>
                <div className="flex justify-between"><span className="text-[11px]" style={{ color: "var(--text)" }}>Retention</span><span className="text-[11px] font-bold" style={{ color: "#8B5CF6" }}>{activeMetrics.retentionRate}%</span></div>
              </div>
            </div>

            {/* Codes & alerts */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Codes</span>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-[11px]" style={{ color: "var(--text)" }}>Actifs</span><span className="text-[11px] font-bold" style={{ color: "#10B981" }}>{activeMetrics.activeCodes.length}</span></div>
                <div className="flex justify-between"><span className="text-[11px]" style={{ color: "var(--text)" }}>Payes</span><span className="text-[11px] font-bold" style={{ color: "#D4AF37" }}>{activeMetrics.paidCodes.length}</span></div>
                <div className="flex justify-between"><span className="text-[11px]" style={{ color: "var(--text)" }}>Expirent</span><span className="text-[11px] font-bold" style={{ color: "#F59E0B" }}>{activeMetrics.expiringCodes.length}</span></div>
              </div>
            </div>
          </div>

          {/* Comparison bars when viewing individual models (root multi-model) */}
          {isRoot && dataScope === "all" && scopeData.size > 0 && (
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                Revenue par modele
              </span>
              {models.map(m => {
                const d = scopeData.get(m.slug);
                if (!d) return null;
                const mMetrics = computeMetrics(d.codes, d.clients, d.packs, d.posts);
                const pct = activeMetrics.revenue > 0 ? (mMetrics.revenue / activeMetrics.revenue) * 100 : 0;
                return (
                  <div key={m.slug} className="flex items-center gap-2">
                    <span className="text-[11px] font-medium w-16 truncate shrink-0" style={{ color: "var(--text)" }}>{m.display_name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.max(pct, 2)}%`,
                        background: `linear-gradient(90deg, #10B981, #059669)`,
                      }} />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums shrink-0 w-16 text-right" style={{ color: "#10B981" }}>
                      {fmt.format(mMetrics.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gap indicator */}
          {totalProjectedRevenue > 0 && (
            <div className="mt-2 pt-2 flex items-center gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              <Zap className="w-3 h-3 shrink-0" style={{ color: "#D4AF37" }} />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Reel <strong style={{ color: "#10B981" }}>{fmt.format(activeMetrics.revenue)}</strong>
                {" → "}Projete <strong style={{ color: totalProjectedRevenue >= simState.monthlyGoal ? "#10B981" : "#F59E0B" }}>{fmt.format(totalProjectedRevenue)}</strong>
                {" → "}Objectif <strong style={{ color: "#D4AF37" }}>{fmt.format(simState.monthlyGoal)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--text)" }}>
          Strategie
        </h2>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}>
          {goals.length} objectif{goals.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-20 mb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 pb-2"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex gap-6">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="relative pb-2.5 pt-1 text-xs font-medium cursor-pointer transition-colors"
                style={{ color: isActive ? "#D4AF37" : "var(--text-muted)", background: "none", border: "none" }}>
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: "#D4AF37" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeTab === "objectifs" && (
        <div className="space-y-8">
          <TabObjectifs goals={goals} goalsLoading={goalsLoading} handleDeleteGoal={handleDeleteGoal} onAddGoal={() => setShowAddGoal(true)} />
          <div>
            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text)" }}>Tactique hebdomadaire</h2>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Taches par plateforme pour la semaine en cours.</p>
            </div>
            <TabTactique activePlatforms={activePlatforms} checklist={checklist} expandedPlatform={expandedPlatform}
              setExpandedPlatform={setExpandedPlatform} togglePlatform={togglePlatform} toggleTask={toggleTask}
              setChecklist={setChecklist} doneTasks={doneTasks} totalTasks={totalTasks} progress={progress} />
          </div>
        </div>
      )}

      {activeTab === "plateformes" && (
        <div className="space-y-8">
          <TabPlateformes expandedPlatform={expandedPlatform} setExpandedPlatform={setExpandedPlatform} />
          <div>
            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text)" }}>Onboarding</h2>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Checklist de lancement par plateforme.</p>
            </div>
            <TabOnboarding onboardingChecked={onboardingChecked} toggleOnboarding={toggleOnboarding} onboardingDone={onboardingDone} />
          </div>
        </div>
      )}

      {activeTab === "simulateur" && (
        <TabSimulateur simState={simState} simTab={simTab} setSimTab={setSimTab} setSim={setSim}
          toggleLevel={toggleLevel} toggleChannel={toggleChannel} toggleStep={toggleStep} setVolume={setVolume}
          totalProjectedRevenue={totalProjectedRevenue} goalReached={goalReached} goalProgress={goalProgress}
          maxActiveLevel={maxActiveLevel} revenueByLevel={revenueByLevel} pipelineProgress={pipelineProgress}
          visibleSteps={visibleSteps} recommendedPrices={recommendedPrices} />
      )}

      <AddGoalModal show={showAddGoal} onClose={() => setShowAddGoal(false)} newGoal={newGoal} setNewGoal={setNewGoal} onCreate={handleCreateGoal} />
    </div>
  );
}

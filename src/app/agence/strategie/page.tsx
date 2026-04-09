"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Target, Globe, DollarSign, Zap,
  Shield, BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";
import type { Goal } from "@/types/heaven";
import { PLATFORMS } from "@/constants/strategie-platforms";
import { GLOBAL_CHECKLIST } from "@/constants/strategie-onboarding";
import {
  CONTENT_LEVELS, CHANNELS, PIPELINE_STEPS,
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

export default function StrategiePage() {
  const { currentModel, authHeaders, isRoot } = useModel();
  const modelSlug = currentModel || "";

  const [activeTab, setActiveTab] = useState<ActiveTab>("plateformes");
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

  // Tactique state (daily tasks)
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
  const [simState, setSimState] = useState<SimState>(loadSimState);
  const [simTab, setSimTab] = useState<"objectif" | "contenu" | "pipeline" | "projections">("objectif");

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", category: "revenue", target_value: "", unit: "EUR", deadline: "" });

  // Fetch goals
  useEffect(() => {
    setGoalsLoading(true);
    const headers = authHeaders();
    fetch(`/api/pipeline/goals?model=${toModelId(modelSlug)}`, { headers })
      .then((r) => r.json())
      .then((data) => setGoals(data.goals || []))
      .catch((err) => console.error("[Strategie] Goals fetch error:", err))
      .finally(() => setGoalsLoading(false));
  }, [modelSlug, authHeaders]);

  // Create goal
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

  // Delete goal
  const handleDeleteGoal = useCallback((goalId: string) => {
    const headers = authHeaders();
    fetch(`/api/pipeline/goals?id=${goalId}`, { method: "DELETE", headers })
      .then(() => setGoals((prev) => prev.filter((g) => g.id !== goalId)))
      .catch((err) => console.error("[Strategie] Goal delete error:", err));
  }, [authHeaders]);

  // Persist tactique
  useEffect(() => {
    localStorage.setItem(`heaven_strategy_${modelSlug}`, JSON.stringify({ platforms: [...activePlatforms] }));
  }, [activePlatforms, modelSlug]);

  useEffect(() => {
    localStorage.setItem(`heaven_checklist_${modelSlug}`, JSON.stringify(checklist));
  }, [checklist, modelSlug]);

  // Persist onboarding
  useEffect(() => {
    localStorage.setItem(`heaven_onboarding_${modelSlug}`, JSON.stringify(onboardingChecked));
  }, [onboardingChecked, modelSlug]);

  // Persist simulator
  useEffect(() => { saveSimState(simState); }, [simState]);

  // Tactique callbacks
  const togglePlatform = useCallback((id: string) => {
    setActivePlatforms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleTask = useCallback((taskKey: string) => {
    setChecklist(prev => ({ ...prev, [taskKey]: !prev[taskKey] }));
  }, []);

  const toggleOnboarding = useCallback((label: string) => {
    setOnboardingChecked(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  // Simulator callbacks
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
      const newLevels = prev.activeLevels.filter(l => l < lvl);
      return { ...prev, activeLevels: newLevels };
    });
  }, []);

  const toggleChannel = useCallback((ch: SalesChannel) => {
    setSimState(prev => ({
      ...prev,
      activeChannels: prev.activeChannels.includes(ch)
        ? prev.activeChannels.filter(c => c !== ch)
        : [...prev.activeChannels, ch],
    }));
  }, []);

  const toggleStep = useCallback((stepId: string) => {
    setSimState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepId)
        ? prev.completedSteps.filter(s => s !== stepId)
        : [...prev.completedSteps, stepId],
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
    { id: "plateformes", label: "Plateformes", icon: Globe },
    { id: "simulateur", label: "Simulateur", icon: BarChart3 },
    { id: "onboarding", label: "Onboarding", icon: Shield },
    { id: "tactique", label: "Tactique", icon: Zap },
    { id: "objectifs", label: "Objectifs", icon: Target },
  ];

  if (!modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isRoot ? "Selectionne un modele dans le header" : "Chargement..."}
          </p>
        </div>
      </OsLayout>
    );
  }

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen pb-24">

        {/* Header */}
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", boxShadow: "0 0 20px rgba(224,64,251,0.15)" }}>
              <Target className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Strategie & Simulateur</h1>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Plateformes, simulateur de revenus, onboarding et planification.
              </p>
            </div>
            {/* Goal badge from simulator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{
                background: goalReached ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${goalReached ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
              }}>
              <DollarSign className="w-3.5 h-3.5" style={{ color: goalReached ? "#10B981" : "#F59E0B" }} />
              <span className="text-[11px] font-bold" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
                {totalProjectedRevenue.toLocaleString()}€ / {simState.monthlyGoal.toLocaleString()}€
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Tab bar */}
        <div className="sticky top-0 z-30" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap cursor-pointer transition-all shrink-0"
                    style={{
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                      borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    }}>
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-w-5xl mx-auto">

          {activeTab === "plateformes" && (
            <TabPlateformes
              expandedPlatform={expandedPlatform}
              setExpandedPlatform={setExpandedPlatform}
            />
          )}

          {activeTab === "simulateur" && (
            <TabSimulateur
              simState={simState}
              simTab={simTab}
              setSimTab={setSimTab}
              setSim={setSim}
              toggleLevel={toggleLevel}
              toggleChannel={toggleChannel}
              toggleStep={toggleStep}
              setVolume={setVolume}
              totalProjectedRevenue={totalProjectedRevenue}
              goalReached={goalReached}
              goalProgress={goalProgress}
              maxActiveLevel={maxActiveLevel}
              revenueByLevel={revenueByLevel}
              pipelineProgress={pipelineProgress}
              visibleSteps={visibleSteps}
              recommendedPrices={recommendedPrices}
            />
          )}

          {activeTab === "onboarding" && (
            <TabOnboarding
              onboardingChecked={onboardingChecked}
              toggleOnboarding={toggleOnboarding}
              onboardingDone={onboardingDone}
            />
          )}

          {activeTab === "tactique" && (
            <TabTactique
              activePlatforms={activePlatforms}
              checklist={checklist}
              expandedPlatform={expandedPlatform}
              setExpandedPlatform={setExpandedPlatform}
              togglePlatform={togglePlatform}
              toggleTask={toggleTask}
              setChecklist={setChecklist}
              doneTasks={doneTasks}
              totalTasks={totalTasks}
              progress={progress}
            />
          )}

          {activeTab === "objectifs" && (
            <TabObjectifs
              goals={goals}
              goalsLoading={goalsLoading}
              handleDeleteGoal={handleDeleteGoal}
              onAddGoal={() => setShowAddGoal(true)}
            />
          )}

        </div>
      </div>

      <AddGoalModal
        show={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        newGoal={newGoal}
        setNewGoal={setNewGoal}
        onCreate={handleCreateGoal}
      />

    </OsLayout>
  );
}

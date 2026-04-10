"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Target, Globe, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";
import type { Goal } from "@/types/heaven";
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

export default function StrategiePage() {
  const { currentModel, authHeaders, isRoot } = useModel();
  const modelSlug = currentModel || "";

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
    { id: "objectifs", label: "Objectifs", icon: Target },
    { id: "plateformes", label: "Plateformes", icon: Globe },
    { id: "simulateur", label: "Simulateur", icon: BarChart3 },
  ];

  if (!modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            {isRoot ? "Selectionne un modele dans le header" : "Chargement..."}
          </p>
        </div>
      </OsLayout>
    );
  }

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen pb-24" style={{ background: "#0f0f12" }}>

        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,1)" }}>
              Strategie
            </h1>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}
            >
              {goals.length} objectif{goals.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="sticky top-0 z-30 px-4 sm:px-6"
          style={{ background: "#0f0f12", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex gap-6">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative pb-2.5 pt-1 text-xs font-medium cursor-pointer transition-colors"
                  style={{
                    color: isActive ? "#D4AF37" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                      style={{ background: "#D4AF37" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 pt-5">

          {activeTab === "objectifs" && (
            <div className="space-y-8">
              <TabObjectifs
                goals={goals}
                goalsLoading={goalsLoading}
                handleDeleteGoal={handleDeleteGoal}
                onAddGoal={() => setShowAddGoal(true)}
              />

              {/* Tactique section below goals */}
              <div>
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,1)" }}>
                    Tactique hebdomadaire
                  </h2>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Taches par plateforme pour la semaine en cours.
                  </p>
                </div>
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
              </div>
            </div>
          )}

          {activeTab === "plateformes" && (
            <div className="space-y-8">
              <TabPlateformes
                expandedPlatform={expandedPlatform}
                setExpandedPlatform={setExpandedPlatform}
              />

              {/* Onboarding section below platforms */}
              <div>
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,1)" }}>
                    Onboarding
                  </h2>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Checklist de lancement par plateforme.
                  </p>
                </div>
                <TabOnboarding
                  onboardingChecked={onboardingChecked}
                  toggleOnboarding={toggleOnboarding}
                  onboardingDone={onboardingDone}
                />
              </div>
            </div>
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

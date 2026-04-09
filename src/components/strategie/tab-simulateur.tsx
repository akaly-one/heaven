"use client";

import {
  Target, DollarSign, Camera, Zap,
  CheckCircle, Circle, Check, TrendingUp,
  Unlock, BarChart3, Flame,
} from "lucide-react";
import {
  EXPERIENCE_LEVELS, CONTENT_LEVELS, CHANNELS, CATEGORY_META,
  type ExperienceLevel, type SalesChannel, type SimState, type ContentLevel, type PipelineStep,
} from "@/constants/strategie-simulator";

// ── Props ──

interface TabSimulateurProps {
  simState: SimState;
  simTab: "objectif" | "contenu" | "pipeline" | "projections";
  setSimTab: (tab: "objectif" | "contenu" | "pipeline" | "projections") => void;
  setSim: <K extends keyof SimState>(key: K, val: SimState[K]) => void;
  toggleLevel: (lvl: number) => void;
  toggleChannel: (ch: SalesChannel) => void;
  toggleStep: (stepId: string) => void;
  setVolume: (lvl: number, vol: number) => void;
  totalProjectedRevenue: number;
  goalReached: boolean;
  goalProgress: number;
  maxActiveLevel: number;
  revenueByLevel: { level: number; label: string; color: string; volume: number; channelRevenue: number }[];
  pipelineProgress: number;
  visibleSteps: PipelineStep[];
  recommendedPrices: { level: ContentLevel; bestChannel: { ch: SalesChannel; price: number } | null }[];
}

// ── Component ──

export function TabSimulateur({
  simState, simTab, setSimTab, setSim,
  toggleLevel, toggleChannel, toggleStep, setVolume,
  totalProjectedRevenue, goalReached, goalProgress, maxActiveLevel,
  revenueByLevel, pipelineProgress, visibleSteps, recommendedPrices,
}: TabSimulateurProps) {
  const expMeta = EXPERIENCE_LEVELS.find(e => e.id === simState.experience)!;

  return (
    <div className="space-y-5">

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Objectif", value: `${simState.monthlyGoal.toLocaleString()}€`, color: "#F59E0B", icon: Target },
          { label: "Projete", value: `${totalProjectedRevenue.toLocaleString()}€`, color: goalReached ? "#10B981" : "#EF4444", icon: DollarSign },
          { label: "Pipeline", value: `${pipelineProgress}%`, color: pipelineProgress === 100 ? "#10B981" : "#60A5FA", icon: BarChart3 },
          { label: "Niveau max", value: `N${maxActiveLevel}`, color: CONTENT_LEVELS[maxActiveLevel].color, icon: Flame },
        ].map(card => (
          <div key={card.label} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <card.icon className="w-3 h-3" style={{ color: card.color }} />
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{card.label}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Goal progress bar */}
      <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>Progression vers l'objectif</span>
          <span className="text-[11px] font-bold" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
            {Math.round(goalProgress)}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${goalProgress}%`,
            background: goalReached ? "linear-gradient(90deg, #10B981, #059669)" : "linear-gradient(90deg, #F59E0B, #EF4444)",
          }} />
        </div>
        {!goalReached && totalProjectedRevenue > 0 && (
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
            Il manque {(simState.monthlyGoal - totalProjectedRevenue).toLocaleString()}€ — augmente le volume ou active un niveau superieur
          </p>
        )}
      </div>

      {/* Simulator sub-tabs */}
      <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: "var(--bg2)" }}>
        {([
          { id: "objectif" as const, label: "Objectif", icon: Target },
          { id: "contenu" as const, label: "Contenu & Prix", icon: Camera },
          { id: "pipeline" as const, label: "Pipeline", icon: BarChart3 },
          { id: "projections" as const, label: "Projections", icon: TrendingUp },
        ]).map(t => (
          <button key={t.id} onClick={() => setSimTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all"
            style={{
              background: simTab === t.id ? "var(--surface)" : "transparent",
              color: simTab === t.id ? "var(--text)" : "var(--text-muted)",
              boxShadow: simTab === t.id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
            }}>
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── SUB: OBJECTIF ── */}
      {simTab === "objectif" && (
        <div className="space-y-4">
          {/* Experience level */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Niveau d'experience</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {EXPERIENCE_LEVELS.map(exp => {
                const isActive = simState.experience === exp.id;
                return (
                  <button key={exp.id} onClick={() => setSim("experience", exp.id)}
                    className="p-3 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: isActive ? `${exp.color}12` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? `${exp.color}40` : "var(--border)"}`,
                    }}>
                    <exp.icon className="w-4 h-4 mb-1" style={{ color: isActive ? exp.color : "var(--text-muted)" }} />
                    <p className="text-[11px] font-bold" style={{ color: isActive ? exp.color : "var(--text)" }}>{exp.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{exp.subsRange} abonnes</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{exp.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly goal */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Target className="w-4 h-4" style={{ color: "#F59E0B" }} />
              Objectif mensuel
            </h3>
            <div className="flex items-center gap-4 mb-3">
              <input type="range" min={200} max={20000} step={100}
                value={simState.monthlyGoal}
                onChange={e => setSim("monthlyGoal", Number(e.target.value))}
                className="flex-1" style={{ accentColor: "#F59E0B" }} />
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: "rgba(245,158,11,0.1)" }}>
                <DollarSign className="w-3 h-3" style={{ color: "#F59E0B" }} />
                <span className="text-sm font-black" style={{ color: "#F59E0B" }}>{simState.monthlyGoal.toLocaleString()}€</span>
              </div>
            </div>
            <div className="flex justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
              <span>200€</span><span>5 000€</span><span>10 000€</span><span>20 000€</span>
            </div>
          </div>

          {/* Sales channels */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Canaux de vente</h3>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map(ch => {
                const isActive = simState.activeChannels.includes(ch.id);
                return (
                  <button key={ch.id} onClick={() => toggleChannel(ch.id)}
                    className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                    style={{
                      background: isActive ? `${ch.color}10` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? `${ch.color}35` : "var(--border)"}`,
                    }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: isActive ? ch.color : "var(--bg2)", color: isActive ? "#fff" : "var(--text-muted)" }}>
                      <ch.icon className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[11px] font-bold" style={{ color: isActive ? "var(--text)" : "var(--text-muted)" }}>{ch.label}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{ch.desc}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 shrink-0" style={{ color: ch.color }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SUB: CONTENU & PRIX ── */}
      {simTab === "contenu" && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Niveaux de contenu</h3>
            <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
              Active les niveaux que tu veux produire. Chaque niveau inferieur est inclus automatiquement.
            </p>
            <div className="space-y-2">
              {CONTENT_LEVELS.map(level => {
                const isActive = simState.activeLevels.includes(level.id);
                const prices = level.marketPrices[simState.experience];
                const volume = simState.contentVolume[level.id] || 0;
                return (
                  <div key={level.id} className="rounded-xl overflow-hidden transition-all"
                    style={{
                      background: isActive ? `${level.color}06` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isActive ? `${level.color}30` : "var(--border)"}`,
                      opacity: isActive ? 1 : 0.5,
                    }}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button onClick={() => toggleLevel(level.id)}
                        className="cursor-pointer shrink-0" style={{ background: "none", border: "none" }}>
                        {isActive
                          ? <CheckCircle className="w-5 h-5" style={{ color: level.color }} />
                          : <Circle className="w-5 h-5" style={{ color: "var(--border3)" }} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black px-1.5 py-0.5 rounded" style={{ background: `${level.color}20`, color: level.color }}>
                            N{level.id}
                          </span>
                          <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{level.label}</span>
                          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${level.color}15`, color: level.color }}>
                            {level.tierLabel}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{level.desc}</p>
                      </div>
                      {isActive && level.id > 0 && (
                        <level.icon className="w-4 h-4 shrink-0" style={{ color: level.color }} />
                      )}
                    </div>

                    {isActive && level.id > 0 && (
                      <div className="px-4 pb-3 space-y-2" style={{ borderTop: `1px solid ${level.color}15` }}>
                        <div className="pt-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: level.color }}>
                            Prix moyens du marche ({expMeta.label})
                          </span>
                          <div className="grid grid-cols-4 gap-2 mt-1.5">
                            {CHANNELS.filter(ch => simState.activeChannels.includes(ch.id)).map(ch => (
                              <div key={ch.id} className="text-center p-2 rounded-lg" style={{ background: `${ch.color}08` }}>
                                <span className="text-[11px] font-medium block" style={{ color: "var(--text-muted)" }}>{ch.label.split(" ")[0]}</span>
                                <span className="text-xs font-black" style={{ color: ch.color }}>{prices[ch.id]}€</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-medium shrink-0" style={{ color: "var(--text-muted)" }}>Volume/mois:</span>
                          <input type="range" min={0} max={60} step={1} value={volume}
                            onChange={e => setVolume(level.id, Number(e.target.value))}
                            className="flex-1" style={{ accentColor: level.color }} />
                          <span className="text-[11px] font-bold w-10 text-right" style={{ color: level.color }}>{volume}</span>
                        </div>
                        {volume > 0 && (
                          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: `${level.color}08` }}>
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Revenu estime ce niveau:</span>
                            <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>
                              {(simState.activeChannels.reduce((sum, ch) => sum + prices[ch] * volume, 0)).toLocaleString()}€/mois
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Price recommendations */}
          {recommendedPrices.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(245,158,11,0.04))", border: "1px solid rgba(16,185,129,0.1)" }}>
              <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
                <Zap className="w-4 h-4" style={{ color: "#10B981" }} />
                Prix recommandes ({expMeta.label})
              </h3>
              <div className="space-y-2">
                {recommendedPrices.map(({ level, bestChannel }) => (
                  <div key={level.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--surface)" }}>
                    <span className="text-[11px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: `${level.color}20`, color: level.color }}>
                      N{level.id}
                    </span>
                    <span className="text-[11px] font-medium flex-1" style={{ color: "var(--text)" }}>{level.label}</span>
                    {bestChannel && (
                      <div className="text-right">
                        <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>{bestChannel.price}€</span>
                        <span className="text-[11px] ml-1" style={{ color: "var(--text-muted)" }}>
                          via {CHANNELS.find(c => c.id === bestChannel.ch)?.label.split(" ")[0]}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUB: PIPELINE ── */}
      {simTab === "pipeline" && (
        <div className="space-y-4">
          <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>Progression globale</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {simState.completedSteps.filter(s => visibleSteps.some(vs => vs.id === s)).length}/{visibleSteps.length}
                </span>
                <span className="text-xs font-black" style={{ color: pipelineProgress === 100 ? "#10B981" : "#60A5FA" }}>
                  {pipelineProgress}%
                </span>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${pipelineProgress}%`,
                background: pipelineProgress === 100 ? "#10B981" : "linear-gradient(90deg, #60A5FA, #7C3AED)",
              }} />
            </div>
          </div>

          <div className="flex md:grid md:grid-cols-2 gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none"
            style={{ scrollbarWidth: "none" }}>
            {(["setup", "content", "sales", "growth"] as const).map(cat => {
              const catMeta = CATEGORY_META[cat];
              const catSteps = visibleSteps.filter(s => s.category === cat);
              if (catSteps.length === 0) return null;
              const catCompleted = catSteps.filter(s => simState.completedSteps.includes(s.id)).length;
              const catDone = catCompleted === catSteps.length;

              return (
                <div key={cat} className="min-w-[260px] md:min-w-0 snap-start rounded-xl overflow-hidden flex flex-col"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${catDone ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                  }}>
                  <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${catMeta.color}15` }}>
                      <catMeta.icon className="w-3 h-3" style={{ color: catMeta.color }} />
                    </div>
                    <span className="text-[11px] font-bold flex-1" style={{ color: catMeta.color }}>{catMeta.label}</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{
                        background: catDone ? "rgba(16,185,129,0.1)" : `${catMeta.color}10`,
                        color: catDone ? "#10B981" : catMeta.color,
                      }}>
                      {catCompleted}/{catSteps.length}
                    </span>
                  </div>
                  <div className="h-0.5" style={{ background: "var(--bg2)" }}>
                    <div className="h-full transition-all" style={{
                      width: `${(catCompleted / catSteps.length) * 100}%`,
                      background: catDone ? "#10B981" : catMeta.color,
                    }} />
                  </div>
                  <div className="flex-1 p-1.5 space-y-0.5">
                    {catSteps.map(step => {
                      const done = simState.completedSteps.includes(step.id);
                      return (
                        <button key={step.id} onClick={() => toggleStep(step.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-80 text-left"
                          style={{ background: done ? "rgba(16,185,129,0.05)" : "transparent" }}>
                          {done
                            ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#10B981" }} />
                            : <Circle className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--border3)" }} />}
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-medium block truncate" style={{
                              color: done ? "#10B981" : "var(--text)",
                              textDecoration: done ? "line-through" : "none",
                            }}>{step.label}</span>
                          </div>
                          {step.requiresLevel !== undefined && (
                            <span className="text-[11px] font-bold px-1 py-0.5 rounded shrink-0"
                              style={{ background: `${CONTENT_LEVELS[step.requiresLevel].color}15`, color: CONTENT_LEVELS[step.requiresLevel].color }}>
                              N{step.requiresLevel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUB: PROJECTIONS ── */}
      {simTab === "projections" && (
        <div className="space-y-4">
          {/* Revenue breakdown by level */}
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <BarChart3 className="w-4 h-4" style={{ color: "#10B981" }} />
              Revenus par niveau
            </h3>
            {revenueByLevel.length === 0 ? (
              <div className="text-center py-6">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Active des niveaux de contenu pour voir les projections</p>
              </div>
            ) : (
              <div className="space-y-3">
                {revenueByLevel.map(r => (
                  <div key={r.level}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black px-1.5 py-0.5 rounded" style={{ background: `${r.color}20`, color: r.color }}>
                          N{r.level}
                        </span>
                        <span className="text-[11px] font-medium" style={{ color: "var(--text)" }}>{r.label}</span>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{r.volume} posts</span>
                      </div>
                      <span className="text-[11px] font-bold" style={{ color: "#10B981" }}>{r.channelRevenue.toLocaleString()}€</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg2)" }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min((r.channelRevenue / Math.max(simState.monthlyGoal, 1)) * 100, 100)}%`,
                        background: r.color,
                      }} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Total projete</span>
                  <span className="text-base font-black" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
                    {totalProjectedRevenue.toLocaleString()}€/mois
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Revenue by channel */}
          {simState.activeChannels.length > 0 && revenueByLevel.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>Revenus par canal</h3>
              <div className="space-y-2">
                {simState.activeChannels.map(chId => {
                  const ch = CHANNELS.find(c => c.id === chId)!;
                  const chRevenue = simState.activeLevels.filter(l => l > 0).reduce((sum, lvl) => {
                    const prices = CONTENT_LEVELS[lvl].marketPrices[simState.experience];
                    const volume = simState.contentVolume[lvl] || 0;
                    return sum + prices[chId] * volume;
                  }, 0);
                  return (
                    <div key={chId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: `${ch.color}06`, border: `1px solid ${ch.color}15` }}>
                      <ch.icon className="w-4 h-4 shrink-0" style={{ color: ch.color }} />
                      <span className="text-[11px] font-semibold flex-1" style={{ color: "var(--text)" }}>{ch.label}</span>
                      <span className="text-[11px] font-bold" style={{ color: ch.color }}>{chRevenue.toLocaleString()}€</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Goal gap analysis */}
          <div className="rounded-xl p-4" style={{
            background: goalReached
              ? "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.06))"
              : "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.06))",
            border: `1px solid ${goalReached ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`,
          }}>
            <h3 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: goalReached ? "#10B981" : "#F59E0B" }}>
              {goalReached ? <CheckCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
              {goalReached ? "Objectif atteint!" : "Comment atteindre ton objectif"}
            </h3>
            {goalReached ? (
              <div className="space-y-1.5">
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  Avec ta config actuelle, tu depasses ton objectif de <strong>{(totalProjectedRevenue - simState.monthlyGoal).toLocaleString()}€</strong>.
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Pense a augmenter ton objectif ou a diversifier tes canaux.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {maxActiveLevel < 4 && (
                  <div className="flex items-start gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <Unlock className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#7C3AED" }} />
                    <span>Active le niveau <strong>N{maxActiveLevel + 1}</strong> ({CONTENT_LEVELS[maxActiveLevel + 1]?.label}) pour augmenter les prix</span>
                  </div>
                )}
                {simState.activeChannels.length < CHANNELS.length && (
                  <div className="flex items-start gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <Zap className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                    <span>Ajoute un canal de vente supplementaire pour multiplier les revenus</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  <TrendingUp className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
                  <span>Augmente le volume de posts sur tes niveaux les plus rentables</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-center" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            Les projections sont basees sur les moyennes du marche pour ton niveau d'experience.
            Les revenus reels dependent de ta niche, ton engagement, et ta regularite.
          </p>
        </div>
      )}
    </div>
  );
}

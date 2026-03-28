"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Target, Globe, DollarSign, Camera, Zap, Users,
  CheckCircle, Circle, ChevronDown, ChevronUp, Power, Instagram,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";

// ── Platform definitions ──

interface Platform {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  commission: string;
  automation: "auto" | "semi" | "manual";
  tasks: string[];
}

const PLATFORMS: Platform[] = [
  {
    id: "onlyfans", name: "OnlyFans", icon: Globe, color: "#00AFF0",
    commission: "20%", automation: "manual",
    tasks: ["Poster 3+ contenus", "Repondre DMs (<2h)", "Envoyer mass DM promo", "Verifier abonnements expirants", "Publier 1 PPV exclusif"],
  },
  {
    id: "fansly", name: "Fansly", icon: Globe, color: "#1DA1F2",
    commission: "20%", automation: "semi",
    tasks: ["Poster contenu exclusif", "Configurer tiers", "Cross-promo depuis OF", "Verifier analytics"],
  },
  {
    id: "fanvue", name: "Fanvue", icon: Zap, color: "#FF6B6B",
    commission: "15%", automation: "auto",
    tasks: ["Verifier AI chat reponses", "Poster contenu", "Analyser conversions AI", "Ajuster catalogue"],
  },
  {
    id: "instagram", name: "Instagram", icon: Instagram, color: "#E4405F",
    commission: "0%", automation: "semi",
    tasks: ["Publier 3+ stories", "Poster 1 reel", "Repondre DMs", "Interagir avec followers", "Bio link a jour"],
  },
  {
    id: "snapchat", name: "Snapchat", icon: Camera, color: "#FFFC00",
    commission: "0%", automation: "manual",
    tasks: ["Envoyer snaps prives VIP+", "Verifier codes expirants", "Repondre aux messages", "Poster story publique"],
  },
  {
    id: "mym", name: "MYM", icon: Globe, color: "#FF3366",
    commission: "25%", automation: "semi",
    tasks: ["Activer push contenu", "Poster exclusif", "Repondre DMs", "Verifier revenus"],
  },
  {
    id: "tiktok", name: "TikTok", icon: Globe, color: "#000000",
    commission: "0%", automation: "manual",
    tasks: ["Poster 1 video/jour", "Utiliser sons trending", "Hashtags optimises", "Bio link actif"],
  },
  {
    id: "stripchat", name: "Stripchat", icon: Globe, color: "#FF0066",
    commission: "50%", automation: "manual",
    tasks: ["Planifier session live", "Definir objectifs tips", "Promouvoir schedule", "Analyser revenus session"],
  },
];

// ── Page ──

export default function StrategiePage() {
  const { currentModel } = useModel();
  const modelSlug = currentModel || "yumi";

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

  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(`heaven_strategy_${modelSlug}`, JSON.stringify({ platforms: [...activePlatforms] }));
  }, [activePlatforms, modelSlug]);

  useEffect(() => {
    localStorage.setItem(`heaven_checklist_${modelSlug}`, JSON.stringify(checklist));
  }, [checklist, modelSlug]);

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

  const resetChecklist = useCallback(() => setChecklist({}), []);

  const active = PLATFORMS.filter(p => activePlatforms.has(p.id));
  const totalTasks = active.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = active.reduce((sum, p) => sum + p.tasks.filter((_, i) => checklist[`${p.id}-${i}`]).length, 0);
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const badge = (level: "auto" | "semi" | "manual") => ({
    auto: { label: "Auto", bg: "rgba(16,185,129,0.12)", color: "#10B981" },
    semi: { label: "Semi", bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    manual: { label: "Manuel", bg: "rgba(100,116,139,0.12)", color: "#64748B" },
  }[level]);

  return (
    <OsLayout cpId="agence">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Target className="w-5 h-5" style={{ color: "var(--accent)" }} /> Strategie
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Active les plateformes — la checklist se construit automatiquement.
          </p>
        </div>

        {/* Progress */}
        <div className="rounded-xl p-4 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{doneTasks}/{totalTasks} taches</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: progress === 100 ? "var(--success)" : "var(--accent)" }}>{progress}%</span>
              <button onClick={resetChecklist} className="text-[10px] px-2 py-0.5 rounded cursor-pointer hover:opacity-70" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>Reset</button>
            </div>
          </div>
          <div className="h-2 rounded-full" style={{ background: "var(--bg2)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progress === 100 ? "var(--success)" : "var(--accent)" }} />
          </div>
        </div>

        {/* Platform toggles — horizontal scroll */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Plateformes</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {PLATFORMS.map(p => {
              const isActive = activePlatforms.has(p.id);
              const b = badge(p.automation);
              return (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer transition-all shrink-0"
                  style={{
                    background: isActive ? `${p.color}12` : "var(--surface)",
                    border: `1px solid ${isActive ? `${p.color}30` : "var(--border)"}`,
                    color: isActive ? p.color : "var(--text-muted)",
                    opacity: isActive ? 1 : 0.5,
                  }}>
                  <Power className="w-3 h-3" /> {p.name}
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Checklists per active platform */}
        {active.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Globe className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Active au moins une plateforme</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(platform => {
              const b = badge(platform.automation);
              const done = platform.tasks.filter((_, i) => checklist[`${platform.id}-${i}`]).length;
              const pct = Math.round((done / platform.tasks.length) * 100);
              const isOpen = expanded === platform.id;
              return (
                <div key={platform.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: `1px solid ${platform.color}20` }}>
                  <button onClick={() => setExpanded(isOpen ? null : platform.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: platform.color }} />
                    <span className="text-sm font-bold flex-1 text-left" style={{ color: "var(--text)" }}>{platform.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                    <span className="text-[10px] font-mono" style={{ color: platform.color }}>{done}/{platform.tasks.length}</span>
                    <div className="w-16 h-1.5 rounded-full" style={{ background: "var(--bg2)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: platform.color }} />
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 space-y-1" style={{ borderTop: `1px solid ${platform.color}10` }}>
                      <p className="text-[10px] py-1" style={{ color: "var(--text-muted)" }}>Commission: {platform.commission}</p>
                      {platform.tasks.map((task, i) => {
                        const key = `${platform.id}-${i}`;
                        const isDone = !!checklist[key];
                        return (
                          <button key={key} onClick={() => toggleTask(key)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left cursor-pointer transition-all"
                            style={{ background: isDone ? `${platform.color}06` : "transparent", border: `1px solid ${isDone ? `${platform.color}15` : "var(--border)"}` }}>
                            {isDone ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: platform.color }} /> : <Circle className="w-4 h-4 shrink-0" style={{ color: "var(--border3)" }} />}
                            <span className="text-xs flex-1" style={{ color: isDone ? platform.color : "var(--text-secondary)", textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.7 : 1 }}>{task}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {active.length > 0 && (
          <div className="mt-6 rounded-xl p-4 grid grid-cols-3 gap-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{active.length}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Plateformes</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{totalTasks}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Taches/semaine</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--success)" }}>{active.filter(p => p.automation !== "manual").length}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Automatisees</p>
            </div>
          </div>
        )}
      </div>
    </OsLayout>
  );
}

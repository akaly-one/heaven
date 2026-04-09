"use client";

import {
  CheckCircle, Circle, ChevronDown, ChevronUp,
  Power, Globe,
} from "lucide-react";
import { PLATFORMS } from "@/constants/strategie-platforms";

// ── Helpers ──

const badge = (level: "auto" | "semi" | "manual") => ({
  auto: { label: "Auto", bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  semi: { label: "Semi", bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  manual: { label: "Manuel", bg: "rgba(100,116,139,0.12)", color: "#64748B" },
}[level]);

// ── Props ──

interface TabTactiqueProps {
  activePlatforms: Set<string>;
  checklist: Record<string, boolean>;
  expandedPlatform: string | null;
  setExpandedPlatform: (id: string | null) => void;
  togglePlatform: (id: string) => void;
  toggleTask: (taskKey: string) => void;
  setChecklist: (val: Record<string, boolean>) => void;
  doneTasks: number;
  totalTasks: number;
  progress: number;
}

// ── Component ──

export function TabTactique({
  activePlatforms, checklist, expandedPlatform, setExpandedPlatform,
  togglePlatform, toggleTask, setChecklist,
  doneTasks, totalTasks, progress,
}: TabTactiqueProps) {
  const active = PLATFORMS.filter(p => activePlatforms.has(p.id));

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{doneTasks}/{totalTasks} taches</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: progress === 100 ? "var(--success, #10B981)" : "var(--accent)" }}>{progress}%</span>
            <button onClick={() => setChecklist({})} className="text-[11px] px-2 py-0.5 rounded cursor-pointer hover:opacity-70" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>Reset</button>
          </div>
        </div>
        <div className="h-2 rounded-full" style={{ background: "var(--bg2, #1a1a1a)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progress === 100 ? "var(--success, #10B981)" : "var(--accent)" }} />
        </div>
      </div>

      {/* Platform toggles */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Plateformes actives cette semaine</h2>
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
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
                <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.color }}>{b.label}</span>
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
            const isOpen = expandedPlatform === platform.id;
            return (
              <div key={platform.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: `1px solid ${platform.color}20` }}>
                <button onClick={() => setExpandedPlatform(isOpen ? null : platform.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: platform.color }} />
                  <span className="text-sm font-bold flex-1 text-left" style={{ color: "var(--text)" }}>{platform.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                  <span className="text-[11px] font-mono" style={{ color: platform.color }}>{done}/{platform.tasks.length}</span>
                  <div className="w-16 h-1.5 rounded-full" style={{ background: "var(--bg2, #1a1a1a)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: platform.color }} />
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 space-y-1" style={{ borderTop: `1px solid ${platform.color}10` }}>
                    <p className="text-[11px] py-1" style={{ color: "var(--text-muted)" }}>Commission: {platform.commission}</p>
                    {platform.tasks.map((task, i) => {
                      const key = `${platform.id}-${i}`;
                      const isDone = !!checklist[key];
                      return (
                        <button key={key} onClick={() => toggleTask(key)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left cursor-pointer transition-all"
                          style={{ background: isDone ? `${platform.color}06` : "transparent", border: `1px solid ${isDone ? `${platform.color}15` : "var(--border)"}` }}>
                          {isDone ? <CheckCircle className="w-4 h-4 shrink-0" style={{ color: platform.color }} /> : <Circle className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />}
                          <span className="text-xs flex-1" style={{ color: isDone ? platform.color : "var(--text-muted)", textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.7 : 1 }}>{task}</span>
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
        <div className="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div>
            <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{active.length}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Plateformes</p>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{totalTasks}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Taches/semaine</p>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: "var(--success, #10B981)" }}>{active.filter(p => p.automation !== "manual").length}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Automatisees</p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  Target, Calendar, Plus, Trash2,
} from "lucide-react";
import type { Goal } from "@/types/heaven";
import { CATEGORY_ICONS } from "@/constants/strategie-tabs";

// ── Props ──

interface TabObjectifsProps {
  goals: Goal[];
  goalsLoading: boolean;
  handleDeleteGoal: (goalId: string) => void;
  onAddGoal: () => void;
}

// ── Component ──

export function TabObjectifs({ goals, goalsLoading, handleDeleteGoal, onAddGoal }: TabObjectifsProps) {
  return (
    <div className="space-y-4">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Objectifs actifs
        </p>
        <button
          onClick={onAddGoal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}
        >
          <Plus className="w-3 h-3" />
          Objectif
        </button>
      </div>

      {/* Goal list */}
      {goalsLoading ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Chargement...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <Target className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun objectif defini</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Ajoute un objectif pour suivre ta progression</p>
        </div>
      ) : (
        <div className="space-y-2">
          {goals
            .filter((g) => g.status === "active")
            .map((goal) => {
              const progress = goal.target_value > 0 ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;
              const CategoryIcon = CATEGORY_ICONS[goal.category] || Target;
              return (
                <div key={goal.id} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--bg2, #1a1a1a)" }}>
                        <CategoryIcon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                      </div>
                      <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{goal.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {goal.current_value} / {goal.target_value} {goal.unit}
                      </span>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 rounded-md cursor-pointer hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg2, #1a1a1a)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: progress >= 100 ? "#10B981" : progress >= 50 ? "var(--accent)" : "var(--rose)",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] capitalize px-1.5 py-0.5 rounded-md" style={{ background: "var(--bg2, #1a1a1a)", color: "var(--text-muted)" }}>{goal.category}</span>
                      <span className="text-[11px] font-bold" style={{ color: progress >= 100 ? "#10B981" : progress >= 50 ? "var(--accent)" : "var(--rose)" }}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    {goal.deadline && (
                      <span className="text-[11px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
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
  );
}

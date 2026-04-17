"use client";

import { CheckCircle } from "lucide-react";
import { ONBOARDING_CATEGORIES, GLOBAL_CHECKLIST } from "@/constants/strategie-onboarding";

// ── Props ──

interface TabOnboardingProps {
  onboardingChecked: Record<string, boolean>;
  toggleOnboarding: (label: string) => void;
  onboardingDone: number;
}

// ── Component ──

export function TabOnboarding({ onboardingChecked, toggleOnboarding, onboardingDone }: TabOnboardingProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold" style={{ color: "var(--text)" }}>
            Checklist d'onboarding universel
          </p>
          <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
            {onboardingDone}/{GLOBAL_CHECKLIST.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "var(--bg2, #1a1a1a)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(onboardingDone / GLOBAL_CHECKLIST.length) * 100}%`, background: "var(--accent)" }} />
        </div>
      </div>

      {(Object.keys(ONBOARDING_CATEGORIES) as (keyof typeof ONBOARDING_CATEGORIES)[]).map(cat => {
        const cfg = ONBOARDING_CATEGORIES[cat];
        const items = GLOBAL_CHECKLIST.filter(i => i.category === cat);
        return (
          <div key={cat} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</p>
            </div>
            <div className="space-y-1.5">
              {items.map(item => {
                const isDone = !!onboardingChecked[item.label];
                return (
                  <button key={item.label} onClick={() => toggleOnboarding(item.label)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left cursor-pointer transition-all"
                    style={{ background: isDone ? `${cfg.color}08` : "transparent", border: `1px solid ${isDone ? `${cfg.color}20` : "var(--border)"}` }}>
                    <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{ background: isDone ? cfg.color : "transparent", border: `1.5px solid ${isDone ? cfg.color : "var(--border)"}` }}>
                      {isDone && <CheckCircle className="w-3 h-3" style={{ color: "#fff" }} />}
                    </div>
                    <span className="text-[11px]" style={{ color: isDone ? "var(--text-muted)" : "var(--text)", textDecoration: isDone ? "line-through" : "none" }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

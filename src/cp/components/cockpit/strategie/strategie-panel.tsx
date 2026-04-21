"use client";

/**
 * StrategiePanel — Phase 7 Agent 7.A (B6)
 *
 * Refonte complète du panel Stratégie en 3 onglets :
 * - Plan A (Yumi IA pur) — par défaut
 * - Plan B (modèles physiques via plateformes Yumi)
 * - Plan C (consultance indépendante)
 *
 * Scope visuel :
 * - Admin (root + yumi) → 3 onglets visibles
 * - Modèles Plan B (paloma / ruby) → uniquement Plan B (leur propre scope)
 *
 * Remplace le wrapper créé Phase 2.B. Le composant legacy
 * `@/components/cockpit/strategie-panel` (~660L, tactique+objectifs+simulateur)
 * reste disponible mais n'est plus mouvé via cet alias.
 */

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Users, Briefcase } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useModel } from "@/lib/model-context";
import { PlanAYumiIA } from "./plan-a-yumi-ia";
import { PlanBHubAnnexe } from "./plan-b-hub-annexe";
import { PlanCConsultance } from "./plan-c-consultance";

type PlanTab = "plan-a" | "plan-b" | "plan-c";

interface TabDef {
  id: PlanTab;
  label: string;
  icon: LucideIcon;
  color: string;
  adminOnly?: boolean;
}

const ALL_TABS: TabDef[] = [
  { id: "plan-a", label: "Plan A — Yumi IA", icon: Sparkles, color: "#D4AF37" },
  { id: "plan-b", label: "Plan B — Modèles", icon: Users, color: "#5B8DEF" },
  { id: "plan-c", label: "Plan C — Consultance", icon: Briefcase, color: "#A855F7", adminOnly: true },
];

/* ─────────────────────────────────────────
   Permissions helpers
   ─────────────────────────────────────────
   Règle NB (2026-04-21) : chaque modèle choisit une stratégie (mode_operation
   A/B/C en DB) et ne voit que celle-là. Yumi = agence IA → voit toutes les
   stratégies.
   - isAdmin = isRoot OR model_slug === "yumi" → voit les 3 plans
   - modèle non-admin → voit uniquement son plan selon mode_operation DB
   Fallback (mode non chargé) : plan selon slug connu, sinon plan-a par défaut.
 */
type ModeOp = "A" | "B" | "C" | null;

function modeToPlan(mode: ModeOp): PlanTab {
  if (mode === "B") return "plan-b";
  if (mode === "C") return "plan-c";
  return "plan-a";
}

function useStrategiePermissions() {
  const { auth, isRoot } = useModel();
  const slug = auth?.model_slug;
  const isAdmin = isRoot || slug === "yumi";
  const [mode, setMode] = useState<ModeOp>(null);

  // Fetch mode_operation du modèle courant (non-admin)
  useEffect(() => {
    if (!slug || isAdmin) { setMode(null); return; }
    let aborted = false;
    fetch(`/api/agence/models/${encodeURIComponent(slug)}`, {
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (aborted || !d) return;
        const m = (d.model?.mode_operation ?? d.mode_operation) as ModeOp;
        if (m === "A" || m === "B" || m === "C") setMode(m);
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, [slug, isAdmin]);

  const hasViewRevenueSelf = !!auth;
  return { isAdmin, mode, hasViewRevenueSelf };
}

export function StrategiePanel() {
  const { auth } = useModel();
  const { isAdmin, mode } = useStrategiePermissions();

  const tabs = useMemo<TabDef[]>(() => {
    if (isAdmin) return ALL_TABS;
    const ownPlan = modeToPlan(mode);
    return ALL_TABS.filter((t) => t.id === ownPlan);
  }, [isAdmin, mode]);

  const defaultTab: PlanTab = useMemo(() => {
    if (!isAdmin) return modeToPlan(mode);
    return "plan-a";
  }, [isAdmin, mode]);

  const [tab, setTab] = useState<PlanTab>(defaultTab);

  // Keep tab in sync if permissions change at runtime
  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) {
      setTab(tabs[0]?.id || "plan-a");
    }
  }, [tabs, tab]);

  if (!auth) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Chargement...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-16">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(212,175,55,0.15)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              Stratégie
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              3 Plans stratégiques Heaven — roadmap T1 → T4 (BP v1 2026-04)
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar — scrollable sur mobile */}
      <div
        className="sticky top-12 z-20 mb-6 -mx-4 px-4 md:-mx-8 md:px-8 pb-2"
        style={{
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all shrink-0"
                style={{
                  background: isActive ? `${t.color}14` : "transparent",
                  border: `1px solid ${isActive ? `${t.color}40` : "transparent"}`,
                  color: isActive ? t.color : "var(--text-muted)",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold whitespace-nowrap">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {tab === "plan-a" && <PlanAYumiIA />}
        {tab === "plan-b" && <PlanBHubAnnexe />}
        {tab === "plan-c" && <PlanCConsultance />}
      </div>
    </div>
  );
}

export default StrategiePanel;

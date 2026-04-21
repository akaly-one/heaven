"use client";

/**
 * PlanAYumiIA — Phase 7 Agent 7.A (B6)
 *
 * Onglet Stratégie Plan A : Yumi modèle IA pur.
 * - Positionnement : AI influenceuse premium EU mode/lifestyle
 * - Objectif M3 : ≥ 500 abonnés free Fanvue + ≥ 100 € cumulés
 * - Actions clés : Calendrier posts IG, config Agent IA, KPIs Fanvue
 *
 * Intègre <MilestonesTracker modelId="m1" milestone="M3" />
 */

import Link from "next/link";
import { Sparkles, Calendar, Bot, BarChart3, ArrowRight, Crown } from "lucide-react";
import { MilestonesTracker } from "./milestones-tracker";

export function PlanAYumiIA() {
  return (
    <div className="space-y-6">
      {/* Hero positioning */}
      <div
        className="rounded-xl p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))",
          border: "1px solid rgba(212,175,55,0.25)",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(212,175,55,0.15)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Plan A — Yumi IA pur
              </h3>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
              >
                ACTIF T1
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              AI influenceuse premium mode / lifestyle EU classy. 100 % IA,
              compte agence propre, revenu Sqwensy 100 % net après coûts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(212,175,55,0.2)" }}>
          <div>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Positionnement
            </span>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text)" }}>
              Premium EU classy
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Plateformes
            </span>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text)" }}>
              IG + Fanvue
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Part Sqwensy
            </span>
            <p className="text-xs font-bold mt-0.5" style={{ color: "#22C55E" }}>
              100 % net
            </p>
          </div>
        </div>
      </div>

      {/* Milestone tracker */}
      <MilestonesTracker modelId="m1" milestone="M3" />

      {/* Actions clés */}
      <div>
        <h4
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--text)" }}
        >
          Actions clés
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Calendrier IG */}
          <Link
            href="/agence/contenu"
            className="group rounded-xl p-4 transition-all hover:scale-[1.01] cursor-pointer"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <Calendar className="w-5 h-5 mb-2" style={{ color: "#5B8DEF" }} />
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text)" }}>
              Calendrier posts IG
            </p>
            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              Feed + stories @yumiiiclub, pipeline publications
            </p>
            <div
              className="flex items-center gap-1 text-[10px] font-medium opacity-70 group-hover:opacity-100"
              style={{ color: "#5B8DEF" }}
            >
              Ouvrir <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Agent IA Yumi */}
          <Link
            href="/agence/instagram"
            className="group rounded-xl p-4 transition-all hover:scale-[1.01] cursor-pointer"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <Bot className="w-5 h-5 mb-2" style={{ color: "#A855F7" }} />
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text)" }}>
              Config Agent IA Yumi
            </p>
            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              Scripts DM, persona, funnel cam → Fanvue
            </p>
            <div
              className="flex items-center gap-1 text-[10px] font-medium opacity-70 group-hover:opacity-100"
              style={{ color: "#A855F7" }}
            >
              Ouvrir <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* KPIs */}
          <Link
            href="/agence/ops"
            className="group rounded-xl p-4 transition-all hover:scale-[1.01] cursor-pointer"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <BarChart3 className="w-5 h-5 mb-2" style={{ color: "#22C55E" }} />
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text)" }}>
              KPIs Fanvue
            </p>
            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              Abonnés / conv PPV / panier moyen
            </p>
            <div
              className="flex items-center gap-1 text-[10px] font-medium opacity-70 group-hover:opacity-100"
              style={{ color: "#22C55E" }}
            >
              Ouvrir <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>

      {/* KPIs cibles */}
      <div>
        <h4
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--text)" }}
        >
          KPIs cibles trimestre
        </h4>
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Abonnés free Fanvue", target: "500", color: "#5B8DEF" },
              { label: "Revenu cumul", target: "100 €", color: "#22C55E" },
              { label: "Conv PPV", target: "3-5 %", color: "#D4AF37" },
              { label: "Panier moyen", target: "15-25 €", color: "#A855F7" },
            ].map((kpi) => (
              <div key={kpi.label}>
                <span
                  className="text-[10px] uppercase tracking-wider block mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {kpi.label}
                </span>
                <div className="flex items-center gap-1">
                  <Crown className="w-3 h-3" style={{ color: kpi.color }} />
                  <span className="text-base font-bold" style={{ color: kpi.color }}>
                    {kpi.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(34,197,94,0.04)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        <h4
          className="text-xs font-semibold mb-2"
          style={{ color: "#22C55E" }}
        >
          Next steps M1 → M3
        </h4>
        <ol className="space-y-1.5 text-[11px]" style={{ color: "var(--text)" }}>
          <li>1. Activer Agent IA Yumi (prérequis : débloquer clé IA D-5)</li>
          <li>2. Publier 3× / sem sur IG @yumiiiclub (organic funnel)</li>
          <li>3. Lancer Beacon → PPV Fanvue avec UTM tracking</li>
          <li>4. Valider Meta App Review (D-4 Business Verif SQWENSY)</li>
          <li>5. Gate M3 : 500 abonnés + 100 € → décision ouverture Plan B</li>
        </ol>
      </div>
    </div>
  );
}

export default PlanAYumiIA;

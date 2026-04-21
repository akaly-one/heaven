"use client";

/**
 * PlanCConsultance — Phase 7 Agent 7.A (B6)
 *
 * Onglet Stratégie Plan C : consultance B2B indépendantes.
 * - Différenciation visage vs sans visage (Plan Identité)
 * - Offre type : setup 800-2 500 € + subscription 150-500 €/mois + commission 5-10 %
 * - Workflow : pré-remplissage Release Form → review admin → génération dossier + contrat
 * - Prospects : placeholder (future phase)
 * - Plan financier facturation : link Phase 8.B
 * - Disclaimer : dispo dès M9 conditionnel
 */

import Link from "next/link";
import {
  Briefcase,
  EyeOff,
  User,
  FileSignature,
  Banknote,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

export function PlanCConsultance() {
  return (
    <div className="space-y-6">
      {/* Disclaimer conditionnel */}
      <div
        className="rounded-xl p-3 flex items-center gap-3"
        style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        <Clock className="w-4 h-4 shrink-0" style={{ color: "#F59E0B" }} />
        <p className="text-[11px]" style={{ color: "var(--text)" }}>
          <span className="font-bold" style={{ color: "#F59E0B" }}>
            Disponible dès M9
          </span>{" "}
          — conditionnel à la validation milestone M9 (≥ 750 €/mois A+B, marge ≥ 150 €).
          Les écrans ci-dessous sont des previews de l&apos;offre.
        </p>
      </div>

      {/* Hero */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(168,85,247,0.02))",
          border: "1px solid rgba(168,85,247,0.25)",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(168,85,247,0.15)" }}
          >
            <Briefcase className="w-5 h-5" style={{ color: "#A855F7" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Plan C — Services B2B indépendantes
              </h3>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(148,163,184,0.15)", color: "#94A3B8" }}
              >
                T4 (M10-M12)
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sqwensy = prestataire tech/stratégique pour modèles autonomes. La
              cliente garde son compte propre ; Sqwensy fournit setup + IA DM +
              stratégie commerciale, rémunéré en setup + subscription + commission.
            </p>
          </div>
        </div>
      </div>

      {/* Stratégie visage vs sans visage */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>
          Différenciation — Plan Identité
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4" style={{ color: "#22C55E" }} />
              <p className="text-xs font-bold" style={{ color: "#22C55E" }}>
                Découverte (visage)
              </p>
            </div>
            <p className="text-[11px] mb-3" style={{ color: "var(--text)" }}>
              Visage + image assumés. Identité légale/adresse/entourage toujours
              protégée. Meilleur conversion funnel mais coût production + audit
              image plus lourds.
            </p>
            <ul className="space-y-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <li>— Funnel IG organic + collab</li>
              <li>— Pricing premium (setup 2 000-2 500 €)</li>
              <li>— Contrat type D avec clauses image</li>
            </ul>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(148,163,184,0.25)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <EyeOff className="w-4 h-4" style={{ color: "#94A3B8" }} />
              <p className="text-xs font-bold" style={{ color: "#94A3B8" }}>
                Shadow (sans visage)
              </p>
            </div>
            <p className="text-[11px] mb-3" style={{ color: "var(--text)" }}>
              Visage + marques distinctives (tatouages, cicatrices, décor)
              cachés ou floutés. Sécurité maximale, effort production faceswap
              + compliance deepfake.
            </p>
            <ul className="space-y-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <li>— Faceswap avant/après obligatoire</li>
              <li>— Pricing conservateur (setup 800-1 500 €)</li>
              <li>— Contrat type S avec clauses shadow</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Offre type */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>
          Offre type
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Sparkles className="w-5 h-5 mb-2" style={{ color: "#D4AF37" }} />
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              Setup initial
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color: "#D4AF37" }}>
              800 — 2 500 €
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              One-shot : onboarding, brand strategy, agent IA DM config, pack visuel
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Banknote className="w-5 h-5 mb-2" style={{ color: "#22C55E" }} />
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              Subscription mensuelle
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color: "#22C55E" }}>
              150 — 500 €/mois
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              Accès IA DM + pipeline automations + support technique
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <FileSignature className="w-5 h-5 mb-2" style={{ color: "#A855F7" }} />
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              Commission croissance
            </p>
            <p className="text-lg font-bold tabular-nums" style={{ color: "#A855F7" }}>
              5 — 10 %
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              Sur part croissance vs mois référence (M0 signature)
            </p>
          </div>
        </div>
      </div>

      {/* Workflow onboarding */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>
          Workflow conclusion accord pro
        </h4>
        <ol
          className="rounded-xl p-4 space-y-2 text-[11px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>1</span>
            Candidate cliente C pré-remplit Release Form Fanvue via portail dédié (Agent 7.B livrable).
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>2</span>
            Review admin Heaven — validation documents + Plan Identité choisi (Découverte / Shadow).
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>3</span>
            Génération dossier client (stratégie commerciale + pack visuel + KPIs) + contrat type Plan C (Agent 7.C).
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>4</span>
            Signature électronique + facturation setup (voir plan financier facturation).
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>5</span>
            Instanciation Agent IA dédié cliente + onboarding 30 min visio.
          </li>
          <li className="flex items-start gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>6</span>
            Revue mensuelle KPIs + facturation subscription + commission croissance.
          </li>
        </ol>
      </div>

      {/* Prospects placeholder */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>
          Prospects
        </h4>
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}
        >
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Table prospects à construire (phase future).
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Une fois M9 validé, la pipeline CRM B2B sera activée ici.
          </p>
        </div>
      </div>

      {/* Plan financier facturation link */}
      <Link
        href="/agence/finances"
        className="group flex items-center gap-3 rounded-xl p-4 transition-all hover:scale-[1.005] cursor-pointer"
        style={{
          background: "var(--surface)",
          border: "1px solid rgba(34,197,94,0.25)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(34,197,94,0.12)" }}
        >
          <Banknote className="w-5 h-5" style={{ color: "#22C55E" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
            Plan financier facturation Plan C
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Templates factures setup / subscription / commission croissance — Phase 8.B
          </p>
        </div>
        <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "#22C55E" }} />
      </Link>
    </div>
  );
}

export default PlanCConsultance;

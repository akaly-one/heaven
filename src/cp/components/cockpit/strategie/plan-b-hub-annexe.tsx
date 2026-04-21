"use client";

/**
 * PlanBHubAnnexe — Phase 7 Agent 7.A (B6)
 *
 * Onglet Stratégie Plan B : modèles physiques via plateformes Yumi.
 * - Paliers rémunération P1-P4 visuel (1 k€ / 9 k€ / 20 k€ annualisés)
 * - Workflow onboarding : Release Form DMCA + Contrat privé
 * - Modèles actives : liste paloma (m2) / ruby (m3) + statut
 * - Commission 70 % modèle / 30 % Sqwensy (preview calcul)
 * - Caming : placeholder Q3 2026
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  TrendingUp,
  ShieldCheck,
  FileSignature,
  Video,
  Calculator,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { useModel } from "@/lib/model-context";

/* ─────────────────────────────────────────
   Paliers BP Heaven §Paliers (BE 2025)
   ───────────────────────────────────────── */

interface Palier {
  id: "P1" | "P2" | "P3" | "P4";
  label: string;
  range: string;
  lowerBound: number;
  upperBound: number;
  voieFiscale: string;
  actionCP: string;
  color: string;
}

const PALIERS: Palier[] = [
  {
    id: "P1",
    label: "P1 Test",
    range: "< 1 k€",
    lowerBound: 0,
    upperBound: 1000,
    voieFiscale: "Droit à l'image / profits divers",
    actionCP: "Note paiement signée",
    color: "#94A3B8",
  },
  {
    id: "P2",
    label: "P2 Démarrage",
    range: "1-9 k€",
    lowerBound: 1000,
    upperBound: 9000,
    voieFiscale: "Droit à l'image",
    actionCP: "Note paiement mensuelle",
    color: "#5B8DEF",
  },
  {
    id: "P3",
    label: "P3 Structuration",
    range: "9-20 k€",
    lowerBound: 9000,
    upperBound: 20000,
    voieFiscale: "Indép. complémentaire BE",
    actionCP: "Facturation + INASTI",
    color: "#D4AF37",
  },
  {
    id: "P4",
    label: "P4 Pro",
    range: "> 20 k€",
    lowerBound: 20000,
    upperBound: 100000,
    voieFiscale: "Indép. renforcée ± TVA",
    actionCP: "Facturation TVA + déclarations trim.",
    color: "#22C55E",
  },
];

/* ─────────────────────────────────────────
   Simulateur commission 70/30
   ───────────────────────────────────────── */

function computePalier(annualRevenue: number): Palier {
  return (
    PALIERS.find((p) => annualRevenue >= p.lowerBound && annualRevenue < p.upperBound) ||
    PALIERS[PALIERS.length - 1]
  );
}

function CommissionPreview() {
  const [gross, setGross] = useState<number>(500);
  const modele = useMemo(() => gross * 0.7, [gross]);
  const sqwensy = useMemo(() => gross * 0.3, [gross]);
  const annualized = gross * 12;
  const palier = computePalier(annualized);

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4" style={{ color: "#D4AF37" }} />
        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
          Simulateur commission 70/30
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
            Revenu brut mensuel (€)
          </label>
          <input
            type="number"
            value={gross}
            onChange={(e) => setGross(Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3 py-2 rounded-lg text-sm font-semibold tabular-nums"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
            Palier détecté (annualisé)
          </label>
          <div
            className="px-3 py-2 rounded-lg text-sm font-bold"
            style={{
              background: `${palier.color}14`,
              color: palier.color,
              border: `1px solid ${palier.color}40`,
            }}
          >
            {palier.label} ({palier.voieFiscale})
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg p-3" style={{ background: "rgba(34,197,94,0.08)" }}>
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "#22C55E" }}>
            Part modèle
          </span>
          <p className="text-lg font-bold tabular-nums" style={{ color: "#22C55E" }}>
            {modele.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </p>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            70 %
          </span>
        </div>
        <div className="rounded-lg p-3" style={{ background: "rgba(212,175,55,0.08)" }}>
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "#D4AF37" }}>
            Part Sqwensy
          </span>
          <p className="text-lg font-bold tabular-nums" style={{ color: "#D4AF37" }}>
            {sqwensy.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </p>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            30 %
          </span>
        </div>
        <div className="rounded-lg p-3" style={{ background: "rgba(91,141,239,0.08)" }}>
          <span className="text-[10px] uppercase tracking-wider block" style={{ color: "#5B8DEF" }}>
            Annualisé
          </span>
          <p className="text-lg font-bold tabular-nums" style={{ color: "#5B8DEF" }}>
            {annualized.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </p>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            × 12
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Modèles actives (paloma + ruby)
   ───────────────────────────────────────── */

interface ModelRow {
  slug: string;
  display_name: string;
  model_id?: string;
  mode_operation?: string | null;
  identity_plan?: "discovery" | "shadow" | null;
  palier_remuneration?: string | null;
  statut_initial?: string | null;
  statut_initial_verified?: boolean | null;
  release_form_status?: string | null;
}

function ActiveModelsList() {
  const { authHeaders } = useModel();
  const [rows, setRows] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = authHeaders();
    fetch("/api/models", { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const raw = (data?.models || []) as Array<
          Partial<ModelRow> & { model_slug?: string | null }
        >;
        const list: ModelRow[] = raw
          .map((m) => ({
            slug: (m.slug || m.model_slug || "") as string,
            display_name: m.display_name || "",
            model_id: m.model_id ?? undefined,
            mode_operation: m.mode_operation ?? null,
            identity_plan: (m.identity_plan as "discovery" | "shadow") ?? null,
            palier_remuneration: m.palier_remuneration ?? null,
            statut_initial: m.statut_initial ?? null,
            statut_initial_verified: m.statut_initial_verified ?? null,
            release_form_status: m.release_form_status ?? null,
          }))
          .filter((r) => r.slug);
        // Plan B = modèles physiques (exclure m1 Yumi IA + comptes root sans model_id)
        setRows(
          list.filter(
            (r) => r.slug !== "yumi" && r.model_id !== "m1" && r.model_id,
          ),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authHeaders]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl animate-pulse"
            style={{ background: "rgba(255,255,255,0.03)" }}
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Aucune modèle B active actuellement. Ouverture du mode dès M3 validé.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const releaseOk = r.release_form_status === "validated";
        const onemOk = r.statut_initial !== "chomage" || r.statut_initial_verified;
        return (
          <Link
            key={r.slug}
            href={`/agence/clients`}
            className="flex items-center gap-3 rounded-xl p-3 transition-all hover:scale-[1.005] cursor-pointer"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(91,141,239,0.12)" }}
            >
              <Users className="w-5 h-5" style={{ color: "#5B8DEF" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {r.display_name}
                </span>
                <span className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>
                  {r.slug}
                </span>
                {r.palier_remuneration && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(212,175,55,0.15)",
                      color: "#D4AF37",
                    }}
                  >
                    {r.palier_remuneration}
                  </span>
                )}
                {r.identity_plan && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: r.identity_plan === "shadow" ? "rgba(148,163,184,0.15)" : "rgba(34,197,94,0.15)",
                      color: r.identity_plan === "shadow" ? "#94A3B8" : "#22C55E",
                    }}
                  >
                    {r.identity_plan === "shadow" ? "Shadow" : "Découverte"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1">
                  <CircleDot className="w-2.5 h-2.5" style={{ color: onemOk ? "#22C55E" : "#F59E0B" }} />
                  {r.statut_initial === "chomage"
                    ? onemOk
                      ? "ONEM vérifié"
                      : "ONEM à vérifier"
                    : r.statut_initial || "Statut N/A"}
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" style={{ color: releaseOk ? "#22C55E" : "#94A3B8" }} />
                  {releaseOk ? "Release Form OK" : `DMCA ${r.release_form_status || "pending"}`}
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
          </Link>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   Main component
   ───────────────────────────────────────── */

export function PlanBHubAnnexe() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(91,141,239,0.08), rgba(91,141,239,0.02))",
          border: "1px solid rgba(91,141,239,0.25)",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(91,141,239,0.15)" }}
          >
            <Users className="w-5 h-5" style={{ color: "#5B8DEF" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                Plan B — Hub annexe modèles
              </h3>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
              >
                T2 (M4-M6)
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Modèles réelles publiées via les comptes agence (Fanvue / OnlyFans)
              sous Release Form DMCA. Commission 30 % Sqwensy / 70 % modèle.
            </p>
          </div>
        </div>
      </div>

      {/* Paliers P1-P4 */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>
          Paliers rémunération (BE)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PALIERS.map((p) => (
            <div
              key={p.id}
              className="rounded-xl p-3 relative overflow-hidden"
              style={{
                background: "var(--surface)",
                border: `1px solid ${p.color}40`,
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: p.color }}
              />
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold" style={{ color: p.color }}>
                  {p.label}
                </span>
                <TrendingUp className="w-3 h-3" style={{ color: p.color }} />
              </div>
              <p className="text-sm font-bold mb-1 tabular-nums" style={{ color: "var(--text)" }}>
                {p.range}
              </p>
              <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                {p.voieFiscale}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                {p.actionCP}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
          Bascule automatique dès 3 mois consécutifs &gt; 750 €/mois.
        </p>
      </div>

      {/* Commission preview */}
      <CommissionPreview />

      {/* Onboarding workflow */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>
          Workflow onboarding
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" style={{ color: "#22C55E" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                Release Form DMCA
              </p>
            </div>
            <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
              Dossier 5 documents (Release Form signé + ID recto/verso + headshot
              daté + full body) avec state machine pending → validated.
            </p>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium"
              style={{ color: "#22C55E" }}
            >
              Géré par Agent 7.B <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileSignature className="w-4 h-4" style={{ color: "#A855F7" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                Contrat privé Agence ↔ Modèle
              </p>
            </div>
            <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
              Template par Mode + Plan Identité, bucket chiffré versioning.
              Blocage signature si statut ONEM non vérifié.
            </p>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium"
              style={{ color: "#A855F7" }}
            >
              Géré par Agent 7.C <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Modèles actives */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>
          Modèles Plan B actives
        </h4>
        <ActiveModelsList />
      </div>

      {/* Caming placeholder */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(245,158,11,0.04)",
          border: "1px dashed rgba(245,158,11,0.25)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Video className="w-4 h-4" style={{ color: "#F59E0B" }} />
          <p className="text-xs font-semibold" style={{ color: "#F59E0B" }}>
            Caming live (Stripchat / Bongacams / Chaturbate)
          </p>
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Configuration prévue Phase 9 — canal primaire acquisition Mode B.
          Attribution J+7 nouveaux abonnés Fanvue via UTM sessions cam.
          <span className="font-semibold ml-1" style={{ color: "#F59E0B" }}>
            Disponible Q3 2026.
          </span>
        </p>
      </div>
    </div>
  );
}

export default PlanBHubAnnexe;

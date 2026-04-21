"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Calculator, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type Palier = "P1" | "P2" | "P3" | "P4";

interface PalierDescriptor {
  palier: Palier;
  title: string;
  yearlyMin: number;
  yearlyMax: number | null;
  monthlyTrigger: number;
  voie: string;
  action: string;
}

const PALIERS: PalierDescriptor[] = [
  {
    palier: "P1",
    title: "Test",
    yearlyMin: 0,
    yearlyMax: 1000,
    monthlyTrigger: 0,
    voie: "droit_image",
    action: "Note de paiement signee",
  },
  {
    palier: "P2",
    title: "Demarrage",
    yearlyMin: 1000,
    yearlyMax: 9000,
    monthlyTrigger: 83,
    voie: "droit_image",
    action: "Note de paiement mensuelle",
  },
  {
    palier: "P3",
    title: "Structuration",
    yearlyMin: 9000,
    yearlyMax: 20000,
    monthlyTrigger: 750,
    voie: "indep_complementaire",
    action: "Facturation + INASTI",
  },
  {
    palier: "P4",
    title: "Pro",
    yearlyMin: 20000,
    yearlyMax: null,
    monthlyTrigger: 1667,
    voie: "indep_principal",
    action: "Facturation TVA, declarations trim.",
  },
];

interface PalierRemunerationPanelProps {
  modelId: string;
  mode: "A" | "B" | "C" | null;
  currentPalier: Palier;
  revenueMonthlyAvg3m: number;
  isEscalationTriggered: boolean;
  isAdmin: boolean;
  authHeaders: () => HeadersInit;
  onEscalate?: (next: Palier) => void;
}

/**
 * Agent 7.C — Palier remuneration panel.
 *
 * - Palier courant avec descripteur BP
 * - Simulateur : revenu mensuel brut → palier detecte + voie fiscale
 * - Commission preview : net → 70% modele / 30% Sqwensy (Mode B)
 * - Bouton admin "Declencher bascule" si 3 mois > 750 EUR (matview flag)
 */
export function PalierRemunerationPanel({
  modelId,
  mode,
  currentPalier,
  revenueMonthlyAvg3m,
  isEscalationTriggered,
  isAdmin,
  authHeaders,
  onEscalate,
}: PalierRemunerationPanelProps) {
  const [simInput, setSimInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentDescriptor = useMemo(
    () => PALIERS.find((p) => p.palier === currentPalier) ?? PALIERS[0],
    [currentPalier]
  );

  const simRevenue = parseFloat(simInput) || 0;
  const yearly = simRevenue * 12;
  const detected = useMemo<PalierDescriptor>(() => {
    return (
      PALIERS.find(
        (p) => yearly >= p.yearlyMin && (p.yearlyMax === null || yearly < p.yearlyMax)
      ) ?? PALIERS[0]
    );
  }, [yearly]);

  // Commission preview (aligned matview 042)
  const commissionPlateforme = simRevenue * 0.15;
  const fraisProd = 80;
  const netDistribuable = Math.max(simRevenue - commissionPlateforme - fraisProd, 0);
  const partModele = mode === "B" ? netDistribuable * 0.7 : 0;
  const partSqwensy =
    mode === "B" ? netDistribuable * 0.3 : mode === "A" ? netDistribuable : 0;

  const shouldEscalate =
    detected.palier !== currentPalier &&
    PALIERS.indexOf(detected) > PALIERS.indexOf(currentDescriptor);

  async function handleEscalate(to: Palier) {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/agence/models/${modelId}/palier`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          to_palier: to,
          revenue_3m_avg: revenueMonthlyAvg3m,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Erreur escalade");
        return;
      }
      setFeedback(`Bascule ${currentPalier} -> ${to} loggee et appliquee.`);
      onEscalate?.(to);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <TrendingUp size={18} style={{ color: "var(--accent)" }} />
        <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Palier remuneration
        </h3>
      </header>

      {/* Current palier card */}
      <div
        className="glass rounded-xl p-4"
        style={{ border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <span
              className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {currentDescriptor.palier}
            </span>
            <span
              className="ml-2 text-[13px] font-semibold"
              style={{ color: "var(--text)" }}
            >
              {currentDescriptor.title}
            </span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Revenu moyen 3m : <strong>{revenueMonthlyAvg3m.toFixed(0)} EUR/mois</strong>
          </p>
        </div>
        <ul className="text-[11px] space-y-1" style={{ color: "var(--text-muted)" }}>
          <li>
            Seuil annualise :{" "}
            <strong>
              {currentDescriptor.yearlyMin} -{" "}
              {currentDescriptor.yearlyMax ?? "infini"} EUR
            </strong>
          </li>
          <li>
            Voie fiscale : <strong>{currentDescriptor.voie}</strong>
          </li>
          <li>
            Action CP : <strong>{currentDescriptor.action}</strong>
          </li>
        </ul>
      </div>

      {/* Escalation alert */}
      {isEscalationTriggered && (
        <div
          className="flex items-start gap-2 rounded-md px-3 py-2 text-[12px]"
          style={{
            background: "rgba(249,115,22,0.1)",
            color: "#f97316",
            border: "1px solid rgba(249,115,22,0.25)",
          }}
        >
          <AlertTriangle size={14} />
          <div>
            <p className="font-semibold">
              3 mois consecutifs &gt; 750 EUR — bascule recommandee.
            </p>
            <p className="opacity-80">
              Matview flag <code>palier_escalation_triggered</code> actif. Declenche
              l&apos;amendement contrat avant acceptation nouveau palier.
            </p>
          </div>
        </div>
      )}

      {/* Simulator */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calculator size={14} style={{ color: "var(--text-muted)" }} />
          <h4 className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>
            Simulateur revenu mensuel
          </h4>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={simInput}
            onChange={(e) => setSimInput(e.target.value)}
            placeholder="Revenu brut mensuel (EUR)"
            className="flex-1 rounded-md px-3 py-2 text-[13px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        {simRevenue > 0 && (
          <div
            className="grid gap-2 rounded-lg p-3 text-[11px]"
            style={{ background: "var(--surface)", color: "var(--text-muted)" }}
          >
            <Row label="Annualise" value={`${yearly.toFixed(0)} EUR`} />
            <Row label="Palier detecte" value={`${detected.palier} — ${detected.title}`} />
            <Row label="Voie fiscale" value={detected.voie} />
            <Row label="Commission plateforme (15%)" value={`${commissionPlateforme.toFixed(2)} EUR`} />
            <Row label="Frais production forfait" value={`${fraisProd} EUR`} />
            <Row label="Net distribuable" value={`${netDistribuable.toFixed(2)} EUR`} strong />
            {mode === "B" && (
              <>
                <Row label="Part modele (70%)" value={`${partModele.toFixed(2)} EUR`} strong />
                <Row label="Part Sqwensy (30%)" value={`${partSqwensy.toFixed(2)} EUR`} />
              </>
            )}
            {mode === "A" && (
              <Row label="Part Sqwensy (100%)" value={`${partSqwensy.toFixed(2)} EUR`} strong />
            )}
          </div>
        )}
      </div>

      {/* Admin actions */}
      {isAdmin && shouldEscalate && (
        <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => handleEscalate(detected.palier)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            Declencher bascule {currentPalier} → {detected.palier}
          </button>
        </div>
      )}

      {feedback && (
        <div
          className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px]"
          style={{
            background: feedback.includes("Erreur")
              ? "rgba(239,68,68,0.1)"
              : "rgba(34,197,94,0.1)",
            color: feedback.includes("Erreur") ? "#ef4444" : "#22c55e",
          }}
        >
          <CheckCircle2 size={14} />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span
        style={{
          color: strong ? "var(--text)" : "var(--text-muted)",
          fontWeight: strong ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

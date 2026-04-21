"use client";

import { useState } from "react";
import { UserCheck, AlertTriangle, CheckCircle2, Loader2, BookOpen } from "lucide-react";

type Statut = "salariee" | "etudiante" | "chomage" | "sans_activite" | "pensionnee";

const STATUT_LABELS: Record<Statut, string> = {
  salariee: "Salariee",
  etudiante: "Etudiante",
  chomage: "Chomage",
  sans_activite: "Sans activite",
  pensionnee: "Pensionnee",
};

const STATUT_HINTS: Record<Statut, string> = {
  salariee: "Cumul autorise selon contrat employeur principal.",
  etudiante: "Regime etudiant-independant BE au-dela des seuils P3.",
  chomage:
    "ONEM Article 48 : controle manuel obligatoire avant tout revenu. Onboarding bloque tant que verifie = false.",
  sans_activite: "Aucun cumul a gerer.",
  pensionnee: "Plafond cumul revenu ONP/CAPAC applicable.",
};

interface StatutInitialCardProps {
  modelId: string;
  currentStatut: Statut | null;
  verified: boolean;
  isAdmin: boolean;
  authHeaders: () => HeadersInit;
  onUpdate?: (patch: { statut_initial?: Statut; statut_initial_verified?: boolean }) => void;
}

/**
 * Agent 7.C — Statut initial card.
 *
 * - Select enum statut_initial
 * - Alerte rouge si chomage + non verifie ONEM
 * - Bouton admin "Marquer verifie ONEM"
 */
export function StatutInitialCard({
  modelId,
  currentStatut,
  verified,
  isAdmin,
  authHeaders,
  onUpdate,
}: StatutInitialCardProps) {
  const [statut, setStatut] = useState<Statut | "">(currentStatut || "");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isBlocking = statut === "chomage" && !verified;
  const hasChange = statut !== (currentStatut || "");

  async function patchModel(body: Record<string, unknown>) {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/agence/models/${modelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Erreur update");
        return;
      }
      setFeedback("Mise a jour enregistree.");
      onUpdate?.(body as {
        statut_initial?: Statut;
        statut_initial_verified?: boolean;
      });
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <UserCheck size={18} style={{ color: "var(--accent)" }} />
        <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Statut initial
        </h3>
      </header>

      <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
        Statut legal BE de la modele a l&apos;onboarding. Conditionne les controles
        obligatoires avant activation de revenus.
      </p>

      {isBlocking && (
        <div
          className="flex items-start gap-2 rounded-md px-3 py-2 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <AlertTriangle size={14} />
          <div>
            <p className="font-semibold">
              Onboarding bloque — verification ONEM obligatoire.
            </p>
            <p className="opacity-90">
              Tant que <code>statut_initial_verified</code> n&apos;est pas true,
              aucun drop ni revenu ne peut etre active. Consulte l&apos;agent de
              chomage avant de proceder.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label
          className="block text-[11px] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Statut declare
        </label>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value as Statut)}
          disabled={!isAdmin || loading}
          className="w-full rounded-md px-3 py-2 text-[13px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <option value="">—</option>
          {(Object.keys(STATUT_LABELS) as Statut[]).map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s]}
            </option>
          ))}
        </select>
        {statut && (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {STATUT_HINTS[statut as Statut]}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span>Verifie ONEM :</span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{
              background: verified ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
              color: verified ? "#22c55e" : "#ef4444",
            }}
          >
            {verified ? (
              <>
                <CheckCircle2 size={11} /> oui
              </>
            ) : (
              "non"
            )}
          </span>
        </div>

        <div className="flex gap-2">
          {isAdmin && hasChange && statut && (
            <button
              type="button"
              onClick={() => patchModel({ statut_initial: statut })}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : null}
              Enregistrer statut
            </button>
          )}
          {isAdmin && !verified && statut === "chomage" && (
            <button
              type="button"
              onClick={() => patchModel({ statut_initial_verified: true })}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40"
              style={{
                background: "rgba(34,197,94,0.15)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Marquer verifie ONEM
            </button>
          )}
        </div>
      </div>

      {/* Lien guide */}
      <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <p
          className="flex items-center gap-2 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          <BookOpen size={12} />
          Guide juridique :{" "}
          <a
            href="/plans/business/bp-agence-heaven-2026-04/Heaven_Paliers_Remuneration_Modeles.docx"
            className="underline"
            style={{ color: "var(--accent)" }}
            target="_blank"
            rel="noreferrer"
          >
            Heaven_Paliers_Remuneration_Modeles §2
          </a>
        </p>
      </div>

      {feedback && (
        <div
          className="rounded-md px-3 py-2 text-[12px]"
          style={{
            background: feedback.includes("Erreur")
              ? "rgba(239,68,68,0.1)"
              : "rgba(34,197,94,0.1)",
            color: feedback.includes("Erreur") ? "#ef4444" : "#22c55e",
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}

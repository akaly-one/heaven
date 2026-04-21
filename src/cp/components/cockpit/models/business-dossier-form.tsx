"use client";

import { useState } from "react";
import { Briefcase, Save, Loader2, FileDown } from "lucide-react";

interface BusinessDossierFormProps {
  modelId: string;
  pseudo: string;
  isAdmin: boolean;
  authHeaders: () => HeadersInit;
  onSaved?: () => void;
}

interface DossierState {
  business_name: string;
  vat_number: string;
  business_address: string;
  platforms_active: string[];
  revenue_goal_monthly: string;
  identity_strategy: "visage" | "sans_visage" | "";
  caming_enabled: boolean;
  budget_monthly: string;
  commercial_strategy: string;
  contact_email: string;
}

const PLATFORM_OPTIONS = ["fanvue", "onlyfans", "mym", "fansly", "loyalfans"];

/**
 * Agent 7.C — Business dossier form (Mode C).
 *
 * Formulaire pour constituer dossier commercial d'une cliente Mode C :
 *   - Entreprise + TVA + adresse
 *   - Plateformes actives
 *   - Objectifs chiffres
 *   - Strategie commerciale (visage / sans visage, caming, budget)
 *
 * Export PDF via bouton (print-friendly A4).
 * Les donnees sont stockees cote agence_models.caming_platforms +
 * caming_active + notes custom. Le PDF n'expose aucune donnee perso
 * sensible — seulement pseudo + infos business.
 */
export function BusinessDossierForm({
  modelId,
  pseudo,
  isAdmin,
  authHeaders,
  onSaved,
}: BusinessDossierFormProps) {
  const [state, setState] = useState<DossierState>({
    business_name: "",
    vat_number: "",
    business_address: "",
    platforms_active: [],
    revenue_goal_monthly: "",
    identity_strategy: "",
    caming_enabled: false,
    budget_monthly: "",
    commercial_strategy: "",
    contact_email: "",
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function togglePlatform(p: string) {
    setState((prev) => ({
      ...prev,
      platforms_active: prev.platforms_active.includes(p)
        ? prev.platforms_active.filter((x) => x !== p)
        : [...prev.platforms_active, p],
    }));
  }

  async function handleSave() {
    if (!isAdmin) return;
    setLoading(true);
    setFeedback(null);
    try {
      // Persiste via PATCH /api/agence/models/:id (seuls champs whitelistes)
      const res = await fetch(`/api/agence/models/${modelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          caming_active: state.caming_enabled,
          caming_platforms: state.platforms_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Erreur update");
        return;
      }
      setFeedback("Dossier persiste (plateformes + caming).");
      onSaved?.();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    const html = renderDossierHtml(pseudo, modelId, state);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Briefcase size={18} style={{ color: "var(--accent)" }} />
        <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Dossier business (Mode C)
        </h3>
      </header>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Utilise en Mode C (Services B2B independantes). Constitue le dossier
        commercial de la cliente autonome.
      </p>

      {/* Infos entreprise */}
      <Fieldset title="Entreprise">
        <Input
          label="Nom commercial"
          value={state.business_name}
          onChange={(v) => setState({ ...state, business_name: v })}
        />
        <Input
          label="Numero TVA (si applicable)"
          value={state.vat_number}
          onChange={(v) => setState({ ...state, vat_number: v })}
        />
        <Input
          label="Adresse business"
          value={state.business_address}
          onChange={(v) => setState({ ...state, business_address: v })}
        />
        <Input
          label="Email contact pro"
          value={state.contact_email}
          onChange={(v) => setState({ ...state, contact_email: v })}
        />
      </Fieldset>

      {/* Plateformes */}
      <Fieldset title="Plateformes actives">
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((p) => {
            const active = state.platforms_active.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className="rounded-full px-3 py-1 text-[11px] font-medium transition"
                style={{
                  background: active ? "var(--accent)" : "var(--surface)",
                  color: active ? "white" : "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </Fieldset>

      {/* Objectifs */}
      <Fieldset title="Objectifs chiffres">
        <Input
          label="Revenu mensuel cible (EUR)"
          value={state.revenue_goal_monthly}
          onChange={(v) => setState({ ...state, revenue_goal_monthly: v })}
          type="number"
        />
        <Input
          label="Budget mensuel alloue (EUR)"
          value={state.budget_monthly}
          onChange={(v) => setState({ ...state, budget_monthly: v })}
          type="number"
        />
      </Fieldset>

      {/* Strategie */}
      <Fieldset title="Strategie commerciale">
        <div>
          <label
            className="block text-[11px] font-medium mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            Strategie visage
          </label>
          <select
            value={state.identity_strategy}
            onChange={(e) =>
              setState({ ...state, identity_strategy: e.target.value as DossierState["identity_strategy"] })
            }
            className="w-full rounded-md px-3 py-2 text-[13px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="">—</option>
            <option value="visage">Visage visible</option>
            <option value="sans_visage">Sans visage</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={state.caming_enabled}
            onChange={(e) => setState({ ...state, caming_enabled: e.target.checked })}
          />
          Caming actif (Stripchat / Bongacams / Chaturbate)
        </label>
        <div>
          <label
            className="block text-[11px] font-medium mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            Notes strategie
          </label>
          <textarea
            value={state.commercial_strategy}
            onChange={(e) => setState({ ...state, commercial_strategy: e.target.value })}
            rows={4}
            className="w-full rounded-md px-3 py-2 text-[13px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            placeholder="Top funnel, conversion ciblee, collaborations..."
          />
        </div>
      </Fieldset>

      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </button>
        )}
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold"
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          <FileDown size={14} />
          Exporter PDF
        </button>
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

function Fieldset({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      className="space-y-3 rounded-xl p-3"
      style={{ border: "1px solid var(--border)" }}
    >
      <legend
        className="px-2 text-[11px] font-semibold"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label
        className="block text-[11px] font-medium mb-1"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md px-3 py-2 text-[13px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />
    </div>
  );
}

function renderDossierHtml(pseudo: string, modelId: string, state: DossierState): string {
  const platforms = state.platforms_active.join(", ") || "—";
  const identityLabel =
    state.identity_strategy === "visage"
      ? "Visage visible"
      : state.identity_strategy === "sans_visage"
        ? "Sans visage"
        : "—";
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Dossier business — ${pseudo}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; padding: 2cm; color: #111; }
    h1 { font-size: 20pt; margin-bottom: 0.2em; }
    h2 { font-size: 13pt; margin-top: 1.2em; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; }
    dl { display: grid; grid-template-columns: 40% 60%; gap: 4px 12px; font-size: 11pt; }
    dt { color: #555; }
    dd { margin: 0; font-weight: 500; }
    footer { margin-top: 2em; font-size: 9pt; color: #999; }
  </style>
</head>
<body>
  <h1>Dossier business — ${pseudo}</h1>
  <p style="font-size: 10pt; color: #666;">ID interne : ${modelId} — Mode C (Services B2B)</p>

  <h2>Entreprise</h2>
  <dl>
    <dt>Nom commercial</dt><dd>${state.business_name || "—"}</dd>
    <dt>TVA</dt><dd>${state.vat_number || "—"}</dd>
    <dt>Adresse</dt><dd>${state.business_address || "—"}</dd>
    <dt>Email contact</dt><dd>${state.contact_email || "—"}</dd>
  </dl>

  <h2>Plateformes</h2>
  <p>${platforms}</p>

  <h2>Objectifs chiffres</h2>
  <dl>
    <dt>Revenu mensuel cible</dt><dd>${state.revenue_goal_monthly || "—"} EUR</dd>
    <dt>Budget mensuel</dt><dd>${state.budget_monthly || "—"} EUR</dd>
  </dl>

  <h2>Strategie</h2>
  <dl>
    <dt>Strategie visage</dt><dd>${identityLabel}</dd>
    <dt>Caming actif</dt><dd>${state.caming_enabled ? "oui" : "non"}</dd>
  </dl>
  <p>${state.commercial_strategy || "—"}</p>

  <footer>Document genere localement — ${new Date().toLocaleDateString("fr-FR")} — Heaven / SQWENSY.</footer>
</body>
</html>`;
}

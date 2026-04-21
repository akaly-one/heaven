"use client";

import { useState } from "react";
import { Shield, Eye, EyeOff, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

type IdentityPlan = "discovery" | "shadow";

interface IdentityPlanPanelProps {
  modelId: string;
  currentPlan: IdentityPlan;
  isAdmin: boolean;
  authHeaders: () => HeadersInit;
  onUpdate?: (plan: IdentityPlan, status: "requested" | "approved") => void;
}

/**
 * Agent 7.C — Identity Plan panel (Decouverte / Shadow).
 *
 * Brief B6 : radio Decouverte/Shadow + guidelines + impact cout prod.
 * Append-only log via agence_identity_plan_changes.
 * Approval : si role=model → requested, si role=root → approved direct.
 */
export function IdentityPlanPanel({
  modelId,
  currentPlan,
  isAdmin,
  authHeaders,
  onUpdate,
}: IdentityPlanPanelProps) {
  const [selected, setSelected] = useState<IdentityPlan>(currentPlan);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | { kind: "success"; status: "requested" | "approved" }
    | { kind: "error"; message: string }
    | null
  >(null);

  const hasChange = selected !== currentPlan;

  async function handleSwitch() {
    if (!hasChange) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/agence/models/${modelId}/identity-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ to: selected, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: "error", message: data.error || "Erreur bascule" });
        return;
      }
      const status = data.status as "requested" | "approved";
      setResult({ kind: "success", status });
      onUpdate?.(selected, status);
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Erreur reseau",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Shield size={18} style={{ color: "var(--accent)" }} />
        <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Plan Identite
        </h3>
      </header>

      <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
        Definit le niveau d&apos;exposition visuelle du profil. Impact direct sur le cout de
        production et la conversion du funnel.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <RadioCard
          active={selected === "discovery"}
          icon={<Eye size={16} />}
          title="Plan Decouverte"
          description="Visage visible, identite legale protegee. Conversion funnel reference."
          onClick={() => setSelected("discovery")}
        />
        <RadioCard
          active={selected === "shadow"}
          icon={<EyeOff size={16} />}
          title="Plan Shadow"
          description="Visage cache, tatouages / arriere-plan floutes."
          impact="-15 a 25% conversion general, +40 a 80% niche mystery. Cout prod +15 a 25%."
          onClick={() => setSelected("shadow")}
        />
      </div>

      {hasChange && (
        <div className="space-y-2">
          <label
            className="block text-[11px] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Motif de bascule {isAdmin ? "(facultatif)" : "(recommande)"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : demande modele apres 3 mois test / virage strategique niche mystery..."
            rows={3}
            className="w-full rounded-md px-3 py-2 text-[13px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {isAdmin
            ? "Admin : bascule appliquee immediatement."
            : "Modele : demande envoyee a l'admin pour approbation."}
        </p>
        <button
          type="button"
          onClick={handleSwitch}
          disabled={!hasChange || loading}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
          style={{
            background: "var(--accent)",
            color: "white",
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isAdmin ? "Enregistrer" : "Demander"}
        </button>
      </div>

      {result && (
        <div
          className="flex items-start gap-2 rounded-md px-3 py-2 text-[12px]"
          style={{
            background:
              result.kind === "success"
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
            color: result.kind === "success" ? "#22c55e" : "#ef4444",
          }}
        >
          {result.kind === "success" ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          <span>
            {result.kind === "success"
              ? result.status === "approved"
                ? "Bascule appliquee et loggee."
                : "Demande envoyee. Admin doit approuver."
              : result.message}
          </span>
        </div>
      )}
    </div>
  );
}

function RadioCard({
  active,
  icon,
  title,
  description,
  impact,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  impact?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass rounded-xl p-4 text-left transition"
      style={{
        border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
        boxShadow: active ? "0 0 0 2px rgba(59,130,246,0.15)" : "none",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}>
          {icon}
        </span>
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          {title}
        </span>
      </div>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
      {impact && (
        <p
          className="mt-2 text-[10px] font-medium"
          style={{ color: "var(--accent)" }}
        >
          {impact}
        </p>
      )}
    </button>
  );
}

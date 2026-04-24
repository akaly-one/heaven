"use client";

/**
 * BRIEF-10 TICKET-AG06 — Section admin "Certification majorité" + "Validation handle"
 *
 * Composant destiné à être intégré dans le drawer fan admin (contacts-drawer.tsx)
 * ou la fiche fan complète (/agence/clients/[fanId]/page.tsx).
 *
 * Affiche :
 *  - Badge âge certifié ou non + date
 *  - Bouton admin "Révoquer certification" (root only)
 *  - Si pending_upgrade : boutons Valider / Rejeter / Demander preuve
 */

import { useState, useMemo } from "react";
import { ShieldCheck, ShieldAlert, Check, X, Camera, Loader2 } from "lucide-react";
import type { AccessLevel } from "@/lib/access/tiers";

interface ClientAgeGateState {
  id: string;
  age_certified?: boolean | null;
  age_certified_at?: string | null;
  access_level?: AccessLevel | string | null;
  pseudo_insta?: string | null;
  pseudo_snap?: string | null;
  rejected_reason?: string | null;
  rejected_at?: string | null;
  validated_at?: string | null;
  validated_by?: string | null;
}

interface AgeCertificationSectionProps {
  client: ClientAgeGateState;
  /** Callback après mutation réussie — parent re-fetch. */
  onMutated?: () => void;
  /** Compose DM auto "peux-tu m'envoyer screenshot…" (optionnel). */
  onRequestProof?: (clientId: string) => void;
  /** role === "root" → boutons révocation visibles. */
  isRoot?: boolean;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function AgeCertificationSection({
  client,
  onMutated,
  onRequestProof,
  isRoot = false,
}: AgeCertificationSectionProps) {
  const [busy, setBusy] = useState<null | "revoke" | "validate" | "reject">(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessLevel = (client.access_level as AccessLevel) || "anonymous";
  const isPending = accessLevel === "pending_upgrade";
  const isValidated = accessLevel === "validated";
  const isRejected = accessLevel === "rejected";

  const handle = useMemo(() => {
    if (client.pseudo_insta) return `@${client.pseudo_insta}`;
    if (client.pseudo_snap && !/^(visiteur|guest)/i.test(client.pseudo_snap)) {
      return client.pseudo_snap;
    }
    return null;
  }, [client.pseudo_insta, client.pseudo_snap]);

  async function callApi(path: string, payload?: Record<string, unknown>): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Erreur serveur");
        return false;
      }
      return true;
    } catch {
      setError("Erreur réseau");
      return false;
    }
  }

  async function doRevoke() {
    if (!confirm("Révoquer la certification majorité de ce fan ?")) return;
    setBusy("revoke");
    const ok = await callApi(`/api/agence/clients/${client.id}/age-gate/revoke`, {
      reason: "Révocation admin manuelle",
    });
    setBusy(null);
    if (ok) onMutated?.();
  }

  async function doValidate() {
    setBusy("validate");
    const ok = await callApi(`/api/agence/clients/${client.id}/validate`);
    setBusy(null);
    if (ok) onMutated?.();
  }

  async function doReject() {
    if (!rejectReason.trim()) {
      setError("Raison requise");
      return;
    }
    setBusy("reject");
    const ok = await callApi(`/api/agence/clients/${client.id}/reject`, {
      reason: rejectReason.trim(),
    });
    setBusy(null);
    if (ok) {
      setShowReject(false);
      setRejectReason("");
      onMutated?.();
    }
  }

  return (
    <section className="space-y-3">
      <h4
        className="text-[10px] uppercase tracking-wider font-semibold"
        style={{ color: "var(--text-muted)" }}
      >
        Certification majorité
      </h4>

      {/* Badge statut */}
      {client.age_certified ? (
        <div
          className="flex items-start gap-2 rounded-lg p-2.5"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.28)",
          }}
        >
          <ShieldCheck
            className="w-3.5 h-3.5 shrink-0 mt-0.5"
            style={{ color: "#10B981" }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div
              className="text-[11px] font-semibold"
              style={{ color: "#10B981" }}
            >
              18+ certifié
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Le {formatDate(client.age_certified_at)}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex items-start gap-2 rounded-lg p-2.5"
          style={{
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.28)",
          }}
        >
          <ShieldAlert
            className="w-3.5 h-3.5 shrink-0 mt-0.5"
            style={{ color: "#F87171" }}
            aria-hidden="true"
          />
          <div
            className="text-[11px] font-semibold"
            style={{ color: "#F87171" }}
          >
            Pas certifié
          </div>
        </div>
      )}

      {/* Révocation admin (root only, si certifié) */}
      {isRoot && client.age_certified && (
        <button
          type="button"
          onClick={doRevoke}
          disabled={busy === "revoke"}
          className="w-full text-[10px] font-medium px-2.5 py-1.5 rounded-md inline-flex items-center justify-center gap-1.5"
          style={{
            background: "rgba(220,38,38,0.08)",
            color: "#F87171",
            border: "1px solid rgba(220,38,38,0.22)",
            minHeight: "32px",
          }}
        >
          {busy === "revoke" ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ShieldAlert className="w-3 h-3" />
          )}
          Révoquer certification
        </button>
      )}

      {/* Bloc validation handle (si pending_upgrade) */}
      {isPending && (
        <div
          className="rounded-lg p-2.5 space-y-2"
          style={{
            background: "rgba(230,201,116,0.06)",
            border: "1px solid rgba(230,201,116,0.22)",
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: "#E6C974" }}
          >
            En attente validation
          </div>
          {handle && (
            <div className="text-[11px]" style={{ color: "var(--text)" }}>
              Handle fourni :{" "}
              <span className="font-semibold">{handle}</span>
            </div>
          )}

          {!showReject ? (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={doValidate}
                disabled={busy !== null}
                className="text-[10px] font-semibold px-2 py-1.5 rounded-md inline-flex items-center justify-center gap-1"
                style={{
                  background: "linear-gradient(135deg, #E6C974, #C9A84C)",
                  color: "#0A0A0C",
                  minHeight: "32px",
                }}
              >
                {busy === "validate" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Valider
              </button>
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={busy !== null}
                className="text-[10px] font-medium px-2 py-1.5 rounded-md inline-flex items-center justify-center gap-1"
                style={{
                  background: "rgba(220,38,38,0.08)",
                  color: "#F87171",
                  border: "1px solid rgba(220,38,38,0.22)",
                  minHeight: "32px",
                }}
              >
                <X className="w-3 h-3" />
                Rejeter
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label
                className="block text-[10px] font-medium"
                style={{ color: "var(--text-muted)" }}
                htmlFor={`reject-reason-${client.id}`}
              >
                Raison du rejet
              </label>
              <input
                id={`reject-reason-${client.id}`}
                type="text"
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: compte fake, pas de match handle…"
                className="w-full text-[11px] px-2 py-1.5 rounded-md bg-transparent outline-none"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  minHeight: "32px",
                }}
              />
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={doReject}
                  disabled={busy !== null || !rejectReason.trim()}
                  className="text-[10px] font-semibold px-2 py-1.5 rounded-md inline-flex items-center justify-center gap-1 disabled:opacity-40"
                  style={{
                    background: "rgba(220,38,38,0.14)",
                    color: "#F87171",
                    border: "1px solid rgba(220,38,38,0.32)",
                    minHeight: "32px",
                  }}
                >
                  {busy === "reject" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  Confirmer rejet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReject(false);
                    setRejectReason("");
                    setError(null);
                  }}
                  disabled={busy !== null}
                  className="text-[10px] font-medium px-2 py-1.5 rounded-md"
                  style={{
                    background: "var(--bg2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    minHeight: "32px",
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {onRequestProof && !showReject && (
            <button
              type="button"
              onClick={() => onRequestProof(client.id)}
              disabled={busy !== null}
              className="w-full text-[10px] font-medium px-2 py-1.5 rounded-md inline-flex items-center justify-center gap-1"
              style={{
                background: "var(--bg2)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                minHeight: "32px",
              }}
            >
              <Camera className="w-3 h-3" />
              Demander preuve
            </button>
          )}
        </div>
      )}

      {/* États finaux */}
      {isValidated && (
        <div
          className="rounded-lg p-2 text-[10px]"
          style={{
            background: "rgba(16,185,129,0.08)",
            color: "#10B981",
            border: "1px solid rgba(16,185,129,0.22)",
          }}
        >
          Handle validé le {formatDate(client.validated_at)}
          {client.validated_by ? ` par ${client.validated_by}` : ""}
        </div>
      )}
      {isRejected && (
        <div
          className="rounded-lg p-2 text-[10px] space-y-0.5"
          style={{
            background: "rgba(220,38,38,0.08)",
            color: "#F87171",
            border: "1px solid rgba(220,38,38,0.22)",
          }}
        >
          <div className="font-semibold">
            Rejeté le {formatDate(client.rejected_at)}
          </div>
          {client.rejected_reason && <div>{client.rejected_reason}</div>}
        </div>
      )}

      {error && (
        <div
          className="rounded-lg p-2 text-[10px]"
          style={{
            background: "rgba(220,38,38,0.08)",
            color: "#F87171",
            border: "1px solid rgba(220,38,38,0.22)",
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}

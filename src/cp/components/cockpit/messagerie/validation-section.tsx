"use client";

/**
 * BRIEF-15 Lot C — Section admin "Validation handle" avec copy link + code
 *
 * Étend le flow de AgeCertificationSection en ajoutant :
 *  - Affichage de la verification pending (si existe) avec lien + code 6 chiffres
 *  - Bouton "Générer lien" si aucune verif active
 *  - Copy link / copy code (toast feedback)
 *  - Marquer envoyé (via snap/insta)
 *  - Valider / Rejeter (avec modal raison)
 *
 * Auto-refresh via `heaven:client-handle-updated` event après mutation.
 * Aucun `any` — types stricts (TypeScript strict).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Instagram,
  Link2,
  Loader2,
  Send,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { AccessLevel } from "@/lib/access/tiers";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ValidationClient {
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

type VerificationStatus = "pending" | "sent" | "validated" | "expired" | "revoked";

export interface VerificationView {
  id: string;
  client_id: string;
  target_handle: string;
  target_platform: "snap" | "insta";
  code: string | null;
  link: string;
  status: VerificationStatus;
  sent_at: string | null;
  sent_via_platform: "snap" | "insta" | "manual" | null;
  expires_at: string;
  created_at: string;
  validated_at: string | null;
}

export interface ValidationSectionProps {
  client: ValidationClient;
  /** Callback après mutation réussie — parent re-fetch. */
  onMutated?: () => void;
  /** role === "root" → boutons révocation certifications visibles. */
  isRoot?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function dispatchHandleUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("heaven:client-handle-updated"));
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function ValidationSection({
  client,
  onMutated,
  isRoot = false,
}: ValidationSectionProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "revoke" | "validate" | "reject" | "generate" | "mark-sent">(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationView | null>(null);
  const [loadingVerif, setLoadingVerif] = useState(false);

  const accessLevel = (client.access_level as AccessLevel) || "anonymous";
  const isPending = accessLevel === "pending_upgrade";
  const isValidated = accessLevel === "validated";
  const isRejected = accessLevel === "rejected";

  const handle = useMemo(() => {
    if (client.pseudo_insta) return { value: client.pseudo_insta, platform: "insta" as const };
    if (client.pseudo_snap && !/^(visiteur|guest)/i.test(client.pseudo_snap)) {
      return { value: client.pseudo_snap, platform: "snap" as const };
    }
    return null;
  }, [client.pseudo_insta, client.pseudo_snap]);

  // ── Fetch current pending/sent verification ───────────────────────────
  const loadVerification = useCallback(async () => {
    if (!isPending || !handle) return;
    setLoadingVerif(true);
    try {
      const res = await fetch(`/api/agence/clients/${client.id}/verification`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as { verification: VerificationView | null };
        setVerification(data.verification);
      }
    } catch {
      // silent — pas bloquant, l'admin peut générer
    } finally {
      setLoadingVerif(false);
    }
  }, [client.id, isPending, handle]);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  // ── Common API caller ─────────────────────────────────────────────────
  async function callApi(
    path: string,
    payload?: Record<string, unknown>
  ): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload || {}),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Erreur serveur";
        setError(msg);
        return { ok: false, data };
      }
      return { ok: true, data };
    } catch {
      setError("Erreur réseau");
      return { ok: false, data: {} };
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────

  async function doRevoke() {
    if (!confirm("Révoquer la certification majorité de ce fan ?")) return;
    setBusy("revoke");
    const { ok } = await callApi(`/api/agence/clients/${client.id}/age-gate/revoke`, {
      reason: "Révocation admin manuelle",
    });
    setBusy(null);
    if (ok) {
      toast("Certification révoquée", "success");
      dispatchHandleUpdated();
      onMutated?.();
    }
  }

  async function doValidate() {
    setBusy("validate");
    const { ok } = await callApi(`/api/agence/clients/${client.id}/validate`);
    setBusy(null);
    if (ok) {
      toast(
        `Fan validé${handle ? ` (${handle.platform === "insta" ? "@" : ""}${handle.value})` : ""}`,
        "success"
      );
      dispatchHandleUpdated();
      onMutated?.();
    }
  }

  async function doReject() {
    if (!rejectReason.trim()) {
      setError("Raison requise");
      return;
    }
    setBusy("reject");
    const { ok } = await callApi(`/api/agence/clients/${client.id}/reject`, {
      reason: rejectReason.trim(),
    });
    setBusy(null);
    if (ok) {
      setShowReject(false);
      setRejectReason("");
      toast("Fan rejeté", "success");
      dispatchHandleUpdated();
      onMutated?.();
    }
  }

  async function doGenerate() {
    if (!handle) {
      setError("Aucun handle à vérifier");
      return;
    }
    setBusy("generate");
    const { ok, data } = await callApi(
      `/api/agence/clients/${client.id}/verification/generate`,
      { platform: handle.platform }
    );
    setBusy(null);
    if (ok) {
      const id = String((data as { verification_id?: string }).verification_id || "");
      const token = String((data as { token?: string }).token || "");
      const code = String((data as { code?: string }).code || "");
      const link = String((data as { link?: string }).link || "");
      const expiresAt = String((data as { expires_at?: string }).expires_at || "");
      if (id && token && link) {
        const next: VerificationView = {
          id,
          client_id: client.id,
          target_handle: handle.value,
          target_platform: handle.platform,
          code: code || null,
          link,
          status: "pending",
          sent_at: null,
          sent_via_platform: null,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          validated_at: null,
        };
        setVerification(next);
      } else {
        // fallback re-fetch
        void loadVerification();
      }
      toast("Lien de validation généré", "success");
    }
  }

  async function doMarkSent(via: "snap" | "insta" | "manual") {
    if (!verification) return;
    setBusy("mark-sent");
    const { ok } = await callApi(
      `/api/agence/clients/${client.id}/verification/${verification.id}/mark-sent`,
      { via }
    );
    setBusy(null);
    if (ok) {
      toast(`Marqué envoyé (${via})`, "success");
      setVerification((prev) =>
        prev
          ? {
              ...prev,
              status: "sent",
              sent_at: new Date().toISOString(),
              sent_via_platform: via,
            }
          : prev
      );
    }
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copié`, "success", 1800);
    } catch {
      toast("Copie impossible (clipboard bloqué)", "error");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section className="space-y-3">
      <h4
        className="text-[10px] uppercase tracking-wider font-semibold"
        style={{ color: "var(--text-muted)" }}
      >
        Certification & Validation
      </h4>

      {/* ── Badge certification âge ── */}
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

      {/* ── Révocation admin (root only, si certifié) ── */}
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

      {/* ── Bloc validation handle (pending_upgrade) ── */}
      {isPending && handle && (
        <div
          className="rounded-lg p-2.5 space-y-2.5"
          style={{
            background: "rgba(230,201,116,0.06)",
            border: "1px solid rgba(230,201,116,0.22)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              className="text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: "#E6C974" }}
            >
              En attente validation
            </div>
            {handle.platform === "insta" ? (
              <Instagram className="w-3 h-3" style={{ color: "#E1306C" }} aria-hidden />
            ) : (
              <Zap className="w-3 h-3" style={{ color: "#FFFC00" }} aria-hidden />
            )}
          </div>

          <div className="text-[11px]" style={{ color: "var(--text)" }}>
            Handle fourni :{" "}
            <code
              className="px-1.5 py-0.5 rounded text-[11px] font-mono"
              style={{
                background: "var(--bg2)",
                color: "#E6C974",
                border: "1px solid var(--border2)",
              }}
            >
              {handle.platform === "insta" ? "@" : ""}
              {handle.value}
            </code>
          </div>

          {/* Verification block */}
          {loadingVerif && !verification && (
            <div
              className="flex items-center gap-2 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              Chargement du lien…
            </div>
          )}

          {!loadingVerif && !verification && (
            <button
              type="button"
              onClick={doGenerate}
              disabled={busy !== null}
              className="w-full text-[10px] font-semibold px-2.5 py-2 rounded-md inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
              style={{
                background: "rgba(124,58,237,0.12)",
                color: "#A78BFA",
                border: "1px solid rgba(124,58,237,0.3)",
                minHeight: "34px",
              }}
            >
              {busy === "generate" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Link2 className="w-3 h-3" />
              )}
              Générer lien de validation
            </button>
          )}

          {verification && (
            <div className="space-y-1.5">
              <div
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                Envoie ce lien au fan sur{" "}
                <strong style={{ color: "var(--text)" }}>
                  {verification.target_platform === "insta" ? "Instagram" : "Snapchat"}
                </strong>
                {" "}· expire le {formatDateTime(verification.expires_at)}
              </div>

              {/* Lien */}
              <div
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border2)",
                }}
              >
                <Link2 className="w-3 h-3 shrink-0" style={{ color: "#A78BFA" }} aria-hidden />
                <button
                  type="button"
                  onClick={() => copyToClipboard(verification.link, "Lien")}
                  className="flex-1 text-left text-[10px] font-mono truncate"
                  style={{ color: "var(--text)" }}
                  title={verification.link}
                >
                  {verification.link}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(verification.link, "Lien")}
                  className="shrink-0 p-1 rounded hover:opacity-80"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Copier le lien"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              {/* Code */}
              {verification.code && (
                <div
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                  style={{
                    background: "var(--bg2)",
                    border: "1px solid var(--border2)",
                  }}
                >
                  <Sparkles className="w-3 h-3 shrink-0" style={{ color: "#E6C974" }} aria-hidden />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Code :
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(verification.code || "", "Code")}
                    className="flex-1 text-left text-[12px] font-mono font-bold tracking-widest"
                    style={{ color: "var(--text)" }}
                    title={`Code ${verification.code}`}
                  >
                    {verification.code}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(verification.code || "", "Code")}
                    className="shrink-0 p-1 rounded hover:opacity-80"
                    style={{ color: "var(--text-muted)" }}
                    aria-label="Copier le code"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Status sent */}
              {verification.status === "sent" ? (
                <div
                  className="flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-md"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    color: "#10B981",
                    border: "1px solid rgba(16,185,129,0.22)",
                  }}
                >
                  <Check className="w-3 h-3" aria-hidden />
                  Envoyé le {formatDateTime(verification.sent_at)}
                  {verification.sent_via_platform
                    ? ` (via ${verification.sent_via_platform})`
                    : ""}
                  {" "}· en attente clic fan
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => doMarkSent(verification.target_platform)}
                  disabled={busy !== null}
                  className="w-full text-[10px] font-semibold px-2.5 py-1.5 rounded-md inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
                  style={{
                    background: "var(--bg2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    minHeight: "30px",
                  }}
                >
                  {busy === "mark-sent" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Marquer envoyé ({verification.target_platform === "insta" ? "Insta" : "Snap"})
                </button>
              )}
            </div>
          )}

          {/* Valider / Rejeter */}
          {!showReject ? (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={doValidate}
                disabled={busy !== null}
                className="text-[10px] font-semibold px-2 py-2 rounded-md inline-flex items-center justify-center gap-1 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #E6C974, #C9A84C)",
                  color: "#0A0A0C",
                  minHeight: "34px",
                }}
              >
                {busy === "validate" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Valider {handle.platform === "insta" ? "@" : ""}
                {handle.value.length > 10
                  ? `${handle.value.slice(0, 10)}…`
                  : handle.value}
              </button>
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={busy !== null}
                className="text-[10px] font-medium px-2 py-2 rounded-md inline-flex items-center justify-center gap-1 disabled:opacity-40"
                style={{
                  background: "rgba(220,38,38,0.08)",
                  color: "#F87171",
                  border: "1px solid rgba(220,38,38,0.22)",
                  minHeight: "34px",
                }}
              >
                <X className="w-3 h-3" />
                Rejeter
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
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
        </div>
      )}

      {/* ── Pending sans handle (cas rare) ── */}
      {isPending && !handle && (
        <div
          className="rounded-lg p-2.5 text-[10px]"
          style={{
            background: "rgba(245,158,11,0.08)",
            color: "#F59E0B",
            border: "1px solid rgba(245,158,11,0.22)",
          }}
        >
          Handle en attente mais aucun pseudo_insta/pseudo_snap exploitable.
          Demander au fan de fournir son handle.
        </div>
      )}

      {/* ── États finaux ── */}
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

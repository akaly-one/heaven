"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Receipt,
  ChevronDown,
  ChevronUp,
  Hash,
  User,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";

/**
 * BRIEF-16 livrable 4 — /agence/payments
 *
 * Cockpit validation paiements manuels PayPal.me : liste tous les
 * pending_payments avec status='awaiting_manual_confirm' + breakdown pour
 * les packs custom + boutons Valider (green) / Refuser (red).
 *
 * Auto-refresh toutes les 30s. Toast success/error après action.
 */

interface PendingPayment {
  id: string;
  model: string;
  client_pseudo: string | null;
  pseudo_web?: string | null;
  client_platform?: string | null;
  pack_id: string | null;
  pack_slug?: string | null;
  pack_name: string | null;
  amount: number; // centimes OU euros — on gère les deux défensivement
  currency: string;
  payment_method: string;
  status: string;
  reference_code: string;
  pack_breakdown?: {
    items?: Array<{
      type?: string;
      category?: string;
      quantity?: number;
      duration_min?: number;
      special_feet?: boolean;
    }>;
    description?: string;
    total_cents?: number;
  } | null;
  created_at: string;
}

interface PendingResponse {
  payments?: PendingPayment[];
  error?: string;
}

type Toast = { kind: "success" | "error"; message: string } | null;

const REFRESH_MS = 30_000;

// ── Helpers ──
function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtAmount(p: PendingPayment): string {
  // Défensif : si amount > 1000 on considère que c'est des centimes
  const v = p.amount > 1000 ? p.amount / 100 : p.amount;
  return `${v.toFixed(2)} ${p.currency || "EUR"}`;
}

function CategoryLabel({ cat }: { cat?: string }) {
  const labels: Record<string, string> = {
    silver: "Silver",
    gold: "Gold",
    vip_black: "VIP Black",
    vip_platinum: "VIP Platinum",
  };
  return <span>{labels[cat || ""] || cat || "?"}</span>;
}

export default function PaymentsValidationPage() {
  const { auth, currentModel, ready, isRoot } = useModel();

  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Filtre modèle (seulement si root — sinon contraint au model_slug de l'auth)
  const [modelFilter, setModelFilter] = useState<string>("all");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveModel = useMemo(() => {
    // Root : peut filtrer par modèle ou voir tout
    if (isRoot) return modelFilter === "all" ? null : modelFilter;
    // Model : contraint à son slug
    return currentModel || auth?.model_slug || null;
  }, [isRoot, modelFilter, currentModel, auth?.model_slug]);

  // ── Fetch pending payments ──
  const fetchPending = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      else setRefreshing(true);
      try {
        const qs = new URLSearchParams();
        if (effectiveModel) qs.set("model", toModelId(effectiveModel));
        const res = await fetch(
          `/api/payments/pending${qs.toString() ? `?${qs}` : ""}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          setError(
            res.status === 401
              ? "Accès refusé"
              : `Erreur ${res.status}`
          );
          return;
        }
        const data: PendingResponse = await res.json();
        setPayments(data.payments || []);
        setError(null);
      } catch (err) {
        setError(String(err).slice(0, 160));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveModel]
  );

  // Initial load + polling 30s
  useEffect(() => {
    if (!ready) return;
    fetchPending(true);
    timerRef.current = setInterval(() => fetchPending(false), REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPending, ready]);

  // ── Toast auto-hide ──
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Toggle expand ──
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Action : validate or reject ──
  const handleAction = useCallback(
    async (
      payment: PendingPayment,
      action: "approve" | "reject"
    ) => {
      if (actioningId) return;

      // Confirmation utilisateur
      if (action === "approve") {
        const ok = window.confirm(
          `Valider le paiement de ${fmtAmount(payment)} pour ${
            payment.client_pseudo || payment.pseudo_web || "?"
          } ?\nRéférence: ${payment.reference_code}`
        );
        if (!ok) return;
      } else {
        const reason = window.prompt(
          `Raison du refus pour ${payment.reference_code} :`,
          "Pseudo mismatch"
        );
        if (!reason || !reason.trim()) return;

        setActioningId(payment.id);
        try {
          const res = await fetch("/api/payments/manual/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              referenceCode: payment.reference_code,
              action: "reject",
              reason: reason.trim(),
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erreur ${res.status}`);
          }
          setToast({
            kind: "success",
            message: `Paiement ${payment.reference_code} refusé`,
          });
          fetchPending(false);
        } catch (err) {
          setToast({
            kind: "error",
            message: err instanceof Error ? err.message : "Erreur",
          });
        } finally {
          setActioningId(null);
        }
        return;
      }

      // Approve flow
      setActioningId(payment.id);
      try {
        const res = await fetch("/api/payments/manual/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referenceCode: payment.reference_code,
            action: "approve",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Erreur ${res.status}`);
        }
        const data = await res.json().catch(() => ({}));
        setToast({
          kind: "success",
          message: data.generatedCode
            ? `Paiement validé — code ${data.generatedCode}`
            : "Paiement validé",
        });
        fetchPending(false);
      } catch (err) {
        setToast({
          kind: "error",
          message: err instanceof Error ? err.message : "Erreur",
        });
      } finally {
        setActioningId(null);
      }
    },
    [actioningId, fetchPending]
  );

  const pendingCount = payments.length;

  return (
    <OsLayout cpId="agence">
      <div
        className="min-h-screen p-4 md:p-8 pb-24 md:pb-8"
        style={{ background: "var(--bg)" }}
      >
        <div className="max-w-5xl mx-auto">
          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(212,175,55,0.15)" }}
              >
                <Receipt
                  className="w-5 h-5"
                  style={{ color: "#D4AF37" }}
                />
              </div>
              <div className="min-w-0">
                <h1
                  className="text-xl font-bold"
                  style={{ color: "var(--text)" }}
                >
                  Demandes de paiement en attente
                </h1>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {pendingCount} paiement{pendingCount > 1 ? "s" : ""} à
                  valider · auto 30s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Filtre model (root only) */}
              {isRoot && (
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                  style={{
                    background: "var(--bg2)",
                    color: "var(--text)",
                    border: "1px solid var(--border2)",
                  }}
                  aria-label="Filtrer par modèle"
                >
                  <option value="all">Tous modèles</option>
                  <option value="yumi">Yumi</option>
                  <option value="paloma">Paloma</option>
                  <option value="ruby">Ruby</option>
                </select>
              )}

              <button
                type="button"
                onClick={() => fetchPending(false)}
                disabled={refreshing}
                aria-label="Rafraîchir"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer transition-colors hover:brightness-110"
                style={{
                  background: "var(--bg2)",
                  color: "var(--text)",
                  border: "1px solid var(--border2)",
                }}
              >
                <RefreshCw
                  className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Rafraîchir</span>
              </button>
            </div>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 mb-4 text-xs"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#F87171",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </div>
          )}

          {/* ── Loading ── */}
          {loading && payments.length === 0 && (
            <div
              className="flex items-center justify-center py-20"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Chargement...</span>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && payments.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "var(--bg3)" }}
              >
                <Receipt
                  className="w-6 h-6"
                  style={{ color: "var(--text-muted)" }}
                />
              </div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Aucun paiement en attente
              </p>
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Les demandes apparaîtront ici dès qu&apos;un fan achète un pack
              </p>
            </div>
          )}

          {/* ── List ── */}
          {payments.length > 0 && (
            <ul className="space-y-3" aria-label="Liste des paiements en attente">
              {payments.map((p) => {
                const expanded = expandedIds.has(p.id);
                const hasBreakdown =
                  !!p.pack_breakdown &&
                  Array.isArray(p.pack_breakdown.items) &&
                  p.pack_breakdown.items.length > 0;
                const isCustom =
                  (p.pack_slug || p.pack_id || "").toLowerCase() === "custom";
                const isActioning = actioningId === p.id;
                const pseudo =
                  p.client_pseudo || p.pseudo_web || "pseudo inconnu";

                return (
                  <li
                    key={p.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border2)",
                    }}
                  >
                    <div className="p-4">
                      <div className="flex flex-wrap items-start gap-3">
                        {/* Infos */}
                        <div className="flex-1 min-w-[220px]">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1 text-xs font-bold"
                              style={{ color: "var(--text)" }}
                            >
                              <User
                                className="w-3 h-3"
                                style={{ color: "var(--text-muted)" }}
                              />
                              {pseudo}
                            </span>
                            <span
                              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                              style={{
                                background: "rgba(212,175,55,0.15)",
                                color: "#D4AF37",
                              }}
                            >
                              {p.pack_name || p.pack_id || "?"}
                            </span>
                            {isCustom && (
                              <span
                                className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded"
                                style={{
                                  background: "rgba(139,92,246,0.15)",
                                  color: "#A78BFA",
                                }}
                              >
                                Custom
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-mono"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <Hash className="w-3 h-3" />
                              {p.reference_code}
                            </span>
                            <span
                              className="text-[11px]"
                              style={{ color: "var(--text-muted)" }}
                            >
                              · {fmtDate(p.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <p
                            className="text-lg font-black tabular-nums"
                            style={{ color: "#D4AF37" }}
                          >
                            {fmtAmount(p)}
                          </p>
                          <p
                            className="text-[10px] uppercase tracking-wider"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {p.payment_method}
                          </p>
                        </div>
                      </div>

                      {/* Breakdown toggle for custom */}
                      {hasBreakdown && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            style={{ color: "var(--accent)" }}
                            aria-expanded={expanded}
                          >
                            {expanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                            {expanded ? "Masquer" : "Voir"} le détail
                          </button>

                          {expanded && (
                            <div
                              className="mt-2 rounded-lg p-3 text-[11px]"
                              style={{
                                background: "var(--bg2)",
                                border: "1px solid var(--border2)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <ul className="space-y-1 mb-2">
                                {(p.pack_breakdown?.items || []).map(
                                  (item, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-center gap-2"
                                    >
                                      <span
                                        className="font-mono px-1.5 py-0.5 rounded text-[10px]"
                                        style={{
                                          background: "var(--bg3)",
                                          color: "var(--text)",
                                        }}
                                      >
                                        ×{item.quantity || 1}
                                      </span>
                                      <span className="font-semibold">
                                        {item.type === "video"
                                          ? "Vidéo"
                                          : item.type === "photo"
                                          ? "Photo"
                                          : item.type || "?"}
                                      </span>
                                      <CategoryLabel cat={item.category} />
                                      {item.type === "video" &&
                                        item.duration_min && (
                                          <span
                                            style={{
                                              color: "var(--text-muted)",
                                            }}
                                          >
                                            {item.duration_min}min
                                          </span>
                                        )}
                                      {item.special_feet && (
                                        <span
                                          className="text-[10px] px-1 py-0.5 rounded"
                                          style={{
                                            background:
                                              "rgba(232,168,124,0.12)",
                                            color: "#E8A87C",
                                          }}
                                        >
                                          pied ×3
                                        </span>
                                      )}
                                    </li>
                                  )
                                )}
                              </ul>
                              {p.pack_breakdown?.description && (
                                <p
                                  className="italic"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  « {p.pack_breakdown.description} »
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => handleAction(p, "approve")}
                          disabled={isActioning}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                          style={{
                            background: "#22C55E",
                            color: "#fff",
                          }}
                          aria-label={`Valider paiement ${p.reference_code}`}
                        >
                          {isActioning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Valider
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(p, "reject")}
                          disabled={isActioning}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                          style={{
                            background: "rgba(239,68,68,0.15)",
                            color: "#F87171",
                            border: "1px solid rgba(239,68,68,0.3)",
                          }}
                          aria-label={`Refuser paiement ${p.reference_code}`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Refuser
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-4 py-3 rounded-xl shadow-lg animate-fadeUp"
          role="status"
          aria-live="polite"
          style={{
            background:
              toast.kind === "success"
                ? "rgba(34,197,94,0.95)"
                : "rgba(239,68,68,0.95)",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 600,
            maxWidth: "90vw",
          }}
        >
          {toast.message}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translate(-50%, 10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fadeUp {
          animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </OsLayout>
  );
}

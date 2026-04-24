"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Receipt,
  ChevronDown,
  ChevronUp,
  Hash,
  RefreshCw,
} from "lucide-react";

/**
 * BRIEF-16 livrable 5 — PaymentPendingDrawer
 *
 * Version drawer compacte (panneau latéral ou bottom-sheet) des
 * /agence/payments, à intégrer dans la messagerie pour valider vite un
 * paiement sans changer de page.
 *
 * Usage (dans messagerie/page.tsx ou composer) :
 *   <PaymentPendingDrawer open={open} onClose={close} model="yumi" onValidated={refresh} />
 */

interface PendingPayment {
  id: string;
  model: string;
  client_pseudo: string | null;
  pseudo_web?: string | null;
  pack_id: string | null;
  pack_slug?: string | null;
  pack_name: string | null;
  amount: number;
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
  } | null;
  created_at: string;
}

interface PaymentPendingDrawerProps {
  open: boolean;
  onClose: () => void;
  model?: string | null;
  onValidated?: (referenceCode: string, generatedCode?: string) => void;
}

function fmtAmount(p: PendingPayment): string {
  const v = p.amount > 1000 ? p.amount / 100 : p.amount;
  return `${v.toFixed(2)} ${p.currency || "EUR"}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PaymentPendingDrawer({
  open,
  onClose,
  model,
  onValidated,
}: PaymentPendingDrawerProps) {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Fetch pending ──
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (model) qs.set("model", model);
      const res = await fetch(
        `/api/payments/pending${qs.toString() ? `?${qs}` : ""}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setError(`Erreur ${res.status}`);
        return;
      }
      const data = await res.json();
      setPayments(data.payments || []);
      setError(null);
    } catch (err) {
      setError(String(err).slice(0, 120));
    } finally {
      setLoading(false);
    }
  }, [model]);

  useEffect(() => {
    if (!open) return;
    fetchPending();
  }, [open, fetchPending]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAction = useCallback(
    async (p: PendingPayment, action: "approve" | "reject") => {
      if (actioningId) return;

      let reason: string | null = null;
      if (action === "reject") {
        reason = window.prompt(`Raison du refus pour ${p.reference_code} :`);
        if (!reason || !reason.trim()) return;
      } else {
        const ok = window.confirm(
          `Valider ${fmtAmount(p)} pour ${
            p.client_pseudo || p.pseudo_web || "?"
          } ?\nRéférence: ${p.reference_code}`
        );
        if (!ok) return;
      }

      setActioningId(p.id);
      try {
        const res = await fetch("/api/payments/manual/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referenceCode: p.reference_code,
            action,
            ...(reason ? { reason: reason.trim() } : {}),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Erreur ${res.status}`);
        }
        const data = await res.json().catch(() => ({}));
        if (action === "approve") {
          onValidated?.(p.reference_code, data.generatedCode);
        }
        fetchPending();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setActioningId(null);
      }
    },
    [actioningId, fetchPending, onValidated]
  );

  const count = useMemo(() => payments.length, [payments]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-md overflow-hidden flex flex-col"
        style={{
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
          animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-drawer-title"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Receipt className="w-4 h-4" style={{ color: "#D4AF37" }} />
            <h2
              id="pending-drawer-title"
              className="text-sm font-bold truncate"
              style={{ color: "var(--text)" }}
            >
              Paiements en attente
            </h2>
            {count > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37" }}
              >
                {count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchPending}
              disabled={loading}
              aria-label="Rafraîchir"
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-40 hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                style={{ color: "var(--text-muted)" }}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <X
                className="w-3.5 h-3.5"
                style={{ color: "var(--text-muted)" }}
              />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && payments.length === 0 && (
            <div
              className="flex items-center justify-center py-10 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Chargement...
            </div>
          )}

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#F87171",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </div>
          )}

          {!loading && payments.length === 0 && !error && (
            <div
              className="text-center py-10 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Aucun paiement en attente
            </div>
          )}

          {payments.map((p) => {
            const expanded = expandedIds.has(p.id);
            const hasBreakdown =
              !!p.pack_breakdown &&
              Array.isArray(p.pack_breakdown.items) &&
              p.pack_breakdown.items.length > 0;
            const isCustom =
              (p.pack_slug || p.pack_id || "").toLowerCase() === "custom";
            const isActioning = actioningId === p.id;

            return (
              <div
                key={p.id}
                className="rounded-xl p-3"
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border2)",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p
                      className="text-xs font-bold truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {p.client_pseudo || p.pseudo_web || "pseudo inconnu"}
                    </p>
                    <p
                      className="text-[10px] truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Hash className="w-2.5 h-2.5 inline mr-0.5" />
                      <span className="font-mono">{p.reference_code}</span>
                      {" · "}
                      {fmtDate(p.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="text-sm font-black tabular-nums"
                      style={{ color: "#D4AF37" }}
                    >
                      {fmtAmount(p)}
                    </p>
                    <p
                      className="text-[9px] uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {p.pack_name || p.pack_id}
                      {isCustom && " · custom"}
                    </p>
                  </div>
                </div>

                {hasBreakdown && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(p.id)}
                      aria-expanded={expanded}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                      style={{ color: "var(--accent)" }}
                    >
                      {expanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      {expanded ? "Masquer" : "Voir"} détail
                    </button>
                    {expanded && (
                      <ul
                        className="mt-1.5 text-[10px] space-y-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {(p.pack_breakdown?.items || []).map((item, idx) => (
                          <li key={idx}>
                            ×{item.quantity || 1} {item.type} /{" "}
                            {item.category}
                            {item.type === "video" && item.duration_min
                              ? ` (${item.duration_min}min)`
                              : ""}
                            {item.special_feet ? " · pied×3" : ""}
                          </li>
                        ))}
                        {p.pack_breakdown?.description && (
                          <li
                            className="italic mt-1"
                            style={{ color: "var(--text-muted)" }}
                          >
                            « {p.pack_breakdown.description} »
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAction(p, "approve")}
                    disabled={isActioning}
                    aria-label={`Valider ${p.reference_code}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ background: "#22C55E", color: "#fff" }}
                  >
                    {isActioning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(p, "reject")}
                    disabled={isActioning}
                    aria-label={`Refuser ${p.reference_code}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40 cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      color: "#F87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    <XCircle className="w-3 h-3" />
                    Refuser
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0.7; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
      </aside>
    </>
  );
}

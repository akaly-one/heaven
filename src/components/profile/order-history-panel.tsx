"use client";

import { useState } from "react";
import { X, Clock, CheckCircle, XCircle, ShoppingBag, Copy, Check, CreditCard } from "lucide-react";

interface Order {
  id: string;
  pack_name: string;
  tier: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed";
  payment_method: string;
  generated_code: string | null;
  created_at: string;
  completed_at: string | null;
}

interface OrderHistoryPanelProps {
  orders: Order[];
  onClose: () => void;
  loading?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}j`;
}

const STATUS_CONFIG = {
  pending:   { icon: Clock,       label: "En attente",  color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  completed: { icon: CheckCircle, label: "Confirme",    color: "#10B981", bg: "rgba(16,185,129,0.08)" },
  failed:    { icon: XCircle,     label: "Echoue",      color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
};

const PAYMENT_LABELS: Record<string, string> = {
  paypal: "PayPal",
  revolut: "Revolut",
  stripe: "Stripe",
  manual: "Manuel",
};

function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
      style={{
        background: "var(--bg3)",
        border: "1px solid var(--border2)",
        fontSize: 10,
        fontFamily: "monospace",
        color: "var(--text)",
      }}
    >
      {code}
      {copied ? (
        <Check className="w-3 h-3" style={{ color: "#10B981" }} />
      ) : (
        <Copy className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
      )}
    </button>
  );
}

export function OrderHistoryPanel({ orders, onClose, loading }: OrderHistoryPanelProps) {
  return (
    <div
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50 rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border2)",
        maxHeight: "min(500px, 70vh)",
        animation: "slideUp 0.3s ease-out",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border2)", background: "var(--bg3)" }}
      >
        <ShoppingBag className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-xs font-bold flex-1" style={{ color: "var(--text)" }}>
          Mes commandes {orders.length > 0 && `(${orders.length})`}
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
          style={{ background: "rgba(255,255,255,0.05)", border: "none" }}
        >
          <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {/* Orders list */}
      <div className="overflow-y-auto" style={{ maxHeight: "min(400px, 55vh)" }}>
        {loading ? (
          <div className="py-12 text-center">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-2"
              style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }}
            />
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Chargement...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag
              className="w-8 h-8 mx-auto mb-2"
              style={{ color: "var(--text-muted)", opacity: 0.25 }}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Aucune commande pour le moment
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
              Tes achats apparaitront ici
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            const isPending = order.status === "pending";
            return (
              <div
                key={order.id}
                className="px-4 py-3.5 transition-colors"
                style={{ borderBottom: "1px solid var(--border2)" }}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0${isPending ? " animate-pulse" : ""}`}
                    style={{ background: cfg.bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: pack name + time */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[11px] font-semibold truncate"
                        style={{ color: "var(--text)" }}
                      >
                        {order.pack_name}
                      </span>
                      <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(order.created_at)}
                      </span>
                    </div>

                    {/* Row 2: status badge + amount + payment method */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      {order.amount > 0 && (
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: "var(--text)" }}
                        >
                          {order.amount}{order.currency === "EUR" ? "\u20AC" : ` ${order.currency}`}
                        </span>
                      )}
                      <span
                        className="flex items-center gap-1 text-[9px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <CreditCard className="w-3 h-3" />
                        {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                      </span>
                    </div>

                    {/* Row 3: generated code (if exists) */}
                    {order.generated_code && (
                      <div className="mt-1.5">
                        <CodeCopyButton code={order.generated_code} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useModel } from "@/lib/model-context";
import {
  DollarSign, TrendingUp, Users, CreditCard,
  ArrowDownRight, ArrowUpRight, Clock, CheckCircle2,
  AlertCircle, Wallet, Receipt,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */

interface Payment {
  id: string;
  model: string;
  client_pseudo: string;
  client_platform: string;
  pack_name: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface Client {
  id: string;
  model: string;
  pseudo_snap: string | null;
  pseudo_insta: string | null;
  total_spent: number;
  tier: string | null;
}

/* ══════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════ */

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    completed: { bg: "rgba(34,197,94,0.12)", color: "#22C55E", label: "Completed" },
    pending: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", label: "Pending" },
    failed: { bg: "rgba(239,68,68,0.12)", color: "#EF4444", label: "Failed" },
  };
  const s = map[status] || map.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
      style={{ background: s.bg, color: s.color }}>
      {status === "completed" ? <CheckCircle2 className="w-3 h-3" /> :
        status === "failed" ? <AlertCircle className="w-3 h-3" /> :
          <Clock className="w-3 h-3" />}
      {s.label}
    </span>
  );
}

function methodBadge(method: string) {
  const map: Record<string, { bg: string; color: string }> = {
    paypal: { bg: "rgba(0,112,224,0.12)", color: "#0070E0" },
    revolut: { bg: "rgba(99,102,241,0.12)", color: "#6366F1" },
    manual: { bg: "rgba(148,163,184,0.12)", color: "#94A3B8" },
  };
  const m = map[method] || map.manual;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
      style={{ background: m.bg, color: m.color }}>
      {method}
    </span>
  );
}

/* ══════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════ */

export default function FinancesPage() {
  const { currentModel, authHeaders } = useModel();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = currentModel ? `?model=${currentModel}` : "";
    fetch(`/api/finances${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.payments) setPayments(d.payments);

        if (d.clients) setClients(d.clients);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentModel, authHeaders]);

  /* ── Computed values ── */

  const automatedRevenue = useMemo(() =>
    payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments],
  );

  const manualRevenue = useMemo(() =>
    clients.reduce((sum, c) => sum + Number(c.total_spent || 0), 0),
    [clients],
  );

  // Deduplicate: if a payment exists in both automated + manual, prefer automated
  // For now, show both separately — total = automated + manual (legacy only)
  const totalRevenue = automatedRevenue + manualRevenue;

  const commission25 = totalRevenue * 0.25;
  const netAfterCommission = totalRevenue - commission25;

  const payingClients = useMemo(() => {
    const automatedPseudos = new Set(payments.map(p => p.client_pseudo));
    const manualCount = clients.filter(c => Number(c.total_spent) > 0 && !automatedPseudos.has(c.pseudo_snap?.toLowerCase() || "")).length;
    return payments.length + manualCount;
  }, [payments, clients]);

  const avgSpend = payingClients > 0 ? totalRevenue / payingClients : 0;

  /* ── Revenue by model ── */
  const byModel = useMemo(() => {
    const map: Record<string, { automated: number; manual: number }> = {};
    payments.forEach(p => {
      if (!map[p.model]) map[p.model] = { automated: 0, manual: 0 };
      map[p.model].automated += Number(p.amount || 0);
    });
    clients.forEach(c => {
      if (!map[c.model]) map[c.model] = { automated: 0, manual: 0 };
      map[c.model].manual += Number(c.total_spent || 0);
    });
    return Object.entries(map)
      .map(([model, rev]) => ({ model, ...rev, total: rev.automated + rev.manual }))
      .sort((a, b) => b.total - a.total);
  }, [payments, clients]);

  /* ── Payment method breakdown ── */
  const byMethod = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    payments.forEach(p => {
      const m = p.payment_method || "manual";
      if (!map[m]) map[m] = { count: 0, amount: 0 };
      map[m].count++;
      map[m].amount += Number(p.amount || 0);
    });
    if (manualRevenue > 0) {
      const manualClients = clients.filter(c => Number(c.total_spent) > 0).length;
      map["manual"] = { count: (map["manual"]?.count || 0) + manualClients, amount: (map["manual"]?.amount || 0) + manualRevenue };
    }
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [payments, clients, manualRevenue]);

  /* ── Monthly chart data ── */
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => {
      const d = new Date(p.completed_at || p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + Number(p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [payments]);

  /* ── Recent transactions (last 20) ── */
  const recentTransactions = useMemo(() =>
    payments.slice(0, 20),
    [payments],
  );

  /* ── Stat cards ── */
  const statCards = [
    { label: "Revenue total", value: `${fmt(totalRevenue)}€`, sub: `Auto: ${fmt(automatedRevenue)}€ · Manuel: ${fmt(manualRevenue)}€`, icon: DollarSign, color: "#00D68F" },
    { label: "Clients payants", value: payingClients.toString(), sub: `${payments.length} auto · ${clients.filter(c => Number(c.total_spent) > 0).length} legacy`, icon: Users, color: "#5B8DEF" },
    { label: "Panier moyen", value: `${fmt(avgSpend)}€`, sub: "par client payant", icon: CreditCard, color: "#E84393" },
    { label: "Commission 25%", value: `${fmt(commission25)}€`, sub: `Net: ${fmt(netAfterCommission)}€`, icon: TrendingUp, color: "#7C6A2F" },
  ];

  return (
    <OsLayout cpId="agence">
    <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,214,143,0.15)" }}>
            <DollarSign className="w-5 h-5" style={{ color: "#00D68F" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Finances</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Vue d&apos;ensemble des revenus {currentModel && `· ${currentModel.toUpperCase()}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,214,143,0.2)", borderTopColor: "#00D68F" }} />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {statCards.map(s => (
                <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                    <span className="text-[11px] uppercase font-medium" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  {s.sub && <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Revenue automated vs manual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Automated revenue */}
              <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4" style={{ color: "#22C55E" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Revenue automatise</h2>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: "#22C55E" }}>{fmt(automatedRevenue)}€</p>
                <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
                  {payments.length} paiement{payments.length !== 1 ? "s" : ""} confirme{payments.length !== 1 ? "s" : ""} (PayPal / Revolut)
                </p>

                {/* Commission breakdown */}
                <div className="space-y-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>Brut</span>
                    <span className="font-medium" style={{ color: "var(--text)" }}>{fmt(automatedRevenue)}€</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1" style={{ color: "#EF4444" }}>
                      <ArrowDownRight className="w-3 h-3" /> Commission 25%
                    </span>
                    <span className="font-medium" style={{ color: "#EF4444" }}>-{fmt(automatedRevenue * 0.25)}€</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-1" style={{ borderTop: "1px dashed var(--border)" }}>
                    <span className="flex items-center gap-1" style={{ color: "#22C55E" }}>
                      <ArrowUpRight className="w-3 h-3" /> Net modele
                    </span>
                    <span style={{ color: "#22C55E" }}>{fmt(automatedRevenue * 0.75)}€</span>
                  </div>
                </div>
              </div>

              {/* Manual / legacy revenue */}
              <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4" style={{ color: "#94A3B8" }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Revenue manuel (legacy)</h2>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: "#94A3B8" }}>{fmt(manualRevenue)}€</p>
                <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
                  Base sur total_spent des fiches clients (saisie manuelle)
                </p>

                <div className="space-y-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>Brut</span>
                    <span className="font-medium" style={{ color: "var(--text)" }}>{fmt(manualRevenue)}€</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1" style={{ color: "#EF4444" }}>
                      <ArrowDownRight className="w-3 h-3" /> Commission 25%
                    </span>
                    <span className="font-medium" style={{ color: "#EF4444" }}>-{fmt(manualRevenue * 0.25)}€</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-1" style={{ borderTop: "1px dashed var(--border)" }}>
                    <span className="flex items-center gap-1" style={{ color: "#22C55E" }}>
                      <ArrowUpRight className="w-3 h-3" /> Net modele
                    </span>
                    <span style={{ color: "#22C55E" }}>{fmt(manualRevenue * 0.75)}€</span>
                  </div>
                </div>

                {manualRevenue > 0 && automatedRevenue === 0 && (
                  <div className="mt-4 p-2.5 rounded-lg text-[11px]" style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B" }}>
                    Ces donnees seront plus precises une fois les paiements automatises actifs.
                  </div>
                )}
              </div>
            </div>

            {/* Monthly revenue chart */}
            <div className="rounded-xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Revenue mensuel</h2>
              {monthlyData.length > 0 ? (
                <div className="flex items-end gap-2" style={{ height: 120 }}>
                  {monthlyData.map(([month, amount]) => {
                    const maxAmount = Math.max(...monthlyData.map(d => d[1] as number));
                    const heightPct = maxAmount > 0 ? (amount as number / maxAmount) * 100 : 0;
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold" style={{ color: "#00D68F" }}>{fmt(amount as number)}€</span>
                        <div className="w-full rounded-t-md" style={{
                          height: `${Math.max(heightPct, 4)}%`,
                          background: "linear-gradient(180deg, #00D68F, rgba(0,214,143,0.4))",
                          minHeight: 4,
                        }} />
                        <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>
                          {(month as string).slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="flex items-end gap-1.5 opacity-20">
                    {[30, 55, 40, 70, 50, 80].map((h, i) => (
                      <div key={i} className="w-8 rounded-t-md" style={{ height: h, background: "var(--text-muted)" }} />
                    ))}
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                    Le graphique se remplira au fur et a mesure des paiements automatises.
                  </p>
                </div>
              )}
            </div>

            {/* Payment method breakdown */}
            {byMethod.length > 0 && (
              <div className="rounded-xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Repartition par methode</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {byMethod.map(([method, data]) => {
                    const pct = totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0;
                    return (
                      <div key={method} className="rounded-lg p-3" style={{ background: "var(--bg)" }}>
                        <div className="flex items-center justify-between mb-2">
                          {methodBadge(method)}
                          <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{data.count} tx</span>
                        </div>
                        <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{fmt(data.amount)}€</p>
                        <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full" style={{
                            width: `${pct}%`,
                            background: method === "paypal" ? "#0070E0" : method === "revolut" ? "#6366F1" : "#94A3B8",
                          }} />
                        </div>
                        <p className="text-[10px] mt-1 text-right" style={{ color: "var(--text-muted)" }}>{pct.toFixed(0)}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Revenue by model */}
            {byModel.length > 0 && (
              <div className="rounded-xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Revenue par modele</h2>
                <div className="space-y-3">
                  {byModel.map(({ model, automated, manual, total }) => (
                    <div key={model}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium uppercase" style={{ color: "var(--text)" }}>{model}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]" style={{ color: "#22C55E" }}>Auto: {fmt(automated)}€</span>
                          {manual > 0 && <span className="text-[10px]" style={{ color: "#94A3B8" }}>Manuel: {fmt(manual)}€</span>}
                          <span className="text-xs font-bold" style={{ color: "#E84393" }}>{fmt(total)}€</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                        <div className="h-full rounded-full flex">
                          {totalRevenue > 0 && automated > 0 && (
                            <div className="h-full" style={{
                              width: `${(automated / totalRevenue) * 100}%`,
                              background: "linear-gradient(135deg, #22C55E, #16A34A)",
                            }} />
                          )}
                          {totalRevenue > 0 && manual > 0 && (
                            <div className="h-full" style={{
                              width: `${(manual / totalRevenue) * 100}%`,
                              background: "linear-gradient(135deg, #94A3B8, #64748B)",
                            }} />
                          )}
                        </div>
                      </div>
                      {/* Per-model commission */}
                      <div className="flex gap-4 mt-1">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          Commission: {fmt(total * 0.25)}€
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: "#22C55E" }}>
                          Net: {fmt(total * 0.75)}€
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent transactions */}
            <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Dernieres transactions</h2>
              {recentTransactions.length > 0 ? (
                <div className="space-y-2">
                  {recentTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(0,214,143,0.12)" }}>
                          <DollarSign className="w-4 h-4" style={{ color: "#00D68F" }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                              {tx.client_pseudo || "Anonyme"}
                            </span>
                            <span className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>{tx.model}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {tx.pack_name || "Pack"} · {fmtDateTime(tx.completed_at || tx.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {methodBadge(tx.payment_method)}
                        {statusBadge(tx.status)}
                        <span className="text-sm font-bold" style={{ color: "#00D68F" }}>{fmt(Number(tx.amount))}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Aucune transaction automatisee pour le moment.
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                    Les paiements PayPal et Revolut apparaitront ici automatiquement.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </OsLayout>
  );
}

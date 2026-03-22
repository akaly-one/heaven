"use client";

import { useState, useEffect } from "react";
import { useModel } from "@/lib/model-context";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";

interface Client {
  model: string;
  total_spent: number;
  tier: string | null;
}

export default function FinancesPage() {
  const { currentModel, authHeaders } = useModel();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = currentModel ? `?model=${currentModel}` : "";
    fetch(`/api/clients${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.clients) setClients(d.clients); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentModel, authHeaders]);

  const totalRevenue = clients.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
  const activeClients = clients.filter(c => Number(c.total_spent) > 0).length;
  const avgSpend = activeClients > 0 ? totalRevenue / activeClients : 0;

  // Revenue by model
  const byModel: Record<string, number> = {};
  clients.forEach(c => {
    byModel[c.model] = (byModel[c.model] || 0) + Number(c.total_spent || 0);
  });

  // Revenue by tier
  const byTier: Record<string, number> = {};
  clients.forEach(c => {
    const t = c.tier || "none";
    byTier[t] = (byTier[t] || 0) + Number(c.total_spent || 0);
  });

  const statCards = [
    { label: "Revenue total", value: `${totalRevenue.toFixed(0)}€`, icon: DollarSign, color: "#00D68F" },
    { label: "Clients payants", value: activeClients.toString(), icon: Users, color: "#5B8DEF" },
    { label: "Panier moyen", value: `${avgSpend.toFixed(0)}€`, icon: CreditCard, color: "#E84393" },
    { label: "Commission 25%", value: `${(totalRevenue * 0.25).toFixed(0)}€`, icon: TrendingUp, color: "#C9A84C" },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 md:ml-[60px]" style={{ background: "var(--sq-bg)" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,214,143,0.15)" }}>
            <DollarSign className="w-5 h-5" style={{ color: "#00D68F" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--sq-text)" }}>Finances</h1>
            <p className="text-xs" style={{ color: "var(--sq-text-muted)" }}>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {statCards.map(s => (
                <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--sq-bg2)", border: "1px solid var(--sq-border2)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                    <span className="text-[10px] uppercase font-medium" style={{ color: "var(--sq-text-muted)" }}>{s.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue by model */}
            {Object.keys(byModel).length > 0 && (
              <div className="rounded-xl p-5 mb-6" style={{ background: "var(--sq-bg2)", border: "1px solid var(--sq-border2)" }}>
                <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--sq-text)" }}>Revenue par modèle</h2>
                <div className="space-y-3">
                  {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([model, rev]) => (
                    <div key={model} className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase" style={{ color: "var(--sq-text)" }}>{model}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: "var(--sq-bg3)" }}>
                          <div className="h-full rounded-full" style={{
                            width: `${totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0}%`,
                            background: "linear-gradient(135deg, #E84393, #D63384)",
                          }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "#E84393" }}>{rev.toFixed(0)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue by tier */}
            {Object.keys(byTier).length > 0 && (
              <div className="rounded-xl p-5" style={{ background: "var(--sq-bg2)", border: "1px solid var(--sq-border2)" }}>
                <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--sq-text)" }}>Revenue par tier</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(byTier).sort((a, b) => b[1] - a[1]).map(([tier, rev]) => (
                    <div key={tier} className="rounded-lg p-3 text-center" style={{ background: "var(--sq-bg3)" }}>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "var(--sq-text-muted)" }}>{tier}</p>
                      <p className="text-sm font-bold" style={{ color: "#00D68F" }}>{rev.toFixed(0)}€</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

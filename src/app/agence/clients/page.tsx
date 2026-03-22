"use client";

import { useState, useEffect } from "react";
import { useModel } from "@/lib/model-context";
import { Users, Search, Shield, ShieldCheck, Ban, Eye } from "lucide-react";

interface Client {
  id: string;
  pseudo_snap: string | null;
  pseudo_insta: string | null;
  model: string;
  tier: string | null;
  total_spent: number;
  total_tokens_bought: number;
  total_tokens_spent: number;
  is_verified: boolean;
  is_blocked: boolean;
  notes: string | null;
  last_active: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const { currentModel, authHeaders, isRoot } = useModel();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
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

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.pseudo_snap || "").toLowerCase().includes(q) ||
      (c.pseudo_insta || "").toLowerCase().includes(q) ||
      (c.model || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen p-4 md:p-8 md:ml-[60px]" style={{ background: "var(--sq-bg)" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(91,141,239,0.15)" }}>
              <Users className="w-5 h-5" style={{ color: "#5B8DEF" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--sq-text)" }}>Clients</h1>
              <p className="text-xs" style={{ color: "var(--sq-text-muted)" }}>
                {clients.length} client{clients.length !== 1 ? "s" : ""} enregistré{clients.length !== 1 ? "s" : ""}
                {currentModel && ` · ${currentModel.toUpperCase()}`}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sq-text-muted)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par pseudo snap/insta..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--sq-bg2)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(91,141,239,0.2)", borderTopColor: "#5B8DEF" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--sq-text-muted)" }}>
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun client enregistré</p>
            <p className="text-xs mt-1">Les clients apparaîtront ici après leur première interaction</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--sq-border2)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ color: "var(--sq-text)" }}>
                <thead>
                  <tr style={{ background: "var(--sq-bg2)" }}>
                    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--sq-text-muted)" }}>Pseudo</th>
                    {isRoot && <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--sq-text-muted)" }}>Modèle</th>}
                    <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--sq-text-muted)" }}>Tier</th>
                    <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: "var(--sq-text-muted)" }}>Dépensé</th>
                    <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: "var(--sq-text-muted)" }}>Statut</th>
                    <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: "var(--sq-text-muted)" }}>Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="transition-colors hover:opacity-80" style={{ borderTop: "1px solid var(--sq-border2)" }}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          {c.pseudo_snap && <span className="text-xs">👻 {c.pseudo_snap}</span>}
                          {c.pseudo_insta && <span className="text-xs">📸 {c.pseudo_insta}</span>}
                        </div>
                      </td>
                      {isRoot && <td className="px-4 py-3 text-xs font-medium uppercase">{c.model}</td>}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                          style={{ background: "rgba(232,67,147,0.1)", color: "#E84393" }}>
                          {c.tier || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium">{Number(c.total_spent).toFixed(0)}€</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {c.is_blocked ? (
                            <Ban className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                          ) : c.is_verified ? (
                            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#00D68F" }} />
                          ) : (
                            <Shield className="w-3.5 h-3.5" style={{ color: "var(--sq-text-muted)" }} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs" style={{ color: "var(--sq-text-muted)" }}>
                        {c.last_active ? new Date(c.last_active).toLocaleDateString("fr-FR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

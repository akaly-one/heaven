"use client";

import { useState, useEffect, useCallback } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { Search, ArrowLeft } from "lucide-react";

interface Client {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; tier: string | null; total_tokens_bought: number; total_tokens_spent: number;
  last_active: string | null; notes: string | null; created_at: string;
}

export default function ClientsPage() {
  const { currentModel, authHeaders } = useModel();
  const model = currentModel || "yumi";
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(() => {
    fetch(`/api/clients?model=${model}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [model, authHeaders]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = search.trim()
    ? clients.filter(c => (c.pseudo_snap || c.pseudo_insta || "").toLowerCase().includes(search.toLowerCase()))
    : clients;

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <a href="/agence" className="p-2 rounded-lg no-underline hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-4 h-4" />
            </a>
            <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Clients ({clients.length})</h1>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un pseudo..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs outline-none"
              style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} />
          </div>

          {loading && <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Chargement...</p>}

          <div className="space-y-1.5">
            {filtered.map(c => {
              const pseudo = c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 8);
              const isSnap = !!c.pseudo_snap;
              return (
                <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="w-5 h-5 rounded-full shrink-0" style={{ background: isSnap ? "#997A00" : "#C13584" }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold block truncate" style={{ color: "var(--text)" }}>@{pseudo}</span>
                    <div className="flex items-center gap-2 text-[9px]" style={{ color: "var(--text-muted)" }}>
                      {c.tier && <span className="uppercase font-bold">{c.tier}</span>}
                      <span>{c.total_tokens_bought || 0} tokens</span>
                      {c.last_active && <span>vu {new Date(c.last_active).toLocaleDateString("fr-FR")}</span>}
                    </div>
                  </div>
                  {c.notes && <span className="text-[9px] truncate max-w-[80px]" style={{ color: "var(--text-muted)" }}>{c.notes}</span>}
                </div>
              );
            })}
          </div>

          {!loading && filtered.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun client</p>
          )}
        </div>
      </div>
    </OsLayout>
  );
}

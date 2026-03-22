"use client";

import { useState, useEffect } from "react";
import { useModel } from "@/lib/model-context";
import { Settings, UserPlus, Trash2, Shield, ShieldCheck, Power } from "lucide-react";

interface Account {
  id: string;
  code: string;
  role: "root" | "model";
  model_slug: string | null;
  display_name: string;
  active: boolean;
  created_at: string;
  last_login: string | null;
}

export default function SettingsPage() {
  const { authHeaders, isRoot, auth } = useModel();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: "", role: "model", model_slug: "", display_name: "" });

  const fetchAccounts = () => {
    setLoading(true);
    fetch("/api/accounts", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.accounts) setAccounts(d.accounts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, [authHeaders]);

  const handleCreate = async () => {
    if (!newAccount.code || !newAccount.display_name) return;
    await fetch("/api/accounts", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(newAccount),
    });
    setNewAccount({ code: "", role: "model", model_slug: "", display_name: "" });
    setShowAdd(false);
    fetchAccounts();
  };

  const handleToggleActive = async (account: Account) => {
    await fetch("/api/accounts", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ id: account.id, active: !account.active }),
    });
    fetchAccounts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce compte ?")) return;
    await fetch(`/api/accounts?id=${id}`, { method: "DELETE", headers: authHeaders() });
    fetchAccounts();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 md:ml-[60px]" style={{ background: "var(--sq-bg)" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(100,116,139,0.15)" }}>
              <Settings className="w-5 h-5" style={{ color: "#64748B" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--sq-text)" }}>Paramètres</h1>
              <p className="text-xs" style={{ color: "var(--sq-text-muted)" }}>Gestion des comptes et accès</p>
            </div>
          </div>
          {isRoot && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(232,67,147,0.15)", color: "#E84393" }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Nouveau compte
            </button>
          )}
        </div>

        {/* Session info */}
        {auth && (
          <div className="rounded-xl p-4 mb-6" style={{ background: "var(--sq-bg2)", border: "1px solid var(--sq-border2)" }}>
            <h2 className="text-xs font-semibold mb-2" style={{ color: "var(--sq-text-muted)" }}>Session active</h2>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: isRoot ? "rgba(232,67,147,0.15)" : "rgba(168,130,255,0.15)", color: isRoot ? "#E84393" : "#A882FF" }}>
                {isRoot ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--sq-text)" }}>{auth.display_name}</p>
                <p className="text-[10px] uppercase font-medium" style={{ color: "var(--sq-text-muted)" }}>
                  {auth.role} {auth.model_slug && `· ${auth.model_slug}`} · Connecté {new Date(auth.loggedAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add account form */}
        {showAdd && isRoot && (
          <div className="rounded-xl p-5 mb-6" style={{ background: "var(--sq-bg2)", border: "1px solid rgba(232,67,147,0.2)" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--sq-text)" }}>Nouveau compte</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={newAccount.display_name}
                onChange={e => setNewAccount({ ...newAccount, display_name: e.target.value })}
                placeholder="Nom affiché (ex: RUBY)"
                className="px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--sq-bg3)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
              />
              <input
                value={newAccount.code}
                onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
                placeholder="Code d'accès (ex: ruby)"
                className="px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--sq-bg3)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
              />
              <input
                value={newAccount.model_slug}
                onChange={e => setNewAccount({ ...newAccount, model_slug: e.target.value })}
                placeholder="Slug modèle (ex: ruby)"
                className="px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--sq-bg3)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
              />
              <select
                value={newAccount.role}
                onChange={e => setNewAccount({ ...newAccount, role: e.target.value })}
                className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                style={{ background: "var(--sq-bg3)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
              >
                <option value="model">Model</option>
                <option value="root">Root Admin</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ background: "linear-gradient(135deg, #E84393, #D63384)", color: "#fff" }}
            >
              Créer le compte
            </button>
          </div>
        )}

        {/* Accounts list */}
        {isRoot && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--sq-border2)" }}>
            <div className="px-4 py-3" style={{ background: "var(--sq-bg2)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--sq-text)" }}>Comptes ({accounts.length})</h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(100,116,139,0.2)", borderTopColor: "#64748B" }} />
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--sq-border2)" }}>
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          background: account.role === "root" ? "rgba(232,67,147,0.15)" : "rgba(168,130,255,0.15)",
                          color: account.role === "root" ? "#E84393" : "#A882FF",
                        }}>
                        {account.display_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--sq-text)" }}>{account.display_name}</p>
                        <p className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>
                          {account.role} · code: {account.code} {account.model_slug && `· slug: ${account.model_slug}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: account.active ? "rgba(0,214,143,0.1)" : "rgba(239,68,68,0.1)", color: account.active ? "#00D68F" : "#EF4444" }}>
                        {account.active ? "ACTIF" : "INACTIF"}
                      </span>
                      <button onClick={() => handleToggleActive(account)} className="p-1.5 rounded-lg cursor-pointer hover:opacity-80"
                        style={{ color: "var(--sq-text-muted)" }}>
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(account.id)} className="p-1.5 rounded-lg cursor-pointer hover:opacity-80"
                        style={{ color: "#EF4444" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

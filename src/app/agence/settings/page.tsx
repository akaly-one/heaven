"use client";

import { useState, useEffect } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { SecurityAlerts } from "@/components/cockpit/security-alerts";
import { Settings, UserPlus, Trash2, Shield, ShieldCheck, Power, Lock, Users } from "lucide-react";

// ── Types ──
interface Account {
  id: string; code: string; role: "root" | "model"; model_slug: string | null;
  display_name: string; active: boolean; created_at: string; last_login: string | null;
}
const SECTIONS = [
  { id: "security" as const, label: "Sécurité", icon: Lock },
  { id: "accounts" as const, label: "Comptes", icon: Users },
];

export default function SettingsPage() {
  const { authHeaders, isRoot, auth, currentModel } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [section, setSection] = useState<"security" | "accounts">("security");
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
    await fetch("/api/accounts", { method: "POST", headers: authHeaders(), body: JSON.stringify(newAccount) });
    setNewAccount({ code: "", role: "model", model_slug: "", display_name: "" });
    setShowAdd(false);
    fetchAccounts();
  };
  const handleToggleActive = async (account: Account) => {
    await fetch("/api/accounts", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ id: account.id, active: !account.active }) });
    fetchAccounts();
  };
  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Supprimer ce compte ?")) return;
    await fetch(`/api/accounts?id=${id}`, { method: "DELETE", headers: authHeaders() });
    fetchAccounts();
  };

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3 fade-up">
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <Settings className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Paramètres</h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Sécurité, comptes</p>
            </div>
          </div>

          {/* Section tabs */}
          <div className="segmented-control fade-up-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)} className={section === s.id ? "active" : ""}>
                <s.icon className="w-3.5 h-3.5 inline mr-1.5" />
                {s.label}
              </button>
            ))}
          </div>

          {/* ═══ SECURITY SECTION ═══ */}
          {section === "security" && (
            <div className="fade-up-2">
              <SecurityAlerts modelSlug={modelSlug} authHeaders={authHeaders} />
            </div>
          )}

          {/* ═══ ACCOUNTS SECTION ═══ */}
          {section === "accounts" && (
            <div className="space-y-4 fade-up-2">
              {/* Session */}
              {auth && (
                <div className="card-premium p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Session active</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: isRoot ? "rgba(232,67,147,0.15)" : "rgba(168,130,255,0.15)", color: isRoot ? "#E84393" : "#A882FF" }}>
                      {isRoot ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{auth.display_name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {auth.role} {auth.model_slug && `· ${auth.model_slug}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Add account */}
              {isRoot && (
                <button onClick={() => setShowAdd(!showAdd)}
                  className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
                  style={{ background: "rgba(232,67,147,0.1)", color: "#E84393", border: "1px solid rgba(232,67,147,0.2)" }}>
                  <UserPlus className="w-3.5 h-3.5" />
                  Nouveau compte
                </button>
              )}

              {showAdd && isRoot && (
                <div className="card-premium p-5 animate-slide-down">
                  <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Nouveau compte</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input value={newAccount.display_name} onChange={e => setNewAccount({ ...newAccount, display_name: e.target.value })}
                      placeholder="Nom affiché (ex: RUBY)" className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    <input value={newAccount.code} onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
                      placeholder="Code d'accès (ex: ruby)" className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    <input value={newAccount.model_slug} onChange={e => setNewAccount({ ...newAccount, model_slug: e.target.value })}
                      placeholder="Slug modèle (ex: ruby)" className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    <select value={newAccount.role} onChange={e => setNewAccount({ ...newAccount, role: e.target.value })}
                      className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}>
                      <option value="model">Model</option>
                      <option value="root">Root Admin</option>
                    </select>
                  </div>
                  <button onClick={handleCreate}
                    className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer btn-gradient hover:scale-[1.02] active:scale-[0.98] transition-transform">
                    Créer le compte
                  </button>
                </div>
              )}

              {/* Accounts list */}
              {isRoot && (
                <div className="card-premium overflow-hidden">
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border2)" }}>
                    <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Comptes ({accounts.length})</h2>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,168,76,0.2)", borderTopColor: "var(--accent)" }} />
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "var(--border2)" }}>
                      {accounts.map(account => (
                        <div key={account.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                              style={{ background: account.role === "root" ? "rgba(232,67,147,0.15)" : "rgba(168,130,255,0.15)", color: account.role === "root" ? "#E84393" : "#A882FF" }}>
                              {account.display_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{account.display_name}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                {account.role} · {account.code} {account.model_slug && `· ${account.model_slug}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                              style={{ background: account.active ? "rgba(0,214,143,0.1)" : "rgba(239,68,68,0.1)", color: account.active ? "#00D68F" : "#EF4444" }}>
                              {account.active ? "ACTIF" : "INACTIF"}
                            </span>
                            <button onClick={() => handleToggleActive(account)} className="p-1.5 rounded-lg cursor-pointer hover:scale-110 transition-transform"
                              style={{ color: "var(--text-muted)" }}>
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteAccount(account.id)} className="p-1.5 rounded-lg cursor-pointer hover:scale-110 transition-transform"
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
          )}

        </div>
      </div>
    </OsLayout>
  );
}

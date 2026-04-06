"use client";

import { useState, useEffect } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { SecurityAlerts } from "@/components/cockpit/security-alerts";
import { Settings, UserPlus, Trash2, Shield, ShieldCheck, Power, Lock, Users, Edit3, GitMerge, Zap } from "lucide-react";

// ── Types ──
interface Account {
  id: string; code: string; role: "root" | "model"; model_slug: string | null;
  display_name: string; active: boolean; created_at: string; last_login: string | null;
}
const SECTIONS = [
  { id: "security" as const, label: "Sécurité", icon: Lock },
  { id: "accounts" as const, label: "Comptes", icon: Users },
  { id: "mode" as const, label: "Mode", icon: Zap },
];

export default function SettingsPage() {
  const { authHeaders, isRoot, auth, currentModel } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "";

  const [section, setSection] = useState<"security" | "accounts" | "mode">("security");
  const [purging, setPurging] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: "", role: "model", model_slug: "", display_name: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [merging, setMerging] = useState<{ from: string; to: string } | null>(null);

  const fetchAccounts = () => {
    setLoading(true);
    // Root sees all accounts, models see only their own
    const url = isRoot ? "/api/accounts" : `/api/accounts?model=${modelSlug || ""}`;
    fetch(url, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.accounts) setAccounts(d.accounts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (modelSlug || isRoot) fetchAccounts(); }, [authHeaders, modelSlug, isRoot]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const acc = accounts.find(a => a.id === id);
    if (!confirm(`Supprimer le compte "${acc?.display_name}" ? Toutes les donnees liees seront supprimees.`)) return;
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Erreur: ${err.error || res.status}`);
      }
    } catch { alert("Erreur de connexion"); }
    fetchAccounts();
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await fetch("/api/accounts", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ id, display_name: editName.trim() }) });
    setEditing(null);
    fetchAccounts();
  };

  const handleMerge = async () => {
    if (!merging) return;
    const from = accounts.find(a => a.id === merging.from);
    const to = accounts.find(a => a.id === merging.to);
    if (!from || !to) return;
    if (!confirm(`Fusionner "${from.display_name}" dans "${to.display_name}" ? Le compte "${from.display_name}" sera supprime.`)) return;
    // Move all data via API merge endpoint
    if (from.model_slug && to.model_slug) {
      await fetch("/api/accounts", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ action: "merge", from_slug: from.model_slug, to_slug: to.model_slug }),
      });
    }
    // Delete the "from" account
    await fetch(`/api/accounts?id=${merging.from}`, { method: "DELETE", headers: authHeaders() });
    setMerging(null);
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
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Sécurité, comptes</p>
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
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
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
                      placeholder="Nom affiché (ex: RUBY)" className="px-3 py-2.5 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    <input value={newAccount.code} onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
                      placeholder="Code d'accès (ex: ruby)" className="px-3 py-2.5 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    <input value={newAccount.model_slug} onChange={e => setNewAccount({ ...newAccount, model_slug: e.target.value })}
                      placeholder="Slug modèle (ex: ruby)" className="px-3 py-2.5 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    <select value={newAccount.role} onChange={e => setNewAccount({ ...newAccount, role: e.target.value })}
                      className="px-3 py-2.5 rounded-lg text-xs outline-none cursor-pointer"
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
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
                    </div>
                  ) : (<>
                    <div className="divide-y" style={{ borderColor: "var(--border2)" }}>
                      {accounts.map(account => (
                        <div key={account.id} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ background: account.role === "root" ? "rgba(232,67,147,0.15)" : "rgba(168,130,255,0.15)", color: account.role === "root" ? "#E84393" : "#A882FF" }}>
                                {account.display_name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                {editing === account.id ? (
                                  <div className="flex items-center gap-1">
                                    <input value={editName} onChange={e => setEditName(e.target.value)}
                                      className="text-sm font-medium px-2 py-0.5 rounded outline-none"
                                      style={{ color: "var(--text)", background: "var(--bg)", border: "1px solid var(--border)" }}
                                      onKeyDown={e => { if (e.key === "Enter") handleRename(account.id); }}
                                      autoFocus />
                                    <button onClick={() => handleRename(account.id)} className="text-[11px] font-bold cursor-pointer" style={{ color: "var(--success)", background: "none", border: "none" }}>OK</button>
                                    <button onClick={() => setEditing(null)} className="text-[11px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>✕</button>
                                  </div>
                                ) : (
                                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{account.display_name}</p>
                                )}
                                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                  {account.role} · {account.code} {account.model_slug && `· ${account.model_slug}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold"
                                style={{ background: account.active ? "rgba(0,214,143,0.1)" : "rgba(239,68,68,0.1)", color: account.active ? "#00D68F" : "#EF4444" }}>
                                {account.active ? "ON" : "OFF"}
                              </span>
                              <button onClick={() => { setEditing(account.id); setEditName(account.display_name); }}
                                className="p-1 rounded cursor-pointer hover:scale-110" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleToggleActive(account)}
                                className="p-1 rounded cursor-pointer hover:scale-110" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                                <Power className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteAccount(account.id)}
                                className="p-1 rounded cursor-pointer hover:scale-110" style={{ background: "none", border: "none", color: "#EF4444" }}>
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Merge tool */}
                    {accounts.filter(a => a.model_slug).length > 1 && (
                      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border2)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <GitMerge className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                          <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>Fusionner des comptes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={merging?.from || ""} onChange={e => setMerging(prev => ({ from: e.target.value, to: prev?.to || "" }))}
                            className="flex-1 px-2 py-1.5 rounded text-[11px] outline-none cursor-pointer"
                            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                            <option value="">Source...</option>
                            {accounts.filter(a => a.model_slug).map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                          </select>
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>→</span>
                          <select value={merging?.to || ""} onChange={e => setMerging(prev => ({ from: prev?.from || "", to: e.target.value }))}
                            className="flex-1 px-2 py-1.5 rounded text-[11px] outline-none cursor-pointer"
                            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                            <option value="">Destination...</option>
                            {accounts.filter(a => a.model_slug && a.id !== merging?.from).map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                          </select>
                          <button onClick={handleMerge} disabled={!merging?.from || !merging?.to}
                            className="px-3 py-1.5 rounded text-[11px] font-bold cursor-pointer disabled:opacity-30"
                            style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                            Fusionner
                          </button>
                        </div>
                      </div>
                    )}
                  </>)}
                </div>
              )}
            </div>
          )}

          {/* ═══ MODE SECTION ═══ */}
          {section === "mode" && (
            <div className="space-y-4 fade-up-2">
              <div className="card-premium p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                    <Zap className="w-5 h-5" style={{ color: "#10B981" }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Mode Pro</h3>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Supprimer toutes les donnees demo et passer en production</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Cette action va supprimer :</p>
                  <ul className="space-y-1">
                    {["Tous les codes de test", "Tous les clients demo", "Tous les posts du feed", "Tous les messages", "Tous les wall posts"].map(item => (
                      <li key={item} className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                        <Trash2 className="w-3 h-3 shrink-0" style={{ color: "#DC2626" }} /> {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] font-bold" style={{ color: "#DC2626" }}>
                    Cette action est irreversible. Les donnees ne peuvent pas etre recuperees.
                  </p>
                </div>

                <button onClick={async () => {
                  if (!confirm("ATTENTION: Supprimer TOUTES les donnees demo ? Cette action est IRREVERSIBLE.")) return;
                  if (!confirm("Derniere chance. Confirmer la purge de TOUTES les donnees ?")) return;
                  setPurging(true);
                  try {
                    const tables = ["agence_codes", "agence_clients", "agence_messages", "agence_posts", "agence_wall_posts", "agence_uploads"];
                    for (const table of tables) {
                      try {
                        await fetch(`/api/purge`, {
                          method: "POST",
                          headers: authHeaders(),
                          body: JSON.stringify({ table, model: modelSlug }),
                        });
                      } catch {}
                    }
                    alert("Donnees demo supprimees. Mode Pro active !");
                    window.location.reload();
                  } catch { alert("Erreur"); }
                  setPurging(false);
                }} disabled={purging}
                  className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  style={{ background: "#DC2626", color: "#fff" }}>
                  {purging ? "Purge en cours..." : "Activer Mode Pro — Supprimer les donnees demo"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </OsLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Users, Key, Shield, ShieldCheck, Power, Edit3, Trash2, Eye, EyeOff,
  Copy, Check, RefreshCw, Save, X, Plus, UserPlus, Zap,
} from "lucide-react";
import { toModelId } from "@/lib/model-utils";

interface Account {
  id: string;
  code: string;
  role: "root" | "model";
  model_slug: string | null;
  display_name: string;
  active: boolean;
  created_at: string;
  last_login: string | null;
  modules?: { agent_dm?: boolean; finance?: boolean; ops?: boolean };
  scopes?: string[];
}

interface Props {
  isRoot: boolean;
  isAgencyAdmin: boolean;
  currentModelSlug: string;
  authHeaders: () => HeadersInit;
}

const MODULES = [
  { key: "agent_dm" as const, label: "Agent DM", color: "#A882FF" },
  { key: "finance" as const, label: "Finance", color: "#10B981" },
  { key: "ops" as const, label: "Ops", color: "#F59E0B" },
];

/**
 * Tab Comptes — fusion Brief B2 : Comptes + Codes modèles + Modules actifs.
 * Admin only (root + yumi) peut reset code / toggle active / assign modules.
 * Les modèles voient uniquement leur propre compte (scope own only).
 */
export function ComptesPanel({ isRoot, isAgencyAdmin, currentModelSlug, authHeaders }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: "", role: "model", model_slug: "", display_name: "" });
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [savingModules, setSavingModules] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const url = isRoot ? "/api/accounts" : `/api/accounts?model=${toModelId(currentModelSlug) || ""}`;
      const r = await fetch(url, { headers: authHeaders() });
      const d = await r.json();
      if (d.accounts) {
        // Normalize modules — may come from scopes or extra field
        const normalized = (d.accounts as Account[]).map((a) => ({
          ...a,
          modules: a.modules ?? {
            agent_dm: a.scopes?.includes("agent_dm") ?? a.role === "root",
            finance: a.scopes?.includes("finance") ?? a.role === "root",
            ops: a.scopes?.includes("ops") ?? a.role === "root",
          },
        }));
        setAccounts(normalized);
      }
    } catch {
      setToast({ kind: "err", msg: "Impossible de charger les comptes" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAccounts(); }, [isRoot, currentModelSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleToggleActive = async (account: Account) => {
    await fetch("/api/accounts", {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, active: !account.active }),
    });
    fetchAccounts();
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await fetch("/api/accounts", {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ id, display_name: editName.trim() }),
    });
    setEditing(null);
    fetchAccounts();
  };

  const handleResetCode = async (account: Account) => {
    if (!confirm(`Régénérer le code de connexion de "${account.display_name}" ?`)) return;
    const prefix = account.display_name.toUpperCase().replace(/\s+/g, "").slice(0, 4);
    const num = Math.floor(1000 + Math.random() * 9000);
    const newCode = `${prefix}-${num}`.toLowerCase();
    const r = await fetch("/api/accounts", {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, code: newCode }),
    });
    if (r.ok) {
      setToast({ kind: "ok", msg: `Nouveau code: ${newCode}` });
      fetchAccounts();
    } else {
      setToast({ kind: "err", msg: "Erreur de reset" });
    }
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleModule = async (account: Account, moduleKey: "agent_dm" | "finance" | "ops") => {
    setSavingModules(account.id);
    const nextModules = {
      ...(account.modules ?? {}),
      [moduleKey]: !(account.modules?.[moduleKey] ?? false),
    };
    try {
      const r = await fetch("/api/accounts", {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id, modules: nextModules }),
      });
      if (r.ok) {
        // Optimistic update
        setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, modules: nextModules } : a));
        setToast({ kind: "ok", msg: "Module mis à jour" });
      } else {
        setToast({ kind: "err", msg: "API modules pas encore connectée" });
        // Optimistic local update anyway
        setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, modules: nextModules } : a));
      }
    } catch {
      setToast({ kind: "err", msg: "Erreur réseau" });
    } finally {
      setSavingModules(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleCreate = async () => {
    if (!newAccount.code || !newAccount.display_name) return;
    const r = await fetch("/api/accounts", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(newAccount),
    });
    if (r.ok) {
      setNewAccount({ code: "", role: "model", model_slug: "", display_name: "" });
      setShowAdd(false);
      fetchAccounts();
    } else {
      const err = await r.json().catch(() => ({}));
      setToast({ kind: "err", msg: err.error || "Erreur de création" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDelete = async (account: Account) => {
    if (!confirm(`Supprimer le compte "${account.display_name}" ?`)) return;
    const r = await fetch(`/api/accounts?id=${account.id}`, { method: "DELETE", headers: authHeaders() });
    if (r.ok) fetchAccounts();
    else {
      const err = await r.json().catch(() => ({}));
      setToast({ kind: "err", msg: err.error || "Erreur de suppression" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="card-premium p-6 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <RefreshCw className="w-4 h-4 animate-spin" /> Chargement des comptes…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className="text-xs px-3 py-2 rounded flex items-center gap-2"
          style={{
            background: toast.kind === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            color: toast.kind === "ok" ? "#10B981" : "#EF4444",
          }}
        >
          {toast.kind === "ok" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Info fusion B2 */}
      <div
        className="rounded-xl p-3 text-[11px] flex items-start gap-2"
        style={{ background: "rgba(168,130,255,0.08)", border: "1px solid rgba(168,130,255,0.2)", color: "var(--text-muted)" }}
      >
        <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#A882FF" }} />
        <p>
          Gestion unifiée des comptes root/yumi/paloma/ruby : code de connexion, scope, modules actifs (Agent DM, Finance, Ops).
          {isAgencyAdmin ? " Actions admin : reset code, toggle active, assign modules." : " Vous voyez uniquement votre compte."}
        </p>
      </div>

      {/* Add account (root only) */}
      {isRoot && (
        <>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
            style={{ background: "rgba(232,67,147,0.1)", color: "#E84393", border: "1px solid rgba(232,67,147,0.2)" }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showAdd ? "Annuler" : "Nouveau compte"}
          </button>

          {showAdd && (
            <div className="card-premium p-5 animate-slide-down">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Nouveau compte</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={newAccount.display_name}
                  onChange={(e) => setNewAccount({ ...newAccount, display_name: e.target.value })}
                  placeholder="Nom affiché"
                  className="px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                />
                <input
                  value={newAccount.code}
                  onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                  placeholder="Code de connexion"
                  className="px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                />
                <input
                  value={newAccount.model_slug}
                  onChange={(e) => setNewAccount({ ...newAccount, model_slug: e.target.value })}
                  placeholder="Slug modèle (ex: ruby)"
                  className="px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                />
                <select
                  value={newAccount.role}
                  onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
                  className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                  style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                >
                  <option value="model">Model</option>
                  <option value="root">Root Admin</option>
                </select>
              </div>
              <button
                onClick={handleCreate}
                className="mt-4 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer btn-gradient flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Créer le compte
              </button>
            </div>
          )}
        </>
      )}

      {/* Accounts list */}
      <div className="card-premium overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border2)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Comptes ({accounts.length})
          </h2>
          <button
            onClick={fetchAccounts}
            className="p-1.5 rounded-lg cursor-pointer hover:scale-105"
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
          >
            <RefreshCw className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>Aucun compte</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border2)" }}>
            {accounts.map((account) => (
              <div key={account.id} className="px-4 py-4">
                {/* Ligne principale */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: account.role === "root" ? "rgba(232,67,147,0.15)" : "rgba(168,130,255,0.15)",
                        color: account.role === "root" ? "#E84393" : "#A882FF",
                      }}
                    >
                      {account.role === "root" ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      {editing === account.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRename(account.id)}
                            autoFocus
                            className="text-sm font-medium px-2 py-0.5 rounded outline-none"
                            style={{ color: "var(--text)", background: "var(--bg)", border: "1px solid var(--border)" }}
                          />
                          <button
                            onClick={() => handleRename(account.id)}
                            className="text-[11px] font-bold cursor-pointer"
                            style={{ color: "var(--success)", background: "none", border: "none" }}
                          >OK</button>
                          <button
                            onClick={() => setEditing(null)}
                            className="text-[11px] cursor-pointer"
                            style={{ color: "var(--text-muted)", background: "none", border: "none" }}
                          >✕</button>
                        </div>
                      ) : (
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                          {account.display_name}
                        </p>
                      )}
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {account.role}{account.model_slug && ` · ${account.model_slug}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: account.active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                        color: account.active ? "#10B981" : "#EF4444",
                      }}
                    >
                      {account.active ? "ACTIF" : "DÉSACTIVÉ"}
                    </span>
                    {isAgencyAdmin && (
                      <>
                        <button
                          onClick={() => { setEditing(account.id); setEditName(account.display_name); }}
                          className="p-1 rounded cursor-pointer hover:scale-110"
                          style={{ background: "none", border: "none", color: "var(--text-muted)" }}
                          title="Renommer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(account)}
                          className="p-1 rounded cursor-pointer hover:scale-110"
                          style={{ background: "none", border: "none", color: "var(--text-muted)" }}
                          title={account.active ? "Désactiver" : "Activer"}
                        >
                          <Power className="w-3 h-3" />
                        </button>
                        {isRoot && (
                          <button
                            onClick={() => handleDelete(account)}
                            className="p-1 rounded cursor-pointer hover:scale-110"
                            style={{ background: "none", border: "none", color: "#EF4444" }}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Code de connexion */}
                <div
                  className="rounded-lg p-3 mb-3 flex items-center justify-between gap-2"
                  style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Key className="w-3.5 h-3.5 shrink-0" style={{ color: "#C9A84C" }} />
                    <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: "var(--text-muted)" }}>
                      Code
                    </span>
                    <code
                      className="px-2 py-0.5 rounded font-mono text-[11px] truncate"
                      style={{ background: "rgba(201,168,76,0.08)", color: "#E6C974" }}
                    >
                      {revealed.has(account.id) ? account.code : "••••••••"}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAgencyAdmin && (
                      <button
                        onClick={() => toggleReveal(account.id)}
                        className="p-1.5 rounded-md cursor-pointer hover:scale-110"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", color: "var(--text-muted)" }}
                        title={revealed.has(account.id) ? "Masquer" : "Afficher"}
                      >
                        {revealed.has(account.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                    {revealed.has(account.id) && (
                      <button
                        onClick={() => copyCode(account.id, account.code)}
                        className="p-1.5 rounded-md cursor-pointer hover:scale-110"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", color: "var(--text-muted)" }}
                        title="Copier"
                      >
                        {copied === account.id ? <Check className="w-3 h-3" style={{ color: "#10B981" }} /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                    {isAgencyAdmin && (
                      <button
                        onClick={() => handleResetCode(account)}
                        className="p-1.5 rounded-md cursor-pointer hover:scale-110"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", color: "var(--text-muted)" }}
                        title="Régénérer le code"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scopes info */}
                {account.scopes && account.scopes.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Scopes:
                    </span>
                    {account.scopes.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}
                      >
                        {s}
                      </span>
                    ))}
                    {account.scopes.length > 4 && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        +{account.scopes.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Modules actifs */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Modules actifs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MODULES.map((m) => {
                      const active = account.modules?.[m.key] ?? false;
                      const canEdit = isAgencyAdmin;
                      return (
                        <label
                          key={m.key}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                          style={{
                            background: active ? `${m.color}15` : "var(--bg3)",
                            border: `1px solid ${active ? `${m.color}40` : "var(--border2)"}`,
                            color: active ? m.color : "var(--text-muted)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            disabled={!canEdit || savingModules === account.id}
                            onChange={() => handleToggleModule(account, m.key)}
                            className="cursor-pointer"
                            style={{ accentColor: m.color }}
                          />
                          <span className="font-medium">{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

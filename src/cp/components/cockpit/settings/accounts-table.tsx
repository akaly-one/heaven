"use client";

// ══════════════════════════════════════════════════════════════════════════
//  AccountsTable — liste comptes agence + drawer detail (Agent 10.A Phase 10)
//
//  Affiche en tableau responsive les comptes actifs :
//  | Code masque | Display name | Role | Model ID | Active | Modules X/5 | Actions |
//
//  Actions admin :
//    - Afficher/Masquer code (EyeOff/Eye)
//    - Reset code (modal de confirmation)
//    - Click ligne → drawer detail + toggle modules
//
//  Scope :
//    - Admin (root/yumi) : tous comptes
//    - Model (paloma/ruby) : uniquement son propre compte
// ══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import {
  Eye, EyeOff, RefreshCw, Check, X, AlertCircle, ShieldCheck, Shield,
  Copy, Loader2, ChevronRight, Key, Power,
} from "lucide-react";
import {
  AccountModulesToggle,
  type ActivableModules,
  type ModuleKey,
} from "./account-modules-toggle";

interface Account {
  id: string;
  code: string | null; // null = masque (non-admin ou ?with_code=false)
  role: "root" | "model";
  model_id: string | null;
  model_slug: string | null;
  display_name: string;
  active: boolean;
  scopes: string[] | null;
  activable_modules: ActivableModules;
  created_at?: string;
  last_login?: string | null;
  login_aliases?: string[] | null;
}

interface Props {
  isAgencyAdmin: boolean;
  authHeaders: () => HeadersInit;
  onToast: (toast: { kind: "ok" | "err"; msg: string }) => void;
}

const MODULE_KEYS: ModuleKey[] = ["agent_dm", "finance", "ops", "strategie", "dmca"];

export function AccountsTable({ isAgencyAdmin, authHeaders, onToast }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealedCodes, setRevealedCodes] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [resetTarget, setResetTarget] = useState<Account | null>(null);
  const [newCodeReveal, setNewCodeReveal] = useState<{ display_name: string; code: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/agence/accounts", { headers: authHeaders() });
      const d = await r.json();
      if (Array.isArray(d.accounts)) {
        setAccounts(d.accounts);
      } else {
        setAccounts([]);
        if (d.error) onToast({ kind: "err", msg: d.error });
      }
    } catch {
      onToast({ kind: "err", msg: "Impossible de charger les comptes" });
    } finally {
      setLoading(false);
    }
  }, [authHeaders, onToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const countEnabledModules = (mods: ActivableModules): number => {
    return MODULE_KEYS.reduce((n, k) => n + (mods?.[k]?.enabled ? 1 : 0), 0);
  };

  const revealCode = async (account: Account) => {
    if (!isAgencyAdmin) return;
    if (revealedIds.has(account.id)) {
      // Already revealed → hide
      setRevealedIds((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
      return;
    }
    // Fetch with_code=true (admin only)
    try {
      const r = await fetch("/api/agence/accounts?with_code=true", { headers: authHeaders() });
      const d = await r.json();
      if (Array.isArray(d.accounts)) {
        const found = d.accounts.find((a: Account) => a.id === account.id);
        if (found?.code) {
          setRevealedCodes((prev) => ({ ...prev, [account.id]: found.code! }));
          setRevealedIds((prev) => {
            const next = new Set(prev);
            next.add(account.id);
            return next;
          });
        } else {
          onToast({ kind: "err", msg: "Code non disponible" });
        }
      }
    } catch {
      onToast({ kind: "err", msg: "Erreur lors de l'affichage du code" });
    }
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const confirmReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const r = await fetch(`/api/agence/accounts/${resetTarget.code ?? revealedCodes[resetTarget.id] ?? ""}/reset-code`, {
        method: "POST",
        headers: { ...(authHeaders() as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ length: 8 }),
      });
      const d = await r.json();
      if (!r.ok || !d.new_code) {
        onToast({ kind: "err", msg: d.error || "Impossible de regenerer le code" });
        return;
      }
      setNewCodeReveal({ display_name: d.display_name || resetTarget.display_name, code: d.new_code });
      setResetTarget(null);
      // Reset revealed state (old code plus valid)
      setRevealedIds(new Set());
      setRevealedCodes({});
      await fetchAccounts();
    } catch {
      onToast({ kind: "err", msg: "Erreur réseau" });
    } finally {
      setResetting(false);
    }
  };

  const startReset = (account: Account) => {
    // On a besoin du code courant pour l'URL
    if (!account.code && !revealedCodes[account.id]) {
      // Fetch avec with_code pour recuperer
      fetch("/api/agence/accounts?with_code=true", { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => {
          const found = d.accounts?.find((a: Account) => a.id === account.id);
          if (found?.code) {
            setRevealedCodes((prev) => ({ ...prev, [account.id]: found.code! }));
            setResetTarget({ ...account, code: found.code });
          } else {
            onToast({ kind: "err", msg: "Code introuvable" });
          }
        })
        .catch(() => onToast({ kind: "err", msg: "Erreur chargement" }));
    } else {
      setResetTarget({ ...account, code: account.code ?? revealedCodes[account.id] });
    }
  };

  const handleModulesToggled = (accountId: string, nextMods: ActivableModules) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, activable_modules: nextMods } : a)),
    );
    if (selected?.id === accountId) {
      setSelected((s) => (s ? { ...s, activable_modules: nextMods } : s));
    }
    onToast({ kind: "ok", msg: "Module mis à jour" });
  };

  if (loading) {
    return (
      <div className="card-premium p-6 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <RefreshCw className="w-4 h-4 animate-spin" /> Chargement des comptes…
      </div>
    );
  }

  return (
    <>
      {/* Table container */}
      <div className="card-premium overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border2)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Comptes actifs ({accounts.length})
          </h2>
          <button
            onClick={fetchAccounts}
            className="p-1.5 rounded-lg cursor-pointer hover:scale-105"
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
            title="Rafraichir"
          >
            <RefreshCw className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Aucun compte visible
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border2)" }}>
            {accounts.map((account) => {
              const enabledCount = countEnabledModules(account.activable_modules || {});
              const isRoot = account.role === "root";
              const revealed = revealedIds.has(account.id);
              const displayCode = revealed ? revealedCodes[account.id] ?? "•••••••" : "••••••••";

              return (
                <div
                  key={account.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => setSelected(account)}
                >
                  {/* Avatar role */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: isRoot ? "rgba(232,67,147,0.15)" : "rgba(168,130,255,0.15)",
                      color: isRoot ? "#E84393" : "#A882FF",
                    }}
                  >
                    {isRoot ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>

                  {/* Name + role */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                      {account.display_name}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {account.role}
                      {account.model_id && ` · ${account.model_id}`}
                      {account.model_slug && ` · ${account.model_slug}`}
                    </p>
                  </div>

                  {/* Code masque + reveal */}
                  <div
                    className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md"
                    style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Key className="w-3 h-3" style={{ color: "#C9A84C" }} />
                    <code className="font-mono text-[11px]" style={{ color: "#E6C974" }}>
                      {displayCode}
                    </code>
                    {isAgencyAdmin && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); revealCode(account); }}
                          className="p-0.5 rounded cursor-pointer hover:scale-110"
                          style={{ background: "none", border: "none", color: "var(--text-muted)" }}
                          title={revealed ? "Masquer" : "Afficher"}
                        >
                          {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        {revealed && revealedCodes[account.id] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); copyCode(account.id, revealedCodes[account.id]); }}
                            className="p-0.5 rounded cursor-pointer hover:scale-110"
                            style={{ background: "none", border: "none", color: "var(--text-muted)" }}
                            title="Copier"
                          >
                            {copied === account.id ? <Check className="w-3 h-3" style={{ color: "#10B981" }} /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Modules count */}
                  <div
                    className="hidden sm:flex flex-col items-center px-2 shrink-0"
                    style={{ minWidth: 60 }}
                  >
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Modules
                    </p>
                    <p className="text-xs font-bold" style={{ color: enabledCount > 0 ? "#10B981" : "var(--text-muted)" }}>
                      {enabledCount}/5
                    </p>
                  </div>

                  {/* Active badge */}
                  <span
                    className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                    style={{
                      background: account.active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      color: account.active ? "#10B981" : "#EF4444",
                    }}
                  >
                    {account.active ? "ACTIF" : "OFF"}
                  </span>

                  {/* Reset button + chevron */}
                  {isAgencyAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startReset(account); }}
                      className="p-1.5 rounded cursor-pointer hover:scale-110"
                      style={{ background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--text-muted)" }}
                      title="Regenerer le code"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer detail */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up"
            style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Compte</p>
                <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>{selected.display_name}</h3>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {selected.role}{selected.model_id ? ` · ${selected.model_id}` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded cursor-pointer hover:scale-110"
                style={{ background: "none", border: "none", color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scopes */}
            {selected.scopes && selected.scopes.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  Scopes
                </p>
                <div className="flex flex-wrap gap-1">
                  {selected.scopes.slice(0, 6).map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}
                    >
                      {s}
                    </span>
                  ))}
                  {selected.scopes.length > 6 && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      +{selected.scopes.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Modules toggle */}
            <AccountModulesToggle
              accountCode={selected.code ?? revealedCodes[selected.id] ?? ""}
              accountDisplayName={selected.display_name}
              modules={selected.activable_modules || {}}
              canEdit={isAgencyAdmin}
              authHeaders={authHeaders}
              onToggled={(next) => handleModulesToggled(selected.id, next)}
              onError={(msg) => onToast({ kind: "err", msg })}
            />

            {/* Fallback si pas de code connu (model non-admin) */}
            {!(selected.code ?? revealedCodes[selected.id]) && isAgencyAdmin && (
              <div
                className="rounded-lg p-2.5 flex items-start gap-2 text-[11px]"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>Afficher le code une fois (icone oeil) pour autoriser les toggles modules.</p>
              </div>
            )}

            {isAgencyAdmin && (
              <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--border2)" }}>
                <button
                  onClick={() => startReset(selected)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: "rgba(232,67,147,0.1)", color: "#E84393", border: "1px solid rgba(232,67,147,0.2)" }}
                >
                  <RefreshCw className="w-3 h-3" /> Reset code
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm reset modal */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => !resetting && setResetTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-3"
            style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" style={{ color: "#F59E0B" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Régénérer le code ?</h3>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Le code actuel de <span className="font-semibold" style={{ color: "var(--text)" }}>{resetTarget.display_name}</span> sera immediatement invalide.
              Le nouveau code ne sera affiche qu&apos;une seule fois.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setResetTarget(null)}
                disabled={resetting}
                className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
              >
                Annuler
              </button>
              <button
                onClick={confirmReset}
                disabled={resetting}
                className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "#E84393", color: "white", border: "none" }}
              >
                {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                Régénérer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New code reveal (one-shot) */}
      {newCodeReveal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg2)", border: "1px solid #10B981" }}
          >
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" style={{ color: "#10B981" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Nouveau code généré</h3>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Code de <span className="font-semibold" style={{ color: "var(--text)" }}>{newCodeReveal.display_name}</span> :
            </p>
            <div
              className="p-4 rounded-xl text-center"
              style={{ background: "rgba(16,185,129,0.1)", border: "2px solid #10B981" }}
            >
              <code className="font-mono text-lg font-bold" style={{ color: "#10B981" }}>
                {newCodeReveal.code}
              </code>
            </div>
            <div
              className="rounded-lg p-2.5 flex items-start gap-2 text-[11px]"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p>Ce code ne sera plus affiche. Note-le ou copie-le maintenant.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newCodeReveal.code).catch(() => {});
                  onToast({ kind: "ok", msg: "Code copié" });
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "#10B981", color: "white", border: "none" }}
              >
                <Copy className="w-3 h-3" /> Copier
              </button>
              <button
                onClick={() => setNewCodeReveal(null)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

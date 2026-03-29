"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search, Copy, Check, MoreHorizontal, Pause, Play, Ban, Trash2,
  Clock, ChevronDown, ChevronRight, User, MessageSquare, Shield,
  ShieldOff, Send, StickyNote, ExternalLink, Link2, Plus,
  Package, CalendarPlus, Wallet, Crown
} from "lucide-react";

import type { AccessCode, ClientInfo, WiseLink } from "@/types/heaven";
import { TIER_COLORS } from "@/constants/tiers";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface CodesListProps {
  codes: AccessCode[];
  clients?: ClientInfo[];
  modelSlug: string;
  onCopy: (code: string) => void;
  onRevoke: (code: string) => void;
  onPause: (code: string) => void;
  onReactivate: (code: string) => void;
  onDelete: (code: string) => void;
  onUpdateClient?: (id: string, updates: Record<string, unknown>) => void;
  onSendMessage?: (clientId: string, content: string) => void;
  onGenerateForClient?: (clientName: string) => void;
  onExtendCode?: (code: string, extraHours: number) => void;
  wiseLinks?: WiseLink[];
}

const STATUS_FILTERS = [
  { id: "all", label: "Tous" },
  { id: "active", label: "Actifs" },
  { id: "expired", label: "Expires" },
  { id: "revoked", label: "Revoques" },
];

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expire";
  const h = Math.floor(diff / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)}j`;
  return `${h}h`;
}

function getAccessLink(modelSlug: string, code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://heaven-os.vercel.app";
  return `${base}/m/${modelSlug}?access=${encodeURIComponent(code)}`;
}

function getDeliveryMessage(modelSlug: string, code: string, displayName?: string): string {
  const link = getAccessLink(modelSlug, code);
  return `Hey! Voici ton code d'acces ${displayName || modelSlug.toUpperCase()} : ${code}\n\nAccede au profil ici : ${link}`;
}

interface ClientGroup {
  name: string;
  codes: AccessCode[];
  activeCodes: number;
  expiredCodes: number;
  tiers: string[];
  clientInfo?: ClientInfo;
}

const EXTEND_OPTIONS = [
  { label: "+7j", hours: 168 },
  { label: "+30j", hours: 720 },
  { label: "+90j", hours: 2160 },
];

export function CodesList({
  codes, clients = [], modelSlug, onCopy, onRevoke, onPause, onReactivate, onDelete,
  onUpdateClient, onSendMessage, onGenerateForClient, onExtendCode, wiseLinks = []
}: CodesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "revoke" | "delete"; code: string } | null>(null);

  const handleCopy = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id || text);
    setTimeout(() => setCopied(null), 2000);
  };

  const clientMap = useMemo(() => {
    const map = new Map<string, ClientInfo>();
    for (const c of clients) {
      if (c.pseudo_snap) map.set(c.pseudo_snap.toLowerCase(), c);
      if (c.pseudo_insta) map.set(c.pseudo_insta.toLowerCase(), c);
    }
    return map;
  }, [clients]);

  const filtered = codes.filter(c => {
    if (statusFilter === "active" && (!c.active || c.revoked || isExpired(c.expiresAt))) return false;
    if (statusFilter === "expired" && (!isExpired(c.expiresAt) || c.revoked)) return false;
    if (statusFilter === "revoked" && !c.revoked) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.code.toLowerCase().includes(q) || c.client.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  const groups = useMemo(() => {
    const map = new Map<string, AccessCode[]>();
    for (const c of filtered) {
      const key = (c.client || "").toLowerCase().trim() || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    const result: ClientGroup[] = [];
    for (const [name, clientCodes] of map) {
      const active = clientCodes.filter(c => c.active && !c.revoked && !isExpired(c.expiresAt));
      const expired = clientCodes.filter(c => isExpired(c.expiresAt) && !c.revoked);
      result.push({
        name,
        codes: clientCodes,
        activeCodes: active.length,
        expiredCodes: expired.length,
        tiers: [...new Set(clientCodes.map(c => c.tier))],
        clientInfo: clientMap.get(name),
      });
    }
    result.sort((a, b) => {
      if (a.activeCodes > 0 && b.activeCodes === 0) return -1;
      if (b.activeCodes > 0 && a.activeCodes === 0) return 1;
      return b.codes.length - a.codes.length;
    });
    return result;
  }, [filtered, clientMap]);

  const getStatus = (c: AccessCode) => {
    if (c.revoked) return { label: "Revoque", color: "var(--danger)", bg: "rgba(244,63,94,0.1)" };
    if (isExpired(c.expiresAt)) return { label: "Expire", color: "var(--text-muted)", bg: "rgba(255,255,255,0.04)" };
    if (!c.active) return { label: "Pause", color: "#B45309", bg: "rgba(245,158,11,0.1)" };
    return { label: "Actif", color: "var(--success)", bg: "rgba(16,185,129,0.1)" };
  };

  const handleSaveNotes = useCallback((clientId: string) => {
    if (onUpdateClient) onUpdateClient(clientId, { notes: notesText });
    setEditingNotes(null);
  }, [onUpdateClient, notesText]);

  const handleSendMsg = useCallback((clientId: string) => {
    if (onSendMessage && messageText.trim()) {
      onSendMessage(clientId, messageText.trim());
      setMessageText("");
      setSendingMessage(null);
    }
  }, [onSendMessage, messageText]);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client ou code..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs outline-none"
              style={{ color: "var(--text)", background: "var(--bg)", border: "1px solid var(--border)" }}
            />
          </div>
          {search.trim() && onGenerateForClient && (
            <button
              onClick={() => onGenerateForClient(search.trim())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-transform whitespace-nowrap shrink-0"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <Plus className="w-3.5 h-3.5" /> Generer
            </button>
          )}
        </div>
        {/* Filters — separate row */}
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-all shrink-0"
              style={{
                background: statusFilter === f.id ? "var(--accent)" : "rgba(0,0,0,0.03)",
                color: statusFilter === f.id ? "#fff" : "var(--text-muted)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client groups */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {search.trim() ? `Aucun client "${search}" trouve` : "Aucun code trouve"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(group => {
            const ci = group.clientInfo;
            const isExpanded = expanded === group.name;
            const highestTier = group.tiers.includes("platinum") ? "platinum"
              : group.tiers.includes("diamond") ? "diamond"
              : group.tiers.includes("gold") ? "gold" : "vip";

            return (
              <div key={group.name} className="rounded-xl overflow-hidden" style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}>
                {/* Client row — compact */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : group.name)}
                  className="w-full px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors hover:brightness-110"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: ci?.is_blocked ? "rgba(244,63,94,0.12)" : `${TIER_COLORS[highestTier]}15` }}>
                    <User className="w-3.5 h-3.5" style={{ color: ci?.is_blocked ? "var(--danger)" : TIER_COLORS[highestTier] }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                        {ci?.firstname || (group.name === "—" ? "Sans client" : group.name)}
                      </span>
                      {ci?.is_verified && <Shield className="w-3 h-3 shrink-0" style={{ color: "var(--success)" }} />}
                      {ci?.is_blocked && <ShieldOff className="w-3 h-3 shrink-0" style={{ color: "var(--danger)" }} />}
                      {ci?.tag && (
                        <span className="text-[10px] px-1 py-0.5 rounded-full shrink-0" style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA" }}>
                          {ci.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {ci?.pseudo_snap && (
                        <span className="text-[10px]" style={{ color: "#997A00" }}>@{ci.pseudo_snap}</span>
                      )}
                      {ci?.pseudo_insta && (
                        <span className="text-[10px]" style={{ color: "#E1306C" }}>@{ci.pseudo_insta}</span>
                      )}
                      {!ci?.pseudo_snap && !ci?.pseudo_insta && group.name !== "—" && (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>@{group.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Right side badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Tier dots */}
                    {group.tiers.map(t => (
                      <span key={t} className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[t] || "var(--text-muted)" }} />
                    ))}
                    {/* Active/expired count */}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium tabular-nums"
                      style={{ background: group.activeCodes > 0 ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)", color: group.activeCodes > 0 ? "var(--success)" : "var(--text-muted)" }}>
                      {group.activeCodes}A{group.expiredCodes > 0 ? `/${group.expiredCodes}E` : ""}
                    </span>
                    {/* Spent */}
                    {ci?.total_spent ? (
                      <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--success)" }}>{ci.total_spent}€</span>
                    ) : null}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <>
                    {/* Client detail strip */}
                    {ci && (
                      <div className="px-3 py-2 flex flex-wrap items-center gap-1.5" style={{ background: "rgba(255,255,255,0.01)", borderTop: "1px solid var(--border2)" }}>
                        <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: "var(--text-muted)" }}>
                          <span>Tokens: <b style={{ color: "var(--text)" }}>{ci.total_tokens_bought || 0}</b> achet. / <b style={{ color: "var(--text)" }}>{ci.total_tokens_spent || 0}</b> dep.</span>
                          <span>Tier: <b className="uppercase" style={{ color: TIER_COLORS[ci.tier || ""] || "var(--text)" }}>{ci.tier || "—"}</b></span>
                          {ci.last_active && <span>Vu: {new Date(ci.last_active).toLocaleDateString("fr-FR")}</span>}
                          {ci.preferences && <span style={{ color: "var(--accent)" }}>{ci.preferences}</span>}
                        </div>
                        <div className="flex-1" />
                        {/* Client actions */}
                        <div className="flex items-center gap-1">
                          {onSendMessage && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSendingMessage(sendingMessage === ci.id ? null : ci.id); }}
                              className="p-1.5 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                              style={{ background: "rgba(230,51,41,0.08)" }}
                              title="Message">
                              <MessageSquare className="w-3 h-3" style={{ color: "var(--accent)" }} />
                            </button>
                          )}
                          {onUpdateClient && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); onUpdateClient(ci.id, { is_verified: !ci.is_verified }); }}
                                className="p-1.5 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                                style={{ background: ci.is_verified ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)" }}
                                title={ci.is_verified ? "Retirer verification" : "Verifier"}>
                                <Shield className="w-3 h-3" style={{ color: ci.is_verified ? "var(--success)" : "var(--text-muted)" }} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onUpdateClient(ci.id, { is_blocked: !ci.is_blocked }); }}
                                className="p-1.5 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                                style={{ background: ci.is_blocked ? "rgba(244,63,94,0.08)" : "rgba(255,255,255,0.04)" }}
                                title={ci.is_blocked ? "Debloquer" : "Bloquer"}>
                                <ShieldOff className="w-3 h-3" style={{ color: ci.is_blocked ? "var(--danger)" : "var(--text-muted)" }} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {ci && (
                      <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderTop: "1px solid var(--border2)" }}>
                        <StickyNote className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} />
                        {editingNotes === ci.id ? (
                          <div className="flex-1 flex gap-1">
                            <input value={notesText} onChange={e => setNotesText(e.target.value)}
                              className="flex-1 text-[10px] px-2 py-1 rounded outline-none"
                              style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                              onKeyDown={e => { if (e.key === "Enter") handleSaveNotes(ci.id); }}
                              autoFocus />
                            <button onClick={() => handleSaveNotes(ci.id)} className="text-[10px] px-2 py-1 rounded cursor-pointer"
                              style={{ background: "var(--accent)", color: "#fff" }}>OK</button>
                          </div>
                        ) : (
                          <span className="text-[10px] cursor-pointer flex-1" style={{ color: ci.notes ? "var(--text-secondary)" : "var(--text-muted)" }}
                            onClick={() => { setEditingNotes(ci.id); setNotesText(ci.notes || ""); }}>
                            {ci.notes || "Ajouter une note..."}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Inline message */}
                    {sendingMessage === ci?.id && (
                      <div className="px-3 py-2 flex gap-2" style={{ borderTop: "1px solid var(--border2)" }}>
                        <input
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          placeholder="Message au client..."
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg outline-none"
                          style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                          onKeyDown={e => { if (e.key === "Enter" && ci?.id) handleSendMsg(ci.id); }}
                        />
                        <button
                          onClick={() => ci?.id && handleSendMsg(ci.id)}
                          disabled={!messageText.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-30"
                          style={{ background: "var(--accent)", color: "#fff" }}>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Active Subscriptions */}
                    {(() => {
                      const activeSubs = group.codes.filter(c => c.active && !c.revoked && !isExpired(c.expiresAt));
                      if (activeSubs.length === 0) return null;
                      return (
                        <div className="px-3 py-2.5" style={{ borderTop: "1px solid var(--border2)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                              Abonnements actifs ({activeSubs.length})
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {activeSubs.map(sub => {
                              const tierColor = TIER_COLORS[sub.tier] || "var(--text-muted)";
                              return (
                                <div key={sub.code} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                                  <Crown className="w-3 h-3 shrink-0" style={{ color: tierColor }} />
                                  <span className="text-[10px] font-bold uppercase" style={{ color: tierColor }}>{sub.tier}</span>
                                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>·</span>
                                  <span className="text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                                    Expire {new Date(sub.expiresAt).toLocaleDateString("fr-FR")} ({timeLeft(sub.expiresAt)})
                                  </span>
                                  <div className="flex-1" />
                                  {onExtendCode && (
                                    <div className="flex gap-1">
                                      {EXTEND_OPTIONS.map(opt => (
                                        <button key={opt.hours} onClick={() => onExtendCode(sub.code, opt.hours)}
                                          className="px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:scale-105 transition-transform"
                                          style={{ background: "rgba(16,185,129,0.08)", color: "var(--success)", border: "1px solid rgba(16,185,129,0.15)" }}>
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {/* Generate unified access code */}
                          {activeSubs.length > 0 && (
                            <div className="mt-2 p-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(230,51,41,0.04)", border: "1px solid rgba(230,51,41,0.1)" }}>
                              <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                              <span className="text-[10px] flex-1" style={{ color: "var(--text-secondary)" }}>
                                Code unifie: acces {activeSubs.map(s => s.tier.toUpperCase()).join(" + ")}
                              </span>
                              <button
                                onClick={() => {
                                  const primary = activeSubs.sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0];
                                  handleCopy(getAccessLink(modelSlug, primary.code), `unified-${group.name}`);
                                }}
                                className="px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer hover:scale-105 transition-transform flex items-center gap-1"
                                style={{ background: "var(--accent)", color: "#fff" }}>
                                {copied === `unified-${group.name}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                                Copier
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Wise Payment Links */}
                    {wiseLinks.length > 0 && (
                      <div className="px-3 py-2.5" style={{ borderTop: "1px solid var(--border2)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="w-3.5 h-3.5" style={{ color: "#9FE870" }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            Paiement Wise
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {wiseLinks.map(wl => {
                            const tierColor = TIER_COLORS[wl.tier] || "var(--text-muted)";
                            return (
                              <a key={wl.tier} href={wl.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer hover:scale-105 transition-transform no-underline"
                                style={{ background: "rgba(159,232,112,0.06)", color: "#9FE870", border: "1px solid rgba(159,232,112,0.15)" }}>
                                <span className="w-2 h-2 rounded-full" style={{ background: tierColor }} />
                                <span className="uppercase">{wl.tier}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Codes */}
                    <div style={{ borderTop: "1px solid var(--border2)" }}>
                      {group.codes.map(c => {
                        const status = getStatus(c);
                        const tierColor = TIER_COLORS[c.tier] || "var(--text-muted)";
                        const isDelivery = deliveryCode === c.code;
                        const snapHandle = ci?.pseudo_snap || (c.platform === "snapchat" ? c.client : null);
                        const instaHandle = ci?.pseudo_insta || (c.platform === "instagram" ? c.client : null);

                        return (
                          <div key={c.code} className="px-3 py-2" style={{ borderBottom: "1px solid var(--border2)" }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tierColor }} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[11px] font-medium" style={{ color: "var(--text)" }}>{c.code}</span>
                                    <button
                                      onClick={() => { onCopy(c.code); handleCopy(c.code, `code-${c.code}`); }}
                                      className="p-0.5 rounded cursor-pointer hover:opacity-80">
                                      {copied === `code-${c.code}` ? (
                                        <Check className="w-3 h-3" style={{ color: "var(--success)" }} />
                                      ) : (
                                        <Copy className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-semibold uppercase" style={{ color: tierColor }}>{c.tier}</span>
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.platform}</span>
                                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{c.type}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: status.bg, color: status.color }}>
                                  {status.label}
                                </span>
                                {!c.revoked && !isExpired(c.expiresAt) && (
                                  <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                                    <Clock className="w-2.5 h-2.5 inline mr-0.5" />{timeLeft(c.expiresAt)}
                                  </span>
                                )}

                                {/* Deliver code button */}
                                {c.active && !c.revoked && !isExpired(c.expiresAt) && (
                                  <button
                                    onClick={() => setDeliveryCode(isDelivery ? null : c.code)}
                                    className="p-1 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                                    style={{ background: isDelivery ? "rgba(230,51,41,0.15)" : "rgba(230,51,41,0.06)" }}
                                    title="Envoyer au client">
                                    <Link2 className="w-3 h-3" style={{ color: "var(--accent)" }} />
                                  </button>
                                )}

                                {/* Actions menu */}
                                <div className="relative">
                                  <button
                                    onClick={() => setMenuOpen(menuOpen === c.code ? null : c.code)}
                                    className="p-1 rounded-lg cursor-pointer hover:opacity-80"
                                    style={{ background: "rgba(255,255,255,0.04)" }}>
                                    <MoreHorizontal className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                                  </button>
                                  {menuOpen === c.code && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                                      <div className="fixed z-50 w-40 rounded-xl py-1 shadow-xl"
                                        style={{ background: "var(--surface)", border: "1px solid var(--border)", right: 16, marginTop: 4 }}>
                                        {/* Change tier */}
                                        {!c.revoked && (
                                          <div className="px-3 py-1.5">
                                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Pack</span>
                                            <div className="flex gap-1 mt-1">
                                              {["vip", "gold", "diamond", "platinum"].map(tier => (
                                                <button key={tier} onClick={async () => {
                                                  try {
                                                    await fetch(`/api/codes`, {
                                                      method: "PATCH",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ code: c.code, model: modelSlug, updates: { tier, pack: tier } }),
                                                    });
                                                    setMenuOpen(null);
                                                    window.location.reload();
                                                  } catch {}
                                                }}
                                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                                                  style={{
                                                    background: c.tier === tier ? "var(--accent)" : "rgba(0,0,0,0.04)",
                                                    color: c.tier === tier ? "#fff" : "var(--text-muted)",
                                                  }}>
                                                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <div style={{ borderTop: "1px solid var(--border)", margin: "2px 0" }} />
                                        {c.active && !c.revoked && (
                                          <button onClick={() => { onPause(c.code); setMenuOpen(null); }}
                                            className="w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 cursor-pointer hover:opacity-80"
                                            style={{ color: "#B45309" }}>
                                            <Pause className="w-3 h-3" /> Pause
                                          </button>
                                        )}
                                        {!c.active && !c.revoked && (
                                          <button onClick={() => { onReactivate(c.code); setMenuOpen(null); }}
                                            className="w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 cursor-pointer hover:opacity-80"
                                            style={{ color: "var(--success)" }}>
                                            <Play className="w-3 h-3" /> Reactiver
                                          </button>
                                        )}
                                        {!c.revoked && (
                                          <button onClick={() => { setConfirmAction({ type: "revoke", code: c.code }); setMenuOpen(null); }}
                                            className="w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 cursor-pointer hover:opacity-80"
                                            style={{ color: "var(--danger)" }}>
                                            <Ban className="w-3 h-3" /> Revoquer
                                          </button>
                                        )}
                                        <button onClick={() => { setConfirmAction({ type: "delete", code: c.code }); setMenuOpen(null); }}
                                          className="w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 cursor-pointer hover:opacity-80"
                                          style={{ color: "var(--danger)" }}>
                                          <Trash2 className="w-3 h-3" /> Supprimer
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Delivery panel */}
                            {isDelivery && (
                              <div className="mt-2 p-2.5 rounded-lg space-y-2" style={{ background: "rgba(230,51,41,0.04)", border: "1px solid rgba(230,51,41,0.12)" }}>
                                {/* Access link */}
                                <div className="flex items-center gap-2">
                                  <input
                                    readOnly
                                    value={getAccessLink(modelSlug, c.code)}
                                    className="flex-1 text-[10px] px-2 py-1.5 rounded-lg outline-none font-mono"
                                    style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                                  />
                                  <button
                                    onClick={() => handleCopy(getAccessLink(modelSlug, c.code), `link-${c.code}`)}
                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer hover:scale-105 transition-transform flex items-center gap-1"
                                    style={{ background: "var(--accent)", color: "#fff" }}>
                                    {copied === `link-${c.code}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    Lien
                                  </button>
                                </div>
                                {/* Copy full message */}
                                <button
                                  onClick={() => handleCopy(getDeliveryMessage(modelSlug, c.code), `msg-${c.code}`)}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer hover:scale-105 transition-transform flex items-center justify-center gap-1"
                                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", color: "var(--text-secondary)" }}>
                                  {copied === `msg-${c.code}` ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Copy className="w-3 h-3" />}
                                  Copier message complet
                                </button>
                                {/* Send to Snap / Insta */}
                                <div className="flex gap-2">
                                  {snapHandle && (
                                    <a
                                      href={`https://www.snapchat.com/add/${snapHandle}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer hover:scale-105 transition-transform flex items-center justify-center gap-1 no-underline"
                                      style={{ background: "rgba(153,122,0,0.08)", color: "#997A00", border: "1px solid rgba(153,122,0,0.2)" }}>
                                      <ExternalLink className="w-3 h-3" /> Snap @{snapHandle}
                                    </a>
                                  )}
                                  {instaHandle && (
                                    <a
                                      href={`https://www.instagram.com/${instaHandle}/`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer hover:scale-105 transition-transform flex items-center justify-center gap-1 no-underline"
                                      style={{ background: "rgba(225,48,108,0.08)", color: "#E1306C", border: "1px solid rgba(225,48,108,0.2)" }}>
                                      <ExternalLink className="w-3 h-3" /> Insta @{instaHandle}
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmAction}
        destructive
        title={confirmAction?.type === "delete" ? "Supprimer ce code ?" : "Revoquer ce code ?"}
        description={confirmAction?.type === "delete"
          ? `Le code ${confirmAction?.code} sera supprime definitivement.`
          : `Le code ${confirmAction?.code} sera desactive et le client perdra son acces.`}
        confirmLabel={confirmAction?.type === "delete" ? "Supprimer" : "Revoquer"}
        onConfirm={() => {
          if (confirmAction?.type === "delete") onDelete(confirmAction.code);
          else if (confirmAction?.type === "revoke") onRevoke(confirmAction.code);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

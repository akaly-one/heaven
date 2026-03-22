"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search, Copy, Check, MoreHorizontal, Pause, Play, Ban, Trash2,
  Clock, ChevronDown, ChevronRight, User, MessageSquare, Shield,
  ShieldOff, Tag, Send, StickyNote
} from "lucide-react";

interface AccessCode {
  code: string;
  model: string;
  client: string;
  platform: string;
  tier: string;
  type: string;
  duration: number;
  expiresAt: string;
  created: string;
  used: boolean;
  active: boolean;
  revoked: boolean;
}

interface ClientInfo {
  id: string;
  pseudo_snap?: string;
  pseudo_insta?: string;
  tier?: string;
  is_verified?: boolean;
  is_blocked?: boolean;
  notes?: string;
  tag?: string;
  preferences?: string;
  total_spent?: number;
  total_tokens_bought?: number;
  total_tokens_spent?: number;
  firstname?: string;
  last_active?: string;
}

interface CodesListProps {
  codes: AccessCode[];
  clients?: ClientInfo[];
  onCopy: (code: string) => void;
  onRevoke: (code: string) => void;
  onPause: (code: string) => void;
  onReactivate: (code: string) => void;
  onDelete: (code: string) => void;
  onUpdateClient?: (id: string, updates: Record<string, unknown>) => void;
  onSendMessage?: (clientId: string, content: string) => void;
}

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
  { id: "revoked", label: "Revoked" },
];

const TIER_FILTERS = [
  { id: "all", label: "All tiers" },
  { id: "vip", label: "VIP", color: "var(--tier-vip)" },
  { id: "gold", label: "Gold", color: "var(--tier-gold)" },
  { id: "diamond", label: "Diamond", color: "var(--tier-diamond)" },
  { id: "platinum", label: "Platinum", color: "var(--tier-platinum)" },
];

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function maskCode(code: string): string {
  if (code.length <= 6) return code;
  return code.slice(0, 4) + "····" + code.slice(-2);
}

interface ClientGroup {
  name: string;
  codes: AccessCode[];
  activeCodes: number;
  tiers: string[];
  clientInfo?: ClientInfo;
}

export function CodesList({
  codes, clients = [], onCopy, onRevoke, onPause, onReactivate, onDelete,
  onUpdateClient, onSendMessage
}: CodesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    onCopy(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleCollapse = (name: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // Build client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, ClientInfo>();
    for (const c of clients) {
      if (c.pseudo_snap) map.set(c.pseudo_snap.toLowerCase(), c);
      if (c.pseudo_insta) map.set(c.pseudo_insta.toLowerCase(), c);
    }
    return map;
  }, [clients]);

  // Filter codes first
  const filtered = codes.filter(c => {
    if (statusFilter === "active" && (!c.active || c.revoked || isExpired(c.expiresAt))) return false;
    if (statusFilter === "expired" && (!isExpired(c.expiresAt) || c.revoked)) return false;
    if (statusFilter === "revoked" && !c.revoked) return false;
    if (tierFilter !== "all" && c.tier !== tierFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.code.toLowerCase().includes(q) || c.client.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  // Group by client (normalized lowercase)
  const groups = useMemo(() => {
    const map = new Map<string, AccessCode[]>();
    for (const c of filtered) {
      const key = (c.client || "").toLowerCase().trim() || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    const result: ClientGroup[] = [];
    for (const [name, clientCodes] of map) {
      result.push({
        name,
        codes: clientCodes,
        activeCodes: clientCodes.filter(c => c.active && !c.revoked && !isExpired(c.expiresAt)).length,
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
    if (c.revoked) return { label: "Revoked", class: "badge-danger" };
    if (isExpired(c.expiresAt)) return { label: "Expired", class: "badge-muted" };
    if (!c.active) return { label: "Paused", class: "badge-warning" };
    return { label: "Active", class: "badge-success" };
  };

  const handleSaveNotes = useCallback((clientId: string) => {
    if (onUpdateClient) {
      onUpdateClient(clientId, { notes: notesText });
    }
    setEditingNotes(null);
  }, [onUpdateClient, notesText]);

  const handleSendMessage = useCallback((clientId: string) => {
    if (onSendMessage && messageText.trim()) {
      onSendMessage(clientId, messageText.trim());
      setMessageText("");
      setSendingMessage(null);
    }
  }, [onSendMessage, messageText]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search codes or clients..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none glass"
          style={{ color: "var(--text)" }}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all"
            style={{
              background: statusFilter === f.id ? "var(--accent)" : "rgba(255,255,255,0.03)",
              color: statusFilter === f.id ? "#fff" : "var(--text-muted)",
              border: `1px solid ${statusFilter === f.id ? "var(--accent)" : "var(--border2)"}`,
            }}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px flex-shrink-0" style={{ background: "var(--border2)" }} />
        {TIER_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setTierFilter(f.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all"
            style={{
              background: tierFilter === f.id ? (f.color ? `${f.color}20` : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.03)",
              color: tierFilter === f.id ? (f.color || "var(--text)") : "var(--text-muted)",
              border: `1px solid ${tierFilter === f.id ? (f.color ? `${f.color}40` : "var(--border3)") : "var(--border2)"}`,
            }}
          >
            {f.color && <span className={`tier-dot ${f.id}`} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped code list */}
      {groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(201,168,76,0.08)" }}>
            <Search className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No codes found</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Generate your first access code</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isCollapsed = collapsed.has(group.name);
            const ci = group.clientInfo;
            const isClientExpanded = expandedClient === group.name;
            return (
              <div key={group.name} className="card-premium overflow-hidden">
                {/* Client header */}
                <button
                  onClick={() => toggleCollapse(group.name)}
                  className="w-full px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors"
                  style={{ borderBottom: isCollapsed ? "none" : "1px solid var(--border2)" }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: ci?.is_blocked ? "rgba(244,63,94,0.12)" : "rgba(201,168,76,0.12)" }}>
                    <User className="w-4 h-4" style={{ color: ci?.is_blocked ? "var(--danger)" : "var(--accent)" }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                        {ci?.firstname || (group.name === "—" ? "Sans client" : group.name)}
                      </span>
                      {ci?.is_verified && (
                        <Shield className="w-3 h-3 flex-shrink-0" style={{ color: "var(--success)" }} />
                      )}
                      {ci?.is_blocked && (
                        <ShieldOff className="w-3 h-3 flex-shrink-0" style={{ color: "var(--danger)" }} />
                      )}
                      {ci?.tag && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA" }}>
                          {ci.tag}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)", color: "var(--accent)" }}>
                        {group.codes.length} code{group.codes.length > 1 ? "s" : ""}
                      </span>
                      {group.activeCodes > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                          {group.activeCodes} active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {group.name !== "—" && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>@{group.name}</span>}
                      {group.tiers.map(t => {
                        const info = TIER_FILTERS.find(f => f.id === t);
                        return (
                          <span key={t} className="text-[9px] font-semibold uppercase" style={{ color: info?.color || "var(--text-muted)" }}>
                            {t}
                          </span>
                        );
                      })}
                      {ci?.total_spent ? (
                        <span className="text-[10px]" style={{ color: "var(--success)" }}>{ci.total_spent}€</span>
                      ) : null}
                    </div>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                  )}
                </button>

                {/* Expanded content */}
                {!isCollapsed && (
                  <>
                    {/* Client detail bar (if client info exists) */}
                    {ci && (
                      <div className="px-4 py-2 flex items-center gap-2 flex-wrap" style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid var(--border2)" }}>
                        {ci.pseudo_snap && (
                          <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: "rgba(255,252,0,0.06)", color: "#FFFC00" }}>
                            Snap: @{ci.pseudo_snap}
                          </span>
                        )}
                        {ci.pseudo_insta && (
                          <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: "rgba(225,48,108,0.06)", color: "#E1306C" }}>
                            Insta: @{ci.pseudo_insta}
                          </span>
                        )}
                        {ci.preferences && (
                          <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: "rgba(201,168,76,0.06)", color: "var(--accent)" }}>
                            {ci.preferences}
                          </span>
                        )}
                        <div className="flex-1" />
                        {/* Action buttons */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedClient(isClientExpanded ? null : group.name); }}
                          className="text-[10px] px-2 py-1 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                          style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                          {isClientExpanded ? "Fermer" : "Detail"}
                        </button>
                        {onSendMessage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSendingMessage(sendingMessage === ci.id ? null : ci.id); }}
                            className="text-[10px] px-2 py-1 rounded-lg cursor-pointer hover:scale-105 transition-transform flex items-center gap-1"
                            style={{ background: "rgba(201,168,76,0.08)", color: "var(--accent)" }}>
                            <MessageSquare className="w-3 h-3" /> Msg
                          </button>
                        )}
                        {onUpdateClient && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUpdateClient(ci.id, { is_verified: !ci.is_verified }); }}
                              className="text-[10px] px-2 py-1 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                              style={{ background: ci.is_verified ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)", color: ci.is_verified ? "var(--success)" : "var(--text-muted)" }}>
                              <Shield className="w-3 h-3 inline" /> {ci.is_verified ? "Verifie" : "Verifier"}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onUpdateClient(ci.id, { is_blocked: !ci.is_blocked }); }}
                              className="text-[10px] px-2 py-1 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                              style={{ background: ci.is_blocked ? "rgba(244,63,94,0.08)" : "rgba(255,255,255,0.04)", color: ci.is_blocked ? "var(--danger)" : "var(--text-muted)" }}>
                              <ShieldOff className="w-3 h-3 inline" /> {ci.is_blocked ? "Bloque" : "Bloquer"}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Send message inline */}
                    {sendingMessage === ci?.id && (
                      <div className="px-4 py-2 flex gap-2" style={{ borderBottom: "1px solid var(--border2)" }}>
                        <input
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          placeholder="Message au client..."
                          className="flex-1 text-xs px-3 py-2 rounded-lg outline-none"
                          style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                          onKeyDown={e => { if (e.key === "Enter" && ci?.id) handleSendMessage(ci.id); }}
                        />
                        <button
                          onClick={() => ci?.id && handleSendMessage(ci.id)}
                          disabled={!messageText.trim()}
                          className="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-30"
                          style={{ background: "var(--accent)", color: "#fff" }}>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Expanded client detail */}
                    {isClientExpanded && ci && (
                      <div className="px-4 py-3 space-y-2" style={{ background: "rgba(255,255,255,0.01)", borderBottom: "1px solid var(--border2)" }}>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Tokens achetes: </span>
                            <span style={{ color: "var(--text)" }}>{ci.total_tokens_bought || 0}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Tokens depenses: </span>
                            <span style={{ color: "var(--text)" }}>{ci.total_tokens_spent || 0}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Derniere activite: </span>
                            <span style={{ color: "var(--text)" }}>{ci.last_active ? new Date(ci.last_active).toLocaleDateString() : "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)" }}>Tier actuel: </span>
                            <span className="font-semibold uppercase" style={{ color: "var(--text)" }}>{ci.tier || "—"}</span>
                          </div>
                        </div>
                        {/* Notes */}
                        <div className="flex items-start gap-2">
                          <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
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
                            <span className="text-[10px] cursor-pointer" style={{ color: ci.notes ? "var(--text-secondary)" : "var(--text-muted)" }}
                              onClick={() => { setEditingNotes(ci.id); setNotesText(ci.notes || ""); }}>
                              {ci.notes || "Ajouter une note..."}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Codes list */}
                    <div className="divide-y" style={{ borderColor: "var(--border2)" }}>
                      {group.codes.map(c => {
                        const status = getStatus(c);
                        const tierInfo = TIER_FILTERS.find(t => t.id === c.tier);
                        return (
                          <div key={c.code} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`tier-dot ${c.tier}`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="code-string font-medium text-xs" style={{ color: "var(--text)" }}>
                                    {maskCode(c.code)}
                                  </span>
                                  <button
                                    onClick={() => handleCopy(c.code)}
                                    className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:opacity-80"
                                    style={{ background: "rgba(255,255,255,0.04)" }}
                                  >
                                    {copied === c.code ? (
                                      <Check className="w-3 h-3" style={{ color: "var(--success)" }} />
                                    ) : (
                                      <Copy className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                                    )}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-semibold uppercase" style={{ color: tierInfo?.color || "var(--text-muted)" }}>
                                    {c.tier}
                                  </span>
                                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {c.platform}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`badge ${status.class}`}>{status.label}</span>
                              {!c.revoked && !isExpired(c.expiresAt) && (
                                <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                                  <Clock className="w-3 h-3" />
                                  {timeLeft(c.expiresAt)}
                                </div>
                              )}
                              <div className="relative">
                                <button
                                  onClick={() => setMenuOpen(menuOpen === c.code ? null : c.code)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                                  style={{ background: "rgba(255,255,255,0.04)" }}
                                >
                                  <MoreHorizontal className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                                </button>
                                {menuOpen === c.code && (
                                  <div className="absolute right-0 top-9 z-20 w-40 rounded-xl py-1 shadow-xl"
                                    style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                                    <button onClick={() => { handleCopy(c.code); setMenuOpen(null); }}
                                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 cursor-pointer hover:opacity-80"
                                      style={{ color: "var(--text-secondary)" }}>
                                      <Copy className="w-3.5 h-3.5" /> Copy code
                                    </button>
                                    {c.active && !c.revoked && (
                                      <button onClick={() => { onPause(c.code); setMenuOpen(null); }}
                                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 cursor-pointer hover:opacity-80"
                                        style={{ color: "var(--warning)" }}>
                                        <Pause className="w-3.5 h-3.5" /> Pause
                                      </button>
                                    )}
                                    {!c.active && !c.revoked && (
                                      <button onClick={() => { onReactivate(c.code); setMenuOpen(null); }}
                                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 cursor-pointer hover:opacity-80"
                                        style={{ color: "var(--success)" }}>
                                        <Play className="w-3.5 h-3.5" /> Reactivate
                                      </button>
                                    )}
                                    {!c.revoked && (
                                      <button onClick={() => { onRevoke(c.code); setMenuOpen(null); }}
                                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 cursor-pointer hover:opacity-80"
                                        style={{ color: "var(--danger)" }}>
                                        <Ban className="w-3.5 h-3.5" /> Revoke
                                      </button>
                                    )}
                                    <button onClick={() => { onDelete(c.code); setMenuOpen(null); }}
                                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 cursor-pointer hover:opacity-80"
                                      style={{ color: "var(--danger)" }}>
                                      <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
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
    </div>
  );
}

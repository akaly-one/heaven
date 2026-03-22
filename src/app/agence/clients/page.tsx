"use client";

import { useState, useEffect, useCallback } from "react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import {
  Search, Users, Ghost, Instagram, ChevronLeft, Tag, Edit3, Save,
  ShieldCheck, Ban, Clock, MessageCircle, ShoppingBag, Heart, Send,
  X, Star, Gift, Eye,
} from "lucide-react";

// ── Types ──
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
  firstname: string | null;
  tag: string | null;
  preferences: string | null;
  delivery_platform: string | null;
  last_active: string | null;
  created_at: string;
}

interface ClientMessage {
  id: string;
  sender_type: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface ClientCode {
  code: string;
  tier: string;
  type: string;
  duration: number;
  created: string;
  expires_at: string;
  active: boolean;
  revoked: boolean;
  used: boolean;
}

const TIER_HEX: Record<string, string> = {
  vip: "#F43F5E", gold: "#F59E0B", diamond: "#6366F1", platinum: "#A78BFA",
};

const SORT_OPTIONS = [
  { id: "snap", label: "Pseudo Snap" },
  { id: "recent", label: "Recent" },
  { id: "spent", label: "Top dépenses" },
];

export default function ClientsPage() {
  const { currentModel, authHeaders, isRoot } = useModel();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("snap");
  const [loading, setLoading] = useState(true);

  // Detail panel
  const [selected, setSelected] = useState<Client | null>(null);
  const [detailMessages, setDetailMessages] = useState<ClientMessage[]>([]);
  const [detailCodes, setDetailCodes] = useState<ClientCode[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Editing
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ firstname: "", tag: "", preferences: "", delivery_platform: "", notes: "" });

  // Promo
  const [showPromo, setShowPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");

  // ── Load clients ──
  useEffect(() => {
    setLoading(true);
    const params = currentModel ? `?model=${currentModel}` : "";
    fetch(`/api/clients${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.clients) setClients(d.clients); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentModel, authHeaders]);

  // ── Load client detail ──
  const openClient = useCallback(async (client: Client) => {
    setSelected(client);
    setEditing(false);
    setShowPromo(false);
    setEditForm({
      firstname: client.firstname || "",
      tag: client.tag || "",
      preferences: client.preferences || "",
      delivery_platform: client.delivery_platform || "snap",
      notes: client.notes || "",
    });
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, { headers: authHeaders() });
      const d = await res.json();
      setDetailMessages(d.messages || []);
      setDetailCodes(d.codes || []);
    } catch {
      setDetailMessages([]);
      setDetailCodes([]);
    } finally {
      setDetailLoading(false);
    }
  }, [authHeaders]);

  // ── Save client edits ──
  const saveClient = useCallback(async () => {
    if (!selected) return;
    await fetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ id: selected.id, ...editForm }),
    });
    // Update local state
    setClients(prev => prev.map(c => c.id === selected.id ? { ...c, ...editForm } : c));
    setSelected(prev => prev ? { ...prev, ...editForm } : prev);
    setEditing(false);
  }, [selected, editForm, authHeaders]);

  // ── Send promo message ──
  const sendPromo = useCallback(async () => {
    if (!selected || !promoMessage.trim()) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selected.model,
        client_id: selected.id,
        sender_type: "model",
        content: promoMessage.trim(),
      }),
    });
    setShowPromo(false);
    setPromoMessage("");
    // Refresh detail
    openClient(selected);
  }, [selected, promoMessage, openClient]);

  // ── Toggle verified/blocked ──
  const toggleField = useCallback(async (field: "is_verified" | "is_blocked") => {
    if (!selected) return;
    const newVal = !selected[field];
    await fetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ id: selected.id, [field]: newVal }),
    });
    setClients(prev => prev.map(c => c.id === selected.id ? { ...c, [field]: newVal } : c));
    setSelected(prev => prev ? { ...prev, [field]: newVal } : prev);
  }, [selected, authHeaders]);

  // ── Filter & Sort ──
  const filtered = clients
    .filter(c => {
      const q = search.toLowerCase();
      return (
        (c.pseudo_snap || "").toLowerCase().includes(q) ||
        (c.pseudo_insta || "").toLowerCase().includes(q) ||
        (c.firstname || "").toLowerCase().includes(q) ||
        (c.tag || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "snap") return (a.pseudo_snap || "zzz").localeCompare(b.pseudo_snap || "zzz");
      if (sortBy === "spent") return Number(b.total_spent) - Number(a.total_spent);
      return new Date(b.last_active || b.created_at).getTime() - new Date(a.last_active || a.created_at).getTime();
    });

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const dd = Math.floor(h / 24);
    if (dd < 30) return `${dd}j`;
    return `${Math.floor(dd / 30)}mo`;
  };

  return (
    <OsLayout cpId="clients">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-5 fade-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                <Users className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Clients</h1>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {clients.length} client{clients.length !== 1 ? "s" : ""}
                  {currentModel && ` · ${currentModel.toUpperCase()}`}
                </p>
              </div>
            </div>
          </div>

          {/* ── Search + Sort ── */}
          <div className="flex gap-2 mb-4 fade-up-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search pseudo, name, tag..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none glass"
                style={{ color: "var(--text)" }} />
            </div>
            <div className="flex gap-1">
              {SORT_OPTIONS.map(s => (
                <button key={s.id} onClick={() => setSortBy(s.id)}
                  className="px-3 py-2 rounded-lg text-[10px] font-medium whitespace-nowrap cursor-pointer transition-all"
                  style={{
                    background: sortBy === s.id ? "var(--accent)" : "rgba(255,255,255,0.03)",
                    color: sortBy === s.id ? "#fff" : "var(--text-muted)",
                    border: `1px solid ${sortBy === s.id ? "var(--accent)" : "var(--border2)"}`,
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex gap-4">

            {/* Left: Client list */}
            <div className={`${selected ? "hidden md:block md:w-1/2 lg:w-2/5" : "w-full"} space-y-2 fade-up-2`}>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(99,102,241,0.2)", borderTopColor: "var(--accent)" }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {search ? "No results" : "No clients yet"}
                  </p>
                </div>
              ) : filtered.map(c => {
                const tierColor = TIER_HEX[c.tier || ""] || "var(--text-muted)";
                const isActive = selected?.id === c.id;
                return (
                  <button key={c.id} onClick={() => openClient(c)}
                    className="w-full p-3.5 rounded-xl text-left cursor-pointer transition-all card-premium"
                    style={isActive ? { border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.06)" } : {}}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${tierColor}15`, color: tierColor }}>
                        {(c.firstname || c.pseudo_snap || c.pseudo_insta || "?").charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {c.firstname && (
                            <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{c.firstname}</span>
                          )}
                          {c.tag && (
                            <span className="badge text-[8px]" style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>
                              {c.tag}
                            </span>
                          )}
                          {c.is_verified && <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: "var(--success)" }} />}
                          {c.is_blocked && <Ban className="w-3 h-3 shrink-0" style={{ color: "var(--danger)" }} />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.pseudo_snap && (
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                              <Ghost className="w-3 h-3" /> {c.pseudo_snap}
                            </span>
                          )}
                          {c.pseudo_insta && (
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                              <Instagram className="w-3 h-3" /> {c.pseudo_insta}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {c.tier && <span className={`tier-dot ${c.tier} block ml-auto mb-1`} />}
                        <span className="text-[10px] font-medium tabular-nums" style={{ color: "var(--text-muted)" }}>
                          {Number(c.total_spent).toFixed(0)}€
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Detail panel */}
            {selected && (
              <div className={`${selected ? "w-full md:w-1/2 lg:w-3/5" : "hidden"} fade-up`}>
                <div className="card-premium p-5 sticky top-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setSelected(null)} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    </button>
                    <div className="flex items-center gap-2.5 flex-1 min-w-0 ml-2 md:ml-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: `${TIER_HEX[selected.tier || ""] || "#64748B"}15`,
                          color: TIER_HEX[selected.tier || ""] || "var(--text-muted)",
                        }}>
                        {(selected.firstname || selected.pseudo_snap || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                            {selected.firstname || selected.pseudo_snap || selected.pseudo_insta || "Anonymous"}
                          </span>
                          {selected.tier && (
                            <span className="badge text-[8px]" style={{
                              background: `${TIER_HEX[selected.tier] || "#64748B"}15`,
                              color: TIER_HEX[selected.tier] || "var(--text-muted)",
                            }}>
                              {selected.tier.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {selected.pseudo_snap && <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}><Ghost className="w-3 h-3" />{selected.pseudo_snap}</span>}
                          {selected.pseudo_insta && <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}><Instagram className="w-3 h-3" />{selected.pseudo_insta}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleField("is_verified")}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: selected.is_verified ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)" }}>
                        <ShieldCheck className="w-3.5 h-3.5" style={{ color: selected.is_verified ? "var(--success)" : "var(--text-muted)" }} />
                      </button>
                      <button onClick={() => toggleField("is_blocked")}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: selected.is_blocked ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)" }}>
                        <Ban className="w-3.5 h-3.5" style={{ color: selected.is_blocked ? "var(--danger)" : "var(--text-muted)" }} />
                      </button>
                      <button onClick={() => setEditing(!editing)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: editing ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)" }}>
                        <Edit3 className="w-3.5 h-3.5" style={{ color: editing ? "var(--accent)" : "var(--text-muted)" }} />
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="glass rounded-lg p-2.5 text-center">
                      <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>{Number(selected.total_spent).toFixed(0)}€</p>
                      <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Spent</p>
                    </div>
                    <div className="glass rounded-lg p-2.5 text-center">
                      <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>{selected.total_tokens_bought}</p>
                      <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Tokens</p>
                    </div>
                    <div className="glass rounded-lg p-2.5 text-center">
                      <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>
                        {selected.last_active ? timeAgo(selected.last_active) : "—"}
                      </p>
                      <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Last seen</p>
                    </div>
                  </div>

                  {/* Edit form */}
                  {editing && (
                    <div className="space-y-2.5 mb-4 p-3 rounded-xl" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Firstname</label>
                          <input value={editForm.firstname} onChange={e => setEditForm(f => ({ ...f, firstname: e.target.value }))}
                            placeholder="Prénom..."
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                        </div>
                        <div>
                          <label className="text-[9px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Tag</label>
                          <input value={editForm.tag} onChange={e => setEditForm(f => ({ ...f, tag: e.target.value }))}
                            placeholder="VIP, whale, new..."
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Preferences</label>
                        <textarea value={editForm.preferences} onChange={e => setEditForm(f => ({ ...f, preferences: e.target.value }))}
                          placeholder="Ce qu'il aime : pieds, lingerie, cosplay..."
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none"
                          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                      </div>
                      <div>
                        <label className="text-[9px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Delivery platform</label>
                        <div className="flex gap-1.5">
                          {[{ id: "snap", label: "Snapchat", icon: Ghost }, { id: "insta", label: "Instagram", icon: Instagram }].map(p => (
                            <button key={p.id} onClick={() => setEditForm(f => ({ ...f, delivery_platform: p.id }))}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer"
                              style={{
                                background: editForm.delivery_platform === p.id ? "var(--accent)" : "rgba(255,255,255,0.03)",
                                color: editForm.delivery_platform === p.id ? "#fff" : "var(--text-muted)",
                                border: `1px solid ${editForm.delivery_platform === p.id ? "var(--accent)" : "var(--border2)"}`,
                              }}>
                              <p.icon className="w-3 h-3" /> {p.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                          Le contenu custom sera envoyé via cette plateforme (anti-screenshot)
                        </p>
                      </div>
                      <div>
                        <label className="text-[9px] font-medium uppercase mb-1 block" style={{ color: "var(--text-muted)" }}>Notes</label>
                        <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Notes internes..."
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none"
                          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                      </div>
                      <button onClick={saveClient}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                        style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                        <Save className="w-3 h-3" /> Save
                      </button>
                    </div>
                  )}

                  {/* Info chips (when not editing) */}
                  {!editing && (selected.firstname || selected.tag || selected.preferences || selected.delivery_platform) && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {selected.tag && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
                          style={{ background: "rgba(99,102,241,0.08)", color: "var(--accent)" }}>
                          <Tag className="w-3 h-3" /> {selected.tag}
                        </span>
                      )}
                      {selected.delivery_platform && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
                          style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>
                          {selected.delivery_platform === "snap" ? <Ghost className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                          {selected.delivery_platform === "snap" ? "Snapchat" : "Instagram"}
                        </span>
                      )}
                      {selected.preferences && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
                          style={{ background: "rgba(244,63,94,0.08)", color: "var(--rose)" }}>
                          <Heart className="w-3 h-3" /> {selected.preferences.length > 30 ? selected.preferences.slice(0, 30) + "..." : selected.preferences}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Promo button */}
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setShowPromo(!showPromo)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-medium cursor-pointer"
                      style={{ background: "rgba(244,63,94,0.08)", color: "var(--rose)", border: "1px solid rgba(244,63,94,0.15)" }}>
                      <Gift className="w-3 h-3" /> Send Promo
                    </button>
                    {selected.pseudo_snap && (
                      <a href={`https://www.snapchat.com/add/${selected.pseudo_snap}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-medium no-underline cursor-pointer"
                        style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border2)" }}>
                        <Ghost className="w-3 h-3" /> Open Snap
                      </a>
                    )}
                  </div>

                  {/* Promo form */}
                  {showPromo && (
                    <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.12)" }}>
                      <p className="text-[10px] font-medium mb-2" style={{ color: "var(--rose)" }}>
                        Envoyer une promo de déblocage story privée
                      </p>
                      <textarea value={promoMessage} onChange={e => setPromoMessage(e.target.value)}
                        placeholder="Ex: Hey! -30% sur le pack Gold ce weekend seulement 🔥 Déblocage story privée inclus!"
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none mb-2"
                        style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                      <button onClick={sendPromo} disabled={!promoMessage.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-30"
                        style={{ background: "var(--rose)", color: "#fff" }}>
                        <Send className="w-3 h-3" /> Send via Messenger
                      </button>
                    </div>
                  )}

                  {/* Detail sections */}
                  {detailLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(99,102,241,0.2)", borderTopColor: "var(--accent)" }} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Purchase history */}
                      <div>
                        <h4 className="text-[10px] font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5"
                          style={{ color: "var(--text-muted)" }}>
                          <ShoppingBag className="w-3 h-3" /> Purchases ({detailCodes.length})
                        </h4>
                        {detailCodes.length === 0 ? (
                          <p className="text-[10px] py-3" style={{ color: "var(--text-muted)" }}>No purchases yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {detailCodes.slice(0, 5).map(code => (
                              <div key={code.code} className="flex items-center justify-between p-2.5 rounded-lg"
                                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border2)" }}>
                                <div className="flex items-center gap-2">
                                  <span className={`tier-dot ${code.tier}`} />
                                  <span className="code-string text-[10px]" style={{ color: "var(--text)" }}>{code.code}</span>
                                  <span className="badge text-[8px]" style={{
                                    background: `${TIER_HEX[code.tier] || "#64748B"}15`,
                                    color: TIER_HEX[code.tier] || "var(--text-muted)",
                                  }}>{code.tier}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px]" style={{ color: code.active ? "var(--success)" : "var(--text-muted)" }}>
                                    {code.revoked ? "Revoked" : code.active ? "Active" : "Expired"}
                                  </span>
                                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                                    {timeAgo(code.created)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Messages history */}
                      <div>
                        <h4 className="text-[10px] font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5"
                          style={{ color: "var(--text-muted)" }}>
                          <MessageCircle className="w-3 h-3" /> Messages ({detailMessages.length})
                        </h4>
                        {detailMessages.length === 0 ? (
                          <p className="text-[10px] py-3" style={{ color: "var(--text-muted)" }}>No messages yet</p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {detailMessages.slice(0, 10).map(msg => (
                              <div key={msg.id} className="flex gap-2 p-2 rounded-lg"
                                style={{ background: msg.sender_type === "model" ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.02)" }}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                  style={{
                                    background: msg.sender_type === "model" ? "linear-gradient(135deg, var(--rose), var(--accent))" : "rgba(255,255,255,0.06)",
                                  }}>
                                  {msg.sender_type === "model"
                                    ? <Star className="w-2.5 h-2.5 text-white" />
                                    : <Eye className="w-2.5 h-2.5" style={{ color: "var(--text-muted)" }} />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--text)" }}>{msg.content}</p>
                                  <p className="text-[8px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                    {msg.sender_type === "model" ? "Model" : "Client"} · {timeAgo(msg.created_at)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Preferences display */}
                      {selected.preferences && !editing && (
                        <div>
                          <h4 className="text-[10px] font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5"
                            style={{ color: "var(--text-muted)" }}>
                            <Heart className="w-3 h-3" /> Preferences
                          </h4>
                          <p className="text-xs leading-relaxed p-2.5 rounded-lg"
                            style={{ background: "rgba(244,63,94,0.04)", color: "var(--text-secondary)", border: "1px solid rgba(244,63,94,0.08)" }}>
                            {selected.preferences}
                          </p>
                        </div>
                      )}

                      {/* Notes display */}
                      {selected.notes && !editing && (
                        <div>
                          <h4 className="text-[10px] font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5"
                            style={{ color: "var(--text-muted)" }}>
                            <Clock className="w-3 h-3" /> Notes
                          </h4>
                          <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{selected.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </OsLayout>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import {
  Search, ArrowLeft, Trash2, Check, X, MessageCircle, Key,
  Copy, Link2, Send, UserPlus, GitMerge, User, Clock,
} from "lucide-react";
import type { AccessCode, Message } from "@/types/heaven";

/* ── Types ── */

interface Client {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; tier: string | null; total_tokens_bought: number; total_tokens_spent: number;
  last_active: string | null; notes: string | null; created_at: string;
  firstname?: string | null; phone?: string | null;
  is_verified?: boolean; is_blocked?: boolean;
}

interface ClientEnriched extends Client {
  unreadCount: number;
  lastMessage: Message | null;
  hasAdmin: boolean;
}


/* ── Helpers ── */

const pseudoOf = (c: Client) => c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 8);
const isSnap = (c: Client) => !!c.pseudo_snap;
const platformColor = (c: Client) => isSnap(c) ? "#997A00" : "#C13584";

const relativeTime = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return "now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}j`;
};

const codeTimeLeft = (expiresAt: string, revoked: boolean, active: boolean) => {
  if (revoked) return "rev";
  if (!active) return "exp";
  const d = new Date(expiresAt).getTime() - Date.now();
  if (d <= 0) return "exp";
  if (d > 86_400_000) return `${Math.floor(d / 86_400_000)}j`;
  return `${Math.floor(d / 3_600_000)}h`;
};

/* ══════════════════════════════════════════════ */
/*  Clients CRM — Two-panel layout               */
/* ══════════════════════════════════════════════ */

export default function ClientsCRMPage() {
  const { currentModel, authHeaders, isRoot } = useModel();
  const model = currentModel || null;

  if (!model) {
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isRoot ? "Selectionne un modele dans le header" : "Chargement..."}
          </p>
        </div>
      </OsLayout>
    );
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  /* ── State ── */
  const [clients, setClients] = useState<Client[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addPseudo, setAddPseudo] = useState("");
  const [addPlatform, setAddPlatform] = useState<"snap" | "insta">("snap");
  const msgEndRef = useRef<HTMLDivElement>(null);

  /* ── Merge modal ── */
  const [mergeModal, setMergeModal] = useState<Client[] | null>(null);
  const [mergeChoices, setMergeChoices] = useState<Record<string, string>>({});
  const [mergeCodeChoice, setMergeCodeChoice] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  /* ── Fetch ── */
  const fetchAll = useCallback(() => {
    if (!model) { setLoading(false); return; }
    Promise.all([
      fetch(`/api/clients?model=${model}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/codes?model=${model}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/messages?model=${model}`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([cd, co, mg]) => {
      setClients(cd.clients || []);
      setCodes(co.codes || []);
      setMessages(mg.messages || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [model, authHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh messages every 8s when a conversation is open
  useEffect(() => {
    if (!activeClient) return;
    const iv = setInterval(() => {
      fetch(`/api/messages?model=${model}`, { headers: authHeaders() }).then(r => r.json())
        .then(mg => setMessages(mg.messages || [])).catch(() => {});
    }, 8000);
    return () => clearInterval(iv);
  }, [activeClient, model, authHeaders]);

  // Scroll to bottom when messages change
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeClient]);

  /* ── Enriched client list ── */
  const enriched: ClientEnriched[] = useMemo(() => {
    const msgByClient: Record<string, Message[]> = {};
    messages.forEach(m => {
      if (!msgByClient[m.client_id]) msgByClient[m.client_id] = [];
      msgByClient[m.client_id].push(m);
    });
    return clients.map(c => {
      const cMsgs = (msgByClient[c.id] || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        ...c,
        unreadCount: cMsgs.filter(m => !m.read && m.sender_type === "client").length,
        lastMessage: cMsgs[0] || null,
        hasAdmin: cMsgs.some(m => m.sender_type === "admin"),
      };
    });
  }, [clients, messages]);

  // Sort: unread first, then by last message recency, then by created_at
  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      if (a.hasAdmin && !b.hasAdmin) return -1;
      if (b.hasAdmin && !a.hasAdmin) return 1;
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }, [enriched]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(c => (c.pseudo_snap || c.pseudo_insta || c.firstname || "").toLowerCase().includes(q));
  }, [sorted, search]);

  const totalUnread = enriched.reduce((s, c) => s + c.unreadCount, 0);

  /* ── Helpers ── */
  const handleCopy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(c => c.id)));
  const selectNone = () => setSelected(new Set());

  const clientCodesFor = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    if (!c) return [];
    return codes.filter(co => co.clientId === id || co.client === pseudoOf(c));
  };

  const clientMessagesFor = (id: string) =>
    messages.filter(m => m.client_id === id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  /* ── Select client ── */
  const openClient = useCallback(async (clientId: string) => {
    setActiveClient(clientId);
    setReply("");
    // Mark messages as read
    try {
      await fetch("/api/messages", {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ model, client_id: clientId, action: "mark_read" }),
      });
      setMessages(prev => prev.map(m => m.client_id === clientId ? { ...m, read: true } : m));
    } catch {}
  }, [model, authHeaders]);

  /* ── Actions ── */
  const deleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.size} client(s) ?`)) return;
    for (const id of selected) {
      await fetch(`/api/clients?id=${id}`, { method: "DELETE", headers: authHeaders() });
    }
    selectNone(); fetchAll();
  };

  const addClient = async () => {
    if (!addPseudo.trim()) return;
    const payload: Record<string, unknown> = { model };
    if (addPlatform === "snap") payload.pseudo_snap = addPseudo.trim().toLowerCase();
    else payload.pseudo_insta = addPseudo.trim().toLowerCase();
    await fetch("/api/clients", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
    setAddPseudo(""); setShowAdd(false); fetchAll();
  };

  const sendReply = async () => {
    if (!reply.trim() || !activeClient) return;
    await fetch("/api/messages", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ model, client_id: activeClient, content: reply.trim(), sender_type: "model" }),
    });
    setReply(""); fetchAll();
  };

  const deleteMessage = async (msgId: string) => {
    await fetch(`/api/messages?id=${msgId}`, { method: "DELETE", headers: authHeaders() });
    fetchAll();
  };

  const generateCode = async (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    if (!c || !model) return;
    const pseudo = pseudoOf(c);
    const codeStr = `${model.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await fetch("/api/codes", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ model, code: codeStr, client: pseudo.toLowerCase(), platform: isSnap(c) ? "snapchat" : "instagram", tier: "vip", duration: 720, type: "paid" }),
    });
    fetchAll();
  };

  /* ── Merge ── */
  const openMergeModal = () => {
    if (selected.size < 2) return;
    const toMerge = [...selected].map(id => clients.find(c => c.id === id)).filter(Boolean) as Client[];
    if (toMerge.length < 2) return;
    const defaults: Record<string, string> = {};
    const fields = ["pseudo_snap", "pseudo_insta", "phone", "firstname", "notes", "tier"] as const;
    for (const f of fields) {
      const withValue = toMerge.filter(c => c[f as keyof Client]);
      if (withValue.length > 0) defaults[f] = withValue[0].id;
    }
    setMergeChoices(defaults);
    const allMergeCodes = toMerge.flatMap(c => codes.filter(co => co.client === (c.pseudo_snap || c.pseudo_insta) && co.active && !co.revoked));
    setMergeCodeChoice(allMergeCodes[0]?.code || null);
    setMergeModal(toMerge);
  };

  const executeMerge = async () => {
    if (!mergeModal || mergeModal.length < 2) return;
    setMerging(true);
    try {
      const keepId = mergeModal[0].id;
      const updates: Record<string, unknown> = {};
      const fields = ["pseudo_snap", "pseudo_insta", "phone", "firstname", "notes", "tier"] as const;
      for (const f of fields) {
        const chosenClientId = mergeChoices[f];
        if (chosenClientId) {
          const chosenClient = mergeModal.find(c => c.id === chosenClientId);
          if (chosenClient) updates[f] = chosenClient[f as keyof Client];
        }
      }
      // 1. Update kept client with chosen fields
      if (Object.keys(updates).length > 0) {
        const res = await fetch("/api/clients", { method: "PATCH", headers: authHeaders(),
          body: JSON.stringify({ id: keepId, ...updates }) });
        if (!res.ok) throw new Error(`PATCH client failed: ${res.status}`);
      }
      // 2. Reassign messages in parallel batches (not N+1)
      const otherIds = mergeModal.slice(1).map(c => c.id);
      const msgPromises = otherIds.flatMap(otherId =>
        messages.filter(m => m.client_id === otherId).map(msg =>
          fetch("/api/messages", { method: "PATCH", headers: authHeaders(),
            body: JSON.stringify({ id: msg.id, client_id: keepId }) })
        )
      );
      if (msgPromises.length > 0) {
        const results = await Promise.allSettled(msgPromises);
        const failed = results.filter(r => r.status === "rejected");
        if (failed.length > 0) console.warn(`[Merge] ${failed.length}/${msgPromises.length} message reassignments failed`);
      }
      // 3. Reassign codes in parallel
      const keptPseudo = (updates.pseudo_snap || mergeModal[0].pseudo_snap || updates.pseudo_insta || mergeModal[0].pseudo_insta || "") as string;
      const codePromises = mergeModal.slice(1).flatMap(other => {
        const otherPseudo = other.pseudo_snap || other.pseudo_insta || "";
        return codes.filter(c => c.client === otherPseudo).map(code =>
          fetch("/api/codes", { method: "PATCH", headers: authHeaders(),
            body: JSON.stringify({ code: code.code, model, updates: { client: keptPseudo } }) })
        );
      });
      if (codePromises.length > 0) await Promise.allSettled(codePromises);
      // 4. Delete merged clients
      await Promise.allSettled(otherIds.map(id =>
        fetch(`/api/clients?id=${id}`, { method: "DELETE", headers: authHeaders() })
      ));
      setMergeModal(null); selectNone(); fetchAll();
    } catch (err) { console.error("[Merge] error:", err); }
    setMerging(false);
  };

  /* ── Active detail data ── */
  const detailClient = enriched.find(c => c.id === activeClient);
  const detailCodes = activeClient ? clientCodesFor(activeClient) : [];
  const detailMessages = activeClient ? clientMessagesFor(activeClient) : [];
  const activeCode = detailCodes.find(co => co.active && !co.revoked);

  /* ══════════════════════════════════════════════ */
  /*  Render                                        */
  /* ══════════════════════════════════════════════ */

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>

        {/* ── Two-panel container ── */}
        <div className="flex flex-1 overflow-hidden relative" style={{ minHeight: "calc(100vh - 56px)" }}>

          {/* ═══════════════════════════════ */}
          {/*  LEFT PANEL — Client list       */}
          {/* ═══════════════════════════════ */}
          <div
            className="flex flex-col border-r shrink-0 overflow-hidden w-full md:w-[380px] md:max-w-[380px]"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <a href="/agence" className="p-1.5 rounded-lg no-underline hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                <ArrowLeft className="w-4 h-4" />
              </a>
              <h1 className="text-sm font-bold flex-1" style={{ color: "var(--text)" }}>
                Clients
                <span className="ml-1 text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>({clients.length})</span>
                {totalUnread > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E" }}>
                    {totalUnread}
                  </span>
                )}
              </h1>
              {selected.size > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>{selected.size}</span>
                  {selected.size >= 2 && (
                    <button onClick={openMergeModal} className="px-2 py-1 rounded text-[11px] font-bold cursor-pointer"
                      style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "none" }}>
                      <GitMerge className="w-3 h-3 inline mr-0.5" />Merge
                    </button>
                  )}
                  <button onClick={deleteSelected} className="px-2 py-1 rounded text-[11px] font-bold cursor-pointer"
                    style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "none" }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button onClick={selectNone} className="p-1 cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAdd(true)} className="px-2 py-1 rounded text-[11px] font-bold cursor-pointer"
                  style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                  <UserPlus className="w-3 h-3 inline mr-0.5" />Ajouter
                </button>
              )}
            </div>

            {/* Add client inline */}
            {showAdd && (
              <div className="px-3 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold flex-1" style={{ color: "var(--text)" }}>Nouveau client</span>
                  <button onClick={() => setShowAdd(false)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddPlatform("snap")}
                    className="w-10 h-10 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                    style={{ background: addPlatform === "snap" ? "#997A00" : "rgba(153,122,0,0.15)", border: `2px solid ${addPlatform === "snap" ? "#997A00" : "transparent"}` }}>
                    {addPlatform === "snap" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                  <button onClick={() => setAddPlatform("insta")}
                    className="w-10 h-10 rounded-full cursor-pointer shrink-0 flex items-center justify-center"
                    style={{ background: addPlatform === "insta" ? "#C13584" : "rgba(193,53,132,0.15)", border: `2px solid ${addPlatform === "insta" ? "#C13584" : "transparent"}` }}>
                    {addPlatform === "insta" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                  <input value={addPseudo} onChange={e => setAddPseudo(e.target.value)}
                    placeholder={addPlatform === "snap" ? "pseudo snap" : "pseudo insta"}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                    style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                    onKeyDown={e => { if (e.key === "Enter") addClient(); }} />
                  <button onClick={addClient} disabled={!addPseudo.trim()}
                    className="px-3 py-2.5 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-30"
                    style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                    OK
                  </button>
                </div>
              </div>
            )}

            {/* Search + select all */}
            <div className="flex gap-2 px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--text-muted)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                  className="w-full pl-8 pr-2 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <button onClick={selected.size === filtered.length ? selectNone : selectAll}
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer shrink-0"
                style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {selected.size === filtered.length && filtered.length > 0 ? "0" : "All"}
              </button>
            </div>

            {/* Client list */}
            <div className="flex-1 overflow-y-auto">
              {loading && <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Chargement...</p>}
              {!loading && filtered.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun client</p>
              )}
              {!loading && filtered.map(c => {
                const pseudo = pseudoOf(c);
                const isActive = activeClient === c.id;
                const isSelected = selected.has(c.id);
                const cActiveCode = codes.find(co => (co.clientId === c.id || co.client === pseudo) && co.active && !co.revoked);

                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
                    style={{
                      background: isActive ? "var(--surface)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    }}
                    onClick={() => openClient(c.id)}
                  >
                    {/* Checkbox — 44px touch target */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}
                      className="w-9 h-9 flex items-center justify-center shrink-0 cursor-pointer"
                      style={{ background: "transparent", border: "none" }}
                    >
                      <span className="w-4 h-4 rounded flex items-center justify-center"
                        style={{ background: isSelected ? "var(--accent)" : "var(--bg)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}` }}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                    </button>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 relative"
                      style={{
                        background: c.unreadCount > 0 ? `${platformColor(c)}18` : "rgba(0,0,0,0.04)",
                        color: c.unreadCount > 0 ? platformColor(c) : "var(--text-muted)",
                        border: c.hasAdmin ? "2px solid #3B82F6" : `2px solid ${platformColor(c)}30`,
                      }}>
                      {pseudo.charAt(0).toUpperCase()}
                      {/* Platform dot */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ background: platformColor(c), borderColor: isActive ? "var(--surface)" : "var(--bg)" }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>@{pseudo}</span>
                        {cActiveCode && (
                          <span className="text-[11px] font-bold px-1 py-0.5 rounded shrink-0"
                            style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                            {cActiveCode.tier?.toUpperCase()}
                          </span>
                        )}
                        {c.hasAdmin && (
                          <span className="text-[11px] font-bold px-1 py-0.5 rounded shrink-0"
                            style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6" }}>
                            ADM
                          </span>
                        )}
                      </div>
                      {c.lastMessage ? (
                        <p className="text-[11px] truncate mt-0.5" style={{ color: c.unreadCount > 0 ? "var(--text)" : "var(--text-muted)" }}>
                          {c.lastMessage.sender_type === "admin" ? "Admin: " : c.lastMessage.sender_type === "model" ? "Toi: " : ""}
                          {c.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Pas de messages</p>
                      )}
                    </div>

                    {/* Right side: time + unread */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {c.lastMessage && (
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {relativeTime(c.lastMessage.created_at)}
                        </span>
                      )}
                      {c.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold min-w-[18px] text-center"
                          style={{ background: c.hasAdmin ? "#3B82F6" : "var(--accent)", color: "#fff" }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════ */}
          {/*  RIGHT PANEL — Detail           */}
          {/* ═══════════════════════════════ */}
          <div
            className={`crm-right-panel flex flex-col ${activeClient ? "crm-right-open" : ""}`}
            style={{ background: "var(--bg)" }}
          >
            {!activeClient ? (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-8">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)" }} />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Selectionne un client pour voir ses details</p>
                </div>
              </div>
            ) : detailClient ? (
              <>
                {/* Detail header */}
                <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* Back button (mobile only via CSS) */}
                  <button onClick={() => setActiveClient(null)} className="crm-back-btn p-1 cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: `${platformColor(detailClient)}18`, color: platformColor(detailClient), border: `2px solid ${platformColor(detailClient)}30` }}>
                    {pseudoOf(detailClient).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold" style={{ color: "var(--text)" }}>@{pseudoOf(detailClient)}</span>
                    {activeCode && (
                      <span className="ml-2 text-[11px] font-bold px-1 py-0.5 rounded"
                        style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                        {activeCode.tier?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Quick actions */}
                  <div className="flex items-center gap-1">
                    {activeCode && (
                      <>
                        <button onClick={() => handleCopy(activeCode.code, "hdr-code")} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "none", border: "none" }}>
                          {copied === "hdr-code" ? <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} /> : <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
                        </button>
                        <button onClick={() => handleCopy(`${origin}/m/${model}?access=${activeCode.code}`, "hdr-link")} className="p-1.5 rounded-lg cursor-pointer" style={{ background: "none", border: "none" }}>
                          {copied === "hdr-link" ? <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} /> : <Link2 className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ═══ 3 panels displayed simultaneously ═══ */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-0 xl:gap-0 h-full">

                    {/* LEFT: Messages (conversation) */}
                    <div className="flex flex-col min-h-[300px] xl:min-h-0 xl:h-full" style={{ borderRight: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-1.5 px-4 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                        <MessageCircle className="w-3 h-3" style={{ color: "var(--accent)" }} />
                        <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Messages</span>
                        {detailClient.unreadCount > 0 && (
                          <span className="px-1 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
                            {detailClient.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {detailMessages.length === 0 && (
                          <p className="text-[11px] text-center py-6" style={{ color: "var(--text-muted)" }}>Aucun message</p>
                        )}
                        {detailMessages.map(m => (
                          <div key={m.id} className={`flex ${m.sender_type === "model" || m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[80%] px-3 py-2 rounded-2xl text-xs group relative"
                              style={{
                                background: m.sender_type === "admin" ? "#3B82F6" : m.sender_type === "model" ? "var(--accent)" : "var(--surface)",
                                color: m.sender_type === "model" || m.sender_type === "admin" ? "#fff" : "var(--text)",
                                border: m.sender_type === "client" ? "1px solid var(--border)" : "none",
                              }}>
                              {m.sender_type === "admin" && <span className="text-[11px] font-bold opacity-70 block mb-0.5">SQWENSY Admin</span>}
                              {m.content}
                              <span className="block text-[10px] mt-1 opacity-50">
                                {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <button onClick={() => deleteMessage(m.id)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                                style={{ background: "var(--danger, #DC2626)", border: "none" }}>
                                <Trash2 className="w-2.5 h-2.5 text-white" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div ref={msgEndRef} />
                      </div>
                      {/* Reply */}
                      <div className="flex gap-2 px-3 py-2.5 shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                        <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Repondre..."
                          className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                          onKeyDown={e => { if (e.key === "Enter") sendReply(); }} />
                        <button onClick={sendReply} disabled={!reply.trim()}
                          className="px-3 py-2.5 rounded-xl cursor-pointer disabled:opacity-30" style={{ background: "var(--accent)", border: "none" }}>
                          <Send className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* RIGHT: Profil + Codes stacked */}
                    <div className="overflow-y-auto">
                      {/* ── Profil ── */}
                      <div className="p-3 space-y-3" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                          <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Profil</span>
                        </div>
                        {/* Identity */}
                        <div className="space-y-1.5">
                          {detailClient.pseudo_snap && (
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#997A00" }} />
                              <span className="text-[11px]" style={{ color: "var(--text)" }}>@{detailClient.pseudo_snap}</span>
                            </div>
                          )}
                          {detailClient.pseudo_insta && (
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#C13584" }} />
                              <span className="text-[11px]" style={{ color: "var(--text)" }}>@{detailClient.pseudo_insta}</span>
                            </div>
                          )}
                          {detailClient.firstname && (
                            <span className="text-[11px] block" style={{ color: "var(--text)" }}>{detailClient.firstname}</span>
                          )}
                          {detailClient.phone && (
                            <span className="text-[11px] block" style={{ color: "var(--text-muted)" }}>Tel: {detailClient.phone}</span>
                          )}
                        </div>
                        {/* Stats compact */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="rounded-lg p-2" style={{ background: "var(--bg)" }}>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Tier</p>
                            <p className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{detailClient.tier || "-"}</p>
                          </div>
                          <div className="rounded-lg p-2" style={{ background: "var(--bg)" }}>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Achats</p>
                            <p className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{detailClient.total_tokens_bought || 0}</p>
                          </div>
                          <div className="rounded-lg p-2" style={{ background: "var(--bg)" }}>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Depenses</p>
                            <p className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{detailClient.total_tokens_spent || 0}</p>
                          </div>
                          <div className="rounded-lg p-2" style={{ background: "var(--bg)" }}>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Activite</p>
                            <p className="text-[11px] font-bold" style={{ color: "var(--text)" }}>{detailClient.last_active ? relativeTime(detailClient.last_active) : "-"}</p>
                          </div>
                        </div>
                        {/* Notes */}
                        <textarea defaultValue={detailClient.notes || ""} placeholder="Notes..."
                          className="w-full text-[11px] bg-transparent outline-none resize-none rounded-lg p-2" rows={2}
                          style={{ color: "var(--text)", background: "var(--bg)", border: "1px solid var(--border)" }}
                          onBlur={async (e) => {
                            await fetch("/api/clients", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ id: detailClient.id, notes: e.target.value.trim() }) });
                          }} />
                        {/* Delete */}
                        <button onClick={async () => {
                          if (confirm(`Supprimer @${pseudoOf(detailClient)} ?`)) {
                            await fetch(`/api/clients?id=${detailClient.id}`, { method: "DELETE", headers: authHeaders() });
                            setActiveClient(null); fetchAll();
                          }
                        }} className="w-full py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
                          style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }}>
                          <Trash2 className="w-2.5 h-2.5 inline mr-1" />Supprimer
                        </button>
                      </div>

                      {/* ── Codes ── */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Key className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                            <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Codes</span>
                          </div>
                          <button onClick={() => generateCode(detailClient.id)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                            style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                            + Generer
                          </button>
                        </div>
                        {detailCodes.length === 0 && (
                          <p className="text-[10px] text-center py-3" style={{ color: "var(--text-muted)" }}>Aucun code</p>
                        )}
                        {detailCodes.map(code => {
                          const isActiveCode = code.active && !code.revoked;
                          const tl = codeTimeLeft(code.expiresAt, code.revoked, code.active);
                          return (
                            <div key={code.code} className="rounded-lg p-2" style={{
                              background: "var(--bg)",
                              border: `1px solid ${isActiveCode ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
                            }}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[11px] font-mono font-bold" style={{ color: isActiveCode ? "var(--success)" : "var(--text-muted)" }}>
                                  {code.code}
                                </span>
                                <button onClick={() => handleCopy(code.code, `code-${code.code}`)} className="p-0.5 cursor-pointer" style={{ background: "none", border: "none" }}>
                                  {copied === `code-${code.code}` ? <Check className="w-2.5 h-2.5" style={{ color: "var(--success)" }} /> : <Copy className="w-2.5 h-2.5" style={{ color: "var(--text-muted)" }} />}
                                </button>
                                <button onClick={() => handleCopy(`${origin}/m/${model}?access=${code.code}`, `link-${code.code}`)} className="p-0.5 cursor-pointer" style={{ background: "none", border: "none" }}>
                                  {copied === `link-${code.code}` ? <Check className="w-2.5 h-2.5" style={{ color: "var(--success)" }} /> : <Link2 className="w-2.5 h-2.5" style={{ color: "var(--text-muted)" }} />}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="uppercase font-bold" style={{ color: "var(--text-muted)" }}>{code.tier}</span>
                                <span style={{ color: "var(--text-muted)" }}>{code.type}</span>
                                <span className="flex items-center gap-0.5" style={{ color: isActiveCode ? "var(--success)" : "var(--text-muted)" }}>
                                  <Clock className="w-2.5 h-2.5" />{tl}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* ═══ MERGE MODAL ═══ */}
        {mergeModal && mergeModal.length >= 2 && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMergeModal(null)}>
            <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 md:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <GitMerge className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                  <h3 className="text-sm font-bold flex-1" style={{ color: "var(--text)" }}>Fusionner {mergeModal.length} contacts</h3>
                  <button onClick={() => setMergeModal(null)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
                  Choisis quelle info garder pour chaque champ. Les messages et codes seront fusionnes.
                </p>

                <div className="space-y-3">
                  {([
                    { key: "pseudo_snap", label: "Snap" },
                    { key: "pseudo_insta", label: "Instagram" },
                    { key: "phone", label: "Telephone" },
                    { key: "firstname", label: "Prenom" },
                    { key: "notes", label: "Notes" },
                    { key: "tier", label: "Tier" },
                  ] as const).map(field => {
                    const options = mergeModal.filter(c => c[field.key as keyof Client]);
                    if (options.length === 0) return null;
                    return (
                      <div key={field.key}>
                        <p className="text-[11px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>{field.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {options.map(c => {
                            const val = String(c[field.key as keyof Client] || "");
                            const isChosen = mergeChoices[field.key] === c.id;
                            return (
                              <button key={c.id} onClick={() => setMergeChoices(prev => ({ ...prev, [field.key]: c.id }))}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
                                style={{
                                  background: isChosen ? "rgba(139,92,246,0.15)" : "var(--bg)",
                                  border: `1.5px solid ${isChosen ? "#8B5CF6" : "var(--border)"}`,
                                  color: isChosen ? "#8B5CF6" : "var(--text)",
                                }}>
                                {isChosen && <Check className="w-3 h-3 inline mr-1" />}
                                {val.length > 20 ? val.slice(0, 20) + "..." : val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {(() => {
                    const allCodes = mergeModal.flatMap(c => {
                      const p = c.pseudo_snap || c.pseudo_insta || "";
                      return codes.filter(co => co.client === p && co.active && !co.revoked).map(co => ({ ...co, fromClient: c }));
                    });
                    if (allCodes.length <= 1) return null;
                    return (
                      <div>
                        <p className="text-[11px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>Code actif a garder</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allCodes.map(co => {
                            const isChosen = mergeCodeChoice === co.code;
                            const p = co.fromClient.pseudo_snap || co.fromClient.pseudo_insta || "?";
                            return (
                              <button key={co.code} onClick={() => setMergeCodeChoice(co.code)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer transition-all"
                                style={{
                                  background: isChosen ? "rgba(16,185,129,0.15)" : "var(--bg)",
                                  border: `1.5px solid ${isChosen ? "#10B981" : "var(--border)"}`,
                                  color: isChosen ? "#10B981" : "var(--text-muted)",
                                }}>
                                {isChosen && <Check className="w-3 h-3 inline mr-1" />}
                                {co.code.slice(-6)} ({co.tier}) - @{p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Summary */}
                  <div className="p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <p className="text-[11px] font-bold mb-1" style={{ color: "#8B5CF6" }}>Resume</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      Messages de tous les contacts seront fusionnes.
                      Tous les codes seront transferes.
                      Contacts supprimes : {mergeModal.slice(1).map(c => `@${c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 6)}`).join(", ")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => setMergeModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                    style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    Annuler
                  </button>
                  <button onClick={executeMerge} disabled={merging}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    style={{ background: "#8B5CF6", color: "#fff", border: "none" }}>
                    {merging ? "Fusion..." : `Fusionner`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Responsive CSS ── */}
      <style>{`
        /* Desktop: side-by-side */
        @media (min-width: 768px) {
          .crm-right-panel {
            flex: 1;
            min-width: 0;
          }
          .crm-back-btn {
            display: none !important;
          }
        }
        /* Mobile: right panel overlays */
        @media (max-width: 767px) {
          .crm-right-panel {
            position: absolute;
            inset: 0;
            z-index: 20;
            transform: translateX(100%);
            transition: transform 0.25s ease;
          }
          .crm-right-panel.crm-right-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </OsLayout>
  );
}

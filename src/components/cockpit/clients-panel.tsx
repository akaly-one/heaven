"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useModel } from "@/lib/model-context";
import { toModelId } from "@/lib/model-utils";
import {
  Search, Trash2, Check, X, MessageCircle, Key,
  Copy, Link2, Send, UserPlus, GitMerge, User, Clock,
  ShieldCheck, ShieldX, ShieldAlert, Filter, Package,
  ChevronDown, ChevronRight, Tag, Settings, AlertTriangle,
  Zap, Eye, MoreHorizontal, FolderOpen, List, Grid3x3, Sparkles,
} from "lucide-react";
import type { AccessCode, Message, PackConfig } from "@/types/heaven";
import { isInactive, shouldPurge, formatBelgium, expiresIn, isExpired } from "@/lib/timezone";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

/* ── Types ── */

interface Client {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; tier: string | null; total_tokens_bought: number; total_tokens_spent: number;
  last_active: string | null; notes: string | null; created_at: string;
  firstname?: string | null; phone?: string | null;
  is_verified?: boolean; is_blocked?: boolean;
  verified_status?: "pending" | "verified" | "rejected";
  verified_at?: string | null;
  lead_source?: string | null;
  lead_hook?: string | null;
}

type VerifyFilter = "all" | "pending" | "verified" | "rejected" | "inactive";
type SortMode = "recent" | "unread" | "spending" | "name";

const VERIFY_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B", label: "EN ATTENTE" },
  verified: { bg: "rgba(16,185,129,0.12)", color: "#10B981", label: "VÉRIFIÉ" },
  rejected: { bg: "rgba(220,38,38,0.10)", color: "#DC2626", label: "REJETÉ" },
};

const TIER_COLORS: Record<string, string> = {
  silver: "#C0C0C0", vip: "#E63329", gold: "#D4AF37",
  diamond: "#4F46E5", black: "#8B5CF6", platinum: "#7C3AED",
};

interface ClientEnriched extends Client {
  unreadCount: number;
  lastMessage: Message | null;
  hasAdmin: boolean;
  activeCodes: AccessCode[];
  totalSpent: number;
  isInactive48h: boolean;
  shouldPurge7d: boolean;
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
  if (!active) return "off";
  if (isExpired(expiresAt)) return "exp";
  const d = new Date(expiresAt).getTime() - Date.now();
  if (d > 86_400_000) return `${Math.floor(d / 86_400_000)}j`;
  return `${Math.floor(d / 3_600_000)}h`;
};

/* ══════════════════════════════════════════════ */
/*  Clients CRM — List-first layout               */
/* ══════════════════════════════════════════════ */

export function ClientsPanel() {
  const { currentModel, authHeaders, isRoot } = useModel();
  const model = currentModel ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  /* ── State ── */
  const [clients, setClients] = useState<Client[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [chatClient, setChatClient] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addPseudo, setAddPseudo] = useState("");
  const [addPlatform, setAddPlatform] = useState<"snap" | "insta">("snap");
  const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showGenerateFor, setShowGenerateFor] = useState<string | null>(null);
  const [genTier, setGenTier] = useState("p1");
  const [genDays, setGenDays] = useState(7);
  const [genType, setGenType] = useState<"paid" | "promo" | "gift">("paid");
  const [genPromoCode, setGenPromoCode] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

  /* ── View mode: folder (by pack) or list (classic) ── */
  const [clientViewMode, setClientViewMode] = useState<"folders" | "list">("folders");
  const [clientFolder, setClientFolder] = useState<string | null>(null); // null = all, "p0"-"p5", "custom", "none"

  /* ── Merge modal ── */
  const [mergeModal, setMergeModal] = useState<Client[] | null>(null);
  const [mergeChoices, setMergeChoices] = useState<Record<string, string>>({});
  const [mergeCodeChoice, setMergeCodeChoice] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  /* ── Fetch ── */
  const fetchAll = useCallback(() => {
    if (!model) { setLoading(false); return; }
    Promise.all([
      fetch(`/api/clients?model=${toModelId(model)}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/codes?model=${toModelId(model)}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/messages?model=${toModelId(model)}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/packs?model=${toModelId(model)}`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([cd, co, mg, pk]) => {
      setClients(cd.clients || []);
      setCodes(co.codes || []);
      setMessages(mg.messages || []);
      setPacks(pk.packs || pk || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [model, authHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh messages every 8s when a chat is open
  useEffect(() => {
    if (!chatClient) return;
    const iv = setInterval(() => {
      fetch(`/api/messages?model=${toModelId(model)}`, { headers: authHeaders() }).then(r => r.json())
        .then(mg => setMessages(mg.messages || [])).catch(() => {});
    }, 8000);
    return () => clearInterval(iv);
  }, [chatClient, model, authHeaders]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatClient]);

  /* ── Enriched client list ── */
  const enriched: ClientEnriched[] = useMemo(() => {
    const msgByClient: Record<string, Message[]> = {};
    messages.forEach(m => {
      if (!msgByClient[m.client_id]) msgByClient[m.client_id] = [];
      msgByClient[m.client_id].push(m);
    });
    return clients.map(c => {
      const cMsgs = (msgByClient[c.id] || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const pseudo = pseudoOf(c);
      const clientCodes = codes.filter(co => co.clientId === c.id || co.client === pseudo);
      const activeCodes = clientCodes.filter(co => co.active && !co.revoked && !isExpired(co.expiresAt));
      return {
        ...c,
        unreadCount: cMsgs.filter(m => !m.read && m.sender_type === "client").length,
        lastMessage: cMsgs[0] || null,
        hasAdmin: cMsgs.some(m => m.sender_type === "admin"),
        activeCodes,
        totalSpent: c.total_tokens_spent || 0,
        isInactive48h: isInactive(c.last_active, 48),
        shouldPurge7d: (c.verified_status || "pending") === "pending" && shouldPurge(c.created_at, 7),
      };
    });
  }, [clients, messages, codes]);

  // Sort
  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      // Always: admin messages first, then unread
      if (a.hasAdmin && !b.hasAdmin) return -1;
      if (b.hasAdmin && !a.hasAdmin) return 1;
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

      switch (sortMode) {
        case "spending": return b.totalSpent - a.totalSpent;
        case "name": return pseudoOf(a).localeCompare(pseudoOf(b));
        case "unread": return b.unreadCount - a.unreadCount;
        default: {
          const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
          const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
          return bTime - aTime;
        }
      }
    });
  }, [enriched, sortMode]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (verifyFilter === "inactive") {
      list = list.filter(c => c.isInactive48h);
    } else if (verifyFilter !== "all") {
      list = list.filter(c => (c.verified_status || "pending") === verifyFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.pseudo_snap || c.pseudo_insta || c.firstname || "").toLowerCase().includes(q));
    }
    return list;
  }, [sorted, search, verifyFilter]);

  const pendingCount = enriched.filter(c => (c.verified_status || "pending") === "pending").length;
  const verifiedCount = enriched.filter(c => c.verified_status === "verified").length;
  const inactiveCount = enriched.filter(c => c.isInactive48h).length;
  const totalUnread = enriched.reduce((s, c) => s + c.unreadCount, 0);
  const purgeable = enriched.filter(c => c.shouldPurge7d);

  // ── Tier-based folder grouping ──
  const getClientTier = useCallback((c: ClientEnriched) => {
    if (c.activeCodes.length > 0) return c.activeCodes[0].tier;
    return c.tier || "none";
  }, []);

  const displayClients = useMemo(() => {
    if (clientFolder === null) return filtered;
    if (clientFolder === "visitors") {
      // Visitors = no sub (none/p0) + inactive 48h unverified + purgeable 7d
      return filtered.filter(c => {
        const t = getClientTier(c);
        if (t === "none" || t === "p0") return true;
        if (c.isInactive48h && (c.verified_status || "pending") === "pending") return true;
        if (c.shouldPurge7d) return true;
        return false;
      });
    }
    return filtered.filter(c => getClientTier(c) === clientFolder);
  }, [filtered, clientFolder, getClientTier]);

  /* ── Helpers ── */
  const handleCopy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => setSelected(new Set(filtered.map(c => c.id)));
  const selectNone = () => setSelected(new Set());

  const clientMessagesFor = (id: string) =>
    messages.filter(m => m.client_id === id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  /* ── Actions ── */
  const deleteSelected = async () => {
    if (!confirm(`Supprimer ${selected.size} client(s) ?`)) return;
    for (const id of selected) {
      await fetch(`/api/clients?id=${id}&model=${toModelId(model)}`, { method: "DELETE", headers: authHeaders() });
    }
    selectNone(); fetchAll();
  };

  const addClient = async () => {
    if (!addPseudo.trim()) return;
    const payload: Record<string, unknown> = { model: toModelId(model) };
    if (addPlatform === "snap") payload.pseudo_snap = addPseudo.trim().toLowerCase();
    else payload.pseudo_insta = addPseudo.trim().toLowerCase();
    await fetch("/api/clients", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
    setAddPseudo(""); setShowAdd(false); fetchAll();
  };

  const verifyClient = async (clientId: string, action: "verify" | "reject") => {
    await fetch("/api/clients", {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ id: clientId, model: toModelId(model), action, verified_by: toModelId(model) }),
    });
    fetchAll();
  };

  const runCleanup = async () => {
    if (!confirm("Supprimer tous les pseudos non-vérifiés de plus de 7 jours ?")) return;
    await fetch(`/api/clients/cleanup?model=${toModelId(model)}`, { method: "DELETE", headers: authHeaders() });
    fetchAll();
  };

  const purgeInactive48h = async () => {
    const targets = enriched.filter(c => c.isInactive48h && (c.verified_status || "pending") === "pending");
    if (targets.length === 0) return;
    if (!confirm(`Purger ${targets.length} client(s) inactifs depuis +48h sans vérification ?`)) return;
    for (const c of targets) {
      await fetch(`/api/clients?id=${c.id}&model=${toModelId(model)}`, { method: "DELETE", headers: authHeaders() });
    }
    fetchAll();
  };

  const openChat = async (clientId: string) => {
    setChatClient(clientId);
    setReply("");
    try {
      await fetch("/api/messages", {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ model, client_id: clientId, action: "mark_read" }),
      });
      setMessages(prev => prev.map(m => m.client_id === clientId ? { ...m, read: true } : m));
    } catch {}
  };

  const sendReply = async () => {
    if (!reply.trim() || !chatClient) return;
    await fetch("/api/messages", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ model: toModelId(model), client_id: chatClient, content: reply.trim(), sender_type: "model" }),
    });
    setReply(""); fetchAll();
  };

  const deleteMessage = async (msgId: string) => {
    await fetch(`/api/messages?id=${msgId}&model=${toModelId(model)}`, { method: "DELETE", headers: authHeaders() });
    fetchAll();
  };

  const generateCode = async (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    if (!c || !model) return;
    const pseudo = pseudoOf(c);
    const codeStr = `${model.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await fetch("/api/codes", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ model: toModelId(model), code: codeStr, client: pseudo.toLowerCase(), platform: isSnap(c) ? "snapchat" : "instagram", tier: genTier, duration: genDays * 24, type: genType }),
    });
    setShowGenerateFor(null);
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
      if (Object.keys(updates).length > 0) {
        await fetch("/api/clients", { method: "PATCH", headers: authHeaders(),
          body: JSON.stringify({ id: keepId, model: toModelId(model), ...updates }) });
      }
      const otherIds = mergeModal.slice(1).map(c => c.id);
      const msgPromises = otherIds.flatMap(otherId =>
        messages.filter(m => m.client_id === otherId).map(msg =>
          fetch("/api/messages", { method: "PATCH", headers: authHeaders(),
            body: JSON.stringify({ id: msg.id, client_id: keepId, model: toModelId(model) }) })
        )
      );
      if (msgPromises.length > 0) await Promise.allSettled(msgPromises);
      const keptPseudo = (updates.pseudo_snap || mergeModal[0].pseudo_snap || updates.pseudo_insta || mergeModal[0].pseudo_insta || "") as string;
      const codePromises = mergeModal.slice(1).flatMap(other => {
        const otherPseudo = other.pseudo_snap || other.pseudo_insta || "";
        return codes.filter(c => c.client === otherPseudo).map(code =>
          fetch("/api/codes", { method: "PATCH", headers: authHeaders(),
            body: JSON.stringify({ code: code.code, model: toModelId(model), updates: { client: keptPseudo } }) })
        );
      });
      if (codePromises.length > 0) await Promise.allSettled(codePromises);
      await Promise.allSettled(otherIds.map(id =>
        fetch(`/api/clients?id=${id}&model=${toModelId(model)}`, { method: "DELETE", headers: authHeaders() })
      ));
      setMergeModal(null); selectNone(); fetchAll();
    } catch (err) { console.error("[Merge] error:", err); }
    setMerging(false);
  };

  /* ══════════════════════════════════════════════ */
  /*  Render                                        */
  /* ══════════════════════════════════════════════ */

  if (!model) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {isRoot ? "Sélectionne un modèle dans le header" : "Chargement..."}
        </p>
      </div>
    );
  }

  const detailMessages = chatClient ? clientMessagesFor(chatClient) : [];
  const chatClientData = chatClient ? enriched.find(c => c.id === chatClient) : null;

  return (
    <>
      <div className="min-h-[50vh] flex flex-col" style={{ background: "var(--bg)" }}>

        {/* ── Header bar ── */}
        <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h1 className="text-sm font-bold" style={{ color: "var(--text)" }}>
            Clients
            <span className="ml-1 text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>({clients.length})</span>
          </h1>
          {totalUnread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E" }}>
              {totalUnread} msg
            </span>
          )}
          <div className="flex-1" />
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
            <div className="flex items-center gap-1.5">
              {inactiveCount > 0 && (
                <button onClick={purgeInactive48h} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                  style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <AlertTriangle className="w-3 h-3 inline mr-0.5" />Purge 48h ({inactiveCount})
                </button>
              )}
              {purgeable.length > 0 && (
                <button onClick={runCleanup} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                  style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.12)" }}>
                  Purger 7j+ ({purgeable.length})
                </button>
              )}
              <button onClick={() => setShowAdd(true)} className="px-2 py-1 rounded text-[11px] font-bold cursor-pointer"
                style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                <UserPlus className="w-3 h-3 inline mr-0.5" />Ajouter
              </button>
            </div>
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

        {/* Search + Sort + Filters */}
        <div className="px-3 py-2 shrink-0 space-y-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "var(--text-muted)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full pl-8 pr-2 py-2 rounded-lg text-xs outline-none"
                style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} />
            </div>
            <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
              className="px-2 py-1.5 rounded-lg text-[11px] cursor-pointer outline-none"
              style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              <option value="recent">Récent</option>
              <option value="unread">Non-lus</option>
              <option value="spending">Dépenses</option>
              <option value="name">Nom</option>
            </select>
            <button onClick={selected.size === filtered.length ? selectNone : selectAll}
              className="px-2 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer shrink-0"
              style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              {selected.size === filtered.length && filtered.length > 0 ? "0" : "All"}
            </button>
          </div>
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {([
              { key: "all" as VerifyFilter, label: "Tous", count: clients.length },
              { key: "pending" as VerifyFilter, label: "En attente", count: pendingCount },
              { key: "verified" as VerifyFilter, label: "Vérifiés", count: verifiedCount },
              { key: "inactive" as VerifyFilter, label: "Inactifs 48h+", count: inactiveCount },
            ]).map(f => (
              <button key={f.key} onClick={() => setVerifyFilter(f.key)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 transition-all"
                style={{
                  background: verifyFilter === f.key
                    ? f.key === "pending" ? "rgba(245,158,11,0.15)" : f.key === "verified" ? "rgba(16,185,129,0.15)" : f.key === "inactive" ? "rgba(245,158,11,0.1)" : "var(--accent)"
                    : "var(--bg)",
                  color: verifyFilter === f.key
                    ? f.key === "pending" ? "#F59E0B" : f.key === "verified" ? "#10B981" : f.key === "inactive" ? "#F59E0B" : "#fff"
                    : "var(--text-muted)",
                  border: `1px solid ${verifyFilter === f.key ? "transparent" : "var(--border)"}`,
                }}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════ */}
        {/*  VIEW MODE TOGGLE + FOLDER VIEW     */}
        {/* ═══════════════════════════════════ */}
        {(() => {
          const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
          const surface = "rounded-xl";
          // Paid tier slots only (no "none" — those go to "visitors")
          const paidTierSlots = ["p1", "p2", "p3", "p4", "p5", "custom"];
          const tierLabels: Record<string, string> = { custom: "Custom", visitors: "Visiteurs / À purger" };
          const tierIcons: Record<string, string> = { custom: "✦", visitors: "⚠" };
          const clientsByTier = paidTierSlots.reduce((acc, tier) => {
            acc[tier] = filtered.filter(c => getClientTier(c) === tier);
            return acc;
          }, {} as Record<string, ClientEnriched[]>);
          // "visitors" = no subscription (none/p0) + inactive48h + purgeable — all merged
          const visitorsSet = new Set<string>();
          filtered.forEach(c => {
            const t = getClientTier(c);
            if (t === "none" || t === "p0") visitorsSet.add(c.id);
            if (c.isInactive48h && (c.verified_status || "pending") === "pending") visitorsSet.add(c.id);
            if (c.shouldPurge7d) visitorsSet.add(c.id);
          });
          clientsByTier["visitors"] = filtered.filter(c => visitorsSet.has(c.id));
          const allSlots = [...paidTierSlots, "visitors"];
          const activeTiers = allSlots.filter(t => clientsByTier[t].length > 0);

          return (
            <>
              {/* View mode toggle bar */}
              <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <button onClick={() => setClientViewMode("folders")}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium cursor-pointer border-none transition-colors"
                    style={{ background: clientViewMode === "folders" ? "var(--accent)" : "transparent", color: clientViewMode === "folders" ? "#fff" : "var(--text-muted)" }}>
                    <FolderOpen className="w-3 h-3" /> Dossiers
                  </button>
                  <button onClick={() => { setClientViewMode("list"); setClientFolder(null); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium cursor-pointer border-none transition-colors"
                    style={{ background: clientViewMode === "list" ? "var(--accent)" : "transparent", color: clientViewMode === "list" ? "#fff" : "var(--text-muted)" }}>
                    <List className="w-3 h-3" /> Liste
                  </button>
                </div>
                {clientViewMode === "folders" && clientFolder && (
                  <button onClick={() => setClientFolder(null)} className="text-[11px] font-medium cursor-pointer px-2 py-1 rounded-lg"
                    style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    ← Tous les dossiers
                  </button>
                )}
                <div className="flex-1" />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {clientViewMode === "folders" && clientFolder ? `${displayClients.length} clients` : `${filtered.length} clients`}
                </span>
              </div>

              {/* Folder sidebar view */}
              {clientViewMode === "folders" && !clientFolder && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {/* All clients folder */}
                  <button onClick={() => { setClientViewMode("list"); setClientFolder(null); }}
                    className={`${surface} p-3 text-left cursor-pointer border-none transition-all hover:scale-[1.02] active:scale-[0.98]`}
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Grid3x3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                      <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Tous</span>
                    </div>
                    <div className="text-lg font-black" style={{ color: "var(--accent)" }}>{filtered.length}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>clients</div>
                  </button>

                  {/* Pack folders */}
                  {activeTiers.map(tier => {
                    const isVisitors = tier === "visitors";
                    const count = clientsByTier[tier].length;
                    const tierMeta = TIER_META[tier];
                    const hex = isVisitors ? "#F59E0B" : (TIER_HEX[tier] || (tier === "custom" ? "#D4AF37" : "#888"));
                    const label = isVisitors ? "Visiteurs" : (tierMeta?.label || tierLabels[tier] || tier);
                    const symbol = isVisitors ? "⚠" : (tierMeta?.symbol || tierIcons[tier] || "📁");
                    const pack = packs.find(p => p.id === tier);
                    const tierRevenue = isVisitors ? 0 : codes.filter(c => c.tier === tier && c.type === "paid" && !c.revoked).length * (pack?.price || 0);
                    const inactive48hCount = isVisitors ? clientsByTier[tier].filter(c => c.isInactive48h).length : 0;

                    return (
                      <button key={tier} onClick={() => setClientFolder(tier)}
                        className={`${surface} p-3 text-left cursor-pointer border-none transition-all hover:scale-[1.02] active:scale-[0.98]`}
                        style={{ background: `${hex}08`, border: `1px solid ${hex}${isVisitors ? "30" : "20"}` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{symbol}</span>
                          <span className="text-xs font-bold" style={{ color: isVisitors ? hex : "var(--text)" }}>{label}</span>
                        </div>
                        <div className="text-lg font-black" style={{ color: hex }}>{count}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {isVisitors ? "à purger" : "clients"}
                          </span>
                          {tierRevenue > 0 && <span className="text-[10px] font-bold" style={{ color: hex }}>{fmt.format(tierRevenue)}</span>}
                          {isVisitors && inactive48hCount > 0 && (
                            <span className="text-[10px] font-bold" style={{ color: "#DC2626" }}>{inactive48hCount} &gt;48h</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Folder detail view — show clients in selected folder */}
              {clientViewMode === "folders" && clientFolder && (() => {
                const isVisitors = clientFolder === "visitors";
                const hex = isVisitors ? "#F59E0B" : (TIER_HEX[clientFolder] || (clientFolder === "custom" ? "#D4AF37" : "#64748B"));
                const tierMeta = TIER_META[clientFolder];
                const label = isVisitors ? "Visiteurs / À purger" : (tierMeta?.label || tierLabels[clientFolder] || clientFolder);
                const symbol = isVisitors ? "⚠" : (tierMeta?.symbol || tierIcons[clientFolder] || "📁");
                const inactive48hInFolder = displayClients.filter(c => c.isInactive48h && (c.verified_status || "pending") === "pending").length;
                const purge7dInFolder = displayClients.filter(c => c.shouldPurge7d).length;

                return (
                  <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{symbol}</span>
                      <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${hex}15`, color: hex }}>{displayClients.length}</span>
                      <div className="flex-1" />
                      {isVisitors && displayClients.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {inactive48hInFolder > 0 && (
                            <button onClick={purgeInactive48h} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                              style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
                              <AlertTriangle className="w-3 h-3 inline mr-0.5" />Ban 48h ({inactive48hInFolder})
                            </button>
                          )}
                          {purge7dInFolder > 0 && (
                            <button onClick={runCleanup} className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                              style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.12)" }}>
                              <Trash2 className="w-3 h-3 inline mr-0.5" />Purger 7j+ ({purge7dInFolder})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {isVisitors && (
                      <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
                        Pseudos non vérifiés — accès bloqué après 48h, ban auto du pseudo après 7j
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          );
        })()}

        {/* ═══════════════════════════════════ */}
        {/*  CLIENT LIST — Main content         */}
        {/* ═══════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto" style={{ display: clientViewMode === "folders" && !clientFolder ? "none" : undefined }}>
          {loading && <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Chargement...</p>}
          {!loading && displayClients.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun client dans ce dossier</p>
          )}

          {!loading && displayClients.map(c => {
            const pseudo = pseudoOf(c);
            const isExpanded = expandedClient === c.id;
            const isSelected = selected.has(c.id);
            const tierColor = TIER_COLORS[c.activeCodes[0]?.tier || ""] || "var(--text-muted)";
            const vs = c.verified_status || "pending";
            const isVisitorRow = clientFolder === "visitors" || (vs !== "verified" && c.activeCodes.length === 0);

            // ── Countdown: hours left before 48h auto-ban ──
            const createdMs = new Date(c.created_at).getTime();
            const elapsedMs = Date.now() - createdMs;
            const purge48hMs = 48 * 3600_000;
            const purge7dMs = 7 * 86_400_000;
            const hoursLeft48 = Math.max(0, Math.floor((purge48hMs - elapsedMs) / 3_600_000));
            const daysLeft7 = Math.max(0, Math.ceil((purge7dMs - elapsedMs) / 86_400_000));
            const isPast48h = elapsedMs >= purge48hMs;
            const isPast7d = elapsedMs >= purge7dMs;

            // ── Snap/Insta deep link ──
            const snapLink = c.pseudo_snap ? `https://www.snapchat.com/add/${c.pseudo_snap}` : null;
            const instaLink = c.pseudo_insta ? `https://www.instagram.com/${c.pseudo_insta}` : null;
            const platformLink = snapLink || instaLink;

            /* ═══ VISITOR ROW — compact verification ═══ */
            if (isVisitorRow && vs === "pending") {
              return (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2 relative" style={{ borderBottom: "1px solid var(--border)" }}>
                  <button onClick={() => toggleSelect(c.id)}
                    className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
                    style={{ background: "transparent", border: "none" }}>
                    <span className="w-3.5 h-3.5 rounded flex items-center justify-center"
                      style={{ background: isSelected ? "var(--accent)" : "var(--bg)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}` }}>
                      {isSelected && <Check className="w-2 h-2 text-white" />}
                    </span>
                  </button>
                  {/* Platform icon + pseudo bubble */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full shrink-0"
                    style={{ background: `${platformColor(c)}12`, border: `1px solid ${platformColor(c)}25` }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: platformColor(c) }} />
                    <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>@{pseudo}</span>
                  </div>
                  {/* Countdown timer */}
                  {isPast7d ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626" }}>BANNI</span>
                  ) : isPast48h ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />{daysLeft7}j ban
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(255,255,255,0.04)", color: hoursLeft48 < 12 ? "#F59E0B" : "var(--text-muted)" }}>
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />{hoursLeft48}h
                    </span>
                  )}
                  <div className="flex-1" />
                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowGenerateFor(showGenerateFor === c.id ? null : c.id)}
                      className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                      style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <Key className="w-3 h-3 inline mr-0.5" />Code
                    </button>
                    {platformLink && (
                      <a href={platformLink} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 rounded text-[10px] font-bold no-underline"
                        style={{ background: `${platformColor(c)}10`, color: platformColor(c), border: `1px solid ${platformColor(c)}20` }}>
                        <Send className="w-3 h-3 inline mr-0.5" />{isSnap(c) ? "Snap" : "Insta"}
                      </a>
                    )}
                    <button onClick={() => verifyClient(c.id, "verify")}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }} title="Valider">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => verifyClient(c.id, "reject")}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }} title="Faux — bannir">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Generate code popover */}
                  {showGenerateFor === c.id && (
                    <div className="absolute right-3 top-full z-40 w-64 rounded-xl p-3 space-y-2"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                      onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Activation @{pseudo}</span>
                        <button onClick={() => setShowGenerateFor(null)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}><X className="w-3 h-3" /></button>
                      </div>
                      <button onClick={() => generateCode(c.id)} className="w-full py-2 rounded-lg text-[11px] font-bold cursor-pointer"
                        style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                        Générer code d'activation
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            /* ═══ REJECTED ROW — banned pseudo archive ═══ */
            if (isVisitorRow && vs === "rejected") {
              return (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2 opacity-50" style={{ borderBottom: "1px solid var(--border)" }}>
                  <button onClick={() => toggleSelect(c.id)}
                    className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
                    style={{ background: "transparent", border: "none" }}>
                    <span className="w-3.5 h-3.5 rounded flex items-center justify-center"
                      style={{ background: isSelected ? "var(--accent)" : "var(--bg)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}` }}>
                      {isSelected && <Check className="w-2 h-2 text-white" />}
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                    style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.12)" }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: platformColor(c) }} />
                    <span className="text-[11px] font-bold line-through" style={{ color: "var(--text-muted)" }}>@{pseudo}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>BANNI</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatBelgium(c.created_at, "short")}</span>
                  <div className="flex-1" />
                  <button onClick={() => verifyClient(c.id, "verify")}
                    className="px-2 py-1 rounded text-[10px] cursor-pointer"
                    style={{ background: "rgba(16,185,129,0.06)", color: "#10B981", border: "1px solid rgba(16,185,129,0.12)" }} title="Restaurer si erreur">
                    Restaurer
                  </button>
                  <button onClick={async () => {
                    await fetch(`/api/clients?id=${c.id}&model=${toModelId(model)}`, { method: "DELETE", headers: authHeaders() });
                    fetchAll();
                  }} className="p-1 cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }} title="Supprimer définitivement">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            /* ═══ STANDARD ROW — paid/verified clients ═══ */
            return (
              <div key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                {/* ── Client row ── */}
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
                  style={{
                    borderLeft: isExpanded ? "3px solid var(--accent)" : "3px solid transparent",
                  }}
                  onClick={() => setExpandedClient(isExpanded ? null : c.id)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}
                    className="w-7 h-7 flex items-center justify-center shrink-0 cursor-pointer"
                    style={{ background: "transparent", border: "none" }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ background: isSelected ? "var(--accent)" : "var(--bg)", border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}` }}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                  </button>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 relative"
                    style={{
                      background: c.unreadCount > 0 ? `${platformColor(c)}18` : "rgba(255,255,255,0.04)",
                      color: c.unreadCount > 0 ? platformColor(c) : "var(--text-muted)",
                      border: `2px solid ${platformColor(c)}30`,
                    }}>
                    {pseudo.charAt(0).toUpperCase()}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                      style={{ background: platformColor(c), borderColor: "var(--bg)" }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>@{pseudo}</span>
                      {vs === "verified" && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>✓</span>
                      )}
                      {vs === "pending" && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                          style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>?</span>
                      )}
                      {c.activeCodes.length > 0 && (
                        <span className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0"
                          style={{ background: `${tierColor}15`, color: tierColor }}>
                          {c.activeCodes[0].tier?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.lastMessage ? (
                        <p className="text-[11px] truncate flex-1" style={{ color: c.unreadCount > 0 ? "var(--text)" : "var(--text-muted)" }}>
                          {c.lastMessage.sender_type === "admin" ? "Admin: " : c.lastMessage.sender_type === "model" ? "Toi: " : ""}
                          {c.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-[11px] flex-1" style={{ color: "var(--text-muted)" }}>Pas de messages</p>
                      )}
                      {c.totalSpent > 0 && (
                        <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--success, #10B981)" }}>
                          {c.totalSpent}€
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: time, unread, expand */}
                  <div className="flex items-center gap-2 shrink-0">
                    {c.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center"
                        style={{ background: c.hasAdmin ? "#3B82F6" : "var(--accent)", color: "#fff" }}>
                        {c.unreadCount}
                      </span>
                    )}
                    {c.lastMessage && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {relativeTime(c.lastMessage.created_at)}
                      </span>
                    )}
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
                  </div>
                </div>

                {/* ── Expanded detail panel ── */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3" style={{ background: "var(--surface)" }}>
                    {/* Action bar */}
                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={(e) => { e.stopPropagation(); openChat(c.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer"
                        style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>
                        <MessageCircle className="w-3 h-3" />Chatter
                        {c.unreadCount > 0 && <span className="px-1 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#3B82F6", color: "#fff" }}>{c.unreadCount}</span>}
                      </button>
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowGenerateFor(showGenerateFor === c.id ? null : c.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer"
                          style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                          <Key className="w-3 h-3" />Générer
                        </button>
                        {/* ── Generate popover ── */}
                        {showGenerateFor === c.id && (
                          <div className="absolute left-0 top-full mt-1 z-40 w-72 rounded-xl p-3 space-y-3"
                            style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                            onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Générer accès</span>
                              <button onClick={() => setShowGenerateFor(null)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            {/* Pack selection */}
                            <div>
                              <p className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>PACK</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {packs.filter(p => p.active).map(p => (
                                  <button key={p.id} onClick={() => setGenTier(p.id)}
                                    className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                    style={{
                                      background: genTier === p.id ? `${p.color}20` : "rgba(255,255,255,0.03)",
                                      border: `1.5px solid ${genTier === p.id ? p.color : "var(--border)"}`,
                                      color: genTier === p.id ? p.color : "var(--text-muted)",
                                    }}>
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                                    {p.name} · {p.price}€
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Duration */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>DURÉE</p>
                                <span className="text-[11px] font-bold" style={{ color: "var(--accent)" }}>{genDays}j</span>
                              </div>
                              <input type="range" min={1} max={30} value={genDays} onChange={e => setGenDays(Number(e.target.value))}
                                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                                style={{ background: `linear-gradient(to right, var(--accent) ${(genDays / 30) * 100}%, var(--border) ${(genDays / 30) * 100}%)` }} />
                            </div>
                            {/* Type */}
                            <div>
                              <p className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>TYPE</p>
                              <div className="flex gap-1.5">
                                {(["paid", "promo", "gift"] as const).map(t => (
                                  <button key={t} onClick={() => setGenType(t)}
                                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
                                    style={{
                                      background: genType === t ? "var(--accent)" : "rgba(255,255,255,0.03)",
                                      color: genType === t ? "#fff" : "var(--text-muted)",
                                      border: `1px solid ${genType === t ? "var(--accent)" : "var(--border)"}`,
                                    }}>
                                    {t === "paid" ? "Payé" : t === "promo" ? "Promo" : "Cadeau"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Promo code */}
                            {genType === "promo" && (
                              <div>
                                <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>CODE PROMO (optionnel)</p>
                                <input value={genPromoCode} onChange={e => setGenPromoCode(e.target.value.toUpperCase())}
                                  placeholder="Ex: SUMMER25"
                                  className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none font-mono"
                                  style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} />
                              </div>
                            )}
                            <button onClick={() => generateCode(c.id)}
                              className="w-full py-2 rounded-lg text-[11px] font-bold cursor-pointer"
                              style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                              Générer le code
                            </button>
                          </div>
                        )}
                      </div>
                      {platformLink && (
                        <a href={platformLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold no-underline"
                          style={{ background: `${platformColor(c)}10`, color: platformColor(c), border: `1px solid ${platformColor(c)}20` }}
                          onClick={e => e.stopPropagation()}>
                          <Send className="w-3 h-3" />Ouvrir {isSnap(c) ? "Snap" : "Insta"}
                        </a>
                      )}
                      {vs === "pending" && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); verifyClient(c.id, "verify"); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }} title="Valider">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); verifyClient(c.id, "reject"); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(220,38,38,0.06)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.15)" }} title="Faux — bannir">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <div className="flex-1" />
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer @${pseudo} ?`)) {
                          await fetch(`/api/clients?id=${c.id}&model=${toModelId(model)}`, { method: "DELETE", headers: authHeaders() });
                          setExpandedClient(null); fetchAll();
                        }
                      }} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Client detail grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {/* Identity */}
                      <div className="rounded-lg p-2.5 space-y-1" style={{ background: "var(--bg)" }}>
                        <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Identité</p>
                        {c.pseudo_snap && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: "#997A00" }} />
                            <span className="text-[11px]" style={{ color: "var(--text)" }}>@{c.pseudo_snap}</span>
                          </div>
                        )}
                        {c.pseudo_insta && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: "#C13584" }} />
                            <span className="text-[11px]" style={{ color: "var(--text)" }}>@{c.pseudo_insta}</span>
                          </div>
                        )}
                        {c.firstname && <span className="text-[11px] block" style={{ color: "var(--text)" }}>{c.firstname}</span>}
                      </div>
                      {/* Stats */}
                      <div className="rounded-lg p-2.5 space-y-1" style={{ background: "var(--bg)" }}>
                        <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Stats</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Dépensé</span>
                          <span className="text-[11px] font-bold" style={{ color: c.totalSpent > 0 ? "var(--success, #10B981)" : "var(--text-muted)" }}>{c.totalSpent}€</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Activité</span>
                          <span className="text-[11px] font-bold" style={{ color: c.isInactive48h ? "#F59E0B" : "var(--text)" }}>
                            {c.last_active ? relativeTime(c.last_active) : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Créé</span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatBelgium(c.created_at, "short")}</span>
                        </div>
                      </div>
                      {/* Active codes */}
                      <div className="rounded-lg p-2.5 space-y-1" style={{ background: "var(--bg)" }}>
                        <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Codes actifs</p>
                        {c.activeCodes.length === 0 ? (
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aucun</p>
                        ) : c.activeCodes.map(code => (
                          <div key={code.code} className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold" style={{ color: "var(--success, #10B981)" }}>{code.code}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleCopy(code.code, `c-${code.code}`); }} className="cursor-pointer" style={{ background: "none", border: "none" }}>
                              {copied === `c-${code.code}` ? <Check className="w-2.5 h-2.5" style={{ color: "var(--success)" }} /> : <Copy className="w-2.5 h-2.5" style={{ color: "var(--text-muted)" }} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleCopy(`${origin}/m/${model}?access=${code.code}`, `l-${code.code}`); }} className="cursor-pointer" style={{ background: "none", border: "none" }}>
                              {copied === `l-${code.code}` ? <Check className="w-2.5 h-2.5" style={{ color: "var(--success)" }} /> : <Link2 className="w-2.5 h-2.5" style={{ color: "var(--text-muted)" }} />}
                            </button>
                            <span className="text-[9px] ml-auto" style={{ color: "var(--text-muted)" }}>
                              {codeTimeLeft(code.expiresAt, code.revoked, code.active)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Notes */}
                      <div className="rounded-lg p-2.5" style={{ background: "var(--bg)" }}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
                        <textarea defaultValue={c.notes || ""} placeholder="Notes..."
                          className="w-full text-[11px] bg-transparent outline-none resize-none" rows={3}
                          style={{ color: "var(--text)" }}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={async (e) => {
                            await fetch("/api/clients", { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ id: c.id, model, notes: e.target.value.trim() }) });
                          }} />
                      </div>
                    </div>

                    {/* Lead source */}
                    {c.lead_source && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--bg)" }}>
                        <Zap className="w-3 h-3" style={{ color: "var(--accent)" }} />
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Source:</span>
                        <span className="text-[10px] font-bold" style={{ color: "var(--text)" }}>
                          {c.lead_source === "private_story" ? "Story privée" : c.lead_source === "beacon" ? "BEACON" : c.lead_source}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════ */}
        {/*  CHAT DRAWER — slides from right    */}
        {/* ═══════════════════════════════════ */}
        {chatClient && chatClientData && (
          <div className="fixed inset-0 z-50 flex" onClick={() => setChatClient(null)}>
            {/* Backdrop */}
            <div className="flex-1" style={{ background: "rgba(0,0,0,0.4)" }} />
            {/* Chat panel */}
            <div className="w-full max-w-md flex flex-col animate-slide-in-right"
              style={{ background: "var(--bg)", borderLeft: "1px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setChatClient(null)} className="p-1 cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                  <X className="w-4 h-4" />
                </button>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: `${platformColor(chatClientData)}18`, color: platformColor(chatClientData) }}>
                  {pseudoOf(chatClientData).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>@{pseudoOf(chatClientData)}</span>
                  {chatClientData.activeCodes[0] && (
                    <span className="ml-2 text-[10px] font-bold px-1 py-0.5 rounded"
                      style={{ background: "rgba(16,185,129,0.1)", color: "var(--success, #10B981)" }}>
                      {chatClientData.activeCodes[0].tier?.toUpperCase()}
                    </span>
                  )}
                </div>
                {chatClientData.activeCodes[0] && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleCopy(chatClientData.activeCodes[0].code, "chat-code")} className="p-1 cursor-pointer" style={{ background: "none", border: "none" }}>
                      {copied === "chat-code" ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Copy className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                    </button>
                    <button onClick={() => handleCopy(`${origin}/m/${model}?access=${chatClientData.activeCodes[0].code}`, "chat-link")} className="p-1 cursor-pointer" style={{ background: "none", border: "none" }}>
                      {copied === "chat-link" ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Link2 className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                    </button>
                  </div>
                )}
              </div>
              {/* Messages */}
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
                      {m.sender_type === "admin" && <span className="text-[10px] font-bold opacity-70 block mb-0.5">SQWENSY Admin</span>}
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
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Répondre..."
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                  onKeyDown={e => { if (e.key === "Enter") sendReply(); }} />
                <button onClick={sendReply} disabled={!reply.trim()}
                  className="px-3 py-2.5 rounded-xl cursor-pointer disabled:opacity-30" style={{ background: "var(--accent)", border: "none" }}>
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

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
                  Choisis quelle info garder pour chaque champ. Les messages et codes seront fusionnés.
                </p>

                <div className="space-y-3">
                  {([
                    { key: "pseudo_snap", label: "Snap" },
                    { key: "pseudo_insta", label: "Instagram" },
                    { key: "phone", label: "Téléphone" },
                    { key: "firstname", label: "Prénom" },
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
                        <p className="text-[11px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>Code actif à garder</p>
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

                  <div className="p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <p className="text-[11px] font-bold mb-1" style={{ color: "#8B5CF6" }}>Résumé</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      Messages de tous les contacts seront fusionnés.
                      Codes transférés.
                      Supprimés : {mergeModal.slice(1).map(c => `@${c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 6)}`).join(", ")}
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
                    {merging ? "Fusion..." : "Fusionner"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CSS ── */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}

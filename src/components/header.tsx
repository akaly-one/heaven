"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Users, Link2, ExternalLink, Globe, Instagram, X, KeyRound, Clock, Key, ArrowRight } from "lucide-react";
import { useModel } from "@/lib/model-context";

// ── Page titles ──
const PAGE_TITLES: Record<string, string> = {
  "/agence": "Dashboard", "/agence/clients": "Clients", "/agence/pipeline": "Contenu",
  "/agence/strategie": "Strategie", "/agence/finances": "Finances",
  "/agence/automation": "Automation", "/agence/architecture": "Architecture",
  "/agence/settings": "Settings", "/agence/cms": "CMS",
};

// ── Platforms ──
const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#C13584", urlPrefix: "https://instagram.com/" },
  { id: "snapchat", label: "Snapchat", icon: Globe, color: "#C4A600", urlPrefix: "https://snapchat.com/add/" },
  { id: "onlyfans", label: "OnlyFans", icon: Globe, color: "#008CCF", urlPrefix: "https://onlyfans.com/" },
  { id: "fanvue", label: "Fanvue", icon: Globe, color: "#6D28D9", urlPrefix: "https://fanvue.com/" },
  { id: "mym", label: "MYM", icon: Globe, color: "#CC2952", urlPrefix: "https://mym.fans/" },
  { id: "tiktok", label: "TikTok", icon: Globe, color: "#333333", urlPrefix: "https://tiktok.com/@" },
];

type DropdownId = "messages" | "clients" | "socials" | null;

interface MessageItem {
  id: string; client_id: string; content: string; created_at: string;
  sender_type: string; read?: boolean; model?: string;
}
interface ClientItem {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; tier: string | null; last_active: string | null; created_at: string;
}
interface CodeItem {
  code: string; client: string; tier: string; active: boolean;
  revoked: boolean; expiresAt: string;
}

export function Header() {
  const pathname = usePathname();
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || null;

  const [modelInfo, setModelInfo] = useState<{
    display_name?: string; online?: boolean;
    platforms?: Record<string, string | null>;
  } | null>(null);

  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [recentMessages, setRecentMessages] = useState<MessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [codes, setCodes] = useState<CodeItem[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageTitle = PAGE_TITLES[pathname] || pathname.split("/").pop()?.replace(/-/g, " ") || "";

  // ── Close on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch model info ──
  useEffect(() => {
    if (!modelSlug) return;
    fetch(`/api/models/${modelSlug}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setModelInfo(d); }).catch(() => {});
  }, [modelSlug, authHeaders]);

  // ── Fetch messages ──
  const fetchMessages = useCallback(() => {
    if (!modelSlug) return;
    fetch(`/api/messages?model=${modelSlug}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const msgs: MessageItem[] = d.messages || [];
        setRecentMessages(msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10));
        setUnreadCount(msgs.filter(m => m.sender_type === "client" && !m.read).length);
      }).catch(() => {});
  }, [modelSlug, authHeaders]);

  // ── Fetch clients + codes ──
  const fetchClients = useCallback(() => {
    if (!modelSlug) return;
    Promise.all([
      fetch(`/api/clients?model=${modelSlug}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch(`/api/codes?model=${modelSlug}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
    ]).then(([cd, co]) => {
      if (cd) setClients(cd.clients || []);
      if (co) setCodes(co.codes || []);
    }).catch(() => {});
  }, [modelSlug, authHeaders]);

  // ── Initial + polling ──
  useEffect(() => {
    fetchMessages(); fetchClients();
    const iv = setInterval(fetchMessages, 15000);
    return () => clearInterval(iv);
  }, [fetchMessages, fetchClients]);

  // ── Save platform ──
  const handleSavePlatform = async (platformId: string, value: string) => {
    const updated = { ...(modelInfo?.platforms || {}), [platformId]: value || null };
    await fetch(`/api/models/${modelSlug}`, { method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ config: { platforms: updated } }) }).catch(() => {});
    setModelInfo(prev => prev ? { ...prev, platforms: updated } : prev);
  };

  const toggle = (id: DropdownId) => setOpenDropdown(prev => prev === id ? null : id);
  const activeCodes = codes.filter(c => c.active && !c.revoked && new Date(c.expiresAt).getTime() > Date.now());
  const pseudoOf = (c: ClientItem) => c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 8);

  // ── Dropdown box styling ──
  const dropdownBox = "absolute top-[calc(100%+4px)] w-[340px] sm:w-[380px] max-h-[70vh] rounded-2xl overflow-hidden shadow-xl";
  const dropdownStyle = { background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" };

  return (
    <header className="flex items-center h-12 px-3 sm:px-4"
      style={{ background: "var(--surface)",
        borderBottom: "1px solid var(--border)" }}>

      {/* Left — Model + page */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full shrink-0"
            style={{ background: modelInfo?.online ? "#10B981" : "#EF4444",
              boxShadow: modelInfo?.online ? "0 0 6px rgba(16,185,129,0.4)" : "none" }} />
          <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
            {modelInfo?.display_name || auth?.display_name || modelSlug?.toUpperCase() || "HEAVEN"}
          </span>
        </div>
        {pageTitle && <>
          <span className="text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.4 }}>/</span>
          <span className="text-xs font-medium truncate capitalize" style={{ color: "var(--text-muted)" }}>{pageTitle}</span>
        </>}
      </div>

      {/* Center — Générer */}
      <button onClick={() => window.dispatchEvent(new Event("heaven:generate"))}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 mx-2"
        style={{ background: "linear-gradient(135deg, var(--accent), #F43F5E)", color: "#fff", border: "none",
          boxShadow: "0 2px 8px rgba(230,51,41,0.25)" }}>
        <KeyRound className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Générer</span>
      </button>

      {/* Right — 3 buttons with dropdowns */}
      <div className="flex items-center gap-1" ref={dropdownRef}>

        {/* ═══ MESSAGES ═══ */}
        <div className="relative">
          <button onClick={() => toggle("messages")}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: openDropdown === "messages" ? "rgba(0,0,0,0.08)" : "transparent", border: "none", color: "var(--text-muted)" }}
            title="Messages">
            <MessageCircle className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                style={{ background: "var(--accent)", color: "#fff", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {openDropdown === "messages" && (
            <div className={`${dropdownBox} right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2`} style={dropdownStyle}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Messages</span>
                <button onClick={() => setOpenDropdown(null)} className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                  style={{ background: "none", border: "none", color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                {recentMessages.length === 0 ? (
                  <p className="text-[11px] text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun message</p>
                ) : recentMessages.map(m => (
                  <div key={m.id} className="flex items-start gap-2.5 px-4 py-2.5 transition-colors"
                    style={{ borderBottom: "1px solid var(--border)", background: !m.read && m.sender_type === "client" ? "rgba(230,51,41,0.05)" : "transparent" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{ background: m.sender_type === "client" ? "rgba(0,0,0,0.08)" : "rgba(230,51,41,0.12)",
                        color: m.sender_type === "client" ? "var(--text-muted)" : "var(--accent)" }}>
                      {m.sender_type === "client" ? (m.client_id?.charAt(0)?.toUpperCase() || "?") : "M"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>
                          {m.sender_type === "client" ? m.client_id?.slice(0, 12) : "Vous"}
                        </span>
                        <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                          {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{m.content}</p>
                    </div>
                    {!m.read && m.sender_type === "client" && (
                      <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: "var(--accent)" }} />
                    )}
                  </div>
                ))}
              </div>
              <a href="/agence/clients" className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold no-underline"
                style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
                Voir tout <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* ═══ CLIENTS & CODES ═══ */}
        <div className="relative">
          <button onClick={() => toggle("clients")}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: openDropdown === "clients" ? "rgba(0,0,0,0.08)" : "transparent", border: "none", color: "var(--text-muted)" }}
            title="Clients & Codes">
            <Users className="w-[18px] h-[18px]" />
            {clients.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                style={{ background: "var(--text-muted)", color: "var(--bg)", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>
                {clients.length}
              </span>
            )}
          </button>
          {openDropdown === "clients" && (
            <div className={`${dropdownBox} right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2`} style={dropdownStyle}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                  Clients & Codes
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                    {activeCodes.length} actif{activeCodes.length > 1 ? "s" : ""} / {clients.length} client{clients.length > 1 ? "s" : ""}
                  </span>
                  <button onClick={() => setOpenDropdown(null)} className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                    style={{ background: "none", border: "none", color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                {clients.length === 0 ? (
                  <p className="text-[11px] text-center py-8" style={{ color: "var(--text-muted)" }}>Aucun client</p>
                ) : clients.slice(0, 15).map(c => {
                  const pseudo = pseudoOf(c);
                  const clientCodes = codes.filter(co => co.client?.toLowerCase() === pseudo.toLowerCase());
                  const activeCode = clientCodes.find(co => co.active && !co.revoked && new Date(co.expiresAt).getTime() > Date.now());
                  return (
                    <div key={c.id} className="flex items-center gap-2.5 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: c.pseudo_snap ? "rgba(153,122,0,0.12)" : "rgba(193,53,132,0.12)",
                          color: c.pseudo_snap ? "#997A00" : "#C13584" }}>
                        {pseudo.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold truncate block" style={{ color: "var(--text)" }}>@{pseudo}</span>
                        {activeCode ? (
                          <span className="text-[10px]" style={{ color: "#10B981" }}>
                            <Key className="w-2.5 h-2.5 inline mr-0.5" />{activeCode.code} · {activeCode.tier?.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />Pas de code actif
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href="/agence/clients" className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold no-underline"
                style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
                Gestion complete <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* ═══ SOCIAL LINKS ═══ */}
        <div className="relative">
          <button onClick={() => toggle("socials")}
            className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: openDropdown === "socials" ? "rgba(0,0,0,0.08)" : "transparent", border: "none", color: "var(--text-muted)" }}
            title="Reseaux sociaux">
            <Link2 className="w-[18px] h-[18px]" />
          </button>
          {openDropdown === "socials" && (
            <div className={`${dropdownBox} right-0`} style={dropdownStyle}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Reseaux sociaux</span>
                <button onClick={() => setOpenDropdown(null)} className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                  style={{ background: "none", border: "none", color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-3 space-y-1.5">
                {PLATFORMS.map(p => {
                  const handle = modelInfo?.platforms?.[p.id] || "";
                  return (
                    <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="text-[11px] font-medium shrink-0 w-16" style={{ color: "var(--text-muted)" }}>{p.label}</span>
                      <input defaultValue={handle} placeholder="pseudo..."
                        className="flex-1 text-[11px] bg-transparent outline-none min-w-0" style={{ color: "var(--text)" }}
                        onBlur={e => handleSavePlatform(p.id, e.target.value.trim())}
                        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                      {handle && (
                        <a href={handle.startsWith("http") ? handle : `${p.urlPrefix}${handle}`}
                          target="_blank" rel="noopener noreferrer"
                          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md no-underline" style={{ color: p.color }}>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

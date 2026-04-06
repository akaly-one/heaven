"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, Users, Link2, ExternalLink, Globe, Instagram, X, KeyRound } from "lucide-react";
import { useModel } from "@/lib/model-context";

// ── Page titles by pathname ──
const PAGE_TITLES: Record<string, string> = {
  "/agence": "Dashboard",
  "/agence/clients": "Clients",
  "/agence/pipeline": "Contenu",
  "/agence/strategie": "Strategie",
  "/agence/finances": "Finances",
  "/agence/automation": "Automation",
  "/agence/architecture": "Architecture",
  "/agence/settings": "Settings",
  "/agence/cms": "CMS",
  "/agence/media": "Media",
  "/agence/messages": "Messages",
  "/agence/simulateur": "Simulateur",
};

// ── Platforms config ──
const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#C13584", urlPrefix: "https://instagram.com/" },
  { id: "snapchat", label: "Snapchat", icon: Globe, color: "#C4A600", urlPrefix: "https://snapchat.com/add/" },
  { id: "onlyfans", label: "OnlyFans", icon: Globe, color: "#008CCF", urlPrefix: "https://onlyfans.com/" },
  { id: "fanvue", label: "Fanvue", icon: Globe, color: "#6D28D9", urlPrefix: "https://fanvue.com/" },
  { id: "mym", label: "MYM", icon: Globe, color: "#CC2952", urlPrefix: "https://mym.fans/" },
  { id: "tiktok", label: "TikTok", icon: Globe, color: "#333333", urlPrefix: "https://tiktok.com/@" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  // ── State ──
  const [modelInfo, setModelInfo] = useState<{
    display_name?: string;
    online?: boolean;
    platforms?: Record<string, string | null>;
  } | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<"socials" | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Page title from pathname ──
  const pageTitle = PAGE_TITLES[pathname] || pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard";

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch model info ──
  useEffect(() => {
    const headers = authHeaders();
    fetch(`/api/models/${modelSlug}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setModelInfo(d); })
      .catch(() => {});
  }, [modelSlug, authHeaders]);

  // ── Fetch unread messages ──
  const fetchUnread = useCallback(() => {
    const headers = authHeaders();
    fetch(`/api/messages?model=${modelSlug}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const msgs = d.messages || [];
        const count = msgs.filter((m: { sender_type: string; read?: boolean }) => m.sender_type === "client" && !m.read).length;
        setUnreadCount(count);
      })
      .catch(() => {});
  }, [modelSlug, authHeaders]);

  // ── Fetch client count ──
  const fetchClients = useCallback(() => {
    const headers = authHeaders();
    fetch(`/api/clients?model=${modelSlug}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setClientCount((d.clients || []).length); })
      .catch(() => {});
  }, [modelSlug, authHeaders]);

  // ── Initial fetch + polling every 15s ──
  useEffect(() => {
    fetchUnread();
    fetchClients();
    const iv = setInterval(() => { fetchUnread(); }, 15000);
    return () => clearInterval(iv);
  }, [fetchUnread, fetchClients]);

  // ── Handle save platform ──
  const handleSavePlatform = async (platformId: string, value: string) => {
    try {
      const currentPlatforms = modelInfo?.platforms || {};
      const updated = { ...currentPlatforms, [platformId]: value || null };
      await fetch(`/api/models/${modelSlug}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ config: { platforms: updated } }),
      });
      setModelInfo(prev => prev ? { ...prev, platforms: updated } : prev);
    } catch {}
  };

  return (
    <header
      className="sticky top-0 z-50 flex items-center h-12 px-3 sm:px-4"
      style={{
        background: "color-mix(in srgb, var(--surface) 85%, transparent)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left — Model name + page title */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: modelInfo?.online ? "#10B981" : "#EF4444",
              boxShadow: modelInfo?.online ? "0 0 6px rgba(16,185,129,0.4)" : "none",
            }}
          />
          <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
            {modelInfo?.display_name || auth?.display_name || modelSlug.toUpperCase()}
          </span>
        </div>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)", opacity: 0.5 }}>/</span>
        <span className="text-xs font-medium truncate capitalize" style={{ color: "var(--text-muted)" }}>
          {pageTitle}
        </span>
      </div>

      {/* Center — Generate code button */}
      <button
        onClick={() => window.dispatchEvent(new Event("heaven:generate"))}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0 mx-2"
        style={{
          background: "linear-gradient(135deg, var(--accent), #F43F5E)",
          color: "#fff",
          border: "none",
          boxShadow: "0 2px 8px rgba(230,51,41,0.25)",
        }}
      >
        <KeyRound className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Générer</span>
      </button>

      {/* Right — Action buttons */}
      <div className="flex items-center gap-1.5" ref={dropdownRef}>

        {/* Button 1: Messages */}
        <button
          onClick={() => router.push("/agence/clients")}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: "transparent", border: "none", color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          title="Messages"
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
              style={{
                background: "var(--accent, #E63329)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Button 2: Codes & Clients */}
        <button
          onClick={() => router.push("/agence/clients")}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: "transparent", border: "none", color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          title="Codes & Clients"
        >
          <Users className="w-[18px] h-[18px]" />
          {clientCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
              style={{ background: "var(--text-muted)", color: "var(--bg)", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}
            >
              {clientCount}
            </span>
          )}
        </button>

        {/* Button 3: Reseaux sociaux */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === "socials" ? null : "socials")}
            className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{
              background: openDropdown === "socials" ? "rgba(0,0,0,0.08)" : "transparent",
              border: "none",
              color: "var(--text-muted)",
            }}
            onMouseEnter={e => { if (openDropdown !== "socials") e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
            onMouseLeave={e => { if (openDropdown !== "socials") e.currentTarget.style.background = "transparent"; }}
            title="Reseaux sociaux"
          >
            <Link2 className="w-[18px] h-[18px]" />
          </button>

          {/* Socials dropdown */}
          {openDropdown === "socials" && (
            <div
              className="absolute right-0 top-11 w-[300px] rounded-2xl overflow-hidden shadow-lg"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                  Reseaux sociaux
                </span>
                <button
                  onClick={() => setOpenDropdown(null)}
                  className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                  style={{ background: "none", border: "none", color: "var(--text-muted)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-1.5">
                {PLATFORMS.map(p => {
                  const handle = modelInfo?.platforms?.[p.id] || "";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: p.color }}
                      />
                      <span
                        className="text-[11px] font-medium shrink-0 w-16"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {p.label}
                      </span>
                      <input
                        defaultValue={handle}
                        placeholder="pseudo..."
                        className="flex-1 text-[11px] bg-transparent outline-none min-w-0"
                        style={{ color: "var(--text)" }}
                        onBlur={(e) => handleSavePlatform(p.id, e.target.value.trim())}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                      {handle && (
                        <a
                          href={handle.startsWith("http") ? handle : `${p.urlPrefix}${handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-colors no-underline"
                          style={{ color: p.color }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
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

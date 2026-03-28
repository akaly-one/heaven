"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, KeyRound, Eye, Pencil, Wifi, WifiOff, Instagram, Globe, ExternalLink, Send, Image, Heart, MessageCircle, Trash2, ChevronDown } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { StatCards } from "@/components/cockpit/stat-cards";
import { CodesList } from "@/components/cockpit/codes-list";
import { GenerateModal } from "@/components/cockpit/generate-modal";

import type { PackConfig, AccessCode, ClientInfo, FeedPost, WallPost } from "@/types/heaven";
import { DEFAULT_PACKS } from "@/constants/packs";

// ── Helpers ──
function generateCodeString(model: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = ""; for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const prefix = model.slice(0, 3).toUpperCase();
  return `${prefix}-${new Date().getFullYear()}-${r}`;
}

function isExpired(expiresAt: string): boolean { return new Date(expiresAt).getTime() <= Date.now(); }

// ── Constants ──

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#E1306C", urlPrefix: "https://instagram.com/" },
  { id: "fanvue", label: "Fanvue", icon: Globe, color: "#7C3AED", urlPrefix: "https://fanvue.com/" },
  { id: "snapchat", label: "Snapchat", icon: Globe, color: "#FFFC00", urlPrefix: "https://snapchat.com/add/" },
];

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  // ── State ──
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [modelInfo, setModelInfo] = useState<{ avatar?: string; online?: boolean; display_name?: string; platforms?: Record<string, string> } | null>(null);

  const [showGenerator, setShowGenerator] = useState(false);
  const [prefillClient, setPrefillClient] = useState("");
  const [, setTick] = useState(0);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);

  // Feed composer
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTier, setNewPostTier] = useState("public");
  const [posting, setPosting] = useState(false);

  // FAB
  const [fabOpen, setFabOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Messages (kept for handler compatibility)
  const [, setPendingMessages] = useState(0);
  const [, setChatMessages] = useState<{ id: string; client_id: string; content: string; created_at: string; sender_type: string; read?: boolean; model?: string }[]>([]);

  // ── Load data ──
  useEffect(() => {
    const headers = authHeaders();
    const safeFetch = (url: string) => fetch(url, { headers }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

    safeFetch(`/api/codes?model=${modelSlug}`)
      .then(d => setCodes(d.codes || []))
      .catch(err => console.error("[Cockpit] codes:", err));

    safeFetch(`/api/clients?model=${modelSlug}`)
      .then(d => setClients(d.clients || []))
      .catch(err => console.error("[Cockpit] clients:", err));

    safeFetch(`/api/packs?model=${modelSlug}`)
      .then(d => { if (d.packs?.length > 0) setPacks(d.packs); })
      .catch(err => console.error("[Cockpit] packs:", err));

    safeFetch(`/api/models/${modelSlug}`)
      .then(d => setModelInfo(d))
      .catch(err => console.error("[Cockpit] model info:", err));

    safeFetch(`/api/posts?model=${modelSlug}`)
      .then(d => setFeedPosts((d.posts || []).slice(0, 5)))
      .catch(err => console.error("[Cockpit] posts:", err));

    safeFetch(`/api/wall?model=${modelSlug}`)
      .then(d => setWallPosts((d.posts || []).slice(0, 20)))
      .catch(err => console.error("[Cockpit] wall:", err));

    safeFetch(`/api/messages?model=${modelSlug}`)
      .then(d => {
        const msgs = d.messages || [];
        setChatMessages(msgs.slice(0, 100));
        setPendingMessages(msgs.filter((m: { sender_type: string; read?: boolean }) => m.sender_type === "client" && !m.read).length);
      })
      .catch(err => console.error("[Cockpit] messages:", err));
  }, [modelSlug, authHeaders]);

  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 60000); return () => clearInterval(iv); }, []);

  // ── Computed ──
  const modelCodes = useMemo(() => codes.filter(c => c.model === modelSlug), [codes, modelSlug]);
  const activeCodes = useMemo(() => modelCodes.filter(c => c.active && !c.revoked && !isExpired(c.expiresAt)), [modelCodes]);
  const revenue = useMemo(() => {
    return modelCodes.filter(c => c.type === "paid" && !c.revoked).reduce((sum, c) => {
      const pack = packs.find(p => p.id === c.tier);
      return sum + (pack?.price || 0);
    }, 0);
  }, [modelCodes, packs]);
  const uniqueClients = useMemo(() => new Set(modelCodes.filter(c => !c.revoked).map(c => c.client.toLowerCase())).size, [modelCodes]);

  // ── Actions ──
  const handleGenerate = useCallback((data: { client: string; platform: string; tier: string; duration: number; type: "paid" | "promo" | "gift" }) => {
    const code = generateCodeString(modelSlug);
    const pack = packs.find(p => p.id === data.tier);
    const newCode: AccessCode = {
      code, model: modelSlug, client: data.client, platform: data.platform,
      role: "client", tier: data.tier, pack: pack?.name || data.tier,
      type: data.type, duration: data.duration, expiresAt: new Date(Date.now() + data.duration * 3600000).toISOString(),
      created: new Date().toISOString(), used: false, active: true, revoked: false, isTrial: false, lastUsed: null,
    };
    setCodes(prev => [...prev, newCode]);
    fetch("/api/codes", { method: "POST", headers: authHeaders(), body: JSON.stringify(newCode) });
    return code;
  }, [packs, modelSlug, authHeaders]);

  const handleCopy = useCallback((code: string) => { navigator.clipboard.writeText(code); }, []);
  const handleRevoke = useCallback((code: string) => {
    setCodes(prev => prev.map(c => c.code === code ? { ...c, revoked: true, active: false } : c));
    fetch("/api/codes", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ code, action: "revoke" }) });
  }, [authHeaders]);
  const handlePause = useCallback((code: string) => {
    setCodes(prev => prev.map(c => c.code === code ? { ...c, active: false } : c));
    fetch("/api/codes", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ code, action: "pause" }) });
  }, [authHeaders]);
  const handleReactivate = useCallback((code: string) => {
    setCodes(prev => prev.map(c => c.code === code ? { ...c, active: true, revoked: false } : c));
    fetch("/api/codes", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ code, action: "reactivate" }) });
  }, [authHeaders]);
  const handleDelete = useCallback((code: string) => {
    setCodes(prev => prev.filter(c => c.code !== code));
    fetch(`/api/codes?code=${encodeURIComponent(code)}`, { method: "DELETE", headers: authHeaders() });
  }, [authHeaders]);

  const handleGenerateForClient = useCallback((clientName: string) => {
    setPrefillClient(clientName);
    setShowGenerator(true);
  }, []);

  const handleExtendCode = useCallback((code: string, extraHours: number) => {
    setCodes(prev => prev.map(c => {
      if (c.code !== code) return c;
      const currentExpiry = new Date(c.expiresAt).getTime();
      const base = currentExpiry > Date.now() ? currentExpiry : Date.now();
      return { ...c, expiresAt: new Date(base + extraHours * 3600000).toISOString(), active: true };
    }));
    fetch("/api/codes", { method: "PUT", headers: authHeaders(), body: JSON.stringify({ code, action: "extend", extra_hours: extraHours }) });
  }, [authHeaders]);

  const handleUpdateClient = useCallback((id: string, updates: Record<string, unknown>) => {
    const headers = authHeaders();
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    fetch("/api/clients", { method: "PUT", headers, body: JSON.stringify({ id, ...updates }) });
  }, [authHeaders]);

  const handleSendMessage = useCallback((clientId: string, content: string) => {
    const headers = authHeaders();
    fetch("/api/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({ model: modelSlug, client_id: clientId, sender_type: "model", content }),
    });
  }, [authHeaders, modelSlug]);

  const handleToggleStatus = useCallback(async () => {
    setStatusUpdating(true);
    const newStatus = !modelInfo?.online;
    try {
      const res = await fetch(`/api/models/${modelSlug}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ online: newStatus }),
      });
      if (res.ok) setModelInfo(prev => prev ? { ...prev, online: newStatus } : prev);
    } catch { /* */ }
    setStatusUpdating(false);
    setFabOpen(false);
  }, [modelSlug, modelInfo, authHeaders]);

  // ── Feed handlers ──
  const handleCreatePost = useCallback(async () => {
    if (!newPostContent.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ model: modelSlug, content: newPostContent, tier_required: newPostTier }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) setFeedPosts(prev => [data.post, ...prev]);
        setNewPostContent("");
        setNewPostTier("public");
      }
    } catch (err) { console.error("[Feed] create:", err); }
    finally { setPosting(false); }
  }, [newPostContent, newPostTier, posting, modelSlug, authHeaders]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await fetch(`/api/posts?id=${postId}&model=${modelSlug}`, { method: "DELETE", headers: authHeaders() });
      setFeedPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) { console.error("[Feed] delete:", err); }
  }, [modelSlug, authHeaders]);

  const TIER_OPTIONS = [
    { id: "public", label: "Public", color: "#64748B" },
    { id: "vip", label: "VIP", color: "#F43F5E" },
    { id: "gold", label: "Gold", color: "#F59E0B" },
    { id: "diamond", label: "Diamond", color: "#7C3AED" },
    { id: "platinum", label: "Platinum", color: "#A78BFA" },
  ];

  // ══════════ RENDER ══════════
  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-28 md:pb-8" style={{ background: "var(--bg)" }}>
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Header: Avatar + Name + Status + Links ── */}
          <div className="flex items-center gap-3 fade-up">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-black"
                style={{
                  background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                  color: "var(--text)",
                  boxShadow: "0 0 20px rgba(244,63,94,0.15)",
                }}>
                {modelInfo?.avatar ? (
                  <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  modelSlug.charAt(0).toUpperCase()
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: "#0a0a0a", background: modelInfo?.online ? "#10B981" : "#6B7280" }}>
                {modelInfo?.online && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate text-[var(--text)]">
                {modelInfo?.display_name || auth?.display_name || modelSlug.toUpperCase()}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {auth?.role === "root" ? "Root Admin" : "Creatrice exclusive"}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    background: modelInfo?.online ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.12)",
                    color: modelInfo?.online ? "#10B981" : "#6B7280",
                  }}>
                  {modelInfo?.online ? "En ligne" : "Hors ligne"}
                </span>
              </div>
            </div>
            <a href={`/m/${modelSlug}`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #222" }}>
              <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[11px] font-semibold hidden md:inline text-[var(--text-muted)]">Voir profil</span>
            </a>
            <a href={`/m/${modelSlug}?edit=true`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
              style={{ background: "rgba(230,51,41,0.12)", border: "1px solid rgba(230,51,41,0.25)" }}>
              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[11px] font-semibold hidden md:inline" style={{ color: "var(--accent)" }}>Edit</span>
            </a>
          </div>

          {/* ── KPI Cards ── */}
          <div className="fade-up-1">
            <StatCards
              activeCodes={activeCodes.length}
              totalCodes={modelCodes.length}
              revenue={revenue}
              pendingCount={0}
              uniqueClients={uniqueClients}
            />
          </div>

          {/* ── Feed: Post composer + feed ── */}
          <div className="fade-up-2">
            {/* Composer */}
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #F43F5E, #E63329)", color: "var(--text)" }}>
                  {modelSlug.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Quoi de neuf ?"
                    rows={2}
                    className="w-full bg-transparent text-sm text-[var(--text)] outline-none resize-none placeholder:text-[var(--text-muted)]"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Tier selector */}
                      <div className="flex items-center gap-1">
                        {TIER_OPTIONS.map(t => (
                          <button key={t.id} onClick={() => setNewPostTier(t.id)}
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer transition-all"
                            style={{
                              background: newPostTier === t.id ? `${t.color}20` : "transparent",
                              color: newPostTier === t.id ? t.color : "#555",
                              border: `1px solid ${newPostTier === t.id ? `${t.color}40` : "transparent"}`,
                            }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleCreatePost} disabled={!newPostContent.trim() || posting}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-105 disabled:opacity-30"
                      style={{ background: "#E63329", color: "var(--text)" }}>
                      {posting ? "..." : "Publier"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed posts */}
            {feedPosts.length > 0 && (
              <div className="space-y-3 mt-3">
                {feedPosts.slice(0, 10).map(post => (
                  <div key={post.id} className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #F43F5E, #E63329)", color: "var(--text)" }}>
                        {modelSlug.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[var(--text)]">{modelInfo?.display_name || modelSlug}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">@{modelSlug}</span>
                          {post.tier_required !== "public" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
                              background: TIER_OPTIONS.find(t => t.id === post.tier_required)?.color + "20" || "#64748B20",
                              color: TIER_OPTIONS.find(t => t.id === post.tier_required)?.color || "#64748B",
                            }}>{post.tier_required.toUpperCase()}</span>
                          )}
                        </div>
                        {post.content && <p className="text-sm text-[var(--text)]/90 whitespace-pre-wrap mb-2">{post.content}</p>}
                        {post.media_url && (
                          <div className="rounded-xl overflow-hidden mb-2" style={{ border: "1px solid #222" }}>
                            <img src={post.media_url} alt="" className="w-full max-h-[400px] object-cover" loading="lazy" />
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-[var(--text-muted)]">
                          <span className="flex items-center gap-1 text-xs"><Heart className="w-3.5 h-3.5" /> {post.likes_count || 0}</span>
                          <span className="flex items-center gap-1 text-xs"><MessageCircle className="w-3.5 h-3.5" /> {post.comments_count || 0}</span>
                          <button onClick={() => handleDeletePost(post.id)} className="ml-auto text-xs cursor-pointer hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Codes & Clients ── */}
          <div className="fade-up-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[var(--text)]">Codes &amp; Clients</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[var(--text-muted)]">
                  {activeCodes.length} actif{activeCodes.length > 1 ? "s" : ""} / {clients.length} client{clients.length > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setShowGenerator(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer hover:scale-105 active:scale-95 transition-transform btn-gradient"
                  style={{ color: "var(--text)" }}>
                  <KeyRound className="w-3.5 h-3.5" />
                  Generer
                </button>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <CodesList
                codes={modelCodes}
                clients={clients}
                modelSlug={modelSlug}
                onCopy={handleCopy}
                onRevoke={handleRevoke}
                onPause={handlePause}
                onReactivate={handleReactivate}
                onDelete={handleDelete}
                onUpdateClient={handleUpdateClient}
                onSendMessage={handleSendMessage}
                onGenerateForClient={handleGenerateForClient}
                onExtendCode={handleExtendCode}
                wiseLinks={packs.filter(p => p.wise_url).map(p => ({ tier: p.id, url: p.wise_url! }))}
              />
            </div>
          </div>

          {/* ── Platforms (bonus links) ── */}
          <div className="fade-up-2">
            <h2 className="text-sm font-bold text-[var(--text)] mb-3">Plateformes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLATFORMS.map(p => {
                const url = modelInfo?.platforms?.[p.id];
                return (
                  <div key={p.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${p.color}15` }}>
                      <p.icon className="w-4 h-4" style={{ color: p.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-[var(--text)] block">{p.label}</span>
                      {url ? (
                        <a href={url.startsWith("http") ? url : `${p.urlPrefix}${url}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors truncate block no-underline">
                          {url}
                        </a>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">Non configure</span>
                      )}
                    </div>
                    {url && (
                      <a href={url.startsWith("http") ? url : `${p.urlPrefix}${url}`}
                        target="_blank" rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Generate Modal ── */}
          <GenerateModal
            open={showGenerator}
            onClose={() => { setShowGenerator(false); setPrefillClient(""); }}
            onGenerate={handleGenerate}
            modelSlug={modelSlug}
            prefillClient={prefillClient}
          />

          {/* ── FAB ── */}
          {fabOpen && (
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setFabOpen(false)}
              style={{ animation: "fadeIn 0.2s ease" }} />
          )}
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fabItemIn { from { opacity: 0; transform: scale(0.5) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          `}</style>
          <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end gap-3">
            <div className={`flex flex-col items-end gap-2.5 transition-all duration-300 ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}`}>
              {[
                {
                  label: modelInfo?.online ? "Passer Offline" : "Passer Online",
                  icon: modelInfo?.online ? WifiOff : Wifi,
                  color: modelInfo?.online ? "#EF4444" : "#10B981",
                  action: handleToggleStatus,
                  delay: "150ms",
                  loading: statusUpdating,
                },
                {
                  label: "Generer Code",
                  icon: KeyRound,
                  color: "var(--accent)",
                  action: () => { setShowGenerator(true); setFabOpen(false); },
                  delay: "50ms",
                  loading: false,
                },
              ].map(item => (
                <button key={item.label}
                  onClick={item.action}
                  disabled={item.loading}
                  className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                  style={{ background: item.color, color: "var(--text)", animation: fabOpen ? `fabItemIn 0.3s ease ${item.delay} both` : "none" }}>
                  {item.loading ? (
                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                  ) : (
                    <item.icon className="w-4 h-4" />
                  )}
                  <span className="text-xs font-semibold whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(230,51,41,0.4)]"
              style={{
                background: "linear-gradient(135deg, var(--rose), var(--accent))",
                transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
              }}>
              <Plus className="w-6 h-6 text-[var(--text)]" />
            </button>
          </div>

        </div>
      </div>
    </OsLayout>
  );
}

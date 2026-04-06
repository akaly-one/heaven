"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { KeyRound, Eye, Pencil, Instagram, Globe, ExternalLink, Image, Heart, MessageCircle, Trash2, X, Settings } from "lucide-react";
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
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#C13584", urlPrefix: "https://instagram.com/" },
  { id: "fanvue", label: "Fanvue", icon: Globe, color: "#6D28D9", urlPrefix: "https://fanvue.com/" },
  { id: "snapchat", label: "Snapchat", icon: Globe, color: "#C4A600", urlPrefix: "https://snapchat.com/add/" },
  { id: "onlyfans", label: "OnlyFans", icon: Globe, color: "#008CCF", urlPrefix: "https://onlyfans.com/" },
  { id: "mym", label: "MYM", icon: Globe, color: "#CC2952", urlPrefix: "https://mym.fans/" },
  { id: "tiktok", label: "TikTok", icon: Globe, color: "#333333", urlPrefix: "https://tiktok.com/@" },
];

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  // ── State ──
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [modelInfo, setModelInfo] = useState<{ avatar?: string; online?: boolean; display_name?: string; status?: string; platforms?: Record<string, string | null> } | null>(null);

  const [showGenerator, setShowGenerator] = useState(false);
  const [prefillClient, setPrefillClient] = useState("");
  const [, setTick] = useState(0);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);

  // Feed composer
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTier, setNewPostTier] = useState("public");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [clientModal, setClientModal] = useState<{ pseudo: string } | null>(null);

  // Messages (kept for handler compatibility)
  const [pendingMessagesCount, setPendingMessages] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ id: string; client_id: string; content: string; created_at: string; sender_type: string; read?: boolean; model?: string }[]>([]);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

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

  // ── Real-time polling: new messages + pending purchases (every 15s) ──
  const prevUnreadRef = useRef(0);
  useEffect(() => {
    const poll = () => {
      const headers = authHeaders();
      fetch(`/api/messages?model=${modelSlug}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const msgs = d.messages || [];
          setChatMessages(msgs.slice(0, 100));
          const newUnread = msgs.filter((m: { sender_type: string; read?: boolean }) => m.sender_type === "client" && !m.read).length;
          // Play notification sound if new unread messages appeared
          if (newUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 800;
              osc.type = "sine";
              gain.gain.value = 0.15;
              osc.start();
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
              osc.stop(ctx.currentTime + 0.3);
            } catch {}
          }
          prevUnreadRef.current = newUnread;
          setPendingMessages(newUnread);
        })
        .catch(() => {});

      // Also refresh wall posts for pending purchases
      fetch(`/api/wall?model=${modelSlug}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setWallPosts((d.posts || []).slice(0, 20)); })
        .catch(() => {});
    };
    const iv = setInterval(poll, 15000);
    return () => clearInterval(iv);
  }, [modelSlug, authHeaders]);

  // Listen for generate event from mobile nav
  useEffect(() => {
    const handler = () => setShowGenerator(true);
    window.addEventListener("heaven:generate", handler);
    return () => window.removeEventListener("heaven:generate", handler);
  }, []);

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
  const pendingPurchases = useMemo(() => wallPosts.filter(p => p.pseudo === "SYSTEM" && p.content?.startsWith("⏳")), [wallPosts]);

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
  }, [modelSlug, modelInfo, authHeaders]);

  // ── Feed handlers ──
  const handleCreatePost = useCallback(async () => {
    if ((!newPostContent.trim() && !newPostImage) || posting) return;
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      // Upload image first if selected
      if (newPostImage) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: newPostImage, folder: `heaven/${modelSlug}/posts` }),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          mediaUrl = uploadData.url || null;
        }
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: modelSlug,
          content: newPostContent || null,
          tier_required: newPostTier,
          media_url: mediaUrl,
          media_type: mediaUrl ? "image" : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) setFeedPosts(prev => [data.post, ...prev]);
        setNewPostContent("");
        setNewPostTier("public");
        setNewPostImage(null);
      }
    } catch (err) { console.error("[Feed] create:", err); }
    finally { setPosting(false); }
  }, [newPostContent, newPostTier, newPostImage, posting, modelSlug, authHeaders]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await fetch(`/api/posts?id=${postId}&model=${modelSlug}`, { method: "DELETE", headers: authHeaders() });
      setFeedPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) { console.error("[Feed] delete:", err); }
  }, [modelSlug, authHeaders]);

  const TIER_OPTIONS = [
    { id: "public", label: "Public", color: "#64748B" },
    { id: "vip", label: "VIP", color: "#F43F5E" },
    { id: "gold", label: "Gold", color: "#B45309" },
    { id: "diamond", label: "Diamond", color: "#7C3AED" },
    { id: "platinum", label: "Platinum", color: "#A78BFA" },
  ];

  // ══════════ RENDER ══════════
  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 sm:p-5 md:p-6 lg:p-8 pb-28 md:pb-8" style={{ background: "var(--bg)" }}>
        <div className="max-w-[1400px] mx-auto space-y-5">

          {/* ── Header: Avatar + Name + Status + Actions ── */}
          <div className="flex items-center gap-3 sm:gap-4 fade-up">
            {/* Avatar — click to change photo */}
            <div className="relative">
              <label className="cursor-pointer">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-black"
                  style={{
                    background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                    color: "#fff",
                  }}>
                  {modelInfo?.avatar ? (
                    <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    modelSlug.charAt(0).toUpperCase()
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      const upRes = await fetch("/api/upload", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ file: reader.result, folder: `heaven/${modelSlug}/avatar` }),
                      });
                      if (upRes.ok) {
                        const { url } = await upRes.json();
                        if (url) {
                          setModelInfo(prev => prev ? { ...prev, avatar: url } : prev);
                          fetch(`/api/models/${modelSlug}`, {
                            method: "PUT", headers: authHeaders(),
                            body: JSON.stringify({ avatar: url }),
                          });
                        }
                      }
                    } catch {}
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }} />
              </label>
              {/* Online dot — click to toggle */}
              <button onClick={handleToggleStatus} disabled={statusUpdating}
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-125 disabled:opacity-50"
                style={{ background: modelInfo?.online ? "#10B981" : "#EF4444", boxShadow: "0 0 0 2px var(--bg)" }}>
                {modelInfo?.online && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color: "var(--text)" }}>
                {modelInfo?.display_name || auth?.display_name || modelSlug.toUpperCase()}
              </h1>
              <input
                defaultValue={modelInfo?.status || ""}
                placeholder="Etat d'esprit..."
                className="text-xs bg-transparent outline-none w-full truncate"
                style={{ color: "var(--text-muted)" }}
                onBlur={async (e) => {
                  const newStatus = e.target.value.trim();
                  try {
                    await fetch(`/api/models/${modelSlug}`, {
                      method: "PUT",
                      headers: authHeaders(),
                      body: JSON.stringify({ status: newStatus }),
                    });
                  } catch {}
                }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <a href={`/m/${modelSlug}`} target="_blank"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid var(--border)" }}>
                <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px] font-semibold hidden lg:inline" style={{ color: "var(--text-muted)" }}>Profil</span>
              </a>
              <a href={`/m/${modelSlug}?edit=true`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
                style={{ background: "rgba(230,51,41,0.12)", border: "1px solid rgba(230,51,41,0.25)" }}>
                <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                <span className="text-[11px] font-semibold hidden lg:inline" style={{ color: "var(--accent)" }}>Edit</span>
              </a>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="fade-up-1">
            <StatCards
              activeCodes={activeCodes.length}
              totalCodes={modelCodes.length}
              revenue={revenue}
              pendingCount={pendingPurchases.length}
              uniqueClients={uniqueClients}
            />
          </div>

          {/* ── Pending Purchases ── */}
          {pendingPurchases.length > 0 && (
            <div className="space-y-2 fade-up-1">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#B45309" }}>
                ⏳ {pendingPurchases.length} achat(s) en attente de validation
              </p>
              {pendingPurchases.map(p => {
                // Parse: "⏳ @pseudo souhaite acheter: item (amount€) — en attente de validation"
                const match = p.content?.match(/@(\S+)\s+souhaite acheter:\s+(.+?)\s+\((\d+)€\)/);
                const pseudo = match?.[1] || "?";
                const item = match?.[2] || "Achat";
                const amount = match?.[3] || "?";
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.2)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ background: "rgba(180,83,9,0.15)", color: "#B45309" }}>⏳</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>
                        @{pseudo} — {item}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {amount}€ · {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button onClick={async () => {
                      try {
                        await fetch(`/api/wall?id=${p.id}`, { method: "DELETE", headers: authHeaders() });
                        setWallPosts(prev => prev.filter(w => w.id !== p.id));
                      } catch {}
                    }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:scale-105"
                      style={{ background: "#16A34A", color: "#fff", border: "none" }}>
                      ✓ Validé
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 2-column layout: Feed LEFT + Codes/Messages RIGHT ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-5 lg:gap-6 fade-up-2">

            {/* ── LEFT: Feed ── */}
            <div className="space-y-4 min-w-0">
            {/* Composer */}
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #F43F5E, #E63329)", color: "#fff" }}>
                  {modelSlug.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="Quoi de neuf ?"
                    rows={2}
                    className="w-full bg-transparent text-sm outline-none resize-none"
                    style={{ color: "var(--text)" }}
                  />
                  {/* Upload progress bar */}
                  {posting && newPostImage && (
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ background: "var(--accent)", width: "70%", animation: "uploadProgress 2s ease-in-out infinite" }} />
                    </div>
                  )}
                  {/* Image preview — square crop */}
                  {newPostImage && !posting && (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", maxHeight: 280 }}>
                      <img src={newPostImage} alt="" className="w-full h-full object-cover" draggable={false} />
                      <button onClick={() => setNewPostImage(null)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-[9px] font-bold"
                        style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                        1:1
                      </div>
                    </div>
                  )}
                  {/* Row 1: Photo + Tier selector (scrollable) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <label className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer shrink-0"
                      style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                      <Image className="w-3.5 h-3.5" /> Photo
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setNewPostImage(reader.result as string);
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }} />
                    </label>
                    {TIER_OPTIONS.map(t => (
                      <button key={t.id} onClick={() => setNewPostTier(t.id)}
                        className="px-2 py-1 rounded-full text-[9px] font-bold cursor-pointer shrink-0"
                        style={{
                          background: newPostTier === t.id ? `${t.color}20` : "transparent",
                          color: newPostTier === t.id ? t.color : "var(--text-muted)",
                          border: `1px solid ${newPostTier === t.id ? `${t.color}40` : "transparent"}`,
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {/* Row 2: Publier button full width */}
                  <button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !newPostImage) || posting}
                    className="w-full py-2 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.01] disabled:opacity-30"
                    style={{ background: "var(--accent)", color: "#fff" }}>
                    {posting ? "Envoi en cours..." : "Publier"}
                  </button>
                </div>
              </div>
            </div>

            {/* Feed — all posts merged, newest first */}
            {(() => {
              // Merge model posts + wall posts, sorted newest first
              type FeedItem = { type: "post"; id: string; created_at: string; data: FeedPost } | { type: "wall"; id: string; created_at: string; data: WallPost };
              const allFeed: FeedItem[] = [
                ...feedPosts.map(p => ({ type: "post" as const, id: p.id, created_at: p.created_at, data: p })),
                ...wallPosts.filter(w => !w.content?.includes("#post-")).map(w => ({ type: "wall" as const, id: w.id, created_at: w.created_at, data: w })),
              ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

              if (allFeed.length === 0) return (
                <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Publie ton premier post</p>
                </div>
              );

              return (
                <div className="space-y-4 mt-4">
                  {allFeed.slice(0, 15).map(item => {
                    if (item.type === "wall") {
                      const w = item.data as WallPost;
                      return (
                        <div key={`w-${w.id}`} className="rounded-2xl p-4 group" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-muted)" }}>
                              {w.pseudo?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <button onClick={() => setClientModal({ pseudo: w.pseudo })}
                                className="text-[10px] font-bold cursor-pointer hover:underline" style={{ color: "var(--text)", background: "none", border: "none", padding: 0 }}>
                                @{w.pseudo}
                              </button>
                              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{w.content}</p>
                            </div>
                            <button onClick={async () => {
                              try {
                                await fetch(`/api/wall?id=${w.id}&model=${modelSlug}`, { method: "DELETE", headers: authHeaders() });
                                setWallPosts(prev => prev.filter(p => p.id !== w.id));
                              } catch {}
                            }} className="opacity-0 group-hover:opacity-100 text-xs cursor-pointer hover:text-red-500 transition-all shrink-0"
                              style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                    const post = item.data as FeedPost;
                    return (
                  <div key={post.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {/* Image first, full width */}
                    {post.media_url && (
                      <div className="relative">
                        <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" />
                        {/* Name overlay on image */}
                        <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", color: "#fff" }}>
                              {modelSlug.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{modelInfo?.display_name || modelSlug}</span>
                            {post.tier_required !== "public" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                                {post.tier_required.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Text content + actions */}
                    <div className="p-3">
                      {!post.media_url && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg, #F43F5E, #E63329)", color: "#fff" }}>
                            {modelSlug.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{modelInfo?.display_name || modelSlug}</span>
                          {post.tier_required !== "public" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
                              background: (TIER_OPTIONS.find(t => t.id === post.tier_required)?.color || "#64748B") + "20",
                              color: TIER_OPTIONS.find(t => t.id === post.tier_required)?.color || "#64748B",
                            }}>{post.tier_required.toUpperCase()}</span>
                          )}
                        </div>
                      )}
                      {post.content && <p className="text-sm whitespace-pre-wrap mb-2" style={{ color: "var(--text)" }}>{post.content}</p>}
                      <div className="flex items-center gap-4" style={{ color: "var(--text-muted)" }}>
                        <span className="flex items-center gap-1 text-xs"><Heart className="w-3.5 h-3.5" /> {post.likes_count || 0}</span>
                        <span className="flex items-center gap-1 text-xs"><MessageCircle className="w-3.5 h-3.5" /> {post.comments_count || 0}</span>
                        <button onClick={() => handleDeletePost(post.id)} className="ml-auto text-xs cursor-pointer hover:text-red-400 transition-colors" style={{ background: "none", border: "none" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                  })}
                </div>
              );
            })()}
            </div>{/* end left column */}

            {/* ── RIGHT: Codes/Messages/Platforms ── */}
            <div className="space-y-4">

            {/* Messages — grouped by client */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <button onClick={() => setMessagesOpen(!messagesOpen)}
                className="w-full flex items-center gap-2 p-3 cursor-pointer" style={{ background: "none", border: "none" }}>
                <MessageCircle className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-xs font-bold flex-1 text-left" style={{ color: "var(--text)" }}>Messages</span>
                {pendingMessagesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E" }}>
                    {pendingMessagesCount}
                  </span>
                )}
              </button>
              {messagesOpen && (() => {
                // Build conversations grouped by client
                const clientMap = new Map(clients.map(c => [c.id, c]));
                const grouped: Record<string, typeof chatMessages> = {};
                chatMessages.forEach(m => { if (!grouped[m.client_id]) grouped[m.client_id] = []; grouped[m.client_id].push(m); });
                const convos = Object.entries(grouped).map(([cid, msgs]) => {
                  const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const client = clientMap.get(cid);
                  const name = client?.pseudo_snap || client?.pseudo_insta || client?.firstname || cid.slice(0, 6);
                  const unread = sorted.filter(m => m.sender_type === "client" && !m.read).length;
                  const hasAdmin = sorted.some(m => m.sender_type === "admin" && !m.read);
                  return { cid, name, last: sorted[0], unread, hasAdmin, msgs: sorted };
                }).sort((a, b) => {
                  // Admin messages = highest priority
                  if (a.hasAdmin && !b.hasAdmin) return -1;
                  if (b.hasAdmin && !a.hasAdmin) return 1;
                  if (a.unread > 0 && b.unread === 0) return -1;
                  if (b.unread > 0 && a.unread === 0) return 1;
                  return new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime();
                });

                return (
                  <div className="px-3 pb-3 space-y-1" style={{ borderTop: "1px solid var(--border)" }}>
                    {convos.length === 0 ? (
                      <p className="text-[10px] py-2 text-center" style={{ color: "var(--text-muted)" }}>Pas de messages</p>
                    ) : (
                      convos.slice(0, 6).map(convo => (
                        <div key={convo.cid} className="rounded-xl p-2" style={{ background: convo.hasAdmin ? "rgba(59,130,246,0.08)" : convo.unread > 0 ? "rgba(244,63,94,0.04)" : "transparent", border: convo.hasAdmin ? "1px solid rgba(59,130,246,0.2)" : "none" }}>
                          {/* Client header + last message */}
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                              style={{ background: convo.hasAdmin ? "rgba(59,130,246,0.15)" : convo.unread > 0 ? "rgba(230,51,41,0.12)" : "rgba(0,0,0,0.06)", color: convo.hasAdmin ? "#3B82F6" : convo.unread > 0 ? "var(--accent)" : "var(--text-muted)" }}>
                              {convo.hasAdmin ? "🔷" : convo.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold" style={{ color: "var(--text)" }}>
                                  {convo.hasAdmin && <span className="text-[8px] font-bold px-1 py-0.5 rounded mr-1" style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6" }}>ADMIN</span>}
                                  @{convo.name}
                                </span>
                                {convo.unread > 0 && (
                                  <span className="w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center" style={{ background: convo.hasAdmin ? "#3B82F6" : "var(--accent)", color: "#fff" }}>
                                    {convo.unread}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] truncate" style={{ color: convo.unread > 0 ? "var(--text)" : "var(--text-muted)" }}>
                                {convo.last.sender_type === "model" ? "Toi: " : convo.last.sender_type === "admin" ? "🔷 Admin: " : ""}{convo.last.content}
                              </p>
                            </div>
                          </div>

                          {/* Inline reply */}
                          {replyTo === convo.cid ? (
                            <div className="flex gap-1.5 mt-1.5 ml-9">
                              <input value={replyText} onChange={e => setReplyText(e.target.value)}
                                placeholder="Repondre..."
                                className="flex-1 px-2 py-1.5 rounded-lg text-[10px] outline-none"
                                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                                onKeyDown={async e => {
                                  if (e.key === "Enter" && replyText.trim()) {
                                    const content = replyText.trim();
                                    // Optimistic: add to local state
                                    setChatMessages(prev => [{ id: `tmp-${Date.now()}`, client_id: convo.cid, content, sender_type: "model", created_at: new Date().toISOString(), read: true, model: modelSlug }, ...prev]);
                                    setReplyText(""); setReplyTo(null);
                                    // Send to API (also marks client msgs as read)
                                    await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
                                      body: JSON.stringify({ model: modelSlug, client_id: convo.cid, content, sender_type: "model" }) });
                                    // Mark conversation as read
                                    await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
                                      body: JSON.stringify({ model: modelSlug, client_id: convo.cid, action: "mark_read" }) });
                                  }
                                }} autoFocus />
                              <button onClick={() => setReplyTo(null)} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => { setReplyTo(convo.cid); setReplyText(""); }}
                              className="text-[9px] cursor-pointer hover:underline ml-9 mt-0.5" style={{ color: "var(--accent)", background: "none", border: "none", padding: 0 }}>
                              Repondre
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    <a href="/agence/clients" className="block text-center text-[10px] font-medium py-1 no-underline hover:underline" style={{ color: "var(--accent)" }}>
                      Voir tous les messages →
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Codes & Clients compact */}
            <div>
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
            <div className="rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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

          {/* Platforms — editable handles */}
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Réseaux sociaux</h3>
            <div className="space-y-1.5">
              {PLATFORMS.map(p => {
                const handle = modelInfo?.platforms?.[p.id] || "";
                return (
                  <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-[11px] font-medium shrink-0 w-16" style={{ color: "var(--text-muted)" }}>{p.label}</span>
                    <input
                      defaultValue={handle}
                      placeholder="pseudo..."
                      className="flex-1 text-[10px] bg-transparent outline-none min-w-0"
                      style={{ color: "var(--text)" }}
                      onBlur={async (e) => {
                        const val = e.target.value.trim();
                        try {
                          const currentPlatforms = modelInfo?.platforms || {};
                          const updated = { ...currentPlatforms, [p.id]: val || null };
                          await fetch(`/api/models/${modelSlug}`, {
                            method: "PUT", headers: authHeaders(),
                            body: JSON.stringify({ config: { platforms: updated } }),
                          });
                          setModelInfo(prev => prev ? { ...prev, platforms: updated } : prev);
                        } catch {}
                      }}
                    />
                    {handle && (
                      <a href={handle.startsWith("http") ? handle : `${p.urlPrefix}${handle}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[9px] no-underline shrink-0" style={{ color: p.color }}>↗</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

          {/* ── Client creation modal ── */}
          {clientModal && (
              <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}
                onClick={() => setClientModal(null)}>
                <div className="w-full max-w-sm rounded-t-2xl md:rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Nouveau client</h3>
                    <button onClick={() => setClientModal(null)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const pseudo = (form.querySelector("[name=pseudo]") as HTMLInputElement).value.trim();
                    const plat = (form.querySelector("[name=platform]") as HTMLSelectElement).value;
                    const tier = (form.querySelector("[name=tier]") as HTMLSelectElement).value;
                    const assignCode = (form.querySelector("[name=assign_code]") as HTMLInputElement).checked;
                    if (!pseudo) return;
                    try {
                      const clientData: Record<string, unknown> = { model: modelSlug, last_active: new Date().toISOString() };
                      if (plat === "snapchat") clientData.pseudo_snap = pseudo.toLowerCase();
                      else clientData.pseudo_insta = pseudo.toLowerCase();
                      await fetch("/api/clients", { method: "POST", headers: authHeaders(), body: JSON.stringify(clientData) });
                      if (assignCode) {
                        const codeStr = `${modelSlug.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
                        await fetch("/api/codes", {
                          method: "POST",
                          headers: authHeaders(),
                          body: JSON.stringify({ model: modelSlug, code: codeStr, client: pseudo.toLowerCase(), platform: plat, tier, duration: 720, type: "paid" }),
                        });
                      }
                      setClientModal(null);
                      window.location.reload();
                    } catch {}
                  }} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Pseudo</label>
                      <input name="pseudo" defaultValue={clientModal.pseudo} className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Plateforme</label>
                        <select name="platform" defaultValue="snapchat" className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                          <option value="snapchat">Snapchat</option>
                          <option value="instagram">Instagram</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Pack</label>
                        <select name="tier" defaultValue="vip" className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                          <option value="vip">VIP</option>
                          <option value="gold">Gold</option>
                          <option value="diamond">Diamond</option>
                          <option value="platinum">Platinum</option>
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="assign_code" defaultChecked className="rounded" />
                      <span className="text-xs" style={{ color: "var(--text)" }}>Generer et assigner un code d&apos;acces</span>
                    </label>
                    <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer btn-gradient">
                      Creer le client
                    </button>
                  </form>
                </div>
              </div>
          )}

          {/* FAB removed — generate code button is in mobile nav bar */}
          <style>{`
            @keyframes uploadProgress { 0% { width: 10%; } 50% { width: 80%; } 100% { width: 10%; } }
          `}</style>

        </div>
      </div>
    </OsLayout>
  );
}

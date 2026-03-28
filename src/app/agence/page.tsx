"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Plus, KeyRound, Pencil, Eye, CheckCircle, Circle, RotateCcw, TrendingUp, Instagram, Camera as CameraIcon, Globe, MessageCircle, Heart, Pin, Newspaper, Wifi, WifiOff, Send, Compass, X, ImagePlus, Target, CalendarDays, ChevronRight, Bell, Bot } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { StatCards } from "@/components/cockpit/stat-cards";
import { CodesList } from "@/components/cockpit/codes-list";
import { GenerateModal } from "@/components/cockpit/generate-modal";

// ── Types & Constants (centralized) ──
import type { PackConfig, AccessCode, ClientInfo, FeedPost } from "@/types/heaven";
import { DEFAULT_PACKS } from "@/constants/packs";

// ── API helpers ──
function generateCodeString(model: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = ""; for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const prefix = model.slice(0, 3).toUpperCase();
  return `${prefix}-${new Date().getFullYear()}-${r}`;
}

function isExpired(expiresAt: string): boolean { return new Date(expiresAt).getTime() <= Date.now(); }

// ── Weekly checklist ──
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKLY_TASKS = [
  { id: "ig-story", cat: "Contenu", label: "Publier 3+ stories Instagram", icon: Instagram },
  { id: "snap-story", cat: "Contenu", label: "Envoyer snaps prives aux VIP+", icon: CameraIcon },
  { id: "fanvue-post", cat: "Contenu", label: "Poster contenu exclusif Fanvue", icon: Globe },
  { id: "respond-dms", cat: "Engagement", label: "Repondre aux DMs en attente", icon: MessageCircle },
  { id: "check-codes", cat: "Gestion", label: "Verifier codes expirants cette semaine", icon: KeyRound },
  { id: "review-revenue", cat: "Gestion", label: "Analyser revenus de la semaine", icon: TrendingUp },
  { id: "promo-msg", cat: "Promotion", label: "Envoyer promo aux clients inactifs", icon: MessageCircle },
  { id: "new-content", cat: "Contenu", label: "Preparer shooting photo/video", icon: CameraIcon },
];

// ── Tier colors for feed ──
const TIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  public: { bg: "rgba(255,255,255,0.06)", text: "var(--text-muted)", label: "Public" },
  vip: { bg: "rgba(244,63,94,0.12)", text: "#F43F5E", label: "VIP" },
  gold: { bg: "rgba(245,158,11,0.12)", text: "#F59E0B", label: "Gold" },
  diamond: { bg: "rgba(124,58,237,0.12)", text: "#7C3AED", label: "Diamond" },
  platinum: { bg: "rgba(167,139,250,0.12)", text: "#A78BFA", label: "Platinum" },
};

// ── Pack shortcodes for Stripe ──
const PACK_CODES: Record<string, string> = {
  vip: "AG-P150",
  gold: "AG-P200",
  diamond: "AG-P250",
  platinum: "AG-P320",
};

// ── Pipeline stages ──
const PIPELINE_STAGES = [
  { id: "idea", label: "Idee", color: "#F59E0B", icon: "💡" },
  { id: "planned", label: "Planifie", color: "#3B82F6", icon: "📋" },
  { id: "shooting", label: "Shooting", color: "#8B5CF6", icon: "📸" },
  { id: "editing", label: "Montage", color: "#EC4899", icon: "🎬" },
  { id: "ready", label: "Pret", color: "#10B981", icon: "✅" },
  { id: "published", label: "Publie", color: "#06B6D4", icon: "🚀" },
];

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth, authHeaders } = useModel();
  const modelSlug = currentModel || auth?.model_slug || "yumi";

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [modelInfo, setModelInfo] = useState<{ avatar?: string; online?: boolean; display_name?: string } | null>(null);

  const [showGenerator, setShowGenerator] = useState(false);
  const [prefillClient, setPrefillClient] = useState("");
  const [, setTick] = useState(0);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);

  // FAB sub-panels
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTier, setNewPostTier] = useState("public");
  const [posting, setPosting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // FAB state
  const [fabOpen, setFabOpen] = useState(false);

  // Dashboard tabs: Feed | Messages
  const [dashTab, setDashTab] = useState<"feed" | "messages">("feed");
  const [pendingMessages, setPendingMessages] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ id: string; client_id: string; content: string; created_at: string; sender_type: string; read?: boolean; model?: string }[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // client_id being replied to
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [expandedConvo, setExpandedConvo] = useState<string | null>(null); // expanded client_id

  // Photo upload for new post
  const [newPostPhoto, setNewPostPhoto] = useState<string | null>(null);
  const [newPostPhotoFile, setNewPostPhotoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0); // 0-100
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Expanded image modal
  const [expandedImage, setExpandedImage] = useState<{ url: string; content?: string; tier?: string; author?: string } | null>(null);

  // Pipeline goals (mini)
  const [pipelineGoals, setPipelineGoals] = useState<{ id: string; title: string; stage: string; target_date?: string; completed?: boolean }[]>([]);

  // Checklist day assignments
  const [taskDays, setTaskDays] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`heaven_taskdays_${modelSlug}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const assignDay = useCallback((taskId: string, day: string) => {
    setTaskDays(prev => {
      const next = { ...prev, [taskId]: prev[taskId] === day ? "" : day };
      localStorage.setItem(`heaven_taskdays_${modelSlug}`, JSON.stringify(next));
      return next;
    });
  }, [modelSlug]);

  // Weekly checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`heaven_checklist_${modelSlug}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const toggleCheck = useCallback((id: string) => {
    setChecklist(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(`heaven_checklist_${modelSlug}`, JSON.stringify(next));
      return next;
    });
  }, [modelSlug]);
  const resetChecklist = useCallback(() => {
    setChecklist({});
    localStorage.removeItem(`heaven_checklist_${modelSlug}`);
  }, [modelSlug]);
  const checklistProgress = WEEKLY_TASKS.filter(t => checklist[t.id]).length;

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

    safeFetch(`/api/messages?model=${modelSlug}`)
      .then(d => {
        const msgs = d.messages || [];
        setChatMessages(msgs.slice(0, 100));
        setPendingMessages(msgs.filter((m: { sender_type: string; read?: boolean }) => m.sender_type === "client" && !m.read).length);
      })
      .catch(err => console.error("[Cockpit] messages:", err));

    safeFetch(`/api/pipeline/goals?model=${modelSlug}`)
      .then(d => setPipelineGoals((d.goals || []).slice(0, 6)))
      .catch(err => console.error("[Cockpit] goals:", err));
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

  // ── Client actions ──
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

  // ── Reply to a message inline ──
  const handleInlineReply = useCallback(async (clientId: string) => {
    if (!replyContent.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ model: modelSlug, client_id: clientId, sender_type: "model", content: replyContent.trim() }),
      });
      if (res.ok) {
        const { message: newMsg } = await res.json();
        setChatMessages(prev => [newMsg, ...prev]);
        setPendingMessages(prev => Math.max(0, prev - prev)); // will recalculate
        setReplyContent("");
        setReplyingTo(null);
        // Refresh to get accurate unread count
        const refreshRes = await fetch(`/api/messages?model=${modelSlug}`, { headers: authHeaders() });
        const d = await refreshRes.json();
        const msgs = d.messages || [];
        setChatMessages(msgs.slice(0, 50));
        setPendingMessages(msgs.filter((m: { sender_type: string; read?: boolean }) => m.sender_type === "client" && !m.read).length);
      }
    } catch (err) { console.error("[Cockpit] reply failed:", err); }
    setSendingReply(false);
  }, [replyContent, sendingReply, authHeaders, modelSlug]);

  // ── Toggle model online/offline ──
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

  // ── Create new feed post ──
  const handleCreatePost = useCallback(async () => {
    if ((!newPostContent.trim() && !newPostPhoto) || posting) return;
    setPosting(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      let mediaUrl: string | null = null;

      // Step 1: Upload photo to Cloudinary if present
      if (newPostPhoto && newPostPhotoFile) {
        setUploadProgress(10);

        // Convert file to base64 for the upload API
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(newPostPhotoFile);
        });

        setUploadProgress(30);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            file: base64,
            folder: `heaven/feed/${modelSlug}/${newPostTier}`,
            type: "image",
          }),
        });

        setUploadProgress(70);

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ error: "Upload echoue" }));
          throw new Error(err.error || "Upload echoue");
        }

        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
        setUploadProgress(85);
      } else {
        setUploadProgress(50);
      }

      // Step 2: Create the post with the Cloudinary URL
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: modelSlug,
          content: newPostContent.trim(),
          tier_required: newPostTier,
          ...(mediaUrl ? { media_url: mediaUrl, media_type: "image" } : {}),
        }),
      });

      setUploadProgress(95);

      if (!postRes.ok) {
        const err = await postRes.json().catch(() => ({ error: "Erreur creation post" }));
        throw new Error(err.error || "Erreur creation post");
      }

      const newPost = await postRes.json();

      // Step 3: Add the new post to feed immediately (optimistic)
      if (newPost.post) {
        setFeedPosts(prev => [newPost.post, ...prev].slice(0, 10));
      } else {
        // Fallback: refresh feed from API
        const res = await fetch(`/api/posts?model=${modelSlug}`, { headers: authHeaders() });
        const d = await res.json();
        setFeedPosts((d.posts || []).slice(0, 10));
      }

      setUploadProgress(100);
      setNewPostContent("");
      setNewPostTier("public");
      setNewPostPhoto(null);
      setNewPostPhotoFile(null);
      setShowNewPost(false);

      // Brief success flash before resetting
      setTimeout(() => setUploadProgress(0), 800);
    } catch (err) {
      console.error("[Cockpit] Post creation failed:", err);
      setUploadError(err instanceof Error ? err.message : "Erreur lors de la publication");
      setUploadProgress(0);
    }
    setPosting(false);
  }, [newPostContent, newPostTier, newPostPhoto, newPostPhotoFile, posting, modelSlug, authHeaders]);

  // ── Photo select handler (preview only, no upload yet) ──
  const handlePostPhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setNewPostPhotoFile(file);
    // Revoke previous blob URL to prevent memory leak
    setNewPostPhoto(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    const previewUrl = URL.createObjectURL(file);
    setNewPostPhoto(previewUrl);
  }, []);

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-28 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center gap-3 fade-up">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-black"
                style={{
                  background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(244,63,94,0.15)",
                }}>
                {modelInfo?.avatar ? (
                  <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  modelSlug.charAt(0).toUpperCase()
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: "var(--bg)", background: modelInfo?.online ? "#10B981" : "#6B7280" }}>
                {modelInfo?.online && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate" style={{ color: "var(--text)" }}>
                {modelInfo?.display_name || auth?.display_name || modelSlug.toUpperCase()}
              </h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {auth?.role === "root" ? "Root Admin" : "Creatrice exclusive"}
              </p>
            </div>
            {/* View Profile + Edit Profile buttons */}
            <a href={`/m/${modelSlug}`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)" }}>
              <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              <span className="text-[11px] font-semibold hidden md:inline" style={{ color: "var(--text-muted)" }}>Profil</span>
            </a>
            <a href={`/m/${modelSlug}?edit=true`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
              style={{ background: "rgba(230,51,41,0.12)", border: "1px solid rgba(230,51,41,0.25)" }}>
              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[11px] font-semibold hidden md:inline" style={{ color: "var(--accent)" }}>Edit</span>
            </a>
          </div>

          {/* ── Quick Actions ── */}
          <div className="flex gap-2 flex-wrap fade-up">
            {[
              { label: "Strategie", href: "/agence/simulateur", icon: Target, color: "#E040FB" },
              { label: "Galerie", href: `/m/${modelSlug}?edit=true#gallery`, icon: CameraIcon, color: "var(--accent)" },
              { label: "Nouveau post", href: "#", icon: Plus, color: "#10B981" },
              { label: "Automation", href: "/agence/automation", icon: Bot, color: "#06B6D4" },
            ].map(action => (
              <a key={action.label} href={action.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold no-underline transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: `${action.color}10`,
                  border: `1px solid ${action.color}20`,
                  color: action.color,
                  boxShadow: `0 2px 8px ${action.color}08`,
                }}>
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </a>
            ))}
          </div>

          {/* ── Stats ── */}
          <div className="fade-up-1">
            <StatCards
              activeCodes={activeCodes.length}
              totalCodes={modelCodes.length}
              revenue={revenue}
              pendingCount={0}
              uniqueClients={uniqueClients}
            />
          </div>

          {/* ── Codes + Clients unified list ── */}
          <div className="fade-up-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Codes &amp; Clients</h2>
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                {activeCodes.length} actif{activeCodes.length > 1 ? "s" : ""} · {clients.length} client{clients.length > 1 ? "s" : ""}
              </span>
            </div>
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

          {/* ── Feed/Messages + Checklist side by side ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-up-3">
            {/* Feed / Chat pivot column */}
            <div>
              {/* Pivot tabs */}
              <div className="flex items-center gap-1 mb-3 p-0.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", border: "1px solid var(--border)" }}>
                {([
                  { id: "feed" as const, label: "Feed", icon: Newspaper },
                  { id: "messages" as const, label: "Messages", icon: MessageCircle },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setDashTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-all duration-200 relative"
                    style={{
                      background: dashTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent",
                      color: dashTab === tab.id ? "var(--text)" : "var(--text-muted)",
                      boxShadow: dashTab === tab.id ? "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
                      transform: dashTab === tab.id ? "scale(1)" : "scale(0.98)",
                    }}>
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.id === "messages" && pendingMessages > 0 && (
                      <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[8px] font-bold px-1"
                        style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 2px 6px rgba(230,51,41,0.4)" }}>
                        {pendingMessages}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Feed tab content */}
              {dashTab === "feed" && (
                <>
                  {/* Inline new post composer */}
                  <div className="rounded-2xl p-3 mb-2" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                        style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                        {modelSlug.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <input
                          value={newPostContent}
                          onChange={e => { setNewPostContent(e.target.value); setUploadError(null); }}
                          placeholder="Quoi de neuf ?"
                          className="w-full text-[12px] outline-none bg-transparent py-1"
                          style={{ color: "var(--text)" }}
                          disabled={posting}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleCreatePost(); }}
                        />
                        {newPostPhoto && (
                          <div className="relative mt-1.5 w-14 h-14 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                            <img src={newPostPhoto} alt="" className="w-full h-full object-cover" />
                            {!posting && (
                              <button onClick={() => { setNewPostPhoto(null); setNewPostPhotoFile(null); setUploadError(null); }} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
                                style={{ background: "rgba(0,0,0,0.7)" }}>
                                <X className="w-2.5 h-2.5 text-white" />
                              </button>
                            )}
                            {/* Upload overlay progress */}
                            {posting && uploadProgress > 0 && uploadProgress < 100 && (
                              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                                <span className="text-[10px] font-bold text-white">{uploadProgress}%</span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Upload progress bar */}
                        {posting && uploadProgress > 0 && (
                          <div className="w-full h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "var(--bg2)" }}>
                            <div className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${uploadProgress}%`,
                                background: uploadProgress === 100 ? "var(--success)" : "var(--accent)",
                              }} />
                          </div>
                        )}
                        {/* Upload error */}
                        {uploadError && (
                          <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg text-[9px] font-medium"
                            style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                            <X className="w-3 h-3 shrink-0" />
                            {uploadError}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            <label className={`cursor-pointer transition-opacity ${posting ? "opacity-30 pointer-events-none" : "hover:opacity-70"}`}>
                              <ImagePlus className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                              <input type="file" accept="image/*" className="hidden" onChange={handlePostPhotoUpload} disabled={posting} />
                            </label>
                            {/* Tier folder selector — determines where the post/photo is published */}
                            <select value={newPostTier} onChange={e => setNewPostTier(e.target.value)}
                              disabled={posting}
                              className="text-[9px] font-bold px-2 py-1 rounded-lg outline-none cursor-pointer uppercase tracking-wide disabled:opacity-50"
                              style={{
                                background: TIER_COLORS[newPostTier]?.bg || "var(--bg3)",
                                color: TIER_COLORS[newPostTier]?.text || "var(--text-muted)",
                                border: `1px solid ${TIER_COLORS[newPostTier]?.text || "var(--border)"}30`,
                              }}>
                              <option value="public">Public</option>
                              <option value="vip">VIP</option>
                              <option value="gold">Gold</option>
                              <option value="diamond">Diamond</option>
                              <option value="platinum">Platinum</option>
                            </select>
                          </div>
                          <button onClick={handleCreatePost}
                            disabled={(!newPostContent.trim() && !newPostPhoto) || posting}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
                            style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 2px 8px rgba(230,51,41,0.3)" }}>
                            {posting ? (
                              <>
                                <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                                {newPostPhoto ? "Upload..." : "..."}
                              </>
                            ) : "Publier"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {feedPosts.length === 0 ? (
                    <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                      <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun post</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {feedPosts.map(post => {
                        const tier = TIER_COLORS[post.tier_required] || TIER_COLORS.public;
                        const timeAgo = (() => { const s = Math.floor((Date.now() - new Date(post.created_at).getTime()) / 1000); if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}j`; })();
                        return (
                          <div key={post.id} className="rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.02]" style={{ borderBottom: "1px solid var(--border)" }}>
                            {/* Single line: avatar + pseudo + message + photo */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                                style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                                {modelSlug.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--text)" }}>{modelSlug.toUpperCase()}</span>
                                {post.content && (
                                  <span className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{post.content}</span>
                                )}
                              </div>
                              {/* Square photo thumbnail */}
                              {post.media_url && (
                                <button
                                  onClick={() => setExpandedImage({ url: post.media_url!, content: post.content || undefined, tier: post.tier_required, author: modelSlug.toUpperCase() })}
                                  className="w-10 h-10 rounded-lg overflow-hidden shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                                  style={{ border: "1px solid var(--border)" }}>
                                  <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                                </button>
                              )}
                              {/* Tier badge */}
                              {post.tier_required !== "public" && (
                                <span className="px-1.5 py-0.5 rounded-md text-[7px] font-bold uppercase shrink-0"
                                  style={{ background: tier.bg, color: tier.text }}>
                                  {tier.label}
                                </span>
                              )}
                              {post.pinned && <Pin className="w-2.5 h-2.5 shrink-0" style={{ color: "#F59E0B" }} />}
                            </div>
                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-1 ml-[38px]">
                              <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>{timeAgo}</span>
                              <span className="flex items-center gap-0.5 text-[8px]" style={{ color: post.likes_count > 0 ? "#F43F5E" : "var(--text-muted)" }}>
                                <Heart className="w-2.5 h-2.5" fill={post.likes_count > 0 ? "#F43F5E" : "none"} /> {post.likes_count || 0}
                              </span>
                              <span className="flex items-center gap-0.5 text-[8px]" style={{ color: "var(--text-muted)" }}>
                                <MessageCircle className="w-2.5 h-2.5" /> {post.comments_count || 0}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Messages tab content — grouped by client */}
              {dashTab === "messages" && (() => {
                // Group messages by client_id
                const convos = chatMessages.reduce<Record<string, typeof chatMessages>>((acc, msg) => {
                  const key = msg.client_id || "unknown";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(msg);
                  return acc;
                }, {});
                // Sort conversations: unread first, then by most recent message
                const sortedConvos = Object.entries(convos).sort(([, a], [, b]) => {
                  const aUnread = a.some(m => m.sender_type === "client" && !m.read);
                  const bUnread = b.some(m => m.sender_type === "client" && !m.read);
                  if (aUnread !== bUnread) return aUnread ? -1 : 1;
                  return new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime();
                });

                return (
                  <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                        <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>Conversations</span>
                        {pendingMessages > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold" style={{ background: "rgba(230,51,41,0.12)", color: "var(--accent)" }}>
                            {pendingMessages} non lu{pendingMessages > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {sortedConvos.length} client{sortedConvos.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    {sortedConvos.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <MessageCircle className="w-6 h-6 opacity-30" style={{ color: "var(--text-muted)" }} />
                        </div>
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Aucun message</p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Les messages de vos clients apparaitront ici</p>
                      </div>
                    ) : (
                      <div className="max-h-[500px] overflow-y-auto">
                        {sortedConvos.map(([clientId, msgs], ci) => {
                          const clientInfo = clients.find(c => c.id === clientId);
                          const clientName = clientInfo?.pseudo_snap || clientInfo?.pseudo_insta || clientId.slice(0, 8);
                          const platform = clientInfo?.pseudo_snap ? "snap" : clientInfo?.pseudo_insta ? "insta" : null;
                          const unreadCount = msgs.filter(m => m.sender_type === "client" && !m.read).length;
                          const lastMsg = msgs[0]; // most recent (sorted desc from API)
                          const isExpanded = expandedConvo === clientId;
                          const timeAgo = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 3600) return `${Math.floor(s / 60)}min`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}j`; };

                          return (
                            <div key={clientId} style={{ borderBottom: ci < sortedConvos.length - 1 ? "1px solid var(--border)" : "none" }}>
                              {/* Conversation header — click to expand */}
                              <button
                                onClick={() => setExpandedConvo(isExpanded ? null : clientId)}
                                className="w-full flex items-center gap-2.5 px-3 py-3 transition-all duration-200 hover:bg-white/[0.03] cursor-pointer"
                                style={{
                                  background: unreadCount > 0 ? "rgba(230,51,41,0.03)" : "transparent",
                                  border: "none", textAlign: "left",
                                }}>
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold relative"
                                  style={{ background: "rgba(124,58,237,0.12)", color: "#7C3AED" }}>
                                  {clientName.charAt(0).toUpperCase()}
                                  {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                                      style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 2px 6px rgba(230,51,41,0.4)" }}>
                                      {unreadCount}
                                    </span>
                                  )}
                                </div>
                                {/* Name + platform + last message */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold truncate" style={{ color: "var(--text)" }}>{clientName}</span>
                                    {platform === "snap" && (
                                      <span className="px-1 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(255,252,0,0.15)", color: "#FFFC00" }}>SNAP</span>
                                    )}
                                    {platform === "insta" && (
                                      <span className="px-1 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(225,48,108,0.12)", color: "#E1306C" }}>INSTA</span>
                                    )}
                                    <span className="text-[8px] ml-auto shrink-0" style={{ color: "var(--text-muted)" }}>{timeAgo(lastMsg.created_at)}</span>
                                  </div>
                                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                                    {lastMsg.sender_type === "model" ? <span style={{ color: "var(--text-muted)" }}>Vous: </span> : null}
                                    {lastMsg.content}
                                  </p>
                                </div>
                                <ChevronRight className="w-3 h-3 shrink-0 transition-transform duration-200" style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }} />
                              </button>

                              {/* Expanded conversation thread */}
                              {isExpanded && (
                                <div style={{ background: "rgba(0,0,0,0.1)" }}>
                                  {/* Message thread (reversed to show oldest first) */}
                                  <div className="px-3 py-2 space-y-1.5 max-h-[280px] overflow-y-auto" style={{ borderTop: "1px solid var(--border)" }}>
                                    {[...msgs].reverse().map(msg => (
                                      <div key={msg.id} className={`flex ${msg.sender_type === "model" ? "justify-end" : "justify-start"}`}>
                                        <div className="max-w-[80%] px-2.5 py-1.5 rounded-xl text-[10px] leading-relaxed"
                                          style={{
                                            background: msg.sender_type === "model"
                                              ? "linear-gradient(135deg, var(--accent), #7C3AED)"
                                              : "rgba(255,255,255,0.06)",
                                            color: msg.sender_type === "model" ? "#fff" : "var(--text)",
                                            borderBottomRightRadius: msg.sender_type === "model" ? "4px" : "12px",
                                            borderBottomLeftRadius: msg.sender_type === "client" ? "4px" : "12px",
                                          }}>
                                          {msg.content}
                                          <span className="block text-[7px] mt-0.5" style={{ opacity: 0.5 }}>{timeAgo(msg.created_at)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Reply input */}
                                  <div className="px-3 py-2 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                                    <input
                                      value={replyingTo === clientId ? replyContent : ""}
                                      onChange={e => { setReplyingTo(clientId); setReplyContent(e.target.value); }}
                                      onFocus={() => setReplyingTo(clientId)}
                                      onKeyDown={e => { if (e.key === "Enter" && replyContent.trim()) handleInlineReply(clientId); }}
                                      placeholder="Repondre..."
                                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] outline-none"
                                      style={{ background: "rgba(255,255,255,0.05)", color: "var(--text)", border: "1px solid var(--border)" }}
                                      disabled={sendingReply}
                                    />
                                    <button
                                      onClick={() => handleInlineReply(clientId)}
                                      disabled={sendingReply || !(replyingTo === clientId && replyContent.trim())}
                                      className="px-2.5 py-1.5 rounded-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform disabled:opacity-30"
                                      style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                                      <Send className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Checklist + Pipeline column */}
            <div className="space-y-4">
              {/* Checklist */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    Checklist Hebdo
                    <span className="ml-2 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                      {checklistProgress}/{WEEKLY_TASKS.length}
                    </span>
                  </h2>
                  <button onClick={resetChecklist} className="flex items-center gap-1 text-[10px] font-medium cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
                <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "var(--bg2)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(checklistProgress / WEEKLY_TASKS.length) * 100}%`, background: checklistProgress === WEEKLY_TASKS.length ? "var(--success)" : "var(--accent)" }} />
                </div>
                <div className="space-y-1.5">
                  {WEEKLY_TASKS.map(task => (
                    <div key={task.id} className="rounded-xl transition-all duration-200 hover:scale-[1.008]"
                      style={{ background: checklist[task.id] ? "rgba(22,163,74,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${checklist[task.id] ? "rgba(22,163,74,0.15)" : "var(--border)"}` }}>
                      <div className="flex items-center gap-2.5 px-3 py-2">
                        <button onClick={() => toggleCheck(task.id)} className="cursor-pointer shrink-0" style={{ background: "none", border: "none" }}>
                          {checklist[task.id]
                            ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                            : <Circle className="w-3.5 h-3.5" style={{ color: "var(--border3)" }} />
                          }
                        </button>
                        <span className="text-[11px] font-medium flex-1" style={{ color: checklist[task.id] ? "var(--success)" : "var(--text-secondary)", textDecoration: checklist[task.id] ? "line-through" : "none" }}>
                          {task.label}
                        </span>
                        {/* Day assignment */}
                        <div className="flex gap-0.5">
                          {DAYS.map(day => (
                            <button key={day} onClick={() => assignDay(task.id, day)}
                              className="w-5 h-5 rounded text-[7px] font-bold cursor-pointer transition-all hover:scale-110"
                              style={{
                                background: taskDays[task.id] === day ? "var(--accent)" : "var(--bg2)",
                                color: taskDays[task.id] === day ? "#fff" : "var(--text-muted)",
                                border: "none",
                              }}>
                              {day.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline mini */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                    <Target className="w-4 h-4" style={{ color: "#7C3AED" }} />
                    Pipeline
                  </h2>
                  <a href="/agence/pipeline" className="flex items-center gap-0.5 text-[10px] font-medium no-underline hover:opacity-70 transition-opacity" style={{ color: "var(--accent)" }}>
                    Voir tout <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                {/* Stage progress bar */}
                <div className="flex gap-1 mb-3">
                  {PIPELINE_STAGES.map(stage => {
                    const count = pipelineGoals.filter(g => g.stage === stage.id).length;
                    return (
                      <div key={stage.id} className="flex-1 text-center">
                        <div className="h-1.5 rounded-full mb-1" style={{ background: count > 0 ? stage.color : "var(--bg2)" }} />
                        <span className="text-[7px] font-semibold" style={{ color: count > 0 ? stage.color : "var(--text-muted)" }}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Goals list */}
                {pipelineGoals.length === 0 ? (
                  <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aucun objectif</p>
                    <a href="/agence/pipeline" className="text-[10px] font-semibold no-underline hover:opacity-70" style={{ color: "var(--accent)" }}>
                      Ajouter un objectif
                    </a>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {pipelineGoals.map(goal => {
                      const stage = PIPELINE_STAGES.find(s => s.id === goal.stage);
                      return (
                        <div key={goal.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-[1.008]"
                          style={{ background: goal.completed ? "rgba(22,163,74,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${goal.completed ? "rgba(22,163,74,0.15)" : "var(--border)"}` }}>
                          <span className="text-sm" role="img">{stage?.icon || "📋"}</span>
                          <span className="text-[11px] font-medium flex-1" style={{
                            color: goal.completed ? "var(--success)" : "var(--text-secondary)",
                            textDecoration: goal.completed ? "line-through" : "none",
                          }}>
                            {goal.title}
                          </span>
                          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${stage?.color || "var(--bg2)"}20`, color: stage?.color || "var(--text-muted)" }}>
                            {stage?.label || goal.stage}
                          </span>
                          {goal.target_date && (
                            <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>
                              <CalendarDays className="w-2.5 h-2.5 inline mr-0.5" />
                              {new Date(goal.target_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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

          {/* ── FAB Radial Menu ── */}
          {fabOpen && (
            <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setFabOpen(false)}
              style={{ animation: "fadeIn 0.2s ease" }} />
          )}
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fabItemIn { from { opacity: 0; transform: scale(0.5) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            @keyframes modalScaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          `}</style>
          <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end gap-3">
            {/* Radial items */}
            <div className={`flex flex-col items-end gap-2.5 transition-all duration-300 ${fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}`}>
              {[
                {
                  label: modelInfo?.online ? "Passer Offline" : "Passer Online",
                  icon: modelInfo?.online ? WifiOff : Wifi,
                  color: modelInfo?.online ? "#EF4444" : "#10B981",
                  action: handleToggleStatus,
                  delay: "200ms",
                  loading: statusUpdating,
                },
                {
                  label: "Nouveau Post",
                  icon: Send,
                  color: "#7C3AED",
                  action: () => { setShowNewPost(true); setFabOpen(false); },
                  delay: "150ms",
                },
                {
                  label: "Generer Code",
                  icon: KeyRound,
                  color: "var(--accent)",
                  action: () => { setShowGenerator(true); setFabOpen(false); },
                  delay: "100ms",
                },
                {
                  label: "Strategie",
                  icon: Compass,
                  color: "#F59E0B",
                  action: () => { window.location.href = "/agence/simulateur"; },
                  delay: "50ms",
                },
                {
                  label: "Automation",
                  icon: Bot,
                  color: "#06B6D4",
                  action: () => { window.location.href = "/agence/automation"; },
                  delay: "0ms",
                },
              ].map(item => (
                <button key={item.label}
                  onClick={item.action}
                  disabled={item.loading}
                  className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                  style={{ background: item.color, color: "#fff", animation: fabOpen ? `fabItemIn 0.3s ease ${item.delay} both` : "none" }}>
                  {item.loading ? (
                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                  ) : (
                    <item.icon className="w-4 h-4" />
                  )}
                  <span className="text-xs font-semibold whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </div>
            {/* Main FAB */}
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(230,51,41,0.4)]"
              style={{
                background: "linear-gradient(135deg, var(--rose), var(--accent))",
                transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
              }}>
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* ── New Post Sheet ── */}
          {showNewPost && (
            <>
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewPost(false)} />
              <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:rounded-2xl overflow-hidden rounded-t-2xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border2)", boxShadow: "0 -8px 40px rgba(0,0,0,0.3)" }}>
                <div className="flex justify-center pt-3 md:hidden">
                  <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Nouveau Post</h3>
                    <button onClick={() => { if (!posting) setShowNewPost(false); }} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                      {modelSlug.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newPostContent}
                        onChange={e => { setNewPostContent(e.target.value); setUploadError(null); }}
                        placeholder="Quoi de neuf ?"
                        rows={4}
                        disabled={posting}
                        className="w-full text-[13px] leading-relaxed outline-none resize-none rounded-lg p-3 disabled:opacity-50"
                        style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                        autoFocus
                      />
                      {newPostPhoto && (
                        <div className="relative mt-2 w-20 h-20 rounded-lg overflow-hidden">
                          <img src={newPostPhoto} alt="" className="w-full h-full object-cover" />
                          {!posting ? (
                            <button onClick={() => { setNewPostPhoto(null); setNewPostPhotoFile(null); }} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                              style={{ background: "rgba(0,0,0,0.6)" }}>
                              <X className="w-3 h-3 text-white" />
                            </button>
                          ) : uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                              <span className="text-xs font-bold text-white">{uploadProgress}%</span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Upload progress bar */}
                      {posting && uploadProgress > 0 && (
                        <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "var(--bg2)" }}>
                          <div className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${uploadProgress}%`,
                              background: uploadProgress === 100 ? "var(--success)" : "linear-gradient(90deg, var(--accent), #7C3AED)",
                            }} />
                        </div>
                      )}
                      {/* Upload error */}
                      {uploadError && (
                        <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                          <X className="w-3 h-3 shrink-0" />
                          {uploadError}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <label className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-opacity ${posting ? "opacity-30 pointer-events-none" : "cursor-pointer hover:opacity-70"}`}
                            style={{ background: "var(--bg3)", color: "var(--text-muted)", border: "1px solid var(--border2)" }}>
                            <ImagePlus className="w-3.5 h-3.5" />
                            Photo
                            <input type="file" accept="image/*" className="hidden" onChange={handlePostPhotoUpload} disabled={posting} />
                          </label>
                          <select value={newPostTier} onChange={e => setNewPostTier(e.target.value)}
                            disabled={posting}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg outline-none cursor-pointer uppercase tracking-wide disabled:opacity-50"
                            style={{
                              background: TIER_COLORS[newPostTier]?.bg || "var(--bg3)",
                              color: TIER_COLORS[newPostTier]?.text || "var(--text)",
                              border: `1px solid ${TIER_COLORS[newPostTier]?.text || "var(--border2)"}30`,
                            }}>
                            <option value="public">Public</option>
                            <option value="vip">VIP</option>
                            <option value="gold">Gold</option>
                            <option value="diamond">Diamond</option>
                            <option value="platinum">Platinum</option>
                          </select>
                        </div>
                        <button onClick={handleCreatePost}
                          disabled={(!newPostContent.trim() && !newPostPhoto) || posting}
                          className="px-5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
                          style={{ background: "var(--accent)", color: "#fff" }}>
                          {posting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                              {newPostPhoto ? "Upload..." : "..."}
                            </>
                          ) : "Publier"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Instagram-style Image Expand Modal ── */}
      {expandedImage && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md" onClick={() => setExpandedImage(null)} style={{ animation: "fadeIn 0.2s ease" }} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", animation: "modalScaleIn 0.25s ease" }}>
              {/* Header */}
              <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                  {expandedImage.author?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{expandedImage.author}</span>
                  {expandedImage.tier && expandedImage.tier !== "public" && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase"
                      style={{ background: TIER_COLORS[expandedImage.tier]?.bg, color: TIER_COLORS[expandedImage.tier]?.text }}>
                      {TIER_COLORS[expandedImage.tier]?.label}
                    </span>
                  )}
                </div>
                <button onClick={() => setExpandedImage(null)} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:opacity-70"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
              {/* Image — Instagram profile post aspect ratio (4:5) */}
              <div className="w-full" style={{ aspectRatio: "4/5", background: "#000" }}>
                <img src={expandedImage.url} alt="" className="w-full h-full object-contain" />
              </div>
              {/* Caption */}
              {expandedImage.content && (
                <div className="px-3 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-bold mr-1.5" style={{ color: "var(--text)" }}>{expandedImage.author}</span>
                    {expandedImage.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </OsLayout>
  );
}

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Eye, Pencil, Image as ImageIcon, Heart, MessageCircle, Trash2, X, Newspaper, Camera } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { StatCards } from "@/components/cockpit/stat-cards";

import { GenerateModal } from "@/components/cockpit/generate-modal";

import type { PackConfig, AccessCode, ClientInfo, FeedPost, WallPost } from "@/types/heaven";
import { DEFAULT_PACKS } from "@/constants/packs";
import { toSlot, isFreeSlot } from "@/lib/tier-utils";
import { toModelId } from "@/lib/model-utils";

// ── Upload config ──
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_IMAGE_EXT = "JPG, PNG, WEBP, GIF";

const UPLOAD_LIMITS = {
  avatar: { maxMB: 5, label: "Photo de profil" },
  post: { maxMB: 10, label: "Photo" },
} as const;

function validateFile(file: File, maxMB: number): { valid: boolean; error?: string } {
  // Check format
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    const ext = file.name.split(".").pop()?.toUpperCase() || file.type;
    return { valid: false, error: `Format "${ext}" non supporte. Formats acceptes : ${ACCEPTED_IMAGE_EXT}` };
  }
  // Check size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) {
    return { valid: false, error: `Fichier trop lourd (${sizeMB.toFixed(1)}MB). Max ${maxMB}MB. Formats : ${ACCEPTED_IMAGE_EXT}` };
  }
  return { valid: true };
}

// ── Helpers ──
function generateCodeString(model: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = ""; for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  const prefix = model.slice(0, 3).toUpperCase();
  return `${prefix}-${new Date().getFullYear()}-${r}`;
}

function isExpired(expiresAt: string): boolean { return new Date(expiresAt).getTime() <= Date.now(); }

// ── Constants ──

// PLATFORMS moved to header component

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth, authHeaders, isRoot } = useModel();
  const _modelSlug = currentModel || auth?.model_slug || null;
  const modelSlug = _modelSlug ?? "";

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
  const [newPostType, setNewPostType] = useState<"feed" | "story">("feed");
  const [posting, setPosting] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; type: "error" | "success" | "loading" } | null>(null);
  const [clientModal, setClientModal] = useState<{ pseudo: string } | null>(null);
  const [feedTab, setFeedTab] = useState<"feed" | "wall">("feed");

  // Messages state (for handler compatibility)
  const [chatMessages, setChatMessages] = useState<{ id: string; client_id: string; content: string; created_at: string; sender_type: string; read?: boolean; model?: string }[]>([]);

  // ── Load data ──
  useEffect(() => {
    if (!modelSlug) return; // No model selected — skip fetches
    const headers = authHeaders();
    const safeFetch = (url: string) => fetch(url, { headers }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

    safeFetch(`/api/codes?model=${toModelId(_modelSlug)}`)
      .then(d => setCodes(d.codes || []))
      .catch(err => console.error("[Cockpit] codes:", err));

    safeFetch(`/api/clients?model=${toModelId(_modelSlug)}`)
      .then(d => setClients(d.clients || []))
      .catch(err => console.error("[Cockpit] clients:", err));

    safeFetch(`/api/packs?model=${toModelId(_modelSlug)}`)
      .then(d => { if (d.packs?.length > 0) setPacks(d.packs); })
      .catch(err => console.error("[Cockpit] packs:", err));

    safeFetch(`/api/models/${toModelId(_modelSlug)}`)
      .then(d => setModelInfo(d))
      .catch(err => console.error("[Cockpit] model info:", err));

    safeFetch(`/api/posts?model=${toModelId(_modelSlug)}`)
      .then(d => setFeedPosts((d.posts || []).slice(0, 5)))
      .catch(err => console.error("[Cockpit] posts:", err));

    safeFetch(`/api/wall?model=${toModelId(_modelSlug)}`)
      .then(d => setWallPosts((d.posts || []).slice(0, 20)))
      .catch(err => console.error("[Cockpit] wall:", err));

    // Messages polling handled by Header component
  }, [modelSlug, authHeaders]);

  // Messages & purchase notifications polling handled by Header component

  // Listen for generate event from mobile nav
  useEffect(() => {
    const handler = () => setShowGenerator(true);
    window.addEventListener("heaven:generate", handler);
    return () => window.removeEventListener("heaven:generate", handler);
  }, []);

  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 60000); return () => clearInterval(iv); }, []);

  // ── Computed ──
  const modelId = toModelId(modelSlug);
  const modelCodes = useMemo(() => codes.filter(c => c.model === modelSlug || c.model === modelId), [codes, modelSlug, modelId]);
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
      code, model: toModelId(modelSlug), client: data.client, platform: data.platform,
      role: "client", tier: data.tier, pack: pack?.name || data.tier,
      type: data.type, duration: data.duration, expiresAt: new Date(Date.now() + data.duration * 3600000).toISOString(),
      created: new Date().toISOString(), used: false, active: true, revoked: false, isTrial: false, lastUsed: null,
    };
    setCodes(prev => [...prev, newCode]);
    fetch("/api/codes", { method: "POST", headers: authHeaders(), body: JSON.stringify(newCode) });
    return code;
  }, [packs, modelSlug, authHeaders]);

  // Code/client management is in /agence/clients — dashboard only needs generate modal

  const handleToggleStatus = useCallback(async () => {
    setStatusUpdating(true);
    const newStatus = !modelInfo?.online;
    try {
      const res = await fetch(`/api/models/${toModelId(modelSlug)}`, {
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
        setUploadMsg({ text: "Upload en cours...", type: "loading" });
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: newPostImage, model: toModelId(modelSlug), folder: `heaven/${toModelId(modelSlug)}/posts` }),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          mediaUrl = uploadData.url || null;
          setUploadMsg(null);
        } else {
          const err = await uploadRes.json().catch(() => ({}));
          setUploadMsg({ text: err.error || "Erreur upload image", type: "error" });
          setTimeout(() => setUploadMsg(null), 4000);
          setPosting(false);
          return;
        }
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: toModelId(modelSlug),
          content: newPostContent || null,
          tier_required: newPostTier,
          media_url: mediaUrl,
          media_type: mediaUrl ? "image" : null,
          post_type: newPostType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) setFeedPosts(prev => [data.post, ...prev]);
        setNewPostContent("");
        setNewPostTier("public");
        setNewPostImage(null);
        setNewPostType("feed");
      }
    } catch (err) { console.error("[Feed] create:", err); }
    finally { setPosting(false); }
  }, [newPostContent, newPostTier, newPostImage, newPostType, posting, modelSlug, authHeaders]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await fetch(`/api/posts?id=${postId}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
      setFeedPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) { console.error("[Feed] delete:", err); }
  }, [modelSlug, authHeaders]);

  const TIER_OPTIONS = [
    { id: "p0", label: "Public", color: "#64748B" },
    { id: "p1", label: "Silver", color: "#C0C0C0" },
    { id: "p2", label: "Gold", color: "#D4AF37" },
    { id: "p4", label: "VIP Black", color: "#1C1C1C" },
    { id: "p5", label: "VIP Platinum", color: "#B8860B" },
  ];

  // ══════════ RENDER ══════════
  if (!modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {isRoot ? "Selectionne un modele dans le header" : "Chargement du profil..."}
          </p>
        </div>
      </OsLayout>
    );
  }

  return (
    <OsLayout cpId="agence">
      {/* Upload feedback toast */}
      {uploadMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center gap-2"
          style={{
            background: uploadMsg.type === "error" ? "#DC2626" : uploadMsg.type === "success" ? "#059669" : "var(--surface)",
            color: uploadMsg.type === "loading" ? "var(--text)" : "#fff",
            border: uploadMsg.type === "loading" ? "1px solid var(--border)" : "none",
          }}>
          {uploadMsg.type === "loading" && (
            <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "var(--accent)" }} />
          )}
          {uploadMsg.text}
        </div>
      )}

      <div className="min-h-screen p-4 sm:p-5 md:p-6 lg:p-8 pb-28 md:pb-8" style={{ background: "var(--bg)" }}>
        <div className="max-w-[1400px] mx-auto space-y-5">

          {/* ── Header: Avatar + Name + Status + Actions ── */}
          <div className="flex items-start gap-3 sm:gap-4 fade-up">
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
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const { valid, error } = validateFile(file, UPLOAD_LIMITS.avatar.maxMB);
                  if (!valid) {
                    setUploadMsg({ text: error!, type: "error" });
                    setTimeout(() => setUploadMsg(null), 5000);
                    e.target.value = "";
                    return;
                  }
                  setUploadMsg({ text: "Upload en cours...", type: "loading" });
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      const upRes = await fetch("/api/upload", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ file: reader.result, model: toModelId(modelSlug), folder: `heaven/${toModelId(modelSlug)}/avatar` }),
                      });
                      if (upRes.ok) {
                        const { url } = await upRes.json();
                        if (url) {
                          setModelInfo(prev => prev ? { ...prev, avatar: url } : prev);
                          fetch(`/api/models/${toModelId(modelSlug)}`, {
                            method: "PUT", headers: authHeaders(),
                            body: JSON.stringify({ avatar: url }),
                          });
                          setUploadMsg({ text: "Photo de profil mise a jour", type: "success" });
                        }
                      } else {
                        const err = await upRes.json().catch(() => ({}));
                        setUploadMsg({ text: err.error || "Erreur upload", type: "error" });
                      }
                    } catch {
                      setUploadMsg({ text: "Erreur reseau", type: "error" });
                    }
                    setTimeout(() => setUploadMsg(null), 3000);
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
                    await fetch(`/api/models/${toModelId(modelSlug)}`, {
                      method: "PUT",
                      headers: authHeaders(),
                      body: JSON.stringify({ status: newStatus }),
                    });
                  } catch {}
                }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a href={`/m/${modelSlug}`} target="_blank"
                className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid var(--border)" }}>
                <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px] font-semibold hidden sm:inline sm:ml-1.5" style={{ color: "var(--text-muted)" }}>Profil</span>
              </a>
              <a href={`/m/${modelSlug}?edit=true`}
                className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform no-underline"
                style={{ background: "rgba(230,51,41,0.12)", border: "1px solid rgba(230,51,41,0.25)" }}>
                <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                <span className="text-[11px] font-semibold hidden sm:inline sm:ml-1.5" style={{ color: "var(--accent)" }}>Edit</span>
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

          {/* ── Feed Tabs: Feed (posts+media) / Wall (visitor messages) ── */}
          <div className="fade-up-2">
            <div className="flex items-center gap-1 mb-4">
              {[
                { id: "feed" as const, label: "Feed", icon: ImageIcon },
                { id: "wall" as const, label: "Wall", icon: Newspaper },
              ].map(tab => (
                <button key={tab.id} onClick={() => setFeedTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  style={{
                    background: feedTab === tab.id ? "var(--surface)" : "transparent",
                    color: feedTab === tab.id ? "var(--text)" : "var(--text-muted)",
                    border: feedTab === tab.id ? "1px solid var(--border)" : "1px solid transparent",
                    boxShadow: feedTab === tab.id ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                  }}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: Feed — composer + posts/media chronologically (synced with public profile) ── */}
            {feedTab === "feed" && (
              <div className="space-y-4 min-w-0">
                {/* Composer */}
                <div className="rounded-2xl p-3 sm:p-5" style={{ background: "var(--surface)", border: newPostType === "story" ? "1px solid var(--accent)" : "1px solid var(--border)", boxShadow: newPostType === "story" ? "0 0 0 1px rgba(230,51,41,0.15)" : "none" }}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0"
                      style={{ background: "linear-gradient(135deg, #F43F5E, #E63329)", color: "#fff" }}>
                      {modelSlug.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                        placeholder="Quoi de neuf ?" rows={2}
                        className="w-full bg-transparent text-sm outline-none resize-none"
                        style={{ color: "var(--text)" }} />
                      {posting && newPostImage && (
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full transition-all duration-1000" style={{ background: "var(--accent)", width: "70%", animation: "uploadProgress 2s ease-in-out infinite" }} />
                        </div>
                      )}
                      {newPostImage && !posting && (
                        <div className="relative w-full rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", maxHeight: 200 }}>
                          <img src={newPostImage} alt="" className="w-full h-full object-cover" draggable={false} />
                          <button onClick={() => setNewPostImage(null)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {/* Row 1: Type toggle + Photo button */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid var(--border)" }}>
                          {([
                            { id: "feed" as const, label: "Feed", Icon: Newspaper },
                            { id: "story" as const, label: "Story", Icon: Camera },
                          ]).map(opt => (
                            <button key={opt.id} onClick={() => setNewPostType(opt.id)}
                              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium cursor-pointer transition-colors"
                              style={{
                                background: newPostType === opt.id ? "var(--accent)" : "transparent",
                                color: newPostType === opt.id ? "#fff" : "var(--text-muted)",
                                border: "none",
                              }}>
                              <opt.Icon className="w-3 h-3" />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer shrink-0"
                          style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                          <ImageIcon className="w-3.5 h-3.5" /> Photo
                          <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const { valid, error } = validateFile(file, UPLOAD_LIMITS.post.maxMB);
                            if (!valid) {
                              setUploadMsg({ text: error!, type: "error" });
                              setTimeout(() => setUploadMsg(null), 5000);
                              e.target.value = ""; return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => setNewPostImage(reader.result as string);
                            reader.readAsDataURL(file); e.target.value = "";
                          }} />
                        </label>
                      </div>
                      {/* Row 2: Tier selection — wraps on mobile */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {TIER_OPTIONS.map(t => (
                          <button key={t.id} onClick={() => setNewPostTier(t.id)}
                            className="px-2.5 py-1.5 rounded-full text-[11px] font-bold cursor-pointer shrink-0"
                            style={{
                              background: newPostTier === t.id ? `${t.color}20` : "transparent",
                              color: newPostTier === t.id ? t.color : "var(--text-muted)",
                              border: `1px solid ${newPostTier === t.id ? `${t.color}40` : "var(--border)"}`,
                            }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !newPostImage) || posting}
                        className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.01] disabled:opacity-30"
                        style={{ background: "var(--accent)", color: "#fff" }}>
                        {posting ? "Envoi en cours..." : "Publier"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Posts feed */}
                {feedPosts.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Publie ton premier post</p>
                  </div>
                ) : feedPosts.slice(0, 15).map(post => (
                  <div key={post.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {post.media_url && (
                      <div className="relative">
                        <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" />
                        <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", color: "#fff" }}>
                              {modelSlug.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{modelInfo?.display_name || modelSlug}</span>
                            {!isFreeSlot(post.tier_required) && (
                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                                {toSlot(post.tier_required).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-3">
                      {!post.media_url && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg, #F43F5E, #E63329)", color: "#fff" }}>
                            {modelSlug.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{modelInfo?.display_name || modelSlug}</span>
                          {!isFreeSlot(post.tier_required) && (
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{
                              background: (TIER_OPTIONS.find(t => t.id === toSlot(post.tier_required))?.color || "#64748B") + "20",
                              color: TIER_OPTIONS.find(t => t.id === toSlot(post.tier_required))?.color || "#64748B",
                            }}>{toSlot(post.tier_required).toUpperCase()}</span>
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
                ))}
              </div>
            )}

            {/* ── TAB: Wall — visitor messages from public profile (synced with /m/[slug] wall) ── */}
            {feedTab === "wall" && (
              <div className="max-w-3xl space-y-4">
                {/* Pending purchases at top */}
                {pendingPurchases.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#B45309" }}>
                      ⏳ {pendingPurchases.length} achat(s) en attente de validation
                    </p>
                    {pendingPurchases.map(p => {
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
                            <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>@{pseudo} — {item}</p>
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                              {amount}€ · {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <button onClick={async () => {
                            try {
                              await fetch(`/api/wall?id=${p.id}`, { method: "DELETE", headers: authHeaders() });
                              setWallPosts(prev => prev.filter(w => w.id !== p.id));
                            } catch {}
                          }} className="px-3 py-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-105"
                            style={{ background: "#16A34A", color: "#fff", border: "none" }}>
                            ✓ Valider
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Client wall messages */}
                {(() => {
                  const clientMessages = wallPosts.filter(w => !w.content?.includes("#post-") && w.pseudo !== "SYSTEM");
                  if (clientMessages.length === 0 && pendingPurchases.length === 0) return (
                    <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun message pour le moment</p>
                    </div>
                  );
                  return clientMessages.slice(0, 30).map(w => (
                    <div key={w.id} className="rounded-2xl p-4 group" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-muted)" }}>
                          {w.pseudo?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setClientModal({ pseudo: w.pseudo })}
                              className="text-[11px] font-bold cursor-pointer hover:underline" style={{ color: "var(--text)", background: "none", border: "none", padding: 0 }}>
                              @{w.pseudo}
                            </button>
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {new Date(w.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{w.content}</p>
                        </div>
                        <button onClick={async () => {
                          try {
                            await fetch(`/api/wall?id=${w.id}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
                            setWallPosts(prev => prev.filter(p => p.id !== w.id));
                          } catch {}
                        }} className="opacity-0 group-hover:opacity-100 text-xs cursor-pointer hover:text-red-500 transition-all shrink-0"
                          style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ));
                })()}

                {/* Voir plus → Clients CRM */}
                <a href="/agence/clients"
                  className="block text-center py-3 rounded-xl text-xs font-bold no-underline transition-all hover:scale-[1.01]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent)" }}>
                  Voir tout dans Clients →
                </a>
              </div>
            )}
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
                      const clientData: Record<string, unknown> = { model: toModelId(modelSlug), last_active: new Date().toISOString() };
                      if (plat === "snapchat") clientData.pseudo_snap = pseudo.toLowerCase();
                      else clientData.pseudo_insta = pseudo.toLowerCase();
                      await fetch("/api/clients", { method: "POST", headers: authHeaders(), body: JSON.stringify(clientData) });
                      if (assignCode) {
                        const codeStr = `${modelSlug.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
                        await fetch("/api/codes", {
                          method: "POST",
                          headers: authHeaders(),
                          body: JSON.stringify({ model: toModelId(modelSlug), code: codeStr, client: pseudo.toLowerCase(), platform: plat, tier, duration: 720, type: "paid" }),
                        });
                      }
                      setClientModal(null);
                      window.location.reload();
                    } catch {}
                  }} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Pseudo</label>
                      <input name="pseudo" defaultValue={clientModal.pseudo} className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Plateforme</label>
                        <select name="platform" defaultValue="snapchat" className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                          <option value="snapchat">Snapchat</option>
                          <option value="instagram">Instagram</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Pack</label>
                        <select name="tier" defaultValue="p1" className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}>
                          <option value="p1">Silver</option>
                          <option value="p2">Gold</option>
                          <option value="p4">VIP Black</option>
                          <option value="p5">VIP Platinum</option>
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

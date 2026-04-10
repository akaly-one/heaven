"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Eye, Pencil, Image as ImageIcon, Heart, MessageCircle, Trash2, X,
  Newspaper, Camera, RefreshCw, Users, Key, DollarSign, TrendingUp,
  Copy, Check, Plus, Search, Shield, BarChart3, Clock, Zap, Settings,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { GenerateModal } from "@/components/cockpit/generate-modal";
import type { PackConfig, AccessCode, ClientInfo, FeedPost, WallPost } from "@/types/heaven";
import { DEFAULT_PACKS } from "@/constants/packs";
import { toSlot, isFreeSlot } from "@/lib/tier-utils";
import { toModelId } from "@/lib/model-utils";

// ── Upload config ──
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_IMAGE_EXT = "JPG, PNG, WEBP, GIF";
const UPLOAD_LIMITS = { avatar: { maxMB: 5 }, post: { maxMB: 10 } } as const;

function validateFile(file: File, maxMB: number): { valid: boolean; error?: string } {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    const ext = file.name.split(".").pop()?.toUpperCase() || file.type;
    return { valid: false, error: `Format "${ext}" non supporte. Formats : ${ACCEPTED_IMAGE_EXT}` };
  }
  if (file.size / (1024 * 1024) > maxMB) {
    return { valid: false, error: `Fichier trop lourd (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max ${maxMB}MB` };
  }
  return { valid: true };
}

function generateCodeString(model: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = ""; for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `${model.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${r}`;
}

function isExpired(expiresAt: string): boolean { return new Date(expiresAt).getTime() <= Date.now(); }

const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat("fr-FR");

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const TIER_OPTIONS = [
  { id: "p0", label: "Public", color: "#64748B" },
  { id: "p1", label: "Silver", color: "#C0C0C0" },
  { id: "p2", label: "Gold", color: "#D4AF37" },
  { id: "p4", label: "VIP Black", color: "#8B5CF6" },
  { id: "p5", label: "VIP Platinum", color: "#B8860B" },
];

// ── Clean surface primitives (no glassmorphism) ──
const surface = "bg-white/[0.03] border border-white/[0.06] rounded-xl";

function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} style={style} />;
}

// ── Tab definitions ──
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Contenu" },
  { id: "clients", label: "Clients" },
  { id: "revenue", label: "Revenus" },
  { id: "settings", label: "Packs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth, authHeaders, isRoot, ready } = useModel();
  const _modelSlug = currentModel || auth?.model_slug || null;
  const modelSlug = _modelSlug ?? "";

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<TabId>("overview");

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
  const [newPostTier, setNewPostTier] = useState("p0");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [newPostType, setNewPostType] = useState<"feed" | "story">("feed");
  const [posting, setPosting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; type: "error" | "success" | "loading" } | null>(null);
  const [contentSubTab, setContentSubTab] = useState<"feed" | "wall" | "stories">("feed");
  const [clientSearch, setClientSearch] = useState("");
  const [codeCopied, setCodeCopied] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Pull-to-refresh ──
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pullThreshold = 80;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setDataLoaded(null);
    setLoadRetries(0);
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
      else touchStartY.current = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartY.current || refreshing) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0 && window.scrollY === 0) setPullY(Math.min(dy * 0.5, 120));
    };
    const onTouchEnd = () => {
      if (pullY >= pullThreshold && !refreshing) handleRefresh();
      setPullY(0);
      touchStartY.current = 0;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY, refreshing, handleRefresh]);

  // ── Load data ──
  const [dataLoaded, setDataLoaded] = useState<string | null>(null);
  const [loadRetries, setLoadRetries] = useState(0);
  useEffect(() => {
    if (!ready || !modelSlug) return;
    if (dataLoaded === modelSlug) return;
    const mid = toModelId(modelSlug);
    const headers = { "Content-Type": "application/json" };
    const safeFetch = (url: string) => fetch(url, { headers }).then(r => {
      if (!r.ok) { console.warn(`[Dashboard] ${url} → ${r.status}`); return null; }
      return r.json();
    }).catch(err => { console.warn(`[Dashboard] ${url} failed:`, err); return null; });

    Promise.all([
      safeFetch(`/api/codes?model=${mid}`),
      safeFetch(`/api/clients?model=${mid}`),
      safeFetch(`/api/packs?model=${mid}`),
      safeFetch(`/api/models/${mid}`),
      safeFetch(`/api/posts?model=${mid}`),
      safeFetch(`/api/wall?model=${mid}`),
    ]).then(([codesData, clientsData, packsData, modelData, postsData, wallData]) => {
      if (codesData?.codes) setCodes(codesData.codes);
      if (clientsData?.clients) setClients(clientsData.clients);
      if (packsData?.packs?.length > 0) setPacks(packsData.packs);
      if (modelData) setModelInfo(modelData);
      if (postsData?.posts) setFeedPosts(postsData.posts.slice(0, 5));
      if (wallData?.posts) setWallPosts(wallData.posts.slice(0, 20));
      setDataLoaded(modelSlug);
      setRefreshing(false);
    }).catch(() => {
      setRefreshing(false);
      if (loadRetries < 3) setTimeout(() => setLoadRetries(r => r + 1), 2000);
    });
  }, [ready, modelSlug, dataLoaded, loadRetries]);

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
  const retentionRate = useMemo(() => {
    if (modelCodes.length === 0) return 0;
    const renewed = modelCodes.filter(c => !c.revoked && c.type === "paid").length;
    const total = modelCodes.filter(c => c.type === "paid").length;
    return total > 0 ? Math.round((renewed / total) * 100) : 0;
  }, [modelCodes]);
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.pseudo_snap?.toLowerCase().includes(q) ||
      c.pseudo_insta?.toLowerCase().includes(q) ||
      c.nickname?.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);
  const stories = useMemo(() => feedPosts.filter(p => (p as FeedPost & { post_type?: string }).post_type === "story"), [feedPosts]);

  // ── Recent activity (for overview) ──
  const recentActivity = useMemo(() => {
    const items: { text: string; time: string; type: string }[] = [];
    clients.slice(0, 3).forEach(c => {
      const handle = c.pseudo_snap || c.pseudo_insta || c.nickname || "?";
      items.push({ text: `Nouvel abonne @${handle}`, time: c.last_active || "", type: "client" });
    });
    feedPosts.slice(0, 2).forEach(p => {
      items.push({ text: `Post: "${(p.content || "Media").slice(0, 40)}${(p.content || "").length > 40 ? "..." : ""}"`, time: p.created_at, type: "post" });
    });
    modelCodes.filter(c => c.type === "paid" && !c.revoked).slice(0, 2).forEach(c => {
      const pack = packs.find(p => p.id === c.tier);
      items.push({ text: `Paiement ${fmt.format(pack?.price || 0)} — @${c.client}`, time: c.created, type: "revenue" });
    });
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [clients, feedPosts, modelCodes, packs]);

  // ── Actions ──
  const handleGenerate = useCallback(async (data: { client: string; platform: string; tier: string; duration: number; type: "paid" | "promo" | "gift" }) => {
    const code = generateCodeString(modelSlug);
    const pack = packs.find(p => p.id === data.tier);
    const newCode: AccessCode = {
      code, model: toModelId(modelSlug), client: data.client, platform: data.platform,
      role: "client", tier: data.tier, pack: pack?.name || data.tier,
      type: data.type, duration: data.duration, expiresAt: new Date(Date.now() + data.duration * 3600000).toISOString(),
      created: new Date().toISOString(), used: false, active: true, revoked: false, isTrial: false, lastUsed: null,
    };
    setCodes(prev => [...prev, newCode]);
    try {
      await fetch("/api/codes", { method: "POST", headers: authHeaders(), body: JSON.stringify(newCode) });
    } catch (err) { console.error("[Agence] Failed to persist code:", err); }
    return code;
  }, [packs, modelSlug, authHeaders]);

  const handleToggleStatus = useCallback(async () => {
    setStatusUpdating(true);
    const newStatus = !modelInfo?.online;
    try {
      const res = await fetch(`/api/models/${toModelId(modelSlug)}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ online: newStatus }),
      });
      if (res.ok) setModelInfo(prev => prev ? { ...prev, online: newStatus } : prev);
    } catch { /* */ }
    setStatusUpdating(false);
  }, [modelSlug, modelInfo, authHeaders]);

  const handleCreatePost = useCallback(async () => {
    if ((!newPostContent.trim() && !newPostImage) || posting) return;
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      if (newPostImage) {
        setUploadMsg({ text: "Upload en cours...", type: "loading" });
        const uploadRes = await fetch("/api/upload", {
          method: "POST", headers: { "Content-Type": "application/json" },
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
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          model: toModelId(modelSlug), content: newPostContent || null,
          tier_required: newPostTier, media_url: mediaUrl, media_type: mediaUrl ? "image" : null, post_type: newPostType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) setFeedPosts(prev => [data.post, ...prev]);
        setNewPostContent(""); setNewPostTier("p0"); setNewPostImage(null); setNewPostType("feed");
      }
    } catch (err) { console.error("[Feed] create:", err); }
    finally { setPosting(false); }
  }, [newPostContent, newPostTier, newPostImage, newPostType, posting, modelSlug, authHeaders]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await fetch(`/api/posts?id=${postId}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
      setFeedPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) { console.error("[Feed] delete:", err); }
    setDeleteConfirm(null);
  }, [modelSlug, authHeaders]);

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(code);
    setTimeout(() => setCodeCopied(null), 2000);
  }, []);

  // Auto-refresh safety net for model accounts
  useEffect(() => {
    if (ready && !modelSlug && !isRoot) {
      const t = setTimeout(() => {
        const raw = sessionStorage.getItem("heaven_auth");
        if (raw) window.location.reload();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [ready, modelSlug, isRoot]);

  // ══════════ LOADING STATES ══════════
  if (!ready) {
    return (
      <OsLayout cpId="agence">
        <div className="min-h-screen p-4 md:p-6" style={{ background: "#0f0f12" }}>
          <div className="max-w-[1400px] mx-auto space-y-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </OsLayout>
    );
  }

  if (!modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-xs text-white/40">{isRoot ? "Selectionne un modele dans le header" : "Chargement..."}</p>
        </div>
      </OsLayout>
    );
  }

  if (dataLoaded !== modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="min-h-screen p-4 md:p-6" style={{ background: "#0f0f12" }}>
          <div className="max-w-[1400px] mx-auto space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </OsLayout>
    );
  }

  // ══════════ RENDER ══════════
  return (
    <OsLayout cpId="agence">
      {/* Pull-to-refresh */}
      {(pullY > 0 || refreshing) && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 transition-all duration-200"
          style={{ opacity: refreshing ? 1 : Math.min(pullY / pullThreshold, 1), transform: `translateX(-50%) translateY(${refreshing ? 8 : Math.min(pullY * 0.3, 24)}px)` }}>
          <div className="rounded-full p-2 bg-[#141419] border border-white/[0.08]">
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${refreshing ? "animate-spin" : ""}`}
              style={{ transform: refreshing ? "none" : `rotate(${Math.min(pullY / pullThreshold, 1) * 360}deg)` }} />
          </div>
        </div>
      )}

      {/* Upload toast */}
      {uploadMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded-lg text-[11px] font-medium shadow-xl flex items-center gap-2"
          style={{
            background: uploadMsg.type === "error" ? "#DC2626" : uploadMsg.type === "success" ? "#059669" : "#141419",
            color: "#fff", border: "1px solid rgba(255,255,255,0.08)",
          }}>
          {uploadMsg.type === "loading" && <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "#D4AF37" }} />}
          {uploadMsg.text}
        </div>
      )}

      <div className="min-h-screen p-3 sm:p-4 md:p-6 pb-24 md:pb-6" style={{ background: "#0f0f12" }}>
        <div className="max-w-[1400px] mx-auto space-y-5">

          {/* ══ HEADER ══ */}
          <div className="flex items-center gap-4 py-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <label className="cursor-pointer">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-base font-black"
                  style={{ background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
                  {modelInfo?.avatar ? <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" /> : modelSlug.charAt(0).toUpperCase()}
                </div>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const { valid, error } = validateFile(file, UPLOAD_LIMITS.avatar.maxMB);
                  if (!valid) { setUploadMsg({ text: error!, type: "error" }); setTimeout(() => setUploadMsg(null), 5000); e.target.value = ""; return; }
                  setUploadMsg({ text: "Upload en cours...", type: "loading" });
                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      const upRes = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ file: reader.result, model: toModelId(modelSlug), folder: `heaven/${toModelId(modelSlug)}/avatar` }) });
                      if (upRes.ok) {
                        const { url } = await upRes.json();
                        if (url) {
                          setModelInfo(prev => prev ? { ...prev, avatar: url } : prev);
                          fetch(`/api/models/${toModelId(modelSlug)}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ avatar: url }) });
                          setUploadMsg({ text: "Photo mise a jour", type: "success" });
                        }
                      } else { setUploadMsg({ text: "Erreur upload", type: "error" }); }
                    } catch { setUploadMsg({ text: "Erreur reseau", type: "error" }); }
                    setTimeout(() => setUploadMsg(null), 3000);
                  };
                  reader.readAsDataURL(file); e.target.value = "";
                }} />
              </label>
              <button onClick={handleToggleStatus} disabled={statusUpdating}
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full cursor-pointer transition-all border-none p-0 disabled:opacity-50"
                style={{ background: modelInfo?.online ? "#10B981" : "#6B7280", boxShadow: `0 0 0 2.5px #0f0f12` }} />
            </div>

            {/* Name inline */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-lg font-bold text-white truncate">
                {modelInfo?.display_name || auth?.display_name || modelSlug.toUpperCase()}
              </span>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: modelInfo?.online ? "#10B981" : "#6B7280" }} />
              <span className="text-xs text-white/30 shrink-0">{modelInfo?.online ? "en ligne" : "hors ligne"}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => setShowGenerator(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all hover:brightness-110 active:scale-95 border-none"
                style={{ background: "#D4AF37", color: "#0f0f12" }}>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Generer</span>
              </button>
              <a href={`/m/${modelSlug}`} target="_blank"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium no-underline text-white/40 hover:text-white/60 transition-colors border border-white/[0.06] bg-transparent">
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Profil</span>
              </a>
              <a href={`/m/${modelSlug}?edit=true`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium no-underline text-white/40 hover:text-white/60 transition-colors border border-white/[0.06] bg-transparent">
                <Pencil className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* ══ KPI BAR ══ */}
          <div className="flex items-center gap-0 border-b border-white/[0.06] pb-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 pr-5">
              <span className="text-xs text-white/30 uppercase tracking-wider font-medium">Revenue</span>
              <span className="text-base font-bold text-[#D4AF37] tabular-nums">{fmt.format(revenue)}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.08] shrink-0" />
            <div className="flex items-center gap-2 px-5">
              <span className="text-xs text-white/30 uppercase tracking-wider font-medium">Abonnes</span>
              <span className="text-base font-bold text-white tabular-nums">{fmtNum.format(uniqueClients)}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.08] shrink-0" />
            <div className="flex items-center gap-2 px-5">
              <span className="text-xs text-white/30 uppercase tracking-wider font-medium">Posts</span>
              <span className="text-base font-bold text-white tabular-nums">{feedPosts.length}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.08] shrink-0" />
            <div className="flex items-center gap-2 px-5">
              <span className="text-xs text-white/30 uppercase tracking-wider font-medium">Retention</span>
              <span className="text-base font-bold text-white tabular-nums">{retentionRate}%</span>
            </div>
            <div className="w-px h-4 bg-white/[0.08] shrink-0" />
            <div className="flex items-center gap-2 pl-5">
              <span className="text-xs text-white/30 uppercase tracking-wider font-medium">Codes</span>
              <span className="text-base font-bold text-white tabular-nums">{activeCodes.length}/{modelCodes.length}</span>
            </div>
          </div>

          {/* ══ UNDERLINE TABS ══ */}
          <div className="flex items-center gap-7 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="relative pb-3 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap bg-transparent border-none px-0"
                  style={{ color: isActive ? "#D4AF37" : "rgba(255,255,255,0.35)" }}>
                  {tab.label}
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#D4AF37" }} />}
                </button>
              );
            })}
          </div>

          {/* ══════════ TAB: OVERVIEW ══════════ */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Two-column: Activity + Quick stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Recent Activity — table style */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Activite recente</span>
                  </div>
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-white/20 py-4">Aucune activite recente</p>
                  ) : (
                    <div className={`${surface} overflow-hidden`}>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Type</th>
                            <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Detail</th>
                            <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Quand</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentActivity.map((item, i) => (
                            <tr key={i} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{
                                  background: item.type === "revenue" ? "rgba(212,175,55,0.1)" : item.type === "client" ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.1)",
                                  color: item.type === "revenue" ? "#D4AF37" : item.type === "client" ? "#10B981" : "#8B5CF6",
                                }}>{item.type === "revenue" ? "Paiement" : item.type === "client" ? "Client" : "Contenu"}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-white/60 truncate max-w-[400px]">{item.text}</td>
                              <td className="px-4 py-3 text-xs text-white/25 text-right tabular-nums whitespace-nowrap">{item.time ? relativeTime(item.time) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Quick Stats sidebar — compact list */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Apercu</span>
                  </div>
                  <div className={`${surface} divide-y divide-white/[0.04]`}>
                    {[
                      { label: "Codes actifs", value: String(activeCodes.length), color: "#10B981" },
                      { label: "Total codes", value: String(modelCodes.length), color: "#fff" },
                      { label: "Messages wall", value: String(wallPosts.filter(w => w.pseudo !== "SYSTEM").length), color: "#fff" },
                      { label: "Codes vendus", value: String(modelCodes.filter(c => c.type === "paid" && !c.revoked).length), color: "#D4AF37" },
                      { label: "Stories", value: String(stories.length), color: "#fff" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-white/40">{row.label}</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: row.color }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ TAB: CONTENT ══════════ */}
          {activeTab === "content" && (
            <div className="space-y-4">
              {/* Content sub-tabs — underline style */}
              <div className="flex items-center gap-5">
                {[
                  { id: "feed" as const, label: "Feed" },
                  { id: "wall" as const, label: "Wall" },
                  { id: "stories" as const, label: `Stories${stories.length > 0 ? ` (${stories.length})` : ""}` },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setContentSubTab(tab.id)}
                    className="relative pb-2 text-xs font-medium cursor-pointer transition-colors bg-transparent border-none px-0"
                    style={{ color: contentSubTab === tab.id ? "#D4AF37" : "rgba(255,255,255,0.35)" }}>
                    {tab.label}
                    {contentSubTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#D4AF37" }} />}
                  </button>
                ))}
              </div>

              {/* ── FEED SUB-TAB ── */}
              {contentSubTab === "feed" && (
                <div className="space-y-3">
                  {/* Compact composer */}
                  <div className={`${surface} p-3`}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
                        {modelSlug.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                          placeholder={newPostType === "story" ? "Texte de ta story..." : "Partager quelque chose..."}
                          rows={1}
                          className="w-full bg-transparent text-xs outline-none resize-none text-white placeholder:text-white/20" />

                        {newPostType === "story" && !newPostImage && (
                          <p className="text-[10px] flex items-center gap-1 text-[#E63329]"><Camera className="w-3 h-3" /> Ajoute une photo</p>
                        )}

                        {posting && newPostImage && (
                          <div className="h-0.5 rounded-full overflow-hidden bg-white/[0.06]">
                            <div className="h-full rounded-full bg-[#D4AF37]" style={{ animation: "uploadProg 2s ease-in-out infinite" }} />
                          </div>
                        )}

                        {newPostImage && !posting && (
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/[0.06]">
                            <img src={newPostImage} alt="" className="w-full h-full object-cover" draggable={false} />
                            <button onClick={() => setNewPostImage(null)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer bg-black/70 text-white border-none hover:scale-110 transition-transform">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                        {/* Controls row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center rounded-md overflow-hidden border border-white/[0.06]">
                            {(["feed", "story"] as const).map(type => (
                              <button key={type} onClick={() => setNewPostType(type)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium cursor-pointer transition-colors border-none"
                                style={{ background: newPostType === type ? "rgba(230,51,41,0.2)" : "transparent", color: newPostType === type ? "#E63329" : "rgba(255,255,255,0.3)" }}>
                                {type === "feed" ? <Newspaper className="w-2.5 h-2.5" /> : <Camera className="w-2.5 h-2.5" />}
                                {type === "feed" ? "Feed" : "Story"}
                              </button>
                            ))}
                          </div>

                          <label className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border border-white/[0.06] text-white/30 hover:text-white/50 transition-colors">
                            <ImageIcon className="w-2.5 h-2.5" /> Photo
                            <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              const { valid, error } = validateFile(file, UPLOAD_LIMITS.post.maxMB);
                              if (!valid) { setUploadMsg({ text: error!, type: "error" }); setTimeout(() => setUploadMsg(null), 5000); e.target.value = ""; return; }
                              const reader = new FileReader();
                              reader.onload = () => setNewPostImage(reader.result as string);
                              reader.readAsDataURL(file); e.target.value = "";
                            }} />
                          </label>

                          {(newPostContent.trim() || newPostImage) && (
                            <div className="flex items-center gap-1 ml-auto">
                              {TIER_OPTIONS.filter(t => t.id !== "p0").map(t => {
                                const selected = newPostTier === t.id;
                                return (
                                  <button key={t.id} onClick={() => setNewPostTier(selected ? "p0" : t.id)}
                                    className="px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer shrink-0 transition-all border-none"
                                    style={{
                                      background: selected ? t.color : "transparent",
                                      color: selected ? "#fff" : "rgba(255,255,255,0.3)",
                                      outline: `1px solid ${selected ? t.color : "rgba(255,255,255,0.08)"}`,
                                    }}>
                                    {t.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !newPostImage) || posting}
                            className="ml-auto px-4 py-1.5 rounded-md text-[11px] font-bold cursor-pointer transition-all hover:brightness-110 disabled:opacity-20 border-none"
                            style={{ background: "#D4AF37", color: "#0f0f12" }}>
                            {posting ? "..." : "Publier"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post grid — compact thumbnails */}
                  {feedPosts.length === 0 ? (
                    <p className="text-xs text-white/20 py-6 text-center">Aucun post pour le moment</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                      {feedPosts.slice(0, 20).map((post) => (
                        <div key={post.id} className="relative group rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer"
                          style={{ aspectRatio: "1" }}>
                          {post.media_url ? (
                            <img src={post.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-2">
                              <p className="text-[10px] text-white/40 line-clamp-4 text-center leading-tight">{post.content}</p>
                            </div>
                          )}
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center gap-3 text-white/80">
                              <span className="flex items-center gap-1 text-[10px]"><Heart className="w-3 h-3" />{post.likes_count || 0}</span>
                              <span className="flex items-center gap-1 text-[10px]"><MessageCircle className="w-3 h-3" />{post.comments_count || 0}</span>
                            </div>
                            {!isFreeSlot(post.tier_required) && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/15 text-white mt-0.5">
                                {toSlot(post.tier_required).toUpperCase()}
                              </span>
                            )}
                            <span className="text-[9px] text-white/40">{relativeTime(post.created_at)}</span>
                            {deleteConfirm === post.id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <button onClick={() => handleDeletePost(post.id)} className="text-[10px] font-semibold text-red-400 cursor-pointer bg-transparent border-none">Suppr</button>
                                <button onClick={() => setDeleteConfirm(null)} className="text-[10px] text-white/40 cursor-pointer bg-transparent border-none">Non</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(post.id)} className="mt-1 cursor-pointer bg-transparent border-none text-white/30 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── WALL SUB-TAB ── */}
              {contentSubTab === "wall" && (
                <div className="space-y-0">
                  {(() => {
                    const clientMessages = wallPosts.filter(w => !w.content?.includes("#post-") && w.pseudo !== "SYSTEM");
                    if (clientMessages.length === 0) return (
                      <p className="text-xs text-white/20 py-6 text-center">Aucun message pour le moment</p>
                    );
                    return (
                      <div className={`${surface} overflow-hidden`}>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/[0.06]">
                              <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Pseudo</th>
                              <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Message</th>
                              <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Date</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {clientMessages.slice(0, 30).map(w => (
                              <tr key={w.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors group">
                                <td className="px-4 py-3 text-sm font-semibold text-white whitespace-nowrap">@{w.pseudo}</td>
                                <td className="px-4 py-3 text-sm text-white/50 truncate max-w-[400px]">{w.content}</td>
                                <td className="px-4 py-3 text-xs text-white/25 text-right tabular-nums whitespace-nowrap">{relativeTime(w.created_at)}</td>
                                <td className="px-2 py-2">
                                  <button onClick={async () => {
                                    try {
                                      await fetch(`/api/wall?id=${w.id}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
                                      setWallPosts(prev => prev.filter(p => p.id !== w.id));
                                    } catch {}
                                  }} className="opacity-0 group-hover:opacity-100 cursor-pointer bg-transparent border-none text-white/20 hover:text-red-400 transition-all p-0.5">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                  <a href="/agence/clients" className="block text-center py-2.5 text-[11px] font-medium text-[#D4AF37] no-underline hover:underline mt-2">
                    Voir tout dans Clients
                  </a>
                </div>
              )}

              {/* ── STORIES SUB-TAB ── */}
              {contentSubTab === "stories" && (
                <div>
                  {stories.length === 0 ? (
                    <p className="text-xs text-white/20 py-6 text-center">Aucune story active. Change le type en &quot;Story&quot; dans le composer.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {stories.map(s => (
                        <div key={s.id} className="relative rounded-lg overflow-hidden aspect-[9/16] group cursor-pointer border border-white/[0.04] hover:border-white/[0.1] transition-all">
                          {s.media_url && <img src={s.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                          <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 50%, rgba(0,0,0,0.7))" }} />
                          <div className="absolute bottom-2 left-2 right-2">
                            {s.content && <p className="text-[10px] text-white font-medium line-clamp-2">{s.content}</p>}
                            <p className="text-[9px] text-white/40 mt-0.5">{relativeTime(s.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════ TAB: CLIENTS ══════════ */}
          {activeTab === "clients" && (
            <div className="space-y-5">
              {/* Search + header */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.06] text-white outline-none placeholder:text-white/20 focus:border-white/[0.12] transition-colors" />
                </div>
                <span className="text-xs text-white/30 shrink-0">{clients.length} clients · {fmt.format(clients.reduce((s, c) => s + (c.total_spent || 0), 0))}</span>
                <a href="/agence/clients" className="text-xs font-medium text-[#D4AF37] no-underline hover:underline shrink-0">Gerer</a>
              </div>

              {/* Client table */}
              <div className={`${surface} overflow-hidden`}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Handle</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 hidden sm:table-cell">Tier</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 hidden sm:table-cell">Derniere activite</th>
                      <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Depenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-xs text-white/20">{clientSearch ? "Aucun resultat" : "Aucun client"}</td></tr>
                    ) : filteredClients.slice(0, 50).map(c => {
                      const handle = c.pseudo_snap || c.pseudo_insta || c.nickname || "?";
                      const tierLabel = TIER_OPTIONS.find(t => t.id === (c.tier || "p1"))?.label || "Silver";
                      const tierColor = TIER_OPTIONS.find(t => t.id === (c.tier || "p1"))?.color || "#C0C0C0";
                      return (
                        <tr key={c.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-white">@{handle}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs font-semibold" style={{ color: tierColor }}>{tierLabel}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs text-white/30 tabular-nums">{c.last_active ? relativeTime(c.last_active) : "-"}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold text-white/50 tabular-nums">{c.total_spent ? fmt.format(c.total_spent) : "-"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Access Codes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Codes d&apos;acces</span>
                    <span className="text-xs text-white/20">{activeCodes.length} actifs / {modelCodes.length}</span>
                  </div>
                  <button onClick={() => setShowGenerator(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all hover:brightness-110 border-none"
                    style={{ background: "#D4AF37", color: "#0f0f12" }}>
                    <Plus className="w-3 h-3" /> Generer
                  </button>
                </div>

                {modelCodes.length === 0 ? (
                  <p className="text-xs text-white/20 py-4 text-center">Aucun code genere</p>
                ) : (
                  <div className={`${surface} overflow-hidden`}>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Code</th>
                          <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Client</th>
                          <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 hidden sm:table-cell">Tier</th>
                          <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 hidden sm:table-cell">Date</th>
                          <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelCodes.slice(0, 30).map(c => {
                          const expired = isExpired(c.expiresAt);
                          const status = c.revoked ? "Revoque" : expired ? "Expire" : c.active ? "Actif" : "Inactif";
                          const statusColor = c.revoked ? "#EF4444" : expired ? "#6B7280" : c.active ? "#10B981" : "#F59E0B";
                          const tierOption = TIER_OPTIONS.find(t => t.id === c.tier);
                          return (
                            <tr key={c.code} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <code className="text-xs font-mono font-semibold text-white">{c.code}</code>
                                  <button onClick={() => copyCode(c.code)}
                                    className="cursor-pointer bg-transparent border-none text-white/15 hover:text-white/40 transition-colors p-0 opacity-0 group-hover:opacity-100">
                                    {codeCopied === c.code ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-white/50">@{c.client}</td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                {tierOption && <span className="text-[11px] font-semibold" style={{ color: tierOption.color }}>{tierOption.label}</span>}
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell text-xs text-white/25 tabular-nums">{relativeTime(c.created)}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs font-semibold" style={{ color: statusColor }}>{status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ TAB: REVENUE ══════════ */}
          {activeTab === "revenue" && (
            <div className="space-y-5">
              {/* Revenue summary — inline row */}
              <div className="flex items-center gap-8 flex-wrap">
                <div>
                  <span className="text-xs uppercase tracking-wider text-white/30 font-medium">Revenus ce mois</span>
                  <p className="text-lg font-bold text-[#D4AF37] tabular-nums mt-1">{fmt.format(revenue)}</p>
                </div>
                <div className="w-px h-10 bg-white/[0.06]" />
                <div>
                  <span className="text-xs uppercase tracking-wider text-white/30 font-medium">Codes vendus</span>
                  <p className="text-lg font-bold text-white tabular-nums mt-1">{modelCodes.filter(c => c.type === "paid" && !c.revoked).length}</p>
                </div>
                <div className="w-px h-10 bg-white/[0.06]" />
                <div>
                  <span className="text-xs uppercase tracking-wider text-white/30 font-medium">Moy. / client</span>
                  <p className="text-lg font-bold text-white tabular-nums mt-1">{uniqueClients > 0 ? fmt.format(Math.round(revenue / uniqueClients)) : fmt.format(0)}</p>
                </div>
              </div>

              {/* Tier breakdown — table */}
              <div>
                <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Revenus par niveau</span>
                <div className={`${surface} mt-2 overflow-hidden`}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Pack</th>
                        <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Progression</th>
                        <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Revenus</th>
                        <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 w-16">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packs.filter(p => p.active).map(pack => {
                        const count = modelCodes.filter(c => c.tier === pack.id && c.type === "paid" && !c.revoked).length;
                        const tierRevenue = count * pack.price;
                        const maxRevenue = Math.max(...packs.filter(p => p.active).map(p => modelCodes.filter(c => c.tier === p.id && c.type === "paid" && !c.revoked).length * p.price), 1);
                        return (
                          <tr key={pack.id} className="border-b border-white/[0.03] last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: pack.color }} />
                                <span className="text-sm font-medium text-white">{pack.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden w-full max-w-[220px]">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.max((tierRevenue / maxRevenue) * 100, tierRevenue > 0 ? 4 : 0)}%`, background: pack.color }} />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums" style={{ color: pack.color }}>{fmt.format(tierRevenue)}</td>
                            <td className="px-4 py-3 text-right text-xs text-white/30 tabular-nums">{count}x</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Revenue by type — inline */}
              <div>
                <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Repartition par type</span>
                <div className="flex items-center gap-8 mt-3">
                  {[
                    { type: "paid", label: "Payants", color: "#D4AF37" },
                    { type: "promo", label: "Promo", color: "#8B5CF6" },
                    { type: "gift", label: "Cadeaux", color: "#E84393" },
                  ].map(t => {
                    const count = modelCodes.filter(c => c.type === t.type && !c.revoked).length;
                    return (
                      <div key={t.type} className="flex items-center gap-2.5">
                        <span className="text-lg font-bold tabular-nums" style={{ color: t.color }}>{count}</span>
                        <span className="text-sm text-white/35">{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ TAB: SETTINGS (Packs) ══════════ */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Configuration des packs</span>
              <div className={`${surface} overflow-hidden`}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Pack</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Prix</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 hidden sm:table-cell">Status</th>
                      <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Vendus</th>
                      <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Revenus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packs.map(pack => {
                      const soldCount = modelCodes.filter(c => c.tier === pack.id && c.type === "paid" && !c.revoked).length;
                      const packRevenue = soldCount * pack.price;
                      return (
                        <tr key={pack.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: pack.color }} />
                              <span className="text-sm font-semibold text-white">{pack.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-white tabular-nums">{fmt.format(pack.price)}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs font-medium" style={{ color: pack.active ? "#10B981" : "#6B7280" }}>
                              {pack.active ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-white tabular-nums">{soldCount}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold tabular-nums" style={{ color: pack.color }}>{fmt.format(packRevenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Generate Modal ── */}
          <GenerateModal
            open={showGenerator}
            onClose={() => { setShowGenerator(false); setPrefillClient(""); }}
            onGenerate={handleGenerate}
            modelSlug={modelSlug}
            prefillClient={prefillClient}
          />

        </div>
      </div>

      <style>{`
        @keyframes uploadProg { 0% { width: 10%; } 50% { width: 80%; } 100% { width: 10%; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </OsLayout>
  );
}

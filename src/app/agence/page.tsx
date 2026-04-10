"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Eye, Pencil, Image as ImageIcon, Heart, MessageCircle, Trash2, X,
  Newspaper, Camera, RefreshCw, Users, Key, DollarSign, TrendingUp,
  ChevronDown, Copy, Check, Plus, Search, Shield,
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

// ── Glass card primitives ──
const glass = "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl";
const glassHover = "hover:border-white/[0.14] transition-all duration-300";

// ── Skeleton block ──
function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} style={style} />;
}

// ── Collapsible section ──
function Section({ title, count, defaultOpen = false, children }: {
  title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={glass}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer"
        style={{ background: "none", border: "none" }}>
        <span className="text-sm font-semibold text-white flex items-center gap-2.5">
          {title}
          {count !== undefined && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.08] text-white/60">{fmtNum.format(count)}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}

// ══════════ MAIN ══════════
export default function AgenceDashboard() {
  const { currentModel, auth, authHeaders, isRoot, ready } = useModel();
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
  const [newPostTier, setNewPostTier] = useState("p0");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [newPostType, setNewPostType] = useState<"feed" | "story">("feed");
  const [posting, setPosting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; type: "error" | "success" | "loading" } | null>(null);
  const [feedTab, setFeedTab] = useState<"feed" | "wall" | "stories">("feed");
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

  const skeletonCards = (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`${glass} p-4 space-y-3`}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );

  const skeletonFeed = (
    <div className="space-y-4">
      {[1, 2].map(i => (
        <div key={i} className={`${glass} p-5 space-y-3`}>
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full" style={{ borderRadius: "50%" }} />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );

  if (!ready) {
    return (
      <OsLayout cpId="agence">
        <div className="min-h-screen p-5 md:p-8" style={{ background: "#0a0a12" }}>
          <div className="max-w-[1400px] mx-auto space-y-6">
            {skeletonCards}
            {skeletonFeed}
          </div>
        </div>
      </OsLayout>
    );
  }

  if (!modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-sm text-white/40">{isRoot ? "Selectionne un modele dans le header" : "Chargement..."}</p>
        </div>
      </OsLayout>
    );
  }

  if (dataLoaded !== modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="min-h-screen p-5 md:p-8" style={{ background: "#0a0a12" }}>
          <div className="max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-2xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            {skeletonCards}
            {skeletonFeed}
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
          <div className={`rounded-full p-2.5 shadow-2xl ${glass}`}>
            <RefreshCw className={`w-4 h-4 text-[#C9A84C] ${refreshing ? "animate-spin" : ""}`}
              style={{ transform: refreshing ? "none" : `rotate(${Math.min(pullY / pullThreshold, 1) * 360}deg)` }} />
          </div>
        </div>
      )}

      {/* Upload toast */}
      {uploadMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-medium shadow-2xl flex items-center gap-2"
          style={{
            background: uploadMsg.type === "error" ? "#DC2626" : uploadMsg.type === "success" ? "#059669" : "rgba(26,26,46,0.95)",
            color: "#fff", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
          }}>
          {uploadMsg.type === "loading" && <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "#C9A84C" }} />}
          {uploadMsg.text}
        </div>
      )}

      <div className="min-h-screen p-4 sm:p-5 md:p-6 lg:p-8 pb-28 md:pb-8" style={{ background: "#0a0a12" }}>
        <div className="max-w-[1400px] mx-auto space-y-6">

          {/* ══ 1. HEADER ══ */}
          <div className="flex items-start gap-4">
            <div className="relative group">
              <label className="cursor-pointer">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-black ring-2 ring-white/[0.08] transition-all duration-300 group-hover:ring-[#C9A84C]/40"
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
                className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-125 disabled:opacity-50"
                style={{ background: modelInfo?.online ? "#10B981" : "#6B7280", boxShadow: `0 0 0 2.5px #0a0a12, 0 0 ${modelInfo?.online ? "8px" : "0"} ${modelInfo?.online ? "#10B981" : "transparent"}` }}>
                {modelInfo?.online && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                  {modelInfo?.display_name || auth?.display_name || modelSlug.toUpperCase()}
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: modelInfo?.online ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)", color: modelInfo?.online ? "#10B981" : "#6B7280" }}>
                  {modelInfo?.online ? "En ligne" : "Hors ligne"}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-[11px] text-white/40">
                <span>{fmtNum.format(uniqueClients)} abonnes</span>
                <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                <span>{fmt.format(revenue)}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                <span>{feedPosts.length} posts</span>
              </div>
              <input defaultValue={modelInfo?.status || ""} placeholder="Status..."
                className="text-xs bg-transparent outline-none w-full text-white/50 mt-1 placeholder:text-white/20"
                onBlur={async (e) => {
                  const v = e.target.value.trim();
                  try { await fetch(`/api/models/${toModelId(modelSlug)}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status: v }) }); } catch {}
                }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a href={`/m/${modelSlug}`} target="_blank"
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold no-underline transition-all duration-200 hover:scale-105 active:scale-95 ${glass}`}>
                <Eye className="w-3.5 h-3.5 text-white/50" />
                <span className="hidden sm:inline text-white/60">Profil</span>
              </a>
              <a href={`/m/${modelSlug}?edit=true`}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold no-underline transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "rgba(230,51,41,0.12)", border: "1px solid rgba(230,51,41,0.25)" }}>
                <Pencil className="w-3.5 h-3.5 text-[#E63329]" />
                <span className="hidden sm:inline text-[#E63329]">Edit</span>
              </a>
            </div>
          </div>

          {/* ══ 2. STAT CARDS ══ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: Users, value: fmtNum.format(uniqueClients), label: "Abonnes actifs", accent: "#E63329" },
              { icon: DollarSign, value: fmt.format(revenue), label: "Revenus ce mois", accent: "#C9A84C" },
              { icon: Newspaper, value: String(feedPosts.length), label: "Posts publies", accent: "#8B5CF6" },
              { icon: Key, value: String(activeCodes.length), label: "Codes actifs", accent: "#10B981" },
              { icon: TrendingUp, value: `${retentionRate}%`, label: "Taux retention", accent: "#E84393" },
            ].map((s, i) => (
              <div key={i} className={`${glass} ${glassHover} p-4 group`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300"
                    style={{ background: `${s.accent}15` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.accent }} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">{s.value}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ══ 3. CONTENT FEED ══ */}
          <div>
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-5 p-1 rounded-xl bg-white/[0.03] w-fit">
              {[
                { id: "feed" as const, label: "Feed", icon: ImageIcon },
                { id: "wall" as const, label: "Wall", icon: Newspaper },
                { id: "stories" as const, label: "Stories", icon: Camera },
              ].map(tab => (
                <button key={tab.id} onClick={() => setFeedTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200"
                  style={{
                    background: feedTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent",
                    color: feedTab === tab.id ? "#fff" : "rgba(255,255,255,0.35)",
                    border: "none",
                    boxShadow: feedTab === tab.id ? "0 1px 8px rgba(0,0,0,0.2)" : "none",
                  }}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.id === "stories" && stories.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E63329]/20 text-[#E63329]">{stories.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── FEED TAB ── */}
            {feedTab === "feed" && (
              <div className="space-y-4">
                {/* Composer */}
                <div className={`${glass} p-4 sm:p-5 transition-all duration-300`}
                  style={{ borderColor: newPostType === "story" ? "rgba(230,51,41,0.3)" : undefined }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
                      {modelSlug.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                        placeholder={newPostType === "story" ? "Texte de ta story..." : "Partager quelque chose..."}
                        rows={newPostType === "story" ? 1 : 2}
                        className="w-full bg-transparent text-sm outline-none resize-none text-white placeholder:text-white/20" />

                      {newPostType === "story" && !newPostImage && (
                        <p className="text-[11px] flex items-center gap-1.5 text-[#E63329]">
                          <Camera className="w-3.5 h-3.5" /> Ajoute une photo pour ta story
                        </p>
                      )}

                      {posting && newPostImage && (
                        <div className="h-1 rounded-full overflow-hidden bg-white/[0.06]">
                          <div className="h-full rounded-full bg-[#C9A84C]" style={{ animation: "uploadProg 2s ease-in-out infinite" }} />
                        </div>
                      )}

                      {newPostImage && !posting && (
                        <div className="relative w-full rounded-xl overflow-hidden border border-white/[0.08]" style={{ maxHeight: 200 }}>
                          <img src={newPostImage} alt="" className="w-full h-full object-cover" draggable={false} />
                          <button onClick={() => setNewPostImage(null)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform bg-black/70 text-white border-none">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Controls row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center rounded-lg overflow-hidden border border-white/[0.08]">
                          {(["feed", "story"] as const).map(type => (
                            <button key={type} onClick={() => setNewPostType(type)}
                              className="flex items-center gap-1 px-2.5 py-2 text-[11px] font-medium cursor-pointer transition-colors border-none"
                              style={{ background: newPostType === type ? "#E63329" : "transparent", color: newPostType === type ? "#fff" : "rgba(255,255,255,0.4)" }}>
                              {type === "feed" ? <Newspaper className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                              {type === "feed" ? "Feed" : "Story"}
                            </button>
                          ))}
                        </div>

                        <label className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium cursor-pointer border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/[0.14] transition-all">
                          <ImageIcon className="w-3.5 h-3.5" /> Photo
                          <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const { valid, error } = validateFile(file, UPLOAD_LIMITS.post.maxMB);
                            if (!valid) { setUploadMsg({ text: error!, type: "error" }); setTimeout(() => setUploadMsg(null), 5000); e.target.value = ""; return; }
                            const reader = new FileReader();
                            reader.onload = () => setNewPostImage(reader.result as string);
                            reader.readAsDataURL(file); e.target.value = "";
                          }} />
                        </label>

                        {newPostTier === "p0" && (
                          <span className="text-[11px] font-semibold text-emerald-400 px-2">Public</span>
                        )}
                      </div>

                      {/* Tier selector — appears when content exists */}
                      {(newPostContent.trim() || newPostImage) && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                          {TIER_OPTIONS.filter(t => t.id !== "p0").map(t => {
                            const selected = newPostTier === t.id;
                            return (
                              <button key={t.id} onClick={() => setNewPostTier(selected ? "p0" : t.id)}
                                className="px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer shrink-0 transition-all duration-200 whitespace-nowrap border-none"
                                style={{
                                  background: selected ? t.color : "transparent",
                                  color: selected ? "#fff" : "rgba(255,255,255,0.5)",
                                  boxShadow: selected ? `0 2px 12px ${t.color}40, inset 0 1px 0 rgba(255,255,255,0.15)` : "none",
                                  outline: `1.5px solid ${selected ? t.color : "rgba(255,255,255,0.1)"}`,
                                }}>
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !newPostImage) || posting}
                        className="w-full py-3 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 hover:scale-[1.01] disabled:opacity-20 border-none"
                        style={{ background: "linear-gradient(135deg, #C9A84C, #D4AF37)", color: "#0a0a12" }}>
                        {posting ? "Publication..." : "Publier"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Post list */}
                {feedPosts.length === 0 ? (
                  <div className={`${glass} p-10 text-center`}>
                    <Newspaper className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30 mb-1">Aucun post pour le moment</p>
                    <p className="text-xs text-white/20">Publie ton premier contenu ci-dessus</p>
                  </div>
                ) : feedPosts.slice(0, 15).map((post) => (
                  <div key={post.id} className={`${glass} ${glassHover} overflow-hidden group`}>
                    {post.media_url && (
                      <div className="relative">
                        <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" />
                        <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold bg-white/10 backdrop-blur-md text-white">
                              {modelSlug.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-white">{modelInfo?.display_name || modelSlug}</span>
                            {!isFreeSlot(post.tier_required) && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/15 text-white">
                                {toSlot(post.tier_required).toUpperCase()}
                              </span>
                            )}
                            <span className="text-[10px] text-white/50 ml-auto">{relativeTime(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      {!post.media_url && (
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                            style={{ background: "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
                            {modelSlug.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-white">{modelInfo?.display_name || modelSlug}</span>
                            <span className="text-[10px] text-white/30 ml-2">{relativeTime(post.created_at)}</span>
                          </div>
                          {!isFreeSlot(post.tier_required) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: `${TIER_OPTIONS.find(t => t.id === toSlot(post.tier_required))?.color || "#64748B"}20`,
                                color: TIER_OPTIONS.find(t => t.id === toSlot(post.tier_required))?.color || "#64748B",
                              }}>{toSlot(post.tier_required).toUpperCase()}</span>
                          )}
                        </div>
                      )}
                      {post.content && <p className="text-sm text-white/80 whitespace-pre-wrap mb-3">{post.content}</p>}
                      <div className="flex items-center gap-5 text-white/30">
                        <span className="flex items-center gap-1.5 text-xs"><Heart className="w-3.5 h-3.5" /> {post.likes_count || 0}</span>
                        <span className="flex items-center gap-1.5 text-xs"><MessageCircle className="w-3.5 h-3.5" /> {post.comments_count || 0}</span>
                        {deleteConfirm === post.id ? (
                          <div className="ml-auto flex items-center gap-2">
                            <button onClick={() => handleDeletePost(post.id)}
                              className="text-[11px] font-semibold text-red-400 cursor-pointer bg-transparent border-none hover:text-red-300 transition-colors px-2 py-1">
                              Confirmer
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="text-[11px] text-white/30 cursor-pointer bg-transparent border-none hover:text-white/50 transition-colors px-2 py-1">
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(post.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-400 transition-all bg-transparent border-none text-white/20">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── WALL TAB ── */}
            {feedTab === "wall" && (
              <div className="space-y-3">
                {(() => {
                  const clientMessages = wallPosts.filter(w => !w.content?.includes("#post-") && w.pseudo !== "SYSTEM");
                  if (clientMessages.length === 0) return (
                    <div className={`${glass} p-10 text-center`}>
                      <MessageCircle className="w-8 h-8 text-white/10 mx-auto mb-3" />
                      <p className="text-sm text-white/30">Aucun message pour le moment</p>
                      <p className="text-xs text-white/20 mt-1">Les messages de tes abonnes apparaitront ici</p>
                    </div>
                  );
                  return clientMessages.slice(0, 30).map(w => (
                    <div key={w.id} className={`${glass} ${glassHover} p-4 group`}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-white/[0.06] text-white/40">
                          {w.pseudo?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">@{w.pseudo}</span>
                            <span className="text-[10px] text-white/25">{relativeTime(w.created_at)}</span>
                          </div>
                          <p className="text-sm text-white/60 mt-1">{w.content}</p>
                        </div>
                        <button onClick={async () => {
                          try {
                            await fetch(`/api/wall?id=${w.id}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
                            setWallPosts(prev => prev.filter(p => p.id !== w.id));
                          } catch {}
                        }} className="opacity-0 group-hover:opacity-100 cursor-pointer hover:text-red-400 transition-all bg-transparent border-none text-white/20 shrink-0 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
                <a href="/agence/clients"
                  className={`block text-center py-3.5 rounded-xl text-xs font-semibold no-underline transition-all duration-200 hover:scale-[1.01] ${glass} text-[#C9A84C]`}>
                  Voir tout dans Clients
                </a>
              </div>
            )}

            {/* ── STORIES TAB ── */}
            {feedTab === "stories" && (
              <div className="space-y-4">
                {stories.length === 0 ? (
                  <div className={`${glass} p-10 text-center`}>
                    <Camera className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">Aucune story active</p>
                    <p className="text-xs text-white/20 mt-1">Change le type en &quot;Story&quot; dans le composer pour en creer</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stories.map(s => (
                      <div key={s.id} className="relative rounded-2xl overflow-hidden aspect-[9/16] group cursor-pointer">
                        {s.media_url && <img src={s.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 50%, rgba(0,0,0,0.7))" }} />
                        <div className="absolute bottom-3 left-3 right-3">
                          {s.content && <p className="text-xs text-white font-medium line-clamp-2">{s.content}</p>}
                          <p className="text-[10px] text-white/50 mt-1">{relativeTime(s.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══ 4. CLIENTS SECTION ══ */}
          <Section title="Clients" count={clients.length} defaultOpen={false}>
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex items-center justify-between text-xs text-white/40 pb-3 border-b border-white/[0.06]">
                <span>{fmtNum.format(clients.length)} clients enregistres</span>
                <span>{fmt.format(clients.reduce((s, c) => s + (c.total_spent || 0), 0))} total</span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                  placeholder="Rechercher un client..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-white/[0.04] border border-white/[0.06] text-white outline-none placeholder:text-white/20 focus:border-white/[0.14] transition-colors" />
              </div>

              {/* List */}
              {filteredClients.length === 0 ? (
                <div className="py-6 text-center">
                  <Users className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/25">{clientSearch ? "Aucun resultat" : "Aucun client enregistre"}</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {filteredClients.slice(0, 50).map(c => {
                    const handle = c.pseudo_snap || c.pseudo_insta || c.nickname || "?";
                    const tierLabel = TIER_OPTIONS.find(t => t.id === (c.tier || "p1"))?.label || "Silver";
                    const tierColor = TIER_OPTIONS.find(t => t.id === (c.tier || "p1"))?.color || "#C0C0C0";
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-white/[0.06] text-white/40 shrink-0">
                          {handle.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">@{handle}</p>
                          <p className="text-[10px] text-white/30">{c.last_active ? relativeTime(c.last_active) : ""}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: `${tierColor}15`, color: tierColor }}>{tierLabel}</span>
                        {c.total_spent ? <span className="text-[11px] font-semibold text-white/50 tabular-nums">{fmt.format(c.total_spent)}</span> : null}
                      </div>
                    );
                  })}
                </div>
              )}
              <a href="/agence/clients"
                className="block text-center py-2.5 rounded-xl text-[11px] font-semibold no-underline text-[#C9A84C] hover:bg-white/[0.03] transition-colors">
                Gerer les clients
              </a>
            </div>
          </Section>

          {/* ══ 5. ACCESS CODES ══ */}
          <Section title="Codes d'acces" count={activeCodes.length} defaultOpen={false}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">{activeCodes.length} actifs sur {modelCodes.length} total</span>
                <button onClick={() => setShowGenerator(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all duration-200 hover:scale-105 border-none"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #D4AF37)", color: "#0a0a12" }}>
                  <Plus className="w-3.5 h-3.5" /> Generer
                </button>
              </div>

              {modelCodes.length === 0 ? (
                <div className="py-6 text-center">
                  <Shield className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/25">Aucun code genere</p>
                  <button onClick={() => setShowGenerator(true)}
                    className="mt-2 text-[11px] font-semibold text-[#C9A84C] cursor-pointer bg-transparent border-none hover:underline">
                    Creer le premier code
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {modelCodes.slice(0, 30).map(c => {
                    const expired = isExpired(c.expiresAt);
                    const status = c.revoked ? "Revoque" : expired ? "Expire" : c.active ? "Actif" : "Inactif";
                    const statusColor = c.revoked ? "#EF4444" : expired ? "#6B7280" : c.active ? "#10B981" : "#F59E0B";
                    return (
                      <div key={c.code} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono font-bold text-white">{c.code}</code>
                            <button onClick={() => copyCode(c.code)}
                              className="cursor-pointer bg-transparent border-none text-white/20 hover:text-white/50 transition-colors p-0.5">
                              {codeCopied === c.code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-white/30 mt-0.5">@{c.client} · {relativeTime(c.created)}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: `${statusColor}15`, color: statusColor }}>{status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>

          {/* ══ 6. REVENUE SUMMARY ══ */}
          <Section title="Revenus" defaultOpen={false}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[11px] text-white/30 mb-1">Ce mois</p>
                  <p className="text-xl font-bold text-[#C9A84C] tabular-nums">{fmt.format(revenue)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[11px] text-white/30 mb-1">Codes vendus</p>
                  <p className="text-xl font-bold text-white tabular-nums">{modelCodes.filter(c => c.type === "paid" && !c.revoked).length}</p>
                </div>
              </div>

              {/* By tier breakdown */}
              <div>
                <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">Par niveau</p>
                <div className="space-y-2">
                  {packs.filter(p => p.active).map(pack => {
                    const count = modelCodes.filter(c => c.tier === pack.id && c.type === "paid" && !c.revoked).length;
                    const tierRevenue = count * pack.price;
                    const maxRevenue = Math.max(...packs.filter(p => p.active).map(p => modelCodes.filter(c => c.tier === p.id && c.type === "paid" && !c.revoked).length * p.price), 1);
                    return (
                      <div key={pack.id} className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold w-20 text-white/50 truncate">{pack.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max((tierRevenue / maxRevenue) * 100, tierRevenue > 0 ? 4 : 0)}%`, background: pack.color }} />
                        </div>
                        <span className="text-[11px] font-semibold text-white/40 tabular-nums w-16 text-right">{fmt.format(tierRevenue)}</span>
                        <span className="text-[10px] text-white/20 w-8 text-right">{count}x</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Section>

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

"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Eye, Pencil, Image as ImageIcon, Heart, MessageCircle, Trash2, X,
  Newspaper, Camera, RefreshCw, Users, Key, DollarSign, TrendingUp,
  Copy, Check, Plus, Search, Shield, BarChart3, Clock, Zap, Settings,
  ChevronDown, Lock, EyeOff, Send, Pin, FolderOpen, Upload, ArrowRight, Grid3x3, GripVertical, Columns, Sparkles,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { GenerateModal } from "@/components/cockpit/generate-modal";
import type { PackConfig, AccessCode, ClientInfo, FeedPost, WallPost, UploadedContent } from "@/types/heaven";
import { DEFAULT_PACKS } from "@/constants/packs";
import { toSlot, isFreeSlot } from "@/lib/tier-utils";
import { toModelId } from "@/lib/model-utils";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

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

// ── Tab definitions (Contenu & Clients have their own sidebar pages) ──
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "feed", label: "Feed" },
  { id: "contenu", label: "Contenu" },
  { id: "revenue", label: "Revenus" },
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
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [togglingBlur, setTogglingBlur] = useState<string | null>(null);

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
  const [editingPacks, setEditingPacks] = useState(false);
  const [savingPacks, setSavingPacks] = useState(false);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);

  // Contenu tab
  const [contentFolder, setContentFolder] = useState<string | null>(null); // null = all, or pack id
  const [movingUpload, setMovingUpload] = useState<string | null>(null);
  const [uploadingToTier, setUploadingToTier] = useState<string | null>(null);
  const [contentViewMode, setContentViewMode] = useState<"grid" | "list">("grid");
  const [contentLayout, setContentLayout] = useState<"folders" | "columns">("folders");
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [deletingUpload, setDeletingUpload] = useState<string | null>(null);

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
    const headers = authHeaders();
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
      safeFetch(`/api/uploads?model=${mid}`),
    ]).then(([codesData, clientsData, packsData, modelData, postsData, wallData, uploadsData]) => {
      if (codesData?.codes) setCodes(codesData.codes);
      if (clientsData?.clients) setClients(clientsData.clients);
      if (packsData?.packs?.length > 0) setPacks(packsData.packs);
      if (modelData) setModelInfo(modelData);
      if (postsData?.posts) setFeedPosts(postsData.posts);
      if (wallData?.posts) setWallPosts(wallData.posts.slice(0, 20));
      if (uploadsData?.uploads) setUploads(uploadsData.uploads);
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

  const updatePack = useCallback((packId: string, field: string, value: number | boolean | string | string[]) => {
    setPacks(prev => prev.map(p => p.id === packId ? { ...p, [field]: value } : p));
  }, []);

  // Toggle blur on a specific upload (promo = unblurred, pack = blurred)
  const handleToggleBlur = useCallback(async (uploadId: string, currentVisibility: string) => {
    setTogglingBlur(uploadId);
    const newVisibility = currentVisibility === "promo" ? "pack" : "promo";
    try {
      const res = await fetch("/api/uploads", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ model: toModelId(modelSlug), id: uploadId, updates: { visibility: newVisibility } }),
      });
      if (res.ok) {
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, visibility: newVisibility } : u));
      }
    } catch (err) { console.error("[Packs] toggle blur:", err); }
    setTogglingBlur(null);
  }, [modelSlug, authHeaders]);

  // Move upload to a different tier
  const handleMoveTier = useCallback(async (uploadId: string, newTier: string) => {
    setMovingUpload(uploadId);
    try {
      const res = await fetch("/api/uploads", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ model: toModelId(modelSlug), id: uploadId, updates: { tier: newTier } }),
      });
      if (res.ok) {
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, tier: newTier } : u));
      }
    } catch (err) { console.error("[Contenu] move tier:", err); }
    setMovingUpload(null);
  }, [modelSlug, authHeaders]);

  // Delete upload
  const handleDeleteUpload = useCallback(async (uploadId: string) => {
    try {
      await fetch(`/api/uploads?id=${uploadId}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
      setUploads(prev => prev.filter(u => u.id !== uploadId));
    } catch (err) { console.error("[Contenu] delete:", err); }
    setDeletingUpload(null);
  }, [modelSlug, authHeaders]);

  // Upload new content to a specific tier
  const handleUploadToTier = useCallback(async (file: File, tier: string) => {
    const { valid, error } = validateFile(file, UPLOAD_LIMITS.post.maxMB);
    if (!valid) { setUploadMsg({ text: error!, type: "error" }); setTimeout(() => setUploadMsg(null), 5000); return; }
    setUploadMsg({ text: "Upload en cours...", type: "loading" });
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const upRes = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: reader.result, model: toModelId(modelSlug), folder: `heaven/${toModelId(modelSlug)}/uploads` }) });
        if (upRes.ok) {
          const { url } = await upRes.json();
          if (url) {
            const newUpload = { model: toModelId(modelSlug), tier, type: "photo" as const, label: "", dataUrl: url, visibility: "pack" as const, tokenPrice: 0, isNew: true };
            const syncRes = await fetch("/api/uploads", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
              body: JSON.stringify(newUpload) });
            if (syncRes.ok) {
              const data = await syncRes.json();
              if (data.upload) setUploads(prev => [data.upload, ...prev]);
              else setUploads(prev => [{ id: crypto.randomUUID(), ...newUpload, uploadedAt: new Date().toISOString() }, ...prev]);
            }
            setUploadMsg({ text: "Media ajouté", type: "success" });
          }
        } else { setUploadMsg({ text: "Erreur upload", type: "error" }); }
      } catch { setUploadMsg({ text: "Erreur réseau", type: "error" }); }
      setTimeout(() => setUploadMsg(null), 3000);
      setUploadingToTier(null);
    };
    reader.readAsDataURL(file);
  }, [modelSlug, authHeaders]);

  const handleChangePostTier = useCallback(async (postId: string, newTier: string) => {
    setFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, tier_required: newTier } : p));
    try {
      await fetch("/api/posts", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, model: toModelId(modelSlug), tier_required: newTier }),
      });
    } catch { /* rollback on next fetch */ }
  }, [modelSlug, authHeaders]);

  const handleUpdateGroupLabel = useCallback(async (uploadId: string, groupLabel: string | null) => {
    try {
      const res = await fetch("/api/uploads", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ model: toModelId(modelSlug), id: uploadId, updates: { groupLabel } }),
      });
      if (res.ok) {
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, groupLabel } : u));
      }
    } catch (err) { console.error("[Contenu] update group:", err); }
  }, [modelSlug, authHeaders]);

  const handleSavePacks = useCallback(async () => {
    setSavingPacks(true);
    try {
      await fetch("/api/packs", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ model: toModelId(modelSlug), packs }),
      });
      setEditingPacks(false);
    } catch (err) { console.error("[Packs] save:", err); }
    finally { setSavingPacks(false); }
  }, [packs, modelSlug, authHeaders]);

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

            {/* Toggle online/offline */}
            <button onClick={handleToggleStatus} disabled={statusUpdating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border border-white/[0.06] bg-transparent shrink-0 disabled:opacity-50"
              style={{ color: modelInfo?.online ? "#10B981" : "#6B7280" }}>
              {statusUpdating ? "..." : modelInfo?.online ? "En ligne" : "Hors ligne"}
            </button>
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
              {/* Quick Actions — CP ↔ Profile workflow */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <a href={`/m/${modelSlug}`} target="_blank" rel="noopener"
                  className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl no-underline transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(230,51,41,0.06)", border: "1px solid rgba(230,51,41,0.12)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(230,51,41,0.12)" }}>
                    <Eye className="w-4 h-4" style={{ color: "#E63329" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">Voir profil</div>
                    <div className="text-[10px] text-white/30">Page publique</div>
                  </div>
                </a>
                <a href={`/m/${modelSlug}?edit=true`} target="_blank" rel="noopener"
                  className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl no-underline transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(212,175,55,0.12)" }}>
                    <Pencil className="w-4 h-4" style={{ color: "#D4AF37" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">Modifier</div>
                    <div className="text-[10px] text-white/30">Bio, avatar, medias</div>
                  </div>
                </a>
                <button onClick={() => window.dispatchEvent(new Event("heaven:generate"))}
                  className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left"
                  style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.12)" }}>
                    <Key className="w-4 h-4" style={{ color: "#10B981" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">Generer code</div>
                    <div className="text-[10px] text-white/30">Acces client</div>
                  </div>
                </button>
                <button onClick={() => setActiveTab("contenu")}
                  className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left"
                  style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.12)" }}>
                    <Zap className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">Packs</div>
                    <div className="text-[10px] text-white/30">Prix & contenu</div>
                  </div>
                </button>
              </div>

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

          {/* ══════════ TAB: FEED — Facebook-style timeline ══════════ */}
          {activeTab === "feed" && (
            <div className="max-w-[680px] mx-auto space-y-4">

              {/* ── Composer Card ── */}
              <div className={`${surface} overflow-hidden`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
                      style={{ background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
                      {modelInfo?.avatar ? <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" /> : modelSlug.charAt(0).toUpperCase()}
                    </div>
                    {/* Input area */}
                    <div className="flex-1 min-w-0">
                      <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)}
                        placeholder="Partager quelque chose avec tes abonnés..."
                        rows={2}
                        className="w-full bg-transparent text-sm outline-none resize-none text-white placeholder:text-white/25 leading-relaxed" />

                      {/* Image preview */}
                      {newPostImage && !posting && (
                        <div className="relative mt-2 rounded-xl overflow-hidden border border-white/[0.08] max-h-[300px]">
                          <img src={newPostImage} alt="" className="w-full object-cover max-h-[300px]" draggable={false} />
                          <button onClick={() => setNewPostImage(null)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-none transition-transform hover:scale-110"
                            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Upload progress */}
                      {posting && newPostImage && (
                        <div className="h-1 rounded-full overflow-hidden bg-white/[0.06] mt-2">
                          <div className="h-full rounded-full bg-[#D4AF37]" style={{ animation: "uploadProg 2s ease-in-out infinite" }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom bar — actions */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.06]">
                  {/* Type toggle */}
                  <div className="flex items-center rounded-lg overflow-hidden border border-white/[0.08]">
                    {(["feed", "story"] as const).map(type => (
                      <button key={type} onClick={() => setNewPostType(type)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium cursor-pointer transition-colors border-none"
                        style={{ background: newPostType === type ? "rgba(230,51,41,0.15)" : "transparent", color: newPostType === type ? "#E63329" : "rgba(255,255,255,0.3)" }}>
                        {type === "feed" ? <Newspaper className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                        {type === "feed" ? "Feed" : "Story"}
                      </button>
                    ))}
                  </div>

                  {/* Photo upload */}
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer border border-white/[0.08] text-white/30 hover:text-white/60 hover:border-white/[0.15] transition-colors">
                    <ImageIcon className="w-3 h-3" /> Photo
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const { valid, error } = validateFile(file, UPLOAD_LIMITS.post.maxMB);
                      if (!valid) { setUploadMsg({ text: error!, type: "error" }); setTimeout(() => setUploadMsg(null), 5000); e.target.value = ""; return; }
                      const reader = new FileReader();
                      reader.onload = () => setNewPostImage(reader.result as string);
                      reader.readAsDataURL(file); e.target.value = "";
                    }} />
                  </label>

                  {/* Tier selector — only when composing */}
                  {(newPostContent.trim() || newPostImage) && (
                    <div className="flex items-center gap-1 ml-1">
                      {TIER_OPTIONS.filter(t => t.id !== "p0").map(t => {
                        const selected = newPostTier === t.id;
                        return (
                          <button key={t.id} onClick={() => setNewPostTier(selected ? "p0" : t.id)}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer shrink-0 transition-all border-none"
                            style={{
                              background: selected ? t.color : "transparent",
                              color: selected ? "#fff" : "rgba(255,255,255,0.25)",
                              outline: `1px solid ${selected ? t.color : "rgba(255,255,255,0.06)"}`,
                            }}>
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* Publish */}
                  <button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !newPostImage) || posting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:brightness-110 disabled:opacity-20 border-none"
                    style={{ background: "#D4AF37", color: "#0f0f12" }}>
                    <Send className="w-3 h-3" />
                    {posting ? "..." : "Publier"}
                  </button>
                </div>
              </div>

              {/* ── Feed Timeline ── */}
              {feedPosts.length === 0 ? (
                <div className="text-center py-12">
                  <Newspaper className="w-8 h-8 mx-auto mb-3 text-white/10" />
                  <p className="text-sm text-white/25">Aucun post pour le moment</p>
                  <p className="text-xs text-white/15 mt-1">Publie ton premier contenu ci-dessus</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedPosts.map(post => {
                    const tierColor = TIER_OPTIONS.find(t => t.id === post.tier_required)?.color;
                    const tierLabel = TIER_OPTIONS.find(t => t.id === post.tier_required)?.label;
                    const isLocked = !isFreeSlot(post.tier_required);
                    const isStory = (post as FeedPost & { post_type?: string }).post_type === "story";
                    return (
                      <div key={post.id} className={`${surface} overflow-hidden`}>
                        {/* Post header */}
                        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                            style={{ background: modelInfo?.avatar ? "transparent" : "linear-gradient(135deg, #E63329, #E84393)", color: "#fff" }}>
                            {modelInfo?.avatar ? <img src={modelInfo.avatar} alt="" className="w-full h-full object-cover" /> : modelSlug.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{modelInfo?.display_name || modelSlug.toUpperCase()}</span>
                              {isStory && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>Story</span>}
                              {isLocked && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${tierColor}20`, color: tierColor }}>{tierLabel}</span>}
                              {post.pinned && <Pin className="w-3 h-3 text-[#D4AF37]" />}
                            </div>
                            <span className="text-[11px] text-white/25">{relativeTime(post.created_at)}</span>
                          </div>
                          {/* Delete */}
                          {deleteConfirm === post.id ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleDeletePost(post.id)} className="text-[10px] font-semibold text-red-400 cursor-pointer bg-transparent border-none">Supprimer</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-[10px] text-white/30 cursor-pointer bg-transparent border-none">Non</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(post.id)} className="cursor-pointer bg-transparent border-none text-white/15 hover:text-red-400 transition-colors p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Content text */}
                        {post.content && (
                          <div className="px-4 pb-2">
                            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                          </div>
                        )}

                        {/* Media */}
                        {post.media_url && (
                          <div className="relative">
                            <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" />
                            {isLocked && (
                              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
                                <Lock className="w-3 h-3" style={{ color: tierColor }} />
                                <span className="text-[10px] font-bold" style={{ color: tierColor }}>{tierLabel}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Interaction bar */}
                        <div className="flex items-center gap-6 px-4 py-2.5 border-t border-white/[0.04]">
                          <div className="flex items-center gap-1.5 text-white/30">
                            <Heart className="w-4 h-4" fill={(post.likes_count || 0) > 0 ? "currentColor" : "none"} style={(post.likes_count || 0) > 0 ? { color: "#F43F5E" } : {}} />
                            <span className="text-xs tabular-nums">{post.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/30">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs tabular-nums">{post.comments_count || 0}</span>
                          </div>
                          <div className="flex-1" />
                          {isLocked && (
                            <span className="text-[10px] text-white/20 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Reserve {tierLabel}
                            </span>
                          )}
                          {!isLocked && (
                            <span className="text-[10px] text-white/20 flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Public
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Wall Messages section ── */}
              {(() => {
                const clientMessages = wallPosts.filter(w => !w.content?.includes("#post-") && w.pseudo !== "SYSTEM");
                if (clientMessages.length === 0) return null;
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3 mt-2">
                      <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Messages du mur</span>
                      <span className="text-[10px] text-white/20">{clientMessages.length}</span>
                    </div>
                    <div className="space-y-2">
                      {clientMessages.slice(0, 10).map(w => (
                        <div key={w.id} className={`${surface} px-4 py-3 flex items-start gap-3`}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}>
                            {(w.pseudo || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white/70">@{w.pseudo}</span>
                              <span className="text-[10px] text-white/20">{relativeTime(w.created_at)}</span>
                            </div>
                            <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{w.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ══════════ TAB: CONTENU — Folder-based upload manager ══════════ */}
          {activeTab === "contenu" && (() => {
            // Merge uploads + posts with media into unified content items
            type ContentItem = { id: string; url: string; tier: string; source: "upload" | "post"; visibility?: string; date: string; type: string; postContent?: string; groupLabel?: string | null; clientId?: string | null };
            const allContent: ContentItem[] = [
              ...uploads.filter(u => u.dataUrl).map(u => ({
                id: u.id, url: u.dataUrl, tier: u.tier || "p0", source: "upload" as const,
                visibility: u.visibility, date: u.uploadedAt || "", type: u.type || "photo",
                groupLabel: (u as any).groupLabel || null, clientId: (u as any).clientId || null,
              })),
              ...feedPosts.filter(p => p.media_url).map(p => ({
                id: p.id, url: p.media_url!, tier: p.tier_required || "p0", source: "post" as const,
                visibility: isFreeSlot(p.tier_required) ? "promo" : "pack", date: p.created_at,
                type: "photo", postContent: p.content || undefined, groupLabel: null, clientId: null,
              })),
            ];
            const contentCount = (tier: string | null) => tier === null ? allContent.length : allContent.filter(c => c.tier === tier).length;
            const customCount = allContent.filter(c => c.tier === "custom").length;
            const tierSlots = ["p0", "p1", "p2", "p3", "p4", "p5", "custom"];
            const activeTiers = tierSlots.filter(t => allContent.some(c => c.tier === t));

            // ── Drag handlers ──
            const onDragStart = (e: React.DragEvent, itemId: string, source: "upload" | "post") => {
              e.dataTransfer.setData("text/plain", JSON.stringify({ id: itemId, source }));
              e.dataTransfer.effectAllowed = "move";
              setDragItem(itemId);
            };
            const onDragOverFolder = (e: React.DragEvent, targetId: string) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverTarget(targetId);
            };
            const onDragLeaveFolder = () => setDragOverTarget(null);
            const onDropFolder = (e: React.DragEvent, targetTier: string) => {
              e.preventDefault();
              try {
                const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                if (data.source === "upload") handleMoveTier(data.id, targetTier);
                else if (data.source === "post") handleChangePostTier(data.id, targetTier);
              } catch {}
              setDragItem(null);
              setDragOverTarget(null);
            };

            return (
            <div className="space-y-4">

              {/* ── Layout toggle header ── */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Contenu</span>
                  <span className="text-[10px] text-white/20">{allContent.length} fichiers</span>
                </div>
                <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <button onClick={() => { setContentLayout("folders"); setContentViewMode("grid"); }}
                    className="px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border-none transition-all"
                    style={{ background: contentLayout === "folders" && contentViewMode === "grid" ? "rgba(212,175,55,0.15)" : "transparent", color: contentLayout === "folders" && contentViewMode === "grid" ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>
                    <Grid3x3 className="w-3 h-3 inline mr-0.5" />Dossiers
                  </button>
                  <button onClick={() => setContentLayout("columns")}
                    className="px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border-none transition-all"
                    style={{ background: contentLayout === "columns" ? "rgba(212,175,55,0.15)" : "transparent", color: contentLayout === "columns" ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>
                    <Columns className="w-3 h-3 inline mr-0.5" />Colonnes
                  </button>
                  <button onClick={() => { setContentLayout("folders"); setContentViewMode("list"); }}
                    className="px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border-none transition-all"
                    style={{ background: contentLayout === "folders" && contentViewMode === "list" ? "rgba(212,175,55,0.15)" : "transparent", color: contentLayout === "folders" && contentViewMode === "list" ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>
                    Liste
                  </button>
                </div>
              </div>

              {/* ══════ COLUMNS / KANBAN VIEW ══════ */}
              {contentLayout === "columns" && (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(activeTiers.length, 1)}, 1fr)` }}>
                  {activeTiers.map(tier => {
                    const tierPosts = allContent.filter(c => c.tier === tier);
                    const config = TIER_META[tier];
                    const hex = TIER_HEX[tier] || "#888";
                    const isDragOver = dragOverTarget === `col-${tier}`;
                    return (
                      <div key={tier} className="flex flex-col rounded-xl overflow-hidden"
                        style={{
                          minHeight: "calc(100vh - 250px)",
                          background: isDragOver ? `${hex}08` : "rgba(255,255,255,0.02)",
                          border: isDragOver ? `2px dashed ${hex}` : "1px solid rgba(255,255,255,0.06)",
                        }}
                        onDragOver={e => onDragOverFolder(e, `col-${tier}`)}
                        onDragLeave={onDragLeaveFolder}
                        onDrop={e => { e.preventDefault(); onDropFolder(e, tier); }}>
                        {/* Column header */}
                        <div className="flex items-center gap-1.5 px-2.5 py-2 shrink-0" style={{ borderBottom: `2px solid ${hex}25` }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: hex }} />
                          <span className="text-[11px] font-bold text-white truncate">{config?.symbol} {config?.label || tier}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: `${hex}18`, color: hex }}>{tierPosts.length}</span>
                        </div>
                        {/* Column body */}
                        <div className="flex-1 overflow-y-auto p-1.5" style={{ scrollbarWidth: "thin" }}>
                          <div className="grid grid-cols-3 gap-1">
                            {tierPosts.map(item => (
                              <div key={item.id} draggable={item.source === "upload"}
                                onDragStart={item.source === "upload" ? (e) => onDragStart(e, item.id, item.source) : undefined}
                                className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group"
                                style={{
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  opacity: dragItem === item.id ? 0.3 : 1,
                                }}>
                                <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} onClick={() => setZoomUrl(item.url)} />
                                <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-80 transition-opacity p-0.5">
                                  <GripVertical className="w-2.5 h-2.5 text-white drop-shadow-lg" />
                                </div>
                                {item.source === "post" && (
                                  <span className="absolute top-0.5 right-0.5 text-[6px] font-bold px-1 py-0.5 rounded-full" style={{ background: "rgba(230,51,41,0.8)", color: "#fff" }}>P</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ══════ FOLDERS VIEW (grid or list) ══════ */}
              {contentLayout === "folders" && (
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">

                {/* LEFT: Folders (packs as folders) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs uppercase tracking-wider text-white/30 font-semibold">Dossiers</span>
                    <span className="text-[10px] text-white/20 ml-auto">{allContent.length} fichiers</span>
                  </div>

                  {/* All content */}
                  <button onClick={() => setContentFolder(null)}
                    onDragOver={e => onDragOverFolder(e, "all")} onDragLeave={onDragLeaveFolder} onDrop={e => onDropFolder(e, "p0")}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left cursor-pointer transition-all border-none ${contentFolder === null ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
                    style={dragOverTarget === "all" ? { border: "2px dashed #D4AF37", background: "rgba(212,175,55,0.05)" } : {}}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: contentFolder === null ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.04)" }}>
                      <Grid3x3 className="w-4 h-4" style={{ color: contentFolder === null ? "#D4AF37" : "rgba(255,255,255,0.3)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">Tout le contenu</div>
                      <div className="text-[10px] text-white/25">{allContent.length} medias</div>
                    </div>
                  </button>

                  {/* Public folder */}
                  <button onClick={() => setContentFolder("p0")}
                    onDragOver={e => onDragOverFolder(e, "p0")} onDragLeave={onDragLeaveFolder} onDrop={e => onDropFolder(e, "p0")}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left cursor-pointer transition-all border-none ${contentFolder === "p0" ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
                    style={dragOverTarget === "p0" ? { border: "2px dashed #64748B", background: "rgba(100,116,139,0.05)" } : {}}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: contentFolder === "p0" ? "rgba(100,116,139,0.15)" : "rgba(255,255,255,0.04)" }}>
                      <Eye className="w-4 h-4" style={{ color: contentFolder === "p0" ? "#64748B" : "rgba(255,255,255,0.3)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">Public</div>
                      <div className="text-[10px] text-white/25">{contentCount("p0")} medias · Visible par tous</div>
                    </div>
                  </button>

                  {/* Pack folders */}
                  {packs.filter(p => p.active).map(pack => {
                    const hex = TIER_HEX[pack.id] || pack.color;
                    const tierMeta = TIER_META[pack.id];
                    const count = contentCount(pack.id);
                    const isSelected = contentFolder === pack.id;
                    const isDragOverThis = dragOverTarget === pack.id;
                    return (
                      <button key={pack.id} onClick={() => setContentFolder(pack.id)}
                        onDragOver={e => onDragOverFolder(e, pack.id)} onDragLeave={onDragLeaveFolder} onDrop={e => onDropFolder(e, pack.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left cursor-pointer transition-all border-none ${isSelected ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
                        style={isDragOverThis ? { border: `2px dashed ${hex}`, background: `${hex}08` } : {}}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: isSelected ? `${hex}18` : "rgba(255,255,255,0.04)", border: isSelected ? `1px solid ${hex}30` : "1px solid transparent" }}>
                          <span className="text-base">{tierMeta?.symbol || "📁"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{pack.name}</span>
                            <Lock className="w-2.5 h-2.5 shrink-0" style={{ color: hex }} />
                          </div>
                          <div className="text-[10px] text-white/25">{count} medias · {pack.price}€</div>
                        </div>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
                      </button>
                    );
                  })}

                  {/* Custom folder */}
                  <button onClick={() => setContentFolder("custom")}
                    onDragOver={e => onDragOverFolder(e, "custom")} onDragLeave={onDragLeaveFolder} onDrop={e => onDropFolder(e, "custom")}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left cursor-pointer transition-all border-none ${contentFolder === "custom" ? "bg-white/[0.06]" : "bg-transparent hover:bg-white/[0.03]"}`}
                    style={dragOverTarget === "custom" ? { border: "2px dashed #D4AF37", background: "rgba(212,175,55,0.05)" } : {}}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: contentFolder === "custom" ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)" }}>
                      <Sparkles className="w-4 h-4" style={{ color: contentFolder === "custom" ? "#D4AF37" : "rgba(255,255,255,0.3)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">Custom</div>
                      <div className="text-[10px] text-white/25">{customCount} medias · A l&apos;unite</div>
                    </div>
                  </button>

                  {/* Upload button */}
                  <div className="pt-3 mt-2 border-t border-white/[0.06]">
                    <label className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all border border-dashed border-white/[0.1] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/[0.03]">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(212,175,55,0.08)" }}>
                        <Upload className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#D4AF37]">Ajouter du contenu</div>
                        <div className="text-[10px] text-white/25">JPG, PNG, WEBP · Max 10MB</div>
                      </div>
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple className="hidden" onChange={(e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        const tier = contentFolder || "p0";
                        Array.from(files).forEach(f => handleUploadToTier(f, tier));
                        e.target.value = "";
                      }} />
                    </label>
                    {contentFolder && contentFolder !== "p0" && (
                      <p className="text-[9px] text-white/20 mt-1.5 px-1">↑ Upload directement dans « {packs.find(p => p.id === contentFolder)?.name || contentFolder} »</p>
                    )}
                  </div>
                </div>

                {/* RIGHT: Content grid */}
                <div>
                  {/* Folder header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <FolderOpen className="w-4 h-4 text-white/30" />
                      <span className="text-sm font-semibold text-white">
                        {contentFolder === null ? "Tout le contenu" : contentFolder === "p0" ? "Public" : contentFolder === "custom" ? "Custom" : packs.find(p => p.id === contentFolder)?.name || contentFolder}
                      </span>
                      {contentFolder && contentFolder !== "p0" && contentFolder !== "custom" && (() => {
                        const pack = packs.find(p => p.id === contentFolder);
                        const hex = TIER_HEX[contentFolder] || pack?.color || "#888";
                        return (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${hex}20`, color: hex }}>
                            {pack?.price}€
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* p0 mini-note */}
                  {contentFolder === "p0" && (
                    <div className="rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2.5"
                      style={{ background: "rgba(100,116,139,0.06)", border: "1px solid rgba(100,116,139,0.1)" }}>
                      <Eye className="w-3.5 h-3.5 shrink-0 text-white/30" />
                      <span className="text-[11px] text-white/40">Contenu public — visible par tous sans code</span>
                    </div>
                  )}

                  {/* ── Inline Pack Config — when a pack folder is selected ── */}
                  {contentFolder && contentFolder !== "p0" && contentFolder !== "custom" && (() => {
                    const pack = packs.find(p => p.id === contentFolder);
                    if (!pack) return null;
                    const hex = TIER_HEX[contentFolder] || pack.color;
                    const tierMeta = TIER_META[contentFolder];
                    const tierSymbol = tierMeta?.symbol || "";
                    const soldCount = modelCodes.filter(c => c.tier === pack.id && c.type === "paid" && !c.revoked).length;
                    const packRevenue = soldCount * pack.price;
                    const isExpCfg = expandedPack === `cfg-${pack.id}`;
                    const previewImgs = allContent.filter(c => c.tier === contentFolder).slice(0, 4);
                    const accessibleBy = packs.filter(p => {
                      const pLevel = parseInt(p.id.replace("p", ""), 10);
                      const thisLevel = parseInt(contentFolder!.replace("p", ""), 10);
                      return pLevel >= thisLevel && p.active && p.id !== contentFolder;
                    });

                    return (
                      <div className="rounded-xl overflow-hidden mb-3 transition-all"
                        style={{ background: `color-mix(in srgb, ${hex} 4%, #0f0f12)`, border: `1px solid ${hex}20` }}>
                        {/* Collapsed header */}
                        <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                          onClick={() => setExpandedPack(isExpCfg ? null : `cfg-${pack.id}`)}>
                          <span className="text-base shrink-0">{tierSymbol}</span>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-bold text-white">{pack.name}</span>
                            <span className="text-sm font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                            <span className="text-[10px] tabular-nums text-white/30">{soldCount} vendus · {fmt.format(packRevenue)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                              background: pack.active ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)",
                              color: pack.active ? "#10B981" : "#6B7280" }}>
                              {pack.active ? "ON" : "OFF"}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-white/25 transition-transform" style={{ transform: isExpCfg ? "rotate(180deg)" : "rotate(0)" }} />
                          </div>
                        </div>

                        {/* Expanded — profile-mirror + config */}
                        {isExpCfg && (
                          <div className="border-t" style={{ borderColor: `${hex}15` }}>
                            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">

                              {/* LEFT: "Vue client" — what subscribers see on profile */}
                              <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${hex}08, ${hex}03)` }}>
                                <div className="text-[8px] font-bold uppercase tracking-wider text-center py-1.5" style={{ background: `${hex}15`, color: hex }}>
                                  Vue client sur le profil
                                </div>
                                <div className="relative" style={{ minHeight: "140px" }}>
                                  {previewImgs.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-0.5 p-1.5">
                                      {previewImgs.map((img, i) => (
                                        <div key={i} className="aspect-[3/4] relative overflow-hidden rounded-lg">
                                          <img src={img.url} alt="" className="w-full h-full object-cover" style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full p-4">
                                      <span className="text-[10px] text-white/20">Aucune photo</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "20px" }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                                      style={{ background: `${hex}30`, border: `1px solid ${hex}40` }}>
                                      <Lock className="w-4 h-4" style={{ color: hex }} />
                                    </div>
                                  </div>
                                </div>
                                {/* Access rule */}
                                <div className="px-3 py-2 text-center" style={{ borderTop: `1px solid ${hex}10` }}>
                                  <p className="text-[9px] text-white/30 leading-relaxed">
                                    Accessible : <span className="font-bold" style={{ color: hex }}>{pack.name}</span>
                                    {accessibleBy.length > 0 && <span className="text-white/20"> + {accessibleBy.map(a => a.name).join(", ")}</span>}
                                  </p>
                                </div>
                              </div>

                              {/* RIGHT: Config fields */}
                              <div className="px-4 py-3 space-y-2.5">
                                {/* Row 1: name + price + edit */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {editingPacks ? (
                                      <input value={pack.name} onChange={e => updatePack(pack.id, "name", e.target.value)}
                                        className="px-2 py-1 rounded-lg text-sm font-bold bg-white/[0.05] border border-white/[0.1] text-white outline-none focus:border-[#D4AF37] transition-colors w-24" />
                                    ) : (
                                      <span className="text-sm font-bold text-white">{pack.name}</span>
                                    )}
                                    {editingPacks ? (
                                      <input type="number" value={pack.price} onChange={e => updatePack(pack.id, "price", Number(e.target.value))}
                                        className="px-2 py-1 rounded-lg text-sm font-black tabular-nums bg-white/[0.05] border border-white/[0.1] text-white outline-none focus:border-[#D4AF37] transition-colors w-16" />
                                    ) : (
                                      <span className="text-lg font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {editingPacks ? (
                                      <>
                                        <button onClick={() => setEditingPacks(false)}
                                          className="px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer border border-white/[0.06] bg-transparent text-white/40 hover:text-white/60 transition-colors">
                                          Annuler
                                        </button>
                                        <button onClick={handleSavePacks} disabled={savingPacks}
                                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer hover:brightness-110 border-none disabled:opacity-50 transition-all"
                                          style={{ background: hex, color: "#fff" }}>
                                          {savingPacks ? "..." : "Save"}
                                        </button>
                                      </>
                                    ) : (
                                      <button onClick={() => setEditingPacks(true)}
                                        className="px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer border border-white/[0.06] bg-transparent text-white/30 hover:text-white/50 transition-colors">
                                        <Pencil className="w-3 h-3 inline mr-0.5" />Edit
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Row 2: status + badge */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {editingPacks ? (
                                    <button onClick={() => updatePack(pack.id, "active", !pack.active)}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all border-none"
                                      style={{ background: pack.active ? "rgba(16,185,129,0.15)" : "rgba(107,114,128,0.15)", color: pack.active ? "#10B981" : "#6B7280" }}>
                                      {pack.active ? "✓ Visible sur profil" : "✕ Masque"}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{
                                      background: pack.active ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)",
                                      color: pack.active ? "#10B981" : "#6B7280" }}>
                                      {pack.active ? "● Visible sur profil" : "○ Masque"}
                                    </span>
                                  )}
                                  {editingPacks ? (
                                    <input value={pack.badge || ""} onChange={e => updatePack(pack.id, "badge", e.target.value || null as unknown as string)}
                                      placeholder="Badge..."
                                      className="flex-1 px-2 py-1 rounded-lg text-[10px] bg-white/[0.05] border border-white/[0.08] text-white outline-none focus:border-[#D4AF37] transition-colors placeholder:text-white/20" />
                                  ) : pack.badge ? (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${hex}15`, color: hex }}>{pack.badge}</span>
                                  ) : null}
                                  <a href={`/m/${modelSlug}#${pack.id}`} target="_blank" rel="noopener"
                                    className="text-[10px] font-medium no-underline transition-colors flex items-center gap-0.5 ml-auto" style={{ color: hex }}>
                                    <Eye className="w-3 h-3" /> Voir profil
                                  </a>
                                </div>

                                {/* Features compact */}
                                <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                                  <span className="text-[9px] uppercase tracking-wider text-white/20 font-medium">Contenu inclus</span>
                                  {(pack.features || []).map((feat, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                      <Check className="w-3 h-3 shrink-0" style={{ color: hex }} />
                                      {editingPacks ? (
                                        <div className="flex items-center gap-1 flex-1">
                                          <input value={feat} onChange={e => { const nf = [...(pack.features || [])]; nf[i] = e.target.value; updatePack(pack.id, "features", nf); }}
                                            className="flex-1 px-2 py-0.5 rounded text-[11px] bg-white/[0.05] border border-white/[0.08] text-white outline-none focus:border-[#D4AF37] transition-colors" />
                                          <button onClick={() => updatePack(pack.id, "features", (pack.features || []).filter((_, j) => j !== i))}
                                            className="text-white/20 hover:text-red-400 cursor-pointer bg-transparent border-none text-xs transition-colors">✕</button>
                                        </div>
                                      ) : <span className="text-[11px] text-white/50">{feat}</span>}
                                    </div>
                                  ))}
                                  {editingPacks && (
                                    <button onClick={() => updatePack(pack.id, "features", [...(pack.features || []), ""])}
                                      className="text-[10px] text-white/30 hover:text-white/50 cursor-pointer bg-transparent border-none transition-colors flex items-center gap-1">
                                      <Plus className="w-3 h-3" /> Ajouter
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Content grid */}
                  {(() => {
                    const filtered = contentFolder === null ? allContent : allContent.filter(c => c.tier === contentFolder);
                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.06)" }}>
                          <FolderOpen className="w-10 h-10 mb-3 text-white/10" />
                          <p className="text-sm text-white/25 mb-1">Aucun contenu</p>
                          <p className="text-xs text-white/15">Upload des medias ou publie des posts avec photo</p>
                        </div>
                      );
                    }
                    return contentViewMode === "grid" ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                        {filtered.map(item => {
                          const hex = TIER_HEX[item.tier] || "#64748B";
                          const tierMeta = TIER_META[item.tier];
                          const isPromo = item.visibility === "promo";
                          const isFree = !item.tier || item.tier === "p0";
                          return (
                            <div key={item.id}
                              draggable={item.source === "upload"}
                              onDragStart={item.source === "upload" ? (e) => onDragStart(e, item.id, item.source) : undefined}
                              className="aspect-[3/4] relative overflow-hidden rounded-xl group cursor-grab active:cursor-grabbing"
                              style={{
                                border: `1px solid ${isFree ? "rgba(255,255,255,0.06)" : hex + "20"}`,
                                opacity: dragItem === item.id ? 0.3 : 1,
                                transform: dragItem === item.id ? "scale(0.9)" : "scale(1)",
                                transition: "opacity 0.15s, transform 0.15s",
                              }}>
                              {/* Grip indicator on hover */}
                              {item.source === "upload" && (
                                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity z-10">
                                  <GripVertical className="w-3 h-3 text-white drop-shadow-lg" />
                                </div>
                              )}
                              {/* CP mode: always show photos clearly */}
                              <img src={item.url} alt="" className="w-full h-full object-cover" draggable={false} style={{ filter: "brightness(0.9)" }}
                                onClick={() => setZoomUrl(item.url)} />

                              {/* Source + Tier badge */}
                              <div className="absolute top-1.5 left-1.5 flex items-center gap-1" style={{ left: item.source === "upload" ? "18px" : "6px" }}>
                                {item.source === "post" && (
                                  <span className="text-[7px] font-bold px-1 py-0.5 rounded-full" style={{ background: "rgba(230,51,41,0.8)", color: "#fff" }}>POST</span>
                                )}
                                {!isFree && contentFolder === null && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{
                                    background: `${hex}cc`, color: "#fff", backdropFilter: "blur(4px)"
                                  }}>{tierMeta?.symbol} {tierMeta?.label}</span>
                                )}
                                {isFree && contentFolder === null && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{
                                    background: "rgba(100,116,139,0.8)", color: "#fff"
                                  }}>Public</span>
                                )}
                              </div>

                              {/* Client visibility indicator — what client sees */}
                              {!isFree && (
                                <div className="absolute bottom-1.5 right-1.5">
                                  <span className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{
                                    background: isPromo ? "rgba(16,185,129,0.85)" : "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)"
                                  }}>{isPromo ? "Visible" : "Prive"}</span>
                                </div>
                              )}

                              {/* Hover actions */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                                style={{ WebkitTapHighlightColor: "transparent" }}>
                                {/* Toggle visibility — uploads only */}
                                {!isFree && item.source === "upload" && (
                                  <button onClick={() => handleToggleBlur(item.id, item.visibility || "pack")}
                                    disabled={togglingBlur === item.id}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border-none"
                                    style={{ background: isPromo ? "rgba(139,92,246,0.9)" : "rgba(16,185,129,0.9)", color: "#fff" }}>
                                    {togglingBlur === item.id ? "..." : isPromo ? <><EyeOff className="w-3 h-3" /> Rendre prive</> : <><Eye className="w-3 h-3" /> Rendre visible</>}
                                  </button>
                                )}
                                {/* Move tier — uploads only */}
                                {item.source === "upload" && (
                                <div className="relative">
                                  <button onClick={(e) => { e.stopPropagation(); setMovingUpload(movingUpload === item.id ? null : item.id); }}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border-none"
                                    style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                                    <ArrowRight className="w-3 h-3" /> Deplacer
                                  </button>
                                  {movingUpload === item.id && (
                                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-20 rounded-xl overflow-hidden shadow-2xl min-w-[140px]"
                                      style={{ background: "#1a1a22", border: "1px solid rgba(255,255,255,0.1)" }}>
                                      <button onClick={() => { handleMoveTier(item.id, "p0"); setMovingUpload(null); }}
                                        disabled={item.tier === "p0"}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                        style={{ background: "transparent", color: "#64748B" }}>
                                        <Eye className="w-3 h-3" /> Public
                                      </button>
                                      {packs.filter(p => p.active).map(p => {
                                        const ph = TIER_HEX[p.id] || p.color;
                                        const pm = TIER_META[p.id];
                                        return (
                                          <button key={p.id} onClick={() => { handleMoveTier(item.id, p.id); setMovingUpload(null); }}
                                            disabled={item.tier === p.id}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                            style={{ background: "transparent", color: ph }}>
                                            <span>{pm?.symbol}</span> {p.name}
                                          </button>
                                        );
                                      })}
                                      <button onClick={() => { handleMoveTier(item.id, "custom"); setMovingUpload(null); }}
                                        disabled={item.tier === "custom"}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                        style={{ background: "transparent", color: "#D4AF37" }}>
                                        <Sparkles className="w-3 h-3" /> Custom
                                      </button>
                                    </div>
                                  )}
                                </div>
                                )}
                                {/* Delete */}
                                {deletingUpload === item.id ? (
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => item.source === "upload" ? handleDeleteUpload(item.id) : handleDeletePost(item.id)}
                                      className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer border-none" style={{ background: "#DC2626", color: "#fff" }}>Oui</button>
                                    <button onClick={() => setDeletingUpload(null)}
                                      className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer border-none" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>Non</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setDeletingUpload(item.id)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] cursor-pointer border-none transition-colors"
                                    style={{ background: "rgba(220,38,38,0.2)", color: "#F87171" }}>
                                    <Trash2 className="w-3 h-3" /> Supprimer
                                  </button>
                                )}
                                {/* Source indicator */}
                                {item.source === "post" && (
                                  <span className="text-[9px] text-white/40 mt-1">via Feed</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* List view */
                      <div className={`${surface} overflow-hidden`}>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/[0.06]">
                              <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 w-16">Apercu</th>
                              <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Type</th>
                              <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Dossier</th>
                              <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Visibilite</th>
                              <th className="text-left text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5">Date</th>
                              <th className="text-right text-[11px] uppercase tracking-wider text-white/25 font-medium px-4 py-2.5 w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(item => {
                              const hex = TIER_HEX[item.tier] || "#64748B";
                              const tierMeta = TIER_META[item.tier];
                              const isFree = !item.tier || item.tier === "p0";
                              const isBlurred = item.visibility !== "promo";
                              return (
                                <tr key={item.id}
                                  draggable={item.source === "upload"}
                                  onDragStart={item.source === "upload" ? (e) => onDragStart(e, item.id, item.source) : undefined}
                                  className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-grab active:cursor-grabbing"
                                  style={{ opacity: dragItem === item.id ? 0.3 : 1 }}>
                                  <td className="px-4 py-2">
                                    <div className="w-10 h-12 rounded-lg overflow-hidden cursor-pointer" onClick={() => setZoomUrl(item.url)}>
                                      <img src={item.url} alt="" className="w-full h-full object-cover"
                                        style={{ filter: "brightness(0.9)" }} draggable={false} />
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-white/50">{item.type || "photo"}</span>
                                      {item.source === "post" && <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: "rgba(230,51,41,0.15)", color: "#E63329" }}>POST</span>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: `${hex}15`, color: hex }}>
                                      {isFree ? "Public" : `${tierMeta?.symbol || ""} ${tierMeta?.label || item.tier}`}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    {isFree ? (
                                      <span className="text-[10px] text-white/30">Visible</span>
                                    ) : item.source === "upload" ? (
                                      <button onClick={() => handleToggleBlur(item.id, item.visibility || "pack")}
                                        disabled={togglingBlur === item.id}
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer border-none transition-colors"
                                        style={{ background: isBlurred ? "rgba(139,92,246,0.1)" : "rgba(16,185,129,0.1)", color: isBlurred ? "#8B5CF6" : "#10B981" }}>
                                        {togglingBlur === item.id ? "..." : isBlurred ? "Prive" : "Promo"}
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-white/30">Pack</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-[11px] text-white/25 tabular-nums">{item.date ? relativeTime(item.date) : "-"}</td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="flex items-center gap-1.5 justify-end">
                                      {item.source === "upload" && (
                                      <div className="relative">
                                        <button onClick={() => setMovingUpload(movingUpload === item.id ? null : item.id)}
                                          className="p-1.5 rounded-lg cursor-pointer border-none bg-transparent text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-colors">
                                          <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                        {movingUpload === item.id && (
                                          <div className="absolute top-full right-0 mt-1 z-20 rounded-xl overflow-hidden shadow-2xl min-w-[140px]"
                                            style={{ background: "#1a1a22", border: "1px solid rgba(255,255,255,0.1)" }}>
                                            <button onClick={() => { handleMoveTier(item.id, "p0"); setMovingUpload(null); }}
                                              disabled={item.tier === "p0"}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                              style={{ background: "transparent", color: "#64748B" }}>
                                              <Eye className="w-3 h-3" /> Public
                                            </button>
                                            {packs.filter(p => p.active).map(p => {
                                              const ph = TIER_HEX[p.id] || p.color;
                                              const pm = TIER_META[p.id];
                                              return (
                                                <button key={p.id} onClick={() => { handleMoveTier(item.id, p.id); setMovingUpload(null); }}
                                                  disabled={item.tier === p.id}
                                                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                                  style={{ background: "transparent", color: ph }}>
                                                  <span>{pm?.symbol}</span> {p.name}
                                                </button>
                                              );
                                            })}
                                            <button onClick={() => { handleMoveTier(item.id, "custom"); setMovingUpload(null); }}
                                              disabled={item.tier === "custom"}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] cursor-pointer border-none transition-colors hover:bg-white/[0.06] disabled:opacity-30"
                                              style={{ background: "transparent", color: "#D4AF37" }}>
                                              <Sparkles className="w-3 h-3" /> Custom
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      )}
                                      {deletingUpload === item.id ? (
                                        <div className="flex items-center gap-1">
                                          <button onClick={() => item.source === "upload" ? handleDeleteUpload(item.id) : handleDeletePost(item.id)} className="p-1 rounded text-[9px] font-bold cursor-pointer border-none" style={{ background: "#DC2626", color: "#fff" }}>✓</button>
                                          <button onClick={() => setDeletingUpload(null)} className="p-1 rounded text-[9px] cursor-pointer border-none" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>✕</button>
                                        </div>
                                      ) : (
                                        <button onClick={() => setDeletingUpload(item.id)}
                                          className="p-1.5 rounded-lg cursor-pointer border-none bg-transparent text-white/15 hover:text-red-400 transition-colors">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Summary stats */}
                  {contentFolder && contentFolder !== "p0" && contentFolder !== "custom" && (() => {
                    const pack = packs.find(p => p.id === contentFolder);
                    if (!pack) return null;
                    const hex = TIER_HEX[contentFolder] || pack.color;
                    const tierItems = allContent.filter(c => c.tier === contentFolder);
                    const promoCount = tierItems.filter(c => c.visibility === "promo").length;
                    const blurredCount = tierItems.length - promoCount;
                    return (
                      <div className="flex items-center gap-6 mt-4 px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: hex }} />
                          <span className="text-[10px] text-white/30">{tierItems.length} total</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-white/20" />
                          <span className="text-[10px] text-white/30">{blurredCount} floutes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3 h-3" style={{ color: "#10B981" }} />
                          <span className="text-[10px] text-white/30">{promoCount} promo</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              )}

              {/* Zoom lightbox */}
              {zoomUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer" onClick={() => setZoomUrl(null)}>
                  <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-10" style={{ background: "rgba(255,255,255,0.15)", border: "none" }} onClick={() => setZoomUrl(null)}>
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <img src={zoomUrl} alt="" className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg" style={{ boxShadow: "0 0 60px rgba(0,0,0,0.5)" }} />
                </div>
              )}
            </div>
            );
          })()}

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

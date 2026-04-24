"use client";

/**
 * AgencePage (shell) — Phase 2 Agent 2.B
 *
 * Post-refactor du monolithe P0-7 (2582L → ~520L shell).
 * Les onglets sont extraits en composants dans `src/cp/components/cockpit/` :
 *   - dashboard/home-panel.tsx
 *   - contenu/contenu-panel.tsx
 *   - strategie/strategie-panel.tsx (re-export de strategie-panel.tsx existant)
 *   - clients-panel.tsx (existant, laissé tel quel pour cette phase)
 *
 * Tous les hooks d'état vivent encore ici (source de vérité unique).
 * Les panels reçoivent state + handlers en props ; aucune logique nouvelle.
 */

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { useModel } from "@/lib/model-context";
import { GenerateModal } from "@/components/cockpit/generate-modal";
import { ClientsPanel } from "@/components/cockpit/clients-panel";
import { StrategiePanel } from "@/components/cockpit/strategie-panel";
import { HomePanel } from "@/components/cockpit/dashboard/home-panel";
import { AgenceHeader } from "@/components/cockpit/dashboard/agence-header";
import { ContenuPanel, type ContenuContentItem } from "@/components/cockpit/contenu/contenu-panel";
import type { PackConfig, AccessCode, ClientInfo, FeedPost, WallPost, UploadedContent, FeedItem } from "@/types/heaven";
import { DEFAULT_PACKS } from "@/constants/packs";
import { isFreeSlot } from "@/lib/tier-utils";
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

function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} style={style} />;
}

// ── Tab definitions ──
// Brief NB B7 (2026-04-21) : tab "Clients" supprimée — les contacts/fans sont
// gérés dans la Messagerie (drawer). Redirect /agence?tab=clients → middleware
// middleware.ts → /agence/messagerie?view=contacts.
const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "contenu", label: "Contenu" },
  { id: "strategie", label: "Stratégie" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ══════════ MAIN ══════════
export default function AgencePage() {
  // Suspense wrapper required by Next.js 15 for pages using useSearchParams()
  return (
    <Suspense fallback={null}>
      <AgenceDashboard />
    </Suspense>
  );
}

function AgenceDashboard() {
  const { currentModel, auth, authHeaders, isRoot, ready } = useModel();
  const _modelSlug = currentModel || auth?.model_slug || null;
  const modelSlug = _modelSlug ?? "";
  const searchParams = useSearchParams();

  // ── Tab state — read from ?tab= query param on mount ──
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get("tab");
    if (tab && TABS.some(t => t.id === tab)) return tab as TabId;
    return "dashboard";
  });

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

  const TIER_OPTIONS = useMemo(() => {
    const publicTier = { id: "p0", label: "Public", color: "#64748B" };
    const packTiers = packs.filter(p => p.active !== false).map(p => ({
      id: p.id,
      label: p.name,
      color: TIER_HEX[p.id] || p.color || "#888",
    }));
    return [publicTier, ...packTiers];
  }, [packs]);

  // Feed composer state
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTier, setNewPostTier] = useState("p0");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [newPostType, setNewPostType] = useState<"feed" | "story">("feed");
  const [posting, setPosting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; type: "error" | "success" | "loading" } | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingPacks, setEditingPacks] = useState(false);
  const [savingPacks, setSavingPacks] = useState(false);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);

  // Contenu tab
  const [contentFolder, setContentFolder] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [contentSourceFilter, setContentSourceFilter] = useState<"all" | "manual" | "instagram" | "wall">("all");
  const [movingUpload, setMovingUpload] = useState<string | null>(null);
  const [uploadingToTier, setUploadingToTier] = useState<string | null>(null);
  const [contentViewMode, setContentViewMode] = useState<"grid" | "list">("grid");
  const [showMobileOverview, setShowMobileOverview] = useState(false);
  const [contentLayout, setContentLayout] = useState<"folders" | "columns">("folders");
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [deletingUpload, setDeletingUpload] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ tier: string; fileName: string; progress: number } | null>(null);

  // Custom folder
  const [photoAccesses, setPhotoAccesses] = useState<any[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [assigningPhoto, setAssigningPhoto] = useState<string | null>(null);
  const [customClientFilter, setCustomClientFilter] = useState<string | null>(null);
  const [assignPrice, setAssignPrice] = useState("");
  const [expandedPhotoHistory, setExpandedPhotoHistory] = useState<string | null>(null);

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
      safeFetch(`/api/feed?model=${mid}`),
    ]).then(([codesData, clientsData, packsData, modelData, postsData, wallData, uploadsData, feedData]) => {
      if (codesData?.codes) setCodes(codesData.codes);
      if (clientsData?.clients) setClients(clientsData.clients);
      if (packsData?.packs?.length > 0) setPacks(packsData.packs);
      if (modelData) setModelInfo(modelData);
      if (postsData?.posts) setFeedPosts(postsData.posts);
      if (wallData?.posts) setWallPosts(wallData.posts.slice(0, 20));
      if (uploadsData?.uploads) setUploads(uploadsData.uploads);
      if (feedData?.items) setFeedItems(feedData.items);
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

  // Fetch photo accesses for custom folder
  const [accessVersion, setAccessVersion] = useState(0);
  useEffect(() => {
    if (contentFolder !== "custom" || !modelSlug) return;
    setAccessLoading(true);
    const headers = authHeaders();
    fetch(`/api/uploads/access?model=${toModelId(modelSlug)}&active_only=false`, { headers })
      .then(r => r.json())
      .then(data => { setPhotoAccesses(data.accesses || []); })
      .catch(err => console.error("[Custom] fetch accesses error:", err))
      .finally(() => setAccessLoading(false));
  }, [contentFolder, modelSlug, authHeaders, accessVersion]);

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

  const updatePack = useCallback((packId: string, field: string, value: number | boolean | string | string[]) => {
    setPacks(prev => prev.map(p => p.id === packId ? { ...p, [field]: value } : p));
  }, []);

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

  const handleDeleteUpload = useCallback(async (uploadId: string) => {
    try {
      await fetch(`/api/uploads?id=${uploadId}&model=${toModelId(modelSlug)}`, { method: "DELETE", headers: authHeaders() });
      setUploads(prev => prev.filter(u => u.id !== uploadId));
    } catch (err) { console.error("[Contenu] delete:", err); }
    setDeletingUpload(null);
  }, [modelSlug, authHeaders]);

  const handleUploadToTier = useCallback(async (file: File, tier: string) => {
    const { valid, error } = validateFile(file, UPLOAD_LIMITS.post.maxMB);
    if (!valid) { setUploadMsg({ text: error!, type: "error" }); setTimeout(() => setUploadMsg(null), 5000); return; }
    setUploadingToTier(tier);
    setUploadProgress({ tier, fileName: file.name, progress: 0 });
    setUploadMsg({ text: `Upload ${file.name}...`, type: "loading" });

    let prog = 0;
    const readInterval = setInterval(() => {
      prog = Math.min(prog + 3, 25);
      setUploadProgress(prev => prev ? { ...prev, progress: prog } : null);
    }, 60);

    const reader = new FileReader();
    reader.onerror = () => {
      clearInterval(readInterval);
      setUploadMsg({ text: "Erreur lecture fichier", type: "error" });
      setTimeout(() => setUploadMsg(null), 4000);
      setUploadingToTier(null);
      setUploadProgress(null);
    };
    reader.onload = async () => {
      clearInterval(readInterval);
      setUploadProgress(prev => prev ? { ...prev, progress: 30 } : null);

      let uploadProg = 30;
      const uploadInterval = setInterval(() => {
        uploadProg = Math.min(uploadProg + 2, 75);
        setUploadProgress(prev => prev ? { ...prev, progress: uploadProg } : null);
      }, 100);

      try {
        const mid = toModelId(modelSlug);
        const upRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ file: reader.result, model: mid, folder: `heaven/${mid}/uploads` }),
        });
        clearInterval(uploadInterval);

        if (!upRes.ok) {
          const errData = await upRes.json().catch(() => ({ error: `HTTP ${upRes.status}` }));
          setUploadMsg({ text: errData.error || `Erreur ${upRes.status}`, type: "error" });
          setTimeout(() => setUploadMsg(null), 5000);
          setUploadingToTier(null);
          setUploadProgress(null);
          return;
        }
        setUploadProgress(prev => prev ? { ...prev, progress: 80 } : null);

        const { url } = await upRes.json();
        if (!url) {
          setUploadMsg({ text: "Pas d'URL retournée", type: "error" });
          setTimeout(() => setUploadMsg(null), 4000);
          setUploadingToTier(null);
          setUploadProgress(null);
          return;
        }

        setUploadProgress(prev => prev ? { ...prev, progress: 90 } : null);

        const newUpload = { model: mid, tier, type: "photo" as const, label: "", dataUrl: url, visibility: tier === "p0" ? "promo" as const : "pack" as const, tokenPrice: 0, isNew: true };
        const syncRes = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(newUpload),
        });
        if (syncRes.ok) {
          const data = await syncRes.json();
          if (data.upload) setUploads(prev => [data.upload, ...prev]);
          else setUploads(prev => [{ id: crypto.randomUUID(), ...newUpload, uploadedAt: new Date().toISOString() }, ...prev]);
        } else {
          const errData = await syncRes.json().catch(() => ({ error: `HTTP ${syncRes.status}` }));
          setUploadMsg({ text: errData.error || `Erreur sauvegarde`, type: "error" });
          setTimeout(() => setUploadMsg(null), 5000);
          setUploadingToTier(null);
          setUploadProgress(null);
          return;
        }

        setUploadProgress(prev => prev ? { ...prev, progress: 100 } : null);
        const tierLabel = tier === "custom" ? "Custom" : tier === "p0" ? "Public" : TIER_META[tier]?.label || tier.toUpperCase();
        setUploadMsg({ text: `Photo ajoutée dans ${tierLabel}`, type: "success" });
      } catch (err) {
        clearInterval(uploadInterval);
        console.error("[Upload]", err);
        setUploadMsg({ text: "Erreur réseau", type: "error" });
      }
      setTimeout(() => { setUploadMsg(null); setUploadProgress(null); }, 2000);
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

  // ── Drag & Drop handlers (stable refs) ──
  const onDragStartItem = useCallback((e: React.DragEvent, itemId: string, source: "upload" | "post" | "instagram" | "wall") => {
    if (source !== "upload" && source !== "post") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/json", JSON.stringify({ id: itemId, source }));
    e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => setDragItem(itemId));
  }, []);

  const onDragOverTarget = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDropTarget = useCallback((e: React.DragEvent, targetTier: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    setDragItem(null);
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.source === "upload") handleMoveTier(data.id, targetTier);
      else if (data.source === "post") handleChangePostTier(data.id, targetTier);
    } catch {}
  }, [handleMoveTier, handleChangePostTier]);

  const onDragEndItem = useCallback(() => {
    setDragItem(null);
    setDragOverTarget(null);
  }, []);

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

  const handleAssignToClient = useCallback(async (uploadId: string, clientId: string, price: number, sourceTier: string) => {
    try {
      const hdrs = authHeaders();
      const res = await fetch("/api/uploads/access", {
        method: "POST",
        headers: { ...hdrs, "Content-Type": "application/json" },
        body: JSON.stringify({ model: toModelId(modelSlug), upload_id: uploadId, client_id: clientId, source_tier: sourceTier, price }),
      });
      const data = await res.json();
      if (data.access) {
        setPhotoAccesses(prev => [...prev, data.access]);
        setAssigningPhoto(null);
        setClientSearch("");
        setAssignPrice("");
        setAccessVersion(v => v + 1);
      }
    } catch (err) { console.error("[Custom] assign error:", err); }
  }, [modelSlug, authHeaders]);

  const handleRevokeAccess = useCallback(async (accessId: string) => {
    try {
      const hdrs = authHeaders();
      await fetch(`/api/uploads/access?model=${toModelId(modelSlug)}&id=${accessId}`, { method: "DELETE", headers: hdrs });
      setPhotoAccesses(prev => prev.map(a => a.id === accessId ? { ...a, revoked_at: new Date().toISOString() } : a));
      setAccessVersion(v => v + 1);
    } catch {}
  }, [modelSlug, authHeaders]);

  // Avatar upload handler (kept inline for header)
  const handleAvatarUpload = useCallback(async (file: File) => {
    const { valid, error } = validateFile(file, UPLOAD_LIMITS.avatar.maxMB);
    if (!valid) { setUploadMsg({ text: error!, type: "error" }); setTimeout(() => setUploadMsg(null), 5000); return; }
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
    reader.readAsDataURL(file);
  }, [modelSlug, authHeaders]);

  const handlePostImageChange = useCallback((file: File) => {
    const { valid, error } = validateFile(file, UPLOAD_LIMITS.post.maxMB);
    if (!valid) { setUploadMsg({ text: error!, type: "error" }); setTimeout(() => setUploadMsg(null), 5000); return; }
    const reader = new FileReader();
    reader.onload = () => setNewPostImage(reader.result as string);
    reader.readAsDataURL(file);
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

  // ── Content items computed for Contenu panel ──
  const { allContent, allContentUnfiltered } = useMemo(() => {
    const unfiltered: ContenuContentItem[] = [
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
      ...feedItems.filter(it => it.source_type === "instagram" && (it.media_url || it.thumbnail_url)).map(it => ({
        id: `ig-${it.id}`, url: it.media_url || it.thumbnail_url!, tier: "p0",
        source: "instagram" as const, visibility: "public",
        date: it.posted_at, type: (it.media_type || "").toLowerCase() === "video" ? "video" : "photo",
        postContent: it.caption || undefined, groupLabel: null, clientId: null,
        externalUrl: it.external_url || null,
      })),
      ...feedItems.filter(it => it.source_type === "wall" && it.media_url).map(it => ({
        id: `wall-${it.id}`, url: it.media_url!, tier: "p0",
        source: "wall" as const, visibility: "public",
        date: it.posted_at, type: "photo",
        postContent: it.caption || undefined, groupLabel: null, clientId: it.author_client_id,
      })),
    ];
    const sourceMatch = (it: ContenuContentItem) => {
      if (contentSourceFilter === "all") return true;
      if (contentSourceFilter === "manual") return it.source === "upload" || it.source === "post";
      if (contentSourceFilter === "instagram") return it.source === "instagram";
      if (contentSourceFilter === "wall") return it.source === "wall";
      return true;
    };
    return { allContent: unfiltered.filter(sourceMatch), allContentUnfiltered: unfiltered };
  }, [uploads, feedPosts, feedItems, contentSourceFilter]);

  const useNewComposer = searchParams.get("composer") === "new";

  // ══════════ LOADING STATES ══════════
  if (!ready) {
    return (
      <OsLayout cpId="agence">
        <div className="min-h-screen p-4 md:p-6" style={{ background: "var(--bg)" }}>
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
    // NB 2026-04-24 : ROOT = CP spécimen. Au lieu d'afficher des données, on
    // affiche des cartes descriptives de chaque module (fonction, features, rôles,
    // sources data, statut dev). Permet à root de voir tout le skeleton + ce que
    // chaque module fait sans avoir à charger un vrai CP.
    if (isRoot) {
      return (
        <OsLayout cpId="agence">
          <div className="min-h-screen p-4 md:p-6" style={{ background: "var(--bg)" }}>
            <div className="max-w-[1400px] mx-auto space-y-6">

              {/* Header ROOT */}
              <div className="p-4 rounded-xl border" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(230,51,41,0.05))", borderColor: "rgba(245,158,11,0.3)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>SPECIMEN / DEV MODE</span>
                </div>
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>CP ROOT — template de référence</h1>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  Ce mode affiche la structure et la documentation de chaque module. Sélectionne un CP (Yumi, Paloma, Ruby) dans le header pour basculer vers les données réelles — tu conserves les fonctions dev (selector, skeleton specimen toujours accessible).
                </p>
              </div>

              {/* Modules grid — descriptifs */}
              <div>
                <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Modules principaux</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      icon: "📊",
                      name: "Dashboard",
                      desc: "KPIs financiers (revenus, abonnés, rétention) + activité récente + feed unifié.",
                      roles: "root / yumi / paloma / ruby (own)",
                      sources: "agence_fans · agence_messages · agence_revenus_modele",
                      status: "done",
                    },
                    {
                      icon: "💬",
                      name: "Messagerie",
                      desc: "Inbox unifiée web + Instagram. Grouping par fan. Mode agent auto/humain par conversation.",
                      roles: "root / yumi (all) / paloma/ruby (own)",
                      sources: "agence_messages_timeline · instagram_conversations",
                      status: "done",
                    },
                    {
                      icon: "📷",
                      name: "Instagram",
                      desc: "Stats profil, feed posts, commentaires, config agent IA, conversations DM.",
                      roles: "root / yumi / paloma/ruby (own)",
                      sources: "instagram_config · instagram_messages · feed_items",
                      status: "done",
                    },
                    {
                      icon: "🎨",
                      name: "Contenu / Packs",
                      desc: "Grille de contenus (upload + IG + wall). Composer packs tarifés, tiers visibility.",
                      roles: "root / yumi / paloma/ruby (own)",
                      sources: "agence_uploads · agence_packs · agence_wall_posts",
                      status: "done",
                    },
                    {
                      icon: "🎯",
                      name: "Stratégie",
                      desc: "Plans A (IA pur) / B (hub annexe) / C (consultance) + milestones + paliers rémunération.",
                      roles: "root / yumi / paloma/ruby (own)",
                      sources: "agence_models (palier, mode_operation) · milestones",
                      status: "done",
                    },
                    {
                      icon: "⚙️",
                      name: "Paramètres",
                      desc: "Général (mode opération, handle IG) + Comptes (admin) + Dev Center (root) + Finances own + Agent DM.",
                      roles: "root (tous) / yumi (admin) / paloma/ruby (own limited)",
                      sources: "agence_accounts · agence_models · instagram_config",
                      status: "done",
                    },
                    {
                      icon: "👤",
                      name: "Modèles (agence admin)",
                      desc: "Profil identity, contrats, DMCA release forms, palier rémunération par modèle.",
                      roles: "root + yumi (cross-model m1/m2/m3)",
                      sources: "agence_models · agence_contracts · agence_releaseform_dossier",
                      status: "done",
                    },
                    {
                      icon: "📈",
                      name: "Ops / Monitoring",
                      desc: "Observabilité cron workers, meta API rate limit, volumes messages.",
                      roles: "root uniquement",
                      sources: "ops_metrics · ig_reply_queue",
                      status: "done",
                    },
                    {
                      icon: "🤖",
                      name: "Agent IA Conversationnel",
                      desc: "Agent multi-IA (Groq Llama + Grok + Haiku) qui répond aux DMs, scoring leads, shadow mode apprentissage, multilingue FR/EN/ES/DE/IT/PT.",
                      roles: "scope config par model_slug",
                      sources: "agent_personas · prompt_examples · ai_runs · fan_scores",
                      status: "planned (V1 — voir plans/modules/ai-conversational-agent/)",
                    },
                    {
                      icon: "🎤",
                      name: "Voice / Audio",
                      desc: "Voice cloning Yumi (ElevenLabs) pour envoi DM audio. Triggers intelligents par bucket fan.",
                      roles: "scope config per model",
                      sources: "voice_samples · voice_generation_events",
                      status: "planned (V2 — doc 14)",
                    },
                    {
                      icon: "🎬",
                      name: "Content Generation IA",
                      desc: "Scénarios photos/vidéos cohérents (LoRA Yumi + Flux + Kling). Identity profile + scenario library.",
                      roles: "scope per model",
                      sources: "content_scenarios · content_outputs · model_identity_profile",
                      status: "planned (V3 — doc 15)",
                    },
                    {
                      icon: "📅",
                      name: "Community Manager IA",
                      desc: "Détection trends IG/TikTok, calendrier éditorial auto, benchmarking concurrentes, idea generator.",
                      roles: "scope per model",
                      sources: "trend_signals · content_ideas · tracked_competitors",
                      status: "planned (V3 — doc 16)",
                    },
                    {
                      icon: "🌍",
                      name: "Storyline Life Consistency",
                      desc: "Univers persistent (appartement Paris, yoga, voyages, préférences stables, life_events calendrier).",
                      roles: "scope per model",
                      sources: "life_events · locations · stable_preferences · storyline_arcs",
                      status: "planned (V3 — doc 17)",
                    },
                  ].map(m => (
                    <div key={m.name} className="p-4 rounded-xl border hover:border-opacity-80 transition-all" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{m.icon}</span>
                          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>{m.name}</h3>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{
                          background: m.status === "done" ? "rgba(16,185,129,0.12)" : "rgba(139,92,246,0.12)",
                          color: m.status === "done" ? "#10B981" : "#8B5CF6",
                        }}>{m.status === "done" ? "done" : "planned"}</span>
                      </div>
                      <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>{m.desc}</p>
                      <div className="space-y-1 text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.8 }}>
                        <div><span className="font-semibold">Rôles :</span> {m.roles}</div>
                        <div><span className="font-semibold">Sources :</span> <code className="font-mono">{m.sources}</code></div>
                        {m.status !== "done" && <div className="italic">{m.status.replace("planned ", "")}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer dev info */}
              <div className="p-3 rounded-xl border text-[11px]" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>🧪 Tips dev</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Le selector <code className="font-mono">ROOT ∨</code> permet de switch vers Yumi/Paloma/Ruby</li>
                  <li>Au switch, tu gardes le mode root (selector reste visible, Dev Center accessible)</li>
                  <li>Login direct Yumi/Paloma/Ruby = pas de selector, pas de spécimen</li>
                  <li>Plans détaillés : <code className="font-mono">plans/modules/</code> (18 docs v0.4.0)</li>
                </ul>
              </div>

            </div>
          </div>
        </OsLayout>
      );
    }
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-xs text-white/40">Chargement...</p>
        </div>
      </OsLayout>
    );
  }

  if (dataLoaded !== modelSlug) {
    return (
      <OsLayout cpId="agence">
        <div className="min-h-screen p-4 md:p-6" style={{ background: "var(--bg)" }}>
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
            color: "#fff", border: "1px solid var(--w08)",
          }}>
          {uploadMsg.type === "loading" && <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "var(--w15)", borderTopColor: "#D4AF37" }} />}
          {uploadMsg.text}
        </div>
      )}

      <div className="cockpit min-h-screen p-3 sm:p-4 md:p-6 pb-24 md:pb-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-[1400px] mx-auto space-y-5">

          <AgenceHeader
            modelSlug={modelSlug}
            auth={auth}
            modelInfo={modelInfo}
            statusUpdating={statusUpdating}
            revenue={revenue}
            uniqueClients={uniqueClients}
            activeCodes={activeCodes}
            modelCodes={modelCodes}
            feedPosts={feedPosts}
            retentionRate={retentionRate}
            tabs={[...TABS]}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as TabId)}
            onAvatarUpload={handleAvatarUpload}
            onToggleStatus={handleToggleStatus}
          />

          {/* ══════════ TAB PANELS ══════════ */}
          {activeTab === "dashboard" && (
            <HomePanel
              modelSlug={modelSlug}
              modelInfo={modelInfo}
              revenue={revenue}
              activeCodes={activeCodes}
              modelCodes={modelCodes}
              packs={packs}
              clients={clients}
              uniqueClients={uniqueClients}
              retentionRate={retentionRate}
              stories={stories}
              feedPosts={feedPosts}
              wallPosts={wallPosts}
              newPostContent={newPostContent}
              setNewPostContent={setNewPostContent}
              newPostTier={newPostTier}
              setNewPostTier={setNewPostTier}
              newPostImage={newPostImage}
              setNewPostImage={setNewPostImage}
              newPostType={newPostType}
              setNewPostType={setNewPostType}
              posting={posting}
              tierOptions={TIER_OPTIONS}
              showMobileOverview={showMobileOverview}
              setShowMobileOverview={setShowMobileOverview}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
              onCreatePost={handleCreatePost}
              onDeletePost={handleDeletePost}
              onPostImageChange={handlePostImageChange}
            />
          )}

          {activeTab === "contenu" && (
            <ContenuPanel
              modelSlug={modelSlug}
              packs={packs}
              clients={clients}
              modelCodes={modelCodes}
              allContent={allContent}
              allContentUnfiltered={allContentUnfiltered}
              photoAccesses={photoAccesses}
              accessLoading={accessLoading}
              contentFolder={contentFolder}
              setContentFolder={setContentFolder}
              contentViewMode={contentViewMode}
              setContentViewMode={setContentViewMode}
              contentLayout={contentLayout}
              setContentLayout={setContentLayout}
              contentSourceFilter={contentSourceFilter}
              setContentSourceFilter={setContentSourceFilter}
              expandedPack={expandedPack}
              setExpandedPack={setExpandedPack}
              editingPacks={editingPacks}
              setEditingPacks={setEditingPacks}
              savingPacks={savingPacks}
              dragItem={dragItem}
              dragOverTarget={dragOverTarget}
              setDragOverTarget={setDragOverTarget}
              uploadProgress={uploadProgress}
              movingUpload={movingUpload}
              setMovingUpload={setMovingUpload}
              togglingBlur={togglingBlur}
              deletingUpload={deletingUpload}
              setDeletingUpload={setDeletingUpload}
              zoomUrl={zoomUrl}
              setZoomUrl={setZoomUrl}
              assigningPhoto={assigningPhoto}
              setAssigningPhoto={setAssigningPhoto}
              assignPrice={assignPrice}
              setAssignPrice={setAssignPrice}
              clientSearch={clientSearch}
              setClientSearch={setClientSearch}
              customClientFilter={customClientFilter}
              setCustomClientFilter={setCustomClientFilter}
              expandedPhotoHistory={expandedPhotoHistory}
              setExpandedPhotoHistory={setExpandedPhotoHistory}
              onDragStartItem={onDragStartItem}
              onDragOverTarget={onDragOverTarget}
              onDropTarget={onDropTarget}
              onDragEndItem={onDragEndItem}
              handleUploadToTier={handleUploadToTier}
              handleMoveTier={handleMoveTier}
              handleToggleBlur={handleToggleBlur}
              handleDeleteUpload={handleDeleteUpload}
              handleDeletePost={handleDeletePost}
              handleSavePacks={handleSavePacks}
              updatePack={updatePack}
              handleAssignToClient={handleAssignToClient}
              handleRevokeAccess={handleRevokeAccess}
              useNewComposer={useNewComposer}
            />
          )}

          {/* Tab "clients" supprimée (B7 2026-04-21) — migrée vers /agence/messagerie?view=contacts */}

          {activeTab === "strategie" && (
            <StrategiePanel realData={{
              revenue,
              activeCodes,
              modelCodes,
              packs,
              clients,
              uniqueClients,
              retentionRate,
              stories,
            }} />
          )}

          {/* ── Generate Modal ── */}
          <GenerateModal
            open={showGenerator}
            onClose={() => { setShowGenerator(false); setPrefillClient(""); }}
            onGenerate={handleGenerate}
            modelSlug={modelSlug}
            prefillClient={prefillClient}
            packs={packs}
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

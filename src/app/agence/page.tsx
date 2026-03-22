"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Camera, ArrowLeft, Crown, Copy, Check, Plus, Users, X, Trash2,
  Clock, Key, DollarSign, Eye, EyeOff, Shield, Edit3, Save,
  Sparkles, ChevronDown, ChevronUp, AlertCircle, Gift, Star, Video,
  Heart, ExternalLink, ToggleLeft, ToggleRight, Upload, Image, MessageSquare,
  ThumbsUp, ThumbsDown, Wifi, WifiOff, Settings, ShieldAlert, Ban,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import Link from "next/link";

// ── Default Pack Config (editable by model) ──
interface PackConfig {
  id: string;
  name: string;
  price: number;
  color: string;
  features: string[];
  bonuses: {
    fanvueAccess: boolean;
    freeNudeExpress: boolean;
    nudeDedicaceLevres: boolean;
    freeVideoOffer: boolean;
  };
  face: boolean;
  badge: string | null;
  active: boolean;
}

const DEFAULT_PACKS: PackConfig[] = [
  {
    id: "vip", name: "VIP Glamour", price: 150, color: "#E84393",
    features: ["Pieds glamour/sales + accessoires", "Lingerie sexy + haul", "Teasing + demandes custom", "Dedicaces personnalisees"],
    bonuses: { fanvueAccess: false, freeNudeExpress: true, nudeDedicaceLevres: false, freeVideoOffer: false },
    face: false, badge: null, active: true,
  },
  {
    id: "gold", name: "Gold", price: 200, color: "#C9A84C",
    features: ["TOUT du VIP inclus", "Nudes complets", "Cosplay", "Sextape sans visage"],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false },
    face: false, badge: "Populaire", active: true,
  },
  {
    id: "diamond", name: "Diamond", price: 250, color: "#5B8DEF",
    features: ["TOUT du Gold inclus", "Nudes avec visage", "Cosplay avec visage", "Sextape avec visage", "Hard illimite"],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: false },
    face: true, badge: null, active: true,
  },
  {
    id: "platinum", name: "Platinum All-Access", price: 320, color: "#A882FF",
    features: ["Acces TOTAL aux 3 packs", "Demandes personnalisees", "Video calls prives", "Contenu exclusif illimite"],
    bonuses: { fanvueAccess: true, freeNudeExpress: true, nudeDedicaceLevres: true, freeVideoOffer: true },
    face: true, badge: "Ultimate", active: true,
  },
];

const BONUS_LABELS: Record<keyof PackConfig["bonuses"], { label: string; icon: typeof Gift; color: string }> = {
  fanvueAccess: { label: "Acces page Fanvue privee", icon: ExternalLink, color: "#A882FF" },
  freeNudeExpress: { label: "Nude gratuit express (type du pack)", icon: Gift, color: "#E84393" },
  nudeDedicaceLevres: { label: "Nude dedicace rouge a levres", icon: Heart, color: "#FF4D6A" },
  freeVideoOffer: { label: "Video gratuite offerte (multi-pack/ultimate)", icon: Video, color: "#C9A84C" },
};

const TIER_COLORS: Record<string, string> = {
  vip: "#E84393", gold: "#C9A84C", diamond: "#5B8DEF", platinum: "#A882FF", trial: "#8E8EA3",
};

// ── Types ──
interface AccessCode {
  code: string;
  model: string;
  client: string;
  platform: string;
  role: "client" | "admin";
  tier: string;
  pack: string;
  type: "paid" | "promo" | "gift" | "trial";
  duration: number;
  expiresAt: string;
  created: string;
  used: boolean;
  active: boolean;
  revoked: boolean;
  isTrial: boolean;
  lastUsed: string | null;
}

interface PendingOrder {
  id: string;
  client: string;
  platform: string;
  packs: string[];
  tiers: string[];
  total: number;
  discount: string;
  status: "pending_payment" | "validated" | "cancelled";
  createdAt: string;
  codeGenerated?: string | null;
}

// ── Token services (configurable by model) ──
interface TokenService {
  id: string;
  label: string;
  tokens: number;
  icon: string;
  color: string;
  tier?: string;
  active: boolean;
}

const DEFAULT_TOKEN_SERVICES: TokenService[] = [
  { id: "live5_gold", label: "Live Snap Gold (5min)", tokens: 45, icon: "cam", color: "#C9A84C", tier: "gold", active: true },
  { id: "live15_gold", label: "Live Snap Gold (15min)", tokens: 120, icon: "cam", color: "#C9A84C", tier: "gold", active: true },
  { id: "live30_gold", label: "Live Snap Gold (30min)", tokens: 240, icon: "cam", color: "#C9A84C", tier: "gold", active: true },
  { id: "live5_diamond", label: "Live Snap Diamond (5min)", tokens: 55, icon: "cam", color: "#5B8DEF", tier: "diamond", active: true },
  { id: "live15_diamond", label: "Live Snap Diamond (15min)", tokens: 160, icon: "cam", color: "#5B8DEF", tier: "diamond", active: true },
  { id: "live30_diamond", label: "Live Snap Diamond (30min)", tokens: 320, icon: "cam", color: "#5B8DEF", tier: "diamond", active: true },
  { id: "live5_platinum", label: "Live Snap Platinum (5min)", tokens: 70, icon: "cam", color: "#A882FF", tier: "platinum", active: true },
  { id: "live15_platinum", label: "Live Snap Platinum Hard (15min)", tokens: 200, icon: "cam", color: "#A882FF", tier: "platinum", active: true },
  { id: "live30_platinum", label: "Live Snap Platinum (30min)", tokens: 400, icon: "cam", color: "#A882FF", tier: "platinum", active: true },
  { id: "custom_photo", label: "Photo custom dedicace", tokens: 25, icon: "photo", color: "#E84393", active: true },
  { id: "custom_video", label: "Video custom (30s)", tokens: 60, icon: "video", color: "#5B8DEF", active: true },
  { id: "sexting", label: "Session sexting (15min)", tokens: 50, icon: "chat", color: "#A882FF", active: true },
];

interface ModelPresence {
  online: boolean;
  status: string;
  avatar: string; // base64 data URL or empty
}

// ── Storage ──
const ADMIN_SESSION_KEY = "sqwensy_yumi_admin_session";
const CODES_KEY = "sqwensy_gallery_codes";
const ORDERS_KEY = "sqwensy_agence_orders";
const PACKS_KEY = "sqwensy_yumi_packs";
const SERVICES_KEY = "sqwensy_yumi_services";
const PRESENCE_KEY = "sqwensy_yumi_presence";
const SCREENSHOT_LOG_KEY = "sqwensy_yumi_screenshot_log";
const EXCLUSIONS_KEY = "sqwensy_yumi_exclusions";

interface ScreenshotAttempt {
  id: string;
  client: string;
  tier: string;
  timestamp: string;
  penaltyApplied: string;
}

interface Exclusion {
  id: string;
  client: string;
  code: string;
  reason: string;
  attempts: number;
  createdAt: string;
  status: "pending" | "confirmed" | "pardoned";
  definitive: boolean;
}

function loadCodes(): AccessCode[] {
  try { return JSON.parse(localStorage.getItem(CODES_KEY) || "[]"); } catch { return []; }
}
function saveCodes(codes: AccessCode[]) { localStorage.setItem(CODES_KEY, JSON.stringify(codes)); }

// ── API helpers (shared server store) ──
async function apiCreateCode(code: AccessCode): Promise<boolean> {
  try { const r = await fetch("/api/codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(code) }); return r.ok; } catch { return false; }
}
async function apiUpdateCode(code: string, action: string, extra?: Record<string, unknown>): Promise<boolean> {
  try { const r = await fetch("/api/codes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, action, ...extra }) }); return r.ok; } catch { return false; }
}
async function apiDeleteCode(code: string): Promise<boolean> {
  try { const r = await fetch(`/api/codes?code=${encodeURIComponent(code)}`, { method: "DELETE" }); return r.ok; } catch { return false; }
}
async function apiFetchCodes(model: string): Promise<AccessCode[]> {
  try { const r = await fetch(`/api/codes?model=${model}`); if (!r.ok) return []; const d = await r.json(); return d.codes || []; } catch { return []; }
}
function loadOrders(): PendingOrder[] {
  try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]"); } catch { return []; }
}
function loadPacks(): PackConfig[] {
  try {
    const raw = localStorage.getItem(PACKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* use default */ }
  return DEFAULT_PACKS;
}
function savePacks(packs: PackConfig[]) {
  localStorage.setItem(PACKS_KEY, JSON.stringify(packs));
  // Sync to API so public page /m/yumi stays in sync
  fetch("/api/packs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packs }) }).catch(() => {});
}

// ── Reviews & Content ──
const REVIEWS_KEY = "sqwensy_yumi_reviews";
const CONTENT_KEY = "sqwensy_yumi_uploads";

interface Review {
  id: string;
  tier: string;
  author: string;
  content: string;
  rating: number;
  validated: boolean;
  createdAt: string;
  bonusGranted: boolean;
}

interface UploadedContent {
  id: string;
  tier: string;
  type: "photo" | "video" | "reel";
  label: string;
  dataUrl: string;
  uploadedAt: string;
  isNew?: boolean;
  visibility?: "pack" | "promo"; // promo = free, visible without code
  tokenPrice?: number; // token cost to unlock this specific image (0 = included in pack)
}

function loadReviews(): Review[] {
  try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); } catch { return []; }
}
function saveReviewsData(reviews: Review[]) { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); }
function loadUploads(): UploadedContent[] {
  try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || "[]"); } catch { return []; }
}
function saveUploads(uploads: UploadedContent[]) { localStorage.setItem(CONTENT_KEY, JSON.stringify(uploads)); }
function loadServices(): TokenService[] {
  try { const raw = localStorage.getItem(SERVICES_KEY); if (raw) return JSON.parse(raw); } catch { /* */ }
  return DEFAULT_TOKEN_SERVICES;
}
function saveServices(svcs: TokenService[]) { localStorage.setItem(SERVICES_KEY, JSON.stringify(svcs)); }
function loadPresence(): ModelPresence {
  try { const raw = localStorage.getItem(PRESENCE_KEY); if (raw) { const p = JSON.parse(raw); return { online: p.online ?? true, status: p.status ?? "", avatar: p.avatar ?? "" }; } } catch { /* */ }
  return { online: true, status: "", avatar: "" };
}
function savePresence(p: ModelPresence) { localStorage.setItem(PRESENCE_KEY, JSON.stringify(p)); }
function loadExclusions(): Exclusion[] {
  try { return JSON.parse(localStorage.getItem(EXCLUSIONS_KEY) || "[]"); } catch { return []; }
}
function saveExclusions(e: Exclusion[]) { localStorage.setItem(EXCLUSIONS_KEY, JSON.stringify(e)); }
function loadScreenshotLog(): ScreenshotAttempt[] {
  try { return JSON.parse(localStorage.getItem(SCREENSHOT_LOG_KEY) || "[]"); } catch { return []; }
}

function generateCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `YUM-${new Date().getFullYear()}-${r}`;
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expire";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return `${h}h ${m}m`;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

// ══════════ MAIN COMPONENT ══════════
export default function AgenceDashboard() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [showGenerator, setShowGenerator] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"codes" | "packs" | "content" | "reviews" | "profil">("codes");
  // Code filters
  const [codeFilter, setCodeFilter] = useState<"all" | "active" | "expired" | "revoked" | "pending">("all");
  const [codeSearch, setCodeSearch] = useState("");
  const [codeTierFilter, setCodeTierFilter] = useState<string>("all");
  const [editingPack, setEditingPack] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Generator form
  const [genClient, setGenClient] = useState("");
  const [genPlatform, setGenPlatform] = useState("snapchat");
  const [genTier, setGenTier] = useState("vip");
  const [genDuration, setGenDuration] = useState(72);
  const [genType, setGenType] = useState<"paid" | "promo" | "gift">("paid");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Content uploads
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [uploadTier, setUploadTier] = useState("vip");
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadType, setUploadType] = useState<"photo" | "video" | "reel">("photo");
  const [uploadVisibility, setUploadVisibility] = useState<"pack" | "promo">("pack");
  const [uploadTokenPrice, setUploadTokenPrice] = useState(15);

  // Reviews
  const [reviewsList, setReviewsList] = useState<Review[]>([]);

  // Services + Presence
  const [modelServices, setModelServices] = useState<TokenService[]>(DEFAULT_TOKEN_SERVICES);
  const [presence, setPresence] = useState<ModelPresence>({ online: true, status: "", avatar: "" });

  // Exclusions (screenshot protection)
  const [exclusions, setExclusions] = useState<Exclusion[]>([]);
  const [ssLog, setSsLog] = useState<ScreenshotAttempt[]>([]);

  // Avatar file input ref + edit popup
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    // Load local data first (instant)
    const localCodes = loadCodes();
    setCodes(localCodes);
    setOrders(loadOrders()); setPacks(loadPacks()); setUploads(loadUploads()); setReviewsList(loadReviews()); setModelServices(loadServices()); setPresence(loadPresence()); setExclusions(loadExclusions()); setSsLog(loadScreenshotLog());
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ active: true, ts: Date.now() }));

    // Then merge with API (shared server store)
    apiFetchCodes("yumi").then(apiCodes => {
      if (apiCodes.length === 0 && localCodes.length > 0) {
        // First run: push local codes to API
        localCodes.filter(c => c.model === "yumi").forEach(c => apiCreateCode(c));
      } else if (apiCodes.length > 0) {
        // Merge: API is source of truth, add any local-only codes
        const apiSet = new Set(apiCodes.map(c => c.code));
        const localOnly = localCodes.filter(c => c.model === "yumi" && !apiSet.has(c.code));
        localOnly.forEach(c => apiCreateCode(c));
        const nonYumi = localCodes.filter(c => c.model !== "yumi");
        const merged = [...nonYumi, ...apiCodes, ...localOnly];
        setCodes(merged);
        saveCodes(merged);
      }
    });
  }, []);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 60000); return () => clearInterval(iv); }, []);

  // ── Computed ──
  const activePacks = useMemo(() => packs.filter(p => p.active), [packs]);
  const yumiCodes = useMemo(() => codes.filter(c => c.model === "yumi"), [codes]);
  const activeCodes = useMemo(() => yumiCodes.filter(c => c.active && !c.revoked && !isExpired(c.expiresAt)), [yumiCodes]);
  const expiredCodes = useMemo(() => yumiCodes.filter(c => isExpired(c.expiresAt) && !c.revoked), [yumiCodes]);
  const revokedCodes = useMemo(() => yumiCodes.filter(c => c.revoked), [yumiCodes]);
  const revenue = useMemo(() => {
    return yumiCodes.filter(c => c.type === "paid" && !c.revoked).reduce((sum, c) => {
      const pack = packs.find(p => p.id === c.tier);
      return sum + (pack?.price || 0);
    }, 0);
  }, [yumiCodes, packs]);
  const pendingOrders = useMemo(() => orders.filter(o => o.status === "pending_payment"), [orders]);
  const pendingReviews = useMemo(() => reviewsList.filter(r => !r.validated), [reviewsList]);
  const validatedReviewsList = useMemo(() => reviewsList.filter(r => r.validated), [reviewsList]);
  const pendingExclusions = useMemo(() => exclusions.filter(e => e.status === "pending"), [exclusions]);

  // Filtered codes for the modern code manager
  const filteredCodes = useMemo(() => {
    let list = yumiCodes;
    // Status filter
    if (codeFilter === "active") list = list.filter(c => c.active && !c.revoked && !isExpired(c.expiresAt));
    else if (codeFilter === "expired") list = list.filter(c => isExpired(c.expiresAt) && !c.revoked);
    else if (codeFilter === "revoked") list = list.filter(c => c.revoked);
    else if (codeFilter === "pending") list = []; // pendingOrders handled separately
    // Tier filter
    if (codeTierFilter !== "all") list = list.filter(c => c.tier === codeTierFilter);
    // Search
    if (codeSearch.trim()) {
      const q = codeSearch.trim().toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q) || c.client.toLowerCase().includes(q) || c.pack.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [yumiCodes, codeFilter, codeTierFilter, codeSearch]);

  // ── Upload handlers ──
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Fichier trop volumineux (max 5MB)"); return; }
    const reader = new FileReader();
    reader.onerror = () => { alert("Erreur de lecture du fichier"); };
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newUpload: UploadedContent = {
        id: `upload-${Date.now()}`,
        tier: uploadVisibility === "promo" ? "promo" : uploadTier,
        type: uploadType,
        label: uploadLabel.trim() || file.name.split(".")[0],
        dataUrl,
        uploadedAt: new Date().toISOString(),
        isNew: true,
        visibility: uploadVisibility,
        tokenPrice: uploadVisibility === "promo" ? 0 : uploadTokenPrice,
      };
      const updated = [newUpload, ...uploads];
      setUploads(updated);
      saveUploads(updated);
      setUploadLabel("");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [uploads, uploadTier, uploadType, uploadLabel, uploadVisibility]);

  const handleDeleteUpload = useCallback((id: string) => {
    const updated = uploads.filter(u => u.id !== id);
    setUploads(updated);
    saveUploads(updated);
  }, [uploads]);

  const [editingUpload, setEditingUpload] = useState<string | null>(null);

  const handleUpdateUpload = useCallback((id: string, newTier: string, newVisibility: "pack" | "promo", newTokenPrice?: number) => {
    const updated = uploads.map(u => u.id === id ? {
      ...u,
      tier: newVisibility === "promo" ? "promo" : newTier,
      visibility: newVisibility,
      tokenPrice: newVisibility === "promo" ? 0 : (newTokenPrice ?? u.tokenPrice ?? 15),
    } : u);
    setUploads(updated);
    saveUploads(updated);
    setEditingUpload(null);
  }, [uploads]);

  // ── Review handlers ──
  const handleValidateReview = useCallback((reviewId: string) => {
    const review = reviewsList.find(r => r.id === reviewId);
    if (!review) return;

    // Grant +1H bonus to reviewer's code
    let bonusGranted = false;
    if (!review.bonusGranted) {
      const allCodes = loadCodes();
      const userCode = allCodes.find(c => c.client === review.author && c.model === "yumi" && c.active && !c.revoked);
      if (userCode) {
        const bonusMs = 3600000; // 1H
        const newExpiry = new Date(new Date(userCode.expiresAt).getTime() + bonusMs).toISOString();
        const updatedCodes = allCodes.map(c => c.code === userCode.code ? { ...c, expiresAt: newExpiry } : c);
        saveCodes(updatedCodes);
        setCodes(updatedCodes);
        bonusGranted = true;
      }
    }

    // Update review: validated + bonus flag in single operation
    const updated = reviewsList.map(r => {
      if (r.id !== reviewId) return r;
      return { ...r, validated: true, bonusGranted: r.bonusGranted || bonusGranted };
    });
    setReviewsList(updated);
    saveReviewsData(updated);
  }, [reviewsList, codes]);

  const handleRejectReview = useCallback((reviewId: string) => {
    const updated = reviewsList.filter(r => r.id !== reviewId);
    setReviewsList(updated);
    saveReviewsData(updated);
  }, [reviewsList]);

  // ── Actions ──
  const handleGenerate = useCallback(() => {
    if (!genClient.trim()) return;
    const code = generateCodeString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + genDuration * 3600000).toISOString();
    const pack = packs.find(p => p.id === genTier);
    const newCode: AccessCode = {
      code, model: "yumi", client: genClient.trim(), platform: genPlatform,
      role: "client", tier: genTier, pack: pack?.name || genTier,
      type: genType, duration: genDuration, expiresAt,
      created: now.toISOString(), used: false, active: true,
      revoked: false, isTrial: false, lastUsed: null,
    };
    const updated = [...codes, newCode];
    setCodes(updated);
    saveCodes(updated);
    apiCreateCode(newCode); // sync to server
    setGeneratedCode(code);
    setGenClient("");
  }, [codes, packs, genClient, genPlatform, genTier, genDuration, genType]);

  const handleRevoke = useCallback((code: string) => {
    const updated = codes.map(c => c.code === code ? { ...c, revoked: true, active: false } : c);
    setCodes(updated);
    saveCodes(updated);
    apiUpdateCode(code, "revoke");
  }, [codes]);

  const handleCopy = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleDeleteCode = useCallback((code: string) => {
    const updated = codes.filter(c => c.code !== code);
    setCodes(updated);
    saveCodes(updated);
    apiDeleteCode(code);
  }, [codes]);

  const handlePauseCode = useCallback((code: string) => {
    const updated = codes.map(c => c.code === code ? { ...c, active: false } : c);
    setCodes(updated);
    saveCodes(updated);
    apiUpdateCode(code, "pause");
  }, [codes]);

  const handleReactivateCode = useCallback((code: string) => {
    const updated = codes.map(c => c.code === code ? { ...c, active: true, revoked: false } : c);
    setCodes(updated);
    saveCodes(updated);
    apiUpdateCode(code, "reactivate");
  }, [codes]);

  // ── Code management: renew, clean expired, confirm payment, auto-cancel ──
  const handleRenewCode = useCallback((code: string, extraHours: number) => {
    const updated = codes.map(c => {
      if (c.code !== code) return c;
      const base = new Date(c.expiresAt).getTime() > Date.now() ? new Date(c.expiresAt).getTime() : Date.now();
      return { ...c, expiresAt: new Date(base + extraHours * 3600000).toISOString(), active: true, revoked: false };
    });
    setCodes(updated);
    saveCodes(updated);
    apiUpdateCode(code, "renew", { hours: extraHours });
  }, [codes]);

  const handleCleanExpired = useCallback(() => {
    const toDelete = codes.filter(c => c.model === "yumi" && isExpired(c.expiresAt) && c.type !== "paid");
    toDelete.forEach(c => apiDeleteCode(c.code));
    const cleaned = codes.filter(c => {
      if (c.model !== "yumi") return true;
      if (!isExpired(c.expiresAt)) return true;
      if (c.type === "paid") return true;
      return false;
    });
    setCodes(cleaned);
    saveCodes(cleaned);
  }, [codes]);

  const handleConfirmPayment = useCallback((orderId: string) => {
    const allOrders: PendingOrder[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    // Update order status
    const updatedOrders = allOrders.map(o => o.id === orderId ? { ...o, status: "validated" as const } : o);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    setOrders(updatedOrders);
    // Activate the associated code
    if (order.codeGenerated) {
      const updated = codes.map(c => c.code === order.codeGenerated ? { ...c, used: true, active: true, lastUsed: new Date().toISOString() } : c);
      setCodes(updated);
      saveCodes(updated);
    }
  }, [codes, orders]);

  const handleCancelOrder = useCallback((orderId: string) => {
    const allOrders: PendingOrder[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const order = allOrders.find(o => o.id === orderId);
    const updatedOrders = allOrders.map(o => o.id === orderId ? { ...o, status: "cancelled" as const } : o);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
    setOrders(updatedOrders);
    // Revoke associated code
    if (order?.codeGenerated) {
      const updated = codes.map(c => c.code === order.codeGenerated ? { ...c, revoked: true, active: false } : c);
      setCodes(updated);
      saveCodes(updated);
    }
  }, [codes, orders]);

  // Auto-cancel orders older than 24h without payment
  useEffect(() => {
    const allOrders: PendingOrder[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    let changed = false;
    const updatedOrders = allOrders.map(o => {
      if (o.status !== "pending_payment") return o;
      const age = Date.now() - new Date(o.createdAt).getTime();
      if (age > 24 * 3600000) { changed = true; return { ...o, status: "cancelled" as const }; }
      return o;
    });
    if (changed) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
      // Revoke codes for auto-cancelled orders
      const cancelledCodes = updatedOrders.filter(o => o.status === "cancelled").map(o => o.codeGenerated).filter(Boolean);
      if (cancelledCodes.length > 0) {
        const updated = codes.map(c => cancelledCodes.includes(c.code) ? { ...c, revoked: true, active: false } : c);
        setCodes(updated);
        saveCodes(updated);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exclusion handlers ──
  const handleConfirmExclusion = useCallback((exclId: string, definitive: boolean) => {
    const updated = exclusions.map(e => e.id === exclId ? { ...e, status: "confirmed" as const, definitive } : e);
    setExclusions(updated);
    saveExclusions(updated);
    // If definitive, revoke all codes for this client
    if (definitive) {
      const excl = updated.find(e => e.id === exclId);
      if (excl) {
        const updCodes = codes.map(c =>
          c.client === excl.client && c.model === "yumi" ? { ...c, revoked: true, active: false } : c
        );
        setCodes(updCodes);
        saveCodes(updCodes);
      }
    }
  }, [exclusions, codes]);

  const handlePardonExclusion = useCallback((exclId: string) => {
    const updated = exclusions.map(e => e.id === exclId ? { ...e, status: "pardoned" as const, definitive: false } : e);
    setExclusions(updated);
    saveExclusions(updated);
  }, [exclusions]);

  // ── Avatar upload ──
  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { alert("Image trop lourde (max 500 Ko)"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated = { ...presence, avatar: dataUrl };
      setPresence(updated);
      savePresence(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [presence]);

  // ── Pack editing ──
  const updatePack = useCallback((packId: string, updates: Partial<PackConfig>) => {
    const updated = packs.map(p => p.id === packId ? { ...p, ...updates } : p);
    setPacks(updated);
    savePacks(updated);
  }, [packs]);

  const updatePackBonus = useCallback((packId: string, bonusKey: keyof PackConfig["bonuses"], value: boolean) => {
    const updated = packs.map(p => {
      if (p.id !== packId) return p;
      return { ...p, bonuses: { ...p.bonuses, [bonusKey]: value } };
    });
    setPacks(updated);
    savePacks(updated);
  }, [packs]);

  const addFeature = useCallback((packId: string, feature: string) => {
    if (!feature.trim()) return;
    const updated = packs.map(p => {
      if (p.id !== packId) return p;
      return { ...p, features: [...p.features, feature.trim()] };
    });
    setPacks(updated);
    savePacks(updated);
  }, [packs]);

  const removeFeature = useCallback((packId: string, index: number) => {
    const updated = packs.map(p => {
      if (p.id !== packId) return p;
      return { ...p, features: p.features.filter((_, i) => i !== index) };
    });
    setPacks(updated);
    savePacks(updated);
  }, [packs]);

  return (
    <OsLayout cpId="agence">
      <div className="p-3 md:p-8 max-w-5xl mx-auto pb-24">
        {/* Header */}
        <header className="anim-1 flex items-center justify-between mb-4 md:mb-6 flex-wrap gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/" className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80 no-underline"
              style={{ background: "rgba(232,67,147,0.08)", border: "1px solid rgba(232,67,147,0.2)" }}>
              <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "#E84393" }} />
            </Link>
            {/* Profile photo — click to open edit popup */}
            <div className="relative">
              <button onClick={() => { setShowAvatarEdit(!showAvatarEdit); setEditStatus(presence.status); }} className="relative shrink-0 cursor-pointer group" style={{ background: "transparent", border: "none", padding: 0 }}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden" style={{ boxShadow: "0 0 0 2px #E84393" }}>
                  {presence.avatar ? (
                    <img src={presence.avatar} alt="YUMI" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)" }}>
                      <span className="text-sm md:text-base font-bold" style={{ color: "#fff" }}>Y</span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <Edit3 className="w-4 h-4" style={{ color: "#fff" }} />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${presence.online ? "animate-pulse" : ""}`}
                  style={{ background: presence.online ? "#10B981" : "#5A5A6A", borderColor: "var(--sq-bg)" }} />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleAvatarUpload(e); setShowAvatarEdit(false); }} />

              {/* Avatar + Status edit popup */}
              {showAvatarEdit && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-xl p-3 space-y-3 z-50 shadow-xl"
                  style={{ background: "var(--sq-surface)", border: "1px solid rgba(232,67,147,0.2)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ boxShadow: "0 0 0 2px #E84393" }}>
                      {presence.avatar ? (
                        <img src={presence.avatar} alt="YUMI" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)" }}>
                          <span className="text-lg font-bold" style={{ color: "#fff" }}>Y</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <button onClick={() => avatarInputRef.current?.click()}
                        className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg cursor-pointer w-full"
                        style={{ background: "rgba(232,67,147,0.1)", color: "#E84393", border: "1px solid rgba(232,67,147,0.2)" }}>
                        <Camera className="w-3 h-3" /> Changer photo
                      </button>
                      {presence.avatar && (
                        <button onClick={() => { const u = { ...presence, avatar: "" }; setPresence(u); savePresence(u); }}
                          className="flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-lg cursor-pointer w-full"
                          style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.1)" }}>
                          <Trash2 className="w-3 h-3" /> Retirer
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Statut (affiche a cote du nom)</label>
                    <input value={editStatus} onChange={e => setEditStatus(e.target.value)} placeholder="Dispo pour lives..." maxLength={50}
                      className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                      style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {["Dispo pour lives", "Nouveaux contenus", "Promo en cours", ""].map(s => (
                        <button key={s || "clear"} onClick={() => setEditStatus(s)}
                          className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                          style={{ background: editStatus === s ? "rgba(232,67,147,0.12)" : "var(--sq-bg3)", color: editStatus === s ? "#E84393" : "var(--sq-text-muted)" }}>
                          {s || "Aucun"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { const u = { ...presence, status: editStatus }; setPresence(u); savePresence(u); setShowAvatarEdit(false); }}
                      className="flex-1 text-[10px] font-medium py-2 rounded-lg cursor-pointer"
                      style={{ background: "#E84393", color: "#fff" }}>
                      Sauvegarder
                    </button>
                    <button onClick={() => setShowAvatarEdit(false)}
                      className="text-[10px] px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: "var(--sq-bg3)", color: "var(--sq-text-muted)" }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold" style={{ color: "var(--sq-text)" }}>YUMI</h1>
              <p className="text-[10px] md:text-xs truncate max-w-[180px] md:max-w-[280px]" style={{ color: presence.status ? "#E84393" : "var(--sq-text-muted)" }}>
                {presence.status || "Gestion abonnements & codes"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Online/Offline quick toggle */}
            <button onClick={() => { const updated = { ...presence, online: !presence.online }; setPresence(updated); savePresence(updated); }}
              className="flex items-center gap-1.5 text-[10px] md:text-xs px-2.5 py-1.5 md:py-2 rounded-lg transition-all hover:opacity-80 cursor-pointer"
              style={{
                background: presence.online ? "rgba(16,185,129,0.08)" : "rgba(90,90,106,0.08)",
                color: presence.online ? "#10B981" : "#5A5A6A",
                border: `1px solid ${presence.online ? "rgba(16,185,129,0.2)" : "rgba(90,90,106,0.15)"}`,
              }}>
              {presence.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {presence.online ? "En ligne" : "Hors ligne"}
            </button>
            <a href="/m/yumi" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] md:text-xs px-2 py-1.5 md:py-2 rounded-lg transition-all hover:opacity-80 no-underline"
              style={{ background: "rgba(168,130,255,0.08)", color: "#A882FF", border: "1px solid rgba(168,130,255,0.15)" }}>
              <ExternalLink className="w-3 h-3" />
              <span className="hidden md:inline">Profil</span>
            </a>
            <button onClick={() => { setShowGenerator(!showGenerator); setGeneratedCode(null); }}
              className="flex items-center gap-1.5 text-[10px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all hover:opacity-80 cursor-pointer"
              style={{ background: "#E84393", color: "#fff" }}>
              <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" /> Nouveau code
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="anim-2 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
          {[
            { icon: Key, label: "Codes actifs", value: activeCodes.length, color: "#00D68F" },
            { icon: Users, label: "Abonnes", value: activeCodes.filter(c => c.type === "paid").length, color: "#E84393" },
            { icon: DollarSign, label: "Revenus", value: `${revenue}€`, color: "#C9A84C" },
            { icon: AlertCircle, label: "En attente", value: pendingOrders.length, color: "#FF9F43" },
          ].map(kpi => (
            <div key={kpi.label} className="sq-glass rounded-xl p-2.5 md:p-4 relative overflow-hidden group transition-shadow hover:shadow-[0_0_20px_rgba(232,67,147,0.15)]">
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-60 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, ${kpi.color}, transparent)` }} />
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                <span className="text-[9px] md:text-[10px]" style={{ color: "var(--sq-text-muted)" }}>{kpi.label}</span>
              </div>
              <p className="text-lg md:text-xl font-bold" style={{ color: "var(--sq-text)" }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Code Generator Panel ── */}
        {showGenerator && (
          <div className="anim-2 sq-glass rounded-xl p-4 md:p-5 mb-4 md:mb-6" style={{ borderTop: "2px solid #E84393" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs md:text-sm font-bold flex items-center gap-2" style={{ color: "var(--sq-text)" }}>
                <Key className="w-3.5 h-3.5" style={{ color: "#E84393" }} /> Generer un code d&apos;acces
              </h3>
              <button onClick={() => setShowGenerator(false)} className="cursor-pointer"><X className="w-4 h-4" style={{ color: "var(--sq-text-muted)" }} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Pseudo client (Snapchat) *</label>
                <input value={genClient} onChange={e => setGenClient(e.target.value)} placeholder="@pseudo_snap"
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none" style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Plateforme</label>
                <select value={genPlatform} onChange={e => setGenPlatform(e.target.value)}
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none cursor-pointer" style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }}>
                  <option value="snapchat">Snapchat</option>
                  <option value="instagram">Instagram</option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Pack / Tier</label>
                <select value={genTier} onChange={e => setGenTier(e.target.value)}
                  className="w-full text-xs rounded-lg px-3 py-2 outline-none cursor-pointer" style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }}>
                  {activePacks.map(p => <option key={p.id} value={p.id}>{p.name} — {p.price}€/mois</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Duree (heures)</label>
                  <input type="number" value={genDuration} onChange={e => setGenDuration(Number(e.target.value))}
                    className="w-full text-xs rounded-lg px-3 py-2 outline-none" style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Type</label>
                  <select value={genType} onChange={e => setGenType(e.target.value as "paid" | "promo" | "gift")}
                    className="w-full text-xs rounded-lg px-3 py-2 outline-none cursor-pointer" style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }}>
                    <option value="paid">Paye</option>
                    <option value="promo">Promo</option>
                    <option value="gift">Cadeau</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleGenerate} disabled={!genClient.trim()}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg cursor-pointer font-medium disabled:opacity-40"
                style={{ background: "#E84393", color: "#fff" }}>
                <Sparkles className="w-3 h-3" /> Generer
              </button>
              <div className="flex gap-1 flex-wrap">
                {[24, 48, 72, 168, 720].map(h => (
                  <button key={h} onClick={() => setGenDuration(h)}
                    className="text-[9px] px-2 py-1 rounded cursor-pointer"
                    style={{ background: genDuration === h ? "#E8439330" : "var(--sq-bg3)", color: genDuration === h ? "#E84393" : "var(--sq-text-muted)", border: "1px solid var(--sq-border)" }}>
                    {h === 168 ? "7j" : h === 720 ? "30j" : `${h}h`}
                  </button>
                ))}
              </div>
            </div>
            {generatedCode && (
              <div className="mt-3 p-3 rounded-lg flex items-center justify-between" style={{ background: "rgba(0,214,143,0.08)", border: "1px solid rgba(0,214,143,0.2)" }}>
                <div>
                  <p className="text-[10px] mb-1" style={{ color: "#00D68F" }}>Code genere avec succes !</p>
                  <p className="text-sm font-mono font-bold tracking-wider" style={{ color: "var(--sq-text)" }}>{generatedCode}</p>
                </div>
                <button onClick={() => handleCopy(generatedCode)} className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ background: "rgba(0,214,143,0.15)", color: "#00D68F" }}>
                  {copied === generatedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === generatedCode ? "Copie !" : "Copier"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="anim-3 flex gap-1 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {([
            { id: "codes" as const, label: "Codes", icon: Key, count: activeCodes.length + pendingOrders.length },
            { id: "packs" as const, label: "Packs", icon: Crown, count: activePacks.length },
            { id: "content" as const, label: "Contenu", icon: Image, count: uploads.length },
            { id: "reviews" as const, label: "Avis", icon: MessageSquare, count: pendingReviews.length },
            { id: "profil" as const, label: "Profil", icon: Settings, count: 0 },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 text-[10px] md:text-xs px-3 py-2 rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all"
              style={{
                background: tab === t.id ? "#E8439320" : "var(--sq-surface)",
                color: tab === t.id ? "#E84393" : "var(--sq-text-muted)",
                border: `1px solid ${tab === t.id ? "rgba(232,67,147,0.3)" : "var(--sq-border)"}`,
              }}>
              <t.icon className="w-3 h-3" /> {t.label}
              {t.count > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full ml-0.5" style={{ background: tab === t.id ? "#E84393" : "var(--sq-border)", color: tab === t.id ? "#fff" : "var(--sq-text-muted)" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════ TAB: CODES — Modern Filter System ══════════ */}
        {tab === "codes" && (
          <div className="anim-4 space-y-3">

            {/* ── Exclusion alerts (priority) ── */}
            {pendingExclusions.length > 0 && (
              <div className="space-y-2 mb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" style={{ color: "#EF4444" }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#EF4444" }}>
                    Alertes Screenshot ({pendingExclusions.length})
                  </span>
                </div>
                {pendingExclusions.map(excl => (
                  <div key={excl.id} className="sq-glass rounded-xl p-3 space-y-2" style={{ borderLeft: "3px solid #EF4444" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold" style={{ color: "var(--sq-text)" }}>@{excl.client}</span>
                        <span className="text-[10px] ml-2" style={{ color: "var(--sq-text-muted)" }}>{excl.code}</span>
                      </div>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
                        {excl.attempts}x
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleConfirmExclusion(excl.id, false)} className="flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Temporaire</button>
                      <button onClick={() => handleConfirmExclusion(excl.id, true)} className="flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444" }}><Ban className="w-3 h-3 inline mr-1" />Definitif</button>
                      <button onClick={() => handlePardonExclusion(excl.id)} className="flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>Pardonner</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Pending orders (priority) ── */}
            {pendingOrders.length > 0 && (
              <div className="space-y-2 mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" style={{ color: "#FF9F43" }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF9F43" }}>
                    Commandes en attente ({pendingOrders.length})
                  </span>
                </div>
                {pendingOrders.map(order => {
                  const remaining = Math.max(0, 24 - Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 3600000));
                  return (
                    <div key={order.id} className="sq-glass rounded-xl p-3" style={{ borderLeft: "3px solid #FF9F43" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono" style={{ color: "#FF9F43" }}>{order.id}</span>
                          <span className="text-[8px]" style={{ color: remaining < 6 ? "#FF4D6A" : "var(--sq-text-muted)" }}>Expire {remaining}h</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: "#00D68F" }}>{order.total}&euro;</span>
                      </div>
                      <div className="text-[10px] mb-2" style={{ color: "var(--sq-text-muted)" }}>
                        @{order.client} &bull; {order.packs.join(", ")}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleConfirmPayment(order.id)} className="flex-1 flex items-center justify-center gap-1 text-[10px] px-3 py-1.5 rounded-lg cursor-pointer font-medium" style={{ background: "rgba(0,214,143,0.1)", color: "#00D68F", border: "1px solid rgba(0,214,143,0.2)" }}>
                          <Check className="w-3 h-3" /> Confirmer
                        </button>
                        <button onClick={() => handleCancelOrder(order.id)} className="flex items-center justify-center gap-1 text-[10px] px-3 py-1.5 rounded-lg cursor-pointer font-medium" style={{ background: "rgba(255,77,106,0.06)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.15)" }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Search + Filter Bar ── */}
            <div className="sq-glass rounded-xl p-3 space-y-2.5">
              {/* Search */}
              <div className="relative">
                <input value={codeSearch} onChange={e => setCodeSearch(e.target.value)} placeholder="Rechercher code, client, pack..."
                  className="w-full text-xs rounded-lg pl-8 pr-3 py-2.5 outline-none"
                  style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
                <Eye className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--sq-text-muted)" }} />
                {codeSearch && (
                  <button onClick={() => setCodeSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer">
                    <X className="w-3.5 h-3.5" style={{ color: "var(--sq-text-muted)" }} />
                  </button>
                )}
              </div>
              {/* Status pills */}
              <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {([
                  { id: "all" as const, label: "Tous", count: yumiCodes.length, color: "#8E8EA3" },
                  { id: "active" as const, label: "Actifs", count: activeCodes.length, color: "#00D68F" },
                  { id: "expired" as const, label: "Expires", count: expiredCodes.length, color: "#FF9F43" },
                  { id: "revoked" as const, label: "Revoques", count: revokedCodes.length, color: "#FF4D6A" },
                  { id: "pending" as const, label: "Commandes", count: pendingOrders.length, color: "#C9A84C" },
                ]).map(f => (
                  <button key={f.id} onClick={() => setCodeFilter(f.id)}
                    className="flex items-center gap-1 text-[9px] md:text-[10px] px-2.5 py-1.5 rounded-full shrink-0 cursor-pointer transition-all"
                    style={{
                      background: codeFilter === f.id ? `${f.color}18` : "transparent",
                      color: codeFilter === f.id ? f.color : "var(--sq-text-muted)",
                      border: `1px solid ${codeFilter === f.id ? `${f.color}40` : "var(--sq-border)"}`,
                      fontWeight: codeFilter === f.id ? 700 : 500,
                    }}>
                    {f.label}
                    {f.count > 0 && <span className="text-[8px] px-1 rounded-full" style={{ background: codeFilter === f.id ? `${f.color}30` : "var(--sq-bg3)" }}>{f.count}</span>}
                  </button>
                ))}
              </div>
              {/* Tier filter */}
              <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <button onClick={() => setCodeTierFilter("all")}
                  className="text-[9px] px-2 py-1 rounded-lg shrink-0 cursor-pointer"
                  style={{ background: codeTierFilter === "all" ? "var(--sq-bg3)" : "transparent", color: codeTierFilter === "all" ? "var(--sq-text)" : "var(--sq-text-muted)", border: "1px solid var(--sq-border)" }}>
                  Tous tiers
                </button>
                {activePacks.map(p => (
                  <button key={p.id} onClick={() => setCodeTierFilter(p.id)}
                    className="text-[9px] px-2 py-1 rounded-lg shrink-0 cursor-pointer flex items-center gap-1"
                    style={{
                      background: codeTierFilter === p.id ? `${p.color}18` : "transparent",
                      color: codeTierFilter === p.id ? p.color : "var(--sq-text-muted)",
                      border: `1px solid ${codeTierFilter === p.id ? `${p.color}40` : "var(--sq-border)"}`,
                    }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
              {/* Quick actions */}
              <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid var(--sq-border)" }}>
                <span className="text-[9px]" style={{ color: "var(--sq-text-muted)" }}>{filteredCodes.length} resultat{filteredCodes.length !== 1 ? "s" : ""}</span>
                <div className="ml-auto flex gap-1.5">
                  {expiredCodes.filter(c => c.type !== "paid").length > 0 && (
                    <button onClick={handleCleanExpired}
                      className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg cursor-pointer"
                      style={{ background: "rgba(255,159,67,0.08)", color: "#FF9F43", border: "1px solid rgba(255,159,67,0.15)" }}>
                      <Trash2 className="w-3 h-3" /> Nettoyer
                    </button>
                  )}
                  <a href="/m/yumi" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg no-underline"
                    style={{ background: "rgba(232,67,147,0.08)", color: "#E84393", border: "1px solid rgba(232,67,147,0.15)" }}>
                    <ExternalLink className="w-3 h-3" /> Profil public
                  </a>
                </div>
              </div>
            </div>

            {/* ── Code List ── */}
            {codeFilter !== "pending" && filteredCodes.length > 0 && (
              <div className="space-y-1.5">
                {filteredCodes.map(c => <CodeCard key={c.code} code={c} onCopy={handleCopy} onRevoke={handleRevoke} onDelete={handleDeleteCode} onRenew={handleRenewCode} onPause={handlePauseCode} onReactivate={handleReactivateCode} copied={copied} />)}
              </div>
            )}

            {/* ── Validated orders history ── */}
            {(codeFilter === "all" || codeFilter === "pending") && orders.filter(o => o.status === "validated").length > 0 && (
              <CollapsibleSection title={`Commandes validees (${orders.filter(o => o.status === "validated").length})`} color="#00D68F" defaultOpen={false}>
                {orders.filter(o => o.status === "validated").map(order => (
                  <div key={order.id} className="sq-glass rounded-xl p-3" style={{ borderLeft: "3px solid #00D68F" }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono" style={{ color: "#00D68F" }}>{order.id}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,214,143,0.1)", color: "#00D68F" }}>Paye</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: "var(--sq-text)" }}>{order.total}&euro;</span>
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>@{order.client} &bull; {order.packs.join(", ")}</div>
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {/* ── Exclusions resolues ── */}
            {exclusions.filter(e => e.status !== "pending").length > 0 && (
              <CollapsibleSection title={`Exclusions resolues (${exclusions.filter(e => e.status !== "pending").length})`} color="#64748B" defaultOpen={false}>
                {exclusions.filter(e => e.status !== "pending").map(excl => (
                  <div key={excl.id} className="sq-glass rounded-xl p-3 mb-1.5" style={{
                    borderLeft: `3px solid ${excl.status === "confirmed" ? (excl.definitive ? "#EF4444" : "#F59E0B") : "#10B981"}`,
                    opacity: 0.7
                  }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: "var(--sq-text)" }}>@{excl.client}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{
                        background: excl.status === "confirmed" ? (excl.definitive ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)") : "rgba(16,185,129,0.15)",
                        color: excl.status === "confirmed" ? (excl.definitive ? "#EF4444" : "#F59E0B") : "#10B981"
                      }}>
                        {excl.status === "confirmed" ? (excl.definitive ? "Exclu definitif" : "Exclu temporaire") : "Pardonne"}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: "var(--sq-text-muted)" }}>
                      {excl.attempts}x &bull; {excl.reason}
                    </p>
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {/* ── Empty state ── */}
            {filteredCodes.length === 0 && pendingOrders.length === 0 && pendingExclusions.length === 0 && (
              <div className="text-center py-12">
                <Key className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: "var(--sq-text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--sq-text-muted)" }}>
                  {codeSearch || codeFilter !== "all" || codeTierFilter !== "all" ? "Aucun resultat pour ces filtres." : "Aucun code genere. Clique \"Nouveau code\" pour commencer."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: PACKS (configurable) ══════════ */}
        {tab === "packs" && (
          <div className="anim-4 space-y-3">
            {packs.map(pack => {
              const isEditing = editingPack === pack.id;
              const activeSubCount = activeCodes.filter(c => c.tier === pack.id).length;
              const packRevenue = yumiCodes.filter(c => c.tier === pack.id && c.type === "paid").length * pack.price;
              const activeBonuses = Object.entries(pack.bonuses).filter(([, v]) => v);

              return (
                <div key={pack.id} className="sq-glass rounded-xl overflow-hidden transition-all"
                  style={{ borderTop: `2px solid ${pack.color}`, opacity: pack.active ? 1 : 0.5 }}>
                  {/* Pack header */}
                  <div className="p-4 md:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4" style={{ color: pack.color }} />
                        <h3 className="text-sm font-bold" style={{ color: "var(--sq-text)" }}>{pack.name}</h3>
                        {pack.badge && (
                          <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{ background: `${pack.color}20`, color: pack.color }}>{pack.badge}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Toggle active */}
                        <button onClick={() => updatePack(pack.id, { active: !pack.active })}
                          className="cursor-pointer" title={pack.active ? "Desactiver" : "Activer"}>
                          {pack.active
                            ? <ToggleRight className="w-5 h-5" style={{ color: "#00D68F" }} />
                            : <ToggleLeft className="w-5 h-5" style={{ color: "var(--sq-text-muted)" }} />
                          }
                        </button>
                        <button onClick={() => setEditingPack(isEditing ? null : pack.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ background: isEditing ? "#E8439320" : "var(--sq-bg3)" }}>
                          {isEditing ? <Save className="w-3 h-3" style={{ color: "#E84393" }} /> : <Edit3 className="w-3 h-3" style={{ color: "var(--sq-text-muted)" }} />}
                        </button>
                      </div>
                    </div>

                    {/* Price (editable) */}
                    <div className="flex items-baseline gap-1 mb-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={pack.price}
                            onChange={e => updatePack(pack.id, { price: Math.max(0, Number(e.target.value)) })}
                            className="w-20 text-2xl font-black outline-none rounded px-1"
                            style={{ background: "var(--sq-bg3)", color: pack.color, border: "1px solid var(--sq-border)" }} />
                          <span className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>€/mois</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-2xl font-black" style={{ color: pack.color }}>{pack.price}€</span>
                          <span className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>/mois</span>
                        </>
                      )}
                      <span className="ml-auto text-[10px] flex items-center gap-1" style={{ color: "var(--sq-text-muted)" }}>
                        {pack.face ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {pack.face ? "Avec visage" : "Sans visage"}
                      </span>
                    </div>

                    {/* Features */}
                    <div className="space-y-1 mb-3">
                      {pack.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-1.5 group/feat">
                          <Check className="w-3 h-3 mt-0.5 shrink-0" style={{ color: pack.color }} />
                          <span className="text-[10px] md:text-xs flex-1" style={{ color: "var(--sq-text-muted)" }}>{f}</span>
                          {isEditing && (
                            <button onClick={() => removeFeature(pack.id, i)}
                              className="opacity-0 group-hover/feat:opacity-100 cursor-pointer shrink-0">
                              <X className="w-3 h-3" style={{ color: "#FF4D6A" }} />
                            </button>
                          )}
                        </div>
                      ))}
                      {isEditing && (
                        <AddFeatureInput onAdd={(f) => addFeature(pack.id, f)} color={pack.color} />
                      )}
                    </div>

                    {/* Bonuses */}
                    <div className="pt-3" style={{ borderTop: "1px solid var(--sq-border)" }}>
                      <p className="text-[9px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1" style={{ color: "var(--sq-text-muted)" }}>
                        <Star className="w-3 h-3" /> Bonus
                      </p>
                      <div className="space-y-1.5">
                        {(Object.entries(BONUS_LABELS) as [keyof PackConfig["bonuses"], typeof BONUS_LABELS[keyof typeof BONUS_LABELS]][]).map(([key, cfg]) => {
                          const active = pack.bonuses[key];
                          const Icon = cfg.icon;
                          return (
                            <div key={key} className="flex items-center gap-2">
                              {isEditing ? (
                                <button onClick={() => updatePackBonus(pack.id, key, !active)} className="cursor-pointer">
                                  {active
                                    ? <ToggleRight className="w-4 h-4" style={{ color: cfg.color }} />
                                    : <ToggleLeft className="w-4 h-4" style={{ color: "var(--sq-text-muted)" }} />
                                  }
                                </button>
                              ) : (
                                <div className="w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ background: active ? `${cfg.color}20` : "var(--sq-bg3)" }}>
                                  {active ? <Check className="w-2.5 h-2.5" style={{ color: cfg.color }} /> : <X className="w-2.5 h-2.5" style={{ color: "var(--sq-text-muted)" }} />}
                                </div>
                              )}
                              <Icon className="w-3 h-3" style={{ color: active ? cfg.color : "var(--sq-text-muted)" }} />
                              <span className="text-[10px]" style={{ color: active ? "var(--sq-text)" : "var(--sq-text-muted)" }}>{cfg.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Face toggle in edit mode */}
                    {isEditing && (
                      <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--sq-border)" }}>
                        <button onClick={() => updatePack(pack.id, { face: !pack.face })} className="cursor-pointer">
                          {pack.face
                            ? <ToggleRight className="w-4 h-4" style={{ color: "#5B8DEF" }} />
                            : <ToggleLeft className="w-4 h-4" style={{ color: "var(--sq-text-muted)" }} />
                          }
                        </button>
                        <span className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>Contenu avec visage</span>
                      </div>
                    )}

                    {/* Pack stats */}
                    {!isEditing && (
                      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--sq-border)" }}>
                        <span className="text-[9px]" style={{ color: "var(--sq-text-muted)" }}>
                          {activeSubCount} abonne{activeSubCount !== 1 ? "s" : ""} actif{activeSubCount !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[9px] font-medium" style={{ color: pack.color }}>{packRevenue}€ revenus</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* ══════════ TAB: CONTENU (uploads) ══════════ */}
        {tab === "content" && (
          <div className="anim-4 space-y-4">
            {/* Upload form */}
            <div className="sq-glass rounded-xl p-4" style={{ borderTop: "2px solid #E84393" }}>
              <h3 className="text-xs font-bold flex items-center gap-2 mb-3" style={{ color: "var(--sq-text)" }}>
                <Upload className="w-3.5 h-3.5" style={{ color: "#E84393" }} /> Ajouter du contenu
              </h3>

              {/* Visibility toggle: Promo (free) vs Pack (locked) */}
              <div className="flex gap-2 mb-3">
                <button onClick={() => setUploadVisibility("promo")}
                  className="flex-1 text-[11px] font-medium py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: uploadVisibility === "promo" ? "rgba(16,185,129,0.15)" : "var(--sq-bg3)",
                    border: `1px solid ${uploadVisibility === "promo" ? "rgba(16,185,129,0.4)" : "var(--sq-border)"}`,
                    color: uploadVisibility === "promo" ? "#10B981" : "var(--sq-text-muted)",
                  }}>
                  <Gift className="w-3 h-3 inline mr-1" /> Promo (gratuit)
                </button>
                <button onClick={() => setUploadVisibility("pack")}
                  className="flex-1 text-[11px] font-medium py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: uploadVisibility === "pack" ? "rgba(232,67,147,0.15)" : "var(--sq-bg3)",
                    border: `1px solid ${uploadVisibility === "pack" ? "rgba(232,67,147,0.4)" : "var(--sq-border)"}`,
                    color: uploadVisibility === "pack" ? "#E84393" : "var(--sq-text-muted)",
                  }}>
                  <Key className="w-3 h-3 inline mr-1" /> Pack (abonnes)
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {/* Tier selector — only visible when pack mode */}
                {uploadVisibility === "pack" && (
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Pack / Tier</label>
                    <select value={uploadTier} onChange={e => setUploadTier(e.target.value)}
                      className="w-full text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                      style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }}>
                      {activePacks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Type</label>
                  <select value={uploadType} onChange={e => setUploadType(e.target.value as "photo" | "video" | "reel")}
                    className="w-full text-xs rounded-lg px-3 py-2 outline-none cursor-pointer"
                    style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }}>
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                    <option value="reel">Reel</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--sq-text-muted)" }}>Label</label>
                  <input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} placeholder="Description..."
                    className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                    style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
                </div>
                {/* Token price — only for pack content */}
                {uploadVisibility === "pack" && (
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: "#C9A84C" }}>Prix jetons</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={uploadTokenPrice} onChange={e => setUploadTokenPrice(Math.max(0, Number(e.target.value)))} min={0}
                        className="w-full text-xs rounded-lg px-3 py-2 outline-none"
                        style={{ background: "var(--sq-bg3)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }} />
                      <span className="text-[9px] shrink-0" style={{ color: "#C9A84C" }}>JT</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {[10, 15, 25, 50].map(p => (
                        <button key={p} onClick={() => setUploadTokenPrice(p)}
                          className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                          style={{ background: uploadTokenPrice === p ? "rgba(201,168,76,0.15)" : "var(--sq-bg3)", color: uploadTokenPrice === p ? "#C9A84C" : "var(--sq-text-muted)", border: "1px solid var(--sq-border)" }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-lg cursor-pointer font-medium transition-all hover:opacity-80"
                style={{ background: uploadVisibility === "promo" ? "#10B981" : "#E84393", color: "#fff", display: "inline-flex" }}>
                <Camera className="w-3.5 h-3.5" /> Poster le contenu
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <p className="text-[9px] mt-2" style={{ color: "var(--sq-text-muted)" }}>
                {uploadVisibility === "promo"
                  ? "Contenu promo : visible par tout le monde sans code d'acces."
                  : `Contenu pack : reserve aux abonnes ${activePacks.find(p => p.id === uploadTier)?.name || uploadTier}.`}
              </p>
            </div>

            {/* Uploaded content grid */}
            {uploads.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {uploads.map(u => {
                  const isEditing = editingUpload === u.id;
                  const isPromo = u.visibility === "promo" || u.tier === "promo";
                  return (
                    <div key={u.id} className="sq-glass rounded-xl overflow-hidden relative group">
                      <div className="aspect-square relative">
                        <img src={u.dataUrl} alt={u.label} className="w-full h-full object-cover" />
                        {/* Hover actions: edit + delete */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={() => setEditingUpload(isEditing ? null : u.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(99,102,241,0.8)" }}>
                            <Edit3 className="w-4 h-4 text-white" />
                          </button>
                          <button onClick={() => handleDeleteUpload(u.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                            style={{ background: "rgba(255,77,106,0.8)" }}>
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>

                      {/* Info + edit panel */}
                      <div className="p-2">
                        <p className="text-[10px] font-medium truncate" style={{ color: "var(--sq-text)" }}>{u.label}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {isPromo ? (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>
                              PROMO
                            </span>
                          ) : (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full"
                              style={{ background: `${TIER_COLORS[u.tier] || "#8E8EA3"}20`, color: TIER_COLORS[u.tier] || "#8E8EA3" }}>
                              {u.tier}
                            </span>
                          )}
                          <span className="text-[8px]" style={{ color: "var(--sq-text-muted)" }}>{u.type}</span>
                          {!isPromo && u.tokenPrice != null && u.tokenPrice > 0 && (
                            <span className="text-[8px] font-semibold" style={{ color: "#C9A84C" }}>{u.tokenPrice} JT</span>
                          )}
                          <button onClick={() => setEditingUpload(isEditing ? null : u.id)}
                            className="ml-auto text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                            style={{ background: "var(--sq-bg3)", color: "var(--sq-text-muted)", border: "1px solid var(--sq-border)" }}>
                            {isEditing ? "Fermer" : "Modifier"}
                          </button>
                        </div>

                        {/* Inline edit controls */}
                        {isEditing && (
                          <div className="mt-2 pt-2 space-y-2" style={{ borderTop: "1px solid var(--sq-border)" }}>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleUpdateUpload(u.id, u.tier === "promo" ? "vip" : u.tier, "promo")}
                                className="flex-1 text-[9px] font-medium py-1.5 rounded-lg cursor-pointer transition-all"
                                style={{
                                  background: isPromo ? "rgba(16,185,129,0.15)" : "var(--sq-bg3)",
                                  border: `1px solid ${isPromo ? "rgba(16,185,129,0.4)" : "var(--sq-border)"}`,
                                  color: isPromo ? "#10B981" : "var(--sq-text-muted)",
                                }}>
                                Gratuit
                              </button>
                              <button onClick={() => handleUpdateUpload(u.id, u.tier === "promo" ? "vip" : u.tier, "pack")}
                                className="flex-1 text-[9px] font-medium py-1.5 rounded-lg cursor-pointer transition-all"
                                style={{
                                  background: !isPromo ? "rgba(232,67,147,0.15)" : "var(--sq-bg3)",
                                  border: `1px solid ${!isPromo ? "rgba(232,67,147,0.4)" : "var(--sq-border)"}`,
                                  color: !isPromo ? "#E84393" : "var(--sq-text-muted)",
                                }}>
                                Pack
                              </button>
                            </div>
                            {!isPromo && (
                              <>
                                <select
                                  value={u.tier}
                                  onChange={e => handleUpdateUpload(u.id, e.target.value, "pack", u.tokenPrice)}
                                  className="w-full text-[10px] rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                                  style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }}>
                                  {activePacks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] shrink-0" style={{ color: "#C9A84C" }}>Prix :</span>
                                  {[10, 15, 25, 50].map(p => (
                                    <button key={p} onClick={() => handleUpdateUpload(u.id, u.tier, "pack", p)}
                                      className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                                      style={{ background: u.tokenPrice === p ? "rgba(201,168,76,0.15)" : "var(--sq-bg3)", color: u.tokenPrice === p ? "#C9A84C" : "var(--sq-text-muted)", border: "1px solid var(--sq-border)" }}>
                                      {p} JT
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: "var(--sq-text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--sq-text-muted)" }}>Aucun contenu uploade. Les contenus par defaut sont affiches.</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: AVIS (review validation) ══════════ */}
        {tab === "reviews" && (
          <div className="anim-4 space-y-3">
            {/* Pending reviews */}
            {pendingReviews.length > 0 && (
              <>
                <h3 className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1" style={{ color: "#FF9F43" }}>
                  <AlertCircle className="w-3 h-3" /> En attente de validation ({pendingReviews.length})
                </h3>
                {pendingReviews.map(r => (
                  <div key={r.id} className="sq-glass rounded-xl p-3 md:p-4" style={{ borderLeft: `3px solid ${TIER_COLORS[r.tier] || "#8E8EA3"}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: "var(--sq-text)" }}>@{r.author}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: `${TIER_COLORS[r.tier]}20`, color: TIER_COLORS[r.tier] }}>
                          {r.tier}
                        </span>
                        <span className="text-[9px]" style={{ color: TIER_COLORS[r.tier] }}>
                          {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                        </span>
                      </div>
                      <span className="text-[9px]" style={{ color: "var(--sq-text-muted)" }}>
                        {new Date(r.createdAt).toLocaleDateString("fr-BE")}
                      </span>
                    </div>
                    <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--sq-text-muted)" }}>&ldquo;{r.content}&rdquo;</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleValidateReview(r.id)}
                        className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg cursor-pointer font-medium"
                        style={{ background: "rgba(0,214,143,0.1)", color: "#00D68F", border: "1px solid rgba(0,214,143,0.2)" }}>
                        <ThumbsUp className="w-3 h-3" /> Valider (+1H bonus)
                      </button>
                      <button onClick={() => handleRejectReview(r.id)}
                        className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg cursor-pointer font-medium"
                        style={{ background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)" }}>
                        <ThumbsDown className="w-3 h-3" /> Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Validated reviews */}
            {validatedReviewsList.length > 0 && (
              <CollapsibleSection title={`Valides (${validatedReviewsList.length})`} color="#00D68F" defaultOpen={pendingReviews.length === 0}>
                {validatedReviewsList.map(r => (
                  <div key={r.id} className="sq-glass rounded-xl p-3" style={{ borderLeft: `3px solid ${TIER_COLORS[r.tier] || "#8E8EA3"}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold" style={{ color: "var(--sq-text)" }}>@{r.author}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: `${TIER_COLORS[r.tier]}20`, color: TIER_COLORS[r.tier] }}>{r.tier}</span>
                      <span className="text-[9px]" style={{ color: TIER_COLORS[r.tier] }}>{"★".repeat(r.rating)}</span>
                      {r.bonusGranted && <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,214,143,0.1)", color: "#00D68F" }}>+1H</span>}
                    </div>
                    <p className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>{r.content}</p>
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {reviewsList.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: "var(--sq-text-muted)" }} />
                <p className="text-xs" style={{ color: "var(--sq-text-muted)" }}>Aucun avis recu. Les abonnes peuvent laisser des avis depuis le profil public.</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ TAB: PROFIL (presence + services config) ══════════ */}
        {tab === "profil" && (
          <div className="anim-4 space-y-4">

            {/* ── Profile Photo ── */}
            <div className="sq-glass rounded-xl p-4 md:p-5" style={{ borderTop: "2px solid #E84393" }}>
              <h3 className="text-xs md:text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--sq-text)" }}>
                <Camera className="w-3.5 h-3.5" style={{ color: "#E84393" }} /> Photo de profil
              </h3>
              <div className="flex items-center gap-4">
                <button onClick={() => avatarInputRef.current?.click()} className="relative shrink-0 cursor-pointer group">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 0 2px #E84393" }}>
                    {presence.avatar ? (
                      <img src={presence.avatar} alt="YUMI" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)" }}>
                        <span className="text-2xl font-bold" style={{ color: "#fff" }}>Y</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <Camera className="w-5 h-5" style={{ color: "#fff" }} />
                  </div>
                </button>
                <div className="space-y-2">
                  <button onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-[10px] font-medium px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{ background: "rgba(232,67,147,0.1)", color: "#E84393", border: "1px solid rgba(232,67,147,0.2)" }}>
                    <Upload className="w-3 h-3" /> Changer la photo
                  </button>
                  {presence.avatar && (
                    <button onClick={() => { const updated = { ...presence, avatar: "" }; setPresence(updated); savePresence(updated); }}
                      className="flex items-center gap-1.5 text-[10px] font-medium px-3 py-1.5 rounded-lg cursor-pointer"
                      style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}>
                      <Trash2 className="w-3 h-3" /> Supprimer
                    </button>
                  )}
                  <p className="text-[9px]" style={{ color: "var(--sq-text-muted)" }}>Max 500 Ko &bull; Visible sur ton profil public</p>
                </div>
              </div>
            </div>

            {/* ── Presence / Status ── */}
            <div className="sq-glass rounded-xl p-4 md:p-5" style={{ borderTop: "2px solid #10B981" }}>
              <h3 className="text-xs md:text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--sq-text)" }}>
                <Wifi className="w-3.5 h-3.5" style={{ color: "#10B981" }} /> Statut en ligne
              </h3>

              {/* Online toggle */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-xl" style={{ background: "var(--sq-bg3)" }}>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${presence.online ? "animate-pulse" : ""}`}
                    style={{ background: presence.online ? "#10B981" : "#5A5A6A" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--sq-text)" }}>
                    {presence.online ? "En ligne — visible sur le profil" : "Hors ligne — masque sur le profil"}
                  </span>
                </div>
                <button onClick={() => { const updated = { ...presence, online: !presence.online }; setPresence(updated); savePresence(updated); }}
                  className="cursor-pointer">
                  {presence.online
                    ? <ToggleRight className="w-6 h-6" style={{ color: "#10B981" }} />
                    : <ToggleLeft className="w-6 h-6" style={{ color: "var(--sq-text-muted)" }} />
                  }
                </button>
              </div>

              {/* Custom status */}
              <div>
                <label className="text-[10px] block mb-1.5" style={{ color: "var(--sq-text-muted)" }}>Statut personnalise (affiche a cote du nom)</label>
                <div className="flex gap-2">
                  <input
                    value={presence.status}
                    onChange={e => setPresence({ ...presence, status: e.target.value })}
                    placeholder="Ex: Dispo pour lives ce soir..."
                    maxLength={50}
                    className="flex-1 text-xs rounded-lg px-3 py-2 outline-none"
                    style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
                  <button onClick={() => savePresence(presence)}
                    className="text-[10px] px-3 py-2 rounded-lg cursor-pointer font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <Save className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {["Dispo pour lives", "Pas dispo aujourd'hui", "Nouveaux contenus dispo", "Promo en cours", ""].map(s => (
                    <button key={s || "clear"} onClick={() => { const updated = { ...presence, status: s }; setPresence(updated); savePresence(updated); }}
                      className="text-[9px] px-2 py-1 rounded cursor-pointer"
                      style={{ background: presence.status === s ? "rgba(16,185,129,0.12)" : "var(--sq-bg3)", color: presence.status === s ? "#10B981" : "var(--sq-text-muted)", border: "1px solid var(--sq-border)" }}>
                      {s || "Aucun"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Services / Token Pricing ── */}
            <div className="sq-glass rounded-xl p-4 md:p-5" style={{ borderTop: "2px solid #C9A84C" }}>
              <h3 className="text-xs md:text-sm font-bold flex items-center gap-2 mb-1" style={{ color: "var(--sq-text)" }}>
                <DollarSign className="w-3.5 h-3.5" style={{ color: "#C9A84C" }} /> Services & tarifs jetons
              </h3>
              <p className="text-[10px] mb-4" style={{ color: "var(--sq-text-muted)" }}>
                1 jeton &asymp; 0,50&euro; &bull; Plateforme 25% &bull; Les clients voient ces prix sur ton profil
              </p>

              {/* Lives prives */}
              <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1" style={{ color: "#FFFC00" }}>
                <Video className="w-3 h-3" /> Lives prives Snap
              </h4>
              <div className="space-y-1.5 mb-4">
                {modelServices.filter(s => s.icon === "cam").map(svc => {
                  const euroEquiv = (svc.tokens * 0.5).toFixed(0);
                  return (
                    <div key={svc.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--sq-bg3)", border: `1px solid ${svc.active ? svc.color + "20" : "var(--sq-border)"}`, opacity: svc.active ? 1 : 0.5 }}>
                      <button onClick={() => {
                        const updated = modelServices.map(s => s.id === svc.id ? { ...s, active: !s.active } : s);
                        setModelServices(updated); saveServices(updated);
                      }} className="cursor-pointer shrink-0">
                        {svc.active ? <ToggleRight className="w-4 h-4" style={{ color: "#10B981" }} /> : <ToggleLeft className="w-4 h-4" style={{ color: "var(--sq-text-muted)" }} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate" style={{ color: "var(--sq-text)" }}>{svc.label}</p>
                        <p className="text-[8px]" style={{ color: svc.color }}>{svc.tier}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input type="number" value={svc.tokens} min={1}
                          onChange={e => {
                            const updated = modelServices.map(s => s.id === svc.id ? { ...s, tokens: Math.max(1, Number(e.target.value)) } : s);
                            setModelServices(updated); saveServices(updated);
                          }}
                          className="w-16 text-xs text-right rounded px-2 py-1 outline-none"
                          style={{ background: "var(--sq-surface)", border: "1px solid rgba(201,168,76,0.2)", color: "#C9A84C" }} />
                        <span className="text-[9px]" style={{ color: "#C9A84C" }}>JT</span>
                      </div>
                      <span className="text-[8px] shrink-0" style={{ color: "var(--sq-text-muted)" }}>&asymp;{euroEquiv}&euro;</span>
                    </div>
                  );
                })}
              </div>

              {/* Custom content */}
              <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1" style={{ color: "#E84393" }}>
                <Camera className="w-3 h-3" /> Contenu custom
              </h4>
              <div className="space-y-1.5">
                {modelServices.filter(s => s.icon !== "cam").map(svc => {
                  const euroEquiv = (svc.tokens * 0.5).toFixed(0);
                  return (
                    <div key={svc.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "var(--sq-bg3)", border: `1px solid ${svc.active ? svc.color + "20" : "var(--sq-border)"}`, opacity: svc.active ? 1 : 0.5 }}>
                      <button onClick={() => {
                        const updated = modelServices.map(s => s.id === svc.id ? { ...s, active: !s.active } : s);
                        setModelServices(updated); saveServices(updated);
                      }} className="cursor-pointer shrink-0">
                        {svc.active ? <ToggleRight className="w-4 h-4" style={{ color: "#10B981" }} /> : <ToggleLeft className="w-4 h-4" style={{ color: "var(--sq-text-muted)" }} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate" style={{ color: "var(--sq-text)" }}>{svc.label}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input type="number" value={svc.tokens} min={1}
                          onChange={e => {
                            const updated = modelServices.map(s => s.id === svc.id ? { ...s, tokens: Math.max(1, Number(e.target.value)) } : s);
                            setModelServices(updated); saveServices(updated);
                          }}
                          className="w-16 text-xs text-right rounded px-2 py-1 outline-none"
                          style={{ background: "var(--sq-surface)", border: "1px solid rgba(201,168,76,0.2)", color: "#C9A84C" }} />
                        <span className="text-[9px]" style={{ color: "#C9A84C" }}>JT</span>
                      </div>
                      <span className="text-[8px] shrink-0" style={{ color: "var(--sq-text-muted)" }}>&asymp;{euroEquiv}&euro;</span>
                    </div>
                  );
                })}
              </div>

              {/* Reset to defaults */}
              <button onClick={() => { setModelServices(DEFAULT_TOKEN_SERVICES); saveServices(DEFAULT_TOKEN_SERVICES); }}
                className="mt-3 text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-80"
                style={{ background: "rgba(255,77,106,0.08)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.15)" }}>
                Reinitialiser les tarifs par defaut
              </button>
            </div>
          </div>
        )}
      </div>
    </OsLayout>
  );
}

// ── Add Feature Input ──
function AddFeatureInput({ onAdd, color }: { onAdd: (f: string) => void; color: string }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-1.5 mt-1">
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="Nouvel avantage..."
        onKeyDown={e => { if (e.key === "Enter" && value.trim()) { onAdd(value); setValue(""); } }}
        className="flex-1 text-[10px] rounded-lg px-2.5 py-1.5 outline-none"
        style={{ background: "var(--sq-bg3)", border: "1px solid var(--sq-border)", color: "var(--sq-text)" }} />
      <button onClick={() => { if (value.trim()) { onAdd(value); setValue(""); } }}
        className="text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer"
        style={{ background: `${color}20`, color }}>
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Code Card ──
function CodeCard({ code, onCopy, onRevoke, onDelete, onRenew, onPause, onReactivate, copied }: {
  code: AccessCode; onCopy: (c: string) => void; onRevoke: (c: string) => void; onDelete: (c: string) => void;
  onRenew?: (code: string, hours: number) => void; onPause?: (code: string) => void; onReactivate?: (code: string) => void; copied: string | null;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const expired = isExpired(code.expiresAt);
  const tierColor = TIER_COLORS[code.tier] || "#8E8EA3";
  const isActive = code.active && !code.revoked && !expired;
  const isPaused = !code.active && !code.revoked;

  const handleTouchStart = (e: React.TouchEvent) => { setStartX(e.touches[0].clientX); setSwiping(true); };
  const handleTouchMove = (e: React.TouchEvent) => { if (!swiping) return; setSwipeX(e.touches[0].clientX - startX); };
  const handleTouchEnd = () => {
    if (swipeX < -80) { onDelete(code.code); } // swipe left = delete
    else if (swipeX > 80) { setShowActions(true); } // swipe right = open actions
    setSwipeX(0); setSwiping(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe background indicators */}
      {swipeX !== 0 && (
        <>
          {swipeX < -30 && (
            <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center z-0 rounded-r-xl" style={{ background: "rgba(239,68,68,0.2)" }}>
              <Trash2 className="w-5 h-5" style={{ color: "#EF4444" }} />
            </div>
          )}
          {swipeX > 30 && (
            <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center z-0 rounded-l-xl" style={{ background: "rgba(99,102,241,0.15)" }}>
              <Settings className="w-5 h-5" style={{ color: "#6366F1" }} />
            </div>
          )}
        </>
      )}
      <div
        className="sq-glass p-3 md:p-4 flex flex-col gap-2 transition-transform relative z-10"
        style={{
          borderLeft: `3px solid ${code.revoked ? "#FF4D6A" : expired ? "#FF9F43" : isPaused ? "#F59E0B" : tierColor}`,
          opacity: isActive ? 1 : isPaused ? 0.7 : 0.5,
          transform: swiping ? `translateX(${Math.max(-100, Math.min(100, swipeX))}px)` : undefined,
        }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        {/* Main row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => onCopy(code.code)} className="cursor-pointer bg-transparent border-none p-0">
              <span className="text-xs md:text-sm font-mono font-bold tracking-wider" style={{ color: copied === code.code ? "#00D68F" : "var(--sq-text)" }}>
                {copied === code.code ? "Copie!" : code.code}
              </span>
            </button>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${tierColor}20`, color: tierColor }}>{code.pack}</span>
            {code.type !== "paid" && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--sq-border)", color: "var(--sq-text-muted)" }}>{code.type}</span>
            )}
            {isPaused && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>Pause</span>
            )}
          </div>
          {/* Desktop: icon buttons | Mobile: tap code row to expand */}
          <button onClick={() => setShowActions(!showActions)}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-all"
            style={{ background: showActions ? "rgba(99,102,241,0.12)" : "var(--sq-bg3)" }}>
            {showActions ? <X className="w-3.5 h-3.5" style={{ color: "#6366F1" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--sq-text-muted)" }} />}
          </button>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: "var(--sq-text-muted)" }}>
          <span>@{code.client}</span>
          <span>{code.platform}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {code.revoked ? <span style={{ color: "#FF4D6A" }}>Revoque</span>
              : expired ? <span style={{ color: "#FF9F43" }}>Expire</span>
              : isPaused ? <span style={{ color: "#F59E0B" }}>En pause</span>
              : <span style={{ color: "#00D68F" }}>{timeLeft(code.expiresAt)}</span>}
          </span>
        </div>

        {/* ── Actions panel (swipe right or tap chevron) ── */}
        {showActions && (
          <div className="pt-2 space-y-2" style={{ borderTop: "1px solid var(--sq-border)", animation: "slideDown 0.15s ease-out" }}>
            {/* Time management */}
            {onRenew && (
              <div>
                <p className="text-[9px] font-medium mb-1.5" style={{ color: "var(--sq-text-muted)" }}>Ajouter du temps</p>
                <div className="flex gap-1 flex-wrap">
                  {[{ h: 24, l: "+24h" }, { h: 48, l: "+48h" }, { h: 72, l: "+3j" }, { h: 168, l: "+7j" }, { h: 720, l: "+30j" }].map(t => (
                    <button key={t.h} onClick={() => { onRenew(code.code, t.h); setShowActions(false); }}
                      className="text-[9px] px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition-all active:scale-95"
                      style={{ background: "rgba(0,214,143,0.08)", color: "#00D68F", border: "1px solid rgba(0,214,143,0.15)" }}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Action buttons */}
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => onCopy(code.code)}
                className="flex items-center gap-1 text-[9px] px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition-all active:scale-95"
                style={{ background: "var(--sq-bg3)", color: "var(--sq-text-muted)", border: "1px solid var(--sq-border)" }}>
                <Copy className="w-3 h-3" /> Copier
              </button>
              {isActive && onPause && (
                <button onClick={() => { onPause(code.code); setShowActions(false); }}
                  className="flex items-center gap-1 text-[9px] px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition-all active:scale-95"
                  style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <EyeOff className="w-3 h-3" /> Pause
                </button>
              )}
              {isPaused && onReactivate && (
                <button onClick={() => { onReactivate(code.code); setShowActions(false); }}
                  className="flex items-center gap-1 text-[9px] px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition-all active:scale-95"
                  style={{ background: "rgba(0,214,143,0.08)", color: "#00D68F", border: "1px solid rgba(0,214,143,0.15)" }}>
                  <Eye className="w-3 h-3" /> Reactiver
                </button>
              )}
              {(isActive || isPaused) && (
                <button onClick={() => { onRevoke(code.code); setShowActions(false); }}
                  className="flex items-center gap-1 text-[9px] px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition-all active:scale-95"
                  style={{ background: "rgba(255,77,106,0.06)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.12)" }}>
                  <Shield className="w-3 h-3" /> Revoquer
                </button>
              )}
              {code.revoked && onReactivate && (
                <button onClick={() => { onReactivate(code.code); setShowActions(false); }}
                  className="flex items-center gap-1 text-[9px] px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition-all active:scale-95"
                  style={{ background: "rgba(0,214,143,0.08)", color: "#00D68F", border: "1px solid rgba(0,214,143,0.15)" }}>
                  <Eye className="w-3 h-3" /> Restaurer
                </button>
              )}
              <button onClick={() => { onDelete(code.code); }}
                className="flex items-center gap-1 text-[9px] px-2.5 py-1.5 rounded-lg cursor-pointer font-medium transition-all active:scale-95 ml-auto"
                style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.1)" }}>
                <Trash2 className="w-3 h-3" /> Supprimer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Collapsible Section ──
function CollapsibleSection({ title, color, defaultOpen, children }: {
  title: string; color: string; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold mb-2 cursor-pointer bg-transparent border-none p-0" style={{ color }}>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {title}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

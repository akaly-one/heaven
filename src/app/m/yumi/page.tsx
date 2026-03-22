"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
// ── Types ──
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

interface Review {
  id: string;
  tier: string;
  author: string;
  content: string;
  rating: number; // 1-5
  validated: boolean;
  createdAt: string;
  bonusGranted: boolean;
}

interface UploadedContent {
  id: string;
  tier: string;
  type: "photo" | "video" | "reel";
  label: string;
  dataUrl: string; // base64
  uploadedAt: string;
  isNew?: boolean;
  visibility?: "pack" | "promo"; // promo = free, visible without code
  tokenPrice?: number; // token cost to unlock this specific image
}

// ── Tier hierarchy ──
const TIER_ORDER = ["vip", "gold", "diamond", "platinum"];
const TIER_COLORS: Record<string, string> = {
  vip: "#E84393", gold: "#C9A84C", diamond: "#5B8DEF", platinum: "#A882FF",
};
const TIER_SYMBOLS: Record<string, string> = {
  vip: "♡", gold: "★", diamond: "◆", platinum: "♛",
};

function tierLevel(tier: string): number {
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 ? idx : -1;
}

// ── Mock content (fallback when no uploads) ──
interface ContentItem {
  id: string;
  tier: string;
  type: "photo" | "video" | "reel";
  label: string;
  pattern: number;
  isNew?: boolean;
  isPinned?: boolean;
  dataUrl?: string;
  visibility?: "pack" | "promo";
  tokenPrice?: number; // token cost to unlock individually
}

const FALLBACK_CONTENT: ContentItem[] = [
  { id: "v1", tier: "vip", type: "photo", label: "Lingerie set", pattern: 1 },
  { id: "v2", tier: "vip", type: "photo", label: "Pieds glamour", pattern: 2 },
  { id: "v3", tier: "vip", type: "reel", label: "Teasing", pattern: 3, isNew: true },
  { id: "v4", tier: "vip", type: "photo", label: "Accessoires", pattern: 4 },
  { id: "v5", tier: "vip", type: "video", label: "Haul lingerie", pattern: 5 },
  { id: "v6", tier: "vip", type: "photo", label: "Dedicace", pattern: 6 },
  { id: "g1", tier: "gold", type: "photo", label: "Nude complet", pattern: 7, isNew: true },
  { id: "g2", tier: "gold", type: "video", label: "Cosplay", pattern: 8 },
  { id: "g3", tier: "gold", type: "photo", label: "Sextape preview", pattern: 9 },
  { id: "g4", tier: "gold", type: "reel", label: "Behind the scenes", pattern: 10 },
  { id: "g5", tier: "gold", type: "photo", label: "Custom request", pattern: 11 },
  { id: "g6", tier: "gold", type: "photo", label: "Gold exclusive", pattern: 12 },
  { id: "d1", tier: "diamond", type: "video", label: "Face reveal", pattern: 13, isPinned: true },
  { id: "d2", tier: "diamond", type: "photo", label: "Full cosplay", pattern: 14, isNew: true },
  { id: "d3", tier: "diamond", type: "reel", label: "Sextape full", pattern: 15 },
  { id: "d4", tier: "diamond", type: "photo", label: "Diamond special", pattern: 16 },
  { id: "d5", tier: "diamond", type: "video", label: "Hard content", pattern: 17 },
  { id: "d6", tier: "diamond", type: "photo", label: "Visage exclu", pattern: 18 },
  { id: "p1", tier: "platinum", type: "video", label: "Video call prive", pattern: 19, isPinned: true },
  { id: "p2", tier: "platinum", type: "reel", label: "All-access reel", pattern: 20, isNew: true },
  { id: "p3", tier: "platinum", type: "photo", label: "Contenu illimite", pattern: 21 },
];

const BONUS_DISPLAY: { key: keyof PackConfig["bonuses"]; emoji: string; label: string }[] = [
  { key: "fanvueAccess", emoji: "\u{1F517}", label: "Fanvue" },
  { key: "freeNudeExpress", emoji: "\u{1F381}", label: "Nude express" },
  { key: "nudeDedicaceLevres", emoji: "\u{1F48B}", label: "Dedicace" },
  { key: "freeVideoOffer", emoji: "\u{1F3AC}", label: "Video offerte" },
];

// ── Token system types ──
interface TokenPack {
  id: string;
  tokens: number;
  price: number;
  bonus: number; // bonus tokens
  popular?: boolean;
}

interface TokenBalance {
  client: string;
  balance: number;
  totalBought: number;
  totalSpent: number;
}

interface TokenTransaction {
  id: string;
  client: string;
  type: "purchase" | "live_priv" | "custom_request" | "tip";
  amount: number; // + for purchase, - for spend
  description: string;
  createdAt: string;
}

// ── Token economy (1 jeton ≈ 0.50€) ──
// Revenue split: 75% model / 25% platform
// Base: 30min live platinum = 200€ = 400 JT
// Scale: 15min = 200JT plat, 5min = 70JT plat / proportional per tier
const TOKEN_PACKS: TokenPack[] = [
  { id: "tk20", tokens: 20, price: 10, bonus: 0 },           // 0.50€/JT — starter
  { id: "tk50", tokens: 50, price: 22, bonus: 5 },           // 0.44€/JT — 10% savings
  { id: "tk120", tokens: 120, price: 50, bonus: 15, popular: true }, // 0.42€/JT — best value
  { id: "tk300", tokens: 300, price: 110, bonus: 50 },       // 0.37€/JT — whale pack
];

interface TokenService {
  id: string;
  label: string;
  tokens: number;
  icon: string;
  color: string;
  tier?: string;
  active: boolean;
}

// 30min plat = 400 JT (200€), 15min plat = 200 JT (100€), 5min plat = 70 JT (35€)
// Diamond = 80% of plat, Gold = 60% of plat
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

// Model presence (online/offline + status text + avatar)
interface ModelPresence {
  online: boolean;
  status: string; // custom status text
  avatar: string; // base64 data URL or empty
}

const SERVICES_KEY = "heaven_yumi_services";

// Live privé pricing: rate per minute per tier (with minimum = 5min price)
const LIVE_RATES: Record<string, { rate: number; min5: number; color: string; label: string }> = {
  gold:     { rate: 8,     min5: 45,  color: "#C9A84C", label: "Gold" },
  diamond:  { rate: 10.67, min5: 55,  color: "#5B8DEF", label: "Diamond" },
  platinum: { rate: 13.33, min5: 70,  color: "#A882FF", label: "Platinum" },
};
function calcLiveTokens(tier: string, minutes: number): number {
  const r = LIVE_RATES[tier] || LIVE_RATES.gold;
  return Math.max(r.min5, Math.round(minutes * r.rate));
}
const PRESENCE_KEY = "heaven_yumi_presence";
const SCREENSHOT_LOG_KEY = "heaven_yumi_screenshot_log";
const EXCLUSIONS_KEY = "heaven_yumi_exclusions";

// ── Screenshot / Exclusion types ──
interface ScreenshotAttempt {
  id: string;
  client: string;
  tier: string;
  timestamp: string;
  penaltyApplied: string; // description of penalty
}

interface Exclusion {
  id: string;
  client: string;
  code: string;
  reason: string;
  attempts: number;
  createdAt: string;
  status: "pending" | "confirmed" | "pardoned"; // model decides
  definitive: boolean;
}

// ── Storage keys ──
const ADMIN_SESSION_KEY = "heaven_yumi_admin_session";
const CODES_KEY = "heaven_gallery_codes";
const PACKS_KEY = "heaven_yumi_packs";
const ORDERS_KEY = "heaven_agence_orders";
const REVIEWS_KEY = "heaven_yumi_reviews";
const CONTENT_KEY = "heaven_yumi_uploads";
const TOKENS_BALANCE_KEY = "heaven_yumi_token_balances";
const TOKENS_TX_KEY = "heaven_yumi_token_transactions";
const UNLOCKED_KEY = "heaven_yumi_unlocked_images";

// ── Default packs ──
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

// ── Helpers ──
function loadCodes(): AccessCode[] {
  try { return JSON.parse(localStorage.getItem(CODES_KEY) || "[]"); } catch { return []; }
}
function saveCodes(codes: AccessCode[]) {
  localStorage.setItem(CODES_KEY, JSON.stringify(codes));
}

// ── API helpers (shared server-side store for cross-browser codes) ──
async function apiValidateCode(code: string, model: string): Promise<{ code?: AccessCode; error?: string; status?: number }> {
  try {
    const res = await fetch("/api/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate", code, model }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Erreur", status: res.status };
    return { code: data.code };
  } catch { return { error: "Erreur réseau" }; }
}
async function apiCreateCode(code: AccessCode): Promise<boolean> {
  try {
    const res = await fetch("/api/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(code),
    });
    return res.ok;
  } catch { return false; }
}
async function apiUpdateCode(codeStr: string, action: string, extra?: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch("/api/codes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeStr, action, ...extra }),
    });
    return res.ok;
  } catch { return false; }
}
async function apiFetchCodes(model: string): Promise<AccessCode[]> {
  try {
    const res = await fetch(`/api/codes?model=${model}`);
    const data = await res.json();
    return data.codes || [];
  } catch { return []; }
}

// ── Upload API helpers (shared server store for cross-browser photos) ──
async function apiSyncUploads(model: string, uploads: UploadedContent[]): Promise<boolean> {
  try { const r = await fetch("/api/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync", model, uploads }) }); return r.ok; } catch { return false; }
}
async function apiCreateUpload(model: string, upload: UploadedContent): Promise<boolean> {
  try { const r = await fetch("/api/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...upload, model }) }); return r.ok; } catch { return false; }
}
async function apiDeleteUpload(model: string, id: string): Promise<boolean> {
  try { const r = await fetch(`/api/uploads?model=${model}&id=${encodeURIComponent(id)}`, { method: "DELETE" }); return r.ok; } catch { return false; }
}
async function apiFetchUploads(model: string): Promise<UploadedContent[]> {
  try { const r = await fetch(`/api/uploads?model=${model}`); if (!r.ok) return []; const d = await r.json(); return d.uploads || []; } catch { return []; }
}

function loadReviews(): Review[] {
  try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); } catch { return []; }
}
function saveReviews(reviews: Review[]) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}
function loadUploads(): UploadedContent[] {
  try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || "[]"); } catch { return []; }
}
function loadServices(): TokenService[] {
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* use default */ }
  return DEFAULT_TOKEN_SERVICES;
}
function loadPresence(): ModelPresence {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    if (raw) { const p = JSON.parse(raw); return { online: p.online ?? true, status: p.status ?? "Creatrice exclusive", avatar: p.avatar ?? "" }; }
  } catch { /* default */ }
  return { online: true, status: "Creatrice exclusive", avatar: "" };
}

function generateUniqueCode(packId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const prefix = "YU";
  const packSuffix = (packId || "XX").toUpperCase().substring(0, 3);
  const codes = loadCodes();
  let code: string;
  let attempts = 0;
  do {
    let rand = "";
    for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
    code = `${prefix}-${packSuffix}-${rand}`;
    attempts++;
  } while (codes.some(c => c.code === code) && attempts < 100);
  return code;
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
  codeGenerated: string | null;
}

function saveOrder(order: PendingOrder) {
  try {
    const orders: PendingOrder[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch { /* ignore */ }
}

function saveNotification(title: string, subtitle: string, ref: string) {
  try {
    const notifs = JSON.parse(localStorage.getItem("heaven_notifications") || "[]");
    notifs.unshift({
      id: `notif-${Date.now()}`,
      type: "pack_request",
      severity: "important",
      title,
      subtitle,
      ref,
      model: "yumi",
      date: new Date().toISOString(),
      read: false,
      actionRequired: true,
    });
    localStorage.setItem("heaven_notifications", JSON.stringify(notifs));
  } catch { /* ignore */ }
}

function loadPacks(): PackConfig[] {
  try {
    const raw = localStorage.getItem(PACKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* use default */ }
  return DEFAULT_PACKS;
}
function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}
function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expire";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

// ── Token helpers ──
function loadTokenBalance(client: string): TokenBalance {
  try {
    const all: TokenBalance[] = JSON.parse(localStorage.getItem(TOKENS_BALANCE_KEY) || "[]");
    return all.find(b => b.client === client) || { client, balance: 0, totalBought: 0, totalSpent: 0 };
  } catch { return { client, balance: 0, totalBought: 0, totalSpent: 0 }; }
}

function saveTokenBalance(balance: TokenBalance) {
  try {
    const all: TokenBalance[] = JSON.parse(localStorage.getItem(TOKENS_BALANCE_KEY) || "[]");
    const idx = all.findIndex(b => b.client === balance.client);
    if (idx >= 0) all[idx] = balance; else all.push(balance);
    localStorage.setItem(TOKENS_BALANCE_KEY, JSON.stringify(all));
  } catch { /* */ }
}

function addTokenTransaction(tx: TokenTransaction) {
  try {
    const all: TokenTransaction[] = JSON.parse(localStorage.getItem(TOKENS_TX_KEY) || "[]");
    all.unshift(tx);
    localStorage.setItem(TOKENS_TX_KEY, JSON.stringify(all.slice(0, 200)));
  } catch { /* */ }
}

function patternGradient(seed: number, color: string): string {
  const angles = [135, 45, 90, 180, 225, 0, 315, 60, 120, 150, 210, 240, 270, 300, 30, 160, 200, 70, 110, 250, 190];
  const angle = angles[seed % angles.length];
  return `linear-gradient(${angle}deg, ${color}40, ${color}15, ${color}30)`;
}

// ══════════ MAIN COMPONENT ══════════
export default function YumiPublicPage() {
  const [packs, setPacks] = useState<PackConfig[]>(DEFAULT_PACKS);
  const [codeInput, setCodeInput] = useState("");
  const [validatedCode, setValidatedCode] = useState<AccessCode | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"grid" | "packs" | "tokens">("grid");
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [services, setServices] = useState<TokenService[]>(DEFAULT_TOKEN_SERVICES);
  const [presence, setPresence] = useState<ModelPresence>({ online: true, status: "Creatrice exclusive", avatar: "" });

  // Pack detail modal (when tapping locked tier bubble)
  const [packDetailId, setPackDetailId] = useState<string | null>(null);

  // Cart & Checkout state (multi-pack e-shop)
  const [cart, setCart] = useState<string[]>([]); // pack ids in cart
  const [showCart, setShowCart] = useState(false);
  const [checkoutPseudo, setCheckoutPseudo] = useState("");
  const [checkoutPlatform, setCheckoutPlatform] = useState("snapchat");
  const [checkoutStep, setCheckoutStep] = useState<"info" | "confirm" | "done">("info");
  const [checkoutCodes, setCheckoutCodes] = useState<string[]>([]);
  const [codeCopied, setCodeCopied] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<"public" | "private">("public");
  const [chatNick, setChatNick] = useState("");
  const [chatJoined, setChatJoined] = useState(false);
  const [chatPrivUser, setChatPrivUser] = useState<{ client: string; tier: string } | null>(null);
  const [chatPrivCode, setChatPrivCode] = useState("");
  const [chatPrivErr, setChatPrivErr] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatPublicMsgs, setChatPublicMsgs] = useState<{ id: string; sender: string; content: string; ts: string; tier?: string }[]>([]);
  const [chatPrivateMsgs, setChatPrivateMsgs] = useState<{ id: string; sender: string; content: string; ts: string; tier?: string }[]>([]);

  // Review form
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Token state
  const [tokenBalance, setTokenBalance] = useState<TokenBalance>({ client: "", balance: 0, totalBought: 0, totalSpent: 0 });
  const [showTokenBuy, setShowTokenBuy] = useState(false);
  const [tokenBuyPack, setTokenBuyPack] = useState<TokenPack | null>(null);
  const [tokenBuyStep, setTokenBuyStep] = useState<"select" | "confirm" | "done">("select");
  const [showServiceModal, setShowServiceModal] = useState<string | null>(null);
  const [serviceRequested, setServiceRequested] = useState(false);
  // Live privé slider
  const [liveTier, setLiveTier] = useState<"gold" | "diamond" | "platinum">("gold");
  const [liveMinutes, setLiveMinutes] = useState(10);

  // Per-image token unlocks (persisted per client)
  const [unlockedImages, setUnlockedImages] = useState<Set<string>>(new Set());

  // Screenshot protection
  const [screenBlocked, setScreenBlocked] = useState(false);
  const [screenWarning, setScreenWarning] = useState(false);
  const [isExcluded, setIsExcluded] = useState(false);
  const screenBlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin mode (model connected from cockpit)
  const [isAdmin, setIsAdmin] = useState(false);
  const adminUploadRef = useRef<HTMLInputElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    setMounted(true);
    fetch("/api/packs")
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: { packs: PackConfig[] }) => {
        if (Array.isArray(data.packs) && data.packs.length > 0) setPacks(data.packs);
        else setPacks(loadPacks());
      })
      .catch(() => setPacks(loadPacks()));
    // Detect admin session (model visited cockpit)
    try {
      const sess = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || "{}");
      if (sess.active && Date.now() - (sess.ts || 0) < 24 * 3600000) setIsAdmin(true);
    } catch { /* not admin */ }
    setReviews(loadReviews());
    setServices(loadServices());
    setPresence(loadPresence());

    // Load uploads: merge API (cross-browser) + localStorage
    const localUploads = loadUploads();
    setUploads(localUploads);
    apiFetchUploads("yumi").then(apiUploads => {
      if (apiUploads.length === 0 && localUploads.length > 0) {
        apiSyncUploads("yumi", localUploads);
      } else if (apiUploads.length > 0) {
        const apiSet = new Set(apiUploads.map(u => u.id));
        const localOnly = localUploads.filter(u => !apiSet.has(u.id));
        localOnly.forEach(u => apiCreateUpload("yumi", u));
        const merged = [...apiUploads, ...localOnly];
        setUploads(merged);
        try { localStorage.setItem(CONTENT_KEY, JSON.stringify(merged)); } catch { /* */ }
      }
    });

    // Sync when cockpit updates in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONTENT_KEY) setUploads(loadUploads());
      if (e.key === REVIEWS_KEY) setReviews(loadReviews());
      if (e.key === PACKS_KEY) setPacks(loadPacks());
      if (e.key === SERVICES_KEY) setServices(loadServices());
      if (e.key === PRESENCE_KEY) setPresence(loadPresence());
    };
    window.addEventListener("storage", onStorage);
    // Also reload on tab focus (same-origin navigation won't trigger storage event)
    const onFocus = () => { setUploads(loadUploads()); setReviews(loadReviews()); setServices(loadServices()); setPresence(loadPresence()); };
    window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("focus", onFocus); };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!validatedCode) return;
    const iv = setInterval(() => {
      if (isExpired(validatedCode.expiresAt)) {
        setValidatedCode(null);
        setError("Code expire.");
        setShowCodeModal(true);
      }
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [validatedCode]);

  // ── Screenshot protection system ──
  // Detects: visibilitychange (app switch for screenshot), PrintScreen key, blur (iOS screenshot)
  // Penalty: screen goes black, client loses 25% time or 25% token balance, exclusion created
  const handleScreenshotDetected = useCallback(() => {
    if (!validatedCode || isExcluded) return;

    // 1. Blackout screen
    setScreenBlocked(true);
    setScreenWarning(true);
    if (screenBlockTimer.current) clearTimeout(screenBlockTimer.current);
    screenBlockTimer.current = setTimeout(() => setScreenBlocked(false), 5000); // 5s blackout

    // 2. Apply penalty — lose 25% of remaining time
    const allCodes = loadCodes();
    const codeIdx = allCodes.findIndex(c => c.code === validatedCode.code);
    let penaltyDesc = "";
    if (codeIdx >= 0) {
      const c = allCodes[codeIdx];
      const remaining = new Date(c.expiresAt).getTime() - Date.now();
      if (remaining > 0) {
        const penalty = Math.floor(remaining * 0.25);
        allCodes[codeIdx] = { ...c, expiresAt: new Date(Date.now() + remaining - penalty).toISOString() };
        saveCodes(allCodes);
        // Sync penalty to API
        apiUpdateCode(validatedCode.code, "", { updates: { expiresAt: allCodes[codeIdx].expiresAt } });
        const lostH = Math.floor(penalty / 3600000);
        const lostM = Math.floor((penalty % 3600000) / 60000);
        penaltyDesc = `-${lostH}h${lostM}m de temps restant`;
        // Update local state
        setValidatedCode({ ...validatedCode, expiresAt: allCodes[codeIdx].expiresAt });
      }
    }

    // 3. Also penalize 25% of token balance
    if (tokenBalance.balance > 0) {
      const tokenPenalty = Math.max(1, Math.floor(tokenBalance.balance * 0.25));
      const newBal: TokenBalance = {
        ...tokenBalance,
        balance: tokenBalance.balance - tokenPenalty,
        totalSpent: tokenBalance.totalSpent + tokenPenalty,
      };
      setTokenBalance(newBal);
      saveTokenBalance(newBal);
      addTokenTransaction({
        id: `tx-ss-${Date.now()}`,
        client: validatedCode.client,
        type: "tip",
        amount: -tokenPenalty,
        description: `Penalite screenshot: -${tokenPenalty} jetons`,
        createdAt: new Date().toISOString(),
      });
      penaltyDesc += (penaltyDesc ? " + " : "") + `-${tokenPenalty} jetons`;
    }

    // 4. Log the attempt
    const attempt: ScreenshotAttempt = {
      id: `ss-${Date.now()}`,
      client: validatedCode.client,
      tier: validatedCode.tier,
      timestamp: new Date().toISOString(),
      penaltyApplied: penaltyDesc || "Aucun (plus de credit)",
    };
    try {
      const log: ScreenshotAttempt[] = JSON.parse(localStorage.getItem(SCREENSHOT_LOG_KEY) || "[]");
      log.unshift(attempt);
      localStorage.setItem(SCREENSHOT_LOG_KEY, JSON.stringify(log.slice(0, 100)));

      // Count total attempts for this client
      const clientAttempts = log.filter(a => a.client === validatedCode.client).length;

      // 5. Create/update exclusion
      const exclusions: Exclusion[] = JSON.parse(localStorage.getItem(EXCLUSIONS_KEY) || "[]");
      const existing = exclusions.find(e => e.client === validatedCode.client && e.status !== "pardoned");
      if (existing) {
        existing.attempts = clientAttempts;
        existing.reason = `${clientAttempts} tentative(s) de screenshot`;
      } else {
        exclusions.unshift({
          id: `excl-${Date.now()}`,
          client: validatedCode.client,
          code: validatedCode.code,
          reason: `${clientAttempts} tentative(s) de screenshot`,
          attempts: clientAttempts,
          createdAt: new Date().toISOString(),
          status: "pending",
          definitive: false,
        });
      }
      localStorage.setItem(EXCLUSIONS_KEY, JSON.stringify(exclusions));

      // 6. If 3+ attempts, auto-revoke code
      if (clientAttempts >= 3) {
        const updCodes = loadCodes().map(c =>
          c.code === validatedCode.code ? { ...c, revoked: true, active: false } : c
        );
        saveCodes(updCodes);
        // Sync revocation to API
        apiUpdateCode(validatedCode.code, "revoke");
        setIsExcluded(true);
        setValidatedCode(null);
      }
    } catch { /* */ }

    // 7. Notify cockpit
    saveNotification(
      "ALERTE SCREENSHOT",
      `@${validatedCode.client} a tente un screenshot ! Penalite: ${penaltyDesc || "aucune"}`,
      attempt.id,
    );
  }, [validatedCode, isExcluded, tokenBalance]);

  // Check if current user is excluded on code validation
  useEffect(() => {
    if (!validatedCode) { setIsExcluded(false); return; }
    try {
      const exclusions: Exclusion[] = JSON.parse(localStorage.getItem(EXCLUSIONS_KEY) || "[]");
      const excl = exclusions.find(e => e.client === validatedCode.client && e.status === "confirmed" && e.definitive);
      if (excl) {
        setIsExcluded(true);
        setValidatedCode(null);
        setError("Ton compte a ete exclu definitivement.");
        setShowCodeModal(true);
      }
    } catch { /* */ }
  }, [validatedCode]);

  useEffect(() => {
    if (!validatedCode) return;

    // Detect PrintScreen key
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.key === "Snapshot") {
        e.preventDefault();
        handleScreenshotDetected();
      }
      // Detect Cmd+Shift+3/4/5 (macOS), Ctrl+Shift+S, Win+Shift+S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "s", "S"].includes(e.key)) {
        e.preventDefault();
        handleScreenshotDetected();
      }
    };

    // Detect visibility change (app switch — common screenshot method on mobile)
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Immediate blackout on tab hide
        setScreenBlocked(true);
      } else if (document.visibilityState === "visible") {
        // Coming back — check if it was a quick switch (screenshot pattern < 3s)
        // Keep blackout briefly
        if (screenBlockTimer.current) clearTimeout(screenBlockTimer.current);
        screenBlockTimer.current = setTimeout(() => setScreenBlocked(false), 2000);
      }
    };

    // Detect window blur (iOS screenshot triggers blur)
    const onBlur = () => {
      setScreenBlocked(true);
      if (screenBlockTimer.current) clearTimeout(screenBlockTimer.current);
      screenBlockTimer.current = setTimeout(() => setScreenBlocked(false), 3000);
    };

    // Disable right-click on images
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" || target.closest("[data-protected]")) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      if (screenBlockTimer.current) clearTimeout(screenBlockTimer.current);
    };
  }, [validatedCode, handleScreenshotDetected]);

  // Load chat messages
  useEffect(() => {
    try {
      setChatPublicMsgs(JSON.parse(localStorage.getItem("heaven_yumi_chat_public") || "[]"));
      setChatPrivateMsgs(JSON.parse(localStorage.getItem("heaven_yumi_chat_private") || "[]"));
      const nick = sessionStorage.getItem("yumi_pub_chat_nick");
      if (nick) { setChatNick(nick); setChatJoined(true); }
      const pu = sessionStorage.getItem("yumi_priv_chat_user");
      if (pu) setChatPrivUser(JSON.parse(pu));
    } catch { /* */ }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatPublicMsgs, chatPrivateMsgs, chatOpen]);

  // ── Chat handlers ──
  const joinPublicChat = useCallback(() => {
    if (!chatNick.trim()) return;
    setChatJoined(true);
    sessionStorage.setItem("yumi_pub_chat_nick", chatNick.trim());
    try {
      const codes = JSON.parse(localStorage.getItem(CODES_KEY) || "[]");
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let freeCode: string;
      let attempts = 0;
      do {
        let r = "";
        for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
        freeCode = `YU-FREE-${r}`;
        attempts++;
      } while (codes.some((c: AccessCode) => c.code === freeCode) && attempts < 50);
      codes.push({
        code: freeCode, model: "yumi", client: chatNick.trim(), platform: "chat",
        role: "client", tier: "vip", pack: "Free Trial (1h)", type: "gift", duration: 1,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        created: new Date().toISOString(), used: false, active: true,
        revoked: false, isTrial: true, lastUsed: null,
      });
      localStorage.setItem(CODES_KEY, JSON.stringify(codes));
    } catch { /* */ }
    const msg = { id: `sys-${Date.now()}`, sender: "System", content: `${chatNick.trim()} a rejoint ! 1h d'acces gratuit.`, ts: new Date().toISOString() };
    const updated = [...chatPublicMsgs, msg];
    setChatPublicMsgs(updated);
    localStorage.setItem("heaven_yumi_chat_public", JSON.stringify(updated));
  }, [chatNick, chatPublicMsgs]);

  const joinPrivateChat = useCallback(async () => {
    setChatPrivErr("");
    const trimmed = chatPrivCode.trim().toUpperCase();
    if (!trimmed) { setChatPrivErr("Entre ton code."); return; }
    try {
      // Validate via API for cross-browser support
      const result = await apiValidateCode(trimmed, "yumi");
      if (result.error) { setChatPrivErr(result.error); return; }
      const found = result.code;
      if (!found) { setChatPrivErr("Code invalide."); return; }
      if (found.type !== "paid" && found.type !== "promo") { setChatPrivErr("Reserves aux abonnes."); return; }
      const user = { client: found.client, tier: found.tier };
      setChatPrivUser(user);
      sessionStorage.setItem("yumi_priv_chat_user", JSON.stringify(user));
      setChatPrivCode("");
      const msg = { id: `sys-${Date.now()}`, sender: "System", content: `${found.client} a rejoint (${found.pack}).`, ts: new Date().toISOString(), tier: found.tier };
      const updated = [...chatPrivateMsgs, msg];
      setChatPrivateMsgs(updated);
      localStorage.setItem("heaven_yumi_chat_private", JSON.stringify(updated));
    } catch { setChatPrivErr("Erreur."); }
  }, [chatPrivCode, chatPrivateMsgs]);

  const sendChatMsg = useCallback(() => {
    if (!chatInput.trim()) return;
    const isPublic = chatTab === "public";
    const sender = isPublic ? chatNick : (chatPrivUser?.client || "?");
    const msg = { id: `msg-${Date.now()}`, sender, content: chatInput.trim(), ts: new Date().toISOString(), tier: !isPublic ? chatPrivUser?.tier : undefined };
    const key = isPublic ? "heaven_yumi_chat_public" : "heaven_yumi_chat_private";
    if (isPublic) {
      const updated = [...chatPublicMsgs, msg];
      setChatPublicMsgs(updated);
      localStorage.setItem(key, JSON.stringify(updated));
    } else {
      const updated = [...chatPrivateMsgs, msg];
      setChatPrivateMsgs(updated);
      localStorage.setItem(key, JSON.stringify(updated));
    }
    setChatInput("");
  }, [chatInput, chatTab, chatNick, chatPrivUser, chatPublicMsgs, chatPrivateMsgs]);

  // ── Review handler ──
  const submitReview = useCallback(() => {
    if (!validatedCode || !reviewText.trim()) return;
    const review: Review = {
      id: `rev-${Date.now()}`,
      tier: validatedCode.tier,
      author: validatedCode.client,
      content: reviewText.trim(),
      rating: reviewRating,
      validated: false,
      createdAt: new Date().toISOString(),
      bonusGranted: false,
    };
    const updated = [...reviews, review];
    setReviews(updated);
    saveReviews(updated);
    setReviewText("");
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 3000);
    // Notify model
    saveNotification("Nouvel avis YUMI", `@${validatedCode.client} - ${reviewRating}/5 - ${validatedCode.pack}`, review.id);
  }, [validatedCode, reviewText, reviewRating, reviews]);

  // ── Token handlers ──
  // Load token balance + unlocked images when code is validated
  useEffect(() => {
    if (validatedCode) {
      setTokenBalance(loadTokenBalance(validatedCode.client));
      try {
        const all: Record<string, string[]> = JSON.parse(localStorage.getItem(UNLOCKED_KEY) || "{}");
        setUnlockedImages(new Set(all[validatedCode.client] || []));
      } catch { setUnlockedImages(new Set()); }
    } else {
      setUnlockedImages(new Set());
    }
  }, [validatedCode]);

  const handleBuyTokens = useCallback(() => {
    if (!tokenBuyPack) return;
    const totalTokens = tokenBuyPack.tokens + tokenBuyPack.bonus;
    const clientName = validatedCode?.client || checkoutPseudo.trim() || "Visiteur";
    const platform = validatedCode ? "code" : checkoutPlatform;
    const newBalance: TokenBalance = {
      client: clientName,
      balance: tokenBalance.balance + totalTokens,
      totalBought: tokenBalance.totalBought + totalTokens,
      totalSpent: tokenBalance.totalSpent,
    };
    setTokenBalance(newBalance);
    saveTokenBalance(newBalance);
    addTokenTransaction({
      id: `tx-${Date.now()}`,
      client: clientName,
      type: "purchase",
      amount: totalTokens,
      description: `Achat ${tokenBuyPack.tokens} jetons (+${tokenBuyPack.bonus} bonus) — ${tokenBuyPack.price}€ via ${platform}`,
      createdAt: new Date().toISOString(),
    });
    saveNotification(
      "Achat jetons YUMI",
      `@${clientName} (${platform}) — ${totalTokens} jetons (${tokenBuyPack.price}€) — EN ATTENTE PAIEMENT`,
      `TK-${Date.now()}`,
    );
    setTokenBuyStep("done");
  }, [validatedCode, tokenBuyPack, tokenBalance, checkoutPseudo, checkoutPlatform]);

  const handleRequestService = useCallback((serviceId: string) => {
    if (!validatedCode) return;
    let service: TokenService | undefined = services.find(s => s.id === serviceId);
    // Handle dynamic live_custom_<tier>_<minutes> IDs
    if (!service && serviceId.startsWith("live_custom_")) {
      const parts = serviceId.split("_");
      const tier = parts[2];
      const mins = parseInt(parts[3], 10);
      const r = LIVE_RATES[tier];
      if (r && mins) {
        service = { id: serviceId, label: `Live Snap ${r.label} (${mins}min)`, tokens: calcLiveTokens(tier, mins), icon: "cam", color: r.color, tier, active: true };
      }
    }
    if (!service || !service.active) return;
    if (tokenBalance.balance < service.tokens) return;
    const newBalance: TokenBalance = {
      ...tokenBalance,
      balance: tokenBalance.balance - service.tokens,
      totalSpent: tokenBalance.totalSpent + service.tokens,
    };
    setTokenBalance(newBalance);
    saveTokenBalance(newBalance);
    addTokenTransaction({
      id: `tx-${Date.now()}`,
      client: validatedCode.client,
      type: serviceId.startsWith("live") ? "live_priv" : serviceId.startsWith("custom") ? "custom_request" : "tip",
      amount: -service.tokens,
      description: service.label,
      createdAt: new Date().toISOString(),
    });
    saveNotification(
      "Demande service YUMI",
      `@${validatedCode.client} — ${service.label} (${service.tokens} jetons)`,
      `SRV-${Date.now()}`,
    );
    setServiceRequested(true);
    setTimeout(() => { setServiceRequested(false); setShowServiceModal(null); }, 2500);
  }, [validatedCode, tokenBalance, services]);

  // ── Unlock individual image with tokens ──
  const handleUnlockImage = useCallback((itemId: string, cost: number) => {
    if (!validatedCode || tokenBalance.balance < cost) return;
    const newBalance: TokenBalance = {
      ...tokenBalance,
      balance: tokenBalance.balance - cost,
      totalSpent: tokenBalance.totalSpent + cost,
    };
    setTokenBalance(newBalance);
    saveTokenBalance(newBalance);
    addTokenTransaction({
      id: `tx-${Date.now()}`,
      client: validatedCode.client,
      type: "custom_request",
      amount: -cost,
      description: `Image unlock: ${itemId}`,
      createdAt: new Date().toISOString(),
    });
    // Persist unlock
    const newUnlocked = new Set(unlockedImages);
    newUnlocked.add(itemId);
    setUnlockedImages(newUnlocked);
    try {
      const all: Record<string, string[]> = JSON.parse(localStorage.getItem(UNLOCKED_KEY) || "{}");
      all[validatedCode.client] = Array.from(newUnlocked);
      localStorage.setItem(UNLOCKED_KEY, JSON.stringify(all));
    } catch { /* */ }
    saveNotification(
      "Image debloquee YUMI",
      `@${validatedCode.client} — ${cost} jetons`,
      `IMG-${Date.now()}`,
    );
  }, [validatedCode, tokenBalance, unlockedImages]);

  // ── Admin quick upload (from public page) ──
  const handleAdminQuickUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    if (file.size > 2_000_000) { alert("Max 2 Mo"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newUpload: UploadedContent = {
        id: `upl-${Date.now()}`,
        dataUrl,
        label: "",
        tier: "promo",
        type: "photo",
        visibility: "promo",
        uploadedAt: new Date().toISOString(),
      };
      const all = [...uploads, newUpload];
      setUploads(all);
      try { localStorage.setItem(CONTENT_KEY, JSON.stringify(all)); } catch { /* */ }
      apiCreateUpload("yumi", newUpload);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [isAdmin, uploads]);

  // ── Admin avatar change ──
  const handleAdminAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    if (file.size > 500_000) { alert("Max 500 Ko"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const updated = { ...presence, avatar: reader.result as string };
      setPresence(updated);
      try { localStorage.setItem(PRESENCE_KEY, JSON.stringify(updated)); } catch { /* */ }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [isAdmin, presence]);

  // ── Computed ──
  const activePacks = useMemo(() => packs.filter(p => p.active), [packs]);
  const userTierLevel = validatedCode ? tierLevel(validatedCode.tier) : -1;

  const canViewContent = useCallback((item: ContentItem) => {
    // Promo content is always visible
    if (item.tier === "promo" || item.visibility === "promo") return true;
    // Token-unlocked images are always visible
    if (unlockedImages.has(item.id)) return true;
    if (!validatedCode) return false;
    return tierLevel(item.tier) <= userTierLevel;
  }, [validatedCode, userTierLevel, unlockedImages]);

  // Merge uploaded content with fallback content
  const allContent: ContentItem[] = useMemo(() => {
    const fromUploads: ContentItem[] = uploads.map((u, i) => ({
      id: u.id,
      tier: u.tier,
      type: u.type,
      label: u.label,
      pattern: 50 + i,
      isNew: u.isNew,
      dataUrl: u.dataUrl,
      visibility: u.visibility,
      tokenPrice: u.tokenPrice,
    }));
    return [...fromUploads, ...FALLBACK_CONTENT];
  }, [uploads]);

  const displayContent = useMemo(() => {
    if (selectedHighlight) return allContent.filter(c => c.tier === selectedHighlight);
    return allContent;
  }, [selectedHighlight, allContent]);

  // Subscriber count (active paid codes)
  // Recalculates on every render (cheap operation, avoids stale cache)
  let subscriberCount = 0;
  try {
    const allCodes = loadCodes();
    subscriberCount = allCodes.filter(c => c.model === "yumi" && c.active && !c.revoked && !isExpired(c.expiresAt) && (c.type === "paid" || c.type === "promo")).length;
  } catch { /* */ }

  // Validated reviews per tier (for marketing feed)
  const validatedReviews = useMemo(() => {
    return reviews.filter(r => r.validated);
  }, [reviews]);

  const reviewsByTier = useCallback((tierId: string) => {
    return validatedReviews.filter(r => r.tier === tierId);
  }, [validatedReviews]);

  // ── Code validation (via API for cross-browser support) ──
  const handleValidateCode = useCallback(async () => {
    setError("");
    const trimmed = codeInput.trim().toUpperCase().replace(/\s+/g, "");
    if (!trimmed) { setError("Entre un code d'acces."); return; }

    const result = await apiValidateCode(trimmed, "yumi");
    if (result.error) {
      setError(result.error);
      setCodeInput("");
      return;
    }
    if (result.code) {
      // Also save locally for offline features (token balance, penalties etc.)
      const local = loadCodes();
      const exists = local.some(c => c.code.toUpperCase() === result.code!.code.toUpperCase());
      if (!exists) { local.push(result.code); saveCodes(local); }
      setValidatedCode(result.code);
      setCodeInput("");
      setError("");
      setShowCodeModal(false);
      setSelectedContent(null);
    }
  }, [codeInput]);

  // ── Cart helpers ──
  const addToCart = useCallback((packId: string) => {
    setCart(prev => prev.includes(packId) ? prev : [...prev, packId]);
  }, []);
  const removeFromCart = useCallback((packId: string) => {
    setCart(prev => prev.filter(id => id !== packId));
  }, []);
  const cartPacks = useMemo(() => cart.map(id => activePacks.find(p => p.id === id)).filter(Boolean) as PackConfig[], [cart, activePacks]);
  const cartTotal = useMemo(() => cartPacks.reduce((sum, p) => sum + p.price, 0), [cartPacks]);

  // ── Checkout (multi-pack) ──
  const handleCheckoutConfirm = useCallback(() => {
    if (cartPacks.length === 0 || !checkoutPseudo.trim()) return;
    const now = new Date();
    const duration = 72;
    const expiresAt = new Date(now.getTime() + duration * 3600000).toISOString();
    const allCodes = loadCodes();
    const generatedCodes: string[] = [];

    // Generate one code per pack — highest tier gives access to all below
    const highestPack = cartPacks.sort((a, b) => tierLevel(b.id) - tierLevel(a.id))[0];

    const code = generateUniqueCode(highestPack.id);
    const newCode: AccessCode = {
      code, model: "yumi", client: checkoutPseudo.trim(), platform: checkoutPlatform,
      role: "client", tier: highestPack.id, pack: cartPacks.map(p => p.name).join(" + "),
      type: "paid", duration, expiresAt,
      created: now.toISOString(), used: false, active: true,
      revoked: false, isTrial: false, lastUsed: null,
    };
    allCodes.push(newCode);
    generatedCodes.push(code);

    saveCodes(allCodes);
    // Sync to API for cross-browser access
    apiCreateCode(newCode);

    const orderId = `ORD-${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
    saveOrder({
      id: orderId, client: checkoutPseudo.trim(), platform: checkoutPlatform,
      packs: cartPacks.map(p => p.name), tiers: cartPacks.map(p => p.id), total: cartTotal,
      discount: "", status: "pending_payment", createdAt: now.toISOString(), codeGenerated: code,
    });

    saveNotification(
      "Nouvelle commande YUMI",
      `@${checkoutPseudo.trim()} \u2022 ${cartPacks.map(p => p.name).join(" + ")} \u2022 ${cartTotal}\u20AC`,
      orderId,
    );

    setCheckoutCodes(generatedCodes);
    setCheckoutStep("done");
  }, [cartPacks, cartTotal, checkoutPseudo, checkoutPlatform]);

  const openCheckout = useCallback((pack: PackConfig) => {
    addToCart(pack.id);
    setShowCart(true);
    setCheckoutPseudo("");
    setCheckoutPlatform("snapchat");
    setCheckoutStep("info");
    setCheckoutCodes([]);
    setCodeCopied(false);
    setPackDetailId(null);
  }, [addToCart]);

  const tierColor = validatedCode ? (TIER_COLORS[validatedCode.tier] || "#E84393") : "#E84393";
  const totalContent = allContent.length;
  const unlockedCount = validatedCode ? allContent.filter(c => canViewContent(c)).length : 0;

  // Pack detail data
  const detailPack = packDetailId ? activePacks.find(p => p.id === packDetailId) : null;
  const detailReviews = packDetailId ? reviewsByTier(packDetailId) : [];

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#06060B", color: "#F0F0F5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="w-full max-w-lg mx-auto pb-20">

        {/* ══════ HEADER BAR ══════ */}
        {validatedCode && (
          <div className="flex items-center justify-end px-4 py-3 sticky top-0 z-30" style={{ background: "#06060BF0", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[9px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${tierColor}20`, color: tierColor }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: tierColor }} />
                {timeLeft(validatedCode.expiresAt)}
              </div>
              <button
                onClick={() => setValidatedCode(null)}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95"
                style={{ background: "rgba(142,142,163,0.1)", color: "#8E8EA3", border: "1px solid rgba(142,142,163,0.2)" }}
              >
                Deconnexion
              </button>
            </div>
          </div>
        )}

        {/* ══════ ADMIN TOOLBAR — visible only when model is logged in from cockpit ══════ */}
        {isAdmin && (
          <>
            <input ref={adminUploadRef} type="file" accept="image/*" className="hidden" onChange={handleAdminQuickUpload} />
            <input id="adminAvatarInput" type="file" accept="image/*" className="hidden" onChange={handleAdminAvatarChange} />
            <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto" style={{ background: "rgba(232,67,147,0.04)", borderBottom: "1px solid rgba(232,67,147,0.1)", scrollbarWidth: "none" }}>
              <span className="text-[8px] uppercase tracking-widest font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ background: "#E8439320", color: "#E84393" }}>Admin</span>
              <button onClick={() => adminUploadRef.current?.click()}
                className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer transition-all active:scale-95"
                style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.15)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                Photo
              </button>
              <button onClick={() => document.getElementById("adminAvatarInput")?.click()}
                className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer transition-all active:scale-95"
                style={{ background: "rgba(168,130,255,0.08)", color: "#A882FF", border: "1px solid rgba(168,130,255,0.15)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
                Avatar
              </button>
              <button onClick={() => { const p = { ...presence, online: !presence.online }; setPresence(p); try { localStorage.setItem(PRESENCE_KEY, JSON.stringify(p)); } catch { /* */ } }}
                className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer transition-all active:scale-95"
                style={{ background: presence.online ? "rgba(16,185,129,0.08)" : "rgba(90,90,106,0.08)", color: presence.online ? "#10B981" : "#5A5A6A", border: `1px solid ${presence.online ? "rgba(16,185,129,0.15)" : "rgba(90,90,106,0.1)"}` }}>
                <span className={`w-2 h-2 rounded-full ${presence.online ? "animate-pulse" : ""}`} style={{ background: presence.online ? "#10B981" : "#5A5A6A" }} />
                {presence.online ? "En ligne" : "Offline"}
              </button>
              <a href="/agence"
                className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer transition-all active:scale-95 no-underline"
                style={{ background: "rgba(232,67,147,0.08)", color: "#E84393", border: "1px solid rgba(232,67,147,0.15)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
                Cockpit
              </a>
              <button onClick={() => { setIsAdmin(false); localStorage.removeItem(ADMIN_SESSION_KEY); }}
                className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer transition-all active:scale-95"
                style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.1)" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </>
        )}

        {/* ══════ HERO PROFILE — Storefront, not social feed ══════ */}
        <div style={{ animation: "ymFadeIn 0.5s ease-out" }}>
          {/* Banner gradient */}
          <div className="relative overflow-hidden" style={{
            background: validatedCode
              ? `linear-gradient(160deg, ${tierColor}18, #06060B 50%, ${tierColor}08)`
              : "linear-gradient(160deg, #E8439318, #06060B 40%, #C9A84C08, #5B8DEF10)",
            paddingTop: 20, paddingBottom: 16,
          }}>
            {/* Subtle mesh pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: "radial-gradient(circle at 20% 30%, #E84393 1px, transparent 1px), radial-gradient(circle at 80% 70%, #C9A84C 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />

            <div className="relative px-4">
              {/* Top row: Avatar + identity + Snap link */}
              <div className="flex items-center gap-3.5">
                {/* Avatar with status ring */}
                <div className="shrink-0 relative">
                  <div className="w-[72px] h-[72px] rounded-2xl p-[2px]" style={{
                    background: validatedCode
                      ? `linear-gradient(135deg, ${tierColor}, ${tierColor}60)`
                      : "linear-gradient(135deg, #E84393, #C9A84C, #5B8DEF)",
                  }}>
                    {presence.avatar ? (
                      <img src={presence.avatar} alt="YUMI" className="w-full h-full rounded-[14px] object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-[14px] flex items-center justify-center" style={{ background: "#0C0C14" }}>
                        <span className="text-2xl font-black" style={{ color: validatedCode ? tierColor : "#E84393" }}>Y</span>
                      </div>
                    )}
                  </div>
                  {/* Online/Offline indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#0C0C14" }}>
                    <span className={`w-2.5 h-2.5 rounded-full ${presence.online ? "animate-pulse" : ""}`} style={{ background: presence.online ? "#10B981" : "#5A5A6A" }} />
                  </div>
                </div>

                {/* Identity block */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-base font-black tracking-tight" style={{ color: "#F0F0F5" }}>Yumiii</h2>
                    {/* Verified badge */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#5B8DEF">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 12c0 2.326.662 4.498 1.808 6.34L12 21.056l7.192-2.716A11.953 11.953 0 0 0 21 12c0-.718-.063-1.42-.182-2.102a11.94 11.94 0 0 0-.2-.914z" />
                    </svg>
                    {validatedCode && (
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tierColor}20`, color: tierColor }}>
                        {validatedCode.pack}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-snug flex items-center gap-1.5" style={{ color: "#8E8EA3" }}>
                    {presence.online ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                        <span style={{ color: "#10B981" }}>En ligne</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5A5A6A" }} />
                        <span>Hors ligne</span>
                      </span>
                    )}
                    {presence.status && (
                      <span>&bull; {presence.status}</span>
                    )}
                  </p>
                  {validatedCode && (
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: tierColor }}>
                      @{validatedCode.client} &bull; {timeLeft(validatedCode.expiresAt)} restant
                    </p>
                  )}
                </div>

                {/* Snap CTA — primary social link */}
                <a href="https://www.snapchat.com/" target="_blank" rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl no-underline transition-all active:scale-95"
                  style={{ background: "rgba(255,252,0,0.1)", border: "1px solid rgba(255,252,0,0.2)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFC00">
                    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12.922-.236.195-.09.39-.12.585-.12.255 0 .51.075.704.195.165.105.3.254.375.449.075.21.075.42.015.614-.105.315-.375.51-.614.66-.12.075-.24.135-.33.18l-.046.023c-.19.09-.39.18-.555.285-.24.15-.39.36-.39.645 0 .075.015.15.045.225.24.57.54 1.125.9 1.605.525.72 1.214 1.305 2.049 1.74.285.15.585.255.855.33.166.045.33.105.465.18.24.135.345.33.345.57 0 .315-.255.585-.51.705-.405.195-.855.255-1.305.33-.165.03-.345.06-.495.105-.135.045-.24.12-.36.24-.09.09-.15.21-.24.345-.15.225-.345.48-.765.48h-.015c-.21 0-.42-.045-.63-.09-.3-.06-.63-.135-.99-.135-.105 0-.21.015-.315.03-.51.06-.93.39-1.41.72-.66.45-1.35.93-2.64.93h-.06c-1.29 0-1.98-.48-2.64-.93-.48-.33-.9-.66-1.41-.72-.105-.015-.21-.03-.315-.03-.36 0-.69.075-.99.135-.21.045-.42.09-.63.09h-.015c-.42 0-.615-.255-.765-.48-.09-.135-.15-.255-.24-.345-.12-.12-.225-.195-.36-.24-.15-.045-.33-.075-.495-.105-.45-.075-.9-.135-1.305-.33-.255-.12-.51-.39-.51-.705 0-.24.105-.435.345-.57.135-.075.3-.135.465-.18.27-.075.57-.18.855-.33.835-.435 1.524-1.02 2.049-1.74.36-.48.66-1.035.9-1.605.03-.075.045-.15.045-.225 0-.285-.15-.495-.39-.645-.165-.105-.36-.195-.555-.285l-.046-.023c-.09-.045-.21-.105-.33-.18-.24-.15-.51-.345-.614-.66-.06-.195-.06-.405.015-.614.075-.195.21-.345.375-.449.195-.12.45-.195.704-.195.195 0 .39.03.585.12.264.12.624.225.922.236.195 0 .33-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.105-1.628-.231-3.654.299-4.847C7.85 1.069 11.216.793 12.206.793z" />
                  </svg>
                  <span className="text-[10px] font-bold" style={{ color: "#FFFC00" }}>Snap</span>
                </a>
              </div>

              {/* ── Concept chips — what makes this platform unique ── */}
              <div className="flex gap-1.5 mt-3.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                {[
                  { label: "Contenu exclusif", icon: "lock", color: "#E84393" },
                  { label: "Lives prives Snap", icon: "cam", color: "#FFFC00" },
                  { label: "Jetons & services", icon: "coin", color: "#C9A84C" },
                  { label: "Sans camming", icon: "shield", color: "#10B981" },
                ].map(chip => (
                  <div key={chip.label} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0"
                    style={{ background: `${chip.color}08`, border: `1px solid ${chip.color}12` }}>
                    {chip.icon === "lock" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={chip.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                    {chip.icon === "cam" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={chip.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    )}
                    {chip.icon === "coin" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={chip.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><path d="M12 6v12" />
                      </svg>
                    )}
                    {chip.icon === "shield" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={chip.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    )}
                    <span className="text-[9px] font-semibold" style={{ color: chip.color }}>{chip.label}</span>
                  </div>
                ))}
              </div>

              {/* ── Stats strip — unique layout, not Instagram triple ── */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(232,67,147,0.06)" }}>
                  <span className="text-xs font-black" style={{ color: "#E84393" }}>{totalContent}</span>
                  <span className="text-[9px]" style={{ color: "#8E8EA390" }}>contenus</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(91,141,239,0.06)" }}>
                  <span className="text-xs font-black" style={{ color: "#5B8DEF" }}>{subscriberCount || "?"}</span>
                  <span className="text-[9px]" style={{ color: "#5B8DEF90" }}>abonnes</span>
                </div>
                {validatedCode && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(201,168,76,0.06)" }}>
                    <span className="text-xs font-black" style={{ color: "#C9A84C" }}>{tokenBalance.balance}</span>
                    <span className="text-[9px]" style={{ color: "#C9A84C90" }}>jetons</span>
                  </div>
                )}
                {validatedCode && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: `${tierColor}08` }}>
                    <span className="text-xs font-black" style={{ color: tierColor }}>{unlockedCount}</span>
                    <span className="text-[9px]" style={{ color: `${tierColor}90` }}>debloques</span>
                  </div>
                )}
              </div>

              {/* ── Action bar ── */}
              <div className="flex gap-2 mt-3">
                {!validatedCode ? (
                  <button
                    onClick={() => setShowCodeModal(true)}
                    className="flex-1 text-xs font-bold py-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)", color: "#fff" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Acceder au contenu exclusif
                  </button>
                ) : (
                  <button
                    onClick={() => setChatOpen(true)}
                    className="flex-1 text-xs font-bold py-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${tierColor}, ${tierColor}CC)`, color: "#fff" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Chat avec YUMI
                  </button>
                )}
                {!validatedCode && (
                  <button onClick={() => setChatOpen(true)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
                    style={{ background: "rgba(91,141,239,0.08)", border: "1px solid rgba(91,141,239,0.2)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B8DEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                )}
                <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 no-underline"
                  style={{ background: "rgba(225,48,108,0.08)", border: "1px solid rgba(225,48,108,0.2)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Separator line */}
          <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(232,67,147,0.15), rgba(201,168,76,0.15), transparent)" }} />
        </div>

        {/* ══════ STORY HIGHLIGHTS (Pack Tiers) — prices shown when locked ══════ */}
        <div className="px-4 pb-3 overflow-x-auto flex gap-4" style={{ scrollbarWidth: "none" }}>
          {/* "All" highlight */}
          <button onClick={() => setSelectedHighlight(null)} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer bg-transparent border-none p-0">
            <div className="w-16 h-16 rounded-full p-[2px]" style={{ background: !selectedHighlight ? "linear-gradient(135deg, #E84393, #C9A84C, #5B8DEF, #A882FF)" : "rgba(142,142,163,0.2)" }}>
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "#0C0C14" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={!selectedHighlight ? "#F0F0F5" : "#8E8EA3"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
            </div>
            <span className="text-[10px]" style={{ color: !selectedHighlight ? "#F0F0F5" : "#8E8EA3" }}>Tout</span>
          </button>

          {activePacks.map(pack => {
            const isSelected = selectedHighlight === pack.id;
            const isUnlocked = validatedCode && tierLevel(pack.id) <= userTierLevel;
            const contentCount = allContent.filter(c => c.tier === pack.id).length;
            const tierReviews = reviewsByTier(pack.id);

            return (
              <button key={pack.id}
                onClick={() => {
                  if (isUnlocked) {
                    setSelectedHighlight(isSelected ? null : pack.id);
                  } else {
                    // Open pack detail modal
                    setPackDetailId(pack.id);
                  }
                }}
                className="flex flex-col items-center gap-1 shrink-0 cursor-pointer bg-transparent border-none p-0 relative">
                <div className="w-16 h-16 rounded-full p-[2px]" style={{ background: isSelected ? pack.color : isUnlocked ? `${pack.color}80` : `${pack.color}40` }}>
                  <div className="w-full h-full rounded-full flex flex-col items-center justify-center relative" style={{ background: "#0C0C14" }}>
                    {/* Always show tier symbol — price only in detail modal */}
                    <span className={`font-black ${isUnlocked ? "text-lg" : "text-base"}`} style={{ color: pack.color, opacity: isUnlocked ? 1 : 0.7 }}>
                      {TIER_SYMBOLS[pack.id] || pack.name.charAt(0)}
                    </span>
                    {!isUnlocked && (
                      <span className="text-[7px] font-semibold mt-0.5" style={{ color: `${pack.color}60` }}>
                        Voir
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-medium" style={{ color: isSelected ? pack.color : isUnlocked ? "#F0F0F5" : pack.color }}>
                  {pack.name.split(" ")[0]}
                </span>
                <span className="text-[8px]" style={{ color: "#5A5A6A" }}>
                  {contentCount} {tierReviews.length > 0 ? `\u2022 ${tierReviews.length} avis` : ""}
                </span>
                {pack.badge && (
                  <span className="absolute -top-0.5 -right-0.5 text-[7px] font-bold px-1 py-0.5 rounded-full" style={{ background: pack.color, color: "#06060B" }}>
                    {pack.badge === "Populaire" ? "HOT" : pack.badge === "Ultimate" ? "MAX" : pack.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══════ TAB BAR ══════ */}
        <div className="flex border-b" style={{ borderColor: "rgba(142,142,163,0.12)" }}>
          <button onClick={() => setActiveTab("grid")}
            className="flex-1 py-2.5 flex items-center justify-center cursor-pointer bg-transparent border-none transition-all"
            style={{ borderBottom: activeTab === "grid" ? "2px solid #F0F0F5" : "2px solid transparent" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTab === "grid" ? "#F0F0F5" : "#5A5A6A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
          <button onClick={() => setActiveTab("packs")}
            className="flex-1 py-2.5 flex items-center justify-center cursor-pointer bg-transparent border-none transition-all"
            style={{ borderBottom: activeTab === "packs" ? "2px solid #F0F0F5" : "2px solid transparent" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTab === "packs" ? "#F0F0F5" : "#5A5A6A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </button>
          <button onClick={() => setActiveTab("tokens")}
            className="flex-1 py-2.5 flex items-center justify-center cursor-pointer bg-transparent border-none transition-all"
            style={{ borderBottom: activeTab === "tokens" ? "2px solid #C9A84C" : "2px solid transparent" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTab === "tokens" ? "#C9A84C" : "#5A5A6A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" />
            </svg>
          </button>
        </div>

        {/* ══════ CONTENT GRID — Marketplace ══════ */}
        {activeTab === "grid" && (
          <div data-protected className="grid grid-cols-3 gap-[2px]" style={{ animation: "ymFadeIn 0.3s ease-out" }}>
            {/* Admin quick-add card */}
            {isAdmin && (
              <button
                onClick={() => adminUploadRef.current?.click()}
                className="relative aspect-square cursor-pointer border-none p-0 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                style={{ background: "rgba(232,67,147,0.04)", border: "2px dashed rgba(232,67,147,0.25)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(232,67,147,0.1)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E84393" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </div>
                <span className="text-[9px] font-semibold" style={{ color: "#E84393" }}>Ajouter</span>
              </button>
            )}
            {displayContent.map(item => {
              const unlocked = canViewContent(item);
              const color = TIER_COLORS[item.tier] || "#8E8EA3";
              const pack = packs.find(p => p.id === item.tier);
              const hasTokenPrice = item.tokenPrice != null && item.tokenPrice > 0;
              const canAfford = validatedCode && hasTokenPrice && tokenBalance.balance >= (item.tokenPrice || 0);
              const isTokenUnlocked = unlockedImages.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (unlocked) setSelectedContent(item);
                    else if (hasTokenPrice && validatedCode && canAfford) {
                      // Quick unlock with tokens
                      handleUnlockImage(item.id, item.tokenPrice!);
                    } else if (hasTokenPrice && validatedCode && !canAfford) {
                      // Not enough tokens — go to token tab
                      setActiveTab("tokens");
                    } else {
                      setPackDetailId(item.tier);
                    }
                  }}
                  className="relative aspect-square cursor-pointer border-none p-0 overflow-hidden group"
                  style={{
                    background: item.dataUrl ? undefined : patternGradient(item.pattern, color),
                  }}
                >
                  {/* Uploaded image or pattern */}
                  {item.dataUrl ? (
                    <img src={item.dataUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0" style={{
                      background: `
                        repeating-linear-gradient(${45 + item.pattern * 15}deg, transparent, transparent 8px, ${color}08 8px, ${color}08 16px),
                        radial-gradient(circle at ${30 + (item.pattern % 5) * 15}% ${20 + (item.pattern % 4) * 20}%, ${color}25, transparent 60%)
                      `,
                    }} />
                  )}

                  {/* Lock overlay — marketplace style with token price */}
                  {!unlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10"
                      style={{ background: "rgba(6,6,11,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                      {hasTokenPrice && validatedCode ? (
                        <>
                          {/* Token unlock price */}
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full mb-1"
                            style={{ background: canAfford ? "rgba(201,168,76,0.2)" : "rgba(142,142,163,0.15)" }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={canAfford ? "#C9A84C" : "#5A5A6A"} strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8M8 14h8" />
                            </svg>
                            <span className="text-[10px] font-bold" style={{ color: canAfford ? "#C9A84C" : "#5A5A6A" }}>
                              {item.tokenPrice}
                            </span>
                          </div>
                          <span className="text-[7px] font-medium" style={{ color: canAfford ? "#C9A84C80" : "#5A5A6A" }}>
                            {canAfford ? "Tap pour debloquer" : "Jetons insuff."}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-base font-black" style={{ color }}>
                            {TIER_SYMBOLS[item.tier] || "?"}
                          </span>
                          <span className="text-[7px] font-semibold mt-0.5 uppercase tracking-wider" style={{ color: `${color}80` }}>
                            {pack?.name.split(" ")[0] || item.tier}
                          </span>
                          {hasTokenPrice && (
                            <span className="text-[7px] mt-0.5" style={{ color: "#C9A84C80" }}>
                              {item.tokenPrice} JT
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Content label on hover (unlocked) */}
                  {unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      style={{ background: "rgba(6,6,11,0.4)" }}>
                      <span className="text-[10px] font-medium" style={{ color: "#F0F0F5" }}>{item.label}</span>
                    </div>
                  )}

                  {/* Type badge */}
                  {item.type !== "photo" && (
                    <div className="absolute top-1.5 right-1.5 z-10">
                      {item.type === "video" ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#F0F0F5" style={{ opacity: unlocked ? 0.8 : 0.3 }}>
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0F0F5" strokeWidth="2" style={{ opacity: unlocked ? 0.8 : 0.3 }}>
                          <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Badges: GRATUIT / NEW / Token-unlocked */}
                  {(item.tier === "promo" || item.visibility === "promo") ? (
                    <div className="absolute top-1.5 left-1.5 text-[7px] font-bold uppercase px-1.5 py-0.5 rounded z-10"
                      style={{ background: "#10B981", color: "#fff" }}>
                      GRATUIT
                    </div>
                  ) : isTokenUnlocked ? (
                    <div className="absolute top-1.5 left-1.5 text-[7px] font-bold uppercase px-1.5 py-0.5 rounded z-10"
                      style={{ background: "#C9A84C", color: "#06060B" }}>
                      DEBLOQUE
                    </div>
                  ) : item.isNew ? (
                    <div className="absolute top-1.5 left-1.5 text-[7px] font-bold uppercase px-1.5 py-0.5 rounded z-10"
                      style={{ background: color, color: "#06060B" }}>
                      NEW
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {/* ══════ PACKS TAB ══════ */}
        {activeTab === "packs" && (
          <div className="px-4 py-4 space-y-3" style={{ animation: "ymFadeIn 0.3s ease-out" }}>
            {activePacks.map((pack, index) => {
              const isUnlocked = validatedCode && tierLevel(pack.id) <= userTierLevel;
              const activeBonuses = BONUS_DISPLAY.filter(b => pack.bonuses[b.key]);
              const tierReviews = reviewsByTier(pack.id);
              return (
                <div key={pack.id} className="rounded-2xl overflow-hidden relative"
                  style={{
                    background: "rgba(12, 12, 20, 0.8)",
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    border: `1px solid ${isUnlocked ? pack.color + "40" : pack.color + "15"}`,
                    animation: `ymFadeIn 0.4s ease-out ${index * 0.08}s both`,
                  }}>
                  <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${pack.color}, transparent)` }} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" style={{ color: pack.color }}>{TIER_SYMBOLS[pack.id]}</span>
                        <h3 className="text-sm font-bold" style={{ color: "#F0F0F5" }}>{pack.name}</h3>
                        {pack.badge && (
                          <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${pack.color}20`, color: pack.color }}>
                            {pack.badge}
                          </span>
                        )}
                        {isUnlocked && (
                          <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>
                            ACTIF
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xl font-black" style={{ color: pack.color }}>{pack.price}&euro;</span>
                        <span className="text-[10px]" style={{ color: "#8E8EA3" }}>/mois</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                        background: pack.face ? "rgba(91,141,239,0.1)" : "rgba(142,142,163,0.1)",
                        color: pack.face ? "#5B8DEF" : "#8E8EA3",
                        border: `1px solid ${pack.face ? "rgba(91,141,239,0.2)" : "rgba(142,142,163,0.15)"}`,
                      }}>
                        {pack.face ? "Avec visage" : "Sans visage"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(142,142,163,0.06)", color: "#5A5A6A" }}>
                        {allContent.filter(c => c.tier === pack.id).length} contenus
                      </span>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {pack.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={pack.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="text-[11px] leading-relaxed" style={{ color: "#C0C0D0" }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    {activeBonuses.length > 0 && (
                      <div className="pt-2.5 flex flex-wrap gap-1.5 mb-3" style={{ borderTop: "1px solid rgba(142,142,163,0.08)" }}>
                        {activeBonuses.map(b => (
                          <span key={b.key} className="text-[9px] px-2 py-1 rounded-lg"
                            style={{ background: `${pack.color}08`, border: `1px solid ${pack.color}15`, color: "#C0C0D0" }}>
                            {b.emoji} {b.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Reviews marketing feed */}
                    {tierReviews.length > 0 && !isUnlocked && (
                      <div className="mb-3 p-3 rounded-xl" style={{ background: `${pack.color}06`, border: `1px solid ${pack.color}10` }}>
                        <p className="text-[9px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1" style={{ color: pack.color }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill={pack.color}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          Avis des abonnes ({tierReviews.length})
                        </p>
                        {tierReviews.slice(0, 3).map(r => (
                          <div key={r.id} className="mb-1.5 last:mb-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-semibold" style={{ color: "#F0F0F5" }}>@{r.author}</span>
                              <span className="text-[8px]" style={{ color: pack.color }}>
                                {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                              </span>
                            </div>
                            <p className="text-[10px] leading-relaxed" style={{ color: "#8E8EA3" }}>{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add to cart / Active button */}
                    {!isUnlocked && (
                      <button onClick={() => { addToCart(pack.id); }}
                        className="w-full text-xs font-semibold py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.98] hover:opacity-90 flex items-center justify-center gap-2"
                        style={{
                          background: cart.includes(pack.id) ? "rgba(16,185,129,0.1)" : `linear-gradient(135deg, ${pack.color}, ${pack.color}CC)`,
                          color: cart.includes(pack.id) ? "#10B981" : "#fff",
                          border: cart.includes(pack.id) ? "1px solid rgba(16,185,129,0.3)" : "none",
                        }}>
                        {cart.includes(pack.id) ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Dans le panier
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                            Ajouter au panier — {pack.price}&euro;
                          </>
                        )}
                      </button>
                    )}
                    {isUnlocked && (
                      <div className="w-full text-xs font-semibold py-2.5 rounded-xl text-center"
                        style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                        Acces actif
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════ TOKENS TAB — Live prive & services ══════ */}
        {activeTab === "tokens" && (
          <div className="px-4 py-4 space-y-4" style={{ animation: "ymFadeIn 0.3s ease-out" }}>

            {/* Token balance (when logged in) */}
            {validatedCode && (
              <div className="rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.03))", border: "1px solid rgba(201,168,76,0.2)" }}>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#C9A84C" }}>Tes jetons</p>
                <p className="text-3xl font-black" style={{ color: "#C9A84C" }}>
                  {tokenBalance.balance}
                  <span className="text-sm ml-1 font-normal">jetons</span>
                </p>
                <button onClick={() => { setShowTokenBuy(true); setTokenBuyPack(null); setTokenBuyStep("select"); }}
                  className="mt-3 text-xs font-semibold px-5 py-2 rounded-xl cursor-pointer transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #E8B94C)", color: "#06060B" }}>
                  Acheter des jetons
                </button>
              </div>
            )}

            {/* Token intro for non-logged visitors */}
            {!validatedCode && (
              <div className="rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))", border: "1px solid rgba(201,168,76,0.15)" }}>
                <p className="text-base font-bold mb-1" style={{ color: "#F0F0F5" }}>Jetons YUMI</p>
                <p className="text-[11px] mb-1 leading-relaxed" style={{ color: "#8E8EA3" }}>
                  Achete des jetons pour debloquer des lives prives sur Snap, des photos custom, et plus encore.
                </p>
              </div>
            )}

            {/* ── Live Privé Snap — slider ── */}
            {(() => {
              const r = LIVE_RATES[liveTier];
              const liveTokens = calcLiveTokens(liveTier, liveMinutes);
              const liveEuros = (liveTokens * 0.5).toFixed(0);
              const canAffordLive = validatedCode && tokenBalance.balance >= liveTokens;
              return (
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(12,12,20,0.8)", border: `1px solid ${r.color}20` }}>
                  <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFC00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    <p className="text-xs font-bold" style={{ color: "#F0F0F5" }}>Live Prive Snap</p>
                  </div>

                  {/* Tier selector */}
                  <div className="flex gap-1.5 px-4 mb-3">
                    {(["gold", "diamond", "platinum"] as const).map(t => (
                      <button key={t} onClick={() => setLiveTier(t)}
                        className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg cursor-pointer transition-all"
                        style={{
                          background: liveTier === t ? `${LIVE_RATES[t].color}18` : "rgba(6,6,11,0.5)",
                          border: `1px solid ${liveTier === t ? `${LIVE_RATES[t].color}40` : "rgba(142,142,163,0.08)"}`,
                          color: liveTier === t ? LIVE_RATES[t].color : "#5A5A6A",
                        }}>
                        {LIVE_RATES[t].label}
                      </button>
                    ))}
                  </div>

                  {/* Duration slider */}
                  <div className="px-4 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px]" style={{ color: "#8E8EA3" }}>Duree</p>
                      <p className="text-sm font-black" style={{ color: r.color }}>{liveMinutes} min</p>
                    </div>
                    <input type="range" min={5} max={30} step={1} value={liveMinutes}
                      onChange={e => setLiveMinutes(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${r.color} ${((liveMinutes - 5) / 25) * 100}%, rgba(142,142,163,0.15) ${((liveMinutes - 5) / 25) * 100}%)`,
                        accentColor: r.color,
                      }} />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[8px]" style={{ color: "#5A5A6A" }}>5 min</span>
                      <span className="text-[8px]" style={{ color: "#5A5A6A" }}>30 min</span>
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="px-4 pb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xl font-black" style={{ color: "#C9A84C" }}>{liveTokens} <span className="text-[10px] font-normal">jetons</span></p>
                      <p className="text-[9px]" style={{ color: "#5A5A6A" }}>&asymp;{liveEuros}&euro;</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowServiceModal(`live_custom_${liveTier}_${liveMinutes}`);
                        setServiceRequested(false);
                      }}
                      className="text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.97]"
                      style={{
                        background: canAffordLive
                          ? `linear-gradient(135deg, ${r.color}, ${r.color}CC)`
                          : `${r.color}15`,
                        color: canAffordLive ? "#fff" : r.color,
                        border: `1px solid ${r.color}30`,
                      }}>
                      Demander
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Contenu custom services ── */}
            <div>
              <p className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: "#F0F0F5" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                </svg>
                Contenu custom
              </p>
              <div className="space-y-1.5 mb-3">
                {services.filter(s => s.icon !== "cam" && s.active).map(service => {
                  const canAffordSvc = validatedCode && tokenBalance.balance >= service.tokens;
                  const euroEquiv = (service.tokens * 0.5).toFixed(0);
                  return (
                    <button key={service.id}
                      onClick={() => { setShowServiceModal(service.id); setServiceRequested(false); }}
                      className="w-full text-left rounded-xl p-3 cursor-pointer transition-all active:scale-[0.98]"
                      style={{ background: "rgba(12,12,20,0.8)", border: `1px solid ${service.color}15` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${service.color}15` }}>
                            {service.icon === "photo" && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={service.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                              </svg>
                            )}
                            {service.icon === "video" && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill={service.color}><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            )}
                            {service.icon === "chat" && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={service.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-medium" style={{ color: "#F0F0F5" }}>{service.label}</p>
                            <p className="text-[8px]" style={{ color: "#5A5A6A" }}>&asymp;{euroEquiv}&euro;</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black" style={{ color: canAffordSvc ? "#C9A84C" : "#5A5A6A" }}>{service.tokens}</p>
                          <p className="text-[8px]" style={{ color: "#5A5A6A" }}>jetons</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Token packs display */}
            <div>
              <p className="text-xs font-bold mb-3" style={{ color: "#F0F0F5" }}>Packs de jetons</p>
              <div className="grid grid-cols-2 gap-2">
                {TOKEN_PACKS.map(tp => (
                  <button key={tp.id}
                    onClick={() => {
                      setTokenBuyPack(tp);
                      setTokenBuyStep("confirm");
                      setShowTokenBuy(true);
                    }}
                    className="rounded-xl p-3 text-center cursor-pointer transition-all active:scale-[0.97] relative"
                    style={{
                      background: tp.popular ? "rgba(201,168,76,0.08)" : "rgba(12,12,20,0.8)",
                      border: `1px solid ${tp.popular ? "rgba(201,168,76,0.3)" : "rgba(142,142,163,0.1)"}`,
                    }}>
                    {tp.popular && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{ background: "#C9A84C", color: "#06060B" }}>Populaire</span>
                    )}
                    <p className="text-lg font-black" style={{ color: "#C9A84C" }}>{tp.tokens}</p>
                    <p className="text-[8px] uppercase tracking-wider" style={{ color: "#8E8EA3" }}>jetons</p>
                    {tp.bonus > 0 && (
                      <p className="text-[9px] font-semibold mt-0.5" style={{ color: "#10B981" }}>+{tp.bonus} bonus</p>
                    )}
                    <p className="text-sm font-bold mt-1.5" style={{ color: "#F0F0F5" }}>{tp.price}&euro;</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Devenir modele teaser */}
            <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(168,130,255,0.08), rgba(232,67,147,0.05))", border: "1px solid rgba(168,130,255,0.15)" }}>
              <p className="text-xs font-bold mb-1 flex items-center gap-2" style={{ color: "#A882FF" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A882FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Devenir modele
              </p>
              <p className="text-[10px] leading-relaxed mb-2" style={{ color: "#8E8EA3" }}>
                Gagne de l&apos;argent en creant du contenu exclusif. Nos modeles gagnent entre 500&euro; et 3000&euro;/mois.
              </p>
              <p className="text-[9px] font-medium" style={{ color: "#A882FF" }}>
                Bientot disponible — contacte-nous via Snap ou Instagram
              </p>
            </div>
          </div>
        )}

        {/* ══════ REVIEW FORM (visible when unlocked) ══════ */}
        {validatedCode && activeTab === "packs" && (
          <div className="px-4 pb-4">
            <div className="rounded-2xl p-4" style={{ background: "rgba(12,12,20,0.8)", border: `1px solid ${tierColor}20` }}>
              <p className="text-xs font-bold mb-2" style={{ color: "#F0F0F5" }}>Laisser un avis</p>
              <p className="text-[10px] mb-3" style={{ color: "#8E8EA3" }}>
                Chaque avis valide par la modele te donne +1H de temps bonus !
              </p>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)} className="cursor-pointer bg-transparent border-none p-0.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={s <= reviewRating ? tierColor : "transparent"} stroke={tierColor} strokeWidth="1.5">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Ton avis sur ce pack..."
                rows={2}
                className="w-full text-[11px] rounded-xl px-3 py-2.5 outline-none resize-none mb-2"
                style={{ background: "rgba(6,6,11,0.6)", border: "1px solid rgba(142,142,163,0.15)", color: "#F0F0F5" }}
              />
              <button
                onClick={submitReview}
                disabled={!reviewText.trim() || reviewSubmitted}
                className="text-[11px] font-semibold px-5 py-2 rounded-xl cursor-pointer disabled:opacity-40"
                style={{ background: reviewSubmitted ? "rgba(16,185,129,0.15)" : `${tierColor}20`, color: reviewSubmitted ? "#10B981" : tierColor }}
              >
                {reviewSubmitted ? "Avis envoye ! En attente de validation" : "Envoyer l'avis"}
              </button>
            </div>
          </div>
        )}

        {/* ══════ FOOTER ══════ */}
        <p className="text-center py-6 text-[9px]" style={{ color: "#2A2A3A" }}>Heaven Studio</p>

        {/* ══════ FLOATING CART BADGE ══════ */}
        {cart.length > 0 && !showCart && (
          <button onClick={() => { setShowCart(true); setCheckoutStep("info"); setCheckoutCodes([]); setCodeCopied(false); }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)", color: "#fff", animation: "ymFadeIn 0.3s ease-out" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="text-xs font-bold">{cart.length} pack{cart.length > 1 ? "s" : ""}</span>
            <span className="text-xs font-black">{cartTotal}&euro;</span>
          </button>
        )}
      </div>

      {/* ══════ PACK DETAIL MODAL (tapping locked tier bubble) ══════ */}
      {detailPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" style={{ background: "rgba(6,6,11,0.9)" }}
          onClick={e => { if (e.target === e.currentTarget) setPackDetailId(null); }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden my-auto" style={{
            background: "#0C0C14",
            border: `1px solid ${detailPack.color}25`,
            animation: "ymFadeIn 0.3s ease-out",
            maxHeight: "85dvh",
          }}>
            {/* Top accent */}
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${detailPack.color}, transparent)` }} />

            <div className="p-5 pb-8 overflow-y-auto" style={{ maxHeight: "calc(85dvh - 10px)" }}>
              {/* Pack header */}
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${detailPack.color}15`, border: `2px solid ${detailPack.color}40` }}>
                  <span className="text-2xl" style={{ color: detailPack.color }}>{TIER_SYMBOLS[detailPack.id]}</span>
                </div>
                <h2 className="text-lg font-bold" style={{ color: "#F0F0F5" }}>{detailPack.name}</h2>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="text-3xl font-black" style={{ color: detailPack.color }}>{detailPack.price}&euro;</span>
                  <span className="text-xs" style={{ color: "#8E8EA3" }}>/mois</span>
                </div>
                {detailPack.badge && (
                  <span className="inline-block mt-2 text-[9px] font-bold uppercase px-3 py-1 rounded-full" style={{ background: `${detailPack.color}20`, color: detailPack.color }}>
                    {detailPack.badge}
                  </span>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2 mb-4">
                {detailPack.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg" style={{ background: `${detailPack.color}06` }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={detailPack.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-xs" style={{ color: "#C0C0D0" }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* Face info */}
              <div className="flex items-center gap-2 mb-4 px-2">
                <span className="text-[10px] px-2.5 py-1 rounded-full" style={{
                  background: detailPack.face ? "rgba(91,141,239,0.1)" : "rgba(142,142,163,0.1)",
                  color: detailPack.face ? "#5B8DEF" : "#8E8EA3",
                  border: `1px solid ${detailPack.face ? "rgba(91,141,239,0.2)" : "rgba(142,142,163,0.15)"}`,
                }}>
                  {detailPack.face ? "Contenu avec visage" : "Sans visage"}
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: "rgba(142,142,163,0.06)", color: "#5A5A6A" }}>
                  {allContent.filter(c => c.tier === detailPack.id).length} contenus exclusifs
                </span>
              </div>

              {/* Reviews marketing feed */}
              {detailReviews.length > 0 && (
                <div className="mb-5 p-3 rounded-xl" style={{ background: `${detailPack.color}08`, border: `1px solid ${detailPack.color}15` }}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-1" style={{ color: detailPack.color }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={detailPack.color}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    Avis verifies ({detailReviews.length})
                  </p>
                  <div className="space-y-3">
                    {detailReviews.slice(0, 5).map(r => (
                      <div key={r.id} className="p-2.5 rounded-lg" style={{ background: "rgba(6,6,11,0.4)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold" style={{ color: "#F0F0F5" }}>@{r.author}</span>
                          <span className="text-[9px]" style={{ color: detailPack.color }}>
                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: "#8E8EA3" }}>&ldquo;{r.content}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment options */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: "#8E8EA3" }}>Paiement</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Snapchat", icon: "snap", color: "#FFFC00" },
                    { label: "Instagram", icon: "insta", color: "#E1306C" },
                    { label: "Telegram", icon: "tg", color: "#0088CC" },
                  ].map(p => (
                    <div key={p.label} className="text-center p-2 rounded-xl" style={{ background: `${p.color}08`, border: `1px solid ${p.color}15` }}>
                      <span className="text-[10px] font-medium" style={{ color: p.color }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => { addToCart(detailPack.id); setPackDetailId(null); }}
                className="w-full text-sm font-bold py-3.5 rounded-xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: cart.includes(detailPack.id) ? "rgba(16,185,129,0.1)" : `linear-gradient(135deg, ${detailPack.color}, ${detailPack.color}CC)`,
                  color: cart.includes(detailPack.id) ? "#10B981" : "#fff",
                  border: cart.includes(detailPack.id) ? "1px solid rgba(16,185,129,0.3)" : "none",
                }}
              >
                {cart.includes(detailPack.id) ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Dans le panier
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                    Ajouter au panier — {detailPack.price}&euro;
                  </>
                )}
              </button>

              <p className="text-[9px] text-center mt-3" style={{ color: "#3A3A4A" }}>
                Paiement via DM. Code d&apos;acces genere automatiquement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════ CODE MODAL (centered, keyboard-safe) ══════ */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" style={{ background: "rgba(6,6,11,0.85)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCodeModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl p-6 my-auto" style={{
            background: "#0C0C14",
            border: "1px solid rgba(232,67,147,0.15)",
            animation: "ymFadeIn 0.3s ease-out",
          }}>
            <h2 className="text-base font-bold text-center mb-1" style={{ color: "#F0F0F5" }}>Debloquer le contenu</h2>
            <p className="text-[11px] text-center mb-5" style={{ color: "#8E8EA3" }}>
              Entre ton code d&apos;acces pour voir le contenu exclusif
            </p>
            <input
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={e => { if (e.key === "Enter") handleValidateCode(); }}
              placeholder="YUM-2026-XXXX"
              autoFocus
              className="w-full text-sm font-mono text-center tracking-[0.3em] rounded-xl px-4 py-3.5 outline-none mb-3"
              style={{
                background: "rgba(6,6,11,0.6)",
                border: error ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(232,67,147,0.2)",
                color: "#F0F0F5",
              }}
              maxLength={20} autoComplete="off" autoCorrect="off" spellCheck={false}
            />
            {error && <p className="text-[10px] text-center mb-3" style={{ color: "#EF4444" }}>{error}</p>}
            <button
              onClick={handleValidateCode}
              className="w-full text-sm font-semibold py-3.5 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)", color: "#fff" }}
            >
              Debloquer
            </button>

            {/* Pack preview — add to cart */}
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {activePacks.map(pack => (
                <button key={pack.id} onClick={() => { setShowCodeModal(false); addToCart(pack.id); }}
                  className="shrink-0 text-center px-3 py-2.5 rounded-xl cursor-pointer bg-transparent transition-all active:scale-95"
                  style={{
                    background: cart.includes(pack.id) ? "rgba(16,185,129,0.08)" : `${pack.color}08`,
                    border: `1px solid ${cart.includes(pack.id) ? "rgba(16,185,129,0.3)" : `${pack.color}15`}`,
                    minWidth: 80,
                  }}>
                  <p className="text-[10px] font-bold" style={{ color: cart.includes(pack.id) ? "#10B981" : pack.color }}>{pack.name.split(" ")[0]}</p>
                  <p className="text-sm font-black" style={{ color: cart.includes(pack.id) ? "#10B981" : pack.color }}>{pack.price}&euro;</p>
                  <p className="text-[8px]" style={{ color: cart.includes(pack.id) ? "#10B981" : "#5A5A6A" }}>{cart.includes(pack.id) ? "Ajoute" : TIER_SYMBOLS[pack.id]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════ CONTENT DETAIL MODAL ══════ */}
      {selectedContent && canViewContent(selectedContent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(6,6,11,0.92)" }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedContent(null); }}>
          <div data-protected className="w-full max-w-md mx-4 rounded-2xl overflow-hidden" style={{ background: "#0C0C14", border: `1px solid ${TIER_COLORS[selectedContent.tier]}25` }}>
            <div className="aspect-[4/5] relative" style={selectedContent.dataUrl ? {} : { background: patternGradient(selectedContent.pattern, TIER_COLORS[selectedContent.tier] || "#E84393") }}>
              {selectedContent.dataUrl ? (
                <img src={selectedContent.dataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-0" style={{
                    background: `
                      repeating-linear-gradient(${45 + selectedContent.pattern * 15}deg, transparent, transparent 12px, ${TIER_COLORS[selectedContent.tier]}10 12px, ${TIER_COLORS[selectedContent.tier]}10 24px),
                      radial-gradient(circle at 50% 50%, ${TIER_COLORS[selectedContent.tier]}30, transparent 60%)
                    `,
                  }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {selectedContent.type === "video" || selectedContent.type === "reel" ? (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3 mx-auto"
                          style={{ background: "rgba(6,6,11,0.5)", border: `2px solid ${TIER_COLORS[selectedContent.tier]}60` }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill={TIER_COLORS[selectedContent.tier]} style={{ opacity: 0.8, marginLeft: 3 }}>
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 mx-auto"
                          style={{ background: "rgba(6,6,11,0.5)", border: `2px solid ${TIER_COLORS[selectedContent.tier]}60` }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TIER_COLORS[selectedContent.tier]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                      <p className="text-sm font-semibold" style={{ color: "#F0F0F5" }}>{selectedContent.label}</p>
                      <p className="text-[10px] mt-1" style={{ color: "#8E8EA3" }}>
                        Contenu {selectedContent.type} exclusif
                      </p>
                    </div>
                  </div>
                </>
              )}
              <button onClick={() => setSelectedContent(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(6,6,11,0.6)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0F0F5" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${TIER_COLORS[selectedContent.tier]}20`, color: TIER_COLORS[selectedContent.tier] }}>
                  {packs.find(p => p.id === selectedContent.tier)?.name || selectedContent.tier}
                </span>
                {selectedContent.isNew && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: TIER_COLORS[selectedContent.tier], color: "#06060B" }}>NEW</span>}
              </div>
              <span className="text-[10px]" style={{ color: "#5A5A6A" }}>{selectedContent.type.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════ CART / CHECKOUT MODAL (multi-pack e-shop) ══════ */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" style={{ background: "rgba(6,6,11,0.9)" }}
          onClick={e => { if (e.target === e.currentTarget && checkoutStep !== "done") { setShowCart(false); } }}>
          <div className="w-full max-w-sm rounded-2xl p-6 my-auto" style={{
            background: "#0C0C14",
            border: "1px solid rgba(232,67,147,0.2)",
            animation: "ymFadeIn 0.3s ease-out",
          }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(142,142,163,0.3)" }} />

            {checkoutStep === "info" && (
              <>
                <h3 className="text-sm font-bold mb-4 flex items-center justify-center gap-2" style={{ color: "#F0F0F5" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E84393" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  Ton panier ({cartPacks.length})
                </h3>

                {/* Cart items */}
                <div className="space-y-2 mb-4">
                  {cartPacks.map(pack => (
                    <div key={pack.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${pack.color}08`, border: `1px solid ${pack.color}15` }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${pack.color}20` }}>
                        <span className="text-base" style={{ color: pack.color }}>{TIER_SYMBOLS[pack.id]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "#F0F0F5" }}>{pack.name}</p>
                        <p className="text-[9px]" style={{ color: "#8E8EA3" }}>{pack.features.length} avantages</p>
                      </div>
                      <span className="text-sm font-black shrink-0" style={{ color: pack.color }}>{pack.price}&euro;</span>
                      <button onClick={() => removeFromCart(pack.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                        style={{ background: "rgba(239,68,68,0.1)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add more packs */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold mb-2" style={{ color: "#8E8EA3" }}>Ajouter un pack</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {activePacks.filter(p => !cart.includes(p.id)).map(pack => (
                      <button key={pack.id} onClick={() => addToCart(pack.id)}
                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
                        style={{ background: `${pack.color}08`, border: `1px solid ${pack.color}20` }}>
                        <span className="text-xs" style={{ color: pack.color }}>{TIER_SYMBOLS[pack.id]}</span>
                        <span className="text-[10px] font-medium" style={{ color: "#F0F0F5" }}>{pack.name.split(" ")[0]}</span>
                        <span className="text-[10px] font-bold" style={{ color: pack.color }}>{pack.price}&euro;</span>
                      </button>
                    ))}
                    {activePacks.filter(p => !cart.includes(p.id)).length === 0 && (
                      <p className="text-[10px]" style={{ color: "#5A5A6A" }}>Tous les packs sont dans le panier</p>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: "rgba(232,67,147,0.06)", border: "1px solid rgba(232,67,147,0.15)" }}>
                  <span className="text-xs font-semibold" style={{ color: "#F0F0F5" }}>Total</span>
                  <span className="text-xl font-black" style={{ color: "#E84393" }}>{cartTotal}&euro;</span>
                </div>

                {/* User info */}
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-[10px] block mb-1.5" style={{ color: "#8E8EA3" }}>Ton pseudo *</label>
                    <input value={checkoutPseudo} onChange={e => setCheckoutPseudo(e.target.value)}
                      placeholder="@ton_pseudo"
                      className="w-full text-sm rounded-xl px-4 py-3 outline-none transition-all"
                      style={{ background: "rgba(6,6,11,0.6)", border: "1px solid rgba(142,142,163,0.15)", color: "#F0F0F5" }}
                      autoComplete="off" />
                  </div>
                  <div>
                    <label className="text-[10px] block mb-1.5" style={{ color: "#8E8EA3" }}>Plateforme</label>
                    <div className="flex gap-2">
                      {[
                        { id: "snapchat", label: "Snapchat", color: "#FFFC00" },
                        { id: "instagram", label: "Instagram", color: "#E1306C" },
                        { id: "telegram", label: "Telegram", color: "#0088CC" },
                      ].map(p => (
                        <button key={p.id} onClick={() => setCheckoutPlatform(p.id)}
                          className="flex-1 text-[11px] font-medium py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.97]"
                          style={{
                            background: checkoutPlatform === p.id ? `${p.color}15` : "rgba(6,6,11,0.6)",
                            border: `1px solid ${checkoutPlatform === p.id ? `${p.color}40` : "rgba(142,142,163,0.1)"}`,
                            color: checkoutPlatform === p.id ? p.color : "#8E8EA3",
                          }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => { if (checkoutPseudo.trim() && cartPacks.length > 0) setCheckoutStep("confirm"); }}
                  disabled={!checkoutPseudo.trim() || cartPacks.length === 0}
                  className="w-full text-sm font-semibold py-3.5 rounded-xl cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)", color: "#fff" }}>
                  Commander — {cartTotal}&euro;
                </button>
              </>
            )}

            {checkoutStep === "confirm" && (
              <>
                <h3 className="text-sm font-bold mb-4 text-center" style={{ color: "#F0F0F5" }}>Confirmer la commande</h3>
                <div className="space-y-2 mb-5 p-4 rounded-xl" style={{ background: "rgba(6,6,11,0.6)", border: "1px solid rgba(142,142,163,0.1)" }}>
                  {cartPacks.map(pack => (
                    <div key={pack.id} className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span style={{ color: pack.color }}>{TIER_SYMBOLS[pack.id]}</span>
                        <span style={{ color: "#F0F0F5" }}>{pack.name}</span>
                      </span>
                      <span className="font-semibold" style={{ color: pack.color }}>{pack.price}&euro;</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#8E8EA3" }}>Pseudo</span>
                    <span style={{ color: "#F0F0F5" }}>@{checkoutPseudo.trim()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#8E8EA3" }}>Plateforme</span>
                    <span style={{ color: "#F0F0F5" }}>{checkoutPlatform}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#8E8EA3" }}>Duree d&apos;acces</span>
                    <span style={{ color: "#F0F0F5" }}>72h (3 jours)</span>
                  </div>
                  <div className="h-px my-2" style={{ background: "rgba(142,142,163,0.1)" }} />
                  <div className="flex justify-between text-sm font-bold">
                    <span style={{ color: "#F0F0F5" }}>Total</span>
                    <span style={{ color: "#E84393" }}>{cartTotal}&euro;</span>
                  </div>
                </div>
                <p className="text-[10px] text-center mb-4" style={{ color: "#8E8EA3" }}>
                  Un code d&apos;acces unique sera genere pour tes {cartPacks.length} pack{cartPacks.length > 1 ? "s" : ""}.
                  Paiement via DM directement avec le modele.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setCheckoutStep("info")}
                    className="flex-1 text-xs font-medium py-3 rounded-xl cursor-pointer"
                    style={{ background: "rgba(142,142,163,0.08)", border: "1px solid rgba(142,142,163,0.15)", color: "#8E8EA3" }}>
                    Retour
                  </button>
                  <button onClick={handleCheckoutConfirm}
                    className="text-sm font-semibold py-3 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)", color: "#fff", flex: 2 }}>
                    Confirmer — {cartTotal}&euro;
                  </button>
                </div>
              </>
            )}

            {checkoutStep === "done" && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.3)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-base font-bold mb-1" style={{ color: "#F0F0F5" }}>Commande confirmee !</h3>
                <p className="text-[11px] mb-5" style={{ color: "#8E8EA3" }}>
                  Ton code d&apos;acces a ete genere pour {cartPacks.length} pack{cartPacks.length > 1 ? "s" : ""}. Copie-le et utilise-le !
                </p>
                {checkoutCodes.map((code, i) => (
                  <div key={i} className="p-4 rounded-xl mb-3" style={{ background: "rgba(232,67,147,0.06)", border: "1px solid rgba(232,67,147,0.2)" }}>
                    <p className="text-[10px] mb-2 uppercase tracking-wider font-semibold" style={{ color: "#E84393" }}>
                      Code d&apos;acces {cartPacks.length > 1 ? `#${i + 1}` : ""}
                    </p>
                    <p className="text-2xl font-mono font-black tracking-[0.2em] mb-3" style={{ color: "#F0F0F5" }}>
                      {code}
                    </p>
                    <button onClick={() => { navigator.clipboard.writeText(code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                      className="text-xs font-medium px-5 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
                      style={{ background: codeCopied ? "rgba(16,185,129,0.15)" : "rgba(232,67,147,0.15)", color: codeCopied ? "#10B981" : "#E84393" }}>
                      {codeCopied ? "Copie !" : "Copier le code"}
                    </button>
                  </div>
                ))}
                <div className="p-3 rounded-xl mb-5 text-left" style={{ background: "rgba(255,159,67,0.06)", border: "1px solid rgba(255,159,67,0.15)" }}>
                  <p className="text-[10px] font-semibold mb-1" style={{ color: "#FF9F43" }}>Prochaine etape</p>
                  <p className="text-[10px] leading-relaxed" style={{ color: "#8E8EA3" }}>
                    Envoie le paiement ({cartTotal}&euro;) via {checkoutPlatform === "snapchat" ? "Snap" : checkoutPlatform} au modele.
                    Ton code sera active des reception du paiement. Valable 72h.
                  </p>
                </div>
                <button onClick={async () => {
                  setShowCart(false);
                  setCart([]);
                  if (checkoutCodes[0]) {
                    // Try API first, fallback to localStorage
                    const result = await apiValidateCode(checkoutCodes[0], "yumi");
                    if (result.code) { setValidatedCode(result.code); }
                    else { setValidatedCode(loadCodes().find(c => c.code === checkoutCodes[0]) || null); }
                  }
                }}
                  className="w-full text-sm font-semibold py-3.5 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #E84393, #C9A84C)", color: "#fff" }}>
                  Utiliser mon code maintenant
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ CHAT POPUP ══════ */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#06060BF5" }}>
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "rgba(91,141,239,0.1)", borderBottom: "1px solid rgba(91,141,239,0.15)" }}>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B8DEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-xs font-bold" style={{ color: "#F0F0F5" }}>Chat YUMI</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                {chatPublicMsgs.length} messages
              </span>
            </div>
            <button onClick={() => setChatOpen(false)} className="cursor-pointer bg-transparent border-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8EA3" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="flex shrink-0" style={{ borderBottom: "1px solid rgba(142,142,163,0.08)" }}>
            <button onClick={() => setChatTab("public")}
              className="flex-1 py-2 text-[11px] font-medium cursor-pointer bg-transparent border-none flex items-center justify-center gap-1.5"
              style={{ color: chatTab === "public" ? "#5B8DEF" : "#5A5A6A", borderBottom: chatTab === "public" ? "2px solid #5B8DEF" : "2px solid transparent" }}>
              Public
            </button>
            <button onClick={() => setChatTab("private")}
              className="flex-1 py-2 text-[11px] font-medium cursor-pointer bg-transparent border-none flex items-center justify-center gap-1.5"
              style={{ color: chatTab === "private" ? "#E84393" : "#5A5A6A", borderBottom: chatTab === "private" ? "2px solid #E84393" : "2px solid transparent" }}>
              Prive
            </button>
          </div>

          {chatTab === "public" && !chatJoined && (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <p className="text-sm font-medium mb-1" style={{ color: "#F0F0F5" }}>Chat public</p>
              <p className="text-[11px] mb-4 text-center" style={{ color: "#8E8EA3" }}>Rejoins et recois 1h d&apos;acces gratuit au profil !</p>
              <input value={chatNick} onChange={e => setChatNick(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") joinPublicChat(); }}
                placeholder="Ton pseudo" autoFocus
                className="w-full max-w-[240px] text-sm text-center rounded-xl px-4 py-3 outline-none mb-3"
                style={{ background: "rgba(12,12,20,0.8)", border: "1px solid rgba(91,141,239,0.2)", color: "#F0F0F5" }} />
              <button onClick={joinPublicChat} disabled={!chatNick.trim()}
                className="text-xs font-semibold px-8 py-2.5 rounded-xl cursor-pointer disabled:opacity-40"
                style={{ background: "#5B8DEF", color: "#fff" }}>Rejoindre</button>
            </div>
          )}

          {chatTab === "private" && !chatPrivUser && (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <p className="text-sm font-medium mb-1" style={{ color: "#F0F0F5" }}>Chat prive</p>
              <p className="text-[11px] mb-4 text-center" style={{ color: "#8E8EA3" }}>Reserve aux abonnes payants.</p>
              <input value={chatPrivCode} onChange={e => { setChatPrivCode(e.target.value.toUpperCase()); setChatPrivErr(""); }}
                onKeyDown={e => { if (e.key === "Enter") joinPrivateChat(); }}
                placeholder="YUM-2026-XXXX" autoFocus
                className="w-full max-w-[240px] text-sm text-center font-mono tracking-widest rounded-xl px-4 py-3 outline-none mb-2"
                style={{ background: "rgba(12,12,20,0.8)", border: chatPrivErr ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(232,67,147,0.2)", color: "#F0F0F5" }} />
              {chatPrivErr && <p className="text-[10px] mb-2" style={{ color: "#EF4444" }}>{chatPrivErr}</p>}
              <button onClick={joinPrivateChat}
                className="text-xs font-semibold px-8 py-2.5 rounded-xl cursor-pointer"
                style={{ background: "#E84393", color: "#fff" }}>Acceder</button>
            </div>
          )}

          {((chatTab === "public" && chatJoined) || (chatTab === "private" && chatPrivUser)) && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(chatTab === "public" ? chatPublicMsgs : chatPrivateMsgs).length === 0 && (
                  <p className="text-[10px] text-center py-10" style={{ color: "#3A3A4A" }}>
                    {chatTab === "public" ? "Sois le premier a ecrire !" : "Chat prive avec YUMI."}
                  </p>
                )}
                {(chatTab === "public" ? chatPublicMsgs : chatPrivateMsgs).map(m => {
                  const isSystem = m.sender === "System";
                  const isSelf = chatTab === "public" ? m.sender === chatNick : m.sender === chatPrivUser?.client;
                  if (isSystem) return (
                    <div key={m.id} className="text-center">
                      <span className="text-[9px] px-2.5 py-1 rounded-full inline-block" style={{ background: "rgba(142,142,163,0.06)", color: "#5A5A6A" }}>{m.content}</span>
                    </div>
                  );
                  const tc: Record<string, string> = { vip: "#E84393", gold: "#C9A84C", diamond: "#5B8DEF", platinum: "#A882FF" };
                  return (
                    <div key={m.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%]">
                        <div className={`flex items-center gap-1 mb-0.5 ${isSelf ? "justify-end" : ""}`}>
                          <span className="text-[9px] font-semibold" style={{ color: m.tier ? tc[m.tier] || "#8E8EA3" : "#5B8DEF" }}>{m.sender}</span>
                          {m.tier && <span className="text-[7px] px-1 py-0.5 rounded-full font-bold uppercase" style={{ background: `${tc[m.tier]}20`, color: tc[m.tier] }}>{m.tier}</span>}
                        </div>
                        <div className="px-3 py-2 text-[11px] leading-relaxed rounded-xl"
                          style={{
                            background: isSelf ? (chatTab === "private" ? "#E8439920" : "#5B8DEF20") : "rgba(12,12,20,0.8)",
                            color: "#E2E8F0",
                            borderBottomRightRadius: isSelf ? 4 : undefined,
                            borderBottomLeftRadius: !isSelf ? 4 : undefined,
                          }}>
                          {m.content}
                        </div>
                        <span className="text-[8px] block mt-0.5" style={{ color: "#3A3A4A", textAlign: isSelf ? "right" : "left" }}>
                          {new Date(m.ts).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 shrink-0" style={{ borderTop: "1px solid rgba(142,142,163,0.08)" }}>
                <form onSubmit={e => { e.preventDefault(); sendChatMsg(); }} className="flex gap-2">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                    placeholder={chatTab === "public" ? "Message..." : "Message prive..."}
                    className="flex-1 text-[11px] px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "rgba(12,12,20,0.8)", color: "#F0F0F5", border: "1px solid rgba(142,142,163,0.1)" }} />
                  <button type="submit" disabled={!chatInput.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-30"
                    style={{ background: chatTab === "public" ? "#5B8DEF" : "#E84393" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════ TOKEN BUY MODAL ══════ */}
      {showTokenBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" style={{ background: "rgba(6,6,11,0.9)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowTokenBuy(false); }}>
          <div className="w-full max-w-sm rounded-2xl p-6 my-auto" style={{ background: "#0C0C14", border: "1px solid rgba(201,168,76,0.2)", animation: "ymFadeIn 0.3s ease-out" }}>

            {tokenBuyStep === "select" && (
              <>
                <h3 className="text-base font-bold text-center mb-4" style={{ color: "#F0F0F5" }}>Acheter des jetons</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {TOKEN_PACKS.map(tp => (
                    <button key={tp.id} onClick={() => { setTokenBuyPack(tp); setTokenBuyStep("confirm"); }}
                      className="rounded-xl p-3 text-center cursor-pointer transition-all active:scale-95 relative"
                      style={{ background: tp.popular ? "rgba(201,168,76,0.1)" : "rgba(6,6,11,0.6)", border: `1px solid ${tp.popular ? "rgba(201,168,76,0.3)" : "rgba(142,142,163,0.1)"}` }}>
                      {tp.popular && <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: "#C9A84C", color: "#06060B" }}>Best</span>}
                      <p className="text-lg font-black" style={{ color: "#C9A84C" }}>{tp.tokens}</p>
                      {tp.bonus > 0 && <p className="text-[9px] font-semibold" style={{ color: "#10B981" }}>+{tp.bonus}</p>}
                      <p className="text-sm font-bold mt-1" style={{ color: "#F0F0F5" }}>{tp.price}&euro;</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowTokenBuy(false)}
                  className="w-full text-xs py-2.5 rounded-xl cursor-pointer"
                  style={{ background: "rgba(142,142,163,0.08)", color: "#8E8EA3" }}>Annuler</button>
              </>
            )}

            {tokenBuyStep === "confirm" && tokenBuyPack && (
              <>
                <h3 className="text-sm font-bold text-center mb-4" style={{ color: "#F0F0F5" }}>Confirmer l&apos;achat</h3>
                <div className="rounded-xl p-4 mb-4 text-center" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)" }}>
                  <p className="text-2xl font-black" style={{ color: "#C9A84C" }}>{tokenBuyPack.tokens + tokenBuyPack.bonus}</p>
                  <p className="text-[10px]" style={{ color: "#8E8EA3" }}>jetons ({tokenBuyPack.tokens} + {tokenBuyPack.bonus} bonus)</p>
                  <p className="text-lg font-bold mt-2" style={{ color: "#F0F0F5" }}>{tokenBuyPack.price}&euro;</p>
                </div>

                {/* Pseudo + plateforme si pas connecté */}
                {!validatedCode && (
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "#8E8EA3" }}>Ton pseudo</label>
                      <input value={checkoutPseudo} onChange={e => setCheckoutPseudo(e.target.value)}
                        placeholder="Ex: @tonpseudo"
                        className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                        style={{ background: "rgba(6,6,11,0.6)", border: "1px solid rgba(142,142,163,0.12)", color: "#F0F0F5" }} />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "#8E8EA3" }}>Plateforme</label>
                      <div className="flex gap-1.5">
                        {[
                          { id: "snapchat", label: "Snap", color: "#FFFC00" },
                          { id: "instagram", label: "Insta", color: "#E1306C" },
                          { id: "telegram", label: "Telegram", color: "#0088CC" },
                        ].map(p => (
                          <button key={p.id} onClick={() => setCheckoutPlatform(p.id)}
                            className="flex-1 text-[10px] py-1.5 rounded-lg cursor-pointer transition-all"
                            style={{
                              background: checkoutPlatform === p.id ? `${p.color}15` : "rgba(6,6,11,0.6)",
                              border: `1px solid ${checkoutPlatform === p.id ? `${p.color}40` : "rgba(142,142,163,0.08)"}`,
                              color: checkoutPlatform === p.id ? p.color : "#8E8EA3",
                            }}>{p.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setTokenBuyStep("select")}
                    className="flex-1 text-xs py-2.5 rounded-xl cursor-pointer"
                    style={{ background: "rgba(142,142,163,0.08)", color: "#8E8EA3" }}>Retour</button>
                  <button onClick={handleBuyTokens}
                    disabled={!validatedCode && !checkoutPseudo.trim()}
                    className="text-sm font-semibold py-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                    style={{
                      background: (!validatedCode && !checkoutPseudo.trim()) ? "rgba(142,142,163,0.15)" : "linear-gradient(135deg, #C9A84C, #E8B94C)",
                      color: (!validatedCode && !checkoutPseudo.trim()) ? "#8E8EA3" : "#06060B",
                      flex: 2,
                    }}>
                    Confirmer — {tokenBuyPack.price}&euro;
                  </button>
                </div>
              </>
            )}

            {tokenBuyStep === "done" && (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.3)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold mb-1" style={{ color: "#F0F0F5" }}>Paiement confirme !</h3>
                <p className="text-[11px] mb-4" style={{ color: "#8E8EA3" }}>
                  {tokenBuyPack ? tokenBuyPack.tokens + tokenBuyPack.bonus : 0} jetons credites sur ton compte. Nouveau solde : {tokenBalance.balance} jetons.
                </p>
                <button onClick={() => setShowTokenBuy(false)}
                  className="w-full text-sm font-semibold py-3 rounded-xl cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #C9A84C, #E8B94C)", color: "#06060B" }}>
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ SERVICE REQUEST MODAL ══════ */}
      {showServiceModal && (() => {
        // Support dynamic live_custom_<tier>_<minutes> IDs from the slider
        let service: TokenService | undefined = services.find(s => s.id === showServiceModal);
        if (!service && showServiceModal.startsWith("live_custom_")) {
          const parts = showServiceModal.split("_"); // live_custom_gold_10
          const tier = parts[2];
          const mins = parseInt(parts[3], 10);
          const r = LIVE_RATES[tier];
          if (r && mins) {
            service = {
              id: showServiceModal,
              label: `Live Snap ${r.label} (${mins}min)`,
              tokens: calcLiveTokens(tier, mins),
              icon: "cam",
              color: r.color,
              tier,
              active: true,
            };
          }
        }
        if (!service) return null;
        const canAfford = tokenBalance.balance >= service.tokens;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(6,6,11,0.9)" }}
            onClick={e => { if (e.target === e.currentTarget) setShowServiceModal(null); }}>
            <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#0C0C14", border: `1px solid ${service.color}20`, animation: "ymFadeIn 0.3s ease-out" }}>
              {serviceRequested ? (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(16,185,129,0.15)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: "#F0F0F5" }}>Demande envoyee !</h3>
                  <p className="text-[10px] mt-1" style={{ color: "#8E8EA3" }}>La modele te contactera sur Snap pour organiser le live.</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${service.color}15` }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={service.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {service.icon === "cam" && <><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></>}
                      {service.icon === "photo" && <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>}
                      {service.icon === "video" && <polygon points="5 3 19 12 5 21 5 3" />}
                      {service.icon === "chat" && <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />}
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-center mb-1" style={{ color: "#F0F0F5" }}>{service.label}</h3>
                  <p className="text-center mb-4">
                    <span className="text-2xl font-black" style={{ color: "#C9A84C" }}>{service.tokens}</span>
                    <span className="text-xs ml-1" style={{ color: "#8E8EA3" }}>jetons</span>
                  </p>
                  {canAfford ? (
                    <>
                      <p className="text-[10px] text-center mb-4" style={{ color: "#8E8EA3" }}>
                        Ton solde apres : {tokenBalance.balance - service.tokens} jetons
                      </p>
                      <button onClick={() => handleRequestService(service.id)}
                        className="w-full text-sm font-semibold py-3 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                        style={{ background: `linear-gradient(135deg, ${service.color}, ${service.color}CC)`, color: "#fff" }}>
                        Demander — {service.tokens} jetons
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] text-center mb-4" style={{ color: "#EF4444" }}>
                        Solde insuffisant ({tokenBalance.balance} jetons). Il te manque {service.tokens - tokenBalance.balance} jetons.
                      </p>
                      <button onClick={() => { setShowServiceModal(null); setShowTokenBuy(true); setTokenBuyPack(null); setTokenBuyStep("select"); }}
                        className="w-full text-sm font-semibold py-3 rounded-xl cursor-pointer"
                        style={{ background: "linear-gradient(135deg, #C9A84C, #E8B94C)", color: "#06060B" }}>
                        Acheter des jetons
                      </button>
                    </>
                  )}
                  <button onClick={() => setShowServiceModal(null)}
                    className="w-full text-xs py-2 mt-2 rounded-xl cursor-pointer"
                    style={{ background: "rgba(142,142,163,0.08)", color: "#8E8EA3" }}>Annuler</button>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════ CSS ══════ */}
      {/* ══════ SCREENSHOT BLACKOUT OVERLAY ══════ */}
      {screenBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "#000", animation: "ymFadeIn 0.1s ease-out" }}>
          <div className="text-center px-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,77,106,0.15)", border: "2px solid rgba(255,77,106,0.3)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF4D6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="#FF4D6A" strokeWidth="2.5" />
              </svg>
            </div>
            <h2 className="text-base font-black mb-2" style={{ color: "#FF4D6A" }}>
              CONTENU PROTEGE
            </h2>
            <p className="text-[11px] leading-relaxed" style={{ color: "#8E8EA3" }}>
              Les captures d&apos;ecran sont interdites et detectees.<br />
              Une penalite a ete appliquee a ton compte.
            </p>
          </div>
        </div>
      )}

      {/* ══════ SCREENSHOT WARNING BANNER ══════ */}
      {screenWarning && validatedCode && (
        <div className="fixed top-0 left-0 right-0 z-[90] px-4 py-2 text-center"
          style={{ background: "linear-gradient(135deg, #FF4D6A, #DC2626)", animation: "ymSlideDown 0.3s ease-out" }}>
          <p className="text-[10px] font-bold text-white">
            ALERTE : Tentative de screenshot detectee — penalite appliquee (-25% temps & jetons)
          </p>
          <button onClick={() => setScreenWarning(false)}
            className="text-[9px] text-white/70 underline cursor-pointer bg-transparent border-none mt-0.5">
            Fermer
          </button>
        </div>
      )}

      {/* ══════ EXCLUDED BANNER ══════ */}
      {isExcluded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.95)" }}>
          <div className="text-center px-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,77,106,0.1)", border: "2px solid rgba(255,77,106,0.3)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF4D6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <h2 className="text-lg font-black mb-2" style={{ color: "#FF4D6A" }}>ACCES BLOQUE</h2>
            <p className="text-xs leading-relaxed mb-4" style={{ color: "#8E8EA3" }}>
              Ton compte a ete exclu suite a des violations repetees.<br />
              Contacte la modele pour plus d&apos;informations.
            </p>
            <button onClick={() => setIsExcluded(false)}
              className="text-[10px] px-4 py-2 rounded-lg cursor-pointer"
              style={{ background: "rgba(142,142,163,0.1)", color: "#8E8EA3", border: "1px solid rgba(142,142,163,0.2)" }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ymFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ymSlideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ymSlideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Anti-screenshot CSS protection */
        [data-protected] img {
          -webkit-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          pointer-events: none;
        }
        [data-protected] {
          -webkit-user-select: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
}

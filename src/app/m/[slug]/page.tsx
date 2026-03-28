"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Heart, MessageCircle, Send, Lock, Image, Newspaper, ShoppingBag,
  Coins, Pin, Eye, Star, Camera, Video, Play, X, Check,
  Instagram, Ghost, ChevronRight, Crown, Plus, Edit3, Wifi,
  ImagePlus, Trash2, Save, RotateCcw, ToggleLeft, ToggleRight,
  Upload, Pencil, GripVertical, Flame, Zap, Palette, Diamond, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import { useScreenshotDetection } from "@/hooks/use-screenshot-detection";
import { IdentityGate } from "@/components/identity-gate";
import { SubscriptionStatusBar } from "@/components/subscription-status-bar";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { WallTab } from "@/components/profile/wall-tab";
import { GalleryTab } from "@/components/profile/gallery-tab";
import { ShopTab } from "@/components/profile/shop-tab";

// ── Types & Constants (centralized) ──
import type { ModelInfo, Post, PackConfig, UploadedContent, WallPost, AccessCode, VisitorPlatform } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

interface ModelAuth {
  role: string; model_slug?: string; display_name?: string; token?: string;
}
const TABS = [
  { id: "wall", label: "Wall", icon: Newspaper },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "shop", label: "Shop", icon: ShoppingBag },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Tier bonus config (used by unlock sheet + checkout modal + handleTopup) ──
const TIER_CREDIT_BONUS: Record<string, { multiplier: number; label: string; bonus?: string }> = {
  platinum: { multiplier: 3, label: "x3", bonus: "Triple crédits sur chaque recharge" },
  diamond: { multiplier: 2, label: "x2", bonus: "Double crédits sur chaque recharge" },
  gold: { multiplier: 1, label: "", bonus: "1 Nude dédicacé offert à réclamer" },
  vip: { multiplier: 1, label: "", bonus: undefined },
};

// ── Detect model session from another tab ──
function useModelSession(slug: string): ModelAuth | null {
  const [auth, setAuth] = useState<ModelAuth | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("heaven_auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.role === "root" || parsed.model_slug === slug) setAuth(parsed);
      }
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === "heaven_auth") {
        try {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            if (parsed.role === "root" || parsed.model_slug === slug) setAuth(parsed);
          } else setAuth(null);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [slug]);
  return auth;
}

// ── Tier hierarchy: higher index = more access ──
const TIER_HIERARCHY = ["vip", "gold", "diamond", "platinum"];
function tierIncludes(unlockedTier: string, contentTier: string): boolean {
  const ui = TIER_HIERARCHY.indexOf(unlockedTier);
  const ci = TIER_HIERARCHY.indexOf(contentTier);
  if (ui === -1 || ci === -1) return false;
  return ui >= ci;
}

export default function ModelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const modelAuth = useModelSession(slug);
  const isModelLoggedIn = !!modelAuth;

  const [model, setModel] = useState<ModelInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>([]);
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [tab, setTab] = useState<TabId>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "gallery" || hash === "shop" || hash === "wall") return hash as TabId;
    }
    return "wall";
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Access link system: ?access=TOKEN unlocks content
  const [unlockedTier, setUnlockedTier] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [activeCode, setActiveCode] = useState<AccessCode | null>(null);

  // Wall (public posts by visitors)
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [wallContent, setWallContent] = useState("");
  const [wallPosting, setWallPosting] = useState(false);
  const [socialPopup, setSocialPopup] = useState<{ pseudo: string; snap?: string | null; insta?: string | null; x: number; y: number } | null>(null);

  // Unified visitor identity: snap/insta/phone/pseudo = client identity
  const [clientId, setClientId] = useState<string | null>(null);
  const [visitorPlatform, setVisitorPlatform] = useState<VisitorPlatform | null>(null);
  const [visitorHandle, setVisitorHandle] = useState("");
  const [visitorRegistered, setVisitorRegistered] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; client_id: string; sender_type: string; content: string; created_at: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Unlock sheet
  const [showUnlock, setShowUnlock] = useState(false);
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(false);

  // Gallery filter
  const [galleryTier, setGalleryTier] = useState("all");

  // Credit purchases & balance
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [creditPurchaseModal, setCreditPurchaseModal] = useState<UploadedContent | null>(null);
  const [clientBalance, setClientBalance] = useState(0);
  const [shopSection, setShopSection] = useState<"packs" | "credits">("packs");
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PackConfig | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [shopToast, setShopToast] = useState<string | null>(null);

  // ── Edit Mode ──
  const isEditMode = searchParams.get("edit") === "true" && isModelLoggedIn;
  const [editDirty, setEditDirty] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editProfile, setEditProfile] = useState<Partial<ModelInfo>>({});
  const [editPacks, setEditPacks] = useState<PackConfig[] | null>(null);
  const [editingUploadId, setEditingUploadId] = useState<string | null>(null);
  const [editUploadData, setEditUploadData] = useState<Partial<UploadedContent>>({});
  const [editToast, setEditToast] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Merged model data for display (original + edits)
  const displayModel = model ? { ...model, ...editProfile } : null;
  const displayPacks = editPacks ?? packs;

  // ── Screenshot detection ──
  const subscriberUsername = visitorHandle || clientId?.slice(0, 8) || "visitor";
  const hasSubscriberIdentity = !!clientId;

  // Load purchased items from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`heaven_purchases_${slug}`);
      if (stored) setPurchasedItems(new Set(JSON.parse(stored)));
    } catch {}
  }, [slug]);

  // Fetch client balance
  const fetchBalance = useCallback(async (cid: string) => {
    try {
      const res = await fetch(`/api/credits/balance?client_id=${cid}`);
      if (res.ok) {
        const data = await res.json();
        setClientBalance(data.balance || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (clientId) fetchBalance(clientId);
  }, [clientId, fetchBalance]);

  // Fetch active code for subscription status bar
  useEffect(() => {
    if (!clientId || !slug) return;
    fetch(`/api/codes?model=${slug}&client_id=${clientId}&status=active`)
      .then(r => r.json())
      .then(d => {
        const codes = d.codes || [];
        if (codes.length > 0) {
          setActiveCode(codes[0]);
          if (codes[0].tier) setUnlockedTier(codes[0].tier);
        }
      })
      .catch(() => {});
  }, [clientId, slug]);

  const handleCreditPurchase = useCallback((item: UploadedContent) => {
    if (!clientId) {
      setCreditPurchaseModal(item);
      return;
    }
    setCreditPurchaseModal(item);
  }, [clientId]);

  const confirmCreditPurchase = useCallback(async () => {
    const item = creditPurchaseModal;
    if (!item || !clientId) return;
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, upload_id: item.id, model: slug, price: item.tokenPrice }),
      });
      if (res.ok) {
        const data = await res.json();
        setClientBalance(data.remaining ?? clientBalance - (item.tokenPrice || 0));
        const newSet = new Set(purchasedItems);
        newSet.add(item.id);
        setPurchasedItems(newSet);
        sessionStorage.setItem(`heaven_purchases_${slug}`, JSON.stringify([...newSet]));
        setShopToast("Contenu débloqué !");
        setTimeout(() => setShopToast(null), 3000);
      } else {
        const data = await res.json();
        if (res.status === 402) {
          setShopToast(`Crédits insuffisants (${data.balance || 0} restants)`);
          setTimeout(() => setShopToast(null), 3000);
        }
      }
    } catch {}
    setCreditPurchaseModal(null);
  }, [creditPurchaseModal, clientId, slug, purchasedItems, clientBalance]);

  const handleTopup = useCallback(async (credits: number, price: number) => {
    if (!clientId) return;
    setTopupLoading(true);
    // Apply tier multiplier
    const tierBonus = TIER_CREDIT_BONUS[unlockedTier || ""] || { multiplier: 1 };
    const finalCredits = credits * tierBonus.multiplier;
    try {
      const res = await fetch("/api/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, credits: finalCredits, model: slug, price }),
      });
      if (res.ok) {
        const data = await res.json();
        setClientBalance(data.balance ?? clientBalance + finalCredits);
        setShopToast(`+${finalCredits} crédits ajoutés !${tierBonus.multiplier > 1 ? ` (${tierBonus.label} bonus)` : ""}`);
        setTimeout(() => setShopToast(null), 3000);
      }
    } catch {}
    setTopupLoading(false);
  }, [clientId, slug, unlockedTier, clientBalance]);

  // ── Edit mode: upload to Cloudinary ──
  const uploadToCloudinary = useCallback(async (file: File, folder: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: reader.result, folder }),
          });
          if (res.ok) {
            const data = await res.json();
            resolve(data.url);
          } else resolve(null);
        } catch { resolve(null); }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // ── Edit mode: update profile field ──
  const updateEditField = useCallback((field: string, value: unknown) => {
    setEditProfile(prev => ({ ...prev, [field]: value }));
    setEditDirty(true);
  }, []);

  // ── Edit mode: handle avatar upload ──
  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadToCloudinary(file, `heaven/${slug}/avatar`);
    if (url) {
      updateEditField("avatar", url);
      setEditToast("Avatar mis à jour");
    } else {
      setEditToast("Erreur upload avatar");
    }
    setTimeout(() => setEditToast(null), 2000);
    setUploading(false);
  }, [slug, uploadToCloudinary, updateEditField]);

  // ── Edit mode: handle banner upload ──
  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadToCloudinary(file, `heaven/${slug}/banner`);
    if (url) {
      updateEditField("banner", url);
      setEditToast("Bannière mise à jour");
    } else {
      setEditToast("Erreur upload bannière");
    }
    setTimeout(() => setEditToast(null), 2000);
    setUploading(false);
  }, [slug, uploadToCloudinary, updateEditField]);

  // ── Edit mode: add media to gallery ──
  const handleAddMedia = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadToCloudinary(file, `heaven/${slug}/content`);
    if (url) {
      const newUpload: UploadedContent = {
        id: `upl-${Date.now()}`,
        tier: "vip",
        type: file.type.startsWith("video/") ? "video" : "photo",
        label: "",
        dataUrl: url,
        uploadedAt: new Date().toISOString(),
        visibility: "pack",
        tokenPrice: 0,
        isNew: true,
      };
      // Save to DB
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newUpload, model: slug }),
        });
        const data = await res.json();
        if (res.ok) {
          setUploads(prev => [data.upload || newUpload, ...prev]);
          setEditToast("Média ajouté");
          setTimeout(() => setEditToast(null), 2000);
          setTab("gallery");
        } else {
          console.error("[EditMode] Upload save failed:", data);
          setEditToast("Erreur: " + (data.error || "upload échoué"));
          setTimeout(() => setEditToast(null), 3000);
        }
      } catch (err) {
        console.error("[EditMode] Upload save error:", err);
        setEditToast("Erreur réseau");
        setTimeout(() => setEditToast(null), 3000);
      }
    }
    setUploading(false);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  }, [slug, uploadToCloudinary]);

  // ── Edit mode: delete media ──
  const handleDeleteMedia = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/uploads?model=${slug}&id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setUploads(prev => prev.filter(u => u.id !== id));
        setEditToast("Média supprimé");
        setTimeout(() => setEditToast(null), 2000);
      } else {
        const data = await res.json();
        console.error("[EditMode] Delete failed:", data);
        setEditToast("Erreur suppression");
        setTimeout(() => setEditToast(null), 3000);
      }
    } catch (err) {
      console.error("[EditMode] Delete error:", err);
    }
  }, [slug]);

  // ── Edit mode: update media ──
  const handleUpdateMedia = useCallback(async (id: string, updates: Partial<UploadedContent>) => {
    try {
      const res = await fetch("/api/uploads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: slug, id, updates }),
      });
      if (res.ok) {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
        setEditingUploadId(null);
        setEditUploadData({});
        setEditToast("Média mis à jour");
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("[EditMode] Update failed:", data);
        setEditToast("Erreur mise à jour");
      }
      setTimeout(() => setEditToast(null), 2000);
    } catch (err) {
      console.error("[EditMode] Update error:", err);
      setEditToast("Erreur réseau");
      setTimeout(() => setEditToast(null), 2000);
    }
  }, [slug]);

  // ── Edit mode: update pack ──
  const handleUpdatePack = useCallback((packId: string, updates: Partial<PackConfig>) => {
    setEditPacks(prev => {
      const list = prev ?? [...packs];
      return list.map(p => p.id === packId ? { ...p, ...updates } : p);
    });
    setEditDirty(true);
  }, [packs]);

  // ── Edit mode: add pack ──
  const handleAddPack = useCallback(() => {
    setEditPacks(prev => {
      const list = prev ?? [...packs];
      return [...list, {
        id: `pack-${Date.now()}`,
        name: "New Pack",
        price: 100,
        color: "#C9A84C",
        features: ["Feature 1"],
        face: false,
        badge: null,
        active: true,
      }];
    });
    setEditDirty(true);
  }, [packs]);

  // ── Edit mode: delete pack ──
  const handleDeletePack = useCallback((packId: string) => {
    setEditPacks(prev => {
      const list = prev ?? [...packs];
      return list.filter(p => p.id !== packId);
    });
    setEditDirty(true);
  }, [packs]);

  // ── Edit mode: save all changes ──
  const saveAllEdits = useCallback(async () => {
    setEditSaving(true);
    try {
      // Save profile changes
      if (Object.keys(editProfile).length > 0) {
        const profileRes = await fetch(`/api/models/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editProfile),
        });
        if (!profileRes.ok) {
          const err = await profileRes.json().catch(() => ({}));
          throw new Error(err.error || "Erreur profil");
        }
        setModel(prev => prev ? { ...prev, ...editProfile } : prev);
      }
      // Save pack changes
      if (editPacks) {
        const packsRes = await fetch("/api/packs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: slug, packs: editPacks }),
        });
        if (!packsRes.ok) {
          const err = await packsRes.json().catch(() => ({}));
          throw new Error(err.error || "Erreur packs");
        }
        setPacks(editPacks);
      }
      setEditProfile({});
      setEditPacks(null);
      setEditDirty(false);
      setEditToast("Modifications sauvegardées !");
      setTimeout(() => setEditToast(null), 3000);
    } catch (err) {
      console.error("[EditMode] saveAll error:", err);
      setEditToast(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
      setTimeout(() => setEditToast(null), 3000);
    }
    setEditSaving(false);
  }, [slug, editProfile, editPacks]);

  // ── Edit mode: cancel all changes ──
  const cancelEdits = useCallback(() => {
    setEditProfile({});
    setEditPacks(null);
    setEditDirty(false);
    setEditingUploadId(null);
    setEditUploadData({});
  }, []);

  const reportScreenshot = useCallback(() => {
    if (!clientId) return;
    fetch("/api/security/screenshot-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriberId: clientId,
        modelId: slug,
        timestamp: new Date().toISOString(),
        page: `profile/${tab}`,
      }),
    }).catch(() => {});
  }, [clientId, slug, tab]);

  useScreenshotDetection({
    enabled: hasSubscriberIdentity && !isModelLoggedIn,
    onDetected: reportScreenshot,
  });

  // ── Load data ──
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/models/${slug}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`/api/posts?model=${slug}`).then(r => r.json()).catch(e => { console.error("[Profile] posts fetch failed:", e); return { posts: [] }; }),
      fetch(`/api/packs?model=${slug}`).then(r => r.json()).catch(e => { console.error("[Profile] packs fetch failed:", e); return { packs: [] }; }),
      fetch(`/api/uploads?model=${slug}`).then(r => r.json()).catch(e => { console.error("[Profile] uploads fetch failed:", e); return { uploads: [] }; }),
      fetch(`/api/wall?model=${slug}`).then(r => r.json()).catch(e => { console.error("[Profile] wall fetch failed:", e); return { posts: [] }; }),
    ]).then(([modelData, postsData, packsData, uploadsData, wallData]) => {
      setModel(modelData);
      setPosts(postsData.posts || []);
      setPacks(packsData.packs || []);
      setUploads(uploadsData.uploads || []);
      setWallPosts(wallData.posts || []);
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));

    try {
      const saved = sessionStorage.getItem(`heaven_client_${slug}`);
      if (saved) {
        const client = JSON.parse(saved);
        setClientId(client.id);
        if (client.pseudo_snap) { setVisitorPlatform("snap"); setVisitorHandle(client.pseudo_snap); setVisitorRegistered(true); }
        else if (client.pseudo_insta) { setVisitorPlatform("insta"); setVisitorHandle(client.pseudo_insta); setVisitorRegistered(true); }
        else if (client.phone) { setVisitorPlatform("phone"); setVisitorHandle(client.phone); setVisitorRegistered(true); }
        else if (client.nickname) { setVisitorPlatform("pseudo"); setVisitorHandle(client.nickname); setVisitorRegistered(true); }
      }
      // Check for saved access tier
      const savedAccess = sessionStorage.getItem(`heaven_access_${slug}`);
      if (savedAccess) {
        const parsed = JSON.parse(savedAccess);
        if (parsed.tier && parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          setUnlockedTier(parsed.tier);
        } else {
          sessionStorage.removeItem(`heaven_access_${slug}`);
        }
      }
    } catch {}
  }, [slug]);

  // ── Validate access token from URL (?access=CODE or ?code=CODE) ──
  const [expiredCodeInfo, setExpiredCodeInfo] = useState<{ tier: string; pack: string } | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get("access") || searchParams.get("code");
    if (!accessToken || !slug || accessChecked) return;
    setAccessChecked(true);

    fetch("/api/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate", code: accessToken, model: slug }),
    })
      .then(async r => {
        const data = await r.json();
        if (data.code?.tier) {
          setUnlockedTier(data.code.tier);
          setActiveCode(data.code);
          setTab("gallery");
          sessionStorage.setItem(`heaven_access_${slug}`, JSON.stringify({
            tier: data.code.tier, expiresAt: data.code.expiresAt, code: data.code.code,
          }));
          // Auto-identify visitor from code's clientId
          if (data.code.clientId && !visitorRegistered) {
            try {
              const clientRes = await fetch(`/api/clients/${data.code.clientId}`);
              if (clientRes.ok) {
                const clientData = await clientRes.json();
                const client = clientData.client;
                if (client) {
                  let p: VisitorPlatform = "pseudo";
                  let h = client.id?.slice(0, 8) || "";
                  if (client.pseudo_snap) { p = "snap"; h = client.pseudo_snap; }
                  else if (client.pseudo_insta) { p = "insta"; h = client.pseudo_insta; }
                  else if (client.phone) { p = "phone"; h = client.phone; }
                  else if (client.nickname) { p = "pseudo"; h = client.nickname; }
                  setClientId(client.id);
                  setVisitorPlatform(p);
                  setVisitorHandle(h);
                  setVisitorRegistered(true);
                  sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
                }
              }
            } catch {}
          }
        } else if (r.status === 410) {
          // Code expired — show renewal banner
          setExpiredCodeInfo({ tier: data.tier || "vip", pack: data.pack || "vip" });
        }
      })
      .catch(() => {});
  }, [searchParams, slug, accessChecked, visitorRegistered]);

  // Refresh on focus
  useEffect(() => {
    const onFocus = () => {
      fetch(`/api/uploads?model=${slug}`).then(r => r.json()).then(d => { if (d.uploads) setUploads(d.uploads); }).catch(e => console.error("[Profile] refresh uploads failed:", e));
      fetch(`/api/wall?model=${slug}`).then(r => r.json()).then(d => { if (d.posts) setWallPosts(d.posts); }).catch(e => console.error("[Profile] refresh wall failed:", e));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [slug]);

  // ── Register client (unified: wall + chat share same identity) ──
  const registerClient = useCallback(async (platform?: VisitorPlatform, handle?: string) => {
    const p = platform || visitorPlatform;
    const h = handle || visitorHandle;
    if (!p || !h.trim()) return null;
    const payload: Record<string, unknown> = { model: slug };
    if (p === "snap") payload.pseudo_snap = h.trim();
    else if (p === "insta") payload.pseudo_insta = h.trim();
    else if (p === "phone") payload.phone = h.trim();
    else payload.nickname = h.trim();

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.client) {
      setClientId(data.client.id);
      setVisitorPlatform(p);
      setVisitorHandle(h.trim());
      setVisitorRegistered(true);
      sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(data.client));
      return data.client;
    }
    return null;
  }, [visitorPlatform, visitorHandle, slug]);

  // ── Chat: poll messages ──
  useEffect(() => {
    if (!clientId) return;
    const fetchChat = () => {
      fetch(`/api/messages?model=${slug}&client_id=${clientId}`)
        .then(r => r.json())
        .then(d => {
          setChatMessages(((d.messages || []) as typeof chatMessages).reverse());
        })
        .catch(e => console.error("[Chat] poll error:", e));
    };
    fetchChat();
    const interval = chatOpen ? 5000 : 15000;
    const iv = setInterval(fetchChat, interval);
    return () => clearInterval(iv);
  }, [clientId, slug, chatOpen]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !clientId) return;
    const msgRes = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: slug, client_id: clientId, sender_type: "client", content: chatInput.trim() }),
    });
    if (!msgRes.ok) {
      console.error("[Chat] send failed:", await msgRes.text());
      return;
    }
    setChatInput("");
    const res = await fetch(`/api/messages?model=${slug}&client_id=${clientId}`);
    const d = await res.json();
    setChatMessages(((d.messages || []) as typeof chatMessages).reverse());
  };

  // ── Wall: post (auto-registers client if not yet) ──
  const submitWallPost = async () => {
    if (!visitorHandle.trim() || !visitorPlatform) return;
    if (!wallContent.trim()) return;
    setWallPosting(true);
    try {
      // Auto-register client if not yet registered
      let cId = clientId;
      if (!cId) {
        const client = await registerClient();
        if (client) cId = client.id;
      }

      const postRes = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: slug,
          pseudo: visitorHandle.trim(),
          content: wallContent.trim(),
          pseudo_snap: visitorPlatform === "snap" ? visitorHandle.trim() : null,
          pseudo_insta: visitorPlatform === "insta" ? visitorHandle.trim() : null,
          client_id: cId || null,
        }),
      });

      if (!postRes.ok) {
        const errData = await postRes.json().catch(() => ({ error: "Post failed" }));
        console.error("[Profile] wall post error:", errData);
        return;
      }

      const { post: newPost } = await postRes.json();
      setWallContent("");

      if (newPost) {
        setWallPosts(prev => [newPost, ...prev]);
      } else {
        const res = await fetch(`/api/wall?model=${slug}`);
        if (res.ok) { const d = await res.json(); setWallPosts(d.posts || []); }
      }
    } catch (err) { console.error("[Profile] wall post failed:", err); } finally {
      setWallPosting(false);
    }
  };

  // handleWallPhoto removed — visitors post text only

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  // Merge uploads + posts-with-media into gallery
  const postsAsGalleryItems: UploadedContent[] = posts
    .filter(p => p.media_url)
    .map(p => ({
      id: `post-${p.id}`,
      tier: (!p.tier_required || p.tier_required === "public") ? "promo" : p.tier_required,
      type: (p.media_type === "video" ? "video" : "photo") as "photo" | "video" | "reel",
      label: p.content || "",
      dataUrl: p.media_url!,
      uploadedAt: p.created_at,
      visibility: (!p.tier_required || p.tier_required === "public") ? "promo" as const : "pack" as const,
      tokenPrice: 0,
    }));
  const allGalleryItems = [...uploads, ...postsAsGalleryItems];
  const galleryItems = allGalleryItems.filter(u => galleryTier === "all" || u.tier === galleryTier || (galleryTier === "promo" && u.visibility === "promo"));
  const tierCounts = allGalleryItems.reduce((acc, u) => { acc[u.tier] = (acc[u.tier] || 0) + 1; return acc; }, {} as Record<string, number>);

  // ── Loading / 404 ──
  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="text-center fade-up">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
          </div>
          <h1 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Profile not found</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>This model doesn&apos;t exist or is no longer active.</p>
        </div>
      </div>
    );
  }

  if (loading || !model) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  const activePacks = displayPacks.filter(p => p.active);
  const unreadCount = chatMessages.filter(m => m.sender_type === "model").length;

  // ── Identity Gate: mandatory identification before browsing ──
  const handleGateRegistered = useCallback((client: Record<string, unknown>, platform: VisitorPlatform, handle: string) => {
    setClientId(client.id as string);
    setVisitorPlatform(platform);
    setVisitorHandle(handle);
    setVisitorRegistered(true);
    sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
  }, [slug]);

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      {/* Identity Gate — blocks browsing until visitor identifies */}
      {!visitorRegistered && !isModelLoggedIn && model && (
        <IdentityGate slug={slug} modelName={model.display_name} onRegistered={handleGateRegistered} />
      )}
      {/* Ambient gradient — animated pulse */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: `
          radial-gradient(ellipse 600px 400px at 15% 10%, rgba(230,51,41,0.05), transparent),
          radial-gradient(ellipse 500px 500px at 85% 80%, rgba(244,63,94,0.04), transparent),
          radial-gradient(ellipse 300px 300px at 50% 30%, rgba(124,58,237,0.03), transparent)
        `,
        animation: "ambientPulse 8s ease-in-out infinite alternate",
      }} />
      <style>{`
        @keyframes ambientPulse { 0% { opacity: 0.7; } 100% { opacity: 1; } }
        @keyframes heroGlow { 0%, 100% { box-shadow: 0 0 20px rgba(230,51,41,0.2), 0 0 60px rgba(230,51,41,0.05); } 50% { box-shadow: 0 0 30px rgba(230,51,41,0.35), 0 0 80px rgba(124,58,237,0.1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes countUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .profile-stagger-1 { animation: slideUp 0.5s ease-out 0.1s both; }
        .profile-stagger-2 { animation: slideUp 0.5s ease-out 0.2s both; }
        .profile-stagger-3 { animation: slideUp 0.5s ease-out 0.3s both; }
        .profile-stagger-4 { animation: slideUp 0.5s ease-out 0.4s both; }
        .stat-pop { animation: countUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .post-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .post-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
        @media (max-width: 768px) { .post-hover:hover { transform: none; box-shadow: none; } }
      `}</style>

      <div className="relative z-10">

        {/* ═══ TOP BAR ═══ */}
        <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between" style={{ backdropFilter: "blur(12px)", background: "rgba(var(--bg-rgb, 15,16,25), 0.7)" }}>
          <a href={isModelLoggedIn ? "/agence" : "/login"}
            className="w-8 h-8 rounded-lg flex items-center justify-center no-underline glass"
            style={{ border: "1px solid var(--border2)" }}>
            <Crown className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          </a>

          {isEditMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(230,51,41,0.12)", border: "1px solid rgba(230,51,41,0.25)" }}>
              <Pencil className="w-3 h-3" style={{ color: "var(--accent)" }} />
              <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>Edit Mode</span>
            </div>
          )}

          {isModelLoggedIn && !isEditMode && (
            <div className="flex items-center gap-1.5">
              <a href="/agence"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium no-underline glass cursor-pointer"
                style={{ border: "1px solid var(--border2)", color: "var(--text-secondary)" }}>
                <Edit3 className="w-3 h-3" /> Cockpit
              </a>
              <a href="/agence/settings"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium no-underline glass cursor-pointer"
                style={{ border: "1px solid var(--border2)", color: "var(--text-secondary)" }}>
                <Wifi className="w-3 h-3" /> Status
              </a>
            </div>
          )}
          {isModelLoggedIn && isEditMode && (
            <a href="/agence"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium no-underline glass cursor-pointer"
              style={{ border: "1px solid var(--border2)", color: "var(--text-secondary)" }}>
              <X className="w-3 h-3" /> Quitter
            </a>
          )}
        </div>

        {/* ═══ HERO ═══ */}
        <div className="relative profile-stagger-1">
          {/* Banner — taller on desktop */}
          <div className="h-36 sm:h-44 md:h-52 lg:h-60 relative overflow-hidden" style={{
            background: displayModel?.banner
              ? `url(${displayModel.banner}) center/cover`
              : "linear-gradient(135deg, rgba(244,63,94,0.2), rgba(230,51,41,0.15), rgba(124,58,237,0.1))",
          }}>
            {/* Gradient overlay for text readability — stronger at bottom */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(var(--bg-rgb, 15,16,25), 0.85) 0%, rgba(var(--bg-rgb, 15,16,25), 0.4) 40%, transparent 70%)" }} />
            {isEditMode && (
              <>
                <button onClick={() => bannerInputRef.current?.click()}
                  className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer transition-all hover:bg-black/30"
                  style={{ background: "rgba(0,0,0,0.15)" }}>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
                    <Camera className="w-4 h-4 text-white" />
                    <span className="text-xs font-medium text-white">Changer la bannière</span>
                  </div>
                </button>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              </>
            )}
          </div>

          <div className="max-w-2xl mx-auto px-4 -mt-14 sm:-mt-16 relative z-10">
            <div className="flex items-end gap-4 profile-stagger-2">
              {/* Avatar — animated glow */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl border-[3px] flex items-center justify-center text-2xl font-black overflow-hidden"
                  style={{
                    borderColor: "var(--bg)",
                    background: displayModel?.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                    color: "#fff",
                    animation: "heroGlow 3s ease-in-out infinite",
                  }}>
                  {displayModel?.avatar ? (
                    <img src={displayModel.avatar} alt={displayModel.display_name} className="w-full h-full object-cover" />
                  ) : displayModel?.display_name.charAt(0)}
                </div>
                {isEditMode ? (
                  <>
                    <button onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:bg-black/40"
                      style={{ background: "rgba(0,0,0,0.25)" }}>
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </>
                ) : (
                  displayModel?.online && <span className="online-dot absolute -bottom-0.5 -right-0.5" />
                )}
              </div>

              <div className="pb-1.5 flex-1 min-w-0">
                {isEditMode ? (
                  <>
                    {/* Status toggle ABOVE name in edit mode */}
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => updateEditField("online", !displayModel?.online)}
                        className="flex items-center gap-1 cursor-pointer"
                        style={{ color: displayModel?.online ? "var(--success)" : "var(--text-muted)" }}>
                        {displayModel?.online ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        <span className="text-[10px] font-medium">{displayModel?.online ? "Online" : "Offline"}</span>
                      </button>
                    </div>
                    <input
                      value={displayModel?.display_name || ""}
                      onChange={e => updateEditField("display_name", e.target.value)}
                      className="text-lg font-bold w-full bg-transparent outline-none rounded-lg px-2 py-1 -ml-2"
                      style={{ color: "var(--text)", border: "1px dashed var(--border3)" }}
                      placeholder="Display name"
                    />
                  </>
                ) : (
                  <>
                    {/* Online status ABOVE pseudo */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2 h-2 rounded-full" style={{
                        background: displayModel?.online ? "var(--success)" : "var(--text-muted)",
                        boxShadow: displayModel?.online ? "0 0 6px rgba(16,185,129,0.5)" : "none",
                      }} />
                      <span className="text-[10px] font-medium" style={{ color: displayModel?.online ? "var(--success)" : "var(--text-muted)" }}>
                        {displayModel?.online ? "En ligne" : "Hors ligne"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color: "var(--text)" }}>{displayModel?.display_name}</h1>
                      <span className="badge badge-success text-[10px]">Verified</span>
                    </div>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {displayModel?.status || `${uploads.length} media · ${posts.length} posts`}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Stats bar — animated counters */}
            {!isEditMode && (
              <div className="flex items-center gap-4 sm:gap-6 mt-4 mb-3 profile-stagger-3">
                {[
                  { label: "Posts", value: posts.length },
                  { label: "Media", value: uploads.length },
                  { label: "Packs", value: activePacks.length },
                  { label: "Fans", value: wallPosts.length },
                ].map((s, i) => (
                  <div key={s.label} className="stat-pop" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                    <span className="text-sm sm:text-base font-bold block" style={{ color: "var(--text)" }}>{s.value}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Skills / Psychological triggers — what the model offers */}
            {!isEditMode && (
              <div className="flex flex-wrap gap-1.5 mb-3 profile-stagger-3">
                {([
                  { label: "Contenu Exclusif", icon: Flame, color: "#F43F5E" },
                  { label: "Reponse Rapide", icon: Zap, color: "#F59E0B" },
                  { label: "Custom Content", icon: Palette, color: "#7C3AED" },
                  ...(activePacks.length > 0 ? [{ label: `${activePacks.length} Pack${activePacks.length > 1 ? "s" : ""}`, icon: Diamond, color: "#A78BFA" }] : []),
                  ...(uploads.length >= 10 ? [{ label: "Media Regulier", icon: Camera, color: "#10B981" }] : []),
                ] as { label: string; icon: LucideIcon; color: string }[]).map(skill => (
                  <span key={skill.label} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
                    style={{ background: `${skill.color}12`, color: skill.color, border: `1px solid ${skill.color}25` }}>
                    <skill.icon size={11} />
                    {skill.label}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {isEditMode ? (
              <div className="space-y-2 mb-4 fade-up">
                <input
                  value={displayModel?.status || ""}
                  onChange={e => updateEditField("status", e.target.value)}
                  className="w-full text-[11px] bg-transparent outline-none rounded-lg px-3 py-2"
                  style={{ color: "var(--text-muted)", border: "1px dashed var(--border3)" }}
                  placeholder="Status (ex: 3 media · 5 posts)"
                />
                <textarea
                  value={displayModel?.bio || ""}
                  onChange={e => updateEditField("bio", e.target.value)}
                  className="w-full text-xs leading-relaxed bg-transparent outline-none rounded-lg px-3 py-2 resize-none"
                  style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }}
                  placeholder="Bio..."
                  rows={3}
                />
              </div>
            ) : (
              displayModel?.bio && (
                <p className="text-xs leading-relaxed mb-3 fade-up" style={{ color: "var(--text-secondary)" }}>{displayModel.bio}</p>
              )
            )}

            {/* Unlock button (shown only in edit mode or when no tier and no gate) */}
            {!isEditMode && !unlockedTier && !activeCode && (
              <div className="mb-6 fade-up-1">
                <button onClick={() => setShowUnlock(true)}
                  className="w-full btn-gradient py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform">
                  <Lock className="w-3.5 h-3.5" /> Unlock Exclusive Content
                </button>
              </div>
            )}
            {isEditMode && <div className="mb-4" />}
          </div>
        </div>

        {/* ═══ SUBSCRIPTION STATUS BAR ═══ */}
        {visitorRegistered && !isModelLoggedIn && (
          <SubscriptionStatusBar
            visitorHandle={visitorHandle}
            visitorPlatform={visitorPlatform}
            unlockedTier={unlockedTier}
            activeCode={activeCode}
            onUpgrade={() => { setTab("shop"); }}
            onManage={() => { setShowSubscriptionPanel(true); }}
          />
        )}

        {/* ═══ EXPIRED CODE BANNER ═══ */}
        {expiredCodeInfo && !unlockedTier && (
          <div className="max-w-2xl mx-auto px-4 mb-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)" }}>
              <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "var(--warning)" }}>
                <AlertTriangle className="w-4 h-4" />
                <span>Ton code a expire</span>
              </div>
              <button
                onClick={() => { setTab("shop"); setExpiredCodeInfo(null); }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                style={{ background: "var(--warning)", color: "#fff" }}
              >
                Renouveler
              </button>
            </div>
          </div>
        )}

        {/* ═══ TABS ═══ */}
        <div className="max-w-2xl mx-auto px-4 mb-5 profile-stagger-4">
          <div className="segmented-control">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "active" : ""}
                style={{ transition: "all 0.2s ease" }}>
                <t.icon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <div className="max-w-2xl mx-auto px-4">

          {/* ── WALL ── */}
          {tab === "wall" && (
            <WallTab
              slug={slug}
              model={model}
              posts={posts}
              wallPosts={wallPosts}
              wallContent={wallContent}
              setWallContent={setWallContent}
              wallPosting={wallPosting}
              submitWallPost={submitWallPost}
              visitorPlatform={visitorPlatform}
              visitorHandle={visitorHandle}
              setVisitorRegistered={setVisitorRegistered}
              setClientId={setClientId}
              socialPopup={socialPopup}
              setSocialPopup={setSocialPopup}
              isModelLoggedIn={isModelLoggedIn}
              unlockedTier={unlockedTier}
              setShowUnlock={setShowUnlock}
              subscriberUsername={subscriberUsername}
              hasSubscriberIdentity={hasSubscriberIdentity}
              timeAgo={timeAgo}
              tierIncludes={tierIncludes}
            />
          )}

          {/* ── GALLERY ── */}
          {tab === "gallery" && (
            <GalleryTab
              isEditMode={isEditMode}
              isModelLoggedIn={isModelLoggedIn}
              uploads={uploads}
              galleryItems={galleryItems}
              galleryTier={galleryTier}
              setGalleryTier={setGalleryTier}
              tierCounts={tierCounts}
              unlockedTier={unlockedTier}
              purchasedItems={purchasedItems}
              handleCreditPurchase={handleCreditPurchase}
              setShowUnlock={setShowUnlock}
              subscriberUsername={subscriberUsername}
              hasSubscriberIdentity={hasSubscriberIdentity}
              editingUploadId={editingUploadId}
              setEditingUploadId={setEditingUploadId}
              editUploadData={editUploadData}
              setEditUploadData={setEditUploadData}
              handleDeleteMedia={handleDeleteMedia}
              handleUpdateMedia={handleUpdateMedia}
              handleAddMedia={handleAddMedia}
              mediaInputRef={mediaInputRef}
              uploading={uploading}
              tierIncludes={tierIncludes}
            />
          )}

          {/* ── SHOP ── */}
          {tab === "shop" && (
            <ShopTab
              clientId={clientId}
              unlockedTier={unlockedTier}
              isEditMode={isEditMode}
              packs={packs}
              activePacks={activePacks}
              displayPacks={displayPacks}
              expandedPack={expandedPack}
              setExpandedPack={setExpandedPack}
              shopSection={shopSection}
              setShopSection={setShopSection}
              clientBalance={clientBalance}
              topupLoading={topupLoading}
              handleTopup={handleTopup}
              setChatOpen={setChatOpen}
              handleUpdatePack={handleUpdatePack}
              handleDeletePack={handleDeletePack}
              handleAddPack={handleAddPack}
            />
          )}

        </div>

        {/* ═══ CREDIT PURCHASE MODAL ═══ */}
        {creditPurchaseModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => setCreditPurchaseModal(null)}>
            <div className="w-full max-w-sm rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
              style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 md:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
              </div>
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4" style={{ border: "2px solid var(--gold)" }}>
                  <img src={creditPurchaseModal.dataUrl} alt="" className="w-full h-full object-cover content-locked" style={{ filter: "blur(8px) brightness(0.8)" }} />
                </div>
                <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>Débloquer ce contenu</h3>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                  {creditPurchaseModal.label || "Contenu exclusif"}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-5" style={{ background: "rgba(230,51,41,0.1)", border: "1px solid rgba(230,51,41,0.2)" }}>
                  <Coins className="w-4 h-4" style={{ color: "var(--gold)" }} />
                  <span className="text-lg font-bold" style={{ color: "var(--gold)" }}>{creditPurchaseModal.tokenPrice}</span>
                  <span className="text-xs" style={{ color: "var(--gold2)" }}>crédits</span>
                </div>
                {!clientId ? (
                  <div className="space-y-3">
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Identifie-toi d&apos;abord pour acheter</p>
                    <button onClick={() => { setCreditPurchaseModal(null); setChatOpen(true); }}
                      className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer btn-gradient">
                      S&apos;identifier
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button onClick={confirmCreditPurchase}
                      className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
                      style={{ background: "var(--gold)", color: "#000" }}>
                      Acheter pour {creditPurchaseModal.tokenPrice} crédits
                    </button>
                    <button onClick={() => setCreditPurchaseModal(null)}
                      className="w-full py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUBSCRIPTION PANEL (self-service) ═══ */}
        {showSubscriptionPanel && clientId && (
          <SubscriptionPanel
            slug={slug}
            clientId={clientId}
            activeCode={activeCode}
            packs={packs}
            unlockedTier={unlockedTier}
            uploads={uploads}
            visitorPlatform={visitorPlatform}
            visitorHandle={visitorHandle}
            onCodeValidated={(code) => {
              setActiveCode(code);
              if (code.tier) setUnlockedTier(code.tier);
              sessionStorage.setItem(`heaven_access_${slug}`, JSON.stringify({
                tier: code.tier, expiresAt: code.expiresAt, code: code.code,
              }));
            }}
            onClose={() => setShowSubscriptionPanel(false)}
          />
        )}

        {/* ═══ UNLOCK SHEET (quick access from hero button) ═══ */}
        {showUnlock && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => setShowUnlock(false)}>
            <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
              style={{ background: "var(--surface)", maxHeight: "85vh", border: "1px solid var(--border2)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 md:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Choisis ton accès</h2>
                <button onClick={() => setShowUnlock(false)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
              <div className="px-6 pb-6 space-y-2.5 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                {activePacks.map(pack => {
                  const hex = TIER_HEX[pack.id] || pack.color;
                  const bonus = TIER_CREDIT_BONUS[pack.id];
                  const payUrl = pack.stripe_link || pack.wise_url;
                  return payUrl ? (
                    <a key={pack.id} href={payUrl} target="_blank" rel="noopener noreferrer"
                      className="block w-full p-4 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] no-underline"
                      style={{ background: `${hex}08`, border: `1px solid ${hex}20` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{TIER_META[pack.id]?.symbol}</span>
                          <span className="text-sm font-bold" style={{ color: hex }}>{pack.name}</span>
                        </div>
                        <span className="text-base font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                      </div>
                      <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: "var(--text-muted)" }}>
                        {pack.features.slice(0, 2).join(" · ")}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <ChevronRight className="w-3 h-3" style={{ color: hex }} />
                        <span className="text-[10px] font-semibold" style={{ color: hex }}>Payer maintenant</span>
                      </div>
                      {bonus && (bonus.multiplier > 1 || bonus.bonus) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Crown className="w-3 h-3" style={{ color: hex }} />
                          <span className="text-[10px] font-semibold" style={{ color: hex }}>
                            {bonus.multiplier > 1 ? `${bonus.label} crédits` : `🎁 ${bonus.bonus}`}
                          </span>
                        </div>
                      )}
                    </a>
                  ) : (
                    <div key={pack.id}
                      className="w-full p-4 rounded-xl text-left opacity-60"
                      style={{ background: `${hex}08`, border: `1px solid ${hex}20` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{TIER_META[pack.id]?.symbol}</span>
                          <span className="text-sm font-bold" style={{ color: hex }}>{pack.name}</span>
                        </div>
                        <span className="text-base font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                      </div>
                      <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: "var(--text-muted)" }}>
                        {pack.features.slice(0, 2).join(" · ")}
                      </p>
                      <p className="text-[10px] font-semibold" style={{ color: hex }}>Paiement bientot disponible</p>
                      {bonus && (bonus.multiplier > 1 || bonus.bonus) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Crown className="w-3 h-3" style={{ color: hex }} />
                          <span className="text-[10px] font-semibold" style={{ color: hex }}>
                            {bonus.multiplier > 1 ? `${bonus.label} crédits` : `🎁 ${bonus.bonus}`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PACK CHECKOUT MODAL ═══ */}
        {selectedPack && (() => {
          const hex = TIER_HEX[selectedPack.id] || selectedPack.color;
          const bonus = TIER_CREDIT_BONUS[selectedPack.id];
          return (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => setSelectedPack(null)}>
              <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
                style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
                onClick={e => e.stopPropagation()}>
                <div className="flex justify-center pt-3 md:hidden">
                  <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
                </div>

                {/* Pack hero */}
                <div className="p-6 text-center" style={{ background: `${hex}06` }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
                    style={{ background: `${hex}12`, border: `2px solid ${hex}30` }}>
                    {TIER_META[selectedPack.id]?.symbol}
                  </div>
                  <h3 className="text-lg font-bold mb-0.5" style={{ color: hex }}>{selectedPack.name}</h3>
                  <p className="text-2xl font-black tabular-nums" style={{ color: hex }}>{selectedPack.price}€</p>
                </div>

                <div className="px-6 pb-6">
                  {/* Features */}
                  <ul className="space-y-2 mb-4 pt-4">
                    {selectedPack.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Bonus */}
                  {bonus && (bonus.multiplier > 1 || bonus.bonus) && (
                    <div className="p-3.5 rounded-xl mb-4 flex items-center gap-3"
                      style={{ background: `${hex}08`, border: `1px dashed ${hex}20` }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                        style={{ background: `${hex}15`, color: hex }}>
                        {bonus.multiplier > 1 ? bonus.label : "🎁"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: hex }}>
                          {bonus.multiplier > 1 ? `Bonus ${bonus.label} sur les crédits` : "Bonus exclusif"}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{bonus.bonus}</p>
                      </div>
                    </div>
                  )}

                  {/* CTA — Payment link (Stripe preferred, Wise fallback) */}
                  {(selectedPack.stripe_link || selectedPack.wise_url) ? (
                    <>
                      <a href={selectedPack.stripe_link || selectedPack.wise_url} target="_blank" rel="noopener noreferrer"
                        className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 no-underline"
                        style={{ background: hex, color: "#fff" }}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        Payer {selectedPack.price}€
                      </a>
                      <p className="text-[10px] text-center mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        Paiement securise. L&apos;acces est active sous 15 min apres confirmation.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 opacity-50"
                        style={{ background: `${hex}15`, color: hex, border: `1px solid ${hex}20` }}>
                        Paiement bientot disponible
                      </div>
                      <p className="text-[10px] text-center mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        Le lien de paiement sera active prochainement.
                      </p>
                    </>
                  )}
                  <button onClick={() => setSelectedPack(null)}
                    className="w-full py-2 mt-2 rounded-xl text-xs font-medium cursor-pointer"
                    style={{ color: "var(--text-muted)" }}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ CHAT FLOATING BUBBLE ═══ */}
        {!isModelLoggedIn && model && (
          <>
            {/* Chat FAB */}
            {!chatOpen && (
              <button onClick={() => setChatOpen(true)}
                className="fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, var(--rose), var(--accent))",
                  boxShadow: "0 4px 20px rgba(230,51,41,0.4)",
                }}>
                <MessageCircle className="w-6 h-6 text-white" />
                {chatMessages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: "var(--success)", color: "#fff" }}>
                    {chatMessages.length}
                  </span>
                )}
              </button>
            )}

            {/* Chat panel — floating card */}
            {chatOpen && (
              <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50 rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border2)",
                  maxHeight: "min(500px, 70vh)",
                  animation: "slideUp 0.3s ease-out",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
                }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border2)", background: "var(--bg2)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                    style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                    {model.avatar ? (
                      <img src={model.avatar} alt="" className="w-full h-full object-cover" />
                    ) : model.display_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{model.display_name}</p>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{
                        background: model.online ? "var(--success)" : "var(--text-muted)",
                        boxShadow: model.online ? "0 0 4px rgba(16,185,129,0.5)" : "none",
                      }} />
                      <span className="text-[10px]" style={{ color: model.online ? "var(--success)" : "var(--text-muted)" }}>
                        {model.online ? "En ligne" : "Hors ligne"}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setChatOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                    style={{ background: "rgba(255,255,255,0.05)" }}>
                    <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>

                {/* Messages — visitor always identified via gate */}
                <div className="overflow-y-auto p-3 space-y-2" style={{ height: "min(320px, 45vh)" }}>
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Envoie un message a {model.display_name}</p>
                    </div>
                  ) : chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%] rounded-2xl px-3 py-2 text-[12px]"
                        style={{
                          background: msg.sender_type === "client" ? "rgba(230,51,41,0.15)" : "var(--bg3)",
                          color: "var(--text)",
                        }}>
                        {msg.content}
                        <p className="text-[10px] mt-0.5 opacity-40">{timeAgo(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {/* Input */}
                <div className="p-3 flex gap-2 shrink-0" style={{ borderTop: "1px solid var(--border2)" }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Message..." className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                    style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                  <button onClick={sendMessage}
                    className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer btn-gradient shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ SHOP TOAST ═══ */}
        {shopToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-slide-down"
            style={{ background: "var(--gold)", color: "#000" }}>
            <Coins className="w-3.5 h-3.5" />
            {shopToast}
          </div>
        )}

        {/* ═══ EDIT MODE TOAST ═══ */}
        {editToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-slide-down"
            style={{ background: "var(--accent)", color: "#000" }}>
            <Check className="w-3.5 h-3.5" />
            {editToast}
          </div>
        )}

        {/* ═══ EDIT MODE SAVE BAR ═══ */}
        {isEditMode && editDirty && (
          <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
            style={{ background: "var(--surface)", borderTop: "1px solid var(--border2)", boxShadow: "0 -4px 24px rgba(0,0,0,0.3)" }}>
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Modifications non sauvegardées
              </p>
              <div className="flex items-center gap-2">
                <button onClick={cancelEdits}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid var(--border2)" }}>
                  <RotateCcw className="w-3 h-3" /> Annuler
                </button>
                <button onClick={saveAllEdits} disabled={editSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#000" }}>
                  {editSaving ? (
                    <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ UPLOADING OVERLAY ═══ */}
        {uploading && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--text)" }}>Upload en cours...</p>
            </div>
          </div>
        )}

        {/* ═══ MOBILE BOTTOM NAV (hidden when save bar is showing) ═══ */}
        {!(isEditMode && editDirty) && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden safe-area-bottom glass-strong"
            style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center justify-around py-2">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer transition-all"
                  style={{ color: tab === t.id ? "var(--accent)" : "var(--text-muted)" }}>
                  <t.icon className="w-5 h-5" />
                  {tab === t.id && <span className="text-[10px] font-medium">{t.label}</span>}
                </button>
              ))}
            </div>
          </nav>
        )}

      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{text}</p>
    </div>
  );
}

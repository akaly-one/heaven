"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Heart, MessageCircle, Send, Lock, Image, Newspaper, ShoppingBag,
  Coins, Pin, Eye, Star, Camera, Video, Play, X, Check,
  Instagram, Ghost, ChevronRight, Crown, Plus, Edit3, Wifi,
  ImagePlus, Trash2, Save, RotateCcw, ToggleLeft, ToggleRight,
  Upload, Pencil, GripVertical,
} from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import { useScreenshotDetection } from "@/hooks/use-screenshot-detection";

// ── Types & Constants (centralized) ──
import type { ModelInfo, Post, PackConfig, UploadedContent, WallPost } from "@/types/heaven";
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

// ── Credit packs for top-up ──
const CREDIT_PACKS = [
  { credits: 10, price: 5 },
  { credits: 25, price: 10 },
  { credits: 50, price: 18 },
  { credits: 100, price: 30 },
];

// ── Tier bonus config ──
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
  const [tab, setTab] = useState<TabId>("wall");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Access link system: ?access=TOKEN unlocks content
  const [unlockedTier, setUnlockedTier] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  // Wall (public posts by visitors)
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [wallPseudo, setWallPseudo] = useState("");
  const [wallSnapHandle, setWallSnapHandle] = useState("");
  const [wallInstaHandle, setWallInstaHandle] = useState("");
  const [wallContent, setWallContent] = useState("");
  const [wallPosting, setWallPosting] = useState(false);
  const [pseudoConfirmed, setPseudoConfirmed] = useState(false);
  const [socialPopup, setSocialPopup] = useState<{ pseudo: string; snap?: string | null; insta?: string | null; x: number; y: number } | null>(null);

  // Chat
  const [clientId, setClientId] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState({ snap: "", insta: "" });
  const [chatMessages, setChatMessages] = useState<{ id: string; client_id: string; sender_type: string; content: string; created_at: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Unlock sheet
  const [showUnlock, setShowUnlock] = useState(false);

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
  const subscriberUsername = pseudo.snap || pseudo.insta || clientId?.slice(0, 8) || "visitor";
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
      if (saved) setClientId(JSON.parse(saved).id);
      const savedPseudo = sessionStorage.getItem(`heaven_wall_pseudo_${slug}`);
      if (savedPseudo) { setWallPseudo(savedPseudo); setPseudoConfirmed(true); }
      const savedSnap = sessionStorage.getItem(`heaven_wall_snap_${slug}`);
      if (savedSnap) setWallSnapHandle(savedSnap);
      const savedInsta = sessionStorage.getItem(`heaven_wall_insta_${slug}`);
      if (savedInsta) setWallInstaHandle(savedInsta);
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
  useEffect(() => {
    const accessToken = searchParams.get("access") || searchParams.get("code");
    if (!accessToken || !slug || accessChecked) return;
    setAccessChecked(true);

    fetch("/api/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate", code: accessToken, model: slug }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.code?.tier) {
          setUnlockedTier(data.code.tier);
          setTab("gallery");
          // Save in session so refresh doesn't lose access
          sessionStorage.setItem(`heaven_access_${slug}`, JSON.stringify({
            tier: data.code.tier,
            expiresAt: data.code.expiresAt,
            code: data.code.code,
          }));
        }
      })
      .catch(() => {});
  }, [searchParams, slug, accessChecked]);

  // Refresh on focus
  useEffect(() => {
    const onFocus = () => {
      fetch(`/api/uploads?model=${slug}`).then(r => r.json()).then(d => { if (d.uploads) setUploads(d.uploads); }).catch(e => console.error("[Profile] refresh uploads failed:", e));
      fetch(`/api/wall?model=${slug}`).then(r => r.json()).then(d => { if (d.posts) setWallPosts(d.posts); }).catch(e => console.error("[Profile] refresh wall failed:", e));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [slug]);

  // ── Chat: register client ──
  const registerClient = useCallback(async () => {
    if (!pseudo.snap && !pseudo.insta) return;
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pseudo_snap: pseudo.snap || null, pseudo_insta: pseudo.insta || null, model: slug }),
    });
    const data = await res.json();
    if (data.client) {
      setClientId(data.client.id);
      sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(data.client));
    }
  }, [pseudo, slug]);

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

  // ── Wall: post ──
  const submitWallPost = async () => {
    if (!wallPseudo.trim()) return;
    if (!wallContent.trim()) return;
    setWallPosting(true);
    try {
      sessionStorage.setItem(`heaven_wall_pseudo_${slug}`, wallPseudo.trim());
      if (wallSnapHandle.trim()) sessionStorage.setItem(`heaven_wall_snap_${slug}`, wallSnapHandle.trim());
      if (wallInstaHandle.trim()) sessionStorage.setItem(`heaven_wall_insta_${slug}`, wallInstaHandle.trim());

      const postRes = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: slug,
          pseudo: wallPseudo.trim(),
          content: wallContent.trim(),
          pseudo_snap: wallSnapHandle.trim() || null,
          pseudo_insta: wallInstaHandle.trim() || null,
        }),
      });

      if (!postRes.ok) {
        const errData = await postRes.json().catch(() => ({ error: "Post failed" }));
        console.error("[Profile] wall post error:", errData);
        return;
      }

      const { post: newPost } = await postRes.json();
      setWallContent("");

      // Optimistic: add new post to feed immediately, then refresh
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

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
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
                      <span className="badge badge-success text-[9px]">Verified</span>
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
                {[
                  { label: "Contenu Exclusif", icon: "🔥", color: "#F43F5E" },
                  { label: "Reponse Rapide", icon: "⚡", color: "#F59E0B" },
                  { label: "Custom Content", icon: "🎨", color: "#7C3AED" },
                  ...(activePacks.length > 0 ? [{ label: `${activePacks.length} Pack${activePacks.length > 1 ? "s" : ""}`, icon: "💎", color: "#A78BFA" }] : []),
                  ...(uploads.length >= 10 ? [{ label: "Media Regulier", icon: "📸", color: "#10B981" }] : []),
                ].map(skill => (
                  <span key={skill.label} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold"
                    style={{ background: `${skill.color}12`, color: skill.color, border: `1px solid ${skill.color}25` }}>
                    <span className="text-[10px]">{skill.icon}</span>
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

            {/* Access status or unlock button (hidden in edit mode) */}
            {!isEditMode && (
              <div className="mb-6 fade-up-1">
                {unlockedTier ? (
                  <div className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                    style={{ background: `${TIER_HEX[unlockedTier] || "var(--accent)"}15`, color: TIER_HEX[unlockedTier] || "var(--accent)", border: `1px solid ${TIER_HEX[unlockedTier] || "var(--accent)"}30` }}>
                    <Check className="w-3.5 h-3.5" />
                    Accès {TIER_META[unlockedTier]?.label || unlockedTier.toUpperCase()} actif
                  </div>
                ) : (
                  <button onClick={() => setShowUnlock(true)}
                    className="w-full btn-gradient py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform">
                    <Lock className="w-3.5 h-3.5" /> Unlock Exclusive Content
                  </button>
                )}
              </div>
            )}
            {isEditMode && <div className="mb-4" />}
          </div>
        </div>

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

          {/* ── WALL (public visitor posts) ── */}
          {tab === "wall" && (
            <div className="space-y-3 fade-up">
              {/* Composer */}
              <div className="card-premium p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: "rgba(230,51,41,0.12)", color: "var(--accent)" }}>
                    {wallPseudo ? wallPseudo.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    {!pseudoConfirmed ? (
                      <div className="space-y-2">
                        <input
                          value={wallPseudo}
                          onChange={e => setWallPseudo(e.target.value)}
                          placeholder="Your display name"
                          className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                          style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                          maxLength={30}
                          onKeyDown={e => { if (e.key === "Enter" && wallPseudo.trim()) setPseudoConfirmed(true); }}
                        />
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                            <Ghost className="w-3 h-3 shrink-0" style={{ color: "#FFFC00" }} />
                            <input
                              value={wallSnapHandle}
                              onChange={e => setWallSnapHandle(e.target.value)}
                              placeholder="Snap"
                              className="w-full text-xs outline-none bg-transparent"
                              style={{ color: "var(--text)" }}
                              maxLength={30}
                            />
                          </div>
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                            <Instagram className="w-3 h-3 shrink-0" style={{ color: "#E1306C" }} />
                            <input
                              value={wallInstaHandle}
                              onChange={e => setWallInstaHandle(e.target.value)}
                              placeholder="Insta"
                              className="w-full text-xs outline-none bg-transparent"
                              style={{ color: "var(--text)" }}
                              maxLength={30}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => setPseudoConfirmed(true)}
                          disabled={!wallPseudo.trim()}
                          className="w-full py-2 rounded-lg text-[10px] font-semibold cursor-pointer btn-gradient disabled:opacity-30 transition-opacity">
                          Continue
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>@{wallPseudo}</span>
                          <button onClick={() => setPseudoConfirmed(false)} className="text-[9px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>change</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={wallContent}
                            onChange={e => setWallContent(e.target.value)}
                            placeholder={`Say something to ${model.display_name}...`}
                            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                            style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                            maxLength={500}
                            onKeyDown={e => { if (e.key === "Enter" && wallContent.trim()) submitWallPost(); }}
                          />
                          <button onClick={submitWallPost} disabled={wallPosting || !wallContent.trim()}
                            className="px-4 py-2 rounded-lg text-[10px] font-semibold cursor-pointer btn-gradient disabled:opacity-30 shrink-0">
                            {wallPosting ? "..." : "Post"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Unified feed: model posts + wall posts sorted by date ── */}
              {(() => {
                // Merge model posts and wall posts into a single timeline
                const feedItems: Array<{ type: "model"; data: Post } | { type: "wall"; data: WallPost }> = [
                  ...posts.map(p => ({ type: "model" as const, data: p })),
                  ...wallPosts.map(w => ({ type: "wall" as const, data: w })),
                ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

                if (feedItems.length === 0) {
                  return <EmptyState icon={Newspaper} text="Be the first to leave a message!" />;
                }

                return feedItems.map((item, i) => {
                  if (item.type === "model") {
                    const post = item.data;
                    const postTier = post.tier_required || "public";
                    const mediaUnlocked = postTier === "public" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, postTier));
                    const tierMeta = TIER_META[postTier];
                    const tierHex = TIER_HEX[postTier] || "#64748B";
                    return (
                      <div key={`post-${post.id}`} className="card-premium overflow-hidden post-hover" style={{ animation: `slideUp 0.4s ease-out ${i * 0.06}s both` }}>
                        {post.pinned && (
                          <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
                            <Pin className="w-3 h-3" style={{ color: "var(--tier-gold)" }} />
                            <span className="text-[10px] font-medium" style={{ color: "var(--tier-gold)" }}>Pinned</span>
                          </div>
                        )}
                        <div className="flex items-start gap-3 p-4 pb-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                            {model.display_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{model.display_name}</p>
                              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>@{slug}</span>
                              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>·</span>
                              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</span>
                              {postTier !== "public" && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${tierHex}18`, color: tierHex }}>
                                  {tierMeta?.label || postTier}
                                </span>
                              )}
                            </div>

                            {post.content && (
                              <p className="text-[13px] sm:text-sm leading-relaxed mt-1.5 whitespace-pre-wrap" style={{ color: "var(--text)" }}>{post.content}</p>
                            )}

                            {post.media_url && (
                              mediaUnlocked ? (
                                <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                                  <div className="mt-2.5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border2)" }}>
                                    <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" />
                                  </div>
                                </ContentProtection>
                              ) : (
                                <div className="mt-2.5 rounded-xl overflow-hidden relative cursor-pointer" onClick={() => setShowUnlock(true)} style={{ border: "1px solid var(--border2)" }}>
                                  <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover content-locked" />
                                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)" }}>
                                    <div className="text-center">
                                      <Lock className="w-6 h-6 mx-auto mb-1.5" style={{ color: tierHex }} />
                                      <span className="text-xs font-bold" style={{ color: tierHex }}>{tierMeta?.label || postTier} Only</span>
                                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Unlock to view</p>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}

                            <div className="flex items-center gap-6 mt-3 mb-1">
                              <button className="flex items-center gap-1.5 text-[12px] cursor-pointer transition-colors hover:text-[#F43F5E] group/like" style={{ color: "var(--text-muted)" }}>
                                <Heart className="w-4 h-4 transition-transform group-hover/like:scale-110" fill={post.likes_count > 0 ? "#F43F5E" : "none"} style={{ color: post.likes_count > 0 ? "#F43F5E" : undefined }} />
                                <span>{post.likes_count || ""}</span>
                              </button>
                              <button className="flex items-center gap-1.5 text-[12px] cursor-pointer transition-colors hover:text-[#7C3AED] group/comment" style={{ color: "var(--text-muted)" }}>
                                <MessageCircle className="w-4 h-4 transition-transform group-hover/comment:scale-110" />
                                <span>{post.comments_count || ""}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Wall post — single-line: @pseudo message · time
                  const wp = item.data;
                  return (
                    <div key={`wall-${wp.id}`} className="card-premium px-4 py-3" style={{ animation: `slideUp 0.3s ease-out ${i * 0.04}s both` }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{ background: "rgba(167,139,250,0.12)", color: "var(--tier-platinum)" }}>
                          {wp.pseudo.charAt(0).toUpperCase()}
                        </div>
                        <button
                          className="text-[11px] font-semibold shrink-0 cursor-pointer hover:underline"
                          style={{ color: "var(--accent)" }}
                          onClick={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setSocialPopup({
                              pseudo: wp.pseudo,
                              snap: wp.pseudo_snap,
                              insta: wp.pseudo_insta,
                              x: rect.left,
                              y: rect.bottom + 4,
                            });
                          }}
                        >
                          @{wp.pseudo}
                        </button>
                        <p className="text-xs truncate flex-1 min-w-0" style={{ color: "var(--text-secondary)" }}>
                          {wp.content || ""}
                        </p>
                        <span className="text-[9px] shrink-0" style={{ color: "var(--text-muted)" }}>{timeAgo(wp.created_at)}</span>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Social popup — shows snap/insta on pseudo click */}
              {socialPopup && (
                <div className="fixed inset-0 z-[999]" onClick={() => setSocialPopup(null)}>
                  <div
                    className="absolute rounded-xl p-3 shadow-2xl space-y-2 min-w-[180px]"
                    style={{
                      left: Math.min(socialPopup.x, window.innerWidth - 200),
                      top: socialPopup.y,
                      background: "rgba(20,20,25,0.95)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid var(--border2)",
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="text-[11px] font-bold" style={{ color: "var(--text)" }}>@{socialPopup.pseudo}</p>
                    {socialPopup.snap && (
                      <div className="flex items-center gap-2">
                        <Ghost className="w-3.5 h-3.5" style={{ color: "#FFFC00" }} />
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{socialPopup.snap}</span>
                      </div>
                    )}
                    {socialPopup.insta && (
                      <div className="flex items-center gap-2">
                        <Instagram className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{socialPopup.insta}</span>
                      </div>
                    )}
                    {!socialPopup.snap && !socialPopup.insta && (
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>No social accounts linked</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── GALLERY ── */}
          {tab === "gallery" && (
            <div className="fade-up">
              {/* Pack folders — Instagram-style tab bar */}
              {!isEditMode && (
                <div className="flex mb-4 -mx-4 px-4" style={{ borderBottom: "1px solid var(--border2)" }}>
                  <button onClick={() => setGalleryTier("all")}
                    className="flex-1 py-2.5 text-center text-[11px] font-semibold cursor-pointer transition-all relative"
                    style={{ color: galleryTier === "all" ? "var(--text)" : "var(--text-muted)" }}>
                    All
                    {galleryTier === "all" && (
                      <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
                    )}
                  </button>
                  {(["vip", "gold", "diamond", "platinum"] as const).filter(k => tierCounts[k]).map(tier => {
                    const hex = TIER_HEX[tier];
                    return (
                      <button key={tier} onClick={() => setGalleryTier(tier)}
                        className="flex-1 py-2.5 text-center text-[11px] font-semibold cursor-pointer transition-all relative"
                        style={{ color: galleryTier === tier ? hex : "var(--text-muted)" }}>
                        {TIER_META[tier]?.symbol} {TIER_META[tier]?.label}
                        {galleryTier === tier && (
                          <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: hex }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Edit mode: header with add button */}
              {isEditMode && (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{uploads.length} médias</p>
                  <button onClick={() => mediaInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ background: "rgba(230,51,41,0.12)", color: "var(--accent)", border: "1px solid rgba(230,51,41,0.25)" }}
                    disabled={uploading}>
                    {uploading ? (
                      <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Ajouter
                  </button>
                  <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddMedia} />
                </div>
              )}

              {(isEditMode ? uploads : galleryItems).length === 0 ? (
                isEditMode ? (
                  <div className="text-center py-8">
                    <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Utilisez le bouton ci-dessus pour ajouter des medias</p>
                  </div>
                ) : (
                  <EmptyState icon={Image} text="No content available" />
                )
              ) : (
                <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                  {(isEditMode ? uploads : galleryItems).map((item, i) => {
                    const hex = TIER_HEX[item.tier] || "#64748B";
                    const isCreditItem = (item.tokenPrice || 0) > 0;
                    const isCreditUnlocked = purchasedItems.has(item.id);
                    const isUnlocked = item.visibility === "promo" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, item.tier)) || isCreditUnlocked;
                    return (
                      <div key={item.id} className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg"
                        style={{ animationDelay: `${i * 20}ms` }}>
                        {/* In edit mode, always show the image */}
                        {isEditMode || isUnlocked ? (
                          <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn} className="w-full h-full">
                            <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          </ContentProtection>
                        ) : isCreditItem ? (
                          <div className="w-full h-full flex items-center justify-center relative cursor-pointer"
                            onClick={() => handleCreditPurchase(item)}
                            style={{ background: `${hex}08` }}>
                            <img src={item.dataUrl} alt="" className="absolute inset-0 w-full h-full object-cover content-locked" />
                            <div className="relative text-center z-10">
                              <Coins className="w-5 h-5 mx-auto mb-1" style={{ color: "var(--gold)" }} />
                              <span className="text-[10px] font-bold block" style={{ color: "var(--gold)" }}>
                                {item.tokenPrice}
                              </span>
                              <span className="text-[7px] font-medium uppercase tracking-wide" style={{ color: "var(--gold2)" }}>
                                crédits
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center relative cursor-pointer" onClick={() => setShowUnlock(true)} style={{ background: `${hex}08` }}>
                            <div className="absolute inset-0 content-locked" style={{ background: `linear-gradient(135deg, ${hex}12, rgba(0,0,0,0.25))` }} />
                            <div className="relative text-center z-10">
                              <Lock className="w-4 h-4 mx-auto mb-0.5" style={{ color: hex }} />
                              <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: hex }}>
                                {TIER_META[item.tier]?.label}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Edit mode overlay: edit + delete */}
                        {isEditMode ? (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                            <button onClick={() => { setEditingUploadId(item.id); setEditUploadData({ tier: item.tier, label: item.label, visibility: item.visibility, tokenPrice: item.tokenPrice }); }}
                              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                              <Pencil className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button onClick={() => handleDeleteMedia(item.id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                              style={{ background: "rgba(239,68,68,0.4)", backdropFilter: "blur(4px)" }}>
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            {item.type === "video" ? <Play className="w-5 h-5 text-white" /> :
                             item.type === "reel" ? <Camera className="w-4 h-4 text-white" /> :
                             <Eye className="w-4 h-4 text-white" />}
                          </div>
                        )}

                        {/* Tier badge */}
                        {!isEditMode && isCreditItem && !isCreditUnlocked && !isModelLoggedIn && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(230,51,41,0.9)", color: "#000" }}>
                              {item.tokenPrice} 💰
                            </span>
                          </div>
                        )}

                        {isEditMode && (
                          <div className="absolute top-1.5 left-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: `${hex}CC`, color: "#fff" }}>
                              {TIER_META[item.tier]?.label || item.tier}
                            </span>
                          </div>
                        )}

                        {!isEditMode && item.type !== "photo" && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                              {item.type === "video" ? <Video className="w-2.5 h-2.5 inline" /> : "REEL"}
                            </span>
                          </div>
                        )}

                        {!isEditMode && item.isNew && (
                          <div className="absolute top-1.5 left-1.5">
                            <span className="badge badge-success text-[7px]">NEW</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Edit Upload Sheet ── */}
              {isEditMode && editingUploadId && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => { setEditingUploadId(null); setEditUploadData({}); }}>
                  <div className="w-full max-w-sm rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
                    style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
                    onClick={e => e.stopPropagation()}>
                    <div className="flex justify-center pt-3 md:hidden">
                      <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
                    </div>
                    <div className="p-5 space-y-4">
                      <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Modifier le média</h3>

                      {/* Label */}
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Label</label>
                        <input value={editUploadData.label || ""} onChange={e => setEditUploadData(prev => ({ ...prev, label: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                      </div>

                      {/* Tier */}
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Tier</label>
                        <div className="flex gap-1.5">
                          {Object.entries(TIER_HEX).map(([tier, hex]) => (
                            <button key={tier} onClick={() => setEditUploadData(prev => ({ ...prev, tier: tier as UploadedContent["tier"] }))}
                              className="flex-1 py-2 rounded-lg text-[10px] font-semibold cursor-pointer transition-all"
                              style={{
                                background: editUploadData.tier === tier ? `${hex}20` : "rgba(255,255,255,0.03)",
                                color: editUploadData.tier === tier ? hex : "var(--text-muted)",
                                border: `1px solid ${editUploadData.tier === tier ? `${hex}40` : "var(--border2)"}`,
                              }}>
                              {TIER_META[tier]?.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Visibility */}
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Visibilité</label>
                        <div className="flex gap-1.5">
                          {(["pack", "promo", "credits"] as const).map(vis => (
                            <button key={vis} onClick={() => setEditUploadData(prev => ({ ...prev, visibility: vis === "credits" ? "pack" : vis, tokenPrice: vis === "credits" ? (prev.tokenPrice || 5) : 0 }))}
                              className="flex-1 py-2 rounded-lg text-[10px] font-semibold cursor-pointer transition-all"
                              style={{
                                background: (vis === "credits" ? (editUploadData.tokenPrice || 0) > 0 : editUploadData.visibility === vis && !(editUploadData.tokenPrice || 0)) ? "rgba(230,51,41,0.12)" : "rgba(255,255,255,0.03)",
                                color: (vis === "credits" ? (editUploadData.tokenPrice || 0) > 0 : editUploadData.visibility === vis && !(editUploadData.tokenPrice || 0)) ? "var(--accent)" : "var(--text-muted)",
                                border: `1px solid ${(vis === "credits" ? (editUploadData.tokenPrice || 0) > 0 : editUploadData.visibility === vis && !(editUploadData.tokenPrice || 0)) ? "rgba(230,51,41,0.25)" : "var(--border2)"}`,
                              }}>
                              {vis === "pack" ? "Privé" : vis === "promo" ? "Public" : "Crédits"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Credit price */}
                      {(editUploadData.tokenPrice || 0) > 0 && (
                        <div>
                          <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Prix crédits</label>
                          <div className="flex gap-1.5">
                            {[3, 5, 10, 20, 50].map(p => (
                              <button key={p} onClick={() => setEditUploadData(prev => ({ ...prev, tokenPrice: p }))}
                                className="flex-1 py-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                style={{
                                  background: editUploadData.tokenPrice === p ? "rgba(230,51,41,0.15)" : "rgba(255,255,255,0.03)",
                                  color: editUploadData.tokenPrice === p ? "var(--gold)" : "var(--text-muted)",
                                  border: `1px solid ${editUploadData.tokenPrice === p ? "rgba(230,51,41,0.3)" : "var(--border2)"}`,
                                }}>
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setEditingUploadId(null); setEditUploadData({}); }}
                          className="flex-1 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                          style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                          Annuler
                        </button>
                        <button onClick={() => handleUpdateMedia(editingUploadId, editUploadData)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                          style={{ background: "var(--accent)", color: "#000" }}>
                          Sauvegarder
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SHOP ── */}
          {tab === "shop" && (
            <div className="space-y-4 fade-up">

              {/* Client balance bar */}
              {clientId && (
                <div className="card-premium p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(230,51,41,0.12)" }}>
                      <Coins className="w-4.5 h-4.5" style={{ color: "var(--gold)" }} />
                    </div>
                    <div>
                      <p className="text-lg font-black tabular-nums" style={{ color: "var(--gold)" }}>{clientBalance}</p>
                      <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Crédits disponibles</p>
                    </div>
                  </div>
                  {unlockedTier && TIER_CREDIT_BONUS[unlockedTier]?.multiplier > 1 && (
                    <span className="badge text-[9px] font-bold" style={{ background: `${TIER_HEX[unlockedTier]}15`, color: TIER_HEX[unlockedTier] }}>
                      {TIER_CREDIT_BONUS[unlockedTier].label} bonus
                    </span>
                  )}
                </div>
              )}

              {/* Sub-tabs: Packs | Crédits */}
              <div className="flex gap-2">
                <button onClick={() => setShopSection("packs")}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: shopSection === "packs" ? "rgba(230,51,41,0.1)" : "rgba(255,255,255,0.03)",
                    color: shopSection === "packs" ? "var(--accent)" : "var(--text-muted)",
                    border: `1px solid ${shopSection === "packs" ? "rgba(230,51,41,0.25)" : "var(--border2)"}`,
                  }}>
                  <ShoppingBag className="w-3.5 h-3.5" /> Packs
                </button>
                <button onClick={() => setShopSection("credits")}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: shopSection === "credits" ? "rgba(230,51,41,0.1)" : "rgba(255,255,255,0.03)",
                    color: shopSection === "credits" ? "var(--gold)" : "var(--text-muted)",
                    border: `1px solid ${shopSection === "credits" ? "rgba(230,51,41,0.25)" : "var(--border2)"}`,
                  }}>
                  <Coins className="w-3.5 h-3.5" /> Crédits
                </button>
              </div>

              {/* ──── PACKS SECTION — Scrollable tiles ──── */}
              {shopSection === "packs" && (
                <div>
                  {(isEditMode ? displayPacks : activePacks).length === 0 ? (
                    <EmptyState icon={ShoppingBag} text="No packs available" />
                  ) : (
                    <>
                      {/* Horizontal scrollable tiles */}
                      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
                        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                        {(isEditMode ? displayPacks : activePacks).map((pack, i) => {
                          const hex = TIER_HEX[pack.id] || pack.color;
                          const isSelected = expandedPack === pack.id;
                          const isCurrentTier = unlockedTier === pack.id;
                          return (
                            <button
                              key={pack.id}
                              onClick={() => setExpandedPack(isSelected ? null : pack.id)}
                              className="snap-center shrink-0 relative overflow-hidden rounded-2xl cursor-pointer group"
                              style={{
                                width: isSelected ? "180px" : "140px",
                                height: isSelected ? "200px" : "170px",
                                background: isSelected ? `linear-gradient(160deg, ${hex}25, ${hex}08)` : "var(--bg2)",
                                border: `${isSelected ? "2px" : "1px"} solid ${isSelected ? `${hex}50` : "var(--border2)"}`,
                                transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                transform: isSelected ? "scale(1.05)" : "scale(1)",
                                boxShadow: isSelected ? `0 8px 32px ${hex}30, 0 0 0 1px ${hex}20` : "none",
                                animation: `slideUp 0.4s ease-out ${i * 0.08}s both`,
                              }}>
                              {/* Top glow line */}
                              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                                background: `linear-gradient(90deg, transparent, ${hex}, transparent)`,
                                opacity: isSelected ? 1 : 0.3,
                                transition: "opacity 0.3s",
                              }} />

                              {/* Badge */}
                              {pack.badge && (
                                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[7px] font-bold"
                                  style={{ background: `${hex}20`, color: hex }}>
                                  {pack.badge}
                                </div>
                              )}

                              {/* Active indicator */}
                              {isCurrentTier && (
                                <div className="absolute top-2 left-2 w-2 h-2 rounded-full" style={{ background: "var(--success)", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }} />
                              )}

                              {/* Content */}
                              <div className="flex flex-col items-center justify-center h-full px-3 py-4 text-center">
                                <div className="rounded-xl flex items-center justify-center mb-2"
                                  style={{
                                    width: isSelected ? "48px" : "40px",
                                    height: isSelected ? "48px" : "40px",
                                    fontSize: isSelected ? "24px" : "20px",
                                    background: `${hex}15`,
                                    border: `1px solid ${hex}30`,
                                    transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                  }}>
                                  {TIER_META[pack.id]?.symbol}
                                </div>
                                <h3 className="font-bold truncate w-full" style={{
                                  color: hex,
                                  fontSize: isSelected ? "14px" : "12px",
                                  transition: "font-size 0.3s",
                                }}>{pack.name}</h3>
                                <p className="font-black tabular-nums mt-1" style={{
                                  color: hex,
                                  fontSize: isSelected ? "24px" : "18px",
                                  transition: "font-size 0.3s ease",
                                }}>{pack.price}€</p>
                                {isCurrentTier && (
                                  <span className="text-[8px] font-bold uppercase mt-0.5" style={{ color: "var(--success)" }}>Actif</span>
                                )}
                                {!isCurrentTier && isSelected && (
                                  <span className="text-[8px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>Voir details ↓</span>
                                )}
                              </div>

                              {/* Bottom pulse on hover */}
                              <div className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100" style={{
                                background: `linear-gradient(90deg, transparent, ${hex}, transparent)`,
                                transition: "opacity 0.3s",
                              }} />
                            </button>
                          );
                        })}
                      </div>

                      {/* Expanded pack detail panel */}
                      {expandedPack && !isEditMode && (() => {
                        const pack = activePacks.find(p => p.id === expandedPack);
                        if (!pack) return null;
                        const hex = TIER_HEX[pack.id] || pack.color;
                        const tierBonus = TIER_CREDIT_BONUS[pack.id];
                        const isCurrentTier = unlockedTier === pack.id;
                        return (
                          <div className="mt-3 rounded-2xl overflow-hidden relative" style={{
                            background: "var(--bg2)",
                            border: `1px solid ${hex}30`,
                            animation: "slideUp 0.35s ease-out",
                          }}>
                            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${hex}, transparent)` }} />

                            <div className="p-5">
                              {/* Header recap */}
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                  style={{ background: `${hex}12`, border: `1px solid ${hex}25` }}>
                                  {TIER_META[pack.id]?.symbol}
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-base font-bold" style={{ color: hex }}>{pack.name}</h3>
                                  {pack.badge && <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>{pack.badge}</span>}
                                </div>
                                <span className="text-2xl font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                              </div>

                              {/* Features — staggered */}
                              <ul className="space-y-2 mb-4">
                                {pack.features.map((f, j) => (
                                  <li key={j} className="flex items-center gap-2.5 text-[12px]"
                                    style={{ color: "var(--text-secondary)", animation: `slideUp 0.3s ease-out ${j * 0.04}s both` }}>
                                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} />
                                    {f}
                                  </li>
                                ))}
                              </ul>

                              {/* Bonus */}
                              {tierBonus && (tierBonus.multiplier > 1 || tierBonus.bonus) && (
                                <div className="flex items-center gap-2.5 p-3 rounded-xl mb-4"
                                  style={{ background: `${hex}08`, border: `1px dashed ${hex}20` }}>
                                  <Crown className="w-4 h-4 shrink-0" style={{ color: hex }} />
                                  <p className="text-[11px] font-semibold" style={{ color: hex }}>
                                    {tierBonus.multiplier > 1 ? `Bonus ${tierBonus.label} — ${tierBonus.bonus}` : `🎁 ${tierBonus.bonus}`}
                                  </p>
                                </div>
                              )}

                              {/* CTA */}
                              {isCurrentTier ? (
                                <div className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                                  style={{ background: `${hex}10`, color: hex, border: `1px solid ${hex}20` }}>
                                  <Check className="w-4 h-4" /> Pack actif
                                </div>
                              ) : (pack.stripe_link || pack.wise_url) ? (
                                <a href={pack.stripe_link || pack.wise_url} target="_blank" rel="noopener noreferrer"
                                  className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 no-underline"
                                  style={{ background: hex, color: "#fff" }}>
                                  Payer {pack.price}€{pack.stripe_link ? "" : " via Wise"}
                                  <ChevronRight className="w-4 h-4" />
                                </a>
                              ) : (
                                <div className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 opacity-50"
                                  style={{ background: `${hex}15`, color: hex, border: `1px solid ${hex}20` }}>
                                  Paiement bientot disponible
                                </div>
                              )}
                              {!isCurrentTier && (pack.stripe_link || pack.wise_url) && (
                                <p className="text-[9px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
                                  Paiement securise · Acces active sous 15 min
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Edit mode: full cards (unchanged) */}
                      {isEditMode && (
                        <div className="space-y-3 mt-3">
                          {displayPacks.map((pack) => {
                            const hex = TIER_HEX[pack.id] || pack.color;
                            const tierBonus = TIER_CREDIT_BONUS[pack.id];
                            return (
                              <div key={pack.id} className="card-premium relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${hex}, transparent)`, opacity: 0.5 }} />
                                <div className="p-5">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                        style={{ background: `${hex}12`, border: `1px solid ${hex}25` }}>
                                        {TIER_META[pack.id]?.symbol}
                                      </div>
                                      <div>
                                        <input value={pack.name} onChange={e => handleUpdatePack(pack.id, { name: e.target.value })}
                                          className="text-sm font-bold bg-transparent outline-none w-full rounded px-1"
                                          style={{ color: hex, border: "1px dashed var(--border3)" }} />
                                        {pack.badge && <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{pack.badge}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <input value={pack.price} onChange={e => handleUpdatePack(pack.id, { price: Number(e.target.value) || 0 })}
                                          type="number" className="w-16 text-right text-xl font-black tabular-nums bg-transparent outline-none rounded px-1"
                                          style={{ color: hex, border: "1px dashed var(--border3)" }} />
                                        <span className="text-xl font-black" style={{ color: hex }}>€</span>
                                      </div>
                                      <button onClick={() => handleDeletePack(pack.id)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                        style={{ background: "rgba(239,68,68,0.1)" }}>
                                        <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Features */}
                                  <div className="space-y-1.5 mb-3">
                                    {pack.features.map((f, j) => (
                                      <div key={j} className="flex items-center gap-2">
                                        <Check className="w-3 h-3 shrink-0" style={{ color: hex }} />
                                        <input value={f} onChange={e => {
                                          const newFeatures = [...pack.features];
                                          newFeatures[j] = e.target.value;
                                          handleUpdatePack(pack.id, { features: newFeatures });
                                        }}
                                          className="flex-1 text-[11px] bg-transparent outline-none rounded px-1 py-0.5"
                                          style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }} />
                                        <button onClick={() => {
                                          const newFeatures = pack.features.filter((_, idx) => idx !== j);
                                          handleUpdatePack(pack.id, { features: newFeatures });
                                        }}
                                          className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                    <button onClick={() => handleUpdatePack(pack.id, { features: [...pack.features, ""] })}
                                      className="flex items-center gap-1 text-[10px] cursor-pointer"
                                      style={{ color: "var(--text-muted)" }}>
                                      <Plus className="w-3 h-3" /> Ajouter
                                    </button>
                                  </div>

                                  {/* Bonus */}
                                  {tierBonus && (tierBonus.multiplier > 1 || tierBonus.bonus) && (
                                    <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3"
                                      style={{ background: `${hex}08`, border: `1px dashed ${hex}20` }}>
                                      <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} />
                                      <p className="text-[10px] font-semibold" style={{ color: hex }}>
                                        {tierBonus.multiplier > 1 ? `Bonus ${tierBonus.label} — ${tierBonus.bonus}` : `🎁 ${tierBonus.bonus}`}
                                      </p>
                                    </div>
                                  )}

                                  {/* Payment links + Toggle */}
                                  <div className="space-y-2">
                                    <div>
                                      <label className="text-[9px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                                        Lien Stripe (paiement via SQWENSY)
                                      </label>
                                      <input
                                        value={pack.stripe_link || ""}
                                        onChange={e => handleUpdatePack(pack.id, { stripe_link: e.target.value })}
                                        placeholder="https://sqwensy.com/p/..."
                                        className="w-full text-[11px] bg-transparent outline-none rounded-lg px-3 py-2"
                                        style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                                        Lien Wise (alternatif)
                                      </label>
                                      <input
                                        value={pack.wise_url || ""}
                                        onChange={e => handleUpdatePack(pack.id, { wise_url: e.target.value })}
                                        placeholder="https://wise.com/pay/..."
                                        className="w-full text-[11px] bg-transparent outline-none rounded-lg px-3 py-2"
                                        style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }}
                                      />
                                    </div>
                                    <button onClick={() => handleUpdatePack(pack.id, { active: !pack.active })}
                                      className="flex items-center gap-1.5 cursor-pointer"
                                      style={{ color: pack.active ? "var(--success)" : "var(--text-muted)" }}>
                                      {pack.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                      <span className="text-[10px] font-medium">{pack.active ? "Actif" : "Inactif"}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Pack button (edit mode) */}
                      {isEditMode && (
                        <button onClick={handleAddPack}
                          className="w-full mt-3 py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                          style={{ border: "2px dashed var(--border3)", background: "rgba(255,255,255,0.02)" }}>
                          <Plus className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Ajouter un pack</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ──── CREDITS SECTION ──── */}
              {shopSection === "credits" && (
                <div className="space-y-3">
                  {/* Multiplier info */}
                  {unlockedTier && TIER_CREDIT_BONUS[unlockedTier] && (
                    <div className="card-premium p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, var(--gold), transparent)`, opacity: 0.4 }} />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
                          style={{ background: `${TIER_HEX[unlockedTier]}15`, color: TIER_HEX[unlockedTier] }}>
                          {TIER_CREDIT_BONUS[unlockedTier].multiplier > 1 ? TIER_CREDIT_BONUS[unlockedTier].label : TIER_META[unlockedTier]?.symbol}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                            {TIER_CREDIT_BONUS[unlockedTier].multiplier > 1
                              ? `Ton pack ${TIER_META[unlockedTier]?.label} te donne ${TIER_CREDIT_BONUS[unlockedTier].label} sur chaque recharge`
                              : TIER_CREDIT_BONUS[unlockedTier].bonus
                                ? `Ton pack ${TIER_META[unlockedTier]?.label} inclut un bonus spécial`
                                : `Pack ${TIER_META[unlockedTier]?.label} actif`
                            }
                          </p>
                          {TIER_CREDIT_BONUS[unlockedTier].bonus && (
                            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{TIER_CREDIT_BONUS[unlockedTier].bonus}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!unlockedTier && (
                    <div className="card-premium p-4 text-center">
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                        Prends un pack pour débloquer des bonus crédits
                      </p>
                      <div className="flex items-center justify-center gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span style={{ color: TIER_HEX.platinum }}>♛ Platinum = x3</span>
                        <span style={{ color: TIER_HEX.diamond }}>♦ Diamond = x2</span>
                        <span style={{ color: TIER_HEX.gold }}>★ Gold = 🎁 Nude</span>
                      </div>
                      <button onClick={() => setShopSection("packs")}
                        className="mt-3 px-4 py-2 rounded-xl text-[11px] font-semibold cursor-pointer btn-gradient">
                        Voir les packs
                      </button>
                    </div>
                  )}

                  {/* Credit packs */}
                  {!clientId ? (
                    <div className="card-premium p-5 text-center">
                      <Coins className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--gold)", opacity: 0.5 }} />
                      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Identifie-toi pour acheter des crédits</p>
                      <button onClick={() => setChatOpen(true)}
                        className="px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer btn-gradient">
                        S&apos;identifier
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {CREDIT_PACKS.map((cp, i) => {
                        const mult = TIER_CREDIT_BONUS[unlockedTier || ""]?.multiplier || 1;
                        const finalCredits = cp.credits * mult;
                        const hasBonus = mult > 1;
                        return (
                          <button key={i} onClick={() => handleTopup(cp.credits, cp.price)} disabled={topupLoading}
                            className="card-premium p-4 text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 relative overflow-hidden"
                            style={{ animationDelay: `${i * 40}ms` }}>
                            {hasBonus && (
                              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, var(--gold), transparent)` }} />
                            )}
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Coins className="w-4 h-4" style={{ color: "var(--gold)" }} />
                              <span className="text-xl font-black tabular-nums" style={{ color: "var(--gold)" }}>{finalCredits}</span>
                            </div>
                            {hasBonus && (
                              <p className="text-[8px] font-bold mb-1" style={{ color: TIER_HEX[unlockedTier || ""] }}>
                                {cp.credits} × {mult} = {finalCredits}
                              </p>
                            )}
                            <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>crédits</p>
                            <div className="mt-2 py-1.5 rounded-lg text-[11px] font-bold"
                              style={{ background: "rgba(230,51,41,0.08)", color: "var(--gold)", border: "1px solid rgba(230,51,41,0.15)" }}>
                              {cp.price}€
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* What can you buy with credits */}
                  <div className="pt-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      Avec tes crédits tu peux
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { icon: "📸", text: "Débloquer des photos & vidéos exclusives" },
                        { icon: "🎨", text: "Commander du contenu personnalisé" },
                        { icon: "💬", text: "Envoyer des messages prioritaires" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                          <span className="text-sm">{item.icon}</span>
                          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                        <span className="text-[9px] font-semibold" style={{ color: hex }}>Payer maintenant</span>
                      </div>
                      {bonus && (bonus.multiplier > 1 || bonus.bonus) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Crown className="w-3 h-3" style={{ color: hex }} />
                          <span className="text-[9px] font-semibold" style={{ color: hex }}>
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
                      <p className="text-[9px] font-semibold" style={{ color: hex }}>Paiement bientot disponible</p>
                      {bonus && (bonus.multiplier > 1 || bonus.bonus) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Crown className="w-3 h-3" style={{ color: hex }} />
                          <span className="text-[9px] font-semibold" style={{ color: hex }}>
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
                      <p className="text-[9px] text-center mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        Paiement securise. L&apos;acces est active sous 15 min apres confirmation.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 opacity-50"
                        style={{ background: `${hex}15`, color: hex, border: `1px solid ${hex}20` }}>
                        Paiement bientot disponible
                      </div>
                      <p className="text-[9px] text-center mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
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
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center"
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
                      <span className="text-[9px]" style={{ color: model.online ? "var(--success)" : "var(--text-muted)" }}>
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

                {!clientId ? (
                  <div className="p-5 space-y-3">
                    <p className="text-xs text-center font-medium" style={{ color: "var(--text-muted)" }}>Identifie-toi pour discuter</p>
                    <div className="relative">
                      <Ghost className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      <input value={pseudo.snap} onChange={e => setPseudo(p => ({ ...p, snap: e.target.value }))}
                        placeholder="Pseudo Snapchat" className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs outline-none"
                        style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    </div>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      <input value={pseudo.insta} onChange={e => setPseudo(p => ({ ...p, insta: e.target.value }))}
                        placeholder="Pseudo Instagram" className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs outline-none"
                        style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    </div>
                    <button onClick={registerClient} disabled={!pseudo.snap && !pseudo.insta}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer btn-gradient disabled:opacity-30">
                      Commencer
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Messages */}
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
                            <p className="text-[8px] mt-0.5 opacity-40">{timeAgo(msg.created_at)}</p>
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
                  </>
                )}
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

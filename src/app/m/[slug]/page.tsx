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
import { ThemeToggle } from "@/components/theme-toggle";

// ── Types & Constants (centralized) ──
import type { ModelInfo, Post, PackConfig, UploadedContent, WallPost, AccessCode, VisitorPlatform } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

interface ModelAuth {
  role: string; model_slug?: string; display_name?: string; token?: string;
}
const TABS = [
  { id: "gallery", label: "Portfolio", icon: Image },
  { id: "feed", label: "Feed", icon: Newspaper },
  { id: "shop", label: "Boutique", icon: ShoppingBag },
] as const;
type TabId = typeof TABS[number]["id"];


// ── Platform icons for header ──
const PLATFORMS_MAP: Record<string, { color: string; prefix: string }> = {
  instagram: { color: "#C13584", prefix: "https://instagram.com/" },
  snapchat: { color: "#997A00", prefix: "https://snapchat.com/add/" },
  onlyfans: { color: "#008CCF", prefix: "https://onlyfans.com/" },
  fanvue: { color: "#6D28D9", prefix: "https://fanvue.com/" },
  tiktok: { color: "#333", prefix: "https://tiktok.com/@" },
  mym: { color: "#CC2952", prefix: "https://mym.fans/" },
};

// ── Live countdown badge ──
function CountdownBadge({ tier, expiresAt }: { tier: string; expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpiring, setIsExpiring] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("expiré"); setIsExpiring(true); return; }
      setIsExpiring(diff < 600000); // < 10 min
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) setTimeLeft(`${Math.floor(h / 24)}j ${h % 24}h`);
      else if (h > 0) setTimeLeft(`${h}h${m.toString().padStart(2, "0")}`);
      else setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono"
      style={{
        background: isExpiring ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
        color: isExpiring ? "#EF4444" : "#10B981",
        animation: isExpiring ? "pulse 1s infinite" : "none",
      }}>
      {tier.toUpperCase()} {timeLeft}
    </span>
  );
}

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
      if (hash === "gallery" || hash === "shop" || hash === "wall" || hash === "feed") return hash as TabId;
    }
    return "gallery";
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
  // socialPopup removed — wall tab was merged into feed

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

  // Purchases & shop
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [shopSection, setShopSection] = useState<"packs" | "credits">("packs");
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<PackConfig | null>(null);
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
    try {
      const url = await uploadToCloudinary(file, `heaven/${slug}/avatar`);
      if (url) {
        // Update display immediately
        setModel(prev => prev ? { ...prev, avatar: url } : prev);
        updateEditField("avatar", url);
        // Try to save to DB (non-blocking)
        fetch(`/api/models/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: url }),
        }).then(res => {
          if (res.ok) {
            setEditDirty(false);
            setEditToast("Avatar sauvegarde !");
          } else {
            setEditToast("Photo mise a jour (sync DB en attente)");
          }
          setTimeout(() => setEditToast(null), 3000);
        }).catch(() => {
          setEditToast("Photo mise a jour localement");
          setTimeout(() => setEditToast(null), 3000);
        });
      } else {
        setEditToast("Erreur upload photo");
        setTimeout(() => setEditToast(null), 3000);
      }
    } catch {
      setEditToast("Erreur");
      setTimeout(() => setEditToast(null), 3000);
    }
    setUploading(false);
  }, [slug, uploadToCloudinary, updateEditField]);

  // ── Edit mode: handle banner upload ──
  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, `heaven/${slug}/banner`);
      if (url) {
        setModel(prev => prev ? { ...prev, banner: url } : prev);
        updateEditField("banner", url);
        fetch(`/api/models/${slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banner: url }),
        }).then(res => {
          if (res.ok) { setEditDirty(false); setEditToast("Banniere sauvegardee !"); }
          else setEditToast("Banniere mise a jour (sync DB en attente)");
          setTimeout(() => setEditToast(null), 3000);
        }).catch(() => { setEditToast("Banniere mise a jour localement"); setTimeout(() => setEditToast(null), 3000); });
      } else {
        setEditToast("Erreur upload");
        setTimeout(() => setEditToast(null), 3000);
      }
    } catch {
      setEditToast("Erreur");
      setTimeout(() => setEditToast(null), 3000);
    }
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
        color: "#7C6A2F",
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
      // Restore visitor identity — sessionStorage first, localStorage fallback (persists across sessions)
      const saved = sessionStorage.getItem(`heaven_client_${slug}`) || localStorage.getItem(`heaven_client_${slug}`);
      if (saved) {
        const client = JSON.parse(saved);
        setClientId(client.id);
        if (client.pseudo_snap) { setVisitorPlatform("snap"); setVisitorHandle(client.pseudo_snap); setVisitorRegistered(true); }
        else if (client.pseudo_insta) { setVisitorPlatform("insta"); setVisitorHandle(client.pseudo_insta); setVisitorRegistered(true); }
        else if (client.phone) { setVisitorPlatform("phone"); setVisitorHandle(client.phone); setVisitorRegistered(true); }
        else if (client.nickname) { setVisitorPlatform("pseudo"); setVisitorHandle(client.nickname); setVisitorRegistered(true); }
        // Sync to sessionStorage if only in localStorage
        if (!sessionStorage.getItem(`heaven_client_${slug}`)) {
          sessionStorage.setItem(`heaven_client_${slug}`, saved);
        }
      }
      // Check for saved access tier (localStorage fallback)
      const savedAccess = sessionStorage.getItem(`heaven_access_${slug}`) || localStorage.getItem(`heaven_access_${slug}`);
      if (savedAccess) {
        const parsed = JSON.parse(savedAccess);
        if (parsed.tier && parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
          setUnlockedTier(parsed.tier);
          setActiveCode({ code: parsed.code || "", tier: parsed.tier, expiresAt: parsed.expiresAt } as AccessCode);
        } else {
          sessionStorage.removeItem(`heaven_access_${slug}`);
          localStorage.removeItem(`heaven_access_${slug}`);
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
          const accessData = JSON.stringify({ tier: data.code.tier, expiresAt: data.code.expiresAt, code: data.code.code });
          sessionStorage.setItem(`heaven_access_${slug}`, accessData);
          localStorage.setItem(`heaven_access_${slug}`, accessData);
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
                  localStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
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
      localStorage.setItem(`heaven_client_${slug}`, JSON.stringify(data.client));
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
  // ── Global image protection ──
  useEffect(() => {
    const blockCtx = (e: MouseEvent) => { if ((e.target as HTMLElement)?.tagName === "IMG") e.preventDefault(); };
    const blockDrag = (e: DragEvent) => { if ((e.target as HTMLElement)?.tagName === "IMG") e.preventDefault(); };
    document.addEventListener("contextmenu", blockCtx);
    document.addEventListener("dragstart", blockDrag);
    return () => { document.removeEventListener("contextmenu", blockCtx); document.removeEventListener("dragstart", blockDrag); };
  }, []);

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

  // ── These must be before conditional returns (React hooks rule) ──
  const handleGateRegistered = useCallback((client: Record<string, unknown>, platform: VisitorPlatform, handle: string) => {
    setClientId(client.id as string);
    setVisitorPlatform(platform);
    setVisitorHandle(handle);
    setVisitorRegistered(true);
    sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
    localStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
  }, [slug]);

  const activePacks = displayPacks.filter(p => p.active);
  const unreadCount = chatMessages.filter(m => m.sender_type === "model").length;

  if (loading || !model) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: "var(--bg)", userSelect: "none", WebkitUserSelect: "none" }}>
      {/* Identity Gate — blocks browsing until visitor identifies */}
      {!visitorRegistered && !isModelLoggedIn && model && (
        <IdentityGate slug={slug} modelName={model.display_name} onRegistered={handleGateRegistered} onNeedShop={() => setTab("shop")} />
      )}
      <style>{`
        img { -webkit-touch-callout: none; -webkit-user-select: none; pointer-events: none; }
        img[data-clickable] { pointer-events: auto; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes heroFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes chevronBounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(6px); opacity: 0.8; } }
        @keyframes countUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .profile-stagger-1 { animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
        .profile-stagger-2 { animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
        .profile-stagger-3 { animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both; }
        .profile-stagger-4 { animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both; }
        .stat-pop { animation: countUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .post-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .post-hover:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
        @media (max-width: 768px) { .post-hover:hover { transform: none; box-shadow: none; } }
        .gallery-item { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease; }
        .gallery-item:hover { transform: scale(1.02); box-shadow: var(--shadow-xl); }
      `}</style>

      <div className="relative z-10">

        {/* ═══ HEADER BAR — minimal sticky ═══ */}
        <div className="sticky top-0 left-0 right-0 z-40 px-4 md:px-6 py-2 md:py-2.5 flex items-center gap-3"
          style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {isModelLoggedIn && (
              <a href="/agence" className="text-xs font-bold no-underline shrink-0" style={{ color: "var(--accent)" }}>&#8592;</a>
            )}
            <span className="text-xs font-semibold tracking-wide uppercase truncate" style={{ color: "var(--text)", letterSpacing: "0.1em" }}>
              {model.display_name}
            </span>
            {displayModel?.online && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--success)", boxShadow: "0 0 6px rgba(16,185,129,0.5)" }} />}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {visitorRegistered && (
              <>
                <span className="text-[10px] font-medium hidden sm:block" style={{ color: "var(--text-muted)" }}>@{visitorHandle}</span>
                {unlockedTier ? (
                  <CountdownBadge tier={unlockedTier} expiresAt={activeCode?.expiresAt || ""} />
                ) : (
                  <button onClick={() => setShowUnlock(true)} className="text-[10px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all hover:scale-105"
                    style={{ background: "rgba(230,51,41,0.1)", color: "var(--accent)", border: "1px solid rgba(230,51,41,0.15)" }}>
                    Code
                  </button>
                )}
              </>
            )}
            <ThemeToggle size="sm" />
          </div>
        </div>

        {/* ═══ HERO SECTION — Cinematic full-viewport banner ═══ */}
        <div className="relative">
          {(() => {
            const latestImagePost = posts.find(p => p.media_url);
            const bannerUrl = displayModel?.banner || latestImagePost?.media_url || null;
            return (
              <div className="min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] relative overflow-hidden" style={{
                background: bannerUrl
                  ? `url(${bannerUrl}) center/cover no-repeat`
                  : "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)",
              }}>
                {/* Multi-layer gradient overlay */}
                <div className="absolute inset-0" style={{
                  background: `
                    linear-gradient(to top, var(--bg) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.2) 60%, transparent 100%),
                    radial-gradient(ellipse at 20% 80%, rgba(0,0,0,0.4), transparent 60%),
                    radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.2), transparent 60%)
                  `,
                }} />
                {/* Vignette edges */}
                <div className="absolute inset-0" style={{
                  background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)",
                }} />

                {/* Hero content — positioned at bottom */}
                <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 md:px-12 pb-10 sm:pb-14 md:pb-16 max-w-6xl mx-auto">
                  <div className="flex items-end gap-5 sm:gap-6 md:gap-8">
                    {/* Avatar — large, overlapping */}
                    <div className="relative shrink-0 profile-stagger-1">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden"
                        style={{
                          border: "3px solid var(--bg)",
                          background: displayModel?.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                          boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
                        }}>
                        {displayModel?.avatar ? (
                          <img src={displayModel.avatar} alt={displayModel.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-3xl sm:text-4xl font-light text-white" style={{ letterSpacing: "0.05em" }}>
                            {displayModel?.display_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      {!isEditMode && displayModel?.online && (
                        <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full"
                          style={{ background: "var(--success)", border: "2px solid var(--bg)", boxShadow: "0 0 10px rgba(16,185,129,0.6)" }} />
                      )}
                    </div>

                    {/* Name + bio + stats */}
                    <div className="flex-1 min-w-0 pb-1">
                      <h1 className="profile-stagger-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light uppercase truncate"
                        style={{ color: "#fff", letterSpacing: "0.12em", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
                        {displayModel?.display_name}
                      </h1>
                      {displayModel?.bio && (
                        <p className="profile-stagger-3 text-sm sm:text-base mt-2 sm:mt-3 line-clamp-2 leading-relaxed max-w-lg"
                          style={{ color: "rgba(255,255,255,0.7)" }}>
                          {displayModel.bio}
                        </p>
                      )}
                      <div className="profile-stagger-4 flex items-center gap-6 sm:gap-8 mt-3 sm:mt-4">
                        <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          <span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{posts.length}</span> posts
                        </span>
                        <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          <span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{wallPosts.length}</span> fans
                        </span>
                        <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          <span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{uploads.length + posts.filter(p => p.media_url).length}</span> media
                        </span>
                        {/* Platform icons */}
                        {(() => {
                          const platforms = (model as unknown as Record<string, unknown>).platforms as Record<string, string> | undefined;
                          if (!platforms) return null;
                          return (
                            <div className="hidden sm:flex items-center gap-2 ml-2">
                              {Object.entries(platforms).filter(([, v]) => v).map(([platform, handle]) => {
                                const p = PLATFORMS_MAP[platform];
                                if (!p || !handle) return null;
                                const url = handle.startsWith("http") ? handle : `${p.prefix}${handle}`;
                                return (
                                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                                    className="shrink-0 no-underline opacity-60 hover:opacity-100 transition-opacity" title={`${platform}: @${handle}`}>
                                    <div className="w-3.5 h-3.5 rounded-full" style={{ background: p.color }} />
                                  </a>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* CTA buttons — visible on ALL screens */}
                  {!isEditMode && !unlockedTier && (
                    <div className="flex items-center gap-3 mt-5 sm:mt-6 profile-stagger-4">
                      <button onClick={() => setShowUnlock(true)}
                        className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all hover:scale-105 active:scale-[0.98]"
                        style={{ background: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-accent)", letterSpacing: "0.05em" }}>
                        Entrer un code
                      </button>
                      <button onClick={() => setTab("shop")}
                        className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition-all hover:scale-105 active:scale-[0.98]"
                        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                        Boutique
                      </button>
                    </div>
                  )}
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2" style={{ animation: "chevronBounce 2s ease-in-out infinite" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            );
          })()}
          {isEditMode && (
            <div className="absolute top-14 right-4 z-20 flex gap-2">
              <button onClick={() => bannerInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-[10px] font-medium transition-all hover:scale-105"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Camera className="w-3.5 h-3.5" /> Banniere
              </button>
              <button onClick={() => avatarInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-[10px] font-medium transition-all hover:scale-105"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Camera className="w-3.5 h-3.5" /> Avatar
              </button>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
          )}
          {/* Edit mode: profile fields */}
          {isEditMode && (
            <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 -mt-4 mb-4">
              <div className="space-y-3 p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <input
                  value={displayModel?.display_name || ""}
                  onChange={e => updateEditField("display_name", e.target.value)}
                  className="text-lg font-bold bg-transparent outline-none rounded-lg px-3 py-2 w-full"
                  style={{ color: "var(--text)", border: "1px dashed var(--border3)" }}
                  placeholder="Display name"
                />
                <input
                  value={displayModel?.status || ""}
                  onChange={e => updateEditField("status", e.target.value)}
                  className="w-full text-xs bg-transparent outline-none rounded-lg px-3 py-2"
                  style={{ color: "var(--text-muted)", border: "1px dashed var(--border3)" }}
                  placeholder="Status"
                />
                <textarea
                  value={displayModel?.bio || ""}
                  onChange={e => updateEditField("bio", e.target.value)}
                  className="w-full text-sm leading-relaxed bg-transparent outline-none rounded-lg px-3 py-2 resize-none"
                  style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }}
                  placeholder="Bio..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* ═══ EXPIRED CODE BANNER ═══ */}
        {expiredCodeInfo && !unlockedTier && (
          <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 mb-4 mt-4">
            <div className="flex items-center justify-between px-5 py-3.5 rounded-xl"
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

        {/* ═══ TABS — editorial underline style, sticky ═══ */}
        <div className="sticky top-[40px] md:top-[44px] z-30"
          style={{ background: "color-mix(in srgb, var(--bg) 92%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12">
            <div className="flex items-center gap-0" role="tablist" style={{ borderBottom: "1px solid var(--border)" }}>
              {TABS.map(t => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} aria-label={t.label}
                  onClick={() => setTab(t.id)}
                  className="relative px-5 sm:px-6 md:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-medium cursor-pointer transition-all"
                  style={{
                    color: tab === t.id ? "var(--accent)" : "var(--text-muted)",
                    background: "transparent",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}>
                  <span>{t.label}</span>
                  {tab === t.id && (
                    <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 py-6 sm:py-8">

          {/* ── FEED — Magazine editorial ── */}
          {tab === "feed" && (
            <div className="space-y-5 sm:space-y-6 fade-up max-w-2xl mx-auto">
              {/* Visitor post composer */}
              {!isModelLoggedIn && (
                <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex gap-3">
                    <input
                      value={wallContent}
                      onChange={e => setWallContent(e.target.value)}
                      placeholder={`Un message pour ${model.display_name}...`}
                      className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1"
                      style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                      onKeyDown={async e => {
                        if (e.key !== "Enter" || !wallContent.trim()) return;
                        const pseudo = visitorHandle || "Anonyme";
                        setWallPosting(true);
                        try {
                          const res = await fetch("/api/wall", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ model: slug, pseudo, content: wallContent.trim(), client_id: clientId }),
                          });
                          if (res.ok) {
                            const d = await res.json();
                            if (d.post) setWallPosts(prev => [d.post, ...prev]);
                            setWallContent("");
                          }
                        } catch {} finally { setWallPosting(false); }
                      }}
                    />
                    <button disabled={wallPosting || !wallContent.trim()} onClick={async () => {
                      if (!wallContent.trim()) return;
                      const pseudo = visitorHandle || "Anonyme";
                      setWallPosting(true);
                      try {
                        const res = await fetch("/api/wall", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ model: slug, pseudo, content: wallContent.trim(), client_id: clientId }),
                        });
                        if (res.ok) {
                          const d = await res.json();
                          if (d.post) setWallPosts(prev => [d.post, ...prev]);
                          setWallContent("");
                        }
                      } catch {} finally { setWallPosting(false); }
                    }}
                      className="px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-30 shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: "var(--accent)", color: "#fff" }}>
                      {wallPosting ? "..." : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* All posts merged + sorted by date (newest first) */}
              {(() => {
                const visitorPosts = wallPosts.filter(w => !w.content?.includes("#post-")).map(w => ({ type: "wall" as const, id: w.id, created_at: w.created_at, data: w }));
                const modelPosts = posts.map(p => ({ type: "post" as const, id: p.id, created_at: p.created_at, data: p }));
                const allItems = [...visitorPosts, ...modelPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                if (allItems.length === 0) return (
                  <div className="text-center py-20 sm:py-24">
                    <Newspaper className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas encore de publications</p>
                  </div>
                );

                return (<>{allItems.map((item, idx) => {
                  if (item.type === "wall") {
                    const w = item.data as WallPost;
                    return (
                      <div key={`w-${w.id}`} className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: "var(--bg3)", color: "var(--text-muted)" }}>
                            {w.pseudo?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>@{w.pseudo}</span>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(w.created_at)}</span>
                            </div>
                            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{w.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const post = item.data as Post;
                  const postTier = post.tier_required || "public";
                  const mediaUnlocked = postTier === "public" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, postTier));
                  const tierHex = TIER_HEX[postTier] || "#64748B";
                  return (
                    <div key={post.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                      <div className="flex items-start gap-3 sm:gap-4 p-5 sm:p-6 pb-3 sm:pb-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden"
                          style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                          {model.avatar ? <img src={model.avatar} alt="" className="w-full h-full object-cover" /> : model.display_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{model.display_name}</span>
                              {postTier !== "public" && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tierHex}12`, color: tierHex }}>
                                  {TIER_META[postTier]?.label || postTier.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</span>
                          </div>
                          {post.content && (
                            <p className="text-base mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{post.content}</p>
                          )}
                        </div>
                      </div>
                      {post.media_url && (
                        mediaUnlocked ? (
                          <div className="cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
                            onClick={() => setLightboxUrl(post.media_url)}>
                            <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                              <img src={post.media_url} alt="" className="w-full max-h-[400px] sm:max-h-[500px] object-cover" loading="lazy" />
                            </ContentProtection>
                          </div>
                        ) : (
                          <div className="relative cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
                            onClick={() => {
                              if (purchasedItems.has(post.id)) { setLightboxUrl(post.media_url); return; }
                              setShowUnlock(true);
                            }}>
                            <div className="w-full h-[300px] sm:h-[400px]" style={{
                              background: `linear-gradient(135deg, ${tierHex}20, rgba(0,0,0,0.6))`,
                            }} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <Lock className="w-6 h-6" style={{ color: tierHex, opacity: 0.8 }} />
                              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: tierHex }}>
                                {TIER_META[postTier]?.label || "Exclusive"}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                      {/* Like + comment — understated */}
                      <div className="flex items-center gap-6 px-5 sm:px-6 py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                        <button onClick={async () => {
                          try {
                            await fetch(`/api/posts`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: post.id, model: slug, action: "like" }),
                            });
                            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p));
                          } catch {}
                        }} className="flex items-center gap-1.5 text-xs cursor-pointer transition-colors hover:text-[#F43F5E] group/like" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                          <Heart className="w-4 h-4 transition-transform group-hover/like:scale-110" fill={(post.likes_count || 0) > 0 ? "currentColor" : "none"} />
                          <span className="tabular-nums">{post.likes_count || 0}</span>
                        </button>
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          <MessageCircle className="w-4 h-4" />
                          <span className="tabular-nums">{wallPosts.filter(w => w.content?.includes(`#post-${post.id}`)).length + (post.comments_count || 0)}</span>
                        </span>
                      </div>
                      {/* Comments */}
                      {wallPosts.filter(w => w.content?.includes(`#post-${post.id}`)).slice(0, 3).map(w => (
                        <div key={w.id} className="px-5 sm:px-6 py-2 flex items-start gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                          <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--text)" }}>@{w.pseudo}</span>
                          <span className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{w.content?.replace(`#post-${post.id}`, "").trim()}</span>
                        </div>
                      ))}
                      {/* Comment input */}
                      <div className="px-5 sm:px-6 py-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                        <input
                          data-comment-post={post.id}
                          placeholder={visitorRegistered ? "Ajouter un commentaire..." : "Identifie-toi pour commenter"}
                          className="flex-1 text-sm bg-transparent outline-none py-1"
                          style={{ color: "var(--text)" }}
                          readOnly={!visitorRegistered}
                          onClick={() => { if (!visitorRegistered) { /* identity gate will handle */ } }}
                          onKeyDown={async (e) => {
                            if (!visitorRegistered) return;
                            if (e.key === "Enter") {
                              const input = e.target as HTMLInputElement;
                              const text = input.value.trim();
                              if (!text) return;
                              input.value = "";
                              try {
                                await fetch("/api/wall", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    model: slug,
                                      pseudo: visitorHandle,
                                      content: `${text} #post-${post.id}`,
                                      pseudo_snap: visitorPlatform === "snap" ? visitorHandle : null,
                                      pseudo_insta: visitorPlatform === "insta" ? visitorHandle : null,
                                      client_id: clientId,
                                    }),
                                  });
                                  const res = await fetch(`/api/wall?model=${slug}`);
                                  const data = await res.json();
                                  setWallPosts(data.posts || []);
                                } catch {}
                              }
                            }}
                          />
                          <button onClick={async () => {
                            if (!visitorRegistered) return;
                            const input = (document.querySelector(`[data-comment-post="${post.id}"]`) as HTMLInputElement);
                            const text = input?.value?.trim();
                            if (!text) return;
                            input.value = "";
                            try {
                              await fetch("/api/wall", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  model: slug, pseudo: visitorHandle,
                                  content: `${text} #post-${post.id}`,
                                  pseudo_snap: visitorPlatform === "snap" ? visitorHandle : null,
                                  pseudo_insta: visitorPlatform === "insta" ? visitorHandle : null,
                                  client_id: clientId,
                                }),
                              });
                              const res = await fetch(`/api/wall?model=${slug}`);
                              const data = await res.json();
                              setWallPosts(data.posts || []);
                            } catch {}
                          }} className="cursor-pointer hover:opacity-70 transition-opacity" style={{ background: "none", border: "none" }}>
                            <Send className="w-3.5 h-3.5" style={{ color: visitorRegistered ? "var(--accent)" : "var(--text-muted)" }} />
                          </button>
                        </div>
                    </div>
                  );
                })}</>);
              })()}
            </div>
          )}

          {/* ── PORTFOLIO / GALLERY — editorial grid ── */}
          {tab === "gallery" && (() => {
            const imagePosts = posts.filter(p => p.media_url);
            return (
              <div className="fade-up">
                {/* Tier filter — underline style */}
                <div className="flex gap-1 mb-6 sm:mb-8 overflow-x-auto scrollbar-hide pb-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  {["all", "public", "vip", "gold", "diamond", "platinum"].map(t => {
                    const count = t === "all" ? imagePosts.length : imagePosts.filter(p => (p.tier_required || "public") === t).length;
                    if (t !== "all" && count === 0) return null;
                    const tierHex = t === "all" ? "var(--text)" : TIER_HEX[t] || "var(--text-muted)";
                    return (
                      <button key={t} onClick={() => setGalleryTier(t)}
                        className="relative px-4 sm:px-5 py-2.5 text-[11px] sm:text-xs font-medium cursor-pointer shrink-0 transition-all uppercase"
                        style={{
                          color: galleryTier === t ? tierHex : "var(--text-muted)",
                          letterSpacing: "0.06em",
                        }}>
                        {t === "all" ? "Tout" : TIER_META[t]?.label || t} {count > 0 && <span className="opacity-50">({count})</span>}
                        {galleryTier === t && (
                          <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: tierHex }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Portfolio grid — editorial aspect ratios */}
                {imagePosts.length === 0 ? (
                  <div className="text-center py-20 sm:py-24">
                    <Image className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas de contenu dans le portfolio</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                    {imagePosts
                      .filter(p => galleryTier === "all" || (p.tier_required || "public") === galleryTier)
                      .map((post, i) => {
                        const tier = post.tier_required || "public";
                        const unlocked = tier === "public" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, tier));
                        const tierHex = TIER_HEX[tier] || "var(--text-muted)";
                        return (
                          <div key={post.id} className="relative aspect-[3/4] overflow-hidden rounded-xl cursor-pointer gallery-item group"
                            style={{ animation: `slideUp 0.4s ease-out ${i * 0.03}s both` }}>
                            {unlocked ? (
                              <>
                                <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn} className="w-full h-full">
                                  <img src={post.media_url!} alt="" className="w-full h-full object-cover"
                                    onClick={() => setLightboxUrl(post.media_url)} loading="lazy" data-clickable />
                                </ContentProtection>
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                                {tier !== "public" && (
                                  <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)" }}>
                                    {TIER_META[tier]?.label || tier.toUpperCase()}
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full" onClick={() => {
                                if (purchasedItems.has(post.id)) { setLightboxUrl(post.media_url); return; }
                                setShowUnlock(true);
                              }}>
                                {/* Dark gradient overlay instead of blur */}
                                <div className="absolute inset-0" style={{
                                  background: `linear-gradient(160deg, ${tierHex}25 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.85) 100%)`,
                                }} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                  <Lock className="w-5 h-5" style={{ color: tierHex, opacity: 0.7 }} />
                                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tierHex }}>
                                    Exclusive
                                  </span>
                                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    {TIER_META[tier]?.label || tier}
                                  </span>
                                </div>
                              </div>
                            )}
                            {/* Edit mode overlay */}
                            {isEditMode && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button onClick={async () => {
                                  if (confirm("Supprimer ce post ?")) {
                                    await fetch(`/api/posts?id=${post.id}&model=${slug}`, { method: "DELETE" });
                                    setPosts(prev => prev.filter(p => p.id !== post.id));
                                  }
                                }} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110" style={{ background: "rgba(220,38,38,0.8)" }}>
                                  <Trash2 className="w-4 h-4 text-white" />
                                </button>
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

          {/* ── BOUTIQUE / SHOP ── */}
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
              setChatOpen={setChatOpen}
              handleUpdatePack={handleUpdatePack}
              handleDeletePack={handleDeletePack}
              handleAddPack={handleAddPack}
              visitorHandle={visitorHandle}
              model={slug as string}
              authHeaders={() => {
                const h: Record<string, string> = { "Content-Type": "application/json" };
                if (modelAuth?.token) h["Authorization"] = `Bearer ${modelAuth.token}`;
                return h;
              }}
            />
          )}

        </div>

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
              const ad = JSON.stringify({ tier: code.tier, expiresAt: code.expiresAt, code: code.code });
              sessionStorage.setItem(`heaven_access_${slug}`, ad);
              localStorage.setItem(`heaven_access_${slug}`, ad);
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
              <div className="px-6 pb-6 space-y-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                {/* CODE INPUT — main way to unlock */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Tu as un code ?
                  </label>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
                    const code = input?.value?.trim();
                    if (!code) return;
                    try {
                      const res = await fetch("/api/codes", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "validate", code, model: slug }),
                      });
                      const data = await res.json();
                      if (data.code?.tier) {
                        setUnlockedTier(data.code.tier);
                        setActiveCode(data.code);
                        setShowUnlock(false);
                        const ad2 = JSON.stringify({ tier: data.code.tier, expiresAt: data.code.expiresAt, code: data.code.code });
                        sessionStorage.setItem(`heaven_access_${slug}`, ad2);
                        localStorage.setItem(`heaven_access_${slug}`, ad2);
                      } else {
                        input.style.borderColor = "#EF4444";
                        input.placeholder = data.error || "Code invalide";
                        input.value = "";
                      }
                    } catch { input.placeholder = "Erreur — reessaye"; input.value = ""; }
                  }} className="flex gap-2">
                    <input type="text" placeholder="ABC-2026-XXXX"
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono uppercase tracking-wider outline-none text-center"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
                    />
                    <button type="submit"
                      className="px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:scale-105 transition-transform"
                      style={{ background: "var(--accent)", color: "#fff" }}>
                      Valider
                    </button>
                  </form>
                </div>

                <div className="text-center">
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>ou achete un pack</span>
                </div>

                {activePacks.map(pack => {
                  const hex = TIER_HEX[pack.id] || pack.color;
                  const paypalUrl = `https://www.paypal.com/paypalme/aaclaraa/${pack.price}`;
                  return (
                    <div key={pack.id} className="w-full p-4 rounded-xl"
                      style={{ background: `${hex}08`, border: `1px solid ${hex}20` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{TIER_META[pack.id]?.symbol}</span>
                          <span className="text-sm font-bold" style={{ color: hex }}>{pack.name}</span>
                        </div>
                        <span className="text-sm font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                      </div>
                      <div className="mb-2 space-y-0.5">
                        {pack.features.map((f: string, j: number) => (
                          <p key={j} className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <span style={{ color: hex }}>✓</span> {f}
                          </p>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {pack.wise_url && (
                          <a href={pack.wise_url} target="_blank" rel="noopener noreferrer"
                            className="py-2 rounded-lg text-[10px] font-bold text-center no-underline"
                            style={{ background: "#00B4D8", color: "#fff" }}>Revolut</a>
                        )}
                        <a href={paypalUrl} target="_blank" rel="noopener noreferrer"
                          className={`py-2 rounded-lg text-[10px] font-bold text-center no-underline ${!pack.wise_url ? "col-span-2" : ""}`}
                          style={{ background: "#003087", color: "#fff" }}>PayPal</a>
                      </div>
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

                  {/* CTA — Payment link */}
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

        {/* ═══ LIGHTBOX — full-screen dark ═══ */}
        {lightboxUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.95)" }}
            onClick={() => setLightboxUrl(null)}>
            <button className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:bg-white/20"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }} onClick={() => setLightboxUrl(null)}>
              <X className="w-5 h-5 text-white" />
            </button>
            <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
              <img src={lightboxUrl} alt="" className="max-w-[92vw] max-h-[88vh] object-contain" style={{ borderRadius: "var(--radius)" }} onClick={e => e.stopPropagation()} />
            </ContentProtection>
          </div>
        )}

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
                {(() => {
                  const unread = chatMessages.filter(m => m.sender_type === "model").length;
                  return unread > 0 ? (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{ background: "var(--success)", color: "#fff" }}>
                      {unread}
                    </span>
                  ) : null;
                })()}
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
            <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 py-3 flex items-center justify-between">
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

        {/* ═══ MOBILE BOTTOM NAV ═══ */}
        {!(isEditMode && editDirty) && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden safe-area-bottom"
            style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center justify-around py-2">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="relative flex flex-col items-center gap-0.5 px-4 py-1.5 cursor-pointer transition-all"
                  style={{ color: tab === t.id ? "var(--accent)" : "var(--text-muted)" }}>
                  {tab === t.id && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
                  )}
                  <t.icon className="w-5 h-5" />
                  <span className="text-[9px] font-medium uppercase" style={{ letterSpacing: "0.06em" }}>{t.label}</span>
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

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Heart, MessageCircle, Send, Lock, Newspaper, ShoppingBag,
  Coins, Camera, X, Check,
  Instagram, Ghost, Key, Sparkles, AlertTriangle, Eye, Trash2,
  Edit3, Plus, ToggleLeft, ToggleRight, RotateCcw, Save, Shield,
  Image as ImageIcon, Loader2, UserCog, LogOut, ChevronUp, ChevronDown, EyeOff,
} from "lucide-react";
import { toModelId } from "@/lib/model-utils";
import { normalizeTier, tierIncludes } from "@/lib/tier-utils";
import { ContentProtection } from "@/components/content-protection";
import { IdentityGate } from "@/components/identity-gate";
import { AdminAuthModal } from "@/components/admin-auth-modal";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

// ── Extracted hooks ──
import { useModelSession } from "@/hooks/use-model-session";
import { useModelData } from "@/hooks/use-model-data";
import { useAccessCode } from "@/hooks/use-access-code";
import { useVisitorIdentity } from "@/hooks/use-visitor-identity";
import { useChat } from "@/hooks/use-chat";
import { useWall } from "@/hooks/use-wall";
import { useEditMode } from "@/hooks/use-edit-mode";
import { useClientProfile } from "@/hooks/use-client-profile";
import { useScreenshotDetection } from "@/hooks/use-screenshot-detection";

// ── Extracted components ──
import { CountdownBadge } from "@/components/profile/countdown-badge";
import { ClientBadge } from "@/components/profile/client-badge";
import { OrderHistoryPanel } from "@/components/profile/order-history-panel";
import { PaymentCheckout } from "@/components/profile/payment-checkout";
import { ShopTab } from "@/components/profile/shop-tab";
import { StoryViewer } from "@/components/profile/story-viewer";
import { PackDetailModal } from "@/components/profile/pack-detail-modal";
import { ProfileStyles } from "@/components/profile/profile-styles";
import { InstagramFeedGrid } from "@/components/profile/instagram-feed-grid";
import PublicFooter from "@/components/public-footer";
// BRIEF-18 — Header admin unifié (mounté quand admin connecté sur /m/[slug])
import { HeavenAdminHeader } from "@/components/header/heaven-admin-header";
// BRIEF-19+21 (Session 2026-04-25 evening) — 4 boutons admin synergie CP↔Profil
// + générateur Story canvas téléchargeable
import { HeavenAdminActions } from "@/components/header/heaven-admin-actions";
import { StoryGeneratorModal } from "@/components/profile/story-generator-modal";
// BRIEF-23 — Post composer text + photo inline profil admin (Profile-as-Hub)
import { PostComposer } from "@/components/profile/post-composer";
// BRIEF-22+23 Phase 2.2 — Drawer admin "vue floutée vs débloquée"
import { BlurPreviewToggle } from "@/components/profile/blur-preview-toggle";
// BRIEF-10 AG04/AG05/AG07/AG09 — age gate + access tiers
import AgeGateModal from "@/components/age-gate-modal";
import {
  setAgeCertifiedCookie,
  hasAgeCertifiedCookie,
} from "@/lib/age-gate/persistence";
import { computeAccessLevel } from "@/lib/access/tiers";

// ── CP-domain profile components (Phase 3 Agent 3.B) ──
import { FeedItemCard } from "@cp/components/profile/feed-item-card";
import { ProfileCta } from "@cp/components/profile/profile-cta";

// ── Types & Constants ──
import type { ModelInfo, Post, PackConfig, UploadedContent, WallPost, AccessCode, VisitorPlatform, FeedItem } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

// ── Utility functions ──
const PLATFORMS_MAP: Record<string, { color: string; prefix: string }> = {
  instagram: { color: "#C13584", prefix: "https://instagram.com/" },
  snapchat: { color: "#997A00", prefix: "https://snapchat.com/add/" },
  onlyfans: { color: "#008CCF", prefix: "https://onlyfans.com/" },
  fanvue: { color: "#6D28D9", prefix: "https://fanvue.com/" },
  tiktok: { color: "#333", prefix: "https://tiktok.com/@" },
  mym: { color: "#CC2952", prefix: "https://mym.fans/" },
};

const TIER_ALIASES: Record<string, string> = {
  vip: "p1", diamond: "p4", silver: "p1", gold: "p2", feet: "p3", black: "p4", platinum: "p5",
  public: "p0", free: "p0", promo: "p0",
};

function dailyShuffle<T>(arr: T[]): T[] {
  const seed = new Date().toDateString();
  const shuffled = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
  for (let i = shuffled.length - 1; i > 0; i--) {
    h = (h * 16807 + 0) % 2147483647;
    const j = Math.abs(h) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const MASONRY_ASPECTS = ["aspect-[3/4]", "aspect-square", "aspect-[4/3]", "aspect-[3/4]", "aspect-[2/3]"];
const getMasonryAspect = (i: number) => MASONRY_ASPECTS[i % MASONRY_ASPECTS.length];

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

// ═══════════════════════════════════════════
//  ModelPage — composites extracted hooks + components
// ═══════════════════════════════════════════
export default function ModelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const modelId = useMemo(() => toModelId(slug), [slug]);

  // ── Core hooks ──
  const modelAuth = useModelSession(slug);
  // BRIEF-17 T17-B4 — actual admin session vs effective (degraded by preview mode).
  // `isModelLoggedInActual` reflects DB session (used for HeaderBar admin tools and
  // for the ADMIN exit-preview button). `isModelLoggedIn` is the effective value passed
  // to children: preview mode forces it to false so chat/gate/CTA behave as if visitor.
  const isModelLoggedInActual = !!modelAuth;
  const {
    model, posts, stories, packs, uploads, wallPosts, loading, notFound,
    setModel, setPosts, setUploads, setWallPosts, setPacks,
  } = useModelData(slug);

  // ── Admin auth modal ──
  const [showAdminModal, setShowAdminModal] = useState(false);
  // BRIEF-21 — state pour ouverture StoryGeneratorModal depuis HeaderBar admin
  const [storyOpen, setStoryOpen] = useState(false);

  // ── Gate dismissed : visiteur anonyme peut voir le profil (publics only, le reste flouté) ──
  const [gateDismissed, setGateDismissed] = useState(false);

  // ── Nav state ──
  // SSR-safe: always start with "home" on server + first client render, then sync to hash after mount (fixes React #418 hydration mismatch).
  const [galleryTier, setGalleryTier] = useState<string>("home");

  // ── Edit mode (BRIEF-17: must resolve before downstream hooks because previewMode
  // gates `isModelLoggedIn` for children — chat, gate, client profile, etc.) ──
  const edit = useEditMode({
    slug, isModelLoggedIn: isModelLoggedInActual, model, packs,
    setModel, setPacks, setUploads, setGalleryTier,
  });

  // BRIEF-17 T17-B4 — Effective admin flag passed to children: false in preview mode.
  const isModelLoggedIn = isModelLoggedInActual && !edit.previewMode;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    if (["feed", "p1", "p2", "p3", "p4", "p5", "custom"].includes(hash)) {
      setGalleryTier(hash);
      return;
    }
    const mapped = TIER_ALIASES[hash];
    if (mapped) {
      setGalleryTier(mapped);
      return;
    }
    if (hash === "all" || hash === "public" || hash === "gallery" || hash === "shootings") {
      setGalleryTier("feed");
      return;
    }
    if (hash === "shop") setGalleryTier("custom");
  }, []);

  // ── Access code ──
  const {
    unlockedTier, activeCode, expiredCodeInfo,
    setUnlockedTier, setActiveCode, validateCode,
  } = useAccessCode({ slug, model });

  // ── Visitor identity ──
  const {
    clientId, visitorPlatform, visitorHandle, visitorRegistered, visitorVerified,
    registerClient,
    setClientId, setVisitorPlatform, setVisitorHandle, setVisitorRegistered, setVisitorVerified,
  } = useVisitorIdentity({ slug, model });

  // ── BRIEF-10 AG04/AG05 — age gate state (déclaré avant useChat pour sendMessage) ──
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [ageCertified, setAgeCertified] = useState(false);

  // ── Chat ──
  const {
    chatMessages, chatInput, setChatInput, chatOpen, setChatOpen,
    chatUnread, sendMessage: sendMessageRaw, chatEndRef, guestClientId,
  } = useChat({ slug, clientId, model });

  // ── BRIEF-10 AG05/AG09 : gated sendMessage ──
  // Intercepte le 1er message fan : si pas certifié, ouvre modal age gate.
  // La validation/refus déclenche le send pending (ou redirect IG).
  const pendingSendRef = useRef<boolean>(false);
  const sendMessage = useCallback(async () => {
    if (isModelLoggedIn) {
      // Model/admin n'est pas un fan — bypass gate
      await sendMessageRaw();
      return;
    }
    if (!ageCertified) {
      pendingSendRef.current = true;
      setAgeGateOpen(true);
      return;
    }
    await sendMessageRaw();
  }, [ageCertified, isModelLoggedIn, sendMessageRaw]);

  // ── Wall ──
  const { wallContent, setWallContent, wallPosting } = useWall({
    slug, clientId, visitorHandle, visitorPlatform, registerClient, setWallPosts,
  });

  // ── Client profile & badges ──
  const { orders, newNotifications, clearNotifications } = useClientProfile({
    slug, clientId, visitorHandle, enabled: visitorRegistered && !isModelLoggedIn,
  });

  // ── UI state ──
  const [showUnlock, setShowUnlock] = useState(false);
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [shopSection, setShopSection] = useState<"packs" | "credits">("packs");
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [focusPack, setFocusPack] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [zoomedItem, setZoomedItem] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<PackConfig | null>(null);
  const [checkoutPack, setCheckoutPack] = useState<PackConfig | null>(null);
  const [shopToast, setShopToast] = useState<string | null>(null);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [storyViewIdx, setStoryViewIdx] = useState<number | null>(null);
  // Instagram handle for public CTA (B9). Fetched lazily from /api/feed
  // (which surfaces instagram_config.ig_handle publicly).
  const [instagramHandle, setInstagramHandle] = useState<string | null>(null);

  const activeStories = stories.filter(s => s.media_url);
  const subscriberUsername = visitorHandle || clientId?.slice(0, 8) || "visitor";
  const hasSubscriberIdentity = !!clientId;
  const contentUnlocked = visitorVerified || isModelLoggedIn;
  const hasPurchased = purchasedItems.size > 0 || !!unlockedTier;
  const activePacks = edit.displayPacks.filter(p => p.active);
  // Hero collapses whenever user navigates to any tab (feed/pack/custom)
  // "home" = full profile with hero visible
  const isNavActive = galleryTier !== "home";
  const isTierView = galleryTier !== "home" && galleryTier !== "feed" && galleryTier !== "custom";

  // ── Validate URL access code on mount ──
  useEffect(() => {
    validateCode({
      onClientIdentified: (client, platform, handle) => {
        setClientId(client.id as string);
        setVisitorPlatform(platform);
        setVisitorHandle(handle);
        setVisitorRegistered(true);
        sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
        localStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
      },
      setGalleryTier,
    });
  }, [validateCode, slug, setClientId, setVisitorPlatform, setVisitorHandle, setVisitorRegistered, setGalleryTier]);

  // ── Fetch active code for subscription status ──
  useEffect(() => {
    if (!clientId || !slug) return;
    fetch(`/api/codes?model=${modelId}&client_id=${clientId}&status=active`)
      .then(r => r.json())
      .then(d => {
        const codes = d.codes || [];
        if (codes.length > 0) {
          setActiveCode(codes[0]);
          if (codes[0].tier) setUnlockedTier(codes[0].tier);
        }
      })
      .catch(() => {});
  }, [clientId, slug, modelId, setActiveCode, setUnlockedTier]);

  // ── Load purchased items from sessionStorage ──
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`heaven_purchases_${slug}`);
      if (stored) setPurchasedItems(new Set(JSON.parse(stored)));
    } catch {}
  }, [slug]);

  // ── BRIEF-10 AG05 : hydrate age gate certified depuis cookie ──
  useEffect(() => {
    if (hasAgeCertifiedCookie()) setAgeCertified(true);
  }, []);

  // ── Fetch Instagram handle (public) for CTA buttons in the hero (B9). ──
  // The feed route is public and safely returns only the handle + active flag,
  // never tokens. We ignore errors — CTAs simply won't render without a handle.
  useEffect(() => {
    if (!slug) return;
    let aborted = false;
    fetch(`/api/feed?model=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!aborted && d && typeof d.instagram_handle === "string") {
          setInstagramHandle(d.instagram_handle);
        }
      })
      .catch(() => { /* silent — CTA just won't render */ });
    return () => { aborted = true; };
  }, [slug]);

  // ── Screenshot detection ──
  const reportScreenshot = useCallback(() => {
    if (!clientId) return;
    fetch("/api/security/screenshot-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriberId: clientId, modelId, timestamp: new Date().toISOString(), page: `profile/${galleryTier}` }),
    }).catch(() => {});
  }, [clientId, modelId, galleryTier]);

  useScreenshotDetection({ enabled: hasSubscriberIdentity && !isModelLoggedIn, onDetected: reportScreenshot });

  // ── Global image protection ──
  useEffect(() => {
    const blockCtx = (e: MouseEvent) => { if ((e.target as HTMLElement)?.tagName === "IMG") e.preventDefault(); };
    const blockDrag = (e: DragEvent) => { if ((e.target as HTMLElement)?.tagName === "IMG") e.preventDefault(); };
    document.addEventListener("contextmenu", blockCtx);
    document.addEventListener("dragstart", blockDrag);
    return () => { document.removeEventListener("contextmenu", blockCtx); document.removeEventListener("dragstart", blockDrag); };
  }, []);

  // ── Identity gate callback ──
  const handleGateRegistered = useCallback((client: Record<string, unknown>, platform: VisitorPlatform, handle: string) => {
    setClientId(client.id as string);
    setVisitorPlatform(platform);
    setVisitorHandle(handle);
    setVisitorRegistered(true);
    if (client.verified_status === "verified") setVisitorVerified(true);
    sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
    localStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
  }, [slug, setClientId, setVisitorPlatform, setVisitorHandle, setVisitorRegistered, setVisitorVerified]);

  // ── Code validation helper (shared between header, unlock sheet, mobile sheet) ──
  const handleCodeValidation = useCallback(async (code: string, input?: HTMLInputElement) => {
    try {
      const res = await fetch("/api/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", code, model: modelId }),
      });
      const data = await res.json();
      if (data.code?.tier) {
        setUnlockedTier(data.code.tier);
        setActiveCode(data.code);
        const ad = JSON.stringify({ tier: data.code.tier, expiresAt: data.code.expiresAt, code: data.code.code });
        sessionStorage.setItem(`heaven_access_${slug}`, ad);
        localStorage.setItem(`heaven_access_${slug}`, ad);
        setCodeSheetOpen(false);
        setShowUnlock(false);
        // Device security check
        const fp = getDeviceFingerprint();
        fetch("/api/codes/security", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code_id: data.code.id, fingerprint: fp, user_agent: navigator.userAgent }),
        }).then(r2 => r2.json()).then(sec => {
          if (!sec.allowed) {
            setUnlockedTier(null);
            setActiveCode(null);
            sessionStorage.removeItem(`heaven_access_${slug}`);
            localStorage.removeItem(`heaven_access_${slug}`);
            alert(sec.message || "Code bloqué");
          }
        }).catch(() => {});
        return true;
      } else {
        if (input) {
          input.style.borderColor = "#EF4444";
          input.placeholder = data.error || "Code invalide";
          input.value = "";
          setTimeout(() => { input.placeholder = "CODE"; input.style.borderColor = ""; }, 2000);
        }
        return false;
      }
    } catch {
      if (input) { input.placeholder = "Erreur"; input.value = ""; }
      return false;
    }
  }, [modelId, slug, setUnlockedTier, setActiveCode]);

  // ── Gallery items ──
  const postsAsGalleryItems: UploadedContent[] = posts
    .filter(p => p.media_url)
    .map(p => ({
      id: `post-${p.id}`,
      tier: (!p.tier_required || normalizeTier(p.tier_required) === "p0") ? "promo" : normalizeTier(p.tier_required),
      type: (p.media_type === "video" ? "video" : "photo") as "photo" | "video" | "reel",
      label: p.content || "",
      dataUrl: p.media_url!,
      uploadedAt: p.created_at,
      visibility: (!p.tier_required || normalizeTier(p.tier_required) === "p0") ? "promo" as const : "pack" as const,
      tokenPrice: 0,
    }));
  const allGalleryItems = [...uploads, ...postsAsGalleryItems];

  // ═══ RENDER ═══

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

  const { displayModel, displayPacks } = edit;

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: "var(--bg)", userSelect: "none", WebkitUserSelect: "none" }}>
      {/* Identity Gate — dismissible (X ou backdrop) pour voir le profil en visiteur anonyme (public only) */}
      {!visitorRegistered && !isModelLoggedIn && !gateDismissed && model && (
        <IdentityGate
          slug={slug}
          modelName={model.display_name}
          onRegistered={handleGateRegistered}
          onNeedShop={() => setGalleryTier("home")}
          onAdminRequest={() => setShowAdminModal(true)}
          onDismiss={() => setGateDismissed(true)}
        />
      )}
      {showAdminModal && <AdminAuthModal onClose={() => setShowAdminModal(false)} />}
      {/* BRIEF-22+23 Phase 2.2 — BlurPreviewToggle admin (drawer FAB bottom-right
          pour basculer simulation vue floutée vs débloquée). Visible admin only. */}
      <BlurPreviewToggle canToggle={isModelLoggedInActual && !edit.previewMode} />
      {/* BRIEF-21 — StoryGeneratorModal admin (mount conditionnel via state local) */}
      {storyOpen && (
        <StoryGeneratorModal
          open={storyOpen}
          onClose={() => setStoryOpen(false)}
          modelSlug={slug}
          packs={packs}
        />
      )}
      <ProfileStyles />

      <div className="relative z-10">

        {/* ═══ HEADER BAR ═══
            NB 2026-04-25 (rappel direct) : "le profil connecté ou non par la modele
            au cp doit afficher EXACTEMENT la même chose en version modèle comme
            version client". Le HeaderBar visiteur est toujours rendu intégralement
            (message, code, login, tier, beacon...). Les boutons admin (Camera,
            Image, Save, Cancel, Eye preview) sont ajoutés DANS le même HeaderBar
            via les props BRIEF-17, pas dans un header séparé. Aucune info sacrifiée
            pour la modèle connectée. */}
        <HeaderBar
          model={model} displayModel={displayModel} isModelLoggedIn={isModelLoggedIn}
          isModelLoggedInActual={isModelLoggedInActual}
          visitorRegistered={visitorRegistered} visitorPlatform={visitorPlatform} visitorHandle={visitorHandle} visitorVerified={visitorVerified}
          unlockedTier={unlockedTier} activeCode={activeCode}
          chatOpen={chatOpen} setChatOpen={setChatOpen} chatUnread={chatUnread}
          newNotifications={newNotifications} orderHistoryOpen={orderHistoryOpen} setOrderHistoryOpen={setOrderHistoryOpen} clearNotifications={clearNotifications}
          codeSheetOpen={codeSheetOpen} setCodeSheetOpen={setCodeSheetOpen}
          handleCodeValidation={handleCodeValidation} modelId={modelId} slug={slug}
          galleryTier={galleryTier} setGalleryTier={setGalleryTier}
          onReopenGate={() => setGateDismissed(false)}
          onAdminLogin={() => setShowAdminModal(true)}
          editDirty={edit.editDirty}
          editSaving={edit.editSaving}
          previewMode={edit.previewMode}
          setPreviewMode={edit.setPreviewMode}
          avatarInputRef={edit.avatarInputRef}
          bannerInputRef={edit.bannerInputRef}
          handleAvatarUpload={edit.handleAvatarUpload}
          handleBannerUpload={edit.handleBannerUpload}
          saveAllEdits={edit.saveAllEdits}
          cancelEdits={edit.cancelEdits}
          onStoryClick={() => setStoryOpen(true)}
        />

        {/* ═══ HERO SECTION ═══ */}
        <HeroSection
          model={model} displayModel={displayModel} posts={posts} uploads={uploads} wallPosts={wallPosts}
          isTierView={isNavActive} contentUnlocked={contentUnlocked} visitorRegistered={visitorRegistered}
          isEditMode={edit.isEditMode} isModelLoggedIn={isModelLoggedIn}
          chatOpen={chatOpen} setChatOpen={setChatOpen} chatUnread={chatUnread}
          activeStories={activeStories} setStoryViewIdx={setStoryViewIdx}
          edit={edit}
          instagramHandle={instagramHandle}
        />

        {/* ═══ EXPIRED CODE BANNER ═══ */}
        {expiredCodeInfo && !unlockedTier && (
          <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 mb-4 mt-4">
            <div className="flex items-center justify-between px-5 py-3.5 rounded-xl"
              style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)" }}>
              <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "var(--warning)" }}>
                <AlertTriangle className="w-4 h-4" />
                <span>Ton code a expire</span>
              </div>
              <button onClick={() => setGalleryTier("home")}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                style={{ background: "var(--warning)", color: "#fff" }}>
                Renouveler
              </button>
            </div>
          </div>
        )}

        {/* ═══ DESKTOP TIER NAV ═══ */}
        <DesktopTierNav
          galleryTier={galleryTier} setGalleryTier={setGalleryTier} setFocusPack={setFocusPack}
          activePacks={activePacks} uploads={uploads} unlockedTier={unlockedTier} isModelLoggedIn={isModelLoggedIn}
        />

        {/* ═══ TIER VIEW MINI HEADER ═══ */}
        {isTierView && (
          <div key={`tier-header-${galleryTier}`} className="flex items-center gap-3 max-w-6xl mx-auto px-5 sm:px-8 md:px-12 py-3 fade-up">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid var(--tier-${normalizeTier(galleryTier)})` }}>
              {displayModel?.avatar ? <img src={displayModel.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ background: "var(--bg3)" }} />}
            </div>
            <div>
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{displayModel?.display_name}</span>
              <span className="text-xs ml-2" style={{ color: `var(--tier-${normalizeTier(galleryTier)})` }}>
                {TIER_META[galleryTier]?.symbol} {TIER_META[galleryTier]?.label}
              </span>
            </div>
          </div>
        )}

        {/* ═══ TAB CONTENT ═══ */}
        <div
          key={galleryTier}
          id={`heaven-tabpanel-${galleryTier}`}
          role="tabpanel"
          aria-labelledby={`heaven-tab-${galleryTier === "home" ? "feed" : galleryTier}`}
          tabIndex={0}
          className="max-w-6xl mx-auto px-4 sm:px-8 md:px-12 py-2 sm:py-8 fade-up"
        >

          {/* ── FEED ── */}
          {(galleryTier === "feed" || galleryTier === "home") && (
            <>
              {/* BRIEF-22+23 — Gestion packs/contenu admin : intégration native
                  ContenuPanel existant en attente cadrage NB (Phase 3 — refacto
                  pour découpler les 30+ props du shell agence/page.tsx, soit ~4-6h
                  de travail). Pour l'instant, l'admin doit utiliser /agence/contenu
                  (legacy) pour gérer prix/photos/features. */}
              {/* BRIEF-23 — PostComposer admin DANS le feed (in-context publishing).
                  NB 2026-04-25 evening : PostComposer aligné avec les posts du feed
                  (pas de wrapper max-w-6xl séparé). Le PostComposer interne a déjà
                  son max-w-2xl pour matcher la largeur des posts. */}
              {isModelLoggedInActual && !edit.previewMode && (
                <PostComposer canPost={true} slug={slug} />
              )}
              <FeedView
                model={model} displayModel={displayModel} posts={posts} uploads={uploads} wallPosts={wallPosts}
                wallContent={wallContent} setWallContent={setWallContent} wallPosting={wallPosting}
                isModelLoggedIn={isModelLoggedIn} contentUnlocked={contentUnlocked}
                unlockedTier={unlockedTier} visitorRegistered={visitorRegistered}
                visitorHandle={visitorHandle} visitorPlatform={visitorPlatform} clientId={clientId}
                subscriberUsername={subscriberUsername} hasSubscriberIdentity={hasSubscriberIdentity}
                purchasedItems={purchasedItems} modelId={modelId} slug={slug}
                setLightboxUrl={setLightboxUrl} setGalleryTier={setGalleryTier} setWallPosts={setWallPosts} setPosts={setPosts}
              />
            </>
          )}

          {/* ── TIER CONTENT ── */}
          {galleryTier !== "home" && galleryTier !== "feed" && galleryTier !== "custom" && (
            <TierView
              galleryTier={galleryTier} posts={posts} uploads={uploads} packs={packs}
              activePacks={activePacks} displayPacks={displayPacks}
              isModelLoggedIn={isModelLoggedIn} unlockedTier={unlockedTier} isEditMode={edit.isEditMode}
              subscriberUsername={subscriberUsername} hasSubscriberIdentity={hasSubscriberIdentity}
              modelId={modelId} model={model}
              zoomedItem={zoomedItem} setZoomedItem={setZoomedItem}
              setLightboxUrl={setLightboxUrl} setGalleryTier={setGalleryTier}
              setFocusPack={setFocusPack} setShowUnlock={setShowUnlock}
              setUploads={setUploads} setPosts={setPosts}
              edit={edit}
            />
          )}

          {/* ── CUSTOM / SHOP ── */}
          {galleryTier === "custom" && (
            <div className="fade-up">
              <ShopTab
                clientId={clientId} unlockedTier={unlockedTier} isEditMode={edit.isEditMode}
                packs={packs} activePacks={activePacks} displayPacks={displayPacks}
                expandedPack={expandedPack} setExpandedPack={setExpandedPack}
                focusPack={focusPack} setFocusPack={setFocusPack}
                shopSection={shopSection} setShopSection={setShopSection} setChatOpen={setChatOpen}
                handleUpdatePack={edit.handleUpdatePack} handleDeletePack={edit.handleDeletePack} handleAddPack={edit.handleAddPack}
                visitorHandle={visitorHandle} model={slug}
                authHeaders={() => {
                  const h: Record<string, string> = { "Content-Type": "application/json" };
                  if (modelAuth?.token) h["Authorization"] = `Bearer ${modelAuth.token}`;
                  return h;
                }}
                paypalHandle={model?.paypal_handle}
              />
            </div>
          )}
        </div>

        {/* ═══ OVERLAYS & MODALS ═══ */}

        {/* Subscription Panel */}
        {showSubscriptionPanel && clientId && (
          <SubscriptionPanel slug={slug} clientId={clientId} activeCode={activeCode} packs={packs}
            unlockedTier={unlockedTier} uploads={uploads} visitorPlatform={visitorPlatform} visitorHandle={visitorHandle}
            onCodeValidated={(code) => {
              setActiveCode(code);
              if (code.tier) setUnlockedTier(code.tier);
              const ad = JSON.stringify({ tier: code.tier, expiresAt: code.expiresAt, code: code.code });
              sessionStorage.setItem(`heaven_access_${slug}`, ad);
              localStorage.setItem(`heaven_access_${slug}`, ad);
              const fp = getDeviceFingerprint();
              fetch("/api/codes/security", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code_id: code.code, fingerprint: fp, user_agent: navigator.userAgent }),
              }).then(r => r.json()).then(sec => {
                if (!sec.allowed) { setUnlockedTier(null); setActiveCode(null); sessionStorage.removeItem(`heaven_access_${slug}`); localStorage.removeItem(`heaven_access_${slug}`); alert(sec.message || "Code bloqué"); }
              }).catch(() => {});
            }}
            onClose={() => setShowSubscriptionPanel(false)}
          />
        )}

        {/* Unlock Sheet */}
        {showUnlock && (
          <UnlockSheet
            activePacks={activePacks} model={model} focusPack={focusPack} setFocusPack={setFocusPack}
            setCheckoutPack={setCheckoutPack} handleCodeValidation={handleCodeValidation}
            onClose={() => setShowUnlock(false)}
          />
        )}

        {/* Pack Detail Modal */}
        {selectedPack && <PackDetailModal pack={selectedPack} onClose={() => setSelectedPack(null)} />}

        {/* Payment Checkout */}
        {checkoutPack && (
          <PaymentCheckout
            model={slug}
            pack={{ id: checkoutPack.id, name: checkoutPack.name, price: checkoutPack.price, color: TIER_HEX[checkoutPack.id] || checkoutPack.color }}
            tier={checkoutPack.id}
            clientPseudo={subscriberUsername || visitorHandle || "visitor"}
            clientPlatform={visitorPlatform || "snap"}
            paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}
            revolutEnabled={!!process.env.NEXT_PUBLIC_REVOLUT_ENABLED}
            onSuccess={(code) => {
              setCheckoutPack(null);
              setUnlockedTier(checkoutPack.id);
              const ad = JSON.stringify({ tier: checkoutPack.id, expiresAt: new Date(Date.now() + 720 * 3600000).toISOString(), code });
              sessionStorage.setItem(`heaven_access_${slug}`, ad);
              localStorage.setItem(`heaven_access_${slug}`, ad);
              setShopToast(`✅ Accès ${checkoutPack.name} activé ! Code: ${code}`);
              setTimeout(() => setShopToast(null), 8000);
            }}
            onError={(msg) => { setShopToast(`❌ ${msg}`); setTimeout(() => setShopToast(null), 5000); }}
            onClose={() => setCheckoutPack(null)}
          />
        )}

        {/* Lightbox */}
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

        {/* Chat Panel */}
        {!isModelLoggedIn && model && chatOpen && (
          <ChatPanel model={model} chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
            sendMessage={sendMessage} chatEndRef={chatEndRef} setChatOpen={setChatOpen}
            isGuest={!visitorRegistered}
            onUpgrade={() => setGateDismissed(false)} />
        )}

        {/* BRIEF-10 AG04 : Age Gate Modal bloquant avant 1er message */}
        <AgeGateModal
          open={ageGateOpen}
          onCertify={async () => {
            const cid = clientId || guestClientId;
            try {
              await fetch("/api/age-gate/certify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cid ? { client_id: cid } : {}),
              });
            } catch { /* non-blocking */ }
            setAgeCertifiedCookie();
            setAgeCertified(true);
            setAgeGateOpen(false);
            if (pendingSendRef.current) {
              pendingSendRef.current = false;
              // Appel direct (pas via sendMessage wrapped — sinon boucle)
              try { await sendMessageRaw(); } catch { /* silent */ }
            }
          }}
          onMinor={async () => {
            const cid = clientId || guestClientId;
            try {
              await fetch("/api/age-gate/decline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cid ? { client_id: cid } : {}),
              });
            } catch { /* non-blocking */ }
            pendingSendRef.current = false;
            setAgeGateOpen(false);
            if (typeof window !== "undefined") {
              window.location.href = "https://instagram.com/yumiiiclub";
            }
          }}
        />

        {/* Order History */}
        {orderHistoryOpen && !isModelLoggedIn && (
          <OrderHistoryPanel orders={orders} onClose={() => setOrderHistoryOpen(false)} />
        )}

        {/* Toasts */}
        {shopToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-slide-down"
            style={{ background: "var(--gold)", color: "#000" }}>
            <Coins className="w-3.5 h-3.5" /> {shopToast}
          </div>
        )}
        {edit.editToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-slide-down"
            style={{ background: "var(--accent)", color: "#000" }}>
            <Check className="w-3.5 h-3.5" /> {edit.editToast}
          </div>
        )}

        {/* Edit Mode Save Bar */}
        {edit.isEditMode && edit.editDirty && (
          <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
            style={{ background: "var(--surface)", borderTop: "1px solid var(--border2)", boxShadow: "0 -4px 24px rgba(0,0,0,0.3)" }}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 py-3 flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Modifications non sauvegardées</p>
              <div className="flex items-center gap-2">
                <button onClick={edit.cancelEdits}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid var(--border2)" }}>
                  <RotateCcw className="w-3 h-3" /> Annuler
                </button>
                <button onClick={edit.saveAllEdits} disabled={edit.editSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#000" }}>
                  {edit.editSaving ? <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} /> : <Save className="w-3 h-3" />}
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Uploading Overlay */}
        {edit.uploading && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--text)" }}>Upload en cours...</p>
            </div>
          </div>
        )}

        {/* ═══ MOBILE BOTTOM NAV ═══ */}
        {!(edit.isEditMode && edit.editDirty) && (
          <MobileBottomNav galleryTier={galleryTier} setGalleryTier={setGalleryTier} setFocusPack={setFocusPack}
            activePacks={activePacks} unlockedTier={unlockedTier} isModelLoggedIn={isModelLoggedIn} />
        )}

      </div>

      {/* Story Viewer */}
      {storyViewIdx !== null && activeStories[storyViewIdx] && (
        <StoryViewer stories={activeStories} currentIndex={storyViewIdx}
          onClose={() => setStoryViewIdx(null)}
          onNext={() => setStoryViewIdx(i => i !== null && i < activeStories.length - 1 ? i + 1 : i)}
          onPrev={() => setStoryViewIdx(i => i !== null && i > 0 ? i - 1 : i)}
          model={displayModel ? { display_name: displayModel.display_name, avatar: displayModel.avatar } : { display_name: "", avatar: "" }} />
      )}

      {/* Mobile Code Input Sheet */}
      {codeSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden" onClick={() => setCodeSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full rounded-t-2xl p-5 animate-slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
                <Key className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Code d&apos;accès</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Entre ton code pour débloquer le contenu exclusif</p>
              </div>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
              const code = input?.value?.trim();
              if (!code) return;
              const ok = await handleCodeValidation(code, input);
              if (!ok && input) {
                input.style.borderColor = "#EF4444";
                input.placeholder = "Code invalide";
                input.value = "";
                setTimeout(() => { input.placeholder = "ENTRE TON CODE"; input.style.borderColor = ""; }, 2000);
              }
            }} className="flex items-center gap-2">
              <input type="text" placeholder="ENTRE TON CODE" autoFocus
                className="flex-1 px-4 py-3 rounded-xl text-sm font-mono uppercase tracking-wider outline-none text-center"
                style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
              <button type="submit"
                className="px-5 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
                style={{ background: "var(--accent)", color: "#fff", border: "none" }}>
                Valider
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ PUBLIC FOOTER (BRIEF-10 AG03) ═══ */}
      <PublicFooter />
    </div>
  );
}


// ═══════════════════════════════════════════
//  SUB-COMPONENTS (inline, co-located)
// ═══════════════════════════════════════════

// ── Header Bar ──
// ProfilePseudoDropdown — pseudo cliquable avec menu admin (Voir CP / Logout).
// NB 2026-04-25 evening : pseudo seul à gauche, click ouvre dropdown.
function ProfilePseudoDropdown({ displayName, isOnline, tierBadge, isAdmin, onPseudoClick }: {
  displayName: string;
  isOnline: boolean;
  tierBadge: { hex: string; symbol: string; label: string } | null;
  isAdmin: boolean;
  onPseudoClick: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("heaven_auth");
      sessionStorage.removeItem("heaven_auth");
      window.dispatchEvent(new Event("heaven:auth-changed"));
      window.location.href = "/agence";
    } catch {
      window.location.href = "/agence";
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          if (isAdmin) setOpen((v) => !v);
          else onPseudoClick();
        }}
        aria-haspopup={isAdmin ? "menu" : undefined}
        aria-expanded={isAdmin ? open : undefined}
        className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0 transition-opacity hover:opacity-80"
      >
        <span className="text-xs sm:text-sm font-bold tracking-wide uppercase truncate" style={{ color: "var(--text)", letterSpacing: "0.08em" }}>
          {displayName}
        </span>
        {isOnline && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--success)", boxShadow: "0 0 6px rgba(16,185,129,0.5)" }} />}
        {tierBadge && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0"
            style={{ background: `${tierBadge.hex}20`, color: tierBadge.hex }}>
            {tierBadge.symbol} {tierBadge.label}
          </span>
        )}
      </button>

      {isAdmin && open && (
        <div role="menu" className="absolute top-full left-0 mt-2 min-w-[180px] rounded-xl py-1 z-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            animation: "fadeUp 0.15s ease-out",
          }}>
          <a href="/agence" role="menuitem" onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium no-underline transition-colors hover:bg-white/[0.04]"
            style={{ color: "var(--text)" }}>
            <UserCog className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            <span>Voir le CP</span>
          </a>
          <div className="my-1 mx-3" style={{ borderTop: "1px solid var(--border)" }} />
          <button role="menuitem" onClick={() => { setOpen(false); handleLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium cursor-pointer bg-transparent border-none transition-colors hover:bg-white/[0.04]"
            style={{ color: "var(--text-muted)" }}>
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderBar({ model, displayModel, isModelLoggedIn, isModelLoggedInActual, visitorRegistered, visitorPlatform, visitorHandle, visitorVerified, unlockedTier, activeCode, chatOpen, setChatOpen, chatUnread, newNotifications, orderHistoryOpen, setOrderHistoryOpen, clearNotifications, codeSheetOpen, setCodeSheetOpen, handleCodeValidation, modelId, slug, galleryTier, setGalleryTier, onReopenGate, onAdminLogin, editDirty, editSaving, previewMode, setPreviewMode, avatarInputRef, bannerInputRef, handleAvatarUpload, handleBannerUpload, saveAllEdits, cancelEdits, onStoryClick }: {
  model: ModelInfo; displayModel: ModelInfo | null; isModelLoggedIn: boolean;
  /** Real admin session flag, ignoring previewMode. Used to show admin tools while letting children behave as visitor. */
  isModelLoggedInActual: boolean;
  visitorRegistered: boolean; visitorPlatform: VisitorPlatform | null; visitorHandle: string; visitorVerified: boolean;
  unlockedTier: string | null; activeCode: AccessCode | null;
  chatOpen: boolean; setChatOpen: (v: boolean) => void; chatUnread: number;
  newNotifications: number; orderHistoryOpen: boolean; setOrderHistoryOpen: (v: boolean) => void; clearNotifications: () => void;
  codeSheetOpen: boolean; setCodeSheetOpen: (v: boolean) => void;
  handleCodeValidation: (code: string, input?: HTMLInputElement) => Promise<boolean>;
  modelId: string; slug: string;
  galleryTier: string; setGalleryTier: (v: string) => void;
  onReopenGate?: () => void;
  /** Opens AdminAuthModal — always rendered on /m/{slug} unless admin session is active. */
  onAdminLogin?: () => void;
  // BRIEF-17 T17-B2/B3/B4 — admin edit toolbox.
  editDirty: boolean;
  editSaving: boolean;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  saveAllEdits: () => Promise<void>;
  cancelEdits: () => void;
  // BRIEF-19+21 — callback ouverture StoryGeneratorModal.
  onStoryClick: () => void;
}) {
  return (
    <div className="sticky top-0 left-0 right-0 z-40 px-3 sm:px-5 md:px-8 lg:px-12 py-2"
      style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center">
        {/* LEFT: Pseudo cliquable seul (dropdown contient Voir CP + Logout)
            NB 2026-04-25 evening : structure 3 zones — pseudo gauche / admin tools centrés / visiteur droite */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <ProfilePseudoDropdown
            displayName={model.display_name}
            isOnline={!!displayModel?.online}
            tierBadge={galleryTier !== "home" ? { hex: TIER_HEX[galleryTier] || "var(--accent)", symbol: TIER_META[galleryTier]?.symbol || "", label: TIER_META[galleryTier]?.label || galleryTier } : null}
            isAdmin={isModelLoggedInActual}
            onPseudoClick={() => setGalleryTier("home")}
          />
        </div>

        {/* CENTER: tous les boutons admin centrés (visible admin only hors preview) */}
        <div className="flex-1 flex items-center justify-center gap-1 min-w-0 px-2 overflow-x-auto no-scrollbar">
          {galleryTier !== "home" && (
            <button onClick={() => setGalleryTier("home")}
              className="text-sm font-bold shrink-0 cursor-pointer bg-transparent border-none transition-all hover:scale-105 active:scale-95 p-2"
              style={{ color: "var(--accent)" }} title="Retour accueil profil">&#8592;</button>
          )}
          {isModelLoggedInActual && !previewMode && (
            <>
              <HeavenAdminActions
                modelSlug={slug}
                onStoryClick={onStoryClick}
                compact={true}
                hideViewProfile={true}
              />
              <div className="flex items-center gap-1">
                {/* NB 2026-04-25 late : boutons Camera (photo profil) + ImageIcon (banner) du header
                    retirés — obsolètes depuis BRIEF-18 (hover overlay direct sur avatar + banner).
                    Les inputs file restent montés (refs utilisés par les overlays hover Hero). */}
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                {editDirty && (
                  <button
                    onClick={saveAllEdits}
                    disabled={editSaving}
                    title="Sauvegarder"
                    className="px-2 h-9 sm:h-7 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    SAVE
                  </button>
                )}
                {editDirty && (
                  <button
                    onClick={cancelEdits}
                    title="Annuler"
                    aria-label="Annuler"
                    className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-white/[0.06]"
                    style={{ color: "var(--w3)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setPreviewMode(true)}
                  title="Mode visiteur (preview)"
                  aria-label="Mode visiteur (preview)"
                  className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-white/[0.06]"
                  style={{ color: "var(--w3)" }}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
          {isModelLoggedInActual && previewMode && (
            <button
              onClick={() => setPreviewMode(false)}
              title="Retour mode admin"
              className="px-2 h-9 sm:h-7 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
              style={{ background: "var(--w3)", color: "var(--bg)" }}
            >
              <UserCog className="w-3 h-3" />
              ADMIN
            </button>
          )}
        </div>
        {/* RIGHT: Visitor info */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {visitorRegistered && (
            <>
              {/* Unified identity badge: @pseudo + status + tier ClientBadge */}
              {!isModelLoggedIn && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg min-w-0"
                  style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
                  {visitorPlatform && (
                    <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                      {visitorPlatform === "snap" ? <Ghost className="w-3 h-3" style={{ color: "#FFFC00" }} /> : <Instagram className="w-3 h-3" style={{ color: "#C13584" }} />}
                    </div>
                  )}
                  <span className="text-[10px] sm:text-[11px] font-semibold truncate max-w-[60px] sm:max-w-[100px]" style={{ color: "var(--text)" }}>@{visitorHandle}</span>
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: visitorVerified ? "#10B981" : "#EF4444" }}>
                    {visitorVerified ? <Check className="w-2 h-2 text-white" /> : <Lock className="w-2 h-2 text-white" />}
                  </div>
                  {/* Tier badge proéminent (PLATINUM/GOLD/SILVER...) */}
                  <ClientBadge tier={unlockedTier} size="sm" />
                </div>
              )}
              <button onClick={() => { setOrderHistoryOpen(!orderHistoryOpen); clearNotifications(); }}
                className="relative w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0"
                style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
                <ShoppingBag className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                {newNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: "#10B981", color: "#fff", boxShadow: "0 0 6px rgba(16,185,129,0.5)" }}>{newNotifications}</span>
                )}
              </button>
              {unlockedTier ? (
                <CountdownBadge tier={unlockedTier} expiresAt={activeCode?.expiresAt || ""} />
              ) : (
                <>
                  <div className="relative group hidden sm:block">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
                      const code = input?.value?.trim();
                      if (!code) return;
                      await handleCodeValidation(code, input);
                    }} className="flex items-center gap-1.5">
                      <input type="text" placeholder="CODE"
                        className="w-[100px] md:w-[110px] px-3 py-1.5 rounded-xl text-[11px] font-mono uppercase tracking-wider outline-none text-center"
                        style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }} />
                      <button type="submit" className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0"
                        style={{ background: "var(--accent)", border: "none" }}>
                        <Key className="w-3.5 h-3.5 text-white" />
                      </button>
                    </form>
                  </div>
                  <button onClick={() => setCodeSheetOpen(true)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0 sm:hidden"
                    style={{ background: "var(--accent)", border: "none" }}>
                    <Key className="w-3.5 h-3.5 text-white" />
                  </button>
                </>
              )}
            </>
          )}
          <ThemeToggle size="sm" />
          {/* Login / Upgrade — visiteur anonyme uniquement */}
          {!visitorRegistered && !isModelLoggedIn && onReopenGate && (
            <button
              onClick={onReopenGate}
              title="Ajouter ton Insta/Snap → accès stories privées & promos Fanvue"
              className="px-3 py-1.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-all hover:brightness-110 active:scale-95 shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--accent), #A78BFA)",
                color: "#fff",
                boxShadow: "0 2px 12px rgba(230,51,41,0.25)",
              }}
            >
              Upgrade
            </button>
          )}
          {/* Admin access: shield icon, visible pour non-admin */}
          {!isModelLoggedIn && onAdminLogin && (
            <button
              type="button"
              onClick={onAdminLogin}
              title="Accès admin"
              aria-label="Accès admin"
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          )}
          {/* NB 2026-04-25 evening : Logout admin déplacé dans le dropdown du pseudo
              (cf. <ProfilePseudoDropdown> à gauche). RIGHT cluster reste pour
              fonctions visiteur (badge tier, code input, theme, Upgrade). */}
        </div>
      </div>
    </div>
  );
}

// ── Hero Section ──
function HeroSection({ model, displayModel, posts, uploads, wallPosts, isTierView, contentUnlocked, visitorRegistered, isEditMode, isModelLoggedIn, chatOpen, setChatOpen, chatUnread, activeStories, setStoryViewIdx, edit, instagramHandle }: {
  model: ModelInfo; displayModel: ModelInfo | null; posts: Post[]; uploads: UploadedContent[]; wallPosts: WallPost[];
  isTierView: boolean; contentUnlocked: boolean; visitorRegistered: boolean; isEditMode: boolean;
  isModelLoggedIn: boolean; chatOpen: boolean; setChatOpen: (v: boolean) => void; chatUnread: number;
  activeStories: Post[]; setStoryViewIdx: (v: number | null) => void;
  edit: ReturnType<typeof useEditMode>;
  /** Instagram handle for CTA buttons (B9). Null/undefined → CTAs hidden. */
  instagramHandle?: string | null;
}) {
  const latestImagePost = posts.find(p => p.media_url);
  const bannerUrl = displayModel?.banner || latestImagePost?.media_url || null;
  // NB 2026-04-25 evening : accordéon édition profil (default fermé pour vue propre)
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  return (
    <div className="relative" style={{
      maxHeight: isTierView ? "0px" : "70vh", overflow: "hidden",
      transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
      opacity: isTierView ? 0 : 1,
    }}>
      <div className="min-h-[40vh] sm:min-h-[55vh] md:min-h-[70vh] relative overflow-hidden group/banner" style={{
        background: bannerUrl ? `url(${bannerUrl}) center/cover no-repeat` : "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)",
      }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--bg) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.2) 60%, transparent 100%), radial-gradient(ellipse at 20% 80%, rgba(0,0,0,0.4), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.2), transparent 60%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)" }} />
        {!contentUnlocked && visitorRegistered && (
          <>
            <div className="absolute inset-0" style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} />
            <div className="absolute inset-0 heaven-grid-overlay" />
          </>
        )}
        {/* NB 2026-04-25 : bouton edit banner au hover (admin only — isEditMode auto-true).
            Refs vivent dans HeaderBar / HeavenAdminHeader → click sur ref existante,
            pas de duplication d'input file. */}
        {isEditMode && (
          <button
            type="button"
            onClick={() => edit.bannerInputRef.current?.click()}
            aria-label="Modifier la bannière"
            title="Modifier la bannière"
            className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-semibold opacity-0 group-hover/banner:opacity-100 transition-opacity cursor-pointer border-none"
            style={{
              background: "rgba(0,0,0,0.65)",
              color: "#fff",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Modifier la bannière</span>
          </button>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 md:px-12 pb-6 sm:pb-14 md:pb-16 max-w-6xl mx-auto">
          <div className="flex items-end gap-5 sm:gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative shrink-0 profile-stagger-1 group/avatar">
              <div className={`rounded-full p-[3px] ${activeStories.length > 0 ? "cursor-pointer" : ""}`}
                style={{ background: activeStories.length > 0 ? "linear-gradient(135deg, var(--accent), #F43F5E, #D946EF, #F59E0B)" : "var(--bg)" }}
                onClick={() => { if (activeStories.length > 0) setStoryViewIdx(0); }}>
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden"
                  style={{ border: "3px solid var(--bg)", background: displayModel?.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
                  {displayModel?.avatar ? <img src={displayModel.avatar} alt={displayModel.display_name} className="w-full h-full object-cover" />
                    : <span className="flex items-center justify-center w-full h-full text-3xl sm:text-4xl font-light text-white" style={{ letterSpacing: "0.05em" }}>{displayModel?.display_name.charAt(0)}</span>}
                </div>
              </div>
              {!isEditMode && displayModel?.online && (
                <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full" style={{ background: "var(--success)", border: "2px solid var(--bg)", boxShadow: "0 0 10px rgba(16,185,129,0.6)" }} />
              )}
              {/* NB 2026-04-25 : bouton edit photo profil au hover (admin only).
                  Click → trigger ref input file qui vit dans HeaderBar / HeavenAdminHeader. */}
              {isEditMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // ne pas trigger story view
                    edit.avatarInputRef.current?.click();
                  }}
                  aria-label="Modifier la photo de profil"
                  title="Modifier la photo de profil"
                  className="absolute inset-[3px] rounded-full flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer border-none"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                  }}
                >
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-white">Modifier</span>
                </button>
              )}
            </div>
            {/* Name + bio + stats */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 sm:gap-4">
              <h1 className="profile-stagger-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light uppercase truncate"
                style={{ color: "#fff", letterSpacing: "0.12em", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>{displayModel?.display_name}</h1>
              {/* NB 2026-04-25 : bouton chat TOUJOURS visible (admin + visiteur).
                  Admin voit la même UI pour preview en temps réel — la modèle ne va
                  pas s'envoyer de message à elle-même mais le bouton reste visible
                  pour que l'aperçu soit fidèle à ce que voit le client. */}
              <button onClick={() => setChatOpen(!chatOpen)}
                className="relative shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, var(--rose), var(--accent))", border: "none",
                  boxShadow: chatUnread > 0 ? "0 0 8px rgba(230,51,41,0.5), 0 0 16px rgba(16,185,129,0.3)" : "0 2px 8px rgba(230,51,41,0.3)",
                  animation: chatUnread > 0 ? "chatBubbleGlow 1.5s ease-in-out infinite" : "none",
                }}>
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: "#10B981", color: "#fff", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }}>{chatUnread}</span>
                )}
              </button>
              {/* NB 2026-04-25 evening : bouton "Éditer profil" inline à côté du chat (admin only).
                  Remplace l'accordéon standalone qui chevauchait d'autres sections. */}
              {isEditMode && (
                <button onClick={() => setProfileEditOpen(v => !v)}
                  title="Éditer profil"
                  aria-label="Éditer profil"
                  aria-expanded={profileEditOpen}
                  className="relative shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: profileEditOpen ? "var(--accent)" : "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                  }}>
                  <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: profileEditOpen ? "#fff" : "var(--text)" }} />
                </button>
              )}
            </div>
              {displayModel?.bio && <p className="profile-stagger-3 text-sm sm:text-base mt-2 sm:mt-3 line-clamp-2 leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.7)" }}>{displayModel.bio}</p>}
              {displayModel?.status_text && !isEditMode && <p className="text-sm sm:text-base mt-2 max-w-md" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{displayModel.status_text}</p>}
              {/* Profile CTAs (B9 + NB 2026-04-24 Fanvue button) — follow IG + DM + Fanvue
                  NB 2026-04-25 evening : retrait conditions !isEditMode && !isModelLoggedIn
                  → CTAs TOUJOURS visibles (admin doit voir exactement comme visiteur, pas
                  de sacrifice d'info quand admin connectée — règle SPRBP). */}
              {(instagramHandle || (model as { fanvue_url?: string | null })?.fanvue_url || (model as { fanvue_handle?: string | null })?.fanvue_handle) && (
                <div className="profile-stagger-3 mt-3 sm:mt-4">
                  <ProfileCta
                    handle={instagramHandle}
                    size="sm"
                    fanvueUrl={
                      (model as { fanvue_url?: string | null })?.fanvue_url
                      || (model as { fanvue_handle?: string | null })?.fanvue_handle
                      || null
                    }
                  />
                </div>
              )}
              <div className="profile-stagger-4 flex items-center gap-6 sm:gap-8 mt-3 sm:mt-4">
                <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}><span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{posts.length}</span> posts</span>
                <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}><span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{wallPosts.length}</span> fans</span>
                <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.5)" }}><span className="font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.9)" }}>{uploads.length + posts.filter(p => p.media_url).length}</span> media</span>
                {(() => {
                  const platforms = (model as unknown as Record<string, unknown>).platforms as Record<string, string> | undefined;
                  if (!platforms) return null;
                  return (
                    <div className="hidden sm:flex items-center gap-2 ml-2">
                      {Object.entries(platforms).filter(([, v]) => v).map(([platform, handle]) => {
                        const p = PLATFORMS_MAP[platform]; if (!p || !handle) return null;
                        const url = handle.startsWith("http") ? handle : `${p.prefix}${handle}`;
                        return <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 no-underline opacity-60 hover:opacity-100 transition-opacity" title={`${platform}: @${handle}`}><div className="w-3.5 h-3.5 rounded-full" style={{ background: p.color }} /></a>;
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* BRIEF-18 NB 2026-04-25 — hint "utilise la barre admin" supprimé :
          remplacé par les boutons d'édition au hover directement sur le banner
          et l'avatar (UX in-context plus naturelle). */}
      {/* NB 2026-04-25 evening : édition profil = modal centré, déclenché par
          le bouton crayon à côté du chat (cf. ligne ~1300). Plus d'accordéon
          standalone qui chevauchait d'autres sections. */}
      {isEditMode && profileEditOpen && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", animation: "fadeIn 0.2s ease" }}
          onClick={() => setProfileEditOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: "scaleUp 0.2s ease" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text)" }}>Éditer profil</span>
              </span>
              <button
                onClick={() => setProfileEditOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-white/[0.06]"
                style={{ background: "transparent", border: "none" }}
              >
                <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Display name</label>
                <input value={displayModel?.display_name || ""} onChange={e => edit.updateEditField("display_name", e.target.value)}
                  className="w-full text-sm font-bold bg-transparent outline-none rounded-lg px-3 py-2" style={{ color: "var(--text)", border: "1px solid var(--border)" }} placeholder="Display name" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Status</label>
                <input value={displayModel?.status || ""} onChange={e => edit.updateEditField("status", e.target.value)}
                  className="w-full text-xs bg-transparent outline-none rounded-lg px-3 py-2" style={{ color: "var(--text)", border: "1px solid var(--border)" }} placeholder="Status" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Humeur / promo</label>
                <input value={edit.editProfile.status_text ?? displayModel?.status_text ?? ""} onChange={e => edit.updateEditField("status_text", e.target.value)}
                  placeholder="Ton humeur, une promo, une annonce..." className="w-full text-sm bg-transparent outline-none rounded-lg px-3 py-2"
                  style={{ color: "var(--text)", border: "1px solid var(--border)" }} maxLength={200} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Bio</label>
                <textarea value={displayModel?.bio || ""} onChange={e => edit.updateEditField("bio", e.target.value)}
                  className="w-full text-sm leading-relaxed bg-transparent outline-none rounded-lg px-3 py-2 resize-none" style={{ color: "var(--text)", border: "1px solid var(--border)" }} placeholder="Bio..." rows={3} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Desktop Tier Nav ──
function DesktopTierNav({ galleryTier, setGalleryTier, setFocusPack, activePacks, uploads, unlockedTier, isModelLoggedIn }: {
  galleryTier: string; setGalleryTier: (v: string) => void; setFocusPack: (v: string | null) => void;
  activePacks: PackConfig[]; uploads: UploadedContent[]; unlockedTier: string | null; isModelLoggedIn: boolean;
}) {
  const packTiers = activePacks.map(p => p.id);
  return (
    <div className="sticky top-[36px] md:top-[40px] z-30 py-2 hidden md:block"
      style={{ background: "color-mix(in srgb, var(--bg) 92%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12">
        <div className="flex gap-2 justify-center pb-1" role="tablist" aria-label="Navigation profil">
          {/* Feed */}
          <button
            role="tab"
            id="heaven-tab-feed"
            aria-controls="heaven-tabpanel-feed"
            aria-selected={galleryTier === "feed" || galleryTier === "home"}
            aria-label="Onglet Feed"
            onClick={() => { setGalleryTier(galleryTier === "feed" ? "home" : "feed"); setFocusPack(null); }}
            className="relative flex-1 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] group overflow-hidden"
            style={{ minWidth: "70px", padding: "12px 16px", background: galleryTier === "feed" ? "linear-gradient(135deg, var(--accent), #F43F5E)" : "var(--surface)", border: galleryTier === "feed" ? "2px solid var(--accent)" : "1px solid var(--border)", boxShadow: galleryTier === "feed" ? "0 4px 16px rgba(230,51,41,0.25)" : "none" }}>
            <div className="flex flex-col items-center gap-1">
              <Newspaper className="w-4 h-4" aria-hidden="true" style={{ color: galleryTier === "feed" ? "#fff" : "var(--accent)" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: galleryTier === "feed" ? "#fff" : "var(--text)" }}>Feed</span>
            </div>
          </button>
          {/* Pack tiers */}
          {packTiers.map(t => {
            const tierHex = TIER_HEX[t] || "var(--text-muted)";
            const tierLabel = TIER_META[t]?.label || t.toUpperCase();
            const tierSymbol = TIER_META[t]?.symbol || "";
            const isLocked = !isModelLoggedIn && !(unlockedTier && tierIncludes(unlockedTier, t));
            const isActive = galleryTier === t;
            const previewImg = uploads.find(u => normalizeTier(u.tier) === t && u.dataUrl && u.type === "photo")?.dataUrl;
            return (
              <button
                key={t}
                role="tab"
                id={`heaven-tab-${t}`}
                aria-controls={`heaven-tabpanel-${t}`}
                aria-selected={isActive}
                aria-label={`Onglet ${tierLabel}${isLocked ? " (verrouillé)" : ""}`}
                onClick={() => { setGalleryTier(isActive ? "home" : t); setFocusPack(null); }}
                className="relative flex-1 rounded-xl cursor-pointer poker-tile group overflow-hidden"
                style={{ minWidth: "70px", height: "72px", background: isActive ? `linear-gradient(135deg, ${tierHex}, ${tierHex}CC)` : "var(--surface)", border: isActive ? `2px solid ${tierHex}` : "1px solid var(--border)", boxShadow: isActive ? `0 4px 20px ${tierHex}40` : "none", opacity: isLocked && !isActive ? 0.7 : 1 }}>
                <div className="absolute inset-0" aria-hidden="true">
                  {previewImg && !isActive ? <img src={previewImg} alt="" draggable={false} className="w-full h-full object-cover" style={{ filter: isLocked ? "blur(8px) brightness(0.3)" : "brightness(0.35)", transform: isLocked ? "scale(1.1)" : "none" }} />
                    : !isActive ? <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${tierHex}12, ${tierHex}06)` }} /> : null}
                </div>
                <div className="relative flex flex-col items-center justify-center h-full gap-0.5 px-3">
                  <span aria-hidden="true" className="absolute top-1 left-1.5 text-[8px] font-bold opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: isActive ? "#fff" : tierHex }}>{tierSymbol}</span>
                  <span aria-hidden="true" className="absolute bottom-1 right-1.5 text-[8px] font-bold opacity-0 group-hover:opacity-60 transition-opacity rotate-180" style={{ color: isActive ? "#fff" : tierHex }}>{tierSymbol}</span>
                  <span aria-hidden="true" className="text-xl transition-all duration-200 group-hover:scale-110 relative" style={{ color: isActive ? "#fff" : tierHex, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}>
                    {tierSymbol}{isLocked && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-2" aria-hidden="true" style={{ color: isActive ? "#fff" : tierHex, opacity: 0.7 }} />}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider transition-colors duration-200" style={{ color: isActive ? "#fff" : "var(--text)", textShadow: isActive || previewImg ? "0 1px 4px rgba(0,0,0,0.5)" : "none" }}>{tierLabel}</span>
                </div>
                {isActive && <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: tierHex, boxShadow: `0 0 10px ${tierHex}` }} />}
              </button>
            );
          })}
          {/* Custom */}
          <button
            role="tab"
            id="heaven-tab-custom"
            aria-controls="heaven-tabpanel-custom"
            aria-selected={galleryTier === "custom"}
            aria-label="Onglet Custom"
            onClick={() => { setGalleryTier(galleryTier === "custom" ? "home" : "custom"); setFocusPack(null); }}
            className="relative flex-1 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] group overflow-hidden"
            style={{ minWidth: "70px", padding: "12px 16px", background: galleryTier === "custom" ? "linear-gradient(135deg, #D4AF37, #B8860B)" : "var(--surface)", border: galleryTier === "custom" ? "none" : "1px solid var(--border)", boxShadow: galleryTier === "custom" ? "0 4px 16px rgba(184,134,11,0.25)" : "none" }}>
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4" aria-hidden="true" style={{ color: galleryTier === "custom" ? "#fff" : "#B8860B" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: galleryTier === "custom" ? "#fff" : "var(--text)" }}>Custom</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Bottom Nav ──
function MobileBottomNav({ galleryTier, setGalleryTier, setFocusPack, activePacks, unlockedTier, isModelLoggedIn }: {
  galleryTier: string; setGalleryTier: (v: string) => void; setFocusPack: (v: string | null) => void;
  activePacks: PackConfig[]; unlockedTier: string | null; isModelLoggedIn: boolean;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden safe-area-bottom"
      style={{ background: "color-mix(in srgb, var(--bg) 95%, transparent)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center justify-around px-2 py-2.5">
        {(() => {
          const feedActive = galleryTier === "feed" || galleryTier === "home";
          return (
            <button onClick={() => { setGalleryTier(galleryTier === "feed" ? "home" : "feed"); setFocusPack(null); }}
              className="flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all"
              style={{
                color: feedActive ? "var(--accent)" : "var(--text-muted)",
                background: feedActive ? "rgba(230,51,41,0.12)" : "transparent",
              }}>
              <Newspaper className="w-5 h-5" />
            </button>
          );
        })()}
        {activePacks.map(p => {
          const hex = TIER_HEX[p.id] || p.color;
          const isActive = galleryTier === p.id;
          const isLocked = !isModelLoggedIn && !(unlockedTier && tierIncludes(unlockedTier, p.id));
          return (
            <button key={p.id} onClick={() => { setGalleryTier(isActive ? "home" : p.id); setFocusPack(null); }}
              className="flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all"
              style={{
                color: isActive ? "#fff" : isLocked ? "var(--text-muted)" : hex,
                background: isActive ? hex : "transparent",
                opacity: isLocked && !isActive ? 0.4 : 1,
              }}>
              <span className="text-lg leading-none relative">{TIER_META[p.id]?.symbol}{isLocked && <Lock className="w-2 h-2 absolute -top-0.5 -right-2" style={{ color: isActive ? "#fff" : hex, opacity: 0.6 }} />}</span>
            </button>
          );
        })}
        <button onClick={() => { setGalleryTier(galleryTier === "custom" ? "home" : "custom"); setFocusPack(null); }}
          className="flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all"
          style={{
            color: galleryTier === "custom" ? "#fff" : "var(--text-muted)",
            background: galleryTier === "custom" ? "#B8860B" : "transparent",
          }}>
          <Sparkles className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}

// ── Feed View ──
function FeedView({ model, displayModel, posts, uploads, wallPosts, wallContent, setWallContent, wallPosting, isModelLoggedIn, contentUnlocked, unlockedTier, visitorRegistered, visitorHandle, visitorPlatform, clientId, subscriberUsername, hasSubscriberIdentity, purchasedItems, modelId, slug, setLightboxUrl, setGalleryTier, setWallPosts, setPosts }: {
  model: ModelInfo; displayModel: ModelInfo | null; posts: Post[]; uploads: UploadedContent[]; wallPosts: WallPost[];
  wallContent: string; setWallContent: (v: string) => void; wallPosting: boolean;
  isModelLoggedIn: boolean; contentUnlocked: boolean; unlockedTier: string | null;
  visitorRegistered: boolean; visitorHandle: string; visitorPlatform: VisitorPlatform | null; clientId: string | null;
  subscriberUsername: string; hasSubscriberIdentity: boolean; purchasedItems: Set<string>;
  modelId: string; slug: string;
  setLightboxUrl: (v: string | null) => void; setGalleryTier: (v: string) => void;
  setWallPosts: React.Dispatch<React.SetStateAction<WallPost[]>>; setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
}) {
  // ═══════════════════════════════════════════════════════════════════════════
  // Unified feed (Phase 3 Agent 3.B + Phase 5.B) — loads polymorphic items from
  // `agence_feed_items` (manual + wall + instagram) with visibility_computed.
  // Falls back to the legacy merge (posts[] + wallPosts[]) when the unified
  // endpoint returns nothing (table missing / empty).
  // Resolves P0-6 : IG posts visible on /m/yumi.
  // ═══════════════════════════════════════════════════════════════════════════
  const [feedItems, setFeedItems] = useState<FeedItem[] | null>(null);
  const [igExpanded, setIgExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let aborted = false;
    const params = new URLSearchParams();
    params.set("model", slug || modelId);
    if (clientId) params.set("fan_id", clientId);
    fetch(`/api/feed?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (!aborted) setFeedItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => {
        if (!aborted) setFeedItems([]);
      });
    return () => {
      aborted = true;
    };
  }, [slug, modelId, clientId]);

  // NB 2026-04-25 evening : forcer legacyItems qui contient TOUTES les sources
  // (wall + posts + uploads). unifiedItems (feedItems API) n'inclut pas les uploads
  // manuels — donc le feed paraissait vide pour les modèles n'ayant que des uploads.
  const useUnified = false;

  const quickPost = async (content: string) => {
    const pseudo = visitorHandle || "Anonyme";
    try {
      const res = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId, pseudo, content: content.trim(), client_id: clientId }),
      });
      if (res.ok) { const d = await res.json(); if (d.post) setWallPosts(prev => [d.post, ...prev]); }
    } catch {}
  };

  // Legacy merge (kept for fallback when agence_feed_items is empty).
  const visitorPosts = wallPosts.filter(w => !w.content?.includes("#post-") && w.pseudo !== "SYSTEM").map(w => ({ type: "wall" as const, id: w.id, created_at: w.created_at, data: w }));
  const filteredModelPosts = contentUnlocked ? posts : posts.filter(p => {
    const tier = normalizeTier(p.tier_required || "public");
    if (!tier || tier === "p0") return true;
    if (unlockedTier && tierIncludes(unlockedTier, tier)) return true;
    return false;
  });
  const modelPosts = filteredModelPosts.map(p => ({ type: "post" as const, id: p.id, created_at: p.created_at, data: p }));
  // NB 2026-04-25 evening : afficher aussi les uploads (manual content) dans le feed
  // avec mêmes règles de visibilité que les packs (tier-gated). Visible quand
  // dataUrl présent + tier respecté (idem packs).
  const uploadsAsFeed = uploads.filter(u => {
    if (!u.dataUrl) return false;
    const tier = normalizeTier(u.tier || "p0");
    if (!tier || tier === "p0") return true;
    if (contentUnlocked) return true;
    if (unlockedTier && tierIncludes(unlockedTier, tier)) return true;
    // Visible flouté pour visiteur non-validé : on inclut quand même mais avec flag locked
    return true;
  }).map(u => ({ type: "upload" as const, id: u.id, created_at: (u as { uploadedAt?: string; created_at?: string }).uploadedAt || (u as { created_at?: string }).created_at || new Date().toISOString(), data: u }));
  const legacyItems = [...visitorPosts, ...modelPosts, ...uploadsAsFeed].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Unified items (IG = public, wall = public, manual = tier-gated via card).
  const unifiedItems = useMemo(() => {
    if (!useUnified || !feedItems) return [];
    return feedItems.filter((it) => {
      if (it.source_type === "instagram") return true;
      if (it.source_type === "wall") return true;
      const t = normalizeTier(it.tier || "public");
      if (!t || t === "p0") return true;
      if (contentUnlocked) return true;
      if (unlockedTier && tierIncludes(unlockedTier, t)) return true;
      return false;
    });
  }, [feedItems, useUnified, contentUnlocked, unlockedTier]);

  return (
    <div className="fade-up">
      <div className="flex gap-5 max-w-5xl mx-auto">
        <div className="space-y-3 sm:space-y-6 flex-1 min-w-0 max-w-2xl mx-auto">
          {/* Composer */}
          {!isModelLoggedIn && (
            <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex gap-3">
                <input value={wallContent} onChange={e => setWallContent(e.target.value)}
                  placeholder={`Un message pour ${model.display_name}...`}
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1"
                  style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
                  onKeyDown={e => { if (e.key === "Enter" && wallContent.trim()) { quickPost(wallContent); setWallContent(""); } }} />
                <button disabled={wallPosting || !wallContent.trim()} onClick={() => { if (wallContent.trim()) { quickPost(wallContent); setWallContent(""); } }}
                  className="px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-30 shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  {wallPosting ? "..." : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ═══ UNIFIED FEED RENDERING ═══ */}
          {useUnified ? (
            unifiedItems.length === 0 ? (
              <div className="text-center py-20 sm:py-24">
                <Newspaper className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas encore de publications</p>
              </div>
            ) : (
              <>
                {/* ─── Instagram grid (vignettes carrées) ─── */}
                {(() => {
                  const igItems = unifiedItems.filter(
                    (it) => it.source_type === "instagram" && (it.media_url || it.thumbnail_url)
                  );
                  if (igItems.length === 0) return null;
                  return (
                    <section className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <header className="flex items-center justify-between px-5 sm:px-6 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <Instagram className="w-4 h-4" style={{ color: "#dc2743" }} />
                          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Instagram</h2>
                        </div>
                        <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                          {igItems.length} publication{igItems.length > 1 ? "s" : ""}
                        </span>
                      </header>
                      <div className="p-1 sm:p-1.5">
                        <InstagramFeedGrid
                          feedItems={igItems}
                          clientId={clientId}
                          modelSlug={slug}
                        />
                      </div>
                    </section>
                  );
                })()}

                {/* ─── Vertical feed (wall + manual) ─── */}
                {unifiedItems
                  .filter((it) => it.source_type !== "instagram")
                  .map((item, idx) => (
                    <FeedItemCard
                      key={`${item.source_type}-${item.id}`}
                      item={item}
                      model={model}
                      unlockedTier={unlockedTier}
                      isModelLoggedIn={isModelLoggedIn}
                      purchasedItems={purchasedItems}
                      subscriberUsername={subscriberUsername}
                      hasSubscriberIdentity={hasSubscriberIdentity}
                      onOpenLightbox={(url) => setLightboxUrl(url)}
                      onNavigateTier={(t) => setGalleryTier(t)}
                      index={idx}
                      captionExpanded={!!igExpanded[item.id]}
                      onToggleCaption={() => setIgExpanded((p) => ({ ...p, [item.id]: true }))}
                      clientId={clientId}
                    />
                  ))}
              </>
            )
          ) : (
            // ═══ LEGACY FALLBACK ═══
            legacyItems.length === 0 ? (
              <div className="text-center py-20 sm:py-24">
                <Newspaper className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas encore de publications</p>
              </div>
            ) : legacyItems.map((item, idx) => {
            // NB 2026-04-25 evening : render uploads comme posts dans le feed
            // avec mêmes règles tier (visibilité + flou si pas unlocked).
            if (item.type === "upload") {
              const u = item.data as UploadedContent;
              const uTier = normalizeTier(u.tier || "p0");
              const uMediaUnlocked = uTier === "p0" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, uTier));
              const uTierHex = TIER_HEX[uTier] || "#64748B";
              return (
                <div key={`upload-${u.id}`} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                  <div className="flex items-start gap-3 sm:gap-4 p-5 sm:p-6 pb-3 sm:pb-4">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                      {model.avatar ? <img src={model.avatar} alt="" className="w-full h-full object-cover" /> : model.display_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{model.display_name}</span>
                          {uTier !== "p0" && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${uTierHex}12`, color: uTierHex }}>{TIER_META[uTier]?.label || uTier.toUpperCase()}</span>}
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(item.created_at)}</span>
                      </div>
                      {u.label && <p className="text-base mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{u.label}</p>}
                    </div>
                  </div>
                  {u.dataUrl && (uMediaUnlocked ? (
                    <div className="cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden" onClick={() => setLightboxUrl(u.dataUrl)}>
                      <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                        {u.type === "video" ? <video src={u.dataUrl} className="w-full max-h-[400px] sm:max-h-[500px] object-cover" controls /> : <img src={u.dataUrl} alt="" className="w-full max-h-[400px] sm:max-h-[500px] object-cover" loading="lazy" />}
                      </ContentProtection>
                    </div>
                  ) : (
                    <div className="relative cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden" onClick={() => setGalleryTier(uTier)}>
                      <div className="w-full h-[300px] sm:h-[400px] relative">
                        <img src={u.dataUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />
                        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${uTierHex}20 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)` }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <Lock className="w-6 h-6" style={{ color: uTierHex }} />
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: uTierHex }}>{TIER_META[uTier]?.label || uTier}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            if (item.type === "wall") {
              const w = item.data as WallPost;
              return (
                <div key={`w-${w.id}`} className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: "var(--bg3)", color: "var(--text-muted)" }}>{w.pseudo?.charAt(0)?.toUpperCase() || "?"}</div>
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
            const postTier = normalizeTier(post.tier_required || "public");
            const mediaUnlocked = postTier === "p0" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, postTier));
            const tierHex = TIER_HEX[postTier] || "#64748B";
            return (
              <div key={post.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", animation: `slideUp 0.4s ease-out ${idx * 0.04}s both` }}>
                <div className="flex items-start gap-3 sm:gap-4 p-5 sm:p-6 pb-3 sm:pb-4">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                    {model.avatar ? <img src={model.avatar} alt="" className="w-full h-full object-cover" /> : model.display_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{model.display_name}</span>
                        {postTier !== "public" && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${tierHex}12`, color: tierHex }}>{TIER_META[postTier]?.label || postTier.toUpperCase()}</span>}
                      </div>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</span>
                    </div>
                    {post.content && <p className="text-base mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{post.content}</p>}
                  </div>
                </div>
                {post.media_url && (mediaUnlocked ? (
                  <div className="cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden" onClick={() => setLightboxUrl(post.media_url)}>
                    <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                      <img src={post.media_url} alt="" className="w-full max-h-[400px] sm:max-h-[500px] object-cover" loading="lazy" />
                    </ContentProtection>
                  </div>
                ) : (
                  <div className="relative cursor-pointer mx-5 sm:mx-6 mb-4 rounded-xl overflow-hidden"
                    onClick={() => { if (purchasedItems.has(post.id)) { setLightboxUrl(post.media_url); return; } setGalleryTier(postTier !== "public" ? postTier : "feed"); }}>
                    <div className="w-full h-[300px] sm:h-[400px] relative">
                      {post.media_url && <img src={post.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />}
                      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${tierHex}20 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)` }} />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Lock className="w-6 h-6" style={{ color: "#fff", opacity: 0.9 }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{TIER_META[postTier]?.symbol} {TIER_META[postTier]?.label || "Exclusive"}</span>
                    </div>
                  </div>
                ))}
                {/* Like + comment */}
                <div className="flex items-center gap-6 px-5 sm:px-6 py-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                  <button onClick={async () => {
                    try { await fetch("/api/posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id, model: modelId, action: "like" }) }); setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p)); } catch {}
                  }} className="flex items-center gap-1.5 text-xs cursor-pointer transition-colors hover:text-[#F43F5E] group/like" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                    <Heart className="w-4 h-4 transition-transform group-hover/like:scale-110" fill={(post.likes_count || 0) > 0 ? "currentColor" : "none"} />
                    <span className="tabular-nums">{post.likes_count || 0}</span>
                  </button>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    <MessageCircle className="w-4 h-4" /><span className="tabular-nums">{wallPosts.filter(w => w.content?.includes(`#post-${post.id}`)).length + (post.comments_count || 0)}</span>
                  </span>
                </div>
                {/* Comment input */}
                <div className="px-5 sm:px-6 py-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <input data-comment-post={post.id} placeholder={visitorRegistered ? "Ajouter un commentaire..." : "Identifie-toi pour commenter"}
                    className="flex-1 text-sm bg-transparent outline-none py-1" style={{ color: "var(--text)" }} readOnly={!visitorRegistered}
                    onKeyDown={async (e) => { if (!visitorRegistered || e.key !== "Enter") return; const input = e.target as HTMLInputElement; const text = input.value.trim(); if (!text) return; input.value = "";
                      try { await fetch("/api/wall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: modelId, pseudo: visitorHandle, content: `${text} #post-${post.id}`, pseudo_snap: visitorPlatform === "snap" ? visitorHandle : null, pseudo_insta: visitorPlatform === "insta" ? visitorHandle : null, client_id: clientId }) });
                        const res = await fetch(`/api/wall?model=${modelId}`); const data = await res.json(); setWallPosts(data.posts || []); } catch {} }} />
                  <button onClick={async () => { if (!visitorRegistered) return; const input = document.querySelector(`[data-comment-post="${post.id}"]`) as HTMLInputElement; const text = input?.value?.trim(); if (!text) return; input.value = "";
                    try { await fetch("/api/wall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: modelId, pseudo: visitorHandle, content: `${text} #post-${post.id}`, pseudo_snap: visitorPlatform === "snap" ? visitorHandle : null, pseudo_insta: visitorPlatform === "insta" ? visitorHandle : null, client_id: clientId }) });
                      const res = await fetch(`/api/wall?model=${modelId}`); const data = await res.json(); setWallPosts(data.posts || []); } catch {} }} className="cursor-pointer hover:opacity-70 transition-opacity" style={{ background: "none", border: "none" }}>
                    <Send className="w-3.5 h-3.5" style={{ color: visitorRegistered ? "var(--accent)" : "var(--text-muted)" }} />
                  </button>
                </div>
              </div>
            );
          })
          )}
        </div>

        {/* Right sidebar — recent photos (desktop) */}
        <div className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 sticky top-[60px] self-start space-y-3" style={{ maxHeight: "calc(100vh - 80px)" }}>
          <span className="text-[11px] font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-muted)" }}>Photos récentes</span>
          <div className="overflow-y-auto rounded-xl no-scrollbar" style={{ maxHeight: "calc(100vh - 120px)" }}>
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const recentMedia: { url: string; tier: string; id: string }[] = [];
                uploads.filter(u => u.dataUrl && u.type === "photo").slice(0, 12).forEach(u => recentMedia.push({ url: u.dataUrl, tier: normalizeTier(u.tier || "public"), id: u.id }));
                posts.filter(p => p.media_url).slice(0, 8).forEach(p => { if (!recentMedia.find(m => m.url === p.media_url)) recentMedia.push({ url: p.media_url!, tier: normalizeTier(p.tier_required || "public"), id: p.id }); });
                const items = recentMedia.slice(0, 20);
                if (items.length === 0) return <div className="col-span-2 py-8 text-center"><Camera className="w-5 h-5 mx-auto mb-1.5" style={{ color: "var(--text-muted)", opacity: 0.3 }} /><span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Bientôt</span></div>;
                return items.map(item => {
                  const canView = item.tier === "p0" || item.tier === "promo" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, item.tier));
                  const hex = TIER_HEX[item.tier] || "#64748B";
                  return (
                    <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group" onClick={() => { if (canView) setLightboxUrl(item.url); else setGalleryTier(item.tier); }}>
                      <img src={item.url} alt="" draggable={false} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" style={{ filter: canView ? "none" : "blur(12px) brightness(0.4)", transform: canView ? undefined : "scale(1.15)" }} />
                      {!canView && <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"><Lock className="w-4 h-4" style={{ color: hex }} /><span className="text-[9px] font-bold uppercase" style={{ color: hex }}>{TIER_META[item.tier]?.symbol} {TIER_META[item.tier]?.label}</span></div>}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tier View ──
function TierView({ galleryTier, posts, uploads, packs, activePacks, displayPacks, isModelLoggedIn, unlockedTier, isEditMode, subscriberUsername, hasSubscriberIdentity, modelId, model, zoomedItem, setZoomedItem, setLightboxUrl, setGalleryTier, setFocusPack, setShowUnlock, setUploads, setPosts, edit }: {
  galleryTier: string; posts: Post[]; uploads: UploadedContent[]; packs: PackConfig[];
  activePacks: PackConfig[]; displayPacks: PackConfig[];
  isModelLoggedIn: boolean; unlockedTier: string | null; isEditMode: boolean;
  subscriberUsername: string; hasSubscriberIdentity: boolean; modelId: string; model: ModelInfo;
  zoomedItem: string | null; setZoomedItem: (v: string | null) => void;
  setLightboxUrl: (v: string | null) => void; setGalleryTier: (v: string) => void;
  setFocusPack: (v: string | null) => void; setShowUnlock: (v: boolean) => void;
  setUploads: React.Dispatch<React.SetStateAction<UploadedContent[]>>; setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  edit: ReturnType<typeof useEditMode>;
}) {
  const allImagePosts = posts.filter(p => p.media_url);
  const isLockedTier = !isModelLoggedIn && !(unlockedTier && tierIncludes(unlockedTier, galleryTier));

  // Pack editor
  const packIdx = displayPacks.findIndex(p => p.id === galleryTier);
  const pack = packIdx !== -1 ? displayPacks[packIdx] : null;
  const tierHex = TIER_HEX[galleryTier] || "#E63329";
  const tierSymbol = TIER_META[galleryTier]?.symbol || "";

  // Content
  const filteredPosts = allImagePosts.filter(p => normalizeTier(p.tier_required || "public") === galleryTier);
  const filteredUploads = uploads.filter(u => normalizeTier(u.tier) === galleryTier && u.dataUrl);

  // NB 2026-04-25 evening : drag&drop des photos entre packs (tiers).
  // Quand admin drag une image upload, on affiche une floating bar avec les
  // autres tiers comme drop targets. Drop = PUT /api/uploads pour changer tier.
  const [dragItem, setDragItem] = useState<{ id: string; sourceTier: string } | null>(null);
  // NB 2026-04-25 evening : éditeur pack repliable (default fermé pour vue propre).
  const [packEditOpen, setPackEditOpen] = useState(false);
  // NB 2026-04-25 evening : 2 modes accordéon — "info" (read-only display) | "edit" (form fields).
  // Default "info" pour cohérence avec le CP legacy (l'admin voit d'abord les infos puis clique "Edit").
  const [packDetailMode, setPackDetailMode] = useState<"info" | "edit">("info");
  const moveUploadTier = async (uploadId: string, newTier: string) => {
    try {
      const res = await fetch("/api/uploads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId, id: uploadId, updates: { tier: newTier } }),
      });
      if (!res.ok) throw new Error("Move tier échoué");
      // Optimistic update local state
      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, tier: newTier } : u));
    } catch (err) {
      console.error("[TierView] moveUploadTier:", err);
      alert("Déplacement échoué");
    }
  };

  return (
    <div className="fade-up">
      {/* Pack editor — visible UNIQUEMENT admin connectée (isEditMode), repliable.
          NB 2026-04-25 evening : default fermé pour vue propre, click header = expand. */}
      {isEditMode && pack && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: `1.5px solid ${tierHex}25` }}>
          <button
            type="button"
            onClick={() => setPackEditOpen(v => !v)}
            aria-expanded={packEditOpen}
            className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer transition-all hover:bg-white/[0.02] border-none bg-transparent text-left"
            style={{ minHeight: 44 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base" style={{ color: tierHex }}>{tierSymbol}</span>
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{pack.name || pack.id}</span>
              <span className="text-[11px] font-bold" style={{ color: tierHex }}>{pack.price}€</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                onClick={(e) => { e.stopPropagation(); edit.handleUpdatePack(pack.id, { active: !pack.active }); }}
                role="button"
                tabIndex={0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
                style={{ background: pack.active ? `${tierHex}15` : "var(--bg3)", color: pack.active ? tierHex : "var(--text-muted)", border: `1px solid ${pack.active ? `${tierHex}30` : "var(--border)"}` }}>
                {pack.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />} {pack.active ? "Actif" : "Désactivé"}
              </span>
              {packEditOpen ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
            </div>
          </button>
          {packEditOpen && (() => {
            // NB 2026-04-25 evening : layout 2 cols — preview profil (gauche) + info/edit (droite)
            // Pattern repris du CP legacy : "VUE CLIENT SUR LE PROFIL" + détails
            const tierUploadsLocal = uploads.filter(u => normalizeTier(u.tier) === pack.id && u.dataUrl);
            const lastUpload = tierUploadsLocal.length > 0 ? tierUploadsLocal[tierUploadsLocal.length - 1] : null;
            const manualCover = (pack as { cover_url?: string }).cover_url;
            const effectiveCover = manualCover || lastUpload?.dataUrl || null;
            const isBlurred = (pack as { cover_blurred?: boolean }).cover_blurred !== false;
            const features = pack.features || [];
            return (
              <div className="p-3 sm:p-4 pt-0 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {/* ══════ LEFT — VUE CLIENT SUR LE PROFIL (preview WYSIWYG) ══════ */}
                  <div className="rounded-xl overflow-hidden relative" style={{ background: "var(--bg2)", border: `1px solid ${tierHex}20`, minHeight: 200 }}>
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}>
                      Vue client sur le profil
                    </div>
                    {effectiveCover ? (
                      <div className="w-full h-full relative" style={{ minHeight: 200 }}>
                        <img src={effectiveCover} alt={pack.name} className="w-full h-full object-cover" style={{ filter: isBlurred ? "blur(14px) brightness(0.4)" : "brightness(0.85)", transform: "scale(1.15)" }} loading="lazy" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm" style={{ background: `${tierHex}25`, border: `1.5px solid ${tierHex}40` }}>
                            {isBlurred ? <Lock className="w-5 h-5" style={{ color: "#fff" }} /> : <span className="text-2xl">{tierSymbol}</span>}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{pack.name}</span>
                          <span className="text-[10px] font-bold" style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{pack.price}€</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center px-4" style={{ minHeight: 200 }}>
                        <Camera className="w-7 h-7" style={{ color: tierHex, opacity: 0.5 }} />
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Aucune photo</span>
                        <span className="text-[9px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Upload une photo dans ce pack ou définis une cover URL</span>
                      </div>
                    )}
                  </div>

                  {/* ══════ RIGHT — INFO ou EDIT ══════ */}
                  <div className="space-y-2">
                    {packDetailMode === "info" ? (
                      <>
                        {/* Header info */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-base font-bold" style={{ color: "var(--text)" }}>{pack.name}</h4>
                              <span className="text-base font-black" style={{ color: tierHex }}>{pack.price}€</span>
                            </div>
                            {pack.badge && (
                              <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider" style={{ background: `${tierHex}15`, color: tierHex, border: `1px solid ${tierHex}30` }}>
                                {pack.badge}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setPackDetailMode("edit")}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] shrink-0"
                            style={{ background: `${tierHex}12`, color: tierHex, border: `1px solid ${tierHex}30`, minHeight: 32 }}
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        </div>

                        {/* Visibility status */}
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: pack.active === false ? "var(--text-muted)" : "#10B981" }} />
                          <span className="text-[10px] font-medium" style={{ color: pack.active === false ? "var(--text-muted)" : "#10B981" }}>
                            {pack.active === false ? "Désactivé" : "Visible sur profil"}
                          </span>
                        </div>

                        {/* Features list (read-only) */}
                        {features.length > 0 && (
                          <div className="pt-1.5 border-t" style={{ borderColor: "var(--border)" }}>
                            <span className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Contenu inclus</span>
                            <div className="space-y-1">
                              {features.map((f: string, j: number) => (
                                <div key={j} className="flex items-center gap-1.5">
                                  <Check className="w-3 h-3 shrink-0" style={{ color: tierHex }} />
                                  <span className="text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>{f}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* EDIT FORM */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tierHex }}>Édition</span>
                          <button
                            onClick={() => setPackDetailMode("info")}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all hover:scale-[1.02]"
                            style={{ background: "var(--bg2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                          >
                            <Check className="w-3 h-3" /> Terminé
                          </button>
                        </div>
                        {/* Nom / Prix / Badge */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div><label className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Nom</label>
                            <input value={pack.name} onChange={e => edit.handleUpdatePack(pack.id, { name: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs font-medium outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", minHeight: 36 }} /></div>
                          <div><label className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Prix €</label>
                            <input type="number" value={pack.price} onChange={e => edit.handleUpdatePack(pack.id, { price: Number(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg text-xs font-bold outline-none" style={{ background: "var(--bg2)", color: tierHex, border: "1px solid var(--border)", minHeight: 36 }} /></div>
                          <div><label className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Badge</label>
                            <input value={pack.badge || ""} onChange={e => edit.handleUpdatePack(pack.id, { badge: e.target.value || null })} placeholder="VIP, ★..." className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", minHeight: 36 }} /></div>
                        </div>
                        {/* Photo aperçu */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
                            Photo aperçu locked {!manualCover && lastUpload && <span className="font-normal opacity-70">(auto: dernière upload)</span>}
                          </label>
                          <div className="flex items-center gap-2">
                            <label htmlFor={`pack-cover-${pack.id}`} className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer" style={{ border: `1px dashed ${tierHex}40`, background: "var(--bg2)" }}>
                              {effectiveCover ? (
                                <img src={effectiveCover} alt="Cover" className="w-full h-full object-cover" style={{ filter: isBlurred ? "blur(4px) brightness(0.7)" : "none" }} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Camera className="w-4 h-4" style={{ color: tierHex }} /></div>
                              )}
                            </label>
                            <input type="file" accept="image/*" id={`pack-cover-${pack.id}`} className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 10 * 1024 * 1024) { alert("Image > 10 MB"); return; }
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const dataUrl = ev.target?.result as string;
                                  const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: dataUrl, folder: `heaven/${modelId}/packs/${pack.id}` }) });
                                  const data = await res.json();
                                  if (data?.url) edit.handleUpdatePack(pack.id, { cover_url: data.url } as Partial<PackConfig>);
                                };
                                reader.readAsDataURL(file);
                              }} />
                            <input type="text" value={manualCover || ""} onChange={e => edit.handleUpdatePack(pack.id, { cover_url: e.target.value } as Partial<PackConfig>)}
                              placeholder={lastUpload ? "Override (URL ou upload)" : "URL ou upload"}
                              className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-mono outline-none"
                              style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", minHeight: 36 }} />
                            <button type="button" onClick={() => edit.handleUpdatePack(pack.id, { cover_blurred: !isBlurred } as Partial<PackConfig>)}
                              title={isBlurred ? "Cover floutée — cliquer pour défloutée" : "Cover claire — cliquer pour floutée"}
                              aria-label="Toggle flou cover"
                              className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-white/[0.06] shrink-0"
                              style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
                              {isBlurred ? <EyeOff className="w-3.5 h-3.5" style={{ color: tierHex }} /> : <Eye className="w-3.5 h-3.5" style={{ color: tierHex }} />}
                            </button>
                          </div>
                        </div>
                        {/* Avantages */}
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Avantages</label>
                          <div className="space-y-1">
                            {features.map((f: string, j: number) => (
                              <div key={j} className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 shrink-0" style={{ color: tierHex }} />
                                <input value={f} onChange={e => { const nf = [...features]; nf[j] = e.target.value; edit.handleUpdatePack(pack.id, { features: nf }); }}
                                  className="flex-1 px-2 py-1 rounded-md text-[11px] outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", minHeight: 28 }} />
                                <button onClick={() => edit.handleUpdatePack(pack.id, { features: features.filter((_: string, k: number) => k !== j) })}
                                  className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer hover:scale-110 transition-all shrink-0" style={{ background: "rgba(220,38,38,0.08)", color: "var(--danger)" }}><X className="w-2.5 h-2.5" /></button>
                              </div>
                            ))}
                            <button onClick={() => edit.handleUpdatePack(pack.id, { features: [...features, ""] })}
                              className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all hover:scale-[1.01]"
                              style={{ background: `${tierHex}08`, color: tierHex, border: `1px dashed ${tierHex}30`, minHeight: 28 }}><Plus className="w-2.5 h-2.5" /> Ajouter</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Locked tier overlay */}
      {isLockedTier && (() => {
        const tierPack = activePacks.find(p => p.id === galleryTier);
        const tierPosts = allImagePosts.filter(p => normalizeTier(p.tier_required || "public") === galleryTier);
        const tierUploads = uploads.filter(u => normalizeTier(u.tier) === galleryTier && u.dataUrl);
        const previewImages = [...tierPosts.map(p => p.media_url!), ...tierUploads.map(u => u.dataUrl)].filter(Boolean).slice(0, 6);
        if (!tierPack) return null;
        // NB 2026-04-25 evening : auto-fallback dernière upload du pack si pas de cover_url manuel
        const manualCover = (tierPack as { cover_url?: string }).cover_url;
        const lastUploadCover = tierUploads.length > 0 ? tierUploads[tierUploads.length - 1].dataUrl : null;
        const isBlurred = (tierPack as { cover_blurred?: boolean }).cover_blurred !== false;
        const effectiveCover = manualCover || lastUploadCover;
        const blurFilter = isBlurred ? "blur(14px) brightness(0.4)" : "brightness(0.85)";
        const ctaLink = tierPack.stripe_link || tierPack.wise_url || null;
        const ctaAction = ctaLink ? () => window.open(ctaLink, "_blank") : () => { setFocusPack(galleryTier); setShowUnlock(true); };
        return (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 rounded-2xl overflow-hidden p-4 md:p-6" style={{ background: "var(--surface)", border: `1px solid ${tierHex}15` }}>
              <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "280px" }}>
                {effectiveCover ? (
                  <div className="w-full h-full relative" style={{ minHeight: "280px" }}>
                    <img src={effectiveCover} alt={tierPack.name} className="w-full h-full object-cover" style={{ filter: blurFilter, transform: "scale(1.15)" }} loading="lazy" />
                  </div>
                ) : previewImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1 h-full">
                    {previewImages.map((url, i) => <div key={i} className="aspect-[3/4] relative overflow-hidden rounded-lg"><img src={url} alt="" className="w-full h-full object-cover" style={{ filter: blurFilter, transform: "scale(1.15)" }} loading="lazy" /></div>)}
                  </div>
                ) : <div className="w-full h-full rounded-xl" style={{ background: `linear-gradient(135deg, ${tierHex}10, ${tierHex}05)`, minHeight: "280px" }} />}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm" style={{ background: `${tierHex}25`, border: `1.5px solid ${tierHex}40` }}><span className="text-3xl">{tierSymbol}</span></div>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4 py-2">
                <div><div className="flex items-center gap-2 mb-1"><span className="text-xl">{tierSymbol}</span><h3 className="text-xl font-black" style={{ color: "var(--text)" }}>{tierPack.name}</h3></div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{previewImages.length > 0 ? `${previewImages.length} contenu${previewImages.length > 1 ? "s" : ""} exclusif${previewImages.length > 1 ? "s" : ""}` : "Contenu exclusif bientôt disponible"}</p></div>
                {tierPack.features?.length > 0 && <div className="space-y-2">{tierPack.features.map((f, j) => <div key={j} className="flex items-start gap-2.5"><Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tierHex }} /><span className="text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>{f}</span></div>)}</div>}
                <button onClick={ctaAction} className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]" style={{ background: tierHex, color: "#fff", border: "none", boxShadow: `0 4px 24px ${tierHex}35` }}>Débloquer — {tierPack.price}€</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unlocked content grid */}
      {!isLockedTier && (() => {
        const totalItems = filteredPosts.length + filteredUploads.length;
        if (totalItems === 0) return <div className="text-center py-20 sm:py-24"><Camera className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} /><p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas encore de shootings</p></div>;
        const allMedia = dailyShuffle([
          ...filteredUploads.map(u => ({ id: u.id, url: u.dataUrl, type: "upload" as const, tier: galleryTier, mediaType: u.type })),
          ...filteredPosts.map(p => ({ id: p.id, url: p.media_url!, type: "post" as const, tier: normalizeTier(p.tier_required || "public"), mediaType: "image" as string })),
        ]);
        return (
          <>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-1 sm:gap-2">
              {allMedia.map((item, i) => {
                const aspect = getMasonryAspect(i);
                const hex = TIER_HEX[item.tier] || "var(--text-muted)";
                const unlocked = item.tier === "p0" || isModelLoggedIn || (unlockedTier && tierIncludes(unlockedTier, item.tier));
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    draggable={isEditMode && item.type === "upload"}
                    onDragStart={(e) => {
                      if (!isEditMode || item.type !== "upload") return;
                      setDragItem({ id: item.id, sourceTier: galleryTier });
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragItem(null)}
                    className={`break-inside-avoid mb-1 sm:mb-2 relative ${aspect} overflow-hidden rounded-lg sm:rounded-xl cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                    style={{ animation: `slideUp 0.4s ease-out ${i * 0.03}s both`, opacity: dragItem?.id === item.id ? 0.4 : 1 }}
                  >
                    {unlocked ? (
                      <>
                        {/* NB 2026-04-25 evening : click handler sur le wrapper (pas sur img) pour éviter
                            que les overlays décoratifs bloquent le click. setLightboxUrl pour fullscreen z-60. */}
                        <div className="absolute inset-0 z-[1]" onClick={() => setLightboxUrl(item.url)} />
                        <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn} className="w-full h-full">
                          {item.mediaType === "video" ? <video src={item.url} className="w-full h-full object-cover pointer-events-none" data-clickable />
                            : <img src={item.url} alt="" className="w-full h-full object-cover pointer-events-none" loading="lazy" data-clickable />}
                        </ContentProtection>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none"><Eye className="w-5 h-5 text-white" /></div>
                        {item.tier !== "p0" && <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)", zIndex: 2 }}>{TIER_META[item.tier]?.label || item.tier.toUpperCase()}</span>}
                      </>
                    ) : (
                      <div className="w-full h-full" onClick={() => setGalleryTier(item.tier)}>
                        {item.url && <img src={item.url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />}
                        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${hex}20 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)` }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"><Lock className="w-5 h-5" style={{ color: hex, opacity: 0.8 }} /><span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: hex }}>{TIER_META[item.tier]?.label || item.tier}</span></div>
                      </div>
                    )}
                    {isEditMode && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none" style={{ zIndex: 3 }}>
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          if (item.type === "upload") { if (confirm("Supprimer ce contenu ?")) { await fetch(`/api/uploads?model=${modelId}&id=${item.id}`, { method: "DELETE" }); setUploads(prev => prev.filter(u => u.id !== item.id)); } }
                          else { if (confirm("Supprimer ce post ?")) { await fetch(`/api/posts?id=${item.id}&model=${modelId}`, { method: "DELETE" }); setPosts(prev => prev.filter(p => p.id !== item.id)); } }
                        }} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 pointer-events-auto" style={{ background: "rgba(220,38,38,0.8)" }}><Trash2 className="w-4 h-4 text-white" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* NB 2026-04-25 evening : drag&drop floating bar — tiers cibles
                pour déplacer une upload entre packs. Visible uniquement quand
                drag actif (admin a commencé à dragger une image upload). */}
            {isEditMode && dragItem && (
              <div
                className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-2xl flex-wrap max-w-[calc(100vw-32px)] justify-center"
                style={{ background: "rgba(20,20,24,0.96)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <span className="text-[10px] uppercase tracking-wider mr-1 hidden sm:inline" style={{ color: "var(--text-muted)" }}>Déposer dans :</span>
                {activePacks.filter(p => p.id !== dragItem.sourceTier).map(p => {
                  const dropHex = TIER_HEX[p.id] || "var(--accent)";
                  return (
                    <button
                      key={p.id}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        await moveUploadTier(dragItem.id, p.id);
                        setDragItem(null);
                      }}
                      className="px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all hover:scale-105 active:scale-95 border bg-transparent"
                      style={{ color: dropHex, borderColor: `${dropHex}40`, background: `${dropHex}08`, minHeight: 44, minWidth: 44 }}
                    >
                      {p.badge || p.name || p.id}
                    </button>
                  );
                })}
              </div>
            )}

            {zoomedItem && (() => {
              const zItem = allMedia.find(x => x.id === zoomedItem);
              if (!zItem?.url) return null;
              return (
                <div className="fixed inset-0 z-[55] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.92)", animation: "fadeIn 0.2s ease" }} onClick={() => setZoomedItem(null)}>
                  <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-10 cursor-pointer transition-all hover:scale-110 hover:bg-white/20" style={{ background: "rgba(255,255,255,0.1)", border: "none" }} onClick={() => setZoomedItem(null)}><X className="w-5 h-5 text-white" /></button>
                  <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}><img src={zItem.url} alt="" className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg" style={{ animation: "scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }} onClick={e => e.stopPropagation()} /></ContentProtection>
                </div>
              );
            })()}
          </>
        );
      })()}
    </div>
  );
}

// ── Chat Panel ──
function ChatPanel({ model, chatMessages, chatInput, setChatInput, sendMessage, chatEndRef, setChatOpen, isGuest = false, onUpgrade }: {
  model: ModelInfo; chatMessages: { id: string; sender_type: string; content: string; created_at: string }[];
  chatInput: string; setChatInput: (v: string) => void; sendMessage: () => Promise<void>;
  chatEndRef: React.RefObject<HTMLDivElement | null>; setChatOpen: (v: boolean) => void;
  isGuest?: boolean; onUpgrade?: () => void;
}) {
  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50 rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "var(--surface)", border: "1px solid var(--border2)", maxHeight: "min(500px, 70vh)", animation: "slideUp 0.3s ease-out", boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border2)", background: "var(--bg2)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden" style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
          {model.avatar ? <img src={model.avatar} alt="" className="w-full h-full object-cover" /> : model.display_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{model.display_name}</p>
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: model.online ? "var(--success)" : "var(--text-muted)", boxShadow: model.online ? "0 0 4px rgba(16,185,129,0.5)" : "none" }} />
            <span className="text-[10px]" style={{ color: model.online ? "var(--success)" : "var(--text-muted)" }}>{model.online ? "En ligne" : "Hors ligne"}</span></div>
        </div>
        <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform" style={{ background: "rgba(255,255,255,0.05)" }}><X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} /></button>
      </div>
      {/* NB 2026-04-24 : bandeau upgrade pour visiteurs anonymes (pas d'IG/Snap lié).
          Click → rouvre IdentityGate pour ajouter un pseudo Insta/Snap → remplace
          visiteur-NNN par le vrai handle + unlock stories privées + promos Fanvue. */}
      {isGuest && onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full flex items-start gap-2 px-4 py-2.5 cursor-pointer transition-all hover:brightness-110 text-left"
          style={{
            background: "linear-gradient(90deg, rgba(167,139,250,0.12), rgba(230,51,41,0.08))",
            borderBottom: "1px solid var(--border2)",
            color: "var(--text)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#A78BFA" }} />
          <span className="text-[11px] leading-snug flex-1">
            Ajoute ton <strong style={{ color: "#A78BFA" }}>Insta</strong> ou <strong style={{ color: "#FFFC00" }}>Snap</strong> → stories privées, promos Fanvue
          </span>
          <span className="text-[10px] font-bold shrink-0" style={{ color: "var(--accent)" }}>→</span>
        </button>
      )}
      <div className="overflow-y-auto p-3 space-y-2" style={{ height: "min(320px, 45vh)" }}>
        {chatMessages.length === 0 ? (
          <div className="text-center py-8"><MessageCircle className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} /><p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Envoie un message a {model.display_name}</p></div>
        ) : chatMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[80%] rounded-2xl px-3 py-2 text-[12px]" style={{ background: msg.sender_type === "client" ? "rgba(230,51,41,0.15)" : "var(--bg3)", color: "var(--text)" }}>
              {msg.content}<p className="text-[10px] mt-0.5 opacity-40">{timeAgo(msg.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="p-3 flex gap-2 shrink-0" style={{ borderTop: "1px solid var(--border2)" }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Message..." className="flex-1 px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
        <button onClick={sendMessage} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer btn-gradient shrink-0"><Send className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ── Unlock Sheet ──
function UnlockSheet({ activePacks, model, focusPack, setFocusPack, setCheckoutPack, handleCodeValidation, onClose }: {
  activePacks: PackConfig[]; model: ModelInfo; focusPack: string | null; setFocusPack: (v: string | null) => void;
  setCheckoutPack: (v: PackConfig | null) => void;
  handleCodeValidation: (code: string, input?: HTMLInputElement) => Promise<boolean>;
  onClose: () => void;
}) {
  const sorted = focusPack ? [...activePacks].sort((a, b) => (a.id === focusPack ? -1 : b.id === focusPack ? 1 : 0)) : activePacks;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up" style={{ background: "var(--surface)", maxHeight: "85vh", border: "1px solid var(--border2)" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 md:hidden"><div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} /></div>
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Choisis ton accès</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80" style={{ background: "rgba(255,255,255,0.05)" }}><X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} /></button>
        </div>
        <div className="px-6 pb-6 space-y-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          {/* Code input */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>Tu as un code ?</label>
            <form onSubmit={async (e) => { e.preventDefault(); const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement; const code = input?.value?.trim(); if (!code) return; await handleCodeValidation(code, input); }} className="flex gap-2">
              <input type="text" placeholder="ABC-2026-XXXX" className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono uppercase tracking-wider outline-none text-center" style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
              <button type="submit" className="px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:scale-105 transition-transform" style={{ background: "var(--accent)", color: "#fff" }}>Valider</button>
            </form>
          </div>
          <div className="text-center"><span className="text-[10px]" style={{ color: "var(--text-muted)" }}>ou achète un pack</span></div>
          {sorted.map(pack => {
            const hex = TIER_HEX[pack.id] || pack.color;
            const isFocused = focusPack === pack.id;
            const paypalHandle2 = model?.paypal_handle || "aaclaraa";
            const paypalUrl2 = `https://www.paypal.com/paypalme/${paypalHandle2}/${pack.price}`;
            if (!isFocused && focusPack) {
              return (
                <button key={pack.id} onClick={() => setFocusPack(pack.id)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]" style={{ background: "var(--bg3)", border: `1.5px solid color-mix(in srgb, ${hex} 30%, transparent)` }}>
                  <span className="text-lg">{TIER_META[pack.id]?.symbol}</span>
                  <span className="text-sm font-bold flex-1 text-left" style={{ color: "var(--text)" }}>{pack.name}</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                </button>
              );
            }
            return (
              <div key={pack.id} className="w-full rounded-xl overflow-hidden transition-all" style={{ background: "var(--bg3)", border: `2px solid color-mix(in srgb, ${hex} ${isFocused ? "50%" : "25%"}, transparent)`, boxShadow: isFocused ? `0 4px 24px color-mix(in srgb, ${hex} 20%, transparent)` : "none" }}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5"><span className="text-2xl">{TIER_META[pack.id]?.symbol}</span><div><span className="text-base font-bold block" style={{ color: "var(--text)" }}>{pack.name}</span>{pack.badge && <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{pack.badge}</span>}</div></div>
                    <span className="text-2xl font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                  </div>
                  <div className="mb-4 space-y-1.5">{pack.features.map((f: string, j: number) => <p key={j} className="text-xs flex items-center gap-2" style={{ color: "var(--text-muted)" }}><Check className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} /> {f}</p>)}</div>
                  <div className="space-y-2">
                    <button onClick={() => setCheckoutPack(pack)} className="block w-full py-3 rounded-xl text-sm font-bold text-center cursor-pointer transition-all hover:scale-[1.02] hover:brightness-110" style={{ background: hex, color: "#fff", boxShadow: `0 4px 16px color-mix(in srgb, ${hex} 35%, transparent)` }}>💳 Payer {pack.price}€</button>
                    <div className={`grid gap-2 ${pack.wise_url && pack.revolut_url ? "grid-cols-3" : pack.wise_url || pack.revolut_url ? "grid-cols-2" : "grid-cols-1"}`}>
                      {pack.revolut_url && <a href={pack.revolut_url} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl text-xs font-bold text-center no-underline transition-all hover:scale-[1.02]" style={{ background: "#191C32", color: "#8B9DFE", border: "1.5px solid #2D3258" }}>Revolut</a>}
                      <a href={paypalUrl2} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl text-xs font-bold text-center no-underline transition-all hover:scale-[1.02]" style={{ background: "#1A1D33", color: "#69A3F7", border: "1.5px solid #253056" }}>PayPal</a>
                      {pack.wise_url && <a href={pack.wise_url} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl text-xs font-bold text-center no-underline transition-all hover:scale-[1.02]" style={{ background: "#1A2E1A", color: "#76D672", border: "1.5px solid #2A4D2A" }}>Wise</a>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

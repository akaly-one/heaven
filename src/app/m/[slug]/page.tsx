"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Heart, MessageCircle, Send, Lock, Newspaper, ShoppingBag,
  Coins, Camera, X, Check,
  Instagram, Ghost, Key, Sparkles, AlertTriangle, Eye, Trash2,
  Edit3, Plus, ToggleLeft, ToggleRight, RotateCcw, Save,
} from "lucide-react";
import { toModelId } from "@/lib/model-utils";
import { normalizeTier, tierIncludes } from "@/lib/tier-utils";
import { ContentProtection } from "@/components/content-protection";
import { IdentityGate } from "@/components/identity-gate";
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

// ── Types & Constants ──
import type { ModelInfo, Post, PackConfig, UploadedContent, WallPost, AccessCode, VisitorPlatform } from "@/types/heaven";
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
  const isModelLoggedIn = !!modelAuth;
  const {
    model, posts, stories, packs, uploads, wallPosts, loading, notFound,
    setModel, setPosts, setUploads, setWallPosts, setPacks,
  } = useModelData(slug);

  // ── Nav state ──
  const [galleryTier, setGalleryTier] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (["feed", "p1", "p2", "p3", "p4", "p5", "custom"].includes(hash)) return hash;
      const mapped = TIER_ALIASES[hash]; if (mapped) return mapped;
      if (hash === "all" || hash === "public" || hash === "gallery" || hash === "shootings") return "feed";
      if (hash === "shop") return "custom";
    }
    return "home";
  });

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

  // ── Chat ──
  const {
    chatMessages, chatInput, setChatInput, chatOpen, setChatOpen,
    chatUnread, sendMessage, chatEndRef,
  } = useChat({ slug, clientId, model });

  // ── Wall ──
  const { wallContent, setWallContent, wallPosting } = useWall({
    slug, clientId, visitorHandle, visitorPlatform, registerClient, setWallPosts,
  });

  // ── Edit mode ──
  const edit = useEditMode({
    slug, isModelLoggedIn, model, packs,
    setModel, setPacks, setUploads, setGalleryTier,
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
      {/* Identity Gate */}
      {!visitorRegistered && !isModelLoggedIn && model && (
        <IdentityGate slug={slug} modelName={model.display_name} onRegistered={handleGateRegistered} onNeedShop={() => setGalleryTier("home")} />
      )}
      <ProfileStyles />

      <div className="relative z-10">

        {/* ═══ HEADER BAR ═══ */}
        <HeaderBar
          model={model} displayModel={displayModel} isModelLoggedIn={isModelLoggedIn}
          visitorRegistered={visitorRegistered} visitorPlatform={visitorPlatform} visitorHandle={visitorHandle} visitorVerified={visitorVerified}
          unlockedTier={unlockedTier} activeCode={activeCode}
          chatOpen={chatOpen} setChatOpen={setChatOpen} chatUnread={chatUnread}
          newNotifications={newNotifications} orderHistoryOpen={orderHistoryOpen} setOrderHistoryOpen={setOrderHistoryOpen} clearNotifications={clearNotifications}
          codeSheetOpen={codeSheetOpen} setCodeSheetOpen={setCodeSheetOpen}
          handleCodeValidation={handleCodeValidation} modelId={modelId} slug={slug}
          galleryTier={galleryTier} setGalleryTier={setGalleryTier}
        />

        {/* ═══ HERO SECTION ═══ */}
        <HeroSection
          model={model} displayModel={displayModel} posts={posts} uploads={uploads} wallPosts={wallPosts}
          isTierView={isNavActive} contentUnlocked={contentUnlocked} visitorRegistered={visitorRegistered}
          isEditMode={edit.isEditMode} isModelLoggedIn={isModelLoggedIn}
          chatOpen={chatOpen} setChatOpen={setChatOpen} chatUnread={chatUnread}
          activeStories={activeStories} setStoryViewIdx={setStoryViewIdx}
          edit={edit}
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
        <div key={galleryTier} className="max-w-6xl mx-auto px-4 sm:px-8 md:px-12 py-2 sm:py-8 fade-up">

          {/* ── FEED ── */}
          {(galleryTier === "feed" || galleryTier === "home") && (
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
            sendMessage={sendMessage} chatEndRef={chatEndRef} setChatOpen={setChatOpen} />
        )}

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
    </div>
  );
}


// ═══════════════════════════════════════════
//  SUB-COMPONENTS (inline, co-located)
// ═══════════════════════════════════════════

// ── Header Bar ──
function HeaderBar({ model, displayModel, isModelLoggedIn, visitorRegistered, visitorPlatform, visitorHandle, visitorVerified, unlockedTier, activeCode, chatOpen, setChatOpen, chatUnread, newNotifications, orderHistoryOpen, setOrderHistoryOpen, clearNotifications, codeSheetOpen, setCodeSheetOpen, handleCodeValidation, modelId, slug, galleryTier, setGalleryTier }: {
  model: ModelInfo; displayModel: ModelInfo | null; isModelLoggedIn: boolean;
  visitorRegistered: boolean; visitorPlatform: VisitorPlatform | null; visitorHandle: string; visitorVerified: boolean;
  unlockedTier: string | null; activeCode: AccessCode | null;
  chatOpen: boolean; setChatOpen: (v: boolean) => void; chatUnread: number;
  newNotifications: number; orderHistoryOpen: boolean; setOrderHistoryOpen: (v: boolean) => void; clearNotifications: () => void;
  codeSheetOpen: boolean; setCodeSheetOpen: (v: boolean) => void;
  handleCodeValidation: (code: string, input?: HTMLInputElement) => Promise<boolean>;
  modelId: string; slug: string;
  galleryTier: string; setGalleryTier: (v: string) => void;
}) {
  return (
    <div className="sticky top-0 left-0 right-0 z-40 px-3 sm:px-5 md:px-8 lg:px-12 py-2"
      style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center">
        {/* LEFT: Back + Model name */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {isModelLoggedIn && <a href="/agence" className="text-sm font-bold no-underline shrink-0" style={{ color: "var(--accent)" }}>&#8592;</a>}
          {galleryTier !== "home" && (
            <button onClick={() => setGalleryTier("home")}
              className="text-sm font-bold shrink-0 cursor-pointer bg-transparent border-none transition-all hover:scale-105 active:scale-95"
              style={{ color: "var(--accent)" }}>&#8592;</button>
          )}
          <button onClick={() => setGalleryTier("home")}
            className="text-xs sm:text-sm font-bold tracking-wide uppercase truncate bg-transparent border-none cursor-pointer transition-all hover:opacity-80 active:scale-95 p-0"
            style={{ color: "var(--text)", letterSpacing: "0.08em" }}>{model.display_name}</button>
          {displayModel?.online && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--success)", boxShadow: "0 0 6px rgba(16,185,129,0.5)" }} />}
          {galleryTier !== "home" && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0"
              style={{ background: `${TIER_HEX[galleryTier] || "var(--accent)"}20`, color: TIER_HEX[galleryTier] || "var(--accent)" }}>
              {TIER_META[galleryTier]?.symbol} {TIER_META[galleryTier]?.label || galleryTier}
            </span>
          )}
        </div>
        {/* CENTER: spacer */}
        <div className="flex-1" />
        {/* RIGHT: Visitor info */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {visitorRegistered && (
            <>
              {/* Unified identity badge: @pseudo + status */}
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
                  <span className="text-[9px] font-bold uppercase tracking-wide shrink-0 hidden sm:inline"
                    style={{ color: visitorVerified ? "#10B981" : "var(--text-muted)" }}>
                    {visitorVerified ? "Verifie" : "Visiteur"}{unlockedTier && <span style={{ color: TIER_HEX[unlockedTier] || "var(--text-muted)" }}>{" / "}{TIER_META[unlockedTier]?.label || "Custom"}</span>}
                  </span>
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
        </div>
      </div>
    </div>
  );
}

// ── Hero Section ──
function HeroSection({ model, displayModel, posts, uploads, wallPosts, isTierView, contentUnlocked, visitorRegistered, isEditMode, isModelLoggedIn, chatOpen, setChatOpen, chatUnread, activeStories, setStoryViewIdx, edit }: {
  model: ModelInfo; displayModel: ModelInfo | null; posts: Post[]; uploads: UploadedContent[]; wallPosts: WallPost[];
  isTierView: boolean; contentUnlocked: boolean; visitorRegistered: boolean; isEditMode: boolean;
  isModelLoggedIn: boolean; chatOpen: boolean; setChatOpen: (v: boolean) => void; chatUnread: number;
  activeStories: Post[]; setStoryViewIdx: (v: number | null) => void;
  edit: ReturnType<typeof useEditMode>;
}) {
  const latestImagePost = posts.find(p => p.media_url);
  const bannerUrl = displayModel?.banner || latestImagePost?.media_url || null;

  return (
    <div className="relative" style={{
      maxHeight: isTierView ? "0px" : "70vh", overflow: "hidden",
      transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
      opacity: isTierView ? 0 : 1,
    }}>
      <div className="min-h-[40vh] sm:min-h-[55vh] md:min-h-[70vh] relative overflow-hidden" style={{
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
        <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 md:px-12 pb-6 sm:pb-14 md:pb-16 max-w-6xl mx-auto">
          <div className="flex items-end gap-5 sm:gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative shrink-0 profile-stagger-1">
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
            </div>
            {/* Name + bio + stats */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 sm:gap-4">
              <h1 className="profile-stagger-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light uppercase truncate"
                style={{ color: "#fff", letterSpacing: "0.12em", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>{displayModel?.display_name}</h1>
              {!isModelLoggedIn && (
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
              )}
            </div>
              {displayModel?.bio && <p className="profile-stagger-3 text-sm sm:text-base mt-2 sm:mt-3 line-clamp-2 leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.7)" }}>{displayModel.bio}</p>}
              {displayModel?.status_text && !isEditMode && <p className="text-sm sm:text-base mt-2 max-w-md" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{displayModel.status_text}</p>}
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
      {isEditMode && (
        <div className="absolute top-14 right-4 z-20 flex gap-2">
          <button onClick={() => edit.bannerInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-[10px] font-medium transition-all hover:scale-105"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}><Camera className="w-3.5 h-3.5" /> Banniere</button>
          <button onClick={() => edit.avatarInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-[10px] font-medium transition-all hover:scale-105"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}><Camera className="w-3.5 h-3.5" /> Avatar</button>
          <input ref={edit.bannerInputRef} type="file" accept="image/*" className="hidden" onChange={edit.handleBannerUpload} />
          <input ref={edit.avatarInputRef} type="file" accept="image/*" className="hidden" onChange={edit.handleAvatarUpload} />
        </div>
      )}
      {isEditMode && (
        <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 -mt-4 mb-4">
          <div className="space-y-3 p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <input value={displayModel?.display_name || ""} onChange={e => edit.updateEditField("display_name", e.target.value)}
              className="text-lg font-bold bg-transparent outline-none rounded-lg px-3 py-2 w-full" style={{ color: "var(--text)", border: "1px dashed var(--border3)" }} placeholder="Display name" />
            <input value={displayModel?.status || ""} onChange={e => edit.updateEditField("status", e.target.value)}
              className="w-full text-xs bg-transparent outline-none rounded-lg px-3 py-2" style={{ color: "var(--text-muted)", border: "1px dashed var(--border3)" }} placeholder="Status" />
            <input value={edit.editProfile.status_text ?? displayModel?.status_text ?? ""} onChange={e => edit.updateEditField("status_text", e.target.value)}
              placeholder="Ton humeur, une promo, une annonce..." className="w-full text-sm bg-transparent outline-none rounded-lg px-3 py-2 text-center"
              style={{ color: "var(--text)", border: "1px dashed var(--border3)", background: "rgba(0,0,0,0.15)" }} maxLength={200} />
            <textarea value={displayModel?.bio || ""} onChange={e => edit.updateEditField("bio", e.target.value)}
              className="w-full text-sm leading-relaxed bg-transparent outline-none rounded-lg px-3 py-2 resize-none" style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }} placeholder="Bio..." rows={3} />
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
        <div className="flex gap-2 justify-center pb-1" role="tablist">
          {/* Feed */}
          <button role="tab" aria-selected={galleryTier === "feed"} onClick={() => { setGalleryTier(galleryTier === "feed" ? "home" : "feed"); setFocusPack(null); }}
            className="relative flex-1 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] group overflow-hidden"
            style={{ minWidth: "70px", padding: "12px 16px", background: galleryTier === "feed" ? "linear-gradient(135deg, var(--accent), #F43F5E)" : "var(--surface)", border: galleryTier === "feed" ? "2px solid var(--accent)" : "1px solid var(--border)", boxShadow: galleryTier === "feed" ? "0 4px 16px rgba(230,51,41,0.25)" : "none" }}>
            <div className="flex flex-col items-center gap-1">
              <Newspaper className="w-4 h-4" style={{ color: galleryTier === "feed" ? "#fff" : "var(--accent)" }} />
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
              <button key={t} role="tab" aria-selected={isActive} onClick={() => { setGalleryTier(isActive ? "home" : t); setFocusPack(null); }}
                className="relative flex-1 rounded-xl cursor-pointer poker-tile group overflow-hidden"
                style={{ minWidth: "70px", height: "72px", background: isActive ? `linear-gradient(135deg, ${tierHex}, ${tierHex}CC)` : "var(--surface)", border: isActive ? `2px solid ${tierHex}` : "1px solid var(--border)", boxShadow: isActive ? `0 4px 20px ${tierHex}40` : "none", opacity: isLocked && !isActive ? 0.7 : 1 }}>
                <div className="absolute inset-0">
                  {previewImg && !isActive ? <img src={previewImg} alt="" draggable={false} className="w-full h-full object-cover" style={{ filter: isLocked ? "blur(8px) brightness(0.3)" : "brightness(0.35)", transform: isLocked ? "scale(1.1)" : "none" }} />
                    : !isActive ? <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${tierHex}12, ${tierHex}06)` }} /> : null}
                </div>
                <div className="relative flex flex-col items-center justify-center h-full gap-0.5 px-3">
                  <span className="absolute top-1 left-1.5 text-[8px] font-bold opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: isActive ? "#fff" : tierHex }}>{tierSymbol}</span>
                  <span className="absolute bottom-1 right-1.5 text-[8px] font-bold opacity-0 group-hover:opacity-60 transition-opacity rotate-180" style={{ color: isActive ? "#fff" : tierHex }}>{tierSymbol}</span>
                  <span className="text-xl transition-all duration-200 group-hover:scale-110 relative" style={{ color: isActive ? "#fff" : tierHex, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}>
                    {tierSymbol}{isLocked && <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-2" style={{ color: isActive ? "#fff" : tierHex, opacity: 0.7 }} />}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider transition-colors duration-200" style={{ color: isActive ? "#fff" : "var(--text)", textShadow: isActive || previewImg ? "0 1px 4px rgba(0,0,0,0.5)" : "none" }}>{tierLabel}</span>
                </div>
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: tierHex, boxShadow: `0 0 10px ${tierHex}` }} />}
              </button>
            );
          })}
          {/* Custom */}
          <button role="tab" aria-selected={galleryTier === "custom"} onClick={() => { setGalleryTier(galleryTier === "custom" ? "home" : "custom"); setFocusPack(null); }}
            className="relative flex-1 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] group overflow-hidden"
            style={{ minWidth: "70px", padding: "12px 16px", background: galleryTier === "custom" ? "linear-gradient(135deg, #D4AF37, #B8860B)" : "var(--surface)", border: galleryTier === "custom" ? "none" : "1px solid var(--border)", boxShadow: galleryTier === "custom" ? "0 4px 16px rgba(184,134,11,0.25)" : "none" }}>
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4" style={{ color: galleryTier === "custom" ? "#fff" : "#B8860B" }} />
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

  const visitorPosts = wallPosts.filter(w => !w.content?.includes("#post-") && w.pseudo !== "SYSTEM").map(w => ({ type: "wall" as const, id: w.id, created_at: w.created_at, data: w }));
  const filteredModelPosts = contentUnlocked ? posts : posts.filter(p => {
    const tier = normalizeTier(p.tier_required || "public");
    if (!tier || tier === "p0") return true;
    if (unlockedTier && tierIncludes(unlockedTier, tier)) return true;
    return false;
  });
  const modelPosts = filteredModelPosts.map(p => ({ type: "post" as const, id: p.id, created_at: p.created_at, data: p }));
  const allItems = [...visitorPosts, ...modelPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

          {/* Posts */}
          {allItems.length === 0 ? (
            <div className="text-center py-20 sm:py-24">
              <Newspaper className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Pas encore de publications</p>
            </div>
          ) : allItems.map((item, idx) => {
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
          })}
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

  return (
    <div className="fade-up">
      {/* Pack editor (edit mode) */}
      {isEditMode && pack && (
        <div className="mb-6 rounded-2xl p-5 sm:p-6" style={{ background: "var(--surface)", border: `1.5px solid ${tierHex}25` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Edit3 className="w-4 h-4" style={{ color: tierHex }} /><span className="text-sm font-bold" style={{ color: tierHex }}>Éditer le pack</span></div>
            <button onClick={() => edit.handleUpdatePack(pack.id, { active: !pack.active })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
              style={{ background: pack.active ? `${tierHex}15` : "var(--bg3)", color: pack.active ? tierHex : "var(--text-muted)", border: `1px solid ${pack.active ? `${tierHex}30` : "var(--border)"}` }}>
              {pack.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />} {pack.active ? "Actif" : "Désactivé"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div><label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Nom du pack</label>
              <input value={pack.name} onChange={e => edit.handleUpdatePack(pack.id, { name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} /></div>
            <div><label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Prix (€)</label>
              <input type="number" value={pack.price} onChange={e => edit.handleUpdatePack(pack.id, { price: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none" style={{ background: "var(--bg2)", color: tierHex, border: "1px solid var(--border)" }} /></div>
          </div>
          <div className="mb-4"><label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Badge (optionnel)</label>
            <input value={pack.badge || ""} onChange={e => edit.handleUpdatePack(pack.id, { badge: e.target.value || null })} placeholder="ex: Populaire, Nouveau..." className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} /></div>
          <div><label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>Avantages inclus</label>
            <div className="space-y-2">
              {(pack.features || []).map((f: string, j: number) => (
                <div key={j} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: tierHex }} />
                  <input value={f} onChange={e => { const nf = [...(pack.features || [])]; nf[j] = e.target.value; edit.handleUpdatePack(pack.id, { features: nf }); }}
                    className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)" }} />
                  <button onClick={() => edit.handleUpdatePack(pack.id, { features: (pack.features || []).filter((_: string, k: number) => k !== j) })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-all shrink-0" style={{ background: "rgba(220,38,38,0.08)", color: "var(--danger)" }}><X className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => edit.handleUpdatePack(pack.id, { features: [...(pack.features || []), ""] })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: `${tierHex}08`, color: tierHex, border: `1px dashed ${tierHex}30` }}><Plus className="w-3 h-3" /> Ajouter un avantage</button>
            </div>
          </div>
        </div>
      )}

      {/* Locked tier overlay */}
      {isLockedTier && (() => {
        const tierPack = activePacks.find(p => p.id === galleryTier);
        const tierPosts = allImagePosts.filter(p => normalizeTier(p.tier_required || "public") === galleryTier);
        const tierUploads = uploads.filter(u => normalizeTier(u.tier) === galleryTier && u.dataUrl);
        const previewImages = [...tierPosts.map(p => p.media_url!), ...tierUploads.map(u => u.dataUrl)].filter(Boolean).slice(0, 6);
        if (!tierPack) return null;
        const ctaLink = tierPack.stripe_link || tierPack.wise_url || null;
        const ctaAction = ctaLink ? () => window.open(ctaLink, "_blank") : () => { setFocusPack(galleryTier); setShowUnlock(true); };
        return (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 rounded-2xl overflow-hidden p-4 md:p-6" style={{ background: "var(--surface)", border: `1px solid ${tierHex}15` }}>
              <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "280px" }}>
                {previewImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1 h-full">
                    {previewImages.map((url, i) => <div key={i} className="aspect-[3/4] relative overflow-hidden rounded-lg"><img src={url} alt="" className="w-full h-full object-cover" style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" /></div>)}
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
                  <div key={`${item.type}-${item.id}`} className={`break-inside-avoid mb-1 sm:mb-2 relative ${aspect} overflow-hidden rounded-lg sm:rounded-xl cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`} style={{ animation: `slideUp 0.4s ease-out ${i * 0.03}s both` }}>
                    {unlocked ? (
                      <>
                        <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn} className="w-full h-full">
                          {item.mediaType === "video" ? <video src={item.url} className="w-full h-full object-cover" onClick={() => setZoomedItem(item.id)} data-clickable />
                            : <img src={item.url} alt="" className="w-full h-full object-cover" onClick={() => setZoomedItem(item.id)} loading="lazy" data-clickable />}
                        </ContentProtection>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"><Eye className="w-5 h-5 text-white" /></div>
                        {item.tier !== "p0" && <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)" }}>{TIER_META[item.tier]?.label || item.tier.toUpperCase()}</span>}
                      </>
                    ) : (
                      <div className="w-full h-full" onClick={() => setGalleryTier(item.tier)}>
                        {item.url && <img src={item.url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "blur(14px) brightness(0.4)", transform: "scale(1.15)" }} loading="lazy" />}
                        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${hex}20 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)` }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"><Lock className="w-5 h-5" style={{ color: hex, opacity: 0.8 }} /><span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: hex }}>{TIER_META[item.tier]?.label || item.tier}</span></div>
                      </div>
                    )}
                    {isEditMode && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={async () => {
                          if (item.type === "upload") { if (confirm("Supprimer ce contenu ?")) { await fetch(`/api/uploads?model=${modelId}&id=${item.id}`, { method: "DELETE" }); setUploads(prev => prev.filter(u => u.id !== item.id)); } }
                          else { if (confirm("Supprimer ce post ?")) { await fetch(`/api/posts?id=${item.id}&model=${modelId}`, { method: "DELETE" }); setPosts(prev => prev.filter(p => p.id !== item.id)); } }
                        }} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110" style={{ background: "rgba(220,38,38,0.8)" }}><Trash2 className="w-4 h-4 text-white" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
function ChatPanel({ model, chatMessages, chatInput, setChatInput, sendMessage, chatEndRef, setChatOpen }: {
  model: ModelInfo; chatMessages: { id: string; sender_type: string; content: string; created_at: string }[];
  chatInput: string; setChatInput: (v: string) => void; sendMessage: () => Promise<void>;
  chatEndRef: React.RefObject<HTMLDivElement | null>; setChatOpen: (v: boolean) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50 rounded-2xl overflow-hidden shadow-2xl"
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Heart, MessageCircle, Send, Lock, Image, Newspaper, ShoppingBag,
  Coins, Pin, Eye, Star, Camera, Video, Play, X,
  Instagram, Ghost, ChevronRight, Zap, Plus, Edit3, Wifi,
} from "lucide-react";
import { ContentProtection } from "@/components/content-protection";
import { useScreenshotDetection } from "@/hooks/use-screenshot-detection";

// ── Types ──
interface ModelInfo {
  slug: string; display_name: string; bio: string | null;
  avatar: string | null; online: boolean; status: string | null;
}
interface Post {
  id: string; model: string; content: string | null;
  media_url: string | null; media_type: string | null;
  tier_required: string; likes_count: number; comments_count: number;
  pinned: boolean; created_at: string;
}
interface PackConfig {
  id: string; name: string; price: number; color: string;
  features: string[]; face: boolean; badge: string | null; active: boolean;
}
interface UploadedContent {
  id: string; tier: string; type: "photo" | "video" | "reel"; label: string;
  dataUrl: string; uploadedAt: string; visibility?: "pack" | "promo"; tokenPrice?: number; isNew?: boolean;
}
interface ModelAuth {
  role: string; model_slug?: string; display_name?: string;
}

// ── Constants ──
const TIER_META: Record<string, { color: string; symbol: string; label: string }> = {
  vip: { color: "var(--tier-vip)", symbol: "♥", label: "VIP" },
  gold: { color: "var(--tier-gold)", symbol: "★", label: "Gold" },
  diamond: { color: "var(--tier-diamond)", symbol: "♦", label: "Diamond" },
  platinum: { color: "var(--tier-platinum)", symbol: "♛", label: "Platinum" },
  public: { color: "var(--text-muted)", symbol: "", label: "Public" },
};
const TIER_HEX: Record<string, string> = {
  vip: "#F43F5E", gold: "#F59E0B", diamond: "#6366F1", platinum: "#A78BFA",
};
const TABS = [
  { id: "feed", label: "Feed", icon: Newspaper },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "packs", label: "Packs", icon: ShoppingBag },
  { id: "tokens", label: "Tokens", icon: Coins },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Detect model session from another tab ──
function useModelSession(slug: string): ModelAuth | null {
  const [auth, setAuth] = useState<ModelAuth | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("heaven_auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Root sees everything, model only sees own profile
        if (parsed.role === "root" || parsed.model_slug === slug) {
          setAuth(parsed);
        }
      }
    } catch {}
    // Listen for storage changes from other tabs
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

export default function ModelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const modelAuth = useModelSession(slug);
  const isModelLoggedIn = !!modelAuth;

  const [model, setModel] = useState<ModelInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>([]);
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [tab, setTab] = useState<TabId>("feed");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Messenger
  const [showMessenger, setShowMessenger] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState({ snap: "", insta: "" });
  const [chatMessages, setChatMessages] = useState<{ id: string; client_id: string; sender_type: string; content: string; created_at: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Unlock sheet
  const [showUnlock, setShowUnlock] = useState(false);

  // Gallery filter
  const [galleryTier, setGalleryTier] = useState("all");

  // ── Screenshot detection ──
  // The subscriber's username for watermarking (from messenger registration)
  const subscriberUsername = pseudo.snap || pseudo.insta || clientId?.slice(0, 8) || "visitor";
  const hasSubscriberIdentity = !!clientId;

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
      fetch(`/api/posts?model=${slug}`).then(r => r.json()).catch(() => ({ posts: [] })),
      fetch(`/api/packs?model=${slug}`).then(r => r.json()).catch(() => ({ packs: [] })),
      fetch(`/api/uploads?model=${slug}`).then(r => r.json()).catch(() => ({ uploads: [] })),
    ]).then(([modelData, postsData, packsData, uploadsData]) => {
      setModel(modelData);
      setPosts(postsData.posts || []);
      setPacks(packsData.packs || []);
      setUploads(uploadsData.uploads || []);
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));

    try {
      const saved = sessionStorage.getItem(`heaven_client_${slug}`);
      if (saved) setClientId(JSON.parse(saved).id);
    } catch {}
  }, [slug]);

  useEffect(() => {
    const onFocus = () => {
      fetch(`/api/posts?model=${slug}`).then(r => r.json()).then(d => { if (d.posts) setPosts(d.posts); }).catch(() => {});
      fetch(`/api/uploads?model=${slug}`).then(r => r.json()).then(d => { if (d.uploads) setUploads(d.uploads); }).catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [slug]);

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

  useEffect(() => {
    if (!clientId || !showMessenger) return;
    const fetchChat = () => {
      fetch(`/api/messages?model=${slug}`)
        .then(r => r.json())
        .then(d => { setChatMessages(((d.messages || []) as typeof chatMessages).filter(m => m.client_id === clientId).reverse()); })
        .catch(() => {});
    };
    fetchChat();
    const iv = setInterval(fetchChat, 5000);
    return () => clearInterval(iv);
  }, [clientId, showMessenger, slug]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !clientId) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: slug, client_id: clientId, sender_type: "client", content: chatInput.trim() }),
    });
    setChatInput("");
    const res = await fetch(`/api/messages?model=${slug}`);
    const d = await res.json();
    setChatMessages(((d.messages || []) as typeof chatMessages).filter(m => m.client_id === clientId).reverse());
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const galleryItems = uploads.filter(u => galleryTier === "all" || u.tier === galleryTier);
  const tierCounts = uploads.reduce((acc, u) => { acc[u.tier] = (acc[u.tier] || 0) + 1; return acc; }, {} as Record<string, number>);

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
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(99,102,241,0.2)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  const activePacks = packs.filter(p => p.active);

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: `
          radial-gradient(ellipse 600px 400px at 15% 10%, rgba(99,102,241,0.04), transparent),
          radial-gradient(ellipse 500px 500px at 85% 80%, rgba(244,63,94,0.03), transparent)
        `,
      }} />

      <div className="relative z-10">

        {/* ═══ TOP BAR ═══ */}
        <div className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between">
          {/* Cockpit logo — always visible */}
          <a href={isModelLoggedIn ? "/agence" : "/login"}
            className="w-8 h-8 rounded-lg flex items-center justify-center no-underline glass"
            style={{ border: "1px solid var(--border2)" }}>
            <Zap className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          </a>

          {/* Model quick actions (only if logged in) */}
          {isModelLoggedIn && (
            <div className="flex items-center gap-1.5">
              <a href="/agence?tab=content&upload=1"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium no-underline glass cursor-pointer"
                style={{ border: "1px solid var(--border2)", color: "var(--text-secondary)" }}>
                <Plus className="w-3 h-3" /> Post
              </a>
              <a href="/agence?tab=profile"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium no-underline glass cursor-pointer"
                style={{ border: "1px solid var(--border2)", color: "var(--text-secondary)" }}>
                <Edit3 className="w-3 h-3" /> Edit
              </a>
              <a href="/agence?tab=profile"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium no-underline glass cursor-pointer"
                style={{ border: "1px solid var(--border2)", color: "var(--text-secondary)" }}>
                <Wifi className="w-3 h-3" /> Status
              </a>
            </div>
          )}
        </div>

        {/* ═══ HERO ═══ */}
        <div className="relative">
          <div className="h-32 md:h-44" style={{
            background: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(99,102,241,0.12), rgba(167,139,250,0.08))",
          }} />

          <div className="max-w-xl mx-auto px-4 -mt-12 relative z-10">
            <div className="flex items-end gap-4 mb-4 fade-up">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl border-[3px] flex items-center justify-center text-2xl font-black overflow-hidden"
                  style={{
                    borderColor: "var(--bg)",
                    background: model.avatar ? "transparent" : "linear-gradient(135deg, var(--rose), var(--accent))",
                    color: "#fff",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}>
                  {model.avatar ? (
                    <img src={model.avatar} alt={model.display_name} className="w-full h-full object-cover" />
                  ) : model.display_name.charAt(0)}
                </div>
                {model.online && <span className="online-dot absolute -bottom-0.5 -right-0.5" />}
              </div>

              <div className="pb-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold truncate" style={{ color: "var(--text)" }}>{model.display_name}</h1>
                  <span className="badge badge-success text-[9px]">Verified</span>
                </div>
                {model.status && <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{model.status}</p>}
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                  {uploads.length} media · {posts.length} posts
                </p>
              </div>
            </div>

            {model.bio && (
              <p className="text-xs leading-relaxed mb-4 fade-up" style={{ color: "var(--text-secondary)" }}>{model.bio}</p>
            )}

            {/* Action buttons — two equal buttons */}
            <div className="grid grid-cols-2 gap-2.5 mb-6 fade-up-1">
              <button onClick={() => setShowUnlock(true)}
                className="btn-gradient py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Lock className="w-3.5 h-3.5" /> Unlock
              </button>
              <button onClick={() => setShowMessenger(true)}
                className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer glass"
                style={{ border: "1px solid var(--border2)", color: "var(--text-secondary)" }}>
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </button>
            </div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="max-w-xl mx-auto px-4 mb-5 fade-up-2">
          <div className="segmented-control">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "active" : ""}>
                <t.icon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB CONTENT ═══ */}
        <div className="max-w-xl mx-auto px-4">

          {/* ── FEED ── */}
          {tab === "feed" && (
            <div className="space-y-3 fade-up">
              {posts.length === 0 ? (
                <EmptyState icon={Newspaper} text="No posts yet" />
              ) : posts.map((post, i) => {
                const tierMeta = TIER_META[post.tier_required];
                const tierHex = TIER_HEX[post.tier_required];
                return (
                  <div key={post.id} className="card-premium overflow-hidden" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-3 p-4 pb-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                        {model.display_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{model.display_name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {post.pinned && <Pin className="w-3 h-3" style={{ color: "var(--tier-gold)" }} />}
                        {post.tier_required !== "public" && (
                          <span className="badge text-[8px]" style={{
                            background: `${tierHex || "#64748B"}15`,
                            color: tierMeta?.color || "var(--text-muted)",
                          }}>
                            <Lock className="w-2.5 h-2.5 mr-0.5" /> {tierMeta?.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {post.content && (
                      <div className="px-4 pt-3 pb-2">
                        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>{post.content}</p>
                      </div>
                    )}

                    {post.media_url && (
                      post.tier_required !== "public" ? (
                        <div className="mx-4 my-2 rounded-xl overflow-hidden aspect-video flex items-center justify-center content-locked"
                          style={{ background: `linear-gradient(135deg, ${tierHex || "#64748B"}10, rgba(0,0,0,0.2))` }}>
                          <div className="text-center">
                            <Lock className="w-6 h-6 mx-auto mb-1.5" style={{ color: tierMeta?.color || "var(--text-muted)" }} />
                            <p className="text-[10px] font-semibold" style={{ color: tierMeta?.color }}>{tierMeta?.label} only</p>
                          </div>
                        </div>
                      ) : (
                        <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn}>
                          <div className="mx-4 my-2 rounded-xl overflow-hidden">
                            <img src={post.media_url} alt="" className="w-full" />
                          </div>
                        </ContentProtection>
                      )
                    )}

                    <div className="flex items-center gap-4 px-4 py-3">
                      <button className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:opacity-80" style={{ color: "var(--text-muted)" }}>
                        <Heart className="w-3.5 h-3.5" /> {post.likes_count}
                      </button>
                      <button className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:opacity-80" style={{ color: "var(--text-muted)" }}>
                        <MessageCircle className="w-3.5 h-3.5" /> {post.comments_count}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── GALLERY ── */}
          {tab === "gallery" && (
            <div className="fade-up">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 -mx-4 px-4">
                <button onClick={() => setGalleryTier("all")}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all"
                  style={{
                    background: galleryTier === "all" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    color: galleryTier === "all" ? "var(--text)" : "var(--text-muted)",
                    border: `1px solid ${galleryTier === "all" ? "var(--border3)" : "var(--border2)"}`,
                  }}>
                  All {uploads.length}
                </button>
                {Object.entries(TIER_HEX).filter(([k]) => tierCounts[k]).map(([tier, hex]) => (
                  <button key={tier} onClick={() => setGalleryTier(tier)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all"
                    style={{
                      background: galleryTier === tier ? `${hex}20` : "rgba(255,255,255,0.03)",
                      color: galleryTier === tier ? hex : "var(--text-muted)",
                      border: `1px solid ${galleryTier === tier ? `${hex}40` : "var(--border2)"}`,
                    }}>
                    <span className={`tier-dot ${tier}`} style={{ width: 6, height: 6 }} />
                    {TIER_META[tier]?.label} {tierCounts[tier]}
                  </button>
                ))}
              </div>

              {galleryItems.length === 0 ? (
                <EmptyState icon={Image} text="No content available" />
              ) : (
                <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                  {galleryItems.map((item, i) => {
                    const hex = TIER_HEX[item.tier] || "#64748B";
                    return (
                      <div key={item.id} className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg"
                        style={{ animationDelay: `${i * 20}ms` }}>
                        {item.visibility === "promo" ? (
                          <ContentProtection username={subscriberUsername} enabled={hasSubscriberIdentity && !isModelLoggedIn} className="w-full h-full">
                            <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          </ContentProtection>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center relative" style={{ background: `${hex}08` }}>
                            <div className="absolute inset-0 content-locked" style={{ background: `linear-gradient(135deg, ${hex}12, rgba(0,0,0,0.25))` }} />
                            <div className="relative text-center z-10">
                              <Lock className="w-4 h-4 mx-auto mb-0.5" style={{ color: hex }} />
                              <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: hex }}>
                                {TIER_META[item.tier]?.label}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          {item.type === "video" ? <Play className="w-5 h-5 text-white" /> :
                           item.type === "reel" ? <Camera className="w-4 h-4 text-white" /> :
                           <Eye className="w-4 h-4 text-white" />}
                        </div>

                        {item.type !== "photo" && (
                          <div className="absolute top-1.5 right-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                              {item.type === "video" ? <Video className="w-2.5 h-2.5 inline" /> : "REEL"}
                            </span>
                          </div>
                        )}

                        {item.isNew && (
                          <div className="absolute top-1.5 left-1.5">
                            <span className="badge badge-success text-[7px]">NEW</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PACKS ── */}
          {tab === "packs" && (
            <div className="space-y-3 fade-up">
              {activePacks.length === 0 ? (
                <EmptyState icon={ShoppingBag} text="No packs available" />
              ) : activePacks.map((pack, i) => {
                const hex = TIER_HEX[pack.id] || pack.color;
                return (
                  <div key={pack.id} className="card-premium p-5 relative overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${hex}, transparent)`, opacity: 0.4 }} />
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`tier-dot ${pack.id}`} />
                        <h3 className="text-sm font-bold" style={{ color: hex }}>{pack.name}</h3>
                        {pack.badge && <span className="badge text-[9px]" style={{ background: `${hex}15`, color: hex }}>{pack.badge}</span>}
                      </div>
                      <span className="text-xl font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {pack.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <Star className="w-3 h-3 shrink-0" style={{ color: hex }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setShowUnlock(true)}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                      style={{ background: `${hex}12`, color: hex, border: `1px solid ${hex}25` }}>
                      Choose {TIER_META[pack.id]?.label || pack.name}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TOKENS ── */}
          {tab === "tokens" && (
            <div className="fade-up">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center mx-auto mb-3">
                  <Coins className="w-6 h-6" style={{ color: "var(--tier-gold)" }} />
                </div>
                <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Heaven Tokens</h2>
                <p className="text-[11px] mt-1 max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
                  Unlock exclusive content and premium services
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { tokens: 20, price: 10, bonus: 0 },
                  { tokens: 50, price: 22, bonus: 5 },
                  { tokens: 120, price: 50, bonus: 15, popular: true },
                  { tokens: 300, price: 110, bonus: 50 },
                ].map(tp => (
                  <div key={tp.tokens} className="card-premium p-4 relative text-center cursor-pointer transition-all hover:-translate-y-0.5"
                    style={tp.popular ? { border: "1px solid rgba(245,158,11,0.25)" } : undefined}>
                    {tp.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[8px] font-bold tracking-wide"
                        style={{ background: "var(--tier-gold)", color: "#0A0A0F" }}>BEST VALUE</span>
                    )}
                    <p className="text-2xl font-black tabular-nums mb-0.5" style={{ color: "var(--tier-gold)" }}>
                      {tp.tokens}
                      {tp.bonus > 0 && <span className="text-xs" style={{ color: "var(--success)" }}> +{tp.bonus}</span>}
                    </p>
                    <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>tokens</p>
                    <button className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer"
                      style={{ background: "rgba(245,158,11,0.08)", color: "var(--tier-gold)", border: "1px solid rgba(245,158,11,0.15)" }}>
                      {tp.price}€
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ UNLOCK SHEET ═══ */}
        {showUnlock && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => setShowUnlock(false)}>
            <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden"
              style={{ background: "var(--surface)", maxHeight: "85vh", border: "1px solid var(--border2)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 md:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Choose your access</h2>
                <button onClick={() => setShowUnlock(false)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
              <div className="px-6 pb-6 space-y-2.5 overflow-y-auto" style={{ maxHeight: "60vh" }}>
                {activePacks.map(pack => {
                  const hex = TIER_HEX[pack.id] || pack.color;
                  return (
                    <button key={pack.id} className="w-full p-4 rounded-xl text-left cursor-pointer transition-all hover:-translate-y-0.5"
                      style={{ background: `${hex}08`, border: `1px solid ${hex}20` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`tier-dot ${pack.id}`} />
                          <span className="text-sm font-bold" style={{ color: hex }}>{pack.name}</span>
                        </div>
                        <span className="text-base font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                      </div>
                      <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {pack.features.slice(0, 2).join(" · ")}
                      </p>
                    </button>
                  );
                })}
                <p className="text-[10px] text-center pt-2" style={{ color: "var(--text-muted)" }}>
                  After selection, you&apos;ll receive payment instructions.
                  Access activates within 15 minutes of confirmed payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MESSENGER ═══ */}
        {showMessenger && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => setShowMessenger(false)}>
            <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col"
              style={{ background: "var(--surface)", maxHeight: "80vh", border: "1px solid var(--border2)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 md:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border2)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                    {model.display_name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{model.display_name}</span>
                    {model.online && <span className="text-[9px] ml-1.5" style={{ color: "var(--success)" }}>Online</span>}
                  </div>
                </div>
                <button onClick={() => setShowMessenger(false)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>

              {!clientId ? (
                <div className="p-6 space-y-3">
                  <p className="text-[11px] text-center mb-1" style={{ color: "var(--text-muted)" }}>Enter your username to start</p>
                  <div className="relative">
                    <Ghost className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <input value={pseudo.snap} onChange={e => setPseudo(p => ({ ...p, snap: e.target.value }))}
                      placeholder="Snapchat" className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                  </div>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <input value={pseudo.insta} onChange={e => setPseudo(p => ({ ...p, insta: e.target.value }))}
                      placeholder="Instagram" className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                  </div>
                  <button onClick={registerClient} disabled={!pseudo.snap && !pseudo.insta}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer btn-gradient disabled:opacity-30">
                    Start Chatting
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ minHeight: 200 }}>
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-[11px] py-8" style={{ color: "var(--text-muted)" }}>No messages yet. Say hello!</p>
                    ) : chatMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[75%] rounded-2xl px-3.5 py-2 text-xs"
                          style={{
                            background: msg.sender_type === "client" ? "rgba(99,102,241,0.12)" : "var(--bg3)",
                            color: "var(--text)",
                          }}>
                          {msg.content}
                          <p className="text-[8px] mt-0.5 opacity-40">{timeAgo(msg.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 flex gap-2" style={{ borderTop: "1px solid var(--border2)" }}>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder="Message..." className="flex-1 px-3.5 py-2.5 rounded-xl text-xs outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                    <button onClick={sendMessage}
                      className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer btn-gradient">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ MOBILE BOTTOM NAV ═══ */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden safe-area-bottom glass-strong"
          style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center justify-around py-2">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer transition-all"
                style={{ color: tab === t.id ? "var(--accent)" : "var(--text-muted)" }}>
                <t.icon className="w-5 h-5" />
                {tab === t.id && <span className="text-[10px] font-medium">{t.label}</span>}
              </button>
            ))}
          </div>
        </nav>

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

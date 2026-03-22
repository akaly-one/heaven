"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Heart, MessageCircle, Send, Lock, Image, Newspaper, ShoppingBag,
  Coins, Pin, Eye, Star, Camera, Video, MessageSquare, Play, X,
  Instagram, Ghost,
} from "lucide-react";

// ── Types ──
interface ModelInfo {
  slug: string;
  display_name: string;
  bio: string | null;
  avatar: string | null;
  online: boolean;
  status: string | null;
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

// ── Constants ──
const TIER_META: Record<string, { color: string; symbol: string; label: string }> = {
  vip: { color: "#F43F5E", symbol: "♥", label: "VIP" },
  gold: { color: "#F59E0B", symbol: "★", label: "Gold" },
  diamond: { color: "#6366F1", symbol: "♦", label: "Diamond" },
  platinum: { color: "#A78BFA", symbol: "♛", label: "Platinum" },
  public: { color: "#64748B", symbol: "", label: "Public" },
};

const TABS = [
  { id: "feed", label: "Feed", icon: Newspaper },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "packs", label: "Packs", icon: ShoppingBag },
  { id: "tokens", label: "Tokens", icon: Coins },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ModelPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [model, setModel] = useState<ModelInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [packs, setPacks] = useState<PackConfig[]>([]);
  const [uploads, setUploads] = useState<UploadedContent[]>([]);
  const [tab, setTab] = useState<TabId>("feed");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Messenger state
  const [showMessenger, setShowMessenger] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState({ snap: "", insta: "" });
  const [chatMessages, setChatMessages] = useState<{ id: string; client_id: string; sender_type: string; content: string; created_at: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Unlock sheet state
  const [showUnlock, setShowUnlock] = useState(false);

  // Gallery tier filter
  const [galleryTier, setGalleryTier] = useState("all");

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

    // Restore client session
    try {
      const saved = sessionStorage.getItem(`heaven_client_${slug}`);
      if (saved) setClientId(JSON.parse(saved).id);
    } catch {}
  }, [slug]);

  // Refresh on focus
  useEffect(() => {
    const onFocus = () => {
      fetch(`/api/posts?model=${slug}`).then(r => r.json()).then(d => { if (d.posts) setPosts(d.posts); }).catch(() => {});
      fetch(`/api/uploads?model=${slug}`).then(r => r.json()).then(d => { if (d.uploads) setUploads(d.uploads); }).catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [slug]);

  // Register client
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

  // Chat polling
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

  // Gallery items with tier filtering
  const galleryItems = uploads.filter(u => galleryTier === "all" || u.tier === galleryTier);
  const tierCounts = uploads.reduce((acc, u) => { acc[u.tier] = (acc[u.tier] || 0) + 1; return acc; }, {} as Record<string, number>);

  // ── Loading / 404 ──
  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="text-center fade-up">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(99,102,241,0.08)" }}>
            <Lock className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Profile not found</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>This model doesn&apos;t exist or is no longer active.</p>
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

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>

      {/* ═══ HERO ═══ */}
      <div className="relative">
        {/* Cover */}
        <div className="h-36 md:h-52" style={{
          background: "linear-gradient(135deg, rgba(244,63,94,0.2), rgba(99,102,241,0.15), rgba(167,139,250,0.1))",
        }} />

        <div className="max-w-2xl mx-auto px-4 -mt-14 relative z-10">
          {/* Avatar + info */}
          <div className="flex items-end gap-4 mb-5 fade-up">
            <div className="w-28 h-28 rounded-2xl border-4 flex items-center justify-center text-3xl font-black overflow-hidden"
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

            <div className="pb-2 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>{model.display_name}</h1>
                {model.online && <span className="online-dot" />}
                <span className="badge badge-success text-[9px]">Verified</span>
              </div>
              {model.status && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{model.status}</p>}
              {model.bio && <p className="text-xs mt-1 max-w-md" style={{ color: "var(--text-secondary)" }}>{model.bio}</p>}
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                {uploads.length} posts · {posts.length} feed items
              </p>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 mb-6 fade-up-1">
            <button
              onClick={() => setShowUnlock(true)}
              className="flex-1 btn-gradient py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
            >
              <Lock className="w-4 h-4" /> Unlock Exclusive Content
            </button>
            <button
              onClick={() => setShowMessenger(true)}
              className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border2)" }}
            >
              <MessageSquare className="w-4.5 h-4.5" style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="max-w-2xl mx-auto px-4 mb-6 fade-up-2">
        <div className="segmented-control">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "active" : ""}>
              <t.icon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="max-w-2xl mx-auto px-4">

        {/* FEED */}
        {tab === "feed" && (
          <div className="space-y-4 fade-up">
            {posts.length === 0 ? (
              <div className="text-center py-20">
                <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-15" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No posts yet</p>
              </div>
            ) : posts.map(post => (
              <div key={post.id} className="card-premium overflow-hidden">
                {/* Post header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
                    {model.display_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{model.display_name}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</p>
                  </div>
                  {post.pinned && <Pin className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />}
                  {post.tier_required !== "public" && (
                    <span className="badge text-[9px]" style={{
                      background: `${TIER_META[post.tier_required]?.color || "#64748B"}15`,
                      color: TIER_META[post.tier_required]?.color || "#64748B",
                    }}>
                      <Lock className="w-2.5 h-2.5" /> {TIER_META[post.tier_required]?.label || post.tier_required}
                    </span>
                  )}
                </div>

                {post.content && (
                  <div className="px-4 pb-3">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{post.content}</p>
                  </div>
                )}

                {post.media_url && (
                  post.tier_required !== "public" ? (
                    <div className="aspect-video flex items-center justify-center" style={{ background: "rgba(99,102,241,0.03)" }}>
                      <div className="text-center">
                        <Lock className="w-8 h-8 mx-auto mb-2" style={{ color: TIER_META[post.tier_required]?.color || "#64748B" }} />
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                          {TIER_META[post.tier_required]?.label} content
                        </p>
                      </div>
                    </div>
                  ) : <img src={post.media_url} alt="" className="w-full" />
                )}

                <div className="flex items-center gap-5 px-4 py-3" style={{ borderTop: "1px solid var(--border2)" }}>
                  <button className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80" style={{ color: "var(--text-muted)" }}>
                    <Heart className="w-4 h-4" /> {post.likes_count}
                  </button>
                  <button className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80" style={{ color: "var(--text-muted)" }}>
                    <MessageCircle className="w-4 h-4" /> {post.comments_count}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GALLERY */}
        {tab === "gallery" && (
          <div className="fade-up">
            {/* Tier selector pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 -mx-4 px-4">
              <button
                onClick={() => setGalleryTier("all")}
                className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all"
                style={{
                  background: galleryTier === "all" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                  color: galleryTier === "all" ? "var(--text)" : "var(--text-muted)",
                  border: `1px solid ${galleryTier === "all" ? "var(--border3)" : "var(--border2)"}`,
                }}
              >
                All {uploads.length}
              </button>
              {Object.entries(TIER_META).filter(([k]) => tierCounts[k]).map(([tier, meta]) => (
                <button
                  key={tier}
                  onClick={() => setGalleryTier(tier)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all"
                  style={{
                    background: galleryTier === tier ? `${meta.color}20` : "rgba(255,255,255,0.03)",
                    color: galleryTier === tier ? meta.color : "var(--text-muted)",
                    border: `1px solid ${galleryTier === tier ? `${meta.color}40` : "var(--border2)"}`,
                  }}
                >
                  <span className={`tier-dot ${tier}`} style={{ width: 6, height: 6 }} />
                  {meta.label} {meta.symbol} {tierCounts[tier]}
                </button>
              ))}
            </div>

            {/* Grid */}
            {galleryItems.length === 0 ? (
              <div className="text-center py-20">
                <Image className="w-12 h-12 mx-auto mb-3 opacity-15" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No content available</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                {galleryItems.map(item => (
                  <div key={item.id} className="relative aspect-square group cursor-pointer overflow-hidden">
                    {item.visibility === "promo" ? (
                      <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      /* Locked content */
                      <div className="w-full h-full flex items-center justify-center relative" style={{ background: `${TIER_META[item.tier]?.color || "#64748B"}08` }}>
                        {/* Blurred placeholder */}
                        <div className="absolute inset-0 content-locked" style={{
                          background: `linear-gradient(135deg, ${TIER_META[item.tier]?.color || "#64748B"}15, rgba(0,0,0,0.3))`,
                        }} />
                        <div className="relative text-center z-10">
                          <Lock className="w-5 h-5 mx-auto mb-1" style={{ color: TIER_META[item.tier]?.color || "#64748B" }} />
                          <span className="text-[9px] font-bold uppercase" style={{ color: TIER_META[item.tier]?.color || "#64748B" }}>
                            {TIER_META[item.tier]?.label || item.tier}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {item.type === "video" ? <Play className="w-6 h-6 text-white" /> :
                       item.type === "reel" ? <Camera className="w-5 h-5 text-white" /> :
                       <Eye className="w-5 h-5 text-white" />}
                    </div>

                    {/* Type badge */}
                    {item.type !== "photo" && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold"
                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                        {item.type === "video" ? "VID" : "REEL"}
                      </div>
                    )}

                    {/* NEW badge */}
                    {item.isNew && (
                      <div className="absolute top-1.5 left-1.5">
                        <span className="badge badge-success text-[7px]">NEW</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PACKS */}
        {tab === "packs" && (
          <div className="space-y-4 fade-up">
            {packs.filter(p => p.active).length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-15" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No packs available</p>
              </div>
            ) : packs.filter(p => p.active).map(pack => {
              const meta = TIER_META[pack.id];
              return (
                <div key={pack.id} className="card-premium p-5 relative overflow-hidden">
                  {/* Accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${pack.color}, transparent)`, opacity: 0.5 }} />

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`tier-dot ${pack.id}`} />
                      <h3 className="text-base font-bold" style={{ color: pack.color }}>{pack.name}</h3>
                      {pack.badge && <span className="badge text-[9px]" style={{ background: `${pack.color}15`, color: pack.color }}>{pack.badge}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black tabular-nums" style={{ color: pack.color }}>{pack.price}€</span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {pack.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <Star className="w-3 h-3 flex-shrink-0" style={{ color: pack.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setShowUnlock(true)}
                    className="w-full py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:-translate-y-0.5"
                    style={{ background: `${pack.color}15`, color: pack.color, border: `1px solid ${pack.color}30` }}
                  >
                    Choose {meta?.label || pack.name}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TOKENS */}
        {tab === "tokens" && (
          <div className="fade-up">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(245,158,11,0.1)" }}>
                <Coins className="w-7 h-7" style={{ color: "var(--gold)" }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Heaven Tokens</h2>
              <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
                Purchase tokens to unlock exclusive content and premium services
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { tokens: 20, price: 10, bonus: 0 },
                { tokens: 50, price: 22, bonus: 5 },
                { tokens: 120, price: 50, bonus: 15, popular: true },
                { tokens: 300, price: 110, bonus: 50 },
              ].map(tp => (
                <div key={tp.tokens} className="card-premium p-5 relative text-center cursor-pointer"
                  style={{ border: tp.popular ? "1px solid rgba(245,158,11,0.3)" : undefined }}>
                  {tp.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: "var(--gold)", color: "#0A0A0F" }}>BEST VALUE</span>
                  )}
                  <p className="text-3xl font-black tabular-nums mb-0.5" style={{ color: "var(--gold)" }}>
                    {tp.tokens}
                    {tp.bonus > 0 && <span className="text-sm" style={{ color: "var(--success)" }}> +{tp.bonus}</span>}
                  </p>
                  <p className="text-[10px] mb-4" style={{ color: "var(--text-muted)" }}>tokens</p>
                  <button className="w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{ background: "rgba(245,158,11,0.1)", color: "var(--gold)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    {tp.price}€
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ UNLOCK BOTTOM SHEET ═══ */}
      {showUnlock && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => setShowUnlock(false)}>
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden" style={{ background: "var(--surface)", maxHeight: "85vh" }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-center pt-3 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
            </div>

            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Choose your access</h2>
              <button onClick={() => setShowUnlock(false)} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {packs.filter(p => p.active).map(pack => (
                <button key={pack.id} className="w-full p-4 rounded-xl text-left cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ background: `${pack.color}08`, border: `1px solid ${pack.color}25` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`tier-dot ${pack.id}`} />
                      <span className="text-sm font-bold" style={{ color: pack.color }}>{pack.name}</span>
                    </div>
                    <span className="text-lg font-black tabular-nums" style={{ color: pack.color }}>{pack.price}€</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {pack.features.slice(0, 2).join(" · ")}
                  </p>
                </button>
              ))}

              <div className="pt-3">
                <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
                  After selection, you&apos;ll receive payment instructions.
                  Your access activates within 15 minutes of confirmed payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MESSENGER ═══ */}
      {showMessenger && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={() => setShowMessenger(false)}>
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "var(--surface)", maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>

            <div className="flex justify-center pt-3 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border2)" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: "var(--rose)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Message {model.display_name}</span>
              </div>
              <button onClick={() => setShowMessenger(false)} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {!clientId ? (
              <div className="p-6 space-y-4">
                <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Enter your username to start chatting</p>
                <div className="relative">
                  <Ghost className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input value={pseudo.snap} onChange={e => setPseudo(p => ({ ...p, snap: e.target.value }))}
                    placeholder="Snapchat username" className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                </div>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input value={pseudo.insta} onChange={e => setPseudo(p => ({ ...p, insta: e.target.value }))}
                    placeholder="Instagram username" className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                </div>
                <button onClick={registerClient} disabled={!pseudo.snap && !pseudo.insta}
                  className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer btn-gradient disabled:opacity-30">
                  Start Chatting
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ minHeight: 200 }}>
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-xs py-8" style={{ color: "var(--text-muted)" }}>No messages yet. Say hello!</p>
                  ) : chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs"
                        style={{
                          background: msg.sender_type === "client" ? "rgba(99,102,241,0.15)" : "var(--bg3)",
                          color: "var(--text)",
                        }}>
                        {msg.content}
                        <p className="text-[9px] mt-1 opacity-40">{timeAgo(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 flex gap-2" style={{ borderTop: "1px solid var(--border2)" }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Your message..." className="flex-1 px-3.5 py-2.5 rounded-xl text-xs outline-none"
                    style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                  <button onClick={sendMessage} className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer btn-gradient">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden safe-area-bottom glass-strong">
        <div className="flex items-center justify-around py-2.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer transition-all"
              style={{ color: tab === t.id ? "var(--accent)" : "var(--text-muted)" }}>
              <t.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab === t.id ? t.label : ""}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

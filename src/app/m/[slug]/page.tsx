"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Heart, MessageCircle, Send, Lock, Image, Newspaper, ShoppingBag,
  Coins, Pin, ChevronDown, Eye, Star, Camera, Video, MessageSquare,
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
  id: string;
  model: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  tier_required: string;
  likes_count: number;
  comments_count: number;
  pinned: boolean;
  created_at: string;
}

interface PackConfig {
  id: string;
  name: string;
  price: number;
  color: string;
  features: string[];
  face: boolean;
  badge: string | null;
  active: boolean;
}

interface UploadedContent {
  id: string;
  tier: string;
  type: "photo" | "video" | "reel";
  label: string;
  dataUrl: string;
  uploadedAt: string;
  visibility?: "pack" | "promo";
  tokenPrice?: number;
}

// ── Constants ──
const TIER_COLORS: Record<string, string> = {
  vip: "#E84393", gold: "#C9A84C", diamond: "#5B8DEF", platinum: "#A882FF", public: "#8E8EA3",
};

const TABS = [
  { id: "feed", label: "Feed", icon: Newspaper },
  { id: "gallery", label: "Galerie", icon: Image },
  { id: "packs", label: "Packs", icon: ShoppingBag },
  { id: "tokens", label: "Jetons", icon: Coins },
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
  const [showMessenger, setShowMessenger] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [messengerPseudo, setMessengerPseudo] = useState({ snap: "", insta: "" });
  const [chatMessages, setChatMessages] = useState<{ id: string; sender_type: string; content: string; created_at: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Load model + data
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    // Fetch model info
    fetch(`/api/models/${slug}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(d => setModel(d))
      .catch(() => setNotFound(true));

    // Fetch posts
    fetch(`/api/posts?model=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.posts) setPosts(d.posts); })
      .catch(() => {});

    // Fetch packs
    fetch(`/api/packs?model=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.packs?.length > 0) setPacks(d.packs); })
      .catch(() => {});

    // Fetch gallery uploads
    fetch(`/api/uploads?model=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.uploads) setUploads(d.uploads); })
      .catch(() => {});

    setLoading(false);

    // Restore client session
    try {
      const saved = sessionStorage.getItem(`heaven_client_${slug}`);
      if (saved) setClientId(JSON.parse(saved).id);
    } catch { /* ignore */ }
  }, [slug]);

  // Refresh on tab focus
  useEffect(() => {
    const onFocus = () => {
      fetch(`/api/posts?model=${slug}`).then(r => r.json()).then(d => { if (d.posts) setPosts(d.posts); }).catch(() => {});
      fetch(`/api/uploads?model=${slug}`).then(r => r.json()).then(d => { if (d.uploads) setUploads(d.uploads); }).catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [slug]);

  // Register client for messenger
  const registerClient = useCallback(async () => {
    if (!messengerPseudo.snap && !messengerPseudo.insta) return;
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pseudo_snap: messengerPseudo.snap || null,
        pseudo_insta: messengerPseudo.insta || null,
        model: slug,
      }),
    });
    const data = await res.json();
    if (data.client) {
      setClientId(data.client.id);
      sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(data.client));
    }
  }, [messengerPseudo, slug]);

  // Fetch chat messages
  useEffect(() => {
    if (!clientId || !showMessenger) return;
    const fetchChat = () => {
      fetch(`/api/messages?model=${slug}`)
        .then(r => r.json())
        .then(d => {
          const msgs = (d.messages || []).filter((m: { client_id: string }) => m.client_id === clientId);
          setChatMessages(msgs.reverse());
        })
        .catch(() => {});
    };
    fetchChat();
    const interval = setInterval(fetchChat, 5000);
    return () => clearInterval(interval);
  }, [clientId, showMessenger, slug]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !clientId) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: slug,
        client_id: clientId,
        sender_type: "client",
        content: chatInput.trim(),
      }),
    });
    setChatInput("");
    // Refresh
    const res = await fetch(`/api/messages?model=${slug}`);
    const d = await res.json();
    setChatMessages((d.messages || []).filter((m: { client_id: string }) => m.client_id === clientId).reverse());
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--sq-bg)" }}>
        <div className="text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--sq-text)" }}>Profil introuvable</h1>
          <p className="text-sm" style={{ color: "var(--sq-text-muted)" }}>Ce modèle n&apos;existe pas ou n&apos;est plus actif.</p>
        </div>
      </div>
    );
  }

  if (loading || !model) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--sq-bg)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(232,67,147,0.2)", borderTopColor: "#E84393" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--sq-bg)" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease both; }
      `}</style>

      {/* ── Header / Profile ── */}
      <div className="relative">
        {/* Cover gradient */}
        <div className="h-32 md:h-48" style={{
          background: "linear-gradient(135deg, rgba(232,67,147,0.3), rgba(168,130,255,0.2), rgba(91,141,239,0.15))",
        }} />

        <div className="max-w-2xl mx-auto px-4 -mt-12 relative z-10">
          {/* Avatar + name */}
          <div className="flex items-end gap-4 mb-4">
            <div className="w-24 h-24 rounded-2xl border-4 flex items-center justify-center text-2xl font-black overflow-hidden"
              style={{
                borderColor: "var(--sq-bg)",
                background: model.avatar ? "transparent" : "linear-gradient(135deg, #E84393, #D63384)",
                color: "#fff",
              }}>
              {model.avatar ? (
                <img src={model.avatar} alt={model.display_name} className="w-full h-full object-cover" />
              ) : (
                model.display_name.charAt(0)
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black" style={{ color: "var(--sq-text)" }}>{model.display_name}</h1>
                {model.online && (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#00D68F", boxShadow: "0 0 8px rgba(0,214,143,0.5)" }} />
                )}
              </div>
              {model.status && (
                <p className="text-xs mt-0.5" style={{ color: "var(--sq-text-muted)" }}>{model.status}</p>
              )}
              {model.bio && (
                <p className="text-xs mt-1 max-w-md" style={{ color: "var(--sq-text-muted)" }}>{model.bio}</p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--sq-text-muted)" }}>
              <Image className="w-3.5 h-3.5" />
              <span>{uploads.length} photos</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--sq-text-muted)" }}>
              <Newspaper className="w-3.5 h-3.5" />
              <span>{posts.length} posts</span>
            </div>
            <button
              onClick={() => setShowMessenger(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(232,67,147,0.15)", color: "#E84393" }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div className="max-w-2xl mx-auto px-4 mb-6">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--sq-bg2)" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
              style={{
                background: tab === t.id ? "rgba(232,67,147,0.15)" : "transparent",
                color: tab === t.id ? "#E84393" : "var(--sq-text-muted)",
              }}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-2xl mx-auto px-4">
        {/* FEED */}
        {tab === "feed" && (
          <div className="space-y-4 fade-up">
            {posts.length === 0 ? (
              <div className="text-center py-16">
                <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--sq-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--sq-text-muted)" }}>Aucun post pour le moment</p>
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="rounded-xl overflow-hidden" style={{ background: "var(--sq-bg2)", border: "1px solid var(--sq-border2)" }}>
                  {/* Post header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, #E84393, #D63384)", color: "#fff" }}>
                      {model.display_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold" style={{ color: "var(--sq-text)" }}>{model.display_name}</p>
                      <p className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>{timeAgo(post.created_at)}</p>
                    </div>
                    {post.pinned && <Pin className="w-3.5 h-3.5" style={{ color: "#C9A84C" }} />}
                    {post.tier_required !== "public" && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                        style={{ background: `${TIER_COLORS[post.tier_required] || "#8E8EA3"}20`, color: TIER_COLORS[post.tier_required] || "#8E8EA3" }}>
                        <Lock className="w-2.5 h-2.5 inline mr-0.5" />{post.tier_required}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  {post.content && (
                    <div className="px-4 pb-3">
                      <p className="text-sm" style={{ color: "var(--sq-text)" }}>{post.content}</p>
                    </div>
                  )}

                  {/* Media */}
                  {post.media_url && (
                    <div className="relative">
                      {post.tier_required !== "public" ? (
                        <div className="aspect-video flex items-center justify-center" style={{ background: "rgba(232,67,147,0.05)" }}>
                          <div className="text-center">
                            <Lock className="w-8 h-8 mx-auto mb-2" style={{ color: TIER_COLORS[post.tier_required] || "#8E8EA3" }} />
                            <p className="text-xs font-medium" style={{ color: "var(--sq-text-muted)" }}>Contenu {post.tier_required.toUpperCase()}</p>
                          </div>
                        </div>
                      ) : (
                        <img src={post.media_url} alt="" className="w-full" />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 px-4 py-3" style={{ borderTop: "1px solid var(--sq-border2)" }}>
                    <button className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80" style={{ color: "var(--sq-text-muted)" }}>
                      <Heart className="w-4 h-4" />
                      <span>{post.likes_count}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80" style={{ color: "var(--sq-text-muted)" }}>
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments_count}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* GALLERY */}
        {tab === "gallery" && (
          <div className="fade-up">
            {uploads.length === 0 ? (
              <div className="text-center py-16">
                <Image className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--sq-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--sq-text-muted)" }}>Galerie vide</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {uploads.map(item => (
                  <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer">
                    {item.visibility === "promo" || !item.tier ? (
                      <img src={item.dataUrl} alt={item.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: `${TIER_COLORS[item.tier] || "#E84393"}10` }}>
                        <div className="text-center">
                          <Lock className="w-5 h-5 mx-auto mb-1" style={{ color: TIER_COLORS[item.tier] || "#E84393" }} />
                          <span className="text-[9px] font-bold uppercase" style={{ color: TIER_COLORS[item.tier] || "#E84393" }}>
                            {item.tier}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex items-center gap-3 text-white text-xs">
                        {item.type === "video" ? <Video className="w-4 h-4" /> : item.type === "reel" ? <Camera className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </div>
                    </div>
                    {/* Type badge */}
                    {item.type !== "photo" && (
                      <div className="absolute top-1 right-1 px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                        {item.type === "video" ? "VID" : "REEL"}
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
          <div className="space-y-3 fade-up">
            {packs.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--sq-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--sq-text-muted)" }}>Aucun pack disponible</p>
              </div>
            ) : (
              packs.filter(p => p.active).map(pack => (
                <div key={pack.id} className="rounded-xl p-4 transition-all hover:-translate-y-0.5"
                  style={{ background: "var(--sq-bg2)", border: `1px solid ${pack.color}30` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {pack.badge && <span className="text-lg">{pack.badge}</span>}
                      <h3 className="text-sm font-bold" style={{ color: pack.color }}>{pack.name}</h3>
                    </div>
                    <span className="text-lg font-black" style={{ color: pack.color }}>{pack.price}€</span>
                  </div>
                  <ul className="space-y-1.5 mb-3">
                    {pack.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--sq-text-muted)" }}>
                        <Star className="w-3 h-3 flex-shrink-0" style={{ color: pack.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className="w-full py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:opacity-90"
                    style={{ background: `${pack.color}20`, color: pack.color }}>
                    Choisir ce pack
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TOKENS */}
        {tab === "tokens" && (
          <div className="fade-up">
            <div className="text-center mb-6">
              <Coins className="w-8 h-8 mx-auto mb-2" style={{ color: "#C9A84C" }} />
              <h2 className="text-lg font-bold" style={{ color: "var(--sq-text)" }}>Jetons Heaven</h2>
              <p className="text-xs mt-1" style={{ color: "var(--sq-text-muted)" }}>
                Achetez des jetons pour débloquer du contenu exclusif et des services
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { tokens: 20, price: 10, bonus: 0 },
                { tokens: 50, price: 22, bonus: 5 },
                { tokens: 120, price: 50, bonus: 15, popular: true },
                { tokens: 300, price: 110, bonus: 50 },
              ].map(tp => (
                <div key={tp.tokens} className="rounded-xl p-4 relative transition-all hover:-translate-y-0.5 cursor-pointer"
                  style={{
                    background: "var(--sq-bg2)",
                    border: tp.popular ? "1px solid rgba(201,168,76,0.4)" : "1px solid var(--sq-border2)",
                  }}>
                  {tp.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[8px] font-bold"
                      style={{ background: "#C9A84C", color: "#06060B" }}>POPULAIRE</span>
                  )}
                  <p className="text-2xl font-black text-center mb-1" style={{ color: "#C9A84C" }}>
                    {tp.tokens}
                    {tp.bonus > 0 && <span className="text-xs font-medium" style={{ color: "#00D68F" }}> +{tp.bonus}</span>}
                  </p>
                  <p className="text-[10px] text-center mb-3" style={{ color: "var(--sq-text-muted)" }}>jetons</p>
                  <button className="w-full py-2 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                    {tp.price}€
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Messenger Widget ── */}
      {showMessenger && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col" style={{ background: "var(--sq-bg)", maxHeight: "80vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--sq-bg2)", borderBottom: "1px solid var(--sq-border2)" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: "#E84393" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--sq-text)" }}>
                  Message à {model.display_name}
                </span>
              </div>
              <button onClick={() => setShowMessenger(false)} className="text-lg cursor-pointer" style={{ color: "var(--sq-text-muted)" }}>✕</button>
            </div>

            {!clientId ? (
              // Registration form
              <div className="p-6 space-y-4">
                <p className="text-xs text-center" style={{ color: "var(--sq-text-muted)" }}>
                  Entrez votre pseudo pour commencer à discuter
                </p>
                <input
                  value={messengerPseudo.snap}
                  onChange={e => setMessengerPseudo(p => ({ ...p, snap: e.target.value }))}
                  placeholder="Pseudo Snapchat"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--sq-bg2)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
                />
                <input
                  value={messengerPseudo.insta}
                  onChange={e => setMessengerPseudo(p => ({ ...p, insta: e.target.value }))}
                  placeholder="Pseudo Instagram"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--sq-bg2)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
                />
                <button
                  onClick={registerClient}
                  disabled={!messengerPseudo.snap && !messengerPseudo.insta}
                  className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #E84393, #D63384)", color: "#fff" }}
                >
                  Commencer
                </button>
              </div>
            ) : (
              // Chat
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ minHeight: 200 }}>
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-xs py-8" style={{ color: "var(--sq-text-muted)" }}>Aucun message. Dites bonjour !</p>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[75%] rounded-2xl px-3 py-2 text-xs"
                          style={{
                            background: msg.sender_type === "client" ? "rgba(232,67,147,0.15)" : "var(--sq-bg2)",
                            color: "var(--sq-text)",
                          }}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 flex gap-2" style={{ borderTop: "1px solid var(--sq-border2)" }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Votre message..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                    style={{ background: "var(--sq-bg2)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
                  />
                  <button onClick={sendMessage} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #E84393, #D63384)", color: "#fff" }}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom tab (fixed) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden safe-area-bottom" style={{ background: "#0C0C14", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-around py-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer"
              style={{ color: tab === t.id ? "#E84393" : "#8E8EA3" }}>
              <t.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

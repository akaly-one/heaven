"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import {
  MessageSquare, Send, Trash2, Ban, Search, ArrowLeft,
  Heart, MessageCircle, Pin, PinOff, Image, Plus, X,
} from "lucide-react";

// ── Types & Constants (centralized) ──
import type { Message, FeedPost as Post } from "@/types/heaven";
import { TIER_COLORS } from "@/constants/tiers";

interface Client {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; is_verified: boolean; is_blocked: boolean; total_spent: number;
}
interface Conversation {
  client: Client; messages: Message[]; lastMessage: Message; unread: number;
}

export default function MessagesPage() {
  const { currentModel, authHeaders } = useModel();
  const [subTab, setSubTab] = useState<"messages" | "feed">("messages");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTier, setNewPostTier] = useState("public");
  const [posting, setPosting] = useState(false);

  // ── Messages logic ──
  const fetchMessages = useCallback(() => {
    const model = currentModel || "yumi";
    const params = `?model=${model}`;
    Promise.all([
      fetch(`/api/messages${params}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/clients${params}`, { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([msgData, clientData]) => {
        const messages: Message[] = msgData.messages || [];
        const clients: Client[] = clientData.clients || [];
        const clientMap = new Map(clients.map(c => [c.id, c]));
        const grouped: Record<string, Message[]> = {};
        messages.forEach(m => { if (!grouped[m.client_id]) grouped[m.client_id] = []; grouped[m.client_id].push(m); });
        const convs: Conversation[] = Object.entries(grouped)
          .map(([clientId, msgs]) => {
            const sorted = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const client = clientMap.get(clientId);
            if (!client) return null;
            return { client, messages: sorted, lastMessage: sorted[0], unread: sorted.filter(m => !m.read && m.sender_type === "client").length };
          })
          .filter(Boolean) as Conversation[];
        convs.sort((a, b) => {
          if (a.unread > 0 && b.unread === 0) return -1;
          if (b.unread > 0 && a.unread === 0) return 1;
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });
        setConversations(convs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentModel, authHeaders]);

  useEffect(() => { fetchMessages(); const iv = setInterval(fetchMessages, 5000); return () => clearInterval(iv); }, [fetchMessages]);

  // ── Feed logic ──
  const fetchPosts = useCallback(() => {
    const model = currentModel || "yumi";
    setFeedLoading(true);
    fetch(`/api/posts?model=${model}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setFeedLoading(false));
  }, [currentModel, authHeaders]);

  useEffect(() => { if (subTab === "feed") fetchPosts(); }, [subTab, fetchPosts]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || posting) return;
    setPosting(true);
    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: currentModel || "yumi",
          content: newPostContent.trim(),
          tier_required: newPostTier,
        }),
      });
      setNewPostContent("");
      setNewPostTier("public");
      setComposing(false);
      fetchPosts();
    } catch { /* */ }
    setPosting(false);
  };

  const handleTogglePin = async (postId: string) => {
    await fetch("/api/posts", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ id: postId, action: "pin" }),
    });
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    await fetch(`/api/posts?id=${postId}`, { method: "DELETE", headers: authHeaders() });
    fetchPosts();
  };

  const selectedConv = conversations.find(c => c.client.id === selectedClient);

  const handleSend = async () => {
    if (!reply.trim() || !selectedClient || !selectedConv) return;
    await fetch("/api/messages", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ model: selectedConv.client.model, client_id: selectedClient, sender_type: "model", content: reply.trim() }),
    });
    setReply(""); fetchMessages();
  };

  const handleDelete = async (msgId: string) => {
    await fetch(`/api/messages?id=${msgId}`, { method: "DELETE", headers: authHeaders() });
    fetchMessages();
  };

  const clientName = (c: Client) => c.pseudo_snap || c.pseudo_insta || "Anonyme";
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);
  const filteredConvs = conversations.filter(c => clientName(c.client).toLowerCase().includes(search.toLowerCase()));

  const pinnedPosts = useMemo(() => posts.filter(p => p.pinned), [posts]);
  const regularPosts = useMemo(() => posts.filter(p => !p.pinned), [posts]);

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return "maintenant";
    if (s < 3600) return `${Math.floor(s / 60)}min`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}j`;
    return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  function renderPost(post: Post) {
    const modelName = (currentModel || "yumi").toUpperCase();
    return (
      <div key={post.id} className="group relative" style={{ borderBottom: "1px solid var(--border2)" }}>
        <div className="px-4 py-3.5">
          {/* Pinned badge */}
          {post.pinned && (
            <div className="flex items-center gap-1.5 mb-2 ml-10">
              <Pin className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Post epingle</span>
            </div>
          )}

          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
              style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
              {modelName.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{modelName}</span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>@{(currentModel || "yumi").toLowerCase()}</span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>·</span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{timeAgo(post.created_at)}</span>
                {post.tier_required !== "public" && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                    style={{ background: `${TIER_COLORS[post.tier_required] || "#64748B"}18`, color: TIER_COLORS[post.tier_required] || "#64748B" }}>
                    {post.tier_required}
                  </span>
                )}
              </div>

              {/* Content */}
              {post.content && (
                <p className="text-[13px] mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                  {post.content}
                </p>
              )}

              {/* Media */}
              {post.media_url && (
                <div className="mt-2.5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border2)" }}>
                  {post.media_type === "video" ? (
                    <video src={post.media_url} controls className="w-full max-h-[400px] object-cover" />
                  ) : (
                    <img src={post.media_url} alt="" className="w-full max-h-[400px] object-cover" loading="lazy" />
                  )}
                </div>
              )}

              {/* Actions bar */}
              <div className="flex items-center gap-8 mt-2.5">
                <div className="flex items-center gap-1.5 cursor-default">
                  <MessageCircle className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{post.comments_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 cursor-default">
                  <Heart className="w-4 h-4" style={{ color: post.likes_count > 0 ? "#F43F5E" : "var(--text-muted)" }}
                    fill={post.likes_count > 0 ? "#F43F5E" : "none"} />
                  <span className="text-[12px]" style={{ color: post.likes_count > 0 ? "#F43F5E" : "var(--text-muted)" }}>{post.likes_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Admin actions (visible on hover) */}
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => handleTogglePin(post.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                style={{ background: post.pinned ? "rgba(230,51,41,0.1)" : "rgba(255,255,255,0.04)" }}
                title={post.pinned ? "Desepingler" : "Epingler"}>
                {post.pinned ? <PinOff className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> : <Pin className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />}
              </button>
              <button onClick={() => handleDeletePost(post.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                style={{ background: "rgba(239,68,68,0.06)" }}
                title="Supprimer">
                <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Header */}
          <div className="flex items-center gap-3 fade-up">
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <MessageSquare className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Messages</h1>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                {totalUnread > 0 && <span style={{ color: "var(--danger)" }}> · {totalUnread} non lu{totalUnread > 1 ? "s" : ""}</span>}
              </p>
            </div>
          </div>

          {/* Sub-tabs: Messages | Feed */}
          <div className="segmented-control fade-up-1">
            <button onClick={() => setSubTab("messages")} className={subTab === "messages" ? "active" : ""}>
              Messages
              {totalUnread > 0 && (
                <span className="ml-1.5 w-4 h-4 inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: "var(--danger)", color: "#fff" }}>{totalUnread}</span>
              )}
            </button>
            <button onClick={() => setSubTab("feed")} className={subTab === "feed" ? "active" : ""}>
              Feed
              {posts.length > 0 && (
                <span className="ml-1.5 px-1.5 h-4 inline-flex items-center justify-center rounded-full text-[10px] font-medium"
                  style={{ background: "rgba(230,51,41,0.12)", color: "var(--accent)" }}>{posts.length}</span>
              )}
            </button>
          </div>

          {/* ═══ MESSAGES TAB ═══ */}
          {subTab === "messages" && (
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 fade-up-2" style={{ minHeight: "calc(100vh - 240px)" }}>
              {/* Conversation list */}
              <div className={`card-premium overflow-hidden flex flex-col ${selectedClient ? "hidden md:flex" : "flex"}`}>
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Rechercher..." className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
                    </div>
                  ) : filteredConvs.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucune conversation</p>
                    </div>
                  ) : filteredConvs.map(conv => (
                    <button key={conv.client.id} onClick={() => setSelectedClient(conv.client.id)}
                      className="w-full px-4 py-3 flex items-start gap-3 transition-all text-left cursor-pointer hover:bg-white/[0.02]"
                      style={{ background: selectedClient === conv.client.id ? "rgba(230,51,41,0.06)" : "transparent", borderBottom: "1px solid var(--border2)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: conv.client.is_verified ? "rgba(16,185,129,0.12)" : "rgba(230,51,41,0.12)", color: conv.client.is_verified ? "var(--success)" : "var(--accent)" }}>
                        {clientName(conv.client).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{clientName(conv.client)}</span>
                          {conv.unread > 0 && (
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: "var(--danger)", color: "#fff" }}>{conv.unread}</span>
                          )}
                        </div>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{conv.lastMessage.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {new Date(conv.lastMessage.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {conv.client.total_spent > 0 && (
                            <span className="text-[10px] px-1 rounded" style={{ background: "rgba(230,51,41,0.1)", color: "var(--accent)" }}>
                              {Number(conv.client.total_spent).toFixed(0)}€
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat area */}
              <div className={`card-premium overflow-hidden flex flex-col ${!selectedClient ? "hidden md:flex" : "flex"}`}>
                {!selectedConv ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Selectionnez une conversation</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border2)" }}>
                      <button onClick={() => setSelectedClient(null)} className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        <ArrowLeft className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                      </button>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "rgba(230,51,41,0.12)", color: "var(--accent)" }}>
                        {clientName(selectedConv.client).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{clientName(selectedConv.client)}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {selectedConv.client.model.toUpperCase()} · {selectedConv.client.is_verified ? "Verifie" : "Non verifie"}
                        </p>
                      </div>
                      {selectedConv.client.is_blocked && <Ban className="w-4 h-4" style={{ color: "var(--danger)" }} />}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(100vh - 350px)" }}>
                      {[...selectedConv.messages].reverse().map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_type === "model" ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-xs relative group"
                            style={{ background: msg.sender_type === "model" ? "rgba(230,51,41,0.12)" : "var(--bg3)", color: "var(--text)" }}>
                            <p>{msg.content}</p>
                            <p className="text-[10px] mt-1 opacity-50">
                              {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {msg.sender_type === "model" && (
                              <button onClick={() => handleDelete(msg.id)}
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full items-center justify-center hidden group-hover:flex cursor-pointer"
                                style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}>
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3" style={{ borderTop: "1px solid var(--border2)" }}>
                      <div className="flex items-center gap-2">
                        <input value={reply} onChange={e => setReply(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                          placeholder="Ecrire un message..."
                          className="flex-1 px-3.5 py-2.5 rounded-xl text-xs outline-none"
                          style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
                        <button onClick={handleSend} disabled={!reply.trim()}
                          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer btn-gradient disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═══ FEED TAB ═══ */}
          {subTab === "feed" && (
            <div className="fade-up-2">
              {/* Compose area */}
              <div className="card-premium overflow-hidden mb-4">
                {!composing ? (
                  <button onClick={() => setComposing(true)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 cursor-pointer text-left hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: "1px solid var(--border2)" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                      style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                      {(currentModel || "Y").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>Publier dans le feed...</span>
                  </button>
                ) : (
                  <div className="p-4">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                        style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff" }}>
                        {(currentModel || "Y").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newPostContent}
                          onChange={e => setNewPostContent(e.target.value)}
                          placeholder="Quoi de neuf ?"
                          rows={3}
                          className="w-full text-[13px] leading-relaxed outline-none resize-none"
                          style={{ background: "transparent", color: "var(--text)" }}
                          autoFocus
                        />
                        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border2)" }}>
                          <div className="flex items-center gap-2">
                            {/* Tier selector */}
                            <select value={newPostTier} onChange={e => setNewPostTier(e.target.value)}
                              className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
                              style={{ background: "var(--bg3)", color: TIER_COLORS[newPostTier] || "var(--text)", border: "1px solid var(--border2)" }}>
                              <option value="public">Public</option>
                              <option value="vip">VIP</option>
                              <option value="gold">Gold</option>
                              <option value="diamond">Diamond</option>
                              <option value="platinum">Platinum</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setComposing(false); setNewPostContent(""); }}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ color: "var(--text-muted)" }}>
                              Annuler
                            </button>
                            <button onClick={handleCreatePost}
                              disabled={!newPostContent.trim() || posting}
                              className="px-4 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform"
                              style={{ background: "var(--accent)", color: "#fff" }}>
                              {posting ? "..." : "Publier"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Feed */}
              {feedLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Aucun post</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Publiez votre premier post dans le feed</p>
                </div>
              ) : (
                <div className="card-premium overflow-hidden">
                  {pinnedPosts.map(renderPost)}
                  {regularPosts.map(renderPost)}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </OsLayout>
  );
}

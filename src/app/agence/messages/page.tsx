"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { MessageSquare, Send, Trash2, Ban, Search, ArrowLeft, Star, ThumbsUp, ThumbsDown } from "lucide-react";

// ── Types ──
interface Message {
  id: string; model: string; client_id: string; sender_type: "client" | "model";
  content: string; read: boolean; created_at: string;
}
interface Client {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; is_verified: boolean; is_blocked: boolean; total_spent: number;
}
interface Conversation {
  client: Client; messages: Message[]; lastMessage: Message; unread: number;
}
interface Review {
  id: string; tier: string; author: string; content: string;
  rating: number; validated: boolean; createdAt: string; bonusGranted: boolean;
}

const TIER_COLORS: Record<string, string> = {
  vip: "#F43F5E", gold: "#F59E0B", diamond: "#6366F1", platinum: "#A78BFA",
};
const REVIEWS_KEY = "heaven_yumi_reviews";
function loadReviews(): Review[] { try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); } catch { return []; } }
function saveReviews(reviews: Review[]) { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); }

export default function MessagesPage() {
  const { currentModel, authHeaders } = useModel();
  const [subTab, setSubTab] = useState<"messages" | "reviews">("messages");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Load reviews
  useEffect(() => { setReviews(loadReviews()); }, []);

  const pendingReviews = useMemo(() => reviews.filter(r => !r.validated), [reviews]);
  const validatedReviews = useMemo(() => reviews.filter(r => r.validated), [reviews]);

  const handleValidateReview = useCallback((id: string) => {
    const u = reviews.map(r => r.id === id ? { ...r, validated: true } : r);
    setReviews(u); saveReviews(u);
  }, [reviews]);
  const handleRejectReview = useCallback((id: string) => {
    const u = reviews.filter(r => r.id !== id); setReviews(u); saveReviews(u);
  }, [reviews]);

  const fetchMessages = useCallback(() => {
    const model = currentModel || "";
    const params = model ? `?model=${model}` : "";
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

          {/* Sub-tabs: Messages | Reviews */}
          <div className="segmented-control fade-up-1">
            <button onClick={() => setSubTab("messages")} className={subTab === "messages" ? "active" : ""}>
              Messages
              {totalUnread > 0 && (
                <span className="ml-1.5 w-4 h-4 inline-flex items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: "var(--danger)", color: "#fff" }}>{totalUnread}</span>
              )}
            </button>
            <button onClick={() => setSubTab("reviews")} className={subTab === "reviews" ? "active" : ""}>
              Avis
              {pendingReviews.length > 0 && (
                <span className="ml-1.5 w-4 h-4 inline-flex items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: "var(--warning)", color: "#fff" }}>{pendingReviews.length}</span>
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
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(99,102,241,0.2)", borderTopColor: "var(--accent)" }} />
                    </div>
                  ) : filteredConvs.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucune conversation</p>
                    </div>
                  ) : filteredConvs.map(conv => (
                    <button key={conv.client.id} onClick={() => setSelectedClient(conv.client.id)}
                      className="w-full px-4 py-3 flex items-start gap-3 transition-all text-left cursor-pointer hover:bg-white/[0.02]"
                      style={{ background: selectedClient === conv.client.id ? "rgba(99,102,241,0.06)" : "transparent", borderBottom: "1px solid var(--border2)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: conv.client.is_verified ? "rgba(16,185,129,0.12)" : "rgba(99,102,241,0.12)", color: conv.client.is_verified ? "var(--success)" : "var(--accent)" }}>
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
                          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                            {new Date(conv.lastMessage.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {conv.client.total_spent > 0 && (
                            <span className="text-[9px] px-1 rounded" style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>
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
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sélectionnez une conversation</p>
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
                        style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent)" }}>
                        {clientName(selectedConv.client).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{clientName(selectedConv.client)}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {selectedConv.client.model.toUpperCase()} · {selectedConv.client.is_verified ? "Vérifié" : "Non vérifié"}
                        </p>
                      </div>
                      {selectedConv.client.is_blocked && <Ban className="w-4 h-4" style={{ color: "var(--danger)" }} />}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(100vh - 350px)" }}>
                      {[...selectedConv.messages].reverse().map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_type === "model" ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-xs relative group"
                            style={{ background: msg.sender_type === "model" ? "rgba(99,102,241,0.12)" : "var(--bg3)", color: "var(--text)" }}>
                            <p>{msg.content}</p>
                            <p className="text-[9px] mt-1 opacity-50">
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
                          placeholder="Écrire un message..."
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

          {/* ═══ REVIEWS TAB ═══ */}
          {subTab === "reviews" && (
            <div className="space-y-3 fade-up-2">
              {pendingReviews.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>En attente</h3>
                  {pendingReviews.map(r => (
                    <div key={r.id} className="card-premium p-4 mb-2 gradient-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{r.author}</span>
                          <span className="badge" style={{ background: `${TIER_COLORS[r.tier] || "#64748B"}15`, color: TIER_COLORS[r.tier] || "#64748B" }}>{r.tier}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3" style={{ color: i < r.rating ? "#F59E0B" : "var(--border)" }} fill={i < r.rating ? "#F59E0B" : "none"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{r.content}</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleValidateReview(r.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                          style={{ background: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                          <ThumbsUp className="w-3 h-3" /> Approuver
                        </button>
                        <button onClick={() => handleRejectReview(r.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                          style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                          <ThumbsDown className="w-3 h-3" /> Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {validatedReviews.length === 0 && pendingReviews.length === 0 ? (
                <div className="text-center py-16">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Aucun avis</p>
                </div>
              ) : (
                validatedReviews.map(r => (
                  <div key={r.id} className="card-premium p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{r.author}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3" style={{ color: i < r.rating ? "#F59E0B" : "var(--border)" }} fill={i < r.rating ? "#F59E0B" : "none"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </OsLayout>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import { Send, Trash2, Search, ArrowLeft } from "lucide-react";
import type { Message } from "@/types/heaven";

interface Client {
  id: string; pseudo_snap: string | null; pseudo_insta: string | null;
  model: string; is_verified: boolean; is_blocked: boolean;
}
interface Conversation {
  client: Client; messages: Message[]; lastMessage: Message; unread: number;
}

export default function MessagesPage() {
  const { currentModel, authHeaders } = useModel();
  const model = currentModel || "yumi";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(() => {
    Promise.all([
      fetch(`/api/messages?model=${model}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/clients?model=${model}`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([msgData, clientData]) => {
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
        }).filter(Boolean) as Conversation[];
      convs.sort((a, b) => {
        if (a.unread > 0 && b.unread === 0) return -1;
        if (b.unread > 0 && a.unread === 0) return 1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });
      setConversations(convs);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [model, authHeaders]);

  useEffect(() => { fetchMessages(); const iv = setInterval(fetchMessages, 8000); return () => clearInterval(iv); }, [fetchMessages]);

  // Mark as read when opening a conversation
  const openConversation = useCallback(async (clientId: string) => {
    setSelectedClient(clientId);
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ model, client_id: clientId, action: "mark_read" }),
      });
      setConversations(prev => prev.map(c =>
        c.client.id === clientId ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) } : c
      ));
    } catch {}
  }, [model, authHeaders]);

  const sendReply = useCallback(async () => {
    if (!reply.trim() || !selectedClient) return;
    await fetch("/api/messages", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ model, client_id: selectedClient, content: reply.trim(), sender_type: "model" }),
    });
    setReply("");
    fetchMessages();
  }, [reply, selectedClient, model, authHeaders, fetchMessages]);

  const deleteMessage = useCallback(async (msgId: string) => {
    await fetch(`/api/messages?id=${msgId}`, { method: "DELETE", headers: authHeaders() });
    fetchMessages();
  }, [authHeaders, fetchMessages]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);
  const selectedConvo = conversations.find(c => c.client.id === selectedClient);
  const clientName = (c: Client) => c.pseudo_snap || c.pseudo_insta || c.id.slice(0, 8);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => clientName(c.client).toLowerCase().includes(q));
  }, [conversations, search]);

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <a href="/agence" className="p-2 rounded-lg no-underline hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-4 h-4" />
            </a>
            <h1 className="text-base font-bold flex-1" style={{ color: "var(--text)" }}>
              Messages
              {totalUnread > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E" }}>
                  {totalUnread}
                </span>
              )}
            </h1>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs outline-none"
              style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }} />
          </div>

          {/* Conversation detail */}
          {selectedConvo ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setSelectedClient(null)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-muted)" }}>
                  {clientName(selectedConvo.client).charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>@{clientName(selectedConvo.client)}</span>
              </div>
              {/* Messages */}
              <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {[...selectedConvo.messages].reverse().map(m => (
                  <div key={m.id} className={`flex ${m.sender_type === "model" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%] px-3 py-2 rounded-2xl text-xs group relative"
                      style={{
                        background: m.sender_type === "model" ? "var(--accent)" : "var(--bg)",
                        color: m.sender_type === "model" ? "#fff" : "var(--text)",
                      }}>
                      {m.content}
                      <button onClick={() => deleteMessage(m.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                        style={{ background: "var(--danger)", border: "none" }}>
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Reply */}
              <div className="flex gap-2 p-3" style={{ borderTop: "1px solid var(--border)" }}>
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Repondre..."
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                  onKeyDown={e => { if (e.key === "Enter") sendReply(); }} />
                <button onClick={sendReply} disabled={!reply.trim()}
                  className="px-3 py-2 rounded-xl cursor-pointer disabled:opacity-30" style={{ background: "var(--accent)", border: "none" }}>
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          ) : (
            /* Conversation list */
            <div className="space-y-2">
              {loading && <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Chargement...</p>}
              {!loading && filtered.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>Pas de messages</p>
              )}
              {filtered.map(convo => (
                <button key={convo.client.id} onClick={() => openConversation(convo.client.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ background: "var(--surface)", border: `1px solid ${convo.unread > 0 ? "var(--accent)" : "var(--border)"}` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: convo.unread > 0 ? "rgba(230,51,41,0.1)" : "rgba(0,0,0,0.06)", color: convo.unread > 0 ? "var(--accent)" : "var(--text-muted)" }}>
                    {clientName(convo.client).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: "var(--text)" }}>@{clientName(convo.client)}</span>
                      {convo.unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
                          {convo.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: convo.unread > 0 ? "var(--text)" : "var(--text-muted)" }}>
                      {convo.lastMessage.sender_type === "model" ? "Toi: " : ""}{convo.lastMessage.content}
                    </p>
                  </div>
                  <span className="text-[9px] shrink-0" style={{ color: "var(--text-muted)" }}>
                    {new Date(convo.lastMessage.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </OsLayout>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useModel } from "@/lib/model-context";
import { MessageSquare, Send, Trash2, Ban, Search } from "lucide-react";

interface Message {
  id: string;
  model: string;
  client_id: string;
  sender_type: "client" | "model";
  content: string;
  read: boolean;
  created_at: string;
}

interface Client {
  id: string;
  pseudo_snap: string | null;
  pseudo_insta: string | null;
  model: string;
  is_verified: boolean;
  is_blocked: boolean;
  total_spent: number;
}

interface Conversation {
  client: Client;
  messages: Message[];
  lastMessage: Message;
  unread: number;
}

export default function MessagesPage() {
  const { currentModel, authHeaders } = useModel();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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

        // Group messages by client
        const grouped: Record<string, Message[]> = {};
        messages.forEach(m => {
          if (!grouped[m.client_id]) grouped[m.client_id] = [];
          grouped[m.client_id].push(m);
        });

        const convs: Conversation[] = Object.entries(grouped)
          .map(([clientId, msgs]) => {
            const sorted = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const client = clientMap.get(clientId);
            if (!client) return null;
            return {
              client,
              messages: sorted,
              lastMessage: sorted[0],
              unread: sorted.filter(m => !m.read && m.sender_type === "client").length,
            };
          })
          .filter(Boolean) as Conversation[];

        // Sort: unread first, then by priority (paid verified > paid > free), then by date
        convs.sort((a, b) => {
          if (a.unread > 0 && b.unread === 0) return -1;
          if (b.unread > 0 && a.unread === 0) return 1;
          const aPriority = (a.client.is_verified ? 2 : 0) + (a.client.total_spent > 0 ? 1 : 0);
          const bPriority = (b.client.is_verified ? 2 : 0) + (b.client.total_spent > 0 ? 1 : 0);
          if (aPriority !== bPriority) return bPriority - aPriority;
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

        setConversations(convs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentModel, authHeaders]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const selectedConv = conversations.find(c => c.client.id === selectedClient);

  const handleSend = async () => {
    if (!reply.trim() || !selectedClient || !selectedConv) return;

    await fetch("/api/messages", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: selectedConv.client.model,
        client_id: selectedClient,
        sender_type: "model",
        content: reply.trim(),
      }),
    });

    setReply("");
    fetchMessages();
  };

  const handleDelete = async (msgId: string) => {
    await fetch(`/api/messages?id=${msgId}`, { method: "DELETE", headers: authHeaders() });
    fetchMessages();
  };

  const clientName = (c: Client) => c.pseudo_snap || c.pseudo_insta || "Anonyme";

  const filteredConvs = conversations.filter(c => {
    const q = search.toLowerCase();
    return clientName(c.client).toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen md:ml-[60px] flex flex-col md:flex-row" style={{ background: "var(--sq-bg)" }}>
      {/* Conversation list */}
      <div className="w-full md:w-80 md:border-r flex-shrink-0 flex flex-col" style={{ borderColor: "var(--sq-border2)" }}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5" style={{ color: "#A882FF" }} />
            <h1 className="text-lg font-bold" style={{ color: "var(--sq-text)" }}>Messages</h1>
            {conversations.reduce((s, c) => s + c.unread, 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#E84393", color: "#fff" }}>
                {conversations.reduce((s, c) => s + c.unread, 0)}
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--sq-text-muted)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--sq-bg2)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(168,130,255,0.2)", borderTopColor: "#A882FF" }} />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--sq-text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--sq-text-muted)" }}>Aucune conversation</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <button
                key={conv.client.id}
                onClick={() => setSelectedClient(conv.client.id)}
                className="w-full px-4 py-3 flex items-start gap-3 transition-colors text-left cursor-pointer"
                style={{
                  background: selectedClient === conv.client.id ? "var(--sq-bg2)" : "transparent",
                  borderBottom: "1px solid var(--sq-border2)",
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: conv.client.is_verified ? "rgba(0,214,143,0.15)" : "rgba(168,130,255,0.15)", color: conv.client.is_verified ? "#00D68F" : "#A882FF" }}>
                  {clientName(conv.client).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--sq-text)" }}>
                      {clientName(conv.client)}
                    </span>
                    {conv.unread > 0 && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "#E84393", color: "#fff" }}>
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--sq-text-muted)" }}>
                    {conv.lastMessage.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px]" style={{ color: "var(--sq-text-muted)" }}>
                      {new Date(conv.lastMessage.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {conv.client.total_spent > 0 && (
                      <span className="text-[9px] px-1 rounded" style={{ background: "rgba(232,67,147,0.1)", color: "#E84393" }}>
                        {Number(conv.client.total_spent).toFixed(0)}€
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--sq-text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--sq-text-muted)" }}>Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--sq-border2)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(168,130,255,0.15)", color: "#A882FF" }}>
                  {clientName(selectedConv.client).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--sq-text)" }}>{clientName(selectedConv.client)}</p>
                  <p className="text-[10px]" style={{ color: "var(--sq-text-muted)" }}>
                    {selectedConv.client.model.toUpperCase()} · {selectedConv.client.is_verified ? "Vérifié" : "Non vérifié"}
                  </p>
                </div>
              </div>
              {selectedConv.client.is_blocked && (
                <Ban className="w-4 h-4" style={{ color: "#EF4444" }} />
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[...selectedConv.messages].reverse().map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === "model" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[75%] rounded-2xl px-4 py-2.5 text-xs relative group"
                    style={{
                      background: msg.sender_type === "model" ? "rgba(232,67,147,0.15)" : "var(--sq-bg2)",
                      color: "var(--sq-text)",
                    }}
                  >
                    <p>{msg.content}</p>
                    <p className="text-[9px] mt-1 opacity-50">
                      {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {msg.sender_type === "model" && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full items-center justify-center hidden group-hover:flex cursor-pointer"
                        style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply input */}
            <div className="p-4" style={{ borderTop: "1px solid var(--sq-border2)" }}>
              <div className="flex items-center gap-2">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Écrire un message..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs outline-none"
                  style={{ background: "var(--sq-bg2)", color: "var(--sq-text)", border: "1px solid var(--sq-border2)" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #E84393, #D63384)", color: "#fff" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

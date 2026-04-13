"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowLeft, MessageCircle } from "lucide-react";
import { ModeToggle } from "./ig-mode-toggle";

type Mode = "agent" | "human";

interface IgMessage {
  id: string;
  sender: "user" | "agent" | "human";
  content: string;
  created_at: string;
}

interface ChatViewProps {
  conversationId: string | null;
  username?: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onBack?: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatView({
  conversationId,
  username,
  mode,
  onModeChange,
  onBack,
}: ChatViewProps) {
  const [messages, setMessages] = useState<IgMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    fetch(`/api/instagram/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversationId) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add
    const optimistic: IgMessage = {
      id: `temp-${Date.now()}`,
      sender: mode === "agent" ? "agent" : "human",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await fetch("/api/instagram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          content,
          sender: mode,
        }),
      });
    } catch {
      // Keep optimistic message visible even on error
    } finally {
      setSending(false);
    }
  }, [input, conversationId, mode]);

  // Empty state
  if (!conversationId) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center h-full"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--bg3)" }}
        >
          <MessageCircle className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Aucune conversation ouverte
        </p>
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
          Selectionnez une conversation pour commencer
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 rounded-lg cursor-pointer border-none"
              style={{ background: "var(--bg2)", color: "var(--text)" }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              @{username || "utilisateur"}
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {mode === "agent" ? "Mode Agent IA" : "Mode Humain"}
            </p>
          </div>
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} size="sm" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--border2)",
                borderTopColor: "#8B5CF6",
              }}
            />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <p
            className="text-center text-xs py-8"
            style={{ color: "var(--text-muted)" }}
          >
            Aucun message pour le moment
          </p>
        )}
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isAgent = msg.sender === "agent";
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-start" : "justify-end"}`}
            >
              <div
                className="max-w-[75%] px-3.5 py-2.5 rounded-2xl"
                style={{
                  background: isUser
                    ? "var(--bg3)"
                    : isAgent
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(34,197,94,0.15)",
                  borderBottomLeftRadius: isUser ? "4px" : undefined,
                  borderBottomRightRadius: !isUser ? "4px" : undefined,
                }}
              >
                <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                  {msg.content}
                </p>
                <p
                  className="text-[9px] mt-1 text-right tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3"
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ecrire un message..."
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: "var(--text)" }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2 rounded-lg cursor-pointer border-none transition-all duration-200"
            style={{
              background: input.trim() ? "#8B5CF6" : "var(--bg3)",
              color: input.trim() ? "#FFFFFF" : "var(--text-muted)",
              opacity: sending ? 0.5 : 1,
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

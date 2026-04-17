"use client";

import { MessageCircle, Send, X } from "lucide-react";
import type { ModelInfo } from "@/types/heaven";

interface ChatMessage {
  id: string;
  client_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

interface ChatPanelProps {
  open: boolean;
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  modelName: string;
  modelAvatar: string | null;
  modelOnline: boolean;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ChatPanel({ open, messages, input, onInputChange, onSend, onClose, chatEndRef, modelName, modelAvatar, modelOnline }: ChatPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50 rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        maxHeight: "min(500px, 70vh)",
        animation: "slideUp 0.3s ease-out",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
      }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border2)", background: "var(--bg2)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--rose), var(--accent))", color: "#fff" }}>
          {modelAvatar ? (
            <img src={modelAvatar} alt="" className="w-full h-full object-cover" />
          ) : modelName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{modelName}</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{
              background: modelOnline ? "var(--success)" : "var(--text-muted)",
              boxShadow: modelOnline ? "0 0 4px rgba(16,185,129,0.5)" : "none",
            }} />
            <span className="text-[10px]" style={{ color: modelOnline ? "var(--success)" : "var(--text-muted)" }}>
              {modelOnline ? "En ligne" : "Hors ligne"}
            </span>
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto p-3 space-y-2" style={{ height: "min(320px, 45vh)" }}>
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Envoie un message a {modelName}</p>
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[80%] rounded-2xl px-3 py-2 text-[12px]"
              style={{
                background: msg.sender_type === "client" ? "rgba(230,51,41,0.15)" : "var(--bg3)",
                color: "var(--text)",
              }}>
              {msg.content}
              <p className="text-[10px] mt-0.5 opacity-40">{timeAgo(msg.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex gap-2 shrink-0" style={{ borderTop: "1px solid var(--border2)" }}>
        <input value={input} onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSend()}
          placeholder="Message..." className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }} />
        <button onClick={onSend}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer btn-gradient shrink-0">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

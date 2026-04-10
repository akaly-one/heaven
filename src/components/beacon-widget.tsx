"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Minimize2, Send, Sparkles } from "lucide-react";

// ── Types ──
interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Constants ──
const OS_API =
  process.env.NEXT_PUBLIC_SQWENSY_URL || "https://sqwensy.com";

const COLORS = {
  bg: "#0f0f1a",
  surface: "#1a1a2e",
  surfaceHover: "#22223a",
  accent: "#c9a84c",
  accentDim: "rgba(201,168,76,0.15)",
  text: "#e8e8f0",
  textMuted: "#8888a0",
  userBubble: "#c9a84c",
  userBubbleText: "#0f0f1a",
  assistantBubble: "#2a2a3e",
  border: "rgba(201,168,76,0.12)",
} as const;

const GREETING = "Bienvenue sur Heaven \u2728 Comment puis-je vous aider ?";

const QUICK_ACTIONS = [
  { label: "D\u00e9couvrir les profils", emoji: "\ud83d\udc40" },
  { label: "Packs & Prix", emoji: "\ud83d\udcb0" },
  { label: "J\u2019ai un code d\u2019acc\u00e8s", emoji: "\ud83d\udd11" },
];

// ── Typing dots animation ──
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: COLORS.accent,
            opacity: 0.5,
            animation: `beaconDot 1.2s ${i * 0.2}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main widget ──
export default function BeaconWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Sound setup ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZaXl5OSjoqGgoB/f4GDhoqOk5eZm5qXk46JhIB8eXl7f4SKj5SYm5yampeSjYiDfnp4eHt/hIqPk5ibnJuZlpGMh4J9eXd3"
      );
    }
  }, []);

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Focus input when opened ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ── Detect contact info in assistant messages ──
  const detectContactRequest = useCallback(
    (text: string) => {
      const lower = text.toLowerCase();
      if (
        (lower.includes("nom") || lower.includes("pr\u00e9nom")) &&
        !visitorName
      ) {
        return "name";
      }
      if (
        (lower.includes("email") || lower.includes("mail") || lower.includes("adresse")) &&
        !visitorEmail
      ) {
        return "email";
      }
      return null;
    },
    [visitorName, visitorEmail]
  );

  // ── Play notification sound ──
  const playChime = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // ── Send message ──
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setShowQuickActions(false);
      setLoading(true);

      // Detect if user is providing contact info
      const lastAssistant = messages.findLast((m) => m.role === "assistant");
      if (lastAssistant) {
        const field = detectContactRequest(lastAssistant.content);
        if (field === "name" && !visitorName) {
          setVisitorName(text.trim());
        } else if (field === "email" && text.includes("@")) {
          setVisitorEmail(text.trim());
        }
      }

      try {
        const res = await fetch(`${OS_API}/api/beacon/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cpId: "heaven",
            sessionId,
            message: text.trim(),
            visitorName: visitorName || undefined,
            visitorEmail: visitorEmail || undefined,
          }),
        });

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        setSessionId(data.sessionId);

        const assistantMsg: Message = {
          role: "assistant",
          content: data.response,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        playChime();

        // Submit lead if phase indicates qualification
        if (
          data.phase === "qualified" &&
          visitorName &&
          visitorEmail
        ) {
          fetch(`${OS_API}/api/beacon/lead`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cpId: "heaven",
              sessionId: data.sessionId,
              name: visitorName,
              email: visitorEmail,
            }),
          }).catch(() => {});
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "D\u00e9sol\u00e9, je rencontre un probl\u00e8me technique. R\u00e9essayez dans un instant.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      sessionId,
      messages,
      visitorName,
      visitorEmail,
      detectContactRequest,
      playChime,
    ]
  );

  // ── Handle form submit ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // ── Handle quick action ──
  const handleQuickAction = (label: string) => {
    sendMessage(label);
  };

  return (
    <>
      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes beaconPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(201,168,76,0); }
        }
        @keyframes beaconDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes beaconSlideUp {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes beaconGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed z-[9999] flex flex-col"
          style={{
            bottom: "24px",
            right: "24px",
            width: "min(400px, calc(100vw - 32px))",
            height: "min(600px, calc(100vh - 100px))",
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "20px",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.5), 0 0 40px rgba(201,168,76,0.08)",
            animation: "beaconSlideUp 0.3s ease-out",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{
              background: COLORS.surface,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.accent}, #e8d48b)`,
                }}
              >
                \ud83d\udc51
              </div>
              <div>
                <p
                  className="text-sm font-bold tracking-wide"
                  style={{ color: COLORS.text }}
                >
                  Heaven
                </p>
                <p
                  className="text-[10px] font-medium"
                  style={{ color: COLORS.accent }}
                >
                  Assistant BEACON
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                style={{
                  background: soundEnabled ? COLORS.accentDim : "transparent",
                  border: `1px solid ${COLORS.border}`,
                }}
                title={soundEnabled ? "Son activ\u00e9" : "Son d\u00e9sactiv\u00e9"}
              >
                <span className="text-xs">{soundEnabled ? "\ud83d\udd14" : "\ud83d\udd15"}</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                style={{
                  background: "transparent",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Minimize2 className="w-3.5 h-3.5" style={{ color: COLORS.textMuted }} />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setMessages([]);
                  setSessionId(null);
                  setShowQuickActions(true);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                style={{
                  background: "transparent",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <X className="w-3.5 h-3.5" style={{ color: COLORS.textMuted }} />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: `${COLORS.surface} transparent` }}>
            {/* Initial greeting */}
            <div className="flex gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                \ud83d\udc51
              </div>
              <div
                className="px-4 py-2.5 rounded-2xl rounded-tl-md text-sm leading-relaxed max-w-[85%]"
                style={{ background: COLORS.assistantBubble, color: COLORS.text }}
              >
                {GREETING}
              </div>
            </div>

            {/* Quick actions */}
            {showQuickActions && messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pl-10">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.label)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all hover:scale-[1.03] active:scale-95"
                    style={{
                      background: COLORS.accentDim,
                      color: COLORS.accent,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {action.emoji} {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  >
                    \ud83d\udc51
                  </div>
                )}
                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed max-w-[85%] ${
                    msg.role === "user"
                      ? "rounded-2xl rounded-tr-md"
                      : "rounded-2xl rounded-tl-md"
                  }`}
                  style={{
                    background:
                      msg.role === "user"
                        ? COLORS.userBubble
                        : COLORS.assistantBubble,
                    color:
                      msg.role === "user"
                        ? COLORS.userBubbleText
                        : COLORS.text,
                    fontWeight: msg.role === "user" ? 500 : 400,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                >
                  \ud83d\udc51
                </div>
                <div
                  className="rounded-2xl rounded-tl-md"
                  style={{ background: COLORS.assistantBubble }}
                >
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-4 py-3 shrink-0"
            style={{
              background: COLORS.surface,
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre message..."
              disabled={loading}
              className="flex-1 text-sm outline-none bg-transparent placeholder:opacity-40"
              style={{
                color: COLORS.text,
                padding: "10px 14px",
                borderRadius: "12px",
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{
                background: input.trim()
                  ? `linear-gradient(135deg, ${COLORS.accent}, #e8d48b)`
                  : COLORS.surfaceHover,
                border: "none",
              }}
            >
              <Send
                className="w-4 h-4"
                style={{
                  color: input.trim() ? COLORS.bg : COLORS.textMuted,
                }}
              />
            </button>
          </form>

          {/* Footer */}
          <div
            className="px-4 py-1.5 text-center shrink-0"
            style={{
              background: COLORS.bg,
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <span
              className="text-[9px] font-medium tracking-wide"
              style={{ color: COLORS.textMuted, opacity: 0.5 }}
            >
              Powered by BEACON
            </span>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setHasNewMessage(false);
          }}
          className="fixed z-[9998] w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
          style={{
            bottom: "24px",
            right: "24px",
            background: `linear-gradient(135deg, ${COLORS.surface}, ${COLORS.bg})`,
            backgroundSize: "200% 200%",
            animation: "beaconPulse 2.5s ease-in-out infinite, beaconGradient 4s ease infinite",
            border: `2px solid ${COLORS.accent}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(201,168,76,0.15)`,
          }}
        >
          <Sparkles className="w-6 h-6" style={{ color: COLORS.accent }} />
          {hasNewMessage && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full"
              style={{
                background: "#10B981",
                border: `2px solid ${COLORS.bg}`,
                boxShadow: "0 0 8px rgba(16,185,129,0.6)",
              }}
            />
          )}
        </button>
      )}
    </>
  );
}

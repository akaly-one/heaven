"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, X, Send } from "lucide-react";

/* ══════════════════════════════════════════════
   PILOT — Agent admin Heaven Studio
   Aide a naviguer, gerer, et agir dans le cockpit
   Mode task-oriented, pas informatif
   ══════════════════════════════════════════════ */

interface PilotMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  actions?: PilotAction[];
}

interface PilotAction {
  id: string;
  label: string;
  icon?: string;
  value: string;
}

// ── Read live data from localStorage ──
function readQuickStats() {
  const safeJSON = (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  };
  const tickets = safeJSON("heaven_chat_tickets") || [];
  const notifications = safeJSON("heaven_notifications") || [];

  const openTickets = Array.isArray(tickets) ? tickets.filter((t: { status?: string }) =>
    t.status && ["new", "open"].includes(t.status)).length : 0;
  const unreadNotifs = Array.isArray(notifications) ? notifications.filter((n: { read?: boolean }) => !n.read).length : 0;

  return { ticketsOpen: openTickets, unreadNotifs };
}

// ── Navigation map ──
const NAV_MAP: Record<string, { path: string; label: string }> = {
  agence: { path: "/agence", label: "Cockpit" },
};

interface ChatWidgetProps {
  cpId?: string;
  mode?: "pilot";
  position?: "bottom-right" | "bottom-left";
  embedded?: boolean;
}

export function ChatWidget({ position = "bottom-right", embedded = false }: ChatWidgetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState<PilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accent = "#C9A84C";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function addBot(content: string, actions?: PilotAction[]) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        role: "bot",
        content,
        actions,
      }]);
    }, 300 + Math.random() * 300);
  }

  function addUser(content: string) {
    setMessages((prev) => [...prev, {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      role: "user",
      content,
    }]);
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);

    if (messages.length === 0) {
      const stats = readQuickStats();
      const alerts: string[] = [];
      if (stats.ticketsOpen > 0) alerts.push(`${stats.ticketsOpen} ticket${stats.ticketsOpen > 1 ? "s" : ""} en attente`);
      if (stats.unreadNotifs > 0) alerts.push(`${stats.unreadNotifs} notification${stats.unreadNotifs > 1 ? "s" : ""} non lue${stats.unreadNotifs > 1 ? "s" : ""}`);

      const alertText = alerts.length > 0 ? `\n\n${alerts.join(" · ")}` : "";

      setMessages([{
        id: "greeting",
        role: "bot",
        content: `Salut ! PILOT ici.\n\nQue veux-tu faire ?${alertText}`,
        actions: getMainActions(),
      }]);
    }
  }

  function navigateTo(key: string) {
    const nav = NAV_MAP[key];
    if (nav) {
      router.push(nav.path);
      addBot(`Navigation vers ${nav.label}`, getMainActions());
    }
  }

  function showStats() {
    const s = readQuickStats();
    addBot(
      `Stats en temps reel :\n\n` +
      `Tickets — ${s.ticketsOpen} en attente\n` +
      `Notifications — ${s.unreadNotifs} non lue${s.unreadNotifs > 1 ? "s" : ""}`,
      getMainActions()
    );
  }

  function getMainActions(): PilotAction[] {
    return [
      { id: "stats", label: "Stats", value: "stats" },
      { id: "go_agence", label: "Cockpit", value: "go_agence" },
    ];
  }

  const processInput = useCallback((text: string) => {
    const t = text.toLowerCase().trim();

    // Navigation commands
    if (t.includes("agence") || t.includes("cockpit") || t.includes("profil") || t === "go_agence") {
      navigateTo("agence");
      return;
    }

    // Stats
    if (t.includes("stat") || t.includes("kpi") || t.includes("resume") || t.includes("briefing") || t === "stats") {
      showStats();
      return;
    }

    // Menu / help
    if (t === "menu" || t === "aide" || t === "help" || t === "retour") {
      addBot("Que veux-tu faire ?", getMainActions());
      return;
    }

    // Notifications
    if (t.includes("notif")) {
      const s = readQuickStats();
      addBot(`${s.unreadNotifs} notification${s.unreadNotifs > 1 ? "s" : ""} non lue${s.unreadNotifs > 1 ? "s" : ""}.`, getMainActions());
      return;
    }

    // Fallback
    addBot("Je peux t'aider a :\n\nVoir les stats\nNaviguer vers le cockpit\nGerer les notifications\n\nDis-moi ce que tu veux faire !", getMainActions());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    addUser(msg);
    setTimeout(() => processInput(msg), 100);
  }

  function handleActionClick(action: PilotAction) {
    addUser(action.label.replace(/^[^\w]*/, "").trim());
    setTimeout(() => processInput(action.value), 100);
  }

  // Floating bubble (hidden on mobile to not conflict with radial nav)
  if (!embedded && !open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed z-40 w-12 h-12 rounded-full items-center justify-center shadow-2xl transition-all hover:scale-110 cursor-pointer hidden md:flex"
        style={{
          background: `linear-gradient(135deg, ${accent}, #E8C76A)`,
          [position === "bottom-right" ? "right" : "left"]: 24,
          bottom: 24,
          boxShadow: `0 0 20px rgba(201,168,76,0.3), 0 4px 12px rgba(0,0,0,0.3)`,
        }}
      >
        <Sparkles className="w-5 h-5" style={{ color: "#06060B" }} />
      </button>
    );
  }

  if (!embedded && !open) return null;

  const chatContent = (
    <div className={`flex flex-col ${embedded ? "h-full" : "h-[520px] w-[380px] max-w-[calc(100vw-2rem)]"}`}
      style={{ background: "var(--sq-bg, #0A0A0F)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: `linear-gradient(135deg, ${accent}, #D4AF37)` }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(6,6,11,0.3)" }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: "#06060B" }}>PILOT</p>
          <p className="text-[10px] font-medium" style={{ color: "rgba(6,6,11,0.6)" }}>
            Assistant Heaven Studio
          </p>
        </div>
        {!embedded && (
          <button onClick={() => setOpen(false)} className="cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: "rgba(6,6,11,0.6)" }}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--sq-border, #1E1E2E) transparent" }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-md"
                    : "rounded-2xl rounded-bl-md"
                }`}
                style={{
                  background: msg.role === "user" ? accent : "var(--sq-surface, #12121A)",
                  color: msg.role === "user" ? "#06060B" : "var(--sq-text, #E2E8F0)",
                  fontWeight: msg.role === "user" ? 500 : 400,
                }}
              >
                {msg.content}
              </div>
            </div>

            {/* Action buttons */}
            {msg.actions && msg.actions.length > 0 && msg.id === messages[messages.length - 1]?.id && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                {msg.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className="px-3 py-1.5 text-[10px] font-medium rounded-full cursor-pointer transition-all hover:scale-105"
                    style={{
                      background: "var(--sq-surface, #12121A)",
                      color: "var(--sq-text, #E2E8F0)",
                      border: "1px solid var(--sq-border, #1E1E2E)",
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-1.5"
              style={{ background: "var(--sq-surface, #12121A)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: accent, animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: accent, animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: accent, animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--sq-border, #1E1E2E)" }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Dis-moi ce que tu veux faire..."
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl outline-none"
            style={{
              background: "var(--sq-surface, #12121A)",
              color: "var(--sq-text, #E2E8F0)",
              border: "1px solid var(--sq-border, #1E1E2E)",
            }}
          />
          <button type="submit"
            className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:opacity-80"
            style={{ background: `linear-gradient(135deg, ${accent}, #E8C76A)` }}>
            <Send className="w-4 h-4" style={{ color: "#06060B" }} />
          </button>
        </form>
      </div>
    </div>
  );

  if (embedded) return chatContent;

  return (
    <div className="fixed z-40 rounded-2xl overflow-hidden shadow-2xl hidden md:block"
      style={{
        [position === "bottom-right" ? "right" : "left"]: 24,
        bottom: 24,
        border: `1px solid ${accent}30`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(201,168,76,0.08)`,
      }}>
      {chatContent}
    </div>
  );
}

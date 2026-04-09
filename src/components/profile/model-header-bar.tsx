"use client";

import { useEffect, useState } from "react";
import {
  MessageCircle, Lock, Check, Key, ShoppingBag,
  Instagram, Ghost,
} from "lucide-react";
import type { ModelInfo, AccessCode, VisitorPlatform } from "@/types/heaven";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClientBadge } from "@/components/profile/client-badge";

// ── Live countdown badge ──
function CountdownBadge({ tier, expiresAt }: { tier: string; expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpiring, setIsExpiring] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("expire"); setIsExpiring(true); return; }
      setIsExpiring(diff < 600000);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) setTimeLeft(`${Math.floor(h / 24)}j ${h % 24}h`);
      else if (h > 0) setTimeLeft(`${h}h${m.toString().padStart(2, "0")}`);
      else setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono"
      style={{
        background: isExpiring ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
        color: isExpiring ? "#EF4444" : "#10B981",
        animation: isExpiring ? "pulse 1s infinite" : "none",
      }}>
      {tier.toUpperCase()} {timeLeft}
    </span>
  );
}

interface ModelHeaderBarProps {
  model: ModelInfo;
  displayModel: ModelInfo | null;
  isModelLoggedIn: boolean;
  visitorRegistered: boolean;
  visitorPlatform: VisitorPlatform | null;
  visitorHandle: string;
  visitorVerified: boolean;
  unlockedTier: string | null;
  activeCode: AccessCode | null;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatUnread: number;
  orderHistoryOpen: boolean;
  setOrderHistoryOpen: (open: boolean) => void;
  newNotifications: number;
  clearNotifications: () => void;
  setCodeSheetOpen: (open: boolean) => void;
  slug: string;
  modelId: string;
  onCodeValidated: (code: { tier: string; expiresAt: string; code: string; id?: string }) => void;
}

export function ModelHeaderBar({
  model,
  displayModel,
  isModelLoggedIn,
  visitorRegistered,
  visitorPlatform,
  visitorHandle,
  visitorVerified,
  unlockedTier,
  activeCode,
  chatOpen,
  setChatOpen,
  chatUnread,
  orderHistoryOpen,
  setOrderHistoryOpen,
  newNotifications,
  clearNotifications,
  setCodeSheetOpen,
  slug,
  modelId,
  onCodeValidated,
}: ModelHeaderBarProps) {
  return (
    <div className="sticky top-0 left-0 right-0 z-40 px-3 sm:px-5 md:px-8 lg:px-12 py-2"
      style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>

      <div className="flex items-center">
        {/* LEFT: Model name */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {isModelLoggedIn && (
            <a href="/agence" className="text-sm font-bold no-underline shrink-0" style={{ color: "var(--accent)" }}>&#8592;</a>
          )}
          <span className="text-xs sm:text-sm font-bold tracking-wide uppercase truncate" style={{ color: "var(--text)", letterSpacing: "0.08em" }}>
            {model.display_name}
          </span>
          {displayModel?.online && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--success)", boxShadow: "0 0 6px rgba(16,185,129,0.5)" }} />}
        </div>

        {/* CENTER: BEACON chat bubble */}
        <div className="flex-1 flex justify-center">
          {!isModelLoggedIn && (
            <button onClick={() => setChatOpen(!chatOpen)}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, var(--rose), var(--accent))",
                border: "none",
                boxShadow: chatUnread > 0
                  ? "0 0 8px rgba(230,51,41,0.5), 0 0 16px rgba(16,185,129,0.3)"
                  : "0 2px 8px rgba(230,51,41,0.3)",
                animation: chatUnread > 0 ? "chatBubbleGlow 1.5s ease-in-out infinite" : "none",
              }}>
              <MessageCircle className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
              {chatUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: "#10B981", color: "#fff", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }}>
                  {chatUnread}
                </span>
              )}
            </button>
          )}
        </div>

        {/* RIGHT: Visitor info + actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {visitorRegistered && (
            <>
              {/* Platform icon + handle + verified */}
              <div className="flex items-center gap-1.5 min-w-0">
                {visitorPlatform && (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shrink-0">
                    {visitorPlatform === "snap" ? (
                      <Ghost className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "#FFFC00" }} />
                    ) : (
                      <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: "#C13584" }} />
                    )}
                  </div>
                )}
                <span className="text-[11px] sm:text-xs font-semibold truncate max-w-[50px] sm:max-w-[120px] md:max-w-[180px]" style={{ color: "var(--text)" }}>@{visitorHandle}</span>
                {!isModelLoggedIn && (
                  <div className="relative group shrink-0">
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: visitorVerified ? "#10B981" : "#EF4444" }}>
                      {visitorVerified
                        ? <Check className="w-2 h-2 text-white" />
                        : <Lock className="w-2 h-2 text-white" />
                      }
                    </div>
                    <div className="absolute top-full right-0 mt-2 px-2.5 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50 whitespace-nowrap"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}>
                      <span className="text-[10px] font-semibold" style={{ color: visitorVerified ? "#10B981" : "#EF4444" }}>
                        {visitorVerified ? "Compte verifie" : "Non verifie"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Tier badge */}
              <ClientBadge tier={unlockedTier || null} size="md" />
              {/* Order history */}
              <button onClick={() => { setOrderHistoryOpen(!orderHistoryOpen); clearNotifications(); }}
                className="relative w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0"
                style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
                <ShoppingBag className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                {newNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: "#10B981", color: "#fff", boxShadow: "0 0 6px rgba(16,185,129,0.5)" }}>
                    {newNotifications}
                  </span>
                )}
              </button>
              {/* Code / Countdown */}
              {unlockedTier ? (
                <CountdownBadge tier={unlockedTier} expiresAt={activeCode?.expiresAt || ""} />
              ) : (
                <>
                  {/* Desktop: inline code input */}
                  <div className="relative group hidden sm:block">
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
                      const code = input?.value?.trim();
                      if (!code) return;
                      try {
                        const res = await fetch("/api/codes", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "validate", code, model: modelId }),
                        });
                        const data = await res.json();
                        if (data.code?.tier) {
                          onCodeValidated(data.code);
                        } else {
                          input.style.borderColor = "#EF4444";
                          input.placeholder = "Code invalide";
                          input.value = "";
                          setTimeout(() => { input.placeholder = "CODE"; input.style.borderColor = ""; }, 2000);
                        }
                      } catch { input.placeholder = "Erreur"; input.value = ""; }
                    }} className="flex items-center gap-1.5">
                      <input type="text" placeholder="CODE"
                        className="w-[100px] md:w-[110px] px-3 py-1.5 rounded-xl text-[11px] font-mono uppercase tracking-wider outline-none text-center"
                        style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                      />
                      <button type="submit"
                        className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0"
                        style={{ background: "var(--accent)", border: "none" }}>
                        <Key className="w-3.5 h-3.5 text-white" />
                      </button>
                    </form>
                  </div>
                  {/* Mobile: key icon only */}
                  <button
                    onClick={() => setCodeSheetOpen(true)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0 sm:hidden"
                    style={{ background: "var(--accent)", border: "none" }}>
                    <Key className="w-3.5 h-3.5 text-white" />
                  </button>
                </>
              )}
            </>
          )}
          <ThemeToggle size="sm" />
        </div>
      </div>
    </div>
  );
}

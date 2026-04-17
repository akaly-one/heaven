"use client";

import { useState, useEffect } from "react";
import { Crown, Clock, ArrowUpRight, AlertTriangle } from "lucide-react";
import { TIER_CONFIG } from "@/constants/tiers";
import type { AccessCode, VisitorPlatform } from "@/types/heaven";

interface SubscriptionStatusBarProps {
  visitorHandle: string;
  visitorPlatform: VisitorPlatform | null;
  unlockedTier: string | null;
  activeCode: AccessCode | null;
  onUpgrade: () => void;
  onManage?: () => void;
}

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expire";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function SubscriptionStatusBar({
  visitorHandle,
  unlockedTier,
  activeCode,
  onUpgrade,
  onManage,
}: SubscriptionStatusBarProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpiring, setIsExpiring] = useState(false);

  useEffect(() => {
    if (!activeCode?.expiresAt) return;
    const update = () => {
      const diff = new Date(activeCode.expiresAt).getTime() - Date.now();
      setTimeLeft(formatTimeLeft(activeCode.expiresAt));
      setIsExpiring(diff > 0 && diff < 6 * 3600000); // < 6h
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [activeCode?.expiresAt]);

  const tier = unlockedTier || "free";
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const isActive = activeCode && new Date(activeCode.expiresAt).getTime() > Date.now();
  const isExpired = activeCode && new Date(activeCode.expiresAt).getTime() <= Date.now();
  const isFree = !activeCode && !unlockedTier;

  return (
    <div className="sticky top-0 z-40 w-full">
      <div
        className="flex items-center justify-between px-4 py-2.5 text-[11px] font-medium backdrop-blur-md"
        style={{
          background: isExpired
            ? "rgba(217,119,6,0.1)"
            : isActive
              ? `${config.bg.replace("0.08", "0.12")}`
              : "rgba(255,255,255,0.06)",
          borderBottom: `1px solid ${isExpired ? "rgba(217,119,6,0.2)" : isActive ? `${config.hex}20` : "var(--border2)"}`,
        }}
      >
        {/* Left: identity + status */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold truncate" style={{ color: "var(--text)" }}>
            @{visitorHandle}
          </span>
          <span style={{ color: "var(--text-muted)" }}>·</span>

          {isFree && (
            <span style={{ color: "var(--text-muted)" }}>Mode gratuit</span>
          )}

          {isActive && (
            <div className="flex items-center gap-1.5">
              <span
                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase"
                style={{ background: config.bg, color: config.hex }}
              >
                {config.symbol} {config.label}
              </span>
              {activeCode?.pack && (
                <span className="hidden sm:inline" style={{ color: "var(--text-secondary)" }}>
                  {activeCode.pack}
                </span>
              )}
              <div className="flex items-center gap-1" style={{ color: isExpiring ? "var(--warning)" : "var(--text-muted)" }}>
                <Clock className={`w-3 h-3 ${isExpiring ? "animate-pulse" : ""}`} />
                <span className={isExpiring ? "font-bold" : ""}>{timeLeft}</span>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="flex items-center gap-1.5" style={{ color: "var(--warning)" }}>
              <AlertTriangle className="w-3 h-3" />
              <span className="font-semibold">Abonnement expire</span>
            </div>
          )}
        </div>

        {/* Right: CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {(isFree || isExpired) && (
            <button
              onClick={onUpgrade}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isExpired ? "var(--warning)" : `linear-gradient(135deg, ${config.hex}, ${config.hex}cc)`,
                color: "#fff",
              }}
            >
              <Crown className="w-3 h-3" />
              {isExpired ? "Renouveler" : "Upgrade"}
            </button>
          )}

          {isActive && onManage && (
            <button
              onClick={onManage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border2)" }}
            >
              Gerer <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

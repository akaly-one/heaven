"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface Meta24hTimerProps {
  /**
   * ISO timestamp of the last inbound (fan → model) IG message.
   * Used to compute the 24h Meta reply window.
   */
  lastInboundAt: string | null | undefined;
  /**
   * Optional CSS class override.
   */
  className?: string;
  /**
   * Compact mode (single line, smaller font).
   */
  compact?: boolean;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

function msRemaining(lastInboundIso: string | null | undefined): number {
  if (!lastInboundIso) return 0;
  const last = new Date(lastInboundIso).getTime();
  if (isNaN(last)) return 0;
  return Math.max(0, WINDOW_MS - (Date.now() - last));
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0h 00m";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/**
 * Meta 24h window timer.
 *
 * Displays the remaining time in which the model can reply via IG DM API
 * (Meta policy). Once expired, replies are locked (only Message Tags work,
 * not yet supported). Shows a red alert banner when window has closed.
 */
export function Meta24hTimer({
  lastInboundAt,
  className,
  compact = false,
}: Meta24hTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    // `now` is referenced so re-render triggers recomputation.
    void now;
    return msRemaining(lastInboundAt);
  }, [lastInboundAt, now]);

  const expired = remainingMs <= 0;
  const warning = !expired && remainingMs < 2 * 60 * 60 * 1000; // < 2h

  if (!lastInboundAt) return null;

  if (expired) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold ${
          className || ""
        }`}
        style={{
          background: "rgba(220,38,38,0.12)",
          color: "#F87171",
          border: "1px solid rgba(220,38,38,0.3)",
        }}
        title="Fenêtre Meta 24h expirée — réponse via IG bloquée (reply via Web si possible)"
      >
        <AlertTriangle className="w-3 h-3" />
        <span>{compact ? "Fenêtre expirée" : "IG expirée — reply bloquée"}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold tabular-nums ${
        className || ""
      }`}
      style={{
        background: warning ? "rgba(234,179,8,0.14)" : "rgba(225,48,108,0.1)",
        color: warning ? "#F59E0B" : "#E1306C",
        border: `1px solid ${
          warning ? "rgba(234,179,8,0.3)" : "rgba(225,48,108,0.25)"
        }`,
      }}
      title={`Fenêtre Meta IG : ${formatRemaining(remainingMs)} restant avant fermeture`}
    >
      <Clock className="w-3 h-3" />
      <span>
        {compact ? formatRemaining(remainingMs) : `IG window : ${formatRemaining(remainingMs)} restant`}
      </span>
    </div>
  );
}

/**
 * Helper exported for use by the composer to lock/unlock IG reply button.
 */
export function isMetaWindowOpen(lastInboundAt: string | null | undefined): boolean {
  return msRemaining(lastInboundAt) > 0;
}

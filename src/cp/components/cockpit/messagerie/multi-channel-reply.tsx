"use client";

import { useMemo } from "react";
import { Globe, Instagram, Lock } from "lucide-react";
import { ReplyComposer, type ReplyChannel } from "@/components/cockpit/reply-composer";
import { isMetaWindowOpen } from "./meta-24h-timer";

/**
 * Extended channel set — includes not-yet-connected channels to display
 * them as disabled in the UI, per NB brief B7.
 */
export type ExtendedChannel = ReplyChannel | "snap" | "fanvue";

interface FanChannels {
  /** Whether the fan has a web handle (always replyable via Heaven chat). */
  hasWeb: boolean;
  /** Whether the fan has an IG handle. */
  hasInstagram: boolean;
  /** Whether the fan has a Snap handle (not yet connected — display only). */
  hasSnap: boolean;
  /** Whether the fan has a Fanvue handle (not yet connected — display only). */
  hasFanvue: boolean;
}

interface MultiChannelReplyProps {
  fanId: string;
  /**
   * Which channels the fan has handles on.
   */
  fanChannels: FanChannels;
  /**
   * Source of the last message received from the fan — used to auto-select
   * the reply channel.
   */
  lastMessageSource?: ReplyChannel | null;
  /**
   * ISO timestamp of the last inbound IG message (used to gate IG reply
   * via Meta 24h rule).
   */
  lastIgInboundAt?: string | null;
  /**
   * Notification callback after a successful send.
   */
  onSent?: () => void;
}

/**
 * Multi-channel reply UI — wraps `ReplyComposer` with:
 *
 * - Auto-selection of the last received channel (falls back to web)
 * - Disables IG when Meta 24h window is closed
 * - Displays Snap / Fanvue as disabled "coming soon" badges (per B7)
 *
 * All the composer logic (dropdown, send, dispatch) remains in
 * `ReplyComposer`; this file only narrows the available channel set.
 */
export function MultiChannelReply({
  fanId,
  fanChannels,
  lastMessageSource,
  lastIgInboundAt,
  onSent,
}: MultiChannelReplyProps) {
  const igOpen = isMetaWindowOpen(lastIgInboundAt);

  // Active (enabled) channels for the dropdown.
  const availableChannels: ReplyChannel[] = useMemo(() => {
    const list: ReplyChannel[] = [];
    if (fanChannels.hasWeb) list.push("web");
    if (fanChannels.hasInstagram && igOpen) list.push("instagram");
    return list;
  }, [fanChannels.hasWeb, fanChannels.hasInstagram, igOpen]);

  const defaultChannel: ReplyChannel = useMemo(() => {
    if (
      lastMessageSource === "instagram" &&
      fanChannels.hasInstagram &&
      igOpen
    ) {
      return "instagram";
    }
    if (lastMessageSource === "web" && fanChannels.hasWeb) return "web";
    // Fallback : first available channel.
    return availableChannels[0] || "web";
  }, [
    lastMessageSource,
    fanChannels.hasWeb,
    fanChannels.hasInstagram,
    igOpen,
    availableChannels,
  ]);

  // No handles at all for the fan — show locked composer placeholder.
  if (availableChannels.length === 0 && !fanChannels.hasSnap && !fanChannels.hasFanvue) {
    return (
      <div
        className="rounded-xl p-3 text-[11px]"
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border2)",
          color: "var(--text-muted)",
        }}
      >
        <Lock className="w-3 h-3 inline mr-1.5 -mt-0.5" />
        Aucun canal disponible pour ce fan.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ReplyComposer
        fanId={fanId}
        availableChannels={availableChannels.length > 0 ? availableChannels : ["web"]}
        defaultChannel={defaultChannel}
        onSent={onSent}
      />

      {/* Disabled channels (coming soon) */}
      {(fanChannels.hasSnap || fanChannels.hasFanvue || (fanChannels.hasInstagram && !igOpen)) && (
        <div
          className="flex flex-wrap items-center gap-1.5 text-[10px]"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="opacity-70">Aussi disponible :</span>
          {fanChannels.hasInstagram && !igOpen && (
            <DisabledChannelBadge
              icon={Instagram}
              label="Instagram"
              color="#E1306C"
              bg="rgba(225,48,108,0.08)"
              border="rgba(225,48,108,0.2)"
              reason="Fenêtre 24h expirée"
            />
          )}
          {fanChannels.hasSnap && (
            <DisabledChannelBadge
              icon={Globe}
              label="Snap"
              color="#FFFC00"
              bg="rgba(255,252,0,0.08)"
              border="rgba(255,252,0,0.25)"
              reason="Pas d'API — copy/paste manuel"
            />
          )}
          {fanChannels.hasFanvue && (
            <DisabledChannelBadge
              icon={Globe}
              label="Fanvue"
              color="#6D63F5"
              bg="rgba(109,99,245,0.08)"
              border="rgba(109,99,245,0.25)"
              reason="Pas d'API — copy/paste manuel"
            />
          )}
        </div>
      )}
    </div>
  );
}

function DisabledChannelBadge({
  icon: Icon,
  label,
  color,
  bg,
  border,
  reason,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  color: string;
  bg: string;
  border: string;
  reason: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded opacity-60"
      style={{ background: bg, color, border: `1px solid ${border}` }}
      title={reason}
    >
      <Icon className="w-2.5 h-2.5" />
      <span className="text-[10px] font-semibold">{label}</span>
      <Lock className="w-2.5 h-2.5 opacity-60" />
    </span>
  );
}

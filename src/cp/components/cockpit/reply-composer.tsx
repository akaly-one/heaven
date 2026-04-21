"use client";

import { useState, useEffect } from "react";
import { Send, Instagram, MessageCircle, Loader2, ChevronDown } from "lucide-react";

export type ReplyChannel = "web" | "instagram";

interface ReplyComposerProps {
  fanId: string;
  availableChannels: ReplyChannel[];
  defaultChannel: ReplyChannel;
  onSent?: () => void;
  placeholder?: string;
  compact?: boolean;
}

const CHANNEL_META: Record<
  ReplyChannel,
  {
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
    bg: string;
    border: string;
  }
> = {
  web: {
    label: "Web",
    icon: MessageCircle,
    color: "#9CA3AF",
    bg: "rgba(107,114,128,0.12)",
    border: "rgba(107,114,128,0.28)",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "#E1306C",
    bg: "rgba(225,48,108,0.12)",
    border: "rgba(225,48,108,0.3)",
  },
};

export function ReplyComposer({
  fanId,
  availableChannels,
  defaultChannel,
  onSent,
  placeholder = "Tape ta réponse…",
  compact = false,
}: ReplyComposerProps) {
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<ReplyChannel>(defaultChannel);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Ensure selected channel stays in the available set
  useEffect(() => {
    if (!availableChannels.includes(channel) && availableChannels.length > 0) {
      setChannel(availableChannels[0]);
    }
  }, [availableChannels, channel]);

  // Sync when default changes (e.g. switching conversation)
  useEffect(() => {
    setChannel(defaultChannel);
  }, [defaultChannel, fanId]);

  const send = async () => {
    const payload = text.trim();
    if (!payload || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/agence/messaging/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fan_id: fanId,
          text: payload,
          prefer_channel: channel,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi");
        return;
      }
      setText("");
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSending(false);
    }
  };

  const canSend = text.trim().length > 0 && !sending;

  const channelMeta = CHANNEL_META[channel];
  const ChannelIcon = channelMeta.icon;

  return (
    <div
      className="rounded-xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Channel selector row */}
      {availableChannels.length > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ borderBottom: "1px solid var(--border2)" }}
        >
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Via
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              disabled={availableChannels.length <= 1}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium"
              style={{
                background: channelMeta.bg,
                color: channelMeta.color,
                border: `1px solid ${channelMeta.border}`,
                cursor: availableChannels.length <= 1 ? "default" : "pointer",
              }}
            >
              <ChannelIcon className="w-3 h-3" />
              {channelMeta.label}
              {availableChannels.length > 1 && (
                <ChevronDown className="w-3 h-3 opacity-60" />
              )}
            </button>
            {dropdownOpen && availableChannels.length > 1 && (
              <div
                className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-20 min-w-[140px]"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                }}
              >
                {availableChannels.map((c) => {
                  const meta = CHANNEL_META[c];
                  const Icon = meta.icon;
                  const active = channel === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setChannel(c);
                        setDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-[11px] inline-flex items-center gap-2"
                      style={{
                        background: active ? meta.bg : "transparent",
                        color: active ? meta.color : "var(--text)",
                      }}
                    >
                      <Icon className="w-3 h-3" style={{ color: meta.color }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {channel !== defaultChannel && (
            <span
              className="text-[10px] ml-auto"
              style={{ color: "var(--text-muted)" }}
            >
              canal overridé
            </span>
          )}
        </div>
      )}

      {/* Composer body */}
      <div className="p-2.5 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          rows={compact ? 1 : 2}
          className="flex-1 px-3 py-2 text-sm rounded-lg resize-none"
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
            color: "var(--text)",
            minHeight: compact ? "36px" : "48px",
            maxHeight: "160px",
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className="px-3.5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-40 transition-opacity"
          style={{
            background: "linear-gradient(135deg, #E6C974, #C9A84C)",
            color: "#0A0A0C",
          }}
          aria-label="Envoyer"
        >
          {sending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Répondre</span>
        </button>
      </div>

      {error && (
        <div
          className="text-[11px] px-3 py-2 mx-2.5 mb-2.5 rounded"
          style={{
            background: "rgba(220,38,38,0.08)",
            color: "#F87171",
            border: "1px solid rgba(220,38,38,0.2)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

"use client";

import { Instagram, MessageCircle } from "lucide-react";

export type TimelineSource = "web" | "instagram";
export type TimelineDirection = "in" | "out";

export interface TimelineItem {
  id?: string;
  source: TimelineSource;
  direction: TimelineDirection;
  text: string;
  created_at: string;
  media_url?: string | null;
}

interface FanTimelineProps {
  items: TimelineItem[];
  emptyLabel?: string;
  outAvatarUrl?: string | null;
  outAvatarName?: string;
  inAvatarName?: string;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDayKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function humanDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, today)) return "Aujourd'hui";
  if (isSameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: TimelineSource }) {
  if (source === "instagram") {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded uppercase tracking-wider font-semibold"
        style={{
          background: "linear-gradient(135deg, rgba(131,58,180,0.18), rgba(225,48,108,0.18), rgba(247,119,55,0.18))",
          color: "#E1306C",
        }}
      >
        <Instagram className="w-2.5 h-2.5" />
        Instagram
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded uppercase tracking-wider font-semibold"
      style={{ background: "rgba(107,114,128,0.15)", color: "#9CA3AF" }}
    >
      <MessageCircle className="w-2.5 h-2.5" />
      Web
    </span>
  );
}

// ── Avatar (minimal, inline) ──────────────────────────────────────────────────

function MiniAvatar({
  name,
  url,
  size = 28,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const initial = (name || "?").slice(0, 1).toUpperCase();
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    background: "linear-gradient(135deg, #E6C974, #9E7C1F)",
    color: "#0A0A0C",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: size * 0.42,
  };
  if (url) {
    return (
      <div style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return <div style={style}>{initial}</div>;
}

// ── Main component ────────────────────────────────────────────────────────────

export function FanTimeline({
  items,
  emptyLabel = "Aucun message",
  outAvatarUrl,
  outAvatarName = "YUMI",
  inAvatarName = "?",
}: FanTimelineProps) {
  if (!items || items.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-10 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {emptyLabel}
      </div>
    );
  }

  // NB 2026-04-24 : sort chronologically ASC (oldest first, newest at bottom)
  // Standard messenger (iMessage/WhatsApp/Slack) — nouveau message arrive en bas,
  // scroll auto vers le bas géré par le parent via useEffect sur items.length.
  const sorted = [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Group by day
  const groups: { day: string; dayLabel: string; items: TimelineItem[] }[] = [];
  for (const item of sorted) {
    const day = formatDayKey(item.created_at);
    const existing = groups.find((g) => g.day === day);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ day, dayLabel: humanDayLabel(item.created_at), items: [item] });
    }
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.day}>
          {/* Day separator */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-px flex-1"
              style={{ background: "var(--border)" }}
            />
            <span
              className="text-[10px] uppercase tracking-wider font-medium px-2"
              style={{ color: "var(--text-muted)" }}
            >
              {group.dayLabel}
            </span>
            <div
              className="h-px flex-1"
              style={{ background: "var(--border)" }}
            />
          </div>

          {/* Messages within the day — NB 2026-04-24 : colors par source
              web = jaune/gold, instagram = gradient IG (purple→pink→orange) */}
          <div className="space-y-3">
            {group.items.map((item, idx) => {
              const isOut = item.direction === "out";
              const isIg = item.source === "instagram";
              // Bulle OUT (reply) : couleur selon source
              const outBg = isIg
                ? "linear-gradient(135deg, #833AB4, #E1306C, #F77737)"
                : "linear-gradient(135deg, #E6C974, #C9A84C)";
              const outColor = isIg ? "#fff" : "#0A0A0C";
              // Bulle IN (fan) : bg neutre + accent border selon source
              const inAccent = isIg
                ? "rgba(225,48,108,0.35)"
                : "rgba(212,175,55,0.45)";
              return (
                <div
                  key={item.id || `${group.day}-${idx}`}
                  className={`flex items-end gap-2 ${isOut ? "justify-end" : "justify-start"}`}
                >
                  {!isOut && <MiniAvatar name={inAvatarName} size={28} />}
                  <div className="max-w-[78%] md:max-w-[62%]">
                    <div
                      className={`flex items-center gap-1.5 mb-1 text-[9px] ${
                        isOut ? "justify-end" : "justify-start"
                      }`}
                      style={{ color: "var(--text-muted)" }}
                    >
                      <SourceBadge source={item.source} />
                      <span>{formatTime(item.created_at)}</span>
                    </div>
                    <div
                      className="px-4 py-2.5 text-sm rounded-2xl"
                      style={{
                        background: isOut ? outBg : "var(--bg3)",
                        color: isOut ? outColor : "var(--text)",
                        borderBottomRightRadius: isOut ? "4px" : "16px",
                        borderBottomLeftRadius: isOut ? "16px" : "4px",
                        wordBreak: "break-word",
                        borderLeft: !isOut ? `2px solid ${inAccent}` : "none",
                      }}
                    >
                      {item.media_url && (
                        <div className="mb-2 -mx-2 -mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.media_url}
                            alt="media"
                            style={{
                              maxWidth: "100%",
                              borderRadius: "12px",
                              display: "block",
                            }}
                          />
                        </div>
                      )}
                      {item.text}
                    </div>
                  </div>
                  {isOut && (
                    <MiniAvatar name={outAvatarName} url={outAvatarUrl} size={28} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

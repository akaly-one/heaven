"use client";

import { Globe, Instagram, Zap, Heart, Clock, UserCircle2 } from "lucide-react";

export interface AgenceFan {
  id: string;
  pseudo_web?: string | null;
  pseudo_insta?: string | null;
  pseudo_snap?: string | null;
  fanvue_handle?: string | null;
  avatar_url?: string | null;
  display_name?: string | null;
  phone?: string | null;
  email?: string | null;
  first_seen?: string | null;
  last_seen?: string | null;
  notes?: string | null;
  tier?: string | null;
}

export interface AgenceClient {
  id: string;
  model: string;
  pseudo?: string | null;
  pseudo_insta?: string | null;
  pseudo_snap?: string | null;
  tier?: string | null;
  avatar_url?: string | null;
  display_name?: string | null;
}

interface FanProfileCardProps {
  fan: AgenceFan;
  linkedClients?: AgenceClient[];
}

// ── Tier palette (same across modules) ────────────────────────────────────────

const TIER_HEX: Record<string, { bg: string; color: string; label: string }> = {
  silver: { bg: "rgba(192,192,192,0.12)", color: "#C0C0C0", label: "Silver" },
  gold: { bg: "rgba(212,175,55,0.14)", color: "#D4AF37", label: "Gold" },
  vip: { bg: "rgba(230,51,41,0.14)", color: "#E63329", label: "VIP" },
  diamond: { bg: "rgba(79,70,229,0.16)", color: "#6D63F5", label: "Diamond" },
  black: { bg: "rgba(139,92,246,0.16)", color: "#8B5CF6", label: "Black" },
  platinum: { bg: "rgba(124,58,237,0.16)", color: "#7C3AED", label: "Platinum" },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function Avatar({
  url,
  name,
  size = 64,
}: {
  url?: string | null;
  name: string;
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
    fontSize: size * 0.38,
    boxShadow: "0 0 0 2px var(--bg), 0 0 0 3px rgba(201,168,76,0.45)",
  };
  if (url) {
    return (
      <div style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }
  return <div style={style}>{initial}</div>;
}

function SourceBadge({
  icon: Icon,
  label,
  handle,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  handle: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium"
      style={{ background: bg, color }}
    >
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{handle}</span>
    </span>
  );
}

export function FanProfileCard({ fan, linkedClients = [] }: FanProfileCardProps) {
  // Primary display name: prefer insta handle, fall back to other sources
  const primaryHandle =
    fan.pseudo_insta ||
    fan.pseudo_web ||
    fan.pseudo_snap ||
    fan.fanvue_handle ||
    fan.id.slice(0, 8);

  const displayName =
    fan.display_name ||
    (fan.pseudo_insta ? `@${fan.pseudo_insta}` : `@${primaryHandle}`);

  // Resolve highest tier across fan + linked clients
  const allTiers = [
    fan.tier,
    ...linkedClients.map((c) => c.tier),
  ].filter(Boolean) as string[];

  const tierPriority = ["black", "platinum", "diamond", "vip", "gold", "silver"];
  const highestTier = tierPriority.find((t) => allTiers.includes(t)) || null;
  const tierMeta = highestTier ? TIER_HEX[highestTier] : null;

  // Avatar — fan's own first, fallback to any linked client avatar
  const avatarUrl =
    fan.avatar_url ||
    linkedClients.find((c) => c.avatar_url)?.avatar_url ||
    null;

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
        <Avatar url={avatarUrl} name={displayName} size={72} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              className="text-lg md:text-xl font-bold leading-tight"
              style={{ color: "var(--text)" }}
            >
              {displayName}
            </h2>
            {tierMeta && (
              <span
                className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold"
                style={{ background: tierMeta.bg, color: tierMeta.color }}
              >
                {tierMeta.label}
              </span>
            )}
          </div>

          {fan.pseudo_insta ? (
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              @{fan.pseudo_insta}
            </p>
          ) : (
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {primaryHandle}
            </p>
          )}

          {/* Source badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {fan.pseudo_web && (
              <SourceBadge
                icon={Globe}
                label="Web"
                handle={fan.pseudo_web}
                color="#9CA3AF"
                bg="rgba(107,114,128,0.14)"
              />
            )}
            {fan.pseudo_insta && (
              <SourceBadge
                icon={Instagram}
                label="IG"
                handle={`@${fan.pseudo_insta}`}
                color="#E1306C"
                bg="rgba(225,48,108,0.12)"
              />
            )}
            {fan.pseudo_snap && (
              <SourceBadge
                icon={Zap}
                label="Snap"
                handle={fan.pseudo_snap}
                color="#E6C100"
                bg="rgba(255,252,0,0.12)"
              />
            )}
            {fan.fanvue_handle && (
              <SourceBadge
                icon={Heart}
                label="Fanvue"
                handle={fan.fanvue_handle}
                color="#C9A84C"
                bg="rgba(201,168,76,0.15)"
              />
            )}
          </div>

          {/* Metadata row */}
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span className="opacity-70">Vu pour la 1ère fois</span>
              <span
                className="font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatDate(fan.first_seen)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span className="opacity-70">Dernier contact</span>
              <span
                className="font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatDate(fan.last_seen)}
              </span>
            </span>
            {linkedClients.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <UserCircle2 className="w-3 h-3" />
                <span>
                  Lié à{" "}
                  <span
                    className="font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {linkedClients.length}{" "}
                    {linkedClients.length > 1 ? "profils" : "profil"}
                  </span>
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {fan.notes && (
        <div
          className="mt-5 pt-4 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <span className="uppercase tracking-wider text-[9px] opacity-60 mr-2">Notes</span>
          {fan.notes}
        </div>
      )}
    </div>
  );
}

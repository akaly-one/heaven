"use client";

/**
 * Instagram Stats Widget — live snapshot for Dashboard `/agence`.
 *
 * Fetches :
 *   - /api/instagram/profile-stats (username, followers, following, media count, avatar)
 *   - /api/instagram/daily-stats (DMs received today, DMs replied today, last sync)
 *
 * Both endpoints poll every 60 s. Links to /agence/instagram for full IG dashboard.
 */

import { useCallback, useEffect, useState } from "react";
import { Instagram, ArrowRight, RefreshCw, MessageCircle, Send } from "lucide-react";
import { useActiveModelSlug } from "@/lib/use-active-model";

interface ProfileStats {
  username?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
}

interface DailyStats {
  dms_received_today: number;
  dms_replied_today: number;
  last_sync_at: string | null;
}

function formatNumber(n?: number): string {
  if (typeof n !== "number") return "—";
  if (n >= 1000) {
    const v = n / 1000;
    return v >= 10 ? `${Math.round(v)}k` : `${v.toFixed(1)}k`;
  }
  return n.toLocaleString("fr-FR");
}

function formatRelative(iso: string | null): string {
  if (!iso) return "jamais";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "il y a quelques secondes";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `il y a ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days}j`;
}

export function InstagramStatsWidget() {
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [daily, setDaily] = useState<DailyStats | null>(null);
  const [offline, setOffline] = useState(false);
  const [, tick] = useState(0);
  const activeSlug = useActiveModelSlug();

  const fetchAll = useCallback(async (slug: string | null) => {
    if (!slug) { setProfile(null); setDaily(null); setOffline(true); return; }
    try {
      const qs = `?model=${encodeURIComponent(slug)}`;
      const [pRes, dRes] = await Promise.all([
        fetch(`/api/instagram/profile-stats${qs}`),
        fetch(`/api/instagram/daily-stats${qs}`),
      ]);
      if (pRes.ok) {
        setProfile(await pRes.json());
        setOffline(false);
      } else if (pRes.status === 404) {
        setProfile(null);
        setOffline(true);
      } else {
        setOffline(true);
      }
      if (dRes.ok) setDaily(await dRes.json());
      else setDaily(null);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    // Reset stale pour éviter flash du modèle précédent
    setProfile(null);
    setDaily(null);
    fetchAll(activeSlug);
    const poll = setInterval(() => fetchAll(activeSlug), 60_000);
    return () => clearInterval(poll);
  }, [fetchAll, activeSlug]);

  // Refresh "il y a Xm" display every 30 s
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Username = celui retourné par l'API profile-stats (scope model_id).
  // Jamais de fallback hardcodé yumiiiclub — si pas d'IG configurée pour ce modèle,
  // on affiche "—" (cf. Paloma/Ruby qui n'ont pas encore d'instagram_config).
  const username = profile?.username || null;
  const followers = profile?.followers_count;
  const following = profile?.follows_count;
  const posts = profile?.media_count;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(131,58,180,0.08), rgba(225,48,108,0.08), rgba(247,119,55,0.06))",
        border: "1px solid rgba(225,48,108,0.20)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-3 md:p-4">
        {/* Avatar */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {profile?.profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_picture_url}
              alt={username || "Instagram profile"}
              className="w-11 h-11 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
              style={{
                border: "2px solid transparent",
                backgroundImage:
                  "linear-gradient(var(--surface), var(--surface)), linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box",
              }}
            />
          ) : (
            <div
              className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
              }}
            >
              <Instagram className="w-5 h-5 text-white" />
            </div>
          )}

          {/* Handle + counts */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#E1306C" }} />
              <h3
                className="text-sm md:text-[15px] font-bold leading-tight truncate"
                style={{ color: "var(--text)" }}
              >
                {username ? `@${username}` : "Instagram non configuré"}
              </h3>
            </div>
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] md:text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="tabular-nums whitespace-nowrap">
                <b style={{ color: "var(--text)" }}>{formatNumber(followers)}</b>{" "}
                fol.
              </span>
              <span className="opacity-50">·</span>
              <span className="tabular-nums whitespace-nowrap">
                <b style={{ color: "var(--text)" }}>{formatNumber(following)}</b>{" "}
                sub.
              </span>
              <span className="opacity-50">·</span>
              <span className="tabular-nums whitespace-nowrap">
                <b style={{ color: "var(--text)" }}>{formatNumber(posts)}</b>{" "}
                posts
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 mt-1 text-[10px] md:text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync {formatRelative(daily?.last_sync_at || null)}</span>
              {offline && (
                <>
                  <span>·</span>
                  <span style={{ color: "#DC2626" }}>Hors ligne</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* DM counters + CTA — pleine largeur mobile (stack sous l'avatar), inline desktop */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-start md:justify-end">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{
              background: "rgba(225,48,108,0.10)",
              border: "1px solid rgba(225,48,108,0.25)",
            }}
            title="DMs reçus aujourd'hui"
          >
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--text)" }}
            >
              {daily?.dms_received_today ?? 0}
            </span>
            <span
              className="text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              reçus
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{
              background: "rgba(34,197,94,0.10)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
            title="DMs envoyés aujourd'hui"
          >
            <Send className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--text)" }}
            >
              {daily?.dms_replied_today ?? 0}
            </span>
            <span
              className="text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              replied
            </span>
          </div>

          <a
            href="/agence/instagram"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold no-underline transition-all hover:brightness-110"
            style={{
              background:
                "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
              color: "#fff",
            }}
          >
            Voir Instagram
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

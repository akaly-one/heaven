"use client";

/**
 * AgenceHeader — extended in Phase 3 Agent 3.A (B9 / P0-12 / P1-7).
 *
 * Base shell (Phase 2.B) enriched with:
 *   - Live Instagram enrichment (handle, followers, media count, avatar priority chain).
 *   - IG sync indicator ("synced Xm ago / never") — resolves P0-12 "Sync jamais" +
 *     P1-7 missing sync status pill.
 *   - IgCtaButtons (rose/violet gradient) — Open IG profile + send DM link.
 *
 * Data sources: props flow unchanged for base KPIs (revenue/abo/posts/ret/codes).
 * Live IG + sync time are polled client-side from /api/instagram/profile-stats +
 * /api/instagram/daily-stats so the header stays responsive without forcing a
 * page-level re-render on each tick.
 */

import { useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Link2, RefreshCw } from "lucide-react";
import type { FeedPost, HeavenAuth, AccessCode } from "@/types/heaven";
import { IgCtaButtons } from "./ig-cta-buttons";

const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat("fr-FR");

export interface AgenceHeaderProps {
  modelSlug: string;
  auth: HeavenAuth | null;
  modelInfo: { avatar?: string; online?: boolean; display_name?: string; bio?: string } | null;
  statusUpdating: boolean;
  revenue: number;
  uniqueClients: number;
  activeCodes: AccessCode[];
  modelCodes: AccessCode[];
  feedPosts: FeedPost[];
  retentionRate: number;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onAvatarUpload: (file: File) => void;
  onToggleStatus: () => void;
  /** Optional override when the KPI strip already knows the last sync (avoids double-fetching). */
  lastSyncAtOverride?: string | null;
}

interface IgProfileSnapshot {
  username?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
}

function relativeFromNow(iso: string | null): string {
  if (!iso) return "jamais";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "à l'instant";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "à l'instant";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `il y a ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days}j`;
}

export function AgenceHeader(p: AgenceHeaderProps) {
  const [igProfile, setIgProfile] = useState<IgProfileSnapshot | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(p.lastSyncAtOverride ?? null);
  const [, tick] = useState(0);

  // Cloisonnement CP : passer ?model=<slug> explicite et reset quand le slug
  // change (via RootCpSelector). Sinon leak data du modèle précédent.
  const fetchIg = useCallback(async (slug: string | null) => {
    if (!slug) { setIgProfile(null); setLastSyncAt(null); return; }
    try {
      const qs = `?model=${encodeURIComponent(slug)}`;
      const [pRes, dRes] = await Promise.all([
        fetch(`/api/instagram/profile-stats${qs}`, { cache: "no-store" }),
        fetch(`/api/instagram/daily-stats${qs}`, { cache: "no-store" }),
      ]);
      if (pRes.status === 404) {
        // IG non configuré pour ce modèle (Paloma, Ruby) → empty state propre
        setIgProfile(null);
        setLastSyncAt(null);
        return;
      }
      if (pRes.ok) {
        const json = (await pRes.json()) as IgProfileSnapshot;
        setIgProfile(json);
      } else {
        setIgProfile(null);
      }
      if (dRes.ok) {
        const json = (await dRes.json()) as { last_sync_at: string | null };
        setLastSyncAt(json.last_sync_at);
      } else {
        setLastSyncAt(null);
      }
    } catch {
      setIgProfile(null);
    }
  }, []);

  useEffect(() => {
    // Reset immédiat pour éviter flash du modèle précédent
    setIgProfile(null);
    fetchIg(p.modelSlug || null);
    const poll = setInterval(() => fetchIg(p.modelSlug || null), 60_000);
    return () => clearInterval(poll);
  }, [fetchIg, p.modelSlug]);

  // If the parent surfaces a sync override (e.g. KpiStrip already fetched it) adopt it.
  useEffect(() => {
    if (p.lastSyncAtOverride !== undefined && p.lastSyncAtOverride !== lastSyncAt) {
      setLastSyncAt(p.lastSyncAtOverride);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.lastSyncAtOverride]);

  // Refresh relative-time every 30s so "il y a Xm" stays accurate.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Avatar priority : props.modelInfo.avatar (Cloudinary mirror / upload) → live IG profile pic → initial.
  const avatarSrc = p.modelInfo?.avatar || igProfile?.profile_picture_url || null;
  const handle = igProfile?.username ? `@${igProfile.username}` : null;
  const bio = p.modelInfo?.bio || null;

  return (
    <>
      {/* ══ HEADER ══ */}
      <div className="flex items-start gap-4 py-3">
        <div className="relative shrink-0">
          <label className="cursor-pointer">
            <div
              className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-base font-black"
              style={{
                background: avatarSrc ? "transparent" : "linear-gradient(135deg, #E63329, #E84393)",
                color: "#fff",
              }}
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt={handle || p.modelSlug} className="w-full h-full object-cover" />
              ) : (
                p.modelSlug.charAt(0).toUpperCase()
              )}
            </div>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                p.onAvatarUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={p.onToggleStatus}
            disabled={p.statusUpdating}
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full cursor-pointer transition-all border-none p-0 disabled:opacity-50"
            style={{
              background: p.modelInfo?.online ? "#10B981" : "#6B7280",
              boxShadow: `0 0 0 2.5px var(--bg)`,
            }}
          />
        </div>

        <div className="flex flex-col min-w-0 shrink-0 gap-0.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg font-bold text-white truncate">
              {p.modelInfo?.display_name || p.auth?.display_name || p.modelSlug.toUpperCase()}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: p.modelInfo?.online ? "#10B981" : "#6B7280" }}
            />
            <span className="text-xs text-white/30 shrink-0 hidden sm:inline">
              {p.modelInfo?.online ? "en ligne" : "hors ligne"}
            </span>
          </div>
          {handle && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-semibold" style={{ color: "#E1306C" }}>{handle}</span>
              {typeof igProfile?.followers_count === "number" && (
                <span className="text-white/40 tabular-nums">
                  {fmtNum.format(igProfile.followers_count)} fol.
                </span>
              )}
              {typeof igProfile?.media_count === "number" && (
                <>
                  <span className="text-white/15">·</span>
                  <span className="text-white/40 tabular-nums">{igProfile.media_count} posts</span>
                </>
              )}
            </div>
          )}
          {bio && (
            <span className="text-[11px] text-white/35 line-clamp-1 max-w-[320px]" title={bio}>
              {bio}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-[10px]" title="Dernière synchronisation Instagram">
            <RefreshCw className="w-3 h-3 text-white/30" />
            <span className="text-white/30">Sync IG {relativeFromNow(lastSyncAt)}</span>
          </div>
        </div>

        {/* Mobile compact KPI */}
        <div className="flex md:hidden items-center gap-1.5 ml-auto shrink-0">
          <span className="text-[11px] font-black tabular-nums" style={{ color: "#D4AF37" }}>
            {fmt.format(p.revenue)}
          </span>
          <span className="text-white/10">·</span>
          <span className="text-[11px] font-bold tabular-nums text-white">
            {fmtNum.format(p.uniqueClients)}
            <span className="text-white/25 text-[9px] ml-0.5">abo</span>
          </span>
          <span className="text-white/10">·</span>
          <span className="text-[11px] font-bold tabular-nums text-white">
            {p.activeCodes.length}
            <span className="text-white/25 text-[9px]">/{p.modelCodes.length}</span>
          </span>
        </div>

        <div className="flex-1 hidden md:block" />
        <div className="hidden md:flex items-center gap-0 overflow-x-auto no-scrollbar shrink-0">
          {[
            { label: "Rev", value: fmt.format(p.revenue), color: "#D4AF37" },
            { label: "Abo", value: String(p.uniqueClients), color: "var(--text)" },
            { label: "Posts", value: String(p.feedPosts.length), color: "var(--text)" },
            { label: "Ret", value: `${p.retentionRate}%`, color: "var(--text)" },
            { label: "Codes", value: `${p.activeCodes.length}/${p.modelCodes.length}`, color: "var(--text)" },
          ].map((kpi, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5">
              {i > 0 && <div className="w-px h-3.5 bg-white/[0.06] mr-1.5" />}
              <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">{kpi.label}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: kpi.color }}>
                {kpi.value}
              </span>
            </div>
          ))}
        </div>

        <IgCtaButtons username={igProfile?.username || null} />

        <button
          onClick={p.onToggleStatus}
          disabled={p.statusUpdating}
          className="hidden md:inline-flex px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border border-white/[0.06] bg-transparent shrink-0 disabled:opacity-50"
          style={{ color: p.modelInfo?.online ? "#10B981" : "#6B7280" }}
        >
          {p.statusUpdating ? "..." : p.modelInfo?.online ? "En ligne" : "Hors ligne"}
        </button>
      </div>

      {/* ══ UNDERLINE TABS + shortcuts ══ */}
      <div className="flex items-center gap-4 md:gap-7 border-b border-white/[0.06]">
        <div className="flex items-center gap-4 md:gap-7 overflow-x-auto no-scrollbar">
          {p.tabs.map((tab) => {
            const isActive = p.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => p.onTabChange(tab.id)}
                className="relative pb-3 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap bg-transparent border-none px-0"
                style={{ color: isActive ? "#D4AF37" : "var(--w35)" }}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#D4AF37" }} />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-0.5 pb-1 shrink-0">
          <a
            href={`/m/${p.modelSlug}`}
            target="_blank"
            rel="noopener"
            className="p-1.5 rounded-md no-underline transition-all hover:bg-white/[0.06]"
            title="Voir profil public"
          >
            <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--w3)" }} />
          </a>
          <a
            href={`/m/${p.modelSlug}?edit=true`}
            target="_blank"
            rel="noopener"
            className="p-1.5 rounded-md no-underline transition-all hover:bg-white/[0.06]"
            title="Modifier profil"
          >
            <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--w3)" }} />
          </a>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("heaven:toggle-socials"))}
            className="p-1.5 rounded-md transition-all hover:bg-white/[0.06] cursor-pointer border-none bg-transparent"
            title="Liens sociaux"
          >
            <Link2 className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--w3)" }} />
          </button>
        </div>
      </div>
    </>
  );
}

export default AgenceHeader;

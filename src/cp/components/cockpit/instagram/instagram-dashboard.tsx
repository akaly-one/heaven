"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Instagram,
  Image as ImageIcon,
  MessageSquare,
  Settings,
  ArrowRight,
} from "lucide-react";
import { ModeToggle } from "./ig-mode-toggle";
import { InstagramMediaGrid } from "./ig-media-grid";
import { InstagramCommentsList } from "./ig-comments-list";
import { InstagramConfigPanel } from "./ig-config-panel";

type Mode = "agent" | "human";
type Tab = "posts" | "comments" | "config";

interface ProfileStats {
  username?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
}

function formatNumber(n?: number): string {
  if (typeof n !== "number") return "—";
  if (n >= 1000) {
    const v = n / 1000;
    return v >= 10 ? `${Math.round(v)}k` : `${v.toFixed(1)}k`;
  }
  return n.toLocaleString("fr-FR");
}

function formatSyncTime(d: Date | null): string {
  if (!d) return "jamais";
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "il y a quelques secondes";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `il y a ${hrs}h`;
}

export function InstagramDashboard() {
  // Profile stats (header live)
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [, forceRerender] = useState(0);

  const fetchProfileStats = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram/profile-stats");
      if (!res.ok) {
        setProfileError("unavailable");
        return;
      }
      const data: ProfileStats = await res.json();
      setProfileStats(data);
      setProfileError(null);
      setLastSync(new Date());
    } catch {
      setProfileError("unavailable");
    }
  }, []);

  // Mount + 60s polling
  useEffect(() => {
    fetchProfileStats();
    const interval = setInterval(fetchProfileStats, 60_000);
    return () => clearInterval(interval);
  }, [fetchProfileStats]);

  // Rerender every 30s so "il y a X min" stays fresh
  useEffect(() => {
    const t = setInterval(() => forceRerender((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Tab state — default to Posts (conversations moved to unified messagerie)
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  // Global mode (kept for future use on posts/comments if needed)
  const [globalMode, setGlobalMode] = useState<Mode>("agent");

  const tabs: { id: Tab; label: string; icon: typeof Instagram }[] = [
    { id: "posts", label: "Posts", icon: ImageIcon },
    { id: "comments", label: "Commentaires", icon: MessageSquare },
    { id: "config", label: "Config", icon: Settings },
  ];

  // Handle provient de l'API IG profile-stats scopée par model_slug.
  // Pas de fallback hardcodé yumiiiclub — si pas d'IG configurée, on affiche "—".
  const handle: string | null = profileStats?.username || null;
  const followers = profileStats?.followers_count;
  const following = profileStats?.follows_count;
  const mediaCount = profileStats?.media_count;
  const isOnline = !profileError;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg)" }}
    >
      {/* Enriched header */}
      <div
        className="flex items-start justify-between gap-3 px-4 py-3 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-start gap-3 min-w-0">
          {profileStats?.profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileStats.profile_picture_url}
              alt={handle || "Instagram profile"}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
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
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
              }}
            >
              <Instagram className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1
              className="text-sm font-bold leading-tight truncate"
              style={{ color: "var(--text)" }}
            >
              {handle ? `Instagram · @${handle}` : "Instagram non configuré"}
            </h1>
            <div
              className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="tabular-nums">
                <b style={{ color: "var(--text)" }}>
                  {formatNumber(followers)}
                </b>{" "}
                followers
              </span>
              <span>·</span>
              <span className="tabular-nums">
                <b style={{ color: "var(--text)" }}>
                  {formatNumber(following)}
                </b>{" "}
                following
              </span>
              <span>·</span>
              <span className="tabular-nums">
                <b style={{ color: "var(--text)" }}>
                  {formatNumber(mediaCount)}
                </b>{" "}
                posts
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px]">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: isOnline ? "#22C55E" : "#DC2626",
                  boxShadow: isOnline
                    ? "0 0 6px rgba(34,197,94,0.6)"
                    : "none",
                }}
              />
              <span
                style={{
                  color: isOnline ? "#22C55E" : "#DC2626",
                  fontWeight: 500,
                }}
              >
                {isOnline ? "En ligne" : "Hors ligne"}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                · dernière sync {formatSyncTime(lastSync)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 self-start">
          <ModeToggle
            mode={globalMode}
            onChange={setGlobalMode}
            size="sm"
          />
        </div>
      </div>

      {/* Messagerie CTA — conversations moved to unified inbox */}
      <div
        className="px-4 py-2.5 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <a
          href="/agence/messagerie?source=instagram"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold no-underline transition-all hover:brightness-110"
          style={{
            background:
              "linear-gradient(135deg, rgba(131,58,180,0.10), rgba(225,48,108,0.10), rgba(247,119,55,0.08))",
            border: "1px solid rgba(225,48,108,0.25)",
            color: "var(--text)",
          }}
        >
          <span className="flex items-center gap-2">
            <Instagram className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />
            Voir conversations dans Messagerie
          </span>
          <ArrowRight className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />
        </a>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 px-2 py-2 flex-shrink-0 overflow-x-auto scrollbar-hide"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
        role="tablist"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none outline-none transition-all flex-shrink-0"
              style={{
                background: active
                  ? "linear-gradient(135deg, rgba(131,58,180,0.15), rgba(225,48,108,0.15), rgba(247,119,55,0.15))"
                  : "transparent",
                color: active ? "#E1306C" : "var(--text-muted)",
                border: active
                  ? "1px solid rgba(225,48,108,0.3)"
                  : "1px solid transparent",
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "posts" && <InstagramMediaGrid />}
        {activeTab === "comments" && <InstagramCommentsList />}
        {activeTab === "config" && <InstagramConfigPanel />}
      </div>
    </div>
  );
}

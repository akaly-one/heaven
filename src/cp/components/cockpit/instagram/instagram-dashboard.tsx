"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Instagram,
  MessageCircle,
  Image as ImageIcon,
  MessageSquare,
  Settings,
} from "lucide-react";
import { ConversationList } from "./ig-conversation-list";
import { ChatView } from "./ig-chat-view";
import { ModeToggle } from "./ig-mode-toggle";
import { StatsBar } from "./ig-stats-bar";
import { InstagramMediaGrid } from "./ig-media-grid";
import { InstagramCommentsList } from "./ig-comments-list";
import { InstagramConfigPanel } from "./ig-config-panel";
import type { IgConversation } from "./ig-stats-bar";

type Mode = "agent" | "human";
type Tab = "conversations" | "posts" | "comments" | "config";

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

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("conversations");

  // Global mode (shared across conversations)
  const [globalMode, setGlobalMode] = useState<Mode>("agent");

  // Conversations state (kept here so unread badge stays accurate across tabs)
  const [conversations, setConversations] = useState<IgConversation[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // silent fail — will retry on next interval
    } finally {
      setConversationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const unreadCount = conversations.filter((c) => c.unread).length;

  const tabs: { id: Tab; label: string; icon: typeof Instagram }[] = [
    { id: "conversations", label: "Conversations", icon: MessageCircle },
    { id: "posts", label: "Posts", icon: ImageIcon },
    { id: "comments", label: "Commentaires", icon: MessageSquare },
    { id: "config", label: "Config", icon: Settings },
  ];

  const handle = profileStats?.username || "yumiiiclub";
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
              alt={handle}
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
              Instagram · @{handle}
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
          const showBadge =
            tab.id === "conversations" && unreadCount > 0;
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
              {showBadge && (
                <span
                  className="text-[10px] font-bold text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 tabular-nums"
                  style={{
                    background: "#E1306C",
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "conversations" && (
          <ConversationsTab
            conversations={conversations}
            loaded={conversationsLoaded}
            globalMode={globalMode}
          />
        )}
        {activeTab === "posts" && <InstagramMediaGrid />}
        {activeTab === "comments" && <InstagramCommentsList />}
        {activeTab === "config" && <InstagramConfigPanel />}
      </div>
    </div>
  );
}

// ── Conversations tab (preserves existing layout + stats bar) ──

function ConversationsTab({
  conversations,
  loaded,
  globalMode,
}: {
  conversations: IgConversation[];
  loaded: boolean;
  globalMode: Mode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [convModes, setConvModes] = useState<Record<string, Mode>>({});

  const selected = conversations.find((c) => c.id === selectedId);

  const currentMode = selectedId
    ? convModes[selectedId] ?? selected?.mode ?? globalMode
    : globalMode;

  const handleConvModeChange = (mode: Mode) => {
    if (selectedId) {
      setConvModes((prev) => ({ ...prev, [selectedId]: mode }));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    setMobileShowChat(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div
        className="px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <StatsBar conversations={conversations} />
      </div>

      {/* Main content — split pane */}
      <div className="flex flex-1 min-h-0">
        {!loaded && (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--border2)",
                borderTopColor: "#E1306C",
              }}
            />
          </div>
        )}

        {loaded && (
          <>
            {/* Left panel — conversation list */}
            <div
              className={`w-full md:w-[30%] md:min-w-[280px] md:max-w-[360px] flex-shrink-0 ${
                mobileShowChat ? "hidden md:flex" : "flex"
              } flex-col`}
            >
              <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            </div>

            {/* Right panel — chat view */}
            <div
              className={`flex-1 min-w-0 ${
                !mobileShowChat ? "hidden md:flex" : "flex"
              } flex-col`}
            >
              <ChatView
                conversationId={selectedId}
                username={selected?.ig_username}
                mode={currentMode}
                onModeChange={handleConvModeChange}
                onBack={handleBack}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

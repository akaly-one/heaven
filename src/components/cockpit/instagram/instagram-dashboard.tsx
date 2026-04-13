"use client";

import { useState, useEffect, useCallback } from "react";
import { Instagram } from "lucide-react";
import { ConversationList } from "./ig-conversation-list";
import { ChatView } from "./ig-chat-view";
import { ModeToggle } from "./ig-mode-toggle";
import { StatsBar } from "./ig-stats-bar";
import type { IgConversation } from "./ig-stats-bar";

type Mode = "agent" | "human";

export function InstagramDashboard() {
  const [conversations, setConversations] = useState<IgConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalMode, setGlobalMode] = useState<Mode>("agent");
  const [loading, setLoading] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // silent fail — will retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 15s
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const selected = conversations.find((c) => c.id === selectedId);

  // Per-conversation mode: defaults to globalMode if unset
  const [convModes, setConvModes] = useState<Record<string, Mode>>({});

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
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
            }}
          >
            <Instagram className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1
              className="text-sm font-bold leading-tight"
              style={{ color: "var(--text)" }}
            >
              Instagram Agent
            </h1>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              @yumiiiclub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle mode={globalMode} onChange={setGlobalMode} size="sm" />
        </div>
      </div>

      {/* Stats bar */}
      <div
        className="px-4 py-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <StatsBar conversations={conversations} />
      </div>

      {/* Main content — split pane */}
      <div className="flex flex-1 min-h-0">
        {/* Loading state */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--border2)",
                borderTopColor: "#8B5CF6",
              }}
            />
          </div>
        )}

        {!loading && (
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

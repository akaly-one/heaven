"use client";

import { useState } from "react";
import { Search, Bot, User } from "lucide-react";
import type { IgConversation } from "./ig-stats-bar";

interface ConversationListProps {
  conversations: IgConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}j`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations
    .filter((c) =>
      c.ig_username.toLowerCase().includes(search.toLowerCase())
    )
    .sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime()
    );

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Search */}
      <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full placeholder:opacity-50"
            style={{ color: "var(--text)" }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Aucune conversation
            </p>
          </div>
        )}
        {filtered.map((conv) => {
          const isSelected = conv.id === selectedId;
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className="w-full text-left px-3 py-3 transition-all duration-150 cursor-pointer border-none outline-none"
              style={{
                background: isSelected ? "var(--bg2)" : "transparent",
                borderLeft: isSelected
                  ? "3px solid #8B5CF6"
                  : "3px solid transparent",
                borderBottom: "1px solid var(--border2)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: "var(--text)" }}
                    >
                      @{conv.ig_username}
                    </span>
                    {conv.unread && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "#8B5CF6" }}
                      />
                    )}
                  </div>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {truncate(conv.last_message_preview, 40)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {timeAgo(conv.last_message_at)}
                  </span>
                  <span
                    className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      background:
                        conv.mode === "agent"
                          ? "rgba(99,102,241,0.12)"
                          : "rgba(34,197,94,0.12)",
                      color:
                        conv.mode === "agent" ? "#818CF8" : "#22C55E",
                    }}
                  >
                    {conv.mode === "agent" ? (
                      <Bot className="w-2.5 h-2.5" />
                    ) : (
                      <User className="w-2.5 h-2.5" />
                    )}
                    {conv.mode === "agent" ? "Agent" : "Humain"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

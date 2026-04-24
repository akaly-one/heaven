"use client";

/**
 * <ConversationRow> — BRIEF-02 TICKET-M04 (2026-04-24).
 *
 * Row unique pour liste de conversations. Consommé par :
 *  - Page /agence/messagerie (liste gauche)
 *  - Dropdown header messages (variant="compact")
 *  - Futurs consommateurs (drawer, search results)
 *
 * Règles (UI-STANDARDS §3) :
 *  - Avatar <ConversationAvatar> gauche (size md row, sm dropdown)
 *  - Centre : pseudo + unread pill + mode chip + source dots + tier badge + last msg preview + time ago
 *  - role="option" + aria-selected pour pattern listbox
 *  - Roving tabindex : tabIndex={active ? 0 : -1}
 *  - Touch target ≥ 44px mobile via min-height
 *  - Border-left accent si active
 *
 * Mode chip intégré : callback onModeChange (PUT /api/agence/messaging/mode — câblé par parent).
 */

import { useState, useMemo, type MouseEvent, type KeyboardEvent } from "react";
import { MessageCircle, Instagram, Radio, GraduationCap, UserRound, Sparkles } from "lucide-react";
import {
  getConversationPseudo,
  formatConversationTime,
} from "@/lib/messaging/conversation-display";
import { MODE_LABELS, type AgentMode } from "@/lib/ai-agent/modes";
import { ConversationAvatar } from "./ConversationAvatar";
import type { ConversationListLike } from "@/lib/messaging/types";

interface ConversationRowProps {
  conversation: ConversationListLike;
  active?: boolean;
  onClick?: () => void;
  onModeChange?: (mode: AgentMode | null) => void;
  variant?: "default" | "compact";
  /**
   * Si true : la row expose un `data-testid` avec fan_id pour snapshot Playwright (M07).
   */
  testIdPrefix?: string;
}

export function ConversationRow({
  conversation,
  active = false,
  onClick,
  onModeChange,
  variant = "default",
  testIdPrefix = "conversation-row",
}: ConversationRowProps) {
  const compact = variant === "compact";
  const pseudo = getConversationPseudo(conversation);
  const [modeOpen, setModeOpen] = useState(false);

  const lastMsg = conversation.last_message;
  const preview = useMemo(() => {
    if (!lastMsg?.text) return "—";
    const max = 40;
    const prefix = lastMsg.direction === "out" ? "› " : "";
    const text = lastMsg.text.length > max ? `${lastMsg.text.slice(0, max)}…` : lastMsg.text;
    return `${prefix}${text}`;
  }, [lastMsg]);

  const timeAgo = useMemo(() => {
    const iso = conversation.last_message_at || lastMsg?.created_at;
    return iso ? formatConversationTime(iso) : "";
  }, [conversation.last_message_at, lastMsg?.created_at]);

  const unread = conversation.unread_count || 0;
  const sources = conversation.sources || [];
  const tier = conversation.tier && conversation.tier !== "free" ? conversation.tier : null;

  const handleClick = () => {
    if (modeOpen) return; // bloque la sélection si popover mode ouvert
    onClick?.();
  };

  const handleKey = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <li
      role="option"
      aria-selected={active}
      aria-label={`Conversation avec ${pseudo}, ${unread} non lus, dernier message ${timeAgo}`}
      tabIndex={active ? 0 : -1}
      data-testid={testIdPrefix}
      data-fan-id={conversation.fan_id}
      onClick={handleClick}
      onKeyDown={handleKey}
      className="flex items-start gap-3 cursor-pointer transition-colors outline-none"
      style={{
        padding: compact ? "10px 12px" : "12px 16px",
        minHeight: compact ? 48 : 56,
        background: active ? "var(--bg2)" : unread > 0 ? "rgba(230,51,41,0.04)" : "transparent",
        borderInlineStart: active ? "2px solid var(--accent)" : "2px solid transparent",
        borderBlockEnd: "1px solid var(--border2)",
      }}
    >
      <ConversationAvatar
        conversation={conversation}
        size={compact ? "sm" : "md"}
        hasUnread={unread > 0}
        touchTargetPx={0}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="font-semibold truncate"
            data-testid="pseudo"
            style={{
              color: "var(--text)",
              fontSize: compact ? 11 : 12,
            }}
          >
            {pseudo}
          </span>

          {unread > 0 && (
            <span
              aria-label={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`}
              className="shrink-0 inline-flex items-center justify-center px-1 rounded-full font-bold"
              style={{
                minWidth: 18,
                height: 18,
                background: "var(--accent)",
                color: "#fff",
                fontSize: 10,
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}

          {/* Mode chip — visible si agent_mode prop défini (peut être null = défaut persona) */}
          {onModeChange && conversation.agent_mode !== undefined && (
            <AgentModeChip
              mode={conversation.agent_mode}
              size={compact ? "sm" : "sm"}
              open={modeOpen}
              onToggle={() => setModeOpen((o) => !o)}
              onChoose={(next) => {
                setModeOpen(false);
                onModeChange?.(next);
              }}
            />
          )}

          <span
            className="tabular-nums shrink-0 ml-auto"
            style={{ color: "var(--text-muted)", fontSize: compact ? 10 : 10 }}
          >
            {timeAgo}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          <SourceDots sources={sources} />
          {tier && (
            <span
              className="px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold"
              style={{
                fontSize: 9,
                background: "rgba(201,168,76,0.15)",
                color: "#D4AF37",
              }}
            >
              {tier}
            </span>
          )}
        </div>

        <p
          className="truncate"
          style={{
            fontSize: 11,
            color: unread > 0 ? "var(--text)" : "var(--text-muted)",
            fontWeight: unread > 0 ? 600 : 400,
          }}
        >
          {preview}
        </p>
      </div>
    </li>
  );
}

// ─── AgentModeChip (pill cliquable + popover 3 choix) ────────────────────
interface AgentModeChipProps {
  mode: AgentMode | null; // null = défaut persona (hérité)
  size?: "sm" | "md";
  open: boolean;
  onToggle: () => void;
  onChoose: (mode: AgentMode | null) => void;
}

export function AgentModeChip({ mode, size = "sm", open, onToggle, onChoose }: AgentModeChipProps) {
  const active: AgentMode = mode ?? "auto";
  const meta = MODE_LABELS[active];
  const Icon = active === "auto" ? Radio : active === "copilot" ? GraduationCap : UserRound;
  const pxIcon = size === "sm" ? 12 : 14;
  const fontSize = size === "sm" ? 10 : 11;
  const pad = size === "sm" ? "3px 7px" : "5px 10px";

  const stopAndToggle = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };

  return (
    <span className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={stopAndToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Mode agent : ${meta.label}${mode === null ? " (défaut persona)" : ""}`}
        title={`Mode : ${meta.label}${mode === null ? " (défaut persona)" : ""}`}
        className="inline-flex items-center gap-1 rounded-md font-semibold transition-colors"
        style={{
          padding: pad,
          fontSize,
          background: `${meta.color}15`,
          color: meta.color,
          border: `1px solid ${meta.color}40`,
          minHeight: 24,
        }}
      >
        <Icon width={pxIcon} height={pxIcon} aria-hidden />
        <span className="hidden sm:inline">{meta.short}</span>
        {mode === null && <span className="opacity-60 ml-0.5">·</span>}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          />
          <div
            role="listbox"
            aria-label="Choix du mode agent"
            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
            style={{
              minWidth: 220,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border2)" }}>
              <p
                className="uppercase tracking-wider font-bold"
                style={{ fontSize: 10, color: "var(--text-muted)" }}
              >
                Mode agent
              </p>
            </div>
            {(["auto", "copilot", "user"] as AgentMode[]).map((m) => {
              const ModeIcon = m === "auto" ? Radio : m === "copilot" ? GraduationCap : UserRound;
              const selected = mode === m;
              const metaM = MODE_LABELS[m];
              return (
                <button
                  key={m}
                  role="option"
                  aria-selected={selected}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChoose(m);
                  }}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left cursor-pointer hover:brightness-110"
                  style={{
                    background: selected ? `${metaM.color}15` : "transparent",
                    minHeight: 44,
                    border: "none",
                  }}
                >
                  <ModeIcon
                    width={14}
                    height={14}
                    style={{ color: metaM.color, marginTop: 2, flexShrink: 0 }}
                    aria-hidden
                  />
                  <span className="flex-1 min-w-0">
                    <span
                      className="block font-bold"
                      style={{ fontSize: 11, color: selected ? metaM.color : "var(--text)" }}
                    >
                      {metaM.label}
                    </span>
                    <span
                      className="block leading-snug"
                      style={{ fontSize: 10, color: "var(--text-muted)" }}
                    >
                      {metaM.description.slice(0, 80)}
                      {metaM.description.length > 80 ? "…" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
            {mode !== null && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChoose(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 border-t cursor-pointer hover:brightness-110"
                style={{
                  borderColor: "var(--border2)",
                  color: "var(--text-muted)",
                  minHeight: 44,
                  background: "transparent",
                  border: "none",
                  borderTop: "1px solid var(--border2)",
                }}
              >
                <Sparkles width={12} height={12} aria-hidden />
                <span style={{ fontSize: 10 }}>Retour au défaut persona</span>
              </button>
            )}
          </div>
        </>
      )}
    </span>
  );
}

// ─── SourceDots (web + instagram) ────────────────────────────────────────
function SourceDots({ sources }: { sources: ("web" | "instagram")[] }) {
  if (!sources.length) return null;
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {sources.includes("web") && (
        <span
          title="Canal Web"
          className="inline-flex items-center justify-center rounded-full"
          style={{
            width: 14,
            height: 14,
            background: "rgba(107,114,128,0.18)",
          }}
        >
          <MessageCircle width={8} height={8} style={{ color: "#9CA3AF" }} />
        </span>
      )}
      {sources.includes("instagram") && (
        <span
          title="Canal Instagram"
          className="inline-flex items-center justify-center rounded-full"
          style={{
            width: 14,
            height: 14,
            background:
              "linear-gradient(135deg, rgba(131,58,180,0.22), rgba(225,48,108,0.22), rgba(247,119,55,0.22))",
          }}
        >
          <Instagram width={8} height={8} style={{ color: "#E1306C" }} />
        </span>
      )}
    </span>
  );
}

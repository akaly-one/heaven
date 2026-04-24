"use client";

/**
 * <MessageBubble> — BRIEF-02 TICKET-M05 (2026-04-24).
 *
 * Bulle de chat unique pour thread messagerie. Remplace à terme les bulles
 * hardcodées dans fan-timeline.tsx (refactor M05.1 Phase 3).
 *
 * Règles styling iMessage (UI-STANDARDS §4) :
 *  - fan              : bg var(--bg), border 1px, text var(--text), align gauche
 *  - model_web        : bg #30D158 (imessage-green), text white, align droite
 *  - model_instagram  : bg #0A84FF (imessage-blue), text white, align droite
 *  - agent_ai         : même couleur que model_{canal} + icône Sparkles coin sup-droit
 *  - agent_draft      : border dashed + bot icon, text muted, opacity 0.7
 *  - system           : centré, text muted, 11px
 *
 * A11y :
 *  - Container parent doit être role="log" aria-live="polite"
 *  - Bulles : role="listitem" (parent peut être role="list")
 *  - Actions copy/retry : touch 44px + aria-label
 */

import { useCallback, type CSSProperties } from "react";
import { Sparkles, Bot, Instagram, Copy, RefreshCw } from "lucide-react";
import { ConversationAvatarModel } from "./ConversationAvatar";
import type { MessageActor } from "@/lib/messaging/types";

export type { MessageActor };

interface MessageBubbleProps {
  actor: MessageActor;
  content: string;
  createdAt: string;
  /** Photo modèle (pour bulles outbound avec avatar visible). */
  avatarSrc?: string | null;
  /** Nom modèle (pour fallback initiale et alt). */
  avatarName?: string | null;
  /** Si false, avatar caché (cluster middle/end) — spacer invisible pour alignement. */
  showAvatar?: boolean;
  /** Présent si actor === "agent_ai" ou "agent_draft" — permet de linker vers ai_runs. */
  aiRunId?: string | null;
  onRetry?: () => void;
  onCopy?: () => void;
  mediaUrl?: string | null;
  /** Test ID optionnel pour Playwright. */
  testId?: string;
}

export function MessageBubble({
  actor,
  content,
  createdAt,
  avatarSrc,
  avatarName,
  showAvatar = true,
  aiRunId,
  onRetry,
  onCopy,
  mediaUrl,
  testId,
}: MessageBubbleProps) {
  // System = ligne centrée sans bulle
  if (actor === "system") {
    return (
      <div
        role="listitem"
        data-testid={testId}
        className="flex justify-center py-2"
      >
        <span
          className="italic"
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          {content}
        </span>
      </div>
    );
  }

  const isOut = actor !== "fan";
  const isAgent = actor === "agent_ai" || actor === "agent_draft";
  const isDraft = actor === "agent_draft";
  const isInstagram = actor === "model_instagram";
  const isWebOrAgent = actor === "model_web" || actor === "agent_ai";

  // Background selon actor
  let bubbleBg = "var(--bg)";
  let bubbleColor = "var(--text)";
  let bubbleBorder = "1px solid var(--border)";
  let bubbleBorderStyle: CSSProperties["borderStyle"] = "solid";

  if (actor === "model_web") {
    bubbleBg = "var(--imessage-green)";
    bubbleColor = "#fff";
    bubbleBorder = "none";
  } else if (actor === "model_instagram") {
    bubbleBg = "var(--imessage-blue)";
    bubbleColor = "#fff";
    bubbleBorder = "none";
  } else if (actor === "agent_ai") {
    // Agent IA = même couleur que modèle sur son canal
    bubbleBg = isInstagram ? "var(--imessage-blue)" : "var(--imessage-green)";
    bubbleColor = "#fff";
    bubbleBorder = "none";
  } else if (actor === "agent_draft") {
    bubbleBg = "transparent";
    bubbleColor = "var(--text-muted)";
    bubbleBorder = "1px dashed var(--text-muted)";
    bubbleBorderStyle = "dashed";
  }

  const time = formatTime(createdAt);
  const fullTime = formatFullTime(createdAt);

  const handleCopy = useCallback(() => {
    if (onCopy) return onCopy();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(content).catch(() => {});
    }
  }, [content, onCopy]);

  return (
    <div
      role="listitem"
      data-testid={testId}
      data-actor={actor}
      data-ai-run-id={aiRunId || undefined}
      className={`flex items-end gap-2 ${isOut ? "justify-end" : "justify-start"}`}
      style={{ marginBottom: 4 }}
    >
      {/* Avatar inbound (fan) — à gauche */}
      {!isOut && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar && (
            <ConversationAvatarModel
              avatarUrl={null}
              name={avatarName || "?"}
              size="sm"
            />
          )}
        </div>
      )}

      <div
        style={{
          maxWidth: "75%",
          display: "flex",
          flexDirection: "column",
          alignItems: isOut ? "flex-end" : "flex-start",
        }}
      >
        <div
          className="relative rounded-2xl"
          style={{
            background: bubbleBg,
            color: bubbleColor,
            border: bubbleBorder,
            borderStyle: bubbleBorderStyle,
            padding: "10px 14px",
            borderBottomRightRadius: isOut ? 4 : 16,
            borderBottomLeftRadius: isOut ? 16 : 4,
            opacity: isDraft ? 0.75 : 1,
            wordBreak: "break-word",
          }}
        >
          {/* Sparkle indicator pour agent_ai */}
          {actor === "agent_ai" && (
            <Sparkles
              aria-hidden
              width={11}
              height={11}
              style={{
                position: "absolute",
                top: 4,
                right: 6,
                color: "#fff",
                opacity: 0.85,
              }}
            />
          )}

          {/* Bot icon + label pour agent_draft */}
          {actor === "agent_draft" && (
            <span
              className="inline-flex items-center gap-1 mb-1"
              style={{ fontSize: 9, opacity: 0.8 }}
            >
              <Bot aria-hidden width={11} height={11} />
              <span className="uppercase tracking-wider font-bold">Brouillon IA</span>
            </span>
          )}

          {/* Badge Instagram mini (discriminator canal IG) */}
          {isInstagram && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: -6,
                right: -4,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
              }}
            >
              <Instagram width={10} height={10} color="#C13584" />
            </span>
          )}

          {mediaUrl && (
            <div style={{ marginBottom: content ? 6 : 0, marginLeft: -6, marginRight: -6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl}
                alt="Media joint"
                style={{
                  maxWidth: "100%",
                  borderRadius: 12,
                  display: "block",
                }}
              />
            </div>
          )}

          {actor !== "agent_draft" ? (
            <p
              className="whitespace-pre-wrap break-words m-0"
              style={{ fontSize: 13, lineHeight: 1.45 }}
            >
              {content}
            </p>
          ) : (
            <p
              className="whitespace-pre-wrap break-words m-0 italic"
              style={{ fontSize: 13, lineHeight: 1.45 }}
            >
              {content}
            </p>
          )}
        </div>

        <div
          className="flex items-center gap-2 mt-1"
          style={{ fontSize: 10, color: "var(--text-muted)" }}
        >
          <time
            dateTime={createdAt}
            title={fullTime}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {time}
          </time>

          {isOut && onCopy !== undefined && (
            <button
              type="button"
              aria-label="Copier le message"
              onClick={handleCopy}
              className="inline-flex items-center justify-center rounded"
              style={{
                minWidth: 24,
                minHeight: 24,
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <Copy width={11} height={11} aria-hidden />
            </button>
          )}

          {isAgent && onRetry && (
            <button
              type="button"
              aria-label="Régénérer la réponse"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded"
              style={{
                minWidth: 24,
                minHeight: 24,
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <RefreshCw width={11} height={11} aria-hidden />
            </button>
          )}

          {aiRunId && (
            <span
              className="opacity-50"
              style={{ fontSize: 9 }}
              title={`AI run ${aiRunId}`}
            >
              #{aiRunId.slice(-6)}
            </span>
          )}
        </div>
      </div>

      {/* Avatar outbound (modèle/agent) — à droite (NB : iMessage standard = avatar GAUCHE de la bulle outbound, mais l'utilisateur se reconnaît sans avatar par la couleur) */}
      {isOut && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {showAvatar && !isDraft && (
            <ConversationAvatarModel
              avatarUrl={avatarSrc}
              name={avatarName || "?"}
              size="sm"
            />
          )}
          {showAvatar && isDraft && (
            <span
              role="img"
              aria-label="Brouillon IA"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px dashed var(--text-muted)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
              }}
            >
              <Bot width={14} height={14} aria-hidden />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers format time ─────────────────────────────────────────────────
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

// ─── Cluster detection helper (à utiliser dans parent via memoisation) ──
export function isClusterStart(
  prev: { actor: MessageActor; created_at: string } | undefined,
  curr: { actor: MessageActor; created_at: string }
): boolean {
  if (!prev) return true;
  if (prev.actor !== curr.actor) return true;
  const deltaMin =
    (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / 60000;
  return deltaMin > 5;
}

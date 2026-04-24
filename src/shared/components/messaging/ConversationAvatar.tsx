"use client";

/**
 * <ConversationAvatar> — BRIEF-02 TICKET-M03 (2026-04-24).
 *
 * Composant shared unique pour avatars de conversations. Consommé par :
 *  - Dropdown header messages (shared/components/header/messages-dropdown.tsx)
 *  - Page /agence/messagerie (ConversationRow + thread header)
 *  - Drawer contact profil
 *  - Dropdown header clients (future M04)
 *
 * Règles (UI-STANDARDS §2) :
 *  - Délègue à `getAvatarStyle` pour couleurs/icône selon plateforme
 *  - A11y : role="img" + aria-label descriptif
 *  - Touch target wrapper ≥ 44px (WCAG 2.5.8) via padding parent de la row
 *  - Icône lucide + aria-hidden (décoratif)
 *  - Fallback photo ou initiale gradient or
 *
 * Export complémentaire : <ConversationAvatarModel> pour bulles outbound (photo modèle).
 */

import type { CSSProperties } from "react";
import { Ghost, Instagram, Globe } from "lucide-react";
import {
  getAvatarStyle,
  getConversationPseudo,
  getConversationPlatform,
  type ConversationLike,
} from "@/lib/messaging/conversation-display";

// Taille nominale de l'avatar (px) — cf UI-STANDARDS §2.3.
export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<AvatarSize, number> = {
  sm: 24, // dropdown cluster
  md: 32, // row listbox
  lg: 40, // thread header / drawer card
  xl: 56, // profil fan hero
};

const ICON_PX: Record<AvatarSize, number> = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
};

const INITIAL_FONT_PX: Record<AvatarSize, number> = {
  sm: 9,
  md: 11,
  lg: 14,
  xl: 18,
};

// Label humain par plateforme pour aria.
const PLATFORM_LABEL: Record<"snap" | "insta" | "web" | "unknown", string> = {
  snap: "Snapchat",
  insta: "Instagram",
  web: "Web",
  unknown: "Inconnu",
};

interface ConversationAvatarProps {
  conversation: ConversationLike & { avatar_url?: string | null };
  size?: AvatarSize;
  hasUnread?: boolean;
  showPlatformBadge?: boolean;
  /** Taille touch-target minimale WCAG 2.5.8 (default 44px). Passer `0` pour désactiver. */
  touchTargetPx?: number;
  className?: string;
}

export function ConversationAvatar({
  conversation,
  size = "md",
  hasUnread = false,
  showPlatformBadge = false,
  touchTargetPx = 44,
  className = "",
}: ConversationAvatarProps) {
  const platform = getConversationPlatform(conversation);
  const style = getAvatarStyle(conversation, { hasUnread });
  const pseudo = getConversationPseudo(conversation);
  const px = SIZE_PX[size];
  const iconPx = ICON_PX[size];
  const initialFontPx = INITIAL_FONT_PX[size];

  const wrapperStyle: CSSProperties =
    touchTargetPx > 0
      ? {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: touchTargetPx,
          minHeight: touchTargetPx,
          flexShrink: 0,
        }
      : { display: "inline-flex", flexShrink: 0 };

  const avatarStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: "50%",
    overflow: "hidden",
    position: "relative",
    background: style.bg,
    color: style.color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  // Branche 1 : platform unknown + avatar_url → photo upload
  const hasPhoto = !!conversation.avatar_url;
  if (platform === "unknown" && hasPhoto) {
    return (
      <span style={wrapperStyle} className={className}>
        <span
          role="img"
          aria-label={`Avatar de ${pseudo}`}
          style={{
            ...avatarStyle,
            background: "linear-gradient(135deg, #E6C974, #9E7C1F)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={conversation.avatar_url || ""}
            alt={pseudo}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </span>
      </span>
    );
  }

  // Branche 2 : initiale gradient or (fallback unknown sans photo)
  if (style.iconKey === "initial") {
    const initial = (pseudo || "?").replace(/^@/, "").charAt(0).toUpperCase();
    return (
      <span style={wrapperStyle} className={className}>
        <span
          role="img"
          aria-label={`Avatar de ${pseudo} — ${PLATFORM_LABEL[platform]}`}
          style={{
            ...avatarStyle,
            background: hasUnread ? style.bg : "linear-gradient(135deg, #E6C974, #9E7C1F)",
            color: hasUnread ? style.color : "#0A0A0C",
            fontWeight: 700,
            fontSize: initialFontPx,
          }}
        >
          {initial}
        </span>
      </span>
    );
  }

  // Branche 3 : icône lucide selon plateforme
  const Icon = style.iconKey === "snap" ? Ghost : style.iconKey === "insta" ? Instagram : Globe;

  return (
    <span style={wrapperStyle} className={className}>
      <span
        role="img"
        aria-label={`Avatar de ${pseudo} — ${PLATFORM_LABEL[platform]}`}
        style={avatarStyle}
      >
        <Icon aria-hidden width={iconPx} height={iconPx} />
        {showPlatformBadge && <PlatformBadge platform={platform} />}
      </span>
    </span>
  );
}

// ─── Variant photo modèle (bulle outbound) ────────────────────────────────
// Utilisée pour afficher l'avatar photo du modèle à côté d'une bulle sortante.
// Délibérément séparée car ne prend pas un `ConversationLike` (c'est le modèle,
// pas le fan).
interface ConversationAvatarModelProps {
  avatarUrl?: string | null;
  name: string;
  size?: AvatarSize;
  showPlatformBadge?: "instagram" | "web" | false;
  className?: string;
}

export function ConversationAvatarModel({
  avatarUrl,
  name,
  size = "sm",
  showPlatformBadge = false,
  className = "",
}: ConversationAvatarModelProps) {
  const px = SIZE_PX[size];
  const initialFontPx = INITIAL_FONT_PX[size];
  const initial = (name || "?").replace(/^@/, "").charAt(0).toUpperCase();

  const avatarStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: "50%",
    overflow: "hidden",
    position: "relative",
    background: "linear-gradient(135deg, #E6C974, #9E7C1F)",
    color: "#0A0A0C",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontWeight: 700,
    fontSize: initialFontPx,
  };

  return (
    <span
      role="img"
      aria-label={`Avatar modèle ${name}`}
      style={avatarStyle}
      className={className}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span>{initial}</span>
      )}
      {showPlatformBadge && (
        <PlatformBadge platform={showPlatformBadge === "instagram" ? "insta" : "web"} />
      )}
    </span>
  );
}

// ─── Badge plateforme mini (coin bas-droit) ──────────────────────────────
function PlatformBadge({ platform }: { platform: "snap" | "insta" | "web" | "unknown" }) {
  const Icon =
    platform === "snap" ? Ghost : platform === "insta" ? Instagram : platform === "web" ? Globe : null;
  if (!Icon) return null;

  const color =
    platform === "snap" ? "#FFFC00" : platform === "insta" ? "#C13584" : "#9CA3AF";

  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        right: -2,
        bottom: -2,
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon width={8} height={8} color={color} />
    </span>
  );
}

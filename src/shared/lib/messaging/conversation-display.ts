/**
 * Règles d'affichage unifiées pour les conversations — NB 2026-04-24.
 *
 * Source de vérité unique utilisée par :
 *  - Header dropdown (src/shared/components/header/messages-dropdown.tsx)
 *  - Page messagerie (src/app/agence/messagerie/page.tsx)
 *
 * Garantit que le même fan apparaît avec le MÊME pseudo + MÊME avatar + MÊME couleur
 * dans les deux vues (la bulle header = raccourci vers messagerie, pas un univers séparé).
 */

export type ConversationPlatform = "snap" | "insta" | "web" | "unknown";

export interface ConversationLike {
  fan_id?: string;
  pseudo_snap?: string | null;
  pseudo_insta?: string | null;
  pseudo_web?: string | null;
  fanvue_handle?: string | null;
  display_name?: string | null;
}

// ─── Platform detection ─────────────────────────────────────────────
export function getConversationPlatform(c: ConversationLike): ConversationPlatform {
  if (c.pseudo_snap) return "snap";
  if (c.pseudo_insta) return "insta";
  if (c.pseudo_web) return "web";
  return "unknown";
}

// ─── Pseudo resolver (cœur de la norme) ──────────────────────────────
// Priorité: Snap → Insta → pseudo_web (visiteur-NNN) → fallback stable basé sur fan_id
export function getConversationPseudo(c: ConversationLike): string {
  if (c.pseudo_insta) return `@${c.pseudo_insta}`;
  if (c.pseudo_snap) return c.pseudo_snap;
  if (c.pseudo_web) return c.pseudo_web;
  if (c.fanvue_handle) return c.fanvue_handle;

  // Fallback : si fan_id préfixé "pseudo:", extrait les 4 derniers chars du suffix
  if (c.fan_id?.startsWith("pseudo:")) {
    const suffix = c.fan_id.slice("pseudo:".length);
    return `visiteur-${suffix.slice(-4).toLowerCase()}`;
  }
  if (c.fan_id) return `visiteur-${c.fan_id.slice(-4).toLowerCase()}`;
  return c.display_name || "visiteur";
}

// ─── Avatar style (couleur + icône lucide-react key) ─────────────────
export interface AvatarStyle {
  platform: ConversationPlatform;
  bg: string;
  color: string;
  iconKey: "snap" | "insta" | "web" | "initial"; // quelle icône rendre côté composant
}

export function getAvatarStyle(c: ConversationLike, opts?: { hasUnread?: boolean }): AvatarStyle {
  const platform = getConversationPlatform(c);
  switch (platform) {
    case "snap":
      return { platform, bg: "rgba(255,252,0,0.12)", color: "#FFFC00", iconKey: "snap" };
    case "insta":
      return { platform, bg: "rgba(193,53,132,0.12)", color: "#C13584", iconKey: "insta" };
    case "web":
      return { platform, bg: "rgba(156,163,175,0.12)", color: "#9CA3AF", iconKey: "web" };
    default:
      return {
        platform,
        bg: opts?.hasUnread ? "rgba(230,51,41,0.12)" : "rgba(0,0,0,0.06)",
        color: opts?.hasUnread ? "var(--accent)" : "var(--text-muted)",
        iconKey: "initial",
      };
  }
}

// ─── External URL (null si pas d'upgrade) ─────────────────────────────
// NB : web visitor → null, il faut d'abord upgrade son pseudo.
export function getExternalUrl(c: ConversationLike): string | null {
  if (c.pseudo_snap) return `https://snapchat.com/add/${c.pseudo_snap}`;
  if (c.pseudo_insta) return `https://instagram.com/${c.pseudo_insta.replace(/^@/, "")}`;
  return null;
}

// ─── Sort/format helpers pour conversations ───────────────────────────
export function conversationSortKey(c: { last_message_at?: string; last_message?: { created_at?: string } | null }): number {
  const t = c.last_message_at || c.last_message?.created_at;
  return t ? new Date(t).getTime() : 0;
}

export function formatConversationTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mn = Math.floor(diff / 60000);
  if (mn < 1) return "à l'instant";
  if (mn < 60) return `${mn}m`;
  const h = Math.floor(mn / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Règles d'affichage unifiées pour les conversations — NB 2026-04-24.
 *
 * Source de vérité unique utilisée par :
 *  - Header dropdown (src/shared/components/header/messages-dropdown.tsx)
 *  - Header dropdown clients (src/shared/components/header/clients-dropdown.tsx)
 *  - Page messagerie (src/app/agence/messagerie/page.tsx)
 *
 * Garantit que le même fan apparaît avec le MÊME pseudo + MÊME avatar + MÊME couleur
 * dans les deux vues (la bulle header = raccourci vers messagerie, pas un univers séparé).
 *
 * ▸ Spec complète : plans/modules/messagerie-contacts/UI-STANDARDS-v1.2026-04-24.md
 */

export type ConversationPlatform = "snap" | "insta" | "web" | "unknown";

/**
 * Type strict pour les handles rendus à l'écran.
 * - `@xxx` : handle externe (Insta / Snap / Fanvue) — TOUJOURS préfixé `@`
 * - `visiteur-xxxx` : visiteur web anonyme — JAMAIS préfixé `@`
 * - `guest-xxxx` : variante legacy alternative — JAMAIS préfixé `@`
 */
export type Handle =
  | `@${string}`
  | `visiteur-${string}`
  | `guest-${string}`
  | "visiteur";

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
  if (c.pseudo_insta) return "insta";
  if (c.pseudo_snap) {
    // Si snap contient un pseudo anonyme (visiteur/guest), considérer comme web
    if (/^(visiteur|guest)/i.test(c.pseudo_snap)) return "web";
    return "snap";
  }
  if (c.pseudo_web) return "web";
  return "unknown";
}

// ─── Pseudo resolver (cœur de la norme) ──────────────────────────────
//
// RÈGLE UNIQUE 2026-04-24 :
//  1. pseudo_insta → `@<clean>` (strip @ existant, puis re-préfixe pour éviter `@@`)
//  2. pseudo_snap  → `@<clean>` SAUF si ressemble à `visiteur-NNN` ou `guest-XXX` → conservé tel quel
//  3. pseudo_web   → tel quel (déjà formaté visiteur-NNN)
//  4. fanvue_handle→ `@<clean>`
//  5. Fallback fan_id préfixé "pseudo:" → `visiteur-<last4 lowercase>`
//  6. Fallback fan_id plain UUID → `visiteur-<last4 lowercase>`
//  7. Ultime fallback → display_name ou "visiteur"
//
// INVARIANT : TOUJOURS `@` pour les handles externes (Insta/Snap réel/Fanvue),
//             JAMAIS `@` pour les pseudos anonymes (visiteur-NNN / guest-XXX).
export function getConversationPseudo(c: ConversationLike): Handle | string {
  if (c.pseudo_insta) {
    const clean = c.pseudo_insta.replace(/^@/, "");
    return `@${clean}` as const;
  }
  if (c.pseudo_snap) {
    // Les visiteurs anonymes peuvent être stockés dans pseudo_snap avec format
    // visiteur-NNN ou guest-XXX (legacy). Ceux-là ne prennent PAS de @.
    const isAnon = /^(visiteur|guest)/i.test(c.pseudo_snap);
    if (isAnon) return c.pseudo_snap;
    const clean = c.pseudo_snap.replace(/^@/, "");
    return `@${clean}` as const;
  }
  if (c.pseudo_web) return c.pseudo_web;
  if (c.fanvue_handle) {
    const clean = c.fanvue_handle.replace(/^@/, "");
    return `@${clean}` as const;
  }

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
// Les pseudos anonymes (visiteur-NNN / guest-XXX) stockés dans pseudo_snap
// ne doivent PAS générer d'URL Snapchat valide.
export function getExternalUrl(c: ConversationLike): string | null {
  if (c.pseudo_snap && !/^(visiteur|guest)/i.test(c.pseudo_snap)) {
    const clean = c.pseudo_snap.replace(/^@/, "");
    return `https://snapchat.com/add/${clean}`;
  }
  if (c.pseudo_insta) return `https://instagram.com/${c.pseudo_insta.replace(/^@/, "")}`;
  if (c.fanvue_handle) return `https://fanvue.com/${c.fanvue_handle.replace(/^@/, "")}`;
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

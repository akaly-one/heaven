"use client";

/**
 * HeavenAdminActions — BRIEF-19 (Session 2026-04-25 evening)
 * ──────────────────────────────────────────────────────────
 * Sous-composant 4 boutons icon-only réutilisable dans :
 * - Header CP global (`src/shared/components/header.tsx`)
 * - HeaderBar profil admin (`src/app/m/[slug]/page.tsx` quand `isModelLoggedInActual`)
 *
 * Cohérence cross-vue (synergie CP↔Profil §13.1 protocole) : les mêmes 4 boutons
 * apparaissent partout où l'admin a besoin d'agir rapidement.
 *
 * Responsive mobile-first : touch targets 44×44 minimum, icônes adaptatives.
 */

import { Eye, Link2, KeyRound, ImagePlus } from "lucide-react";

interface HeavenAdminActionsProps {
  /** Slug du modèle actuel (pour le lien Eye → /m/[slug]). */
  modelSlug: string;
  /** Override du click Key (par défaut dispatch event `heaven:generate`). */
  onKeyClick?: () => void;
  /** Click Story (mount le StoryGeneratorModal côté parent). */
  onStoryClick?: () => void;
  /** Espacement compact pour profil mobile (default true). */
  compact?: boolean;
}

export function HeavenAdminActions({
  modelSlug,
  onKeyClick,
  onStoryClick,
  compact = true,
}: HeavenAdminActionsProps) {
  const gap = compact ? "gap-0.5 sm:gap-1" : "gap-1 sm:gap-1.5";
  const btnSize = "p-2 sm:p-1.5"; // touch target 44×44 mobile, plus compact desktop
  const iconSize = "w-4 h-4 sm:w-4 sm:h-4";

  return (
    <div className={`flex items-center ${gap}`} role="group" aria-label="Actions admin">
      {/* Voir profil public */}
      <a
        href={`/m/${modelSlug.toLowerCase()}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Voir profil public"
        aria-label="Voir profil public"
        className={`${btnSize} rounded-md no-underline transition-all hover:bg-white/[0.06]`}
      >
        <Eye className={iconSize} style={{ color: "var(--w3)" }} />
      </a>

      {/* Liens sociaux (toggle SocialsDropdown via event) */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("heaven:toggle-socials"))}
        title="Liens sociaux"
        aria-label="Liens sociaux"
        className={`${btnSize} rounded-md transition-all hover:bg-white/[0.06] cursor-pointer border-none bg-transparent`}
      >
        <Link2 className={iconSize} style={{ color: "var(--w3)" }} />
      </button>

      {/* Générer code d'accès (ouvre GenerateModal via event existant) */}
      <button
        type="button"
        onClick={onKeyClick ?? (() => window.dispatchEvent(new CustomEvent("heaven:generate")))}
        title="Générer code d'accès"
        aria-label="Générer code d'accès"
        className={`${btnSize} rounded-md transition-all hover:bg-white/[0.06] cursor-pointer border-none bg-transparent`}
      >
        <KeyRound className={iconSize} style={{ color: "var(--w3)" }} />
      </button>

      {/* Générer story (mount StoryGeneratorModal côté parent) */}
      <button
        type="button"
        onClick={onStoryClick}
        title="Générer story"
        aria-label="Générer story"
        className={`${btnSize} rounded-md transition-all hover:bg-white/[0.06] cursor-pointer border-none bg-transparent`}
      >
        <ImagePlus className={iconSize} style={{ color: "var(--w3)" }} />
      </button>
    </div>
  );
}

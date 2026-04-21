"use client";

// ══════════════════════════════════════════════
//  ModeBadge — indicateur visuel du mode d'accès courant
//  Phase 10 Agent 10.B (B5 — 4 modes d'accès)
//
//  Affiche un badge compact dans le header avec le mode actif :
//  - dev    → rouge (compte root sans model_id)
//  - agence → gradient Heaven (yumi admin m1)
//  - model  → couleur modèle (paloma/ruby)
//  - public → pas de badge (null) — règle P0 anti-leak
//
//  Règle P0 sécurité : le badge ne s'affiche JAMAIS en mode public,
//  aucune fuite d'info "vous n'êtes pas connecté" / mode visible côté front
//  pour un visiteur non-authentifié.
// ══════════════════════════════════════════════

import { useEffect, useState } from "react";
import type { HeavenAuth } from "@/types/heaven";
import {
  getAccessMode,
  getModeLabel,
  getModeColor,
  getModeGradient,
  type AccessMode,
} from "@/lib/access-mode";

interface ModeBadgeProps {
  /** Affichage compact (badge rond, texte abrégé) */
  compact?: boolean;
  /** className additionnel */
  className?: string;
  /** Couleur override (ex: couleur spécifique du modèle pour mode 'model') */
  colorOverride?: string;
}

/**
 * Lit la session client-side (sessionStorage) et renvoie le mode d'accès.
 * Réagit aux événements `heaven:auth-changed` (login/logout).
 */
function useAccessMode(): AccessMode {
  const [mode, setMode] = useState<AccessMode>("public");

  useEffect(() => {
    const read = () => {
      try {
        const raw = sessionStorage.getItem("heaven_auth");
        if (!raw) {
          setMode("public");
          return;
        }
        const parsed: HeavenAuth = JSON.parse(raw);
        setMode(getAccessMode(parsed));
      } catch {
        setMode("public");
      }
    };
    read();
    window.addEventListener("heaven:auth-changed", read);
    return () => window.removeEventListener("heaven:auth-changed", read);
  }, []);

  return mode;
}

export function ModeBadge({
  compact = false,
  className = "",
  colorOverride,
}: ModeBadgeProps) {
  const mode = useAccessMode();

  // P0 anti-leak : public = rien affiché (pas de badge "Visiteur" qui
  // trahirait qu'on détecte l'absence de session côté UI cockpit).
  if (mode === "public") return null;

  const label = getModeLabel(mode);
  const color = colorOverride || getModeColor(mode);
  const gradient = getModeGradient(mode);

  // Compact : pastille colorée + texte inline
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 ${className}`}
        aria-label={`Mode d'accès : ${label}`}
        title={`Mode d'accès : ${label}`}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{
            background: gradient || color,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </span>
      </div>
    );
  }

  // Full : badge pilule avec background (gradient pour agence)
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${className}`}
      style={{
        background: gradient
          ? gradient
          : `${color}1A`, // 10% opacity fallback
        color: gradient ? "#FFFFFF" : color,
        border: gradient ? "none" : `1px solid ${color}33`,
      }}
      aria-label={`Mode d'accès : ${label}`}
      title={`Mode d'accès : ${label}`}
      data-mode={mode}
    >
      {label}
    </div>
  );
}

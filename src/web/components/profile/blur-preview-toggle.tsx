"use client";

/**
 * BlurPreviewToggle — BRIEF-22+23 Phase 2.2 (Session 2026-04-25 evening)
 * ─────────────────────────────────────────────────────────────────────
 * Drawer admin "vue floutée vs débloquée" — la modèle peut basculer en un clic
 * la simulation de l'expérience visiteur sur ses packs/contenu :
 *  - "Floutée" : simule la vue d'un visiteur sans code valide (blur 8px)
 *  - "Débloquée" : simule la vue d'un visiteur avec code valide (clear)
 *
 * Pattern : drawer fixe bottom-right, toggle button + label.
 * Apply effect : dispatch event `heaven:blur-preview-toggle` que le profil
 * écoute pour ajouter/retirer une classe CSS sur le contenu pack/tier.
 *
 * Responsive mobile-first : taille button 44+ touch target, pinned bottom-right
 * sur tous viewports (FAB pattern).
 */

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

interface BlurPreviewToggleProps {
  /** Permission admin (true = visible, false = caché). */
  canToggle: boolean;
}

export function BlurPreviewToggle({ canToggle }: BlurPreviewToggleProps) {
  const [showBlurred, setShowBlurred] = useState(false);

  // Dispatch event au changement pour que le profil applique le filter
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("heaven:blur-preview-toggle", {
        detail: { showBlurred },
      }),
    );
    // Body class pour CSS global
    if (showBlurred) {
      document.body.classList.add("heaven-blur-preview");
    } else {
      document.body.classList.remove("heaven-blur-preview");
    }
  }, [showBlurred]);

  // Cleanup body class au unmount
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("heaven-blur-preview");
      }
    };
  }, []);

  if (!canToggle) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowBlurred((v) => !v)}
        title={showBlurred ? "Désactiver vue floutée" : "Activer vue floutée (preview client sans code)"}
        aria-label={showBlurred ? "Désactiver preview floutée" : "Activer preview floutée"}
        aria-pressed={showBlurred}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95"
        style={{
          background: showBlurred
            ? "linear-gradient(135deg, var(--accent), #A78BFA)"
            : "rgba(28,28,32,0.95)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          minHeight: 44,
          minWidth: 44,
        }}
      >
        {showBlurred ? (
          <Eye className="w-4 h-4 sm:w-4 sm:h-4" />
        ) : (
          <EyeOff className="w-4 h-4 sm:w-4 sm:h-4" />
        )}
        <span className="text-xs sm:text-sm font-semibold hidden sm:inline">
          {showBlurred ? "Vue floutée" : "Preview client"}
        </span>
      </button>

      {/* CSS global injecté pour appliquer le flou aux éléments avec classe */}
      <style>{`
        body.heaven-blur-preview .heaven-blur-target {
          filter: blur(8px) !important;
          pointer-events: none;
          user-select: none;
          transition: filter 0.3s ease;
        }
        body.heaven-blur-preview .heaven-blur-target-strong {
          filter: blur(16px) !important;
          pointer-events: none;
          user-select: none;
        }
      `}</style>
    </>
  );
}

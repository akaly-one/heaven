"use client";

/**
 * BRIEF-10 TICKET-AG04 — Age Gate Modal (bloquant)
 *
 * Modale qui demande au fan de certifier sa majorité.
 * - Aucune échappatoire : pas de close button, pas d'Escape, pas de click outside.
 * - Fan DOIT choisir : "Je certifie 18+" ou "Je suis mineur" (redirect IG).
 * - A11y : focus trap, aria-modal, aria-labelledby, touch targets 44px min.
 * - WCAG 2.2 AA : contraste ≥ 4.5, focus-visible ring visible.
 *
 * Props :
 *   open       → contrôlé par parent (montré/caché)
 *   onCertify  → fan coche case + valide bouton principal
 *   onMinor    → fan clique "Je suis mineur" (le parent gère le redirect)
 */

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface AgeGateModalProps {
  open: boolean;
  onCertify: () => void;
  onMinor: () => void;
}

export default function AgeGateModal({
  open,
  onCertify,
  onMinor,
}: AgeGateModalProps) {
  const [checked, setChecked] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const certifyBtnRef = useRef<HTMLButtonElement | null>(null);
  const firstFocusRef = useRef<HTMLInputElement | null>(null);

  // Focus trap : Tab / Shift+Tab reste dans la modale
  useEffect(() => {
    if (!open) return;
    // Focus initial sur la checkbox
    const t = setTimeout(() => {
      firstFocusRef.current?.focus();
    }, 30);

    const handleKey = (e: KeyboardEvent) => {
      // Escape désactivé (bloquant, règle BRIEF-10)
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Focus trap
      if (e.key === "Tab" && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey, true);

    // Prévenir scroll du body
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", handleKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      // Pas de onClick={onClose} : bloquant
      aria-hidden={false}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-desc"
        className="w-full max-w-[400px] rounded-2xl overflow-hidden"
        style={{
          background: "#111114",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-5 pt-5 pb-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #E6C974, #9E7C1F)",
            }}
            aria-hidden="true"
          >
            <ShieldCheck className="w-4 h-4" style={{ color: "#0A0A0C" }} />
          </div>
          <h2
            id="age-gate-title"
            className="text-base font-bold"
            style={{ color: "#fff" }}
          >
            Confirmation âge requise
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p
            id="age-gate-desc"
            className="text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Heaven est une plateforme réservée aux adultes majeurs (18+). Pour
            continuer, confirme que tu as au moins 18 ans.
          </p>

          {/* Checkbox */}
          <label
            className="flex items-start gap-2.5 mt-4 cursor-pointer select-none rounded-lg p-2.5 -mx-2.5"
            style={{
              background: checked
                ? "rgba(230,201,116,0.08)"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${checked ? "rgba(230,201,116,0.35)" : "rgba(255,255,255,0.08)"}`,
              minHeight: "44px",
              transition: "background 140ms, border-color 140ms",
            }}
          >
            <input
              ref={firstFocusRef}
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
              style={{ accentColor: "#E6C974" }}
              aria-describedby="age-gate-cert-label"
            />
            <span
              id="age-gate-cert-label"
              className="text-[13px] leading-snug"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              Je certifie avoir 18 ans ou plus et accepte la{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-sm"
                style={{ color: "#E6C974" }}
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>

          {/* Warning discret */}
          <div
            className="flex items-start gap-2 mt-3 text-[11px] leading-snug"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <AlertTriangle
              className="w-3 h-3 shrink-0 mt-0.5"
              style={{ color: "rgba(255,255,255,0.45)" }}
              aria-hidden="true"
            />
            <span>
              Toute fausse déclaration engage ta responsabilité. L&apos;accès est
              tracé et peut être révoqué en cas de fraude.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 mt-5">
            <button
              ref={certifyBtnRef}
              type="button"
              disabled={!checked}
              onClick={() => {
                if (!checked) return;
                onCertify();
              }}
              className="w-full h-11 rounded-xl text-sm font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: checked
                  ? "linear-gradient(135deg, #E6C974, #C9A84C)"
                  : "rgba(255,255,255,0.08)",
                color: checked ? "#0A0A0C" : "rgba(255,255,255,0.45)",
                cursor: checked ? "pointer" : "not-allowed",
                minHeight: "44px",
              }}
              aria-disabled={!checked}
            >
              Je certifie
            </button>

            <button
              type="button"
              onClick={onMinor}
              className="w-full h-11 rounded-xl text-xs font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.65)",
                minHeight: "44px",
              }}
            >
              Je suis mineur →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

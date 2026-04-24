"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, X, ExternalLink, Shield } from "lucide-react";

/**
 * BRIEF-16 livrable 2 — PaymentReferenceModal
 *
 * Affiché après POST /api/payment/create (providerId='manual') : le fan voit
 * sa référence personnelle (ex: YUMI-PGLD-K3M9X2), la copie dans le
 * presse-papier, accepte les CGV et est redirigé vers PayPal.me pour payer.
 *
 * Style cohérent avec admin-auth-modal.tsx (look "services secrets" sombre
 * avec accent coloré, blur backdrop, animation fadeUp).
 */

interface PaymentReferenceModalProps {
  referenceCode: string;
  redirectUrl: string;
  amount: number; // en euros (affichage)
  packName: string;
  accentColor?: string;
  onClose: () => void;
}

export function PaymentReferenceModal({
  referenceCode,
  redirectUrl,
  amount,
  packName,
  accentColor = "#D4AF37",
  onClose,
}: PaymentReferenceModalProps) {
  const [copied, setCopied] = useState(false);
  const [acceptedCgv, setAcceptedCgv] = useState(false);

  // ── Copy reference to clipboard ──
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referenceCode).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
      () => {
        // Fallback : sélectionne le text avec un prompt pour copie manuelle
        window.prompt("Copie la référence :", referenceCode);
      }
    );
  }, [referenceCode]);

  // ── Continue to PayPal ──
  const handleContinue = useCallback(() => {
    if (!acceptedCgv) return;
    // Ouvre PayPal.me dans un nouvel onglet (mobile-friendly + ne ferme pas
    // la modale — permet au fan de revenir sur le site après paiement)
    window.open(redirectUrl, "_blank", "noopener,noreferrer");
  }, [redirectUrl, acceptedCgv]);

  // ── Close on Escape ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
      style={{
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payref-title"
    >
      <div
        className="w-full max-w-[400px] rounded-2xl px-6 py-7 relative"
        style={{
          background:
            "linear-gradient(180deg, rgba(28,28,32,0.98), rgba(18,18,22,0.99))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          animation: "fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" style={{ color: "#fff" }} />
        </button>

        {/* ── Header icon + titre ── */}
        <div className="flex items-center justify-center mb-4 mt-2">
          <Shield
            className="w-10 h-10"
            style={{
              color: accentColor,
              filter: `drop-shadow(0 0 10px ${accentColor}99) drop-shadow(0 0 20px ${accentColor}40)`,
            }}
            aria-hidden
          />
        </div>

        <h2
          id="payref-title"
          className="text-center text-base font-bold mb-1"
          style={{ color: "#fff" }}
        >
          Copie cette référence dans la note PayPal
        </h2>
        <p
          className="text-center text-[11px] mb-5"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {packName} — {amount}€
        </p>

        {/* ── Reference code ── */}
        <div
          className="rounded-xl p-4 mb-3 text-center font-mono select-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1.5px solid ${accentColor}40`,
            fontSize: "22px",
            letterSpacing: "0.08em",
            color: accentColor,
            textShadow: `0 0 10px ${accentColor}55`,
            wordBreak: "break-all",
          }}
          aria-label="Référence de paiement"
        >
          {referenceCode}
        </div>

        {/* ── Copy button ── */}
        <button
          onClick={handleCopy}
          className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:brightness-110 active:scale-[0.98] mb-5 flex items-center justify-center gap-2"
          style={{
            background: copied ? "#22C55E" : "rgba(255,255,255,0.06)",
            color: copied ? "#fff" : "#fff",
            border: `1px solid ${copied ? "#22C55E" : "rgba(255,255,255,0.1)"}`,
          }}
          aria-label="Copier la référence"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copié
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copier la référence
            </>
          )}
        </button>

        {/* ── Explanation ── */}
        <p
          className="text-[11px] leading-relaxed mb-5 text-center"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Dans PayPal, colle cette référence dans la note du paiement. La modèle
          validera ton paiement et tu recevras ton code d&apos;accès par
          message.
        </p>

        {/* ── CGV checkbox ── */}
        <label
          className="flex items-start gap-2 mb-4 cursor-pointer"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          <input
            type="checkbox"
            checked={acceptedCgv}
            onChange={(e) => setAcceptedCgv(e.target.checked)}
            className="mt-0.5 cursor-pointer shrink-0"
            style={{ accentColor }}
            aria-label="J'accepte les conditions générales de vente"
          />
          <span className="text-[11px] leading-snug">
            J&apos;accepte les{" "}
            <a
              href="/cgv"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: accentColor }}
              onClick={(e) => e.stopPropagation()}
            >
              Conditions Générales de Vente
            </a>
          </span>
        </label>

        {/* ── Continue button ── */}
        <button
          onClick={handleContinue}
          disabled={!acceptedCgv}
          className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
            color: "#0A0A0C",
            boxShadow: acceptedCgv
              ? `0 4px 20px ${accentColor}40`
              : "none",
          }}
          aria-label="Continuer vers PayPal"
        >
          Continuer vers PayPal
          <ExternalLink className="w-4 h-4" />
        </button>

        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

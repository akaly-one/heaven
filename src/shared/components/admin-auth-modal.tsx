"use client";

import { useState, useCallback } from "react";
import { Shield, X } from "lucide-react";

interface AdminAuthModalProps {
  onClose: () => void;
}

// Same visual language as IdentityGate, but two inputs (login + code) and a
// dedicated submit that hits /api/auth/login. On success, redirects to
// data.redirect || /agence — the CP routes adapt by role via sessionStorage.
export function AdminAuthModal({ onClose }: AdminAuthModalProps) {
  const [login, setLogin] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!login.trim() || !code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: login.trim().replace(/^@/, "").toLowerCase(),
          code: code.trim(),
        }),
      });
      const data = await res.json();
      if (!data.valid) {
        setError(data.error || "Identifiants invalides");
        setSubmitting(false);
        return;
      }
      // NB 2026-04-24 : localStorage (persiste 24h cross-onglets) — sessionStorage
      // se vidait par onglet et causait des déconnexions aléatoires. Le cookie
      // httpOnly `heaven_session` (serveur) reste la source de vérité côté back.
      localStorage.setItem(
        "heaven_auth",
        JSON.stringify({
          role: data.role,
          scope: data.scope,
          model_slug: data.model_slug,
          display_name: data.display_name,
          loggedAt: new Date().toISOString(),
        })
      );
      window.dispatchEvent(new Event("heaven:auth-changed"));
      window.location.href = data.redirect || "/agence";
    } catch {
      setError("Erreur de connexion");
      setSubmitting(false);
    }
  }, [login, code]);

  const accent = "#E63329";
  const gradEnd = "#A78BFA";
  const disabled = !login.trim() || !code.trim();

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
      style={{
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[340px] rounded-2xl px-6 py-7 relative"
        style={{
          background: "linear-gradient(180deg, rgba(28,28,32,0.98), rgba(18,18,22,0.99))",
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

        {/* NB 2026-04-24 ~23:25 : shield seul au centre avec glow services secrets */}
        <div className="flex items-center justify-center mb-6 mt-2">
          <Shield
            className="w-10 h-10"
            style={{
              color: accent,
              filter: `drop-shadow(0 0 10px ${accent}99) drop-shadow(0 0 20px ${accent}40)`,
            }}
            aria-label="Admin"
          />
        </div>

        {/* NB 2026-04-24 ~23:40 : inputs affichent des * centrés clignotants (style services secrets).
            Input réel text-transparent + overlay <span> qui rend les * avec glow + pulse lent. */}
        <div className="relative mb-4">
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder=""
            aria-label="Identifiant"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "transparent",
              caretColor: accent,
              textAlign: "center",
              border: `1.5px solid ${login.trim() ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") document.getElementById("admin-code-input")?.focus();
            }}
            autoFocus
          />
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none font-bold select-none"
            aria-hidden="true"
            style={{
              fontSize: "22px",
              lineHeight: 1,
              letterSpacing: "0.4em",
              color: accent,
              textShadow: `0 0 6px ${accent}cc, 0 0 14px ${accent}66`,
              animation: login ? "admin-star-blink 2s ease-in-out infinite" : undefined,
            }}
          >
            {login ? "*".repeat(Math.min(login.length, 24)) : <span className="text-[11px] font-normal tracking-normal" style={{ color: "rgba(255,255,255,0.2)", textShadow: "none" }}>identifiant</span>}
          </div>
        </div>

        <div className="relative mb-5">
          <input
            id="admin-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder=""
            aria-label="Mot de passe"
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "transparent",
              caretColor: accent,
              textAlign: "center",
              border: `1.5px solid ${code.trim() ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none font-bold select-none"
            aria-hidden="true"
            style={{
              fontSize: "22px",
              lineHeight: 1,
              letterSpacing: "0.4em",
              color: accent,
              textShadow: `0 0 6px ${accent}cc, 0 0 14px ${accent}66`,
              animation: code ? "admin-star-blink 2s ease-in-out infinite" : undefined,
            }}
          >
            {code ? "*".repeat(Math.min(code.length, 32)) : <span className="text-[11px] font-normal tracking-normal" style={{ color: "rgba(255,255,255,0.2)", textShadow: "none" }}>mot de passe</span>}
          </div>
        </div>

        {/* Keyframes inline scoped au modal (évite d'étendre globals.css) */}
        <style>{`
          @keyframes admin-star-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.55; }
          }
        `}</style>

        {error && <p className="text-xs text-center mb-3" style={{ color: "#EF4444" }}>{error}</p>}

        <button
          onClick={submit}
          disabled={disabled || submitting}
          className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-20 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${gradEnd})`,
            color: "#fff",
            boxShadow: `0 4px 20px ${accent}25`,
          }}
        >
          {submitting ? "..." : "Connexion"}
        </button>
      </div>
    </div>
  );
}

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
      sessionStorage.setItem(
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

        <div className="flex items-center justify-center gap-2 mb-5">
          <Shield className="w-4 h-4" style={{ color: accent }} />
          <h2 className="text-center text-lg font-medium uppercase tracking-[0.2em]" style={{ color: "#fff" }}>
            Admin
          </h2>
        </div>

        <p className="text-center text-[10px] mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
          Accès cockpit modèle
        </p>

        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
            @
          </span>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="identifiant"
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              border: `1.5px solid ${login.trim() ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") document.getElementById("admin-code-input")?.focus();
            }}
            autoFocus
          />
        </div>

        {/* NB 2026-04-24 : retrait `uppercase` CSS — password case-sensitive.
            Type=password pour masquer pendant saisie. */}
        <input
          id="admin-code-input"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="mot de passe"
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-xl text-sm font-mono tracking-widest text-center outline-none mb-5 transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            border: `1.5px solid ${code.trim() ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />

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

        <p className="text-center text-[10px] mt-4" style={{ color: "rgba(255,255,255,0.18)" }}>
          root · yumi · paloma · ruby
        </p>
      </div>
    </div>
  );
}

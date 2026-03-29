"use client";

import { useState, useEffect, useCallback } from "react";

type Platform = "snap" | "insta" | "phone" | "pseudo";

interface IdentityGateProps {
  slug: string;
  modelName?: string;
  onRegistered: (client: Record<string, unknown>, platform: Platform, handle: string) => void;
  onNeedShop?: () => void;
  isLoading?: boolean;
}

export function IdentityGate({ slug, modelName, onRegistered, onNeedShop }: IdentityGateProps) {
  const [platform, setPlatform] = useState<"snap" | "insta">("snap");
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "new">("login");

  // Auto-dismiss returning visitors
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`heaven_client_${slug}`);
      if (saved) {
        const client = JSON.parse(saved);
        let p: Platform = "pseudo";
        let h = "";
        if (client.pseudo_snap) { p = "snap"; h = client.pseudo_snap; }
        else if (client.pseudo_insta) { p = "insta"; h = client.pseudo_insta; }
        if (h) {
          setTimeout(() => onRegistered(client, p, h), 500);
        }
      }
    } catch {}
  }, [slug, onRegistered]);

  const submit = useCallback(async () => {
    if (!handle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      // Register/find client
      const payload: Record<string, unknown> = { model: slug };
      if (platform === "snap") payload.pseudo_snap = handle.trim().toLowerCase();
      else payload.pseudo_insta = handle.trim().toLowerCase();

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const client = data.client || data;

      // If code provided, validate it
      if (code.trim()) {
        const codeRes = await fetch("/api/codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "validate", code: code.trim(), model: slug }),
        });
        if (!codeRes.ok) {
          const err = await codeRes.json().catch(() => ({}));
          setError(err.error || "Code invalide");
          setSubmitting(false);
          return;
        }
        const codeData = await codeRes.json();
        if (codeData.code?.tier) {
          sessionStorage.setItem(`heaven_access_${slug}`, JSON.stringify({
            tier: codeData.code.tier, expiresAt: codeData.code.expiresAt, code: codeData.code.code,
          }));
        }
      }

      // New account → auto-generate free 1h trial pass
      if (mode === "new" && !code.trim()) {
        try {
          const trialCode = `FREE-${Date.now().toString(36).toUpperCase()}`;
          const codeRes = await fetch("/api/codes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: slug,
              code: trialCode,
              client: handle.trim().toLowerCase(),
              platform: platform === "snap" ? "snapchat" : "instagram",
              tier: "vip",
              duration: 1, // 1 hour
              type: "promo",
              isTrial: true,
            }),
          });
          if (codeRes.ok) {
            const codeData = await codeRes.json();
            if (codeData.code) {
              // Auto-validate the trial code
              const validateRes = await fetch("/api/codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "validate", code: trialCode, model: slug }),
              });
              if (validateRes.ok) {
                const vData = await validateRes.json();
                if (vData.code?.tier) {
                  sessionStorage.setItem(`heaven_access_${slug}`, JSON.stringify({
                    tier: vData.code.tier,
                    expiresAt: vData.code.expiresAt,
                    code: vData.code.code,
                  }));
                }
              }
            }
          }
        } catch {}
      }

      // Save client session
      sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
      onRegistered(client, platform, handle.trim());
    } catch {
      setError("Erreur de connexion");
    }
    setSubmitting(false);
  }, [handle, platform, code, slug, onRegistered]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        <h2 className="text-center text-base font-bold mb-1" style={{ color: "var(--text)" }}>
          {modelName || "Heaven"}
        </h2>
        <p className="text-center text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          {mode === "login" ? "Connecte-toi avec ton pseudo" : "Creer un nouveau compte"}
        </p>

        {/* Platform selector — dots inline with input */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setPlatform("snap")}
            className="w-9 h-9 rounded-full cursor-pointer transition-all hover:scale-110 shrink-0 flex items-center justify-center"
            style={{ background: platform === "snap" ? "#997A00" : "rgba(153,122,0,0.15)", border: `2px solid ${platform === "snap" ? "#997A00" : "transparent"}` }}>
            {platform === "snap" && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
          </button>
          <button onClick={() => setPlatform("insta")}
            className="w-9 h-9 rounded-full cursor-pointer transition-all hover:scale-110 shrink-0 flex items-center justify-center"
            style={{ background: platform === "insta" ? "#C13584" : "rgba(193,53,132,0.15)", border: `2px solid ${platform === "insta" ? "#C13584" : "transparent"}` }}>
            {platform === "insta" && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
          </button>
          <input value={handle} onChange={e => setHandle(e.target.value)}
            placeholder={platform === "snap" ? "pseudo snap" : "pseudo insta"}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            autoFocus />
        </div>

        {/* Code — for existing subscribers */}
        {mode === "login" && (
          <input value={code} onChange={e => setCode(e.target.value)}
            placeholder="Code d'acces (si tu en as un)"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono uppercase tracking-wider text-center mb-3"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            onKeyDown={e => { if (e.key === "Enter") submit(); }} />
        )}

        {error && <p className="text-xs text-center mb-3" style={{ color: "var(--danger)" }}>{error}</p>}

        <button onClick={submit} disabled={!handle.trim() || submitting}
          className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer btn-gradient disabled:opacity-30 transition-all hover:scale-[1.01] active:scale-[0.99]">
          {submitting ? "..." : mode === "login" ? "Entrer" : "Creer mon compte"}
        </button>

        <button onClick={() => setMode(mode === "login" ? "new" : "login")}
          className="w-full text-center mt-3 text-[11px] cursor-pointer hover:underline"
          style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
          {mode === "login" ? "Pas encore de compte ? Creer un nouveau" : "Deja un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}

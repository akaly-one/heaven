"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

type Platform = "snap" | "insta" | "phone" | "pseudo";

interface IdentityGateProps {
  slug: string;
  modelName?: string;
  onRegistered: (client: Record<string, unknown>, platform: Platform, handle: string) => void;
  onNeedShop?: () => void;
  isLoading?: boolean;
}

// ── Rotating promo hooks — incentivize real handles ──
const PROMO_HOOKS = [
  { text: "Entre ton vrai pseudo pour etre ajoute aux stories privees 🔥", hook: "story_privee_fire" },
  { text: "Acces exclusif aux stories privees — entre ton @ reel", hook: "story_privee_exclu" },
  { text: "Les stories privees sont reservees aux vrais comptes verifes ✨", hook: "story_privee_verif" },
  { text: "Ton pseudo = ton pass VIP pour les stories cachees 🔒", hook: "story_privee_vip" },
  { text: "Rejoins la story privee — seuls les vrais pseudos sont acceptes", hook: "story_privee_vrais" },
  { text: "Contenu exclusif en story privee pour les abonnes verifies 💎", hook: "story_privee_diamond" },
  { text: "Entre ton @ pour debloquer les stories privees quotidiennes", hook: "story_privee_daily" },
  { text: "Les membres verifies recoivent du contenu en story privee chaque jour 🎁", hook: "story_privee_gift" },
];

export function IdentityGate({ slug, modelName, onRegistered, onNeedShop }: IdentityGateProps) {
  const [platform, setPlatform] = useState<"snap" | "insta">("snap");
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "new">("login");

  // Pick a random promo hook on mount (stable per session)
  const promo = useMemo(() => PROMO_HOOKS[Math.floor(Math.random() * PROMO_HOOKS.length)], []);

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
      // Register/find client — include lead_source + lead_hook for tracking
      const payload: Record<string, unknown> = {
        model: slug,
        lead_source: "private_story",
        lead_hook: promo.hook,
      };
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
              tier: "silver",
              duration: 1, // 1 hour
              type: "promo",
              isTrial: true,
            }),
          });
          if (codeRes.ok) {
            const codeData = await codeRes.json();
            if (codeData.code) {
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
  }, [handle, platform, code, slug, onRegistered, promo.hook, mode]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-7 sm:p-8"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)", animation: "fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>

        {/* Model name — elegant display */}
        <h2 className="text-center text-xl sm:text-2xl font-light uppercase mb-1" style={{ color: "var(--text)", letterSpacing: "0.15em" }}>
          {modelName || "Heaven"}
        </h2>
        <div className="w-10 h-[1px] mx-auto mb-4" style={{ background: "var(--accent)" }} />

        {/* ── Promo hook — rotating incentive text ── */}
        <div className="rounded-xl px-4 py-3 mb-5 text-center"
          style={{ background: "linear-gradient(135deg, rgba(230,51,41,0.08), rgba(200,40,30,0.04))", border: "1px solid rgba(230,51,41,0.15)" }}>
          <p className="text-[12px] font-medium leading-relaxed" style={{ color: "var(--text)" }}>
            {promo.text}
          </p>
          <p className="text-[10px] mt-1.5 opacity-60" style={{ color: "var(--text-muted)" }}>
            Utilise ton vrai compte — les faux pseudos sont exclus
          </p>
        </div>

        <p className="text-center text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          {mode === "login" ? "Connecte-toi avec ton pseudo" : "Creer un nouveau compte"}
        </p>

        {/* Platform selector — large buttons with platform colors */}
        <div className="flex gap-3 mb-4">
          <button onClick={() => setPlatform("snap")}
            className="flex-1 py-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-semibold"
            style={{
              background: platform === "snap" ? "#997A00" : "rgba(153,122,0,0.08)",
              color: platform === "snap" ? "#fff" : "#997A00",
              border: `1.5px solid ${platform === "snap" ? "#997A00" : "rgba(153,122,0,0.2)"}`,
            }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.076-.375-.09-.84-.181-1.469-.181-.496 0-1.034.062-1.6.18a5.263 5.263 0 01-1.665 1.125C14.198 22.21 13.14 22.5 12 22.5c-1.14 0-2.198-.29-2.864-.689A5.366 5.366 0 017.47 20.7c-.566-.12-1.104-.18-1.6-.18-.629 0-1.094.091-1.469.18a3.1 3.1 0 01-.538.076c-.285 0-.48-.134-.555-.405a4.58 4.58 0 01-.134-.553c-.044-.195-.105-.479-.164-.57C1.137 18.9.104 18.48-.136 17.911a.556.556 0 01-.045-.225.488.488 0 01.42-.509c3.265-.539 4.731-3.878 4.791-4.014l.016-.015c.18-.344.21-.644.12-.868-.195-.45-.884-.675-1.333-.81a8.753 8.753 0 01-.345-.12C2.664 11.082 2.26 10.692 2.275 10.244c0-.36.285-.689.735-.838.149-.061.329-.09.509-.09.12 0 .3.016.464.104.374.18.733.3 1.033.3.199 0 .327-.044.401-.089a35.68 35.68 0 01-.033-.57c-.104-1.628-.23-3.654.3-4.846C7.447 1.069 10.8.793 11.795.793h.411z"/></svg>
            Snapchat
          </button>
          <button onClick={() => setPlatform("insta")}
            className="flex-1 py-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-semibold"
            style={{
              background: platform === "insta" ? "#C13584" : "rgba(193,53,132,0.08)",
              color: platform === "insta" ? "#fff" : "#C13584",
              border: `1.5px solid ${platform === "insta" ? "#C13584" : "rgba(193,53,132,0.2)"}`,
            }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            Instagram
          </button>
        </div>

        {/* Handle input — large, centered */}
        <input value={handle} onChange={e => setHandle(e.target.value)}
          placeholder={platform === "snap" ? "Ton pseudo Snapchat" : "Ton pseudo Instagram"}
          className="w-full px-4 py-3.5 rounded-xl text-sm outline-none text-center transition-all focus:ring-1 mb-3"
          style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          autoFocus />

        {/* Code — for existing subscribers */}
        {mode === "login" && (
          <input value={code} onChange={e => setCode(e.target.value)}
            placeholder="Code d'acces (optionnel)"
            className="w-full px-4 py-3.5 rounded-xl text-sm outline-none font-mono uppercase tracking-wider text-center mb-4 transition-all focus:ring-1"
            style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", "--tw-ring-color": "var(--accent)" } as React.CSSProperties}
            onKeyDown={e => { if (e.key === "Enter") submit(); }} />
        )}

        {error && <p className="text-xs text-center mb-4" style={{ color: "var(--danger)" }}>{error}</p>}

        <button onClick={submit} disabled={!handle.trim() || submitting}
          className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer btn-gradient disabled:opacity-30 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase"
          style={{ letterSpacing: "0.08em" }}>
          {submitting ? "..." : mode === "login" ? "Entrer" : "Creer mon compte"}
        </button>

        <button onClick={() => setMode(mode === "login" ? "new" : "login")}
          className="w-full text-center mt-4 text-[11px] cursor-pointer hover:underline transition-opacity"
          style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
          {mode === "login" ? "Pas encore de compte ? Creer un nouveau" : "Deja un compte ? Se connecter"}
        </button>
      </div>
    </div>
  );
}

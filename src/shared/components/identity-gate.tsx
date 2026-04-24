"use client";

import { useState, useEffect, useCallback } from "react";
import { Ghost, Instagram, KeyRound, Shield, X } from "lucide-react";

type Platform = "snap" | "insta" | "phone" | "pseudo";

interface IdentityGateProps {
  slug: string;
  modelName?: string;
  onRegistered: (client: Record<string, unknown>, platform: Platform, handle: string) => void;
  onNeedShop?: () => void;
  onAdminRequest?: () => void;
  onDismiss?: () => void;
  isLoading?: boolean;
}

export function IdentityGate({ slug, modelName, onRegistered, onAdminRequest, onDismiss }: IdentityGateProps) {
  const [platform, setPlatform] = useState<"snap" | "insta">("snap");
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"handle" | "code">("handle");
  // NB 2026-04-25 ~00:15 : hover tab → tagline remplace le titre modelName au-dessus
  const [hoveredTab, setHoveredTab] = useState<"snap" | "code" | "insta" | null>(null);

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
    // Code-only mode
    if (mode === "code") {
      if (!code.trim()) return;
      setSubmitting(true);
      setError(null);
      try {
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
        // Create anonymous client for code-only entry
        const anonClient = { id: `anon-${Date.now()}`, verified_status: "code" };
        sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(anonClient));
        onRegistered(anonClient, "pseudo", "VIP");
      } catch {
        setError("Erreur de connexion");
      }
      setSubmitting(false);
      return;
    }

    // Handle mode
    if (!handle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        model: slug,
        lead_source: "private_story",
        lead_hook: "gate_minimal",
      };
      if (platform === "snap") payload.pseudo_snap = handle.trim().toLowerCase();
      else payload.pseudo_insta = handle.trim().toLowerCase();

      // NB 2026-04-24 : upgrade guest → vérifié si sessionStorage a un guest_id
      // pour ce slug (préserve historique messages du visiteur)
      try {
        const guestId = sessionStorage.getItem(`heaven_guest_${slug}`);
        if (guestId) payload.upgrade_guest_id = guestId;
      } catch { /* noop */ }

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const client = data.client || data;

      sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(client));
      // Nettoyer le marqueur guest — maintenant remplacé par le client vérifié
      try { sessionStorage.removeItem(`heaven_guest_${slug}`); } catch { /* noop */ }
      onRegistered(client, platform, handle.trim());
    } catch {
      setError("Erreur de connexion");
    }
    setSubmitting(false);
  }, [handle, platform, code, slug, onRegistered, mode]);

  const accentSnap = "#FFFC00";
  const accentInsta = "#E1306C";
  const accentCode = "#A78BFA";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
      onClick={onDismiss ? () => onDismiss() : undefined}>

      <div className="w-full max-w-[340px] rounded-2xl px-6 py-7 relative"
        style={{
          background: "linear-gradient(180deg, rgba(28,28,32,0.98), rgba(18,18,22,0.99))",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          animation: "fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fermer (voir le profil en visiteur)"
            title="Voir le profil en visiteur"
            className="absolute top-3 right-3 p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" style={{ color: "#fff" }} />
          </button>
        )}

        {/* Model name OR tagline au hover d'un tab (NB 2026-04-25) */}
        <div className="mb-6 h-14 flex items-center justify-center px-2">
          {hoveredTab === "snap" && (
            <p className="text-center text-[11px] leading-relaxed animate-[fadeIn_0.2s_ease]" style={{ color: accentSnap }}>
              <span className="block font-semibold tracking-[0.15em] uppercase mb-1" style={{ color: accentSnap }}>Snap · Cercle Intime</span>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>Stories privées · Contenu exclusif · Échanges directs</span>
            </p>
          )}
          {hoveredTab === "code" && (
            <p className="text-center text-[11px] leading-relaxed animate-[fadeIn_0.2s_ease]" style={{ color: accentCode }}>
              <span className="block font-semibold tracking-[0.15em] uppercase mb-1" style={{ color: accentCode }}>Code · Accès Premium</span>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>Déverrouille tes packs & stories VIP</span>
            </p>
          )}
          {hoveredTab === "insta" && (
            <p className="text-center text-[11px] leading-relaxed animate-[fadeIn_0.2s_ease]" style={{ color: accentInsta }}>
              <span className="block font-semibold tracking-[0.15em] uppercase mb-1" style={{ color: accentInsta }}>Instagram · Backstage</span>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>Actualités · Nouveaux shootings · Offres exclusives</span>
            </p>
          )}
          {!hoveredTab && (
            <h2 className="text-center text-lg font-medium uppercase tracking-[0.2em]" style={{ color: "#fff" }}>
              {modelName || "Heaven"}
            </h2>
          )}
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-2px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* 3-way selector: Snap | Code | Insta */}
        <div className="flex gap-0 mb-5 rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => { setMode("handle"); setPlatform("snap"); }}
            onMouseEnter={() => setHoveredTab("snap")}
            onMouseLeave={() => setHoveredTab(null)}
            onFocus={() => setHoveredTab("snap")}
            onBlur={() => setHoveredTab(null)}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-all"
            style={{
              background: mode === "handle" && platform === "snap" ? `${accentSnap}15` : "transparent",
              color: mode === "handle" && platform === "snap" ? accentSnap : "rgba(255,255,255,0.3)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}>
            <Ghost className="w-3.5 h-3.5" />
            Snap
          </button>
          <button onClick={() => setMode("code")}
            onMouseEnter={() => setHoveredTab("code")}
            onMouseLeave={() => setHoveredTab(null)}
            onFocus={() => setHoveredTab("code")}
            onBlur={() => setHoveredTab(null)}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-all"
            style={{
              background: mode === "code" ? `${accentCode}15` : "transparent",
              color: mode === "code" ? accentCode : "rgba(255,255,255,0.3)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}>
            <KeyRound className="w-3.5 h-3.5" />
            Code
          </button>
          <button onClick={() => { setMode("handle"); setPlatform("insta"); }}
            onMouseEnter={() => setHoveredTab("insta")}
            onMouseLeave={() => setHoveredTab(null)}
            onFocus={() => setHoveredTab("insta")}
            onBlur={() => setHoveredTab(null)}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-all"
            style={{
              background: mode === "handle" && platform === "insta" ? `${accentInsta}15` : "transparent",
              color: mode === "handle" && platform === "insta" ? accentInsta : "rgba(255,255,255,0.3)",
            }}>
            <Instagram className="w-3.5 h-3.5" />
            Insta
          </button>
        </div>

        {/* Input — handle or code (centrés NB 2026-04-24) */}
        {mode === "handle" ? (
          <div className="relative mb-5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
              style={{ color: "rgba(255,255,255,0.2)" }}>@</span>
            <input value={handle} onChange={e => setHandle(e.target.value)}
              placeholder={platform === "snap" ? "ton pseudo snap" : "ton pseudo insta"}
              className="w-full px-9 py-3 rounded-xl text-sm text-center outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                border: `1.5px solid ${handle.trim() ? (platform === "snap" ? `${accentSnap}40` : `${accentInsta}40`) : "rgba(255,255,255,0.08)"}`,
              }}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              autoFocus />
          </div>
        ) : (
          <input value={code} onChange={e => setCode(e.target.value)}
            placeholder="ENTRE TON CODE"
            className="w-full px-4 py-3 rounded-xl text-sm font-mono uppercase tracking-widest text-center outline-none mb-5 transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              border: `1.5px solid ${code.trim() ? `${accentCode}40` : "rgba(255,255,255,0.08)"}`,
            }}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            autoFocus />
        )}

        {error && <p className="text-xs text-center mb-3" style={{ color: "#EF4444" }}>{error}</p>}

        {/* Submit */}
        {(() => {
          const isCode = mode === "code";
          const activeColor = isCode ? accentCode : (platform === "snap" ? accentSnap : accentInsta);
          const gradEnd = isCode ? "#8B5CF6" : (platform === "snap" ? "#E6D800" : "#C13584");
          const disabled = isCode ? !code.trim() : !handle.trim();
          return (
            <button onClick={submit} disabled={disabled || submitting}
              className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-20 transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${activeColor}, ${gradEnd})`,
                color: (platform === "snap" && !isCode) ? "#000" : "#fff",
                boxShadow: `0 4px 20px ${activeColor}25`,
              }}>
              {submitting ? "..." : isCode ? "Valider" : "Entrer"}
            </button>
          );
        })()}

        <p className="text-center text-[10px] mt-4"
          style={{ color: "rgba(255,255,255,0.18)" }}>
          {mode === "code" ? "Code fourni par la creatrice" : "Ton vrai pseudo = acces stories privees"}
        </p>

        {onAdminRequest && (
          <div className="mt-5 flex justify-center">
            {/* NB 2026-04-25 : bouton bouclier discret (remplace texte "Accès admin") */}
            <button
              type="button"
              onClick={onAdminRequest}
              aria-label="Accès admin"
              title="Accès admin"
              className="p-2 rounded-full transition-all hover:opacity-100 hover:scale-110 active:scale-95"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

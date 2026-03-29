"use client";

import { useState, useEffect, useCallback } from "react";
import { Ghost, Instagram, Phone, User, ArrowRight, Loader2 } from "lucide-react";

type Platform = "snap" | "insta" | "phone" | "pseudo";

interface IdentityGateProps {
  slug: string;
  modelName?: string;
  onRegistered: (client: Record<string, unknown>, platform: Platform, handle: string) => void;
  isLoading?: boolean;
}

const PLATFORMS: { id: Platform; label: string; icon: typeof Ghost; color: string; bg: string; border: string; placeholder: string; maxLength: number }[] = [
  {
    id: "snap", label: "Snapchat", icon: Ghost,
    color: "#997A00", bg: "rgba(153,122,0,0.12)", border: "rgba(153,122,0,0.35)",
    placeholder: "Ton pseudo Snapchat", maxLength: 30,
  },
  {
    id: "insta", label: "Instagram", icon: Instagram,
    color: "#E1306C", bg: "rgba(225,48,108,0.12)", border: "rgba(225,48,108,0.35)",
    placeholder: "Ton pseudo Instagram", maxLength: 30,
  },
  {
    id: "phone", label: "Telephone", icon: Phone,
    color: "#16A34A", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.35)",
    placeholder: "Ton numero de telephone", maxLength: 20,
  },
  {
    id: "pseudo", label: "Pseudo", icon: User,
    color: "#6366F1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.35)",
    placeholder: "Choisis un pseudo", maxLength: 30,
  },
];

export function IdentityGate({ slug, modelName, onRegistered, isLoading: externalLoading }: IdentityGateProps) {
  const [selected, setSelected] = useState<Platform | null>(null);
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState<{ handle: string; platform: Platform } | null>(null);

  // Check for returning visitor
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`heaven_client_${slug}`);
      if (saved) {
        const client = JSON.parse(saved);
        let platform: Platform = "pseudo";
        let h = "";
        if (client.pseudo_snap) { platform = "snap"; h = client.pseudo_snap; }
        else if (client.pseudo_insta) { platform = "insta"; h = client.pseudo_insta; }
        else if (client.phone) { platform = "phone"; h = client.phone; }
        else if (client.nickname) { platform = "pseudo"; h = client.nickname; }

        if (h) {
          setReturning({ handle: h, platform });
          // Auto-dismiss after brief welcome
          setTimeout(() => {
            onRegistered(client, platform, h);
          }, 800);
        }
      }
    } catch {}
  }, [slug, onRegistered]);

  const submit = useCallback(async () => {
    if (!selected || !handle.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = { model: slug };
      if (selected === "snap") payload.pseudo_snap = handle.trim();
      else if (selected === "insta") payload.pseudo_insta = handle.trim();
      else if (selected === "phone") payload.phone = handle.trim();
      else payload.nickname = handle.trim();

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.client) {
        sessionStorage.setItem(`heaven_client_${slug}`, JSON.stringify(data.client));
        onRegistered(data.client, selected, handle.trim());
      } else {
        setError(data.error || "Erreur, reessaie");
      }
    } catch {
      setError("Erreur reseau");
    }
    setSubmitting(false);
  }, [selected, handle, slug, onRegistered]);

  const activePlatform = PLATFORMS.find(p => p.id === selected);
  const loading = submitting || externalLoading;

  // Returning visitor: brief welcome overlay
  if (returning) {
    const rp = PLATFORMS.find(p => p.id === returning.platform);
    const Icon = rp?.icon || User;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: rp?.bg || "rgba(99,102,241,0.12)" }}>
            <Icon className="w-7 h-7" style={{ color: rp?.color || "#6366F1" }} />
          </div>
          <p className="text-lg font-bold text-white mb-1">Bon retour</p>
          <p className="text-sm font-semibold" style={{ color: rp?.color || "#6366F1" }}>@{returning.handle}</p>
          <div className="mt-4">
            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <div className="w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(230,51,41,0.15)" }}>
            <span className="text-xl font-black" style={{ color: "var(--accent, #E63329)" }}>H</span>
          </div>
          <h2 className="text-[17px] font-bold text-white">
            {modelName ? `Bienvenue chez ${modelName}` : "Bienvenue"}
          </h2>
          <p className="text-[13px] mt-1 text-white/50">Identifie-toi pour acceder au contenu</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>

          {/* Platform selector */}
          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3 text-white/40">Plateforme</p>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => {
                const Icon = p.icon;
                const isActive = selected === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelected(p.id); setHandle(""); setError(null); }}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-[12px] font-semibold cursor-pointer transition-all"
                    style={{
                      background: isActive ? p.bg : "rgba(255,255,255,0.04)",
                      border: isActive ? `1.5px solid ${p.border}` : "1.5px solid rgba(255,255,255,0.06)",
                      color: isActive ? p.color : "rgba(255,255,255,0.5)",
                    }}>
                    <Icon className="w-4 h-4" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Handle input */}
          {activePlatform && (
            <div className="px-4 pb-4 space-y-3">
              <div className="relative">
                {(() => { const Icon = activePlatform.icon; return (
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: activePlatform.color }} />
                ); })()}
                <input
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  placeholder={activePlatform.placeholder}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  maxLength={activePlatform.maxLength}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter" && handle.trim()) submit(); }}
                  type={selected === "phone" ? "tel" : "text"}
                  inputMode={selected === "phone" ? "tel" : "text"}
                  autoComplete={selected === "phone" ? "tel" : "username"}
                />
              </div>

              {error && (
                <p className="text-[11px] font-medium text-center" style={{ color: "#EF4444" }}>{error}</p>
              )}

              <button
                onClick={submit}
                disabled={!handle.trim() || loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold cursor-pointer transition-all disabled:opacity-30"
                style={{
                  background: `linear-gradient(135deg, ${activePlatform.color}, ${activePlatform.color}99)`,
                  color: selected === "snap" ? "#000" : "#fff",
                  boxShadow: `0 4px 20px ${activePlatform.color}33`,
                }}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Continuer <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-[10px] text-center mt-4 text-white/25">
          Pas de compte requis. Ton pseudo = ton identite.
        </p>
      </div>

      {/* Keyframe for fade-in */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}

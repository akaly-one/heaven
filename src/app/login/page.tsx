"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.role) {
        sessionStorage.setItem(
          "heaven_auth",
          JSON.stringify({
            role: data.role,
            scope: data.scope,
            model_slug: data.model_slug,
            display_name: data.display_name,
            loggedAt: data.loggedAt,
          })
        );
        router.push("/agence");
      } else {
        setError(data.error || "Code invalide");
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setError("Erreur de connexion");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 relative overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Ambient gradient mesh */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 800px 600px at 20% 20%, rgba(99,102,241,0.08), transparent),
          radial-gradient(ellipse 600px 500px at 80% 80%, rgba(244,63,94,0.06), transparent),
          radial-gradient(ellipse 400px 400px at 50% 50%, rgba(167,139,250,0.04), transparent)
        `,
      }} />

      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .shake { animation: shakeX 0.5s ease; }
      `}</style>

      <div className={`fade-up glass rounded-2xl p-10 max-w-sm w-full relative z-10 ${shake ? "shake" : ""}`}
        style={{ boxShadow: "0 0 80px rgba(99,102,241,0.08), 0 20px 60px rgba(0,0,0,0.4)" }}>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, var(--rose), var(--accent))",
              boxShadow: "0 0 40px rgba(99,102,241,0.3), 0 8px 24px rgba(0,0,0,0.3)",
            }}>
            <Zap className="w-8 h-8" style={{ color: "#fff" }} />
            <div className="absolute inset-0 rounded-2xl" style={{
              border: "2px solid rgba(99,102,241,0.3)",
              animation: "pulse-glow 3s ease-in-out infinite",
            }} />
          </div>
        </div>

        <h1 className="text-2xl font-black text-center mb-1 tracking-wide" style={{ color: "var(--text)" }}>
          Heaven Studio
        </h1>
        <p className="text-center mb-8 text-sm" style={{ color: "var(--text-muted)" }}>
          Cockpit administrateur
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center"
            style={{ background: "rgba(244,63,94,0.1)", color: "var(--danger)", border: "1px solid rgba(244,63,94,0.2)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--accent)" }} />
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code administrateur"
              required
              autoFocus
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-300 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.3)]"
              style={{
                background: "var(--bg3)",
                color: "var(--text)",
                border: "1px solid var(--border2)",
              }}
            />
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer btn-gradient">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Entrer
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            Heaven Studio &middot; Benelux
          </p>
        </div>
      </div>
    </div>
  );
}

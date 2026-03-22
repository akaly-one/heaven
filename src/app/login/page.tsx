"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Zap } from "lucide-react";

// Access codes — Phase 0 (hardcoded). Phase prod: Supabase dynamic codes.
const ACCESS_CODES: Record<string, { role: string; redirect: string; scope: string[] }> = {
  one: { role: "admin", redirect: "/", scope: ["*"] },
  yumi: { role: "agence", redirect: "/agence", scope: ["/agence"] },
};

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

    await new Promise((r) => setTimeout(r, 400));

    const access = ACCESS_CODES[code.trim().toLowerCase()];
    if (access) {
      sessionStorage.setItem("heaven_auth", JSON.stringify({ role: access.role, scope: access.scope, loggedAt: new Date().toISOString() }));
      router.push(access.redirect);
    } else {
      setError("Code invalide");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 relative overflow-hidden" style={{ background: "var(--sq-bg)" }}>
      {/* Animated mesh bg */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 800px 600px at 20% 20%, rgba(201,168,76,0.08), transparent),
          radial-gradient(ellipse 600px 500px at 80% 80%, rgba(91,141,239,0.06), transparent),
          radial-gradient(ellipse 400px 400px at 50% 50%, rgba(167,139,250,0.04), transparent)
        `,
      }} />
      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none opacity-30" style={{
        backgroundImage: "radial-gradient(rgba(201,168,76,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />
      {/* Floating orbs */}
      <div className="fixed pointer-events-none" style={{
        width: 500, height: 500, borderRadius: "50%", top: "-10%", right: "-5%",
        background: "radial-gradient(circle, rgba(201,168,76,0.1), transparent 70%)",
        filter: "blur(60px)",
      }} />
      <div className="fixed pointer-events-none" style={{
        width: 400, height: 400, borderRadius: "50%", bottom: "-10%", left: "-5%",
        background: "radial-gradient(circle, rgba(91,141,239,0.08), transparent 70%)",
        filter: "blur(50px)",
      }} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .login-card { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .shake { animation: shakeX 0.5s ease; }
      `}</style>

      <div className={`login-card glass rounded-2xl p-10 max-w-sm w-full relative z-10 ${shake ? "shake" : ""}`}
        style={{ boxShadow: "0 0 80px rgba(201,168,76,0.06), 0 20px 60px rgba(0,0,0,0.4)" }}>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #C9A84C, #D4AF37, #E8C76A)",
              boxShadow: "0 0 40px rgba(201,168,76,0.3), 0 8px 24px rgba(0,0,0,0.3)",
            }}>
            <Zap className="w-8 h-8" style={{ color: "#06060B" }} />
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-2xl" style={{
              border: "2px solid rgba(201,168,76,0.3)",
              animation: "pulse 3s ease-in-out infinite",
            }} />
          </div>
        </div>

        <h1 className="text-2xl font-black text-center mb-1 shimmer-gold tracking-wide">
          Heaven Studio
        </h1>
        <p className="text-center mb-8 text-sm" style={{ color: "var(--sq-text-muted)" }}>
          Cockpit administrateur
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center"
            style={{ background: "rgba(255,77,106,0.1)", color: "var(--sq-danger)", border: "1px solid rgba(255,77,106,0.2)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sq-gold)" }} />
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code administrateur"
              required
              autoFocus
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-300 focus:shadow-[0_0_0_2px_rgba(201,168,76,0.3)]"
              style={{
                background: "var(--sq-bg3)",
                color: "var(--sq-text)",
                border: "1px solid var(--sq-border2)",
              }}
            />
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_24px_rgba(201,168,76,0.3)] hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #C9A84C, #D4AF37)",
              color: "#06060B",
            }}>
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                Entrer
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] tracking-widest uppercase" style={{ color: "var(--sq-text-muted)" }}>
            Heaven Studio &middot; Benelux
          </p>
        </div>
      </div>
    </div>
  );
}

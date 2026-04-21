"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Crown } from "lucide-react";

// Auth API (proxied through local /api/auth/login which handles JWT)

// Live-sync avatar: resolved via /api/models/photo?login=... so the bubble
// reflects whatever portrait the model has currently set in her CP profile.
const AVATAR_DEBOUNCE_MS = 350;

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Debounced live-sync: fetch model portrait whenever the login looks valid
  useEffect(() => {
    const trimmed = login.trim().replace(/^@/, "").toLowerCase();
    if (trimmed.length < 3) {
      setAvatarUrl(null);
      return;
    }
    const timer = setTimeout(async () => {
      setAvatarLoading(true);
      try {
        const res = await fetch(
          `/api/models/photo?login=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setAvatarUrl(data.url || null);
        } else {
          setAvatarUrl(null);
        }
      } catch {
        setAvatarUrl(null);
      } finally {
        setAvatarLoading(false);
      }
    }, AVATAR_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [login]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), code: code.trim() }),
      });

      const data = await res.json();

      if (data.valid) {
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
      } else {
        setError("Code invalide");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setIsLoading(false);
      }
    } catch {
      setError("Erreur de connexion");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen px-4 relative overflow-hidden"
      style={{ background: "#0A0A0C" }}
    >
      {/* Ambient lights — soft gold glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 900px 700px at 15% 20%, rgba(201,168,76,0.08), transparent),
            radial-gradient(ellipse 700px 600px at 85% 80%, rgba(212,175,55,0.05), transparent),
            radial-gradient(ellipse 500px 500px at 50% 50%, rgba(158,124,31,0.04), transparent)
          `,
        }}
      />

      {/* Film grain noise */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.8'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vertical fine lines decoration */}
      <div
        className="fixed inset-y-0 left-12 w-px pointer-events-none opacity-20"
        style={{
          background: "linear-gradient(to bottom, transparent, #C9A84C, transparent)",
        }}
      />
      <div
        className="fixed inset-y-0 right-12 w-px pointer-events-none opacity-20"
        style={{
          background: "linear-gradient(to bottom, transparent, #C9A84C, transparent)",
        }}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
        }
        @keyframes glowLogo {
          0%, 100% {
            box-shadow: 0 0 32px rgba(201,168,76,0.18), 0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
          }
          50% {
            box-shadow: 0 0 56px rgba(201,168,76,0.35), 0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
          }
        }
        @keyframes pulseBorder {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.04); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .login-card {
          animation: fadeUp 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
          font-family: 'Inter', -apple-system, Arial, sans-serif;
        }
        .brand-title {
          font-family: 'Inter', -apple-system, Arial, sans-serif;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .shake { animation: shakeX 0.45s ease; }
        .logo-box { animation: glowLogo 4s ease-in-out infinite; }
        .logo-border-pulse { animation: pulseBorder 3s ease-in-out infinite; }
        .logo-star-twinkle { animation: twinkle 2.5s ease-in-out infinite; }

        /* Photo reveal animation */
        @keyframes photoReveal {
          0% {
            opacity: 0;
            transform: scale(0.92);
            filter: blur(8px) saturate(0.4);
          }
          60% {
            opacity: 0.9;
            filter: blur(2px) saturate(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0) saturate(1);
          }
        }
        .photo-reveal {
          animation: photoReveal 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both;
        }

        /* Shimmer bar sweeping across the portrait */
        @keyframes shimmerSweep {
          0%   { transform: translateX(-60px) rotate(25deg); opacity: 0; }
          30%  { opacity: 0.6; }
          70%  { opacity: 0.6; }
          100% { transform: translateX(260px) rotate(25deg); opacity: 0; }
        }
        .shimmer-bar {
          animation: shimmerSweep 5s ease-in-out infinite;
          animation-delay: 2s;
        }

        /* Avatar bubble reveal (when photo URL resolves) */
        @keyframes avatarReveal {
          0%   { opacity: 0; transform: scale(0.85); filter: blur(4px); }
          100% { opacity: 1; transform: scale(1);    filter: blur(0);    }
        }
        .avatar-reveal {
          animation: avatarReveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes avatarBreath {
          0%, 100% { box-shadow: 0 0 0 1px rgba(230,201,116,0.35), 0 4px 12px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 0 0 1px rgba(230,201,116,0.55), 0 6px 20px rgba(201,168,76,0.3); }
        }
        .avatar-bubble {
          animation: avatarBreath 3.5s ease-in-out infinite;
        }

        .gold-button {
          background: linear-gradient(135deg, #C9A84C 0%, #D4AF37 50%, #9E7C1F 100%);
          background-size: 200% 200%;
          transition: background-position 0.6s ease, transform 0.3s ease, box-shadow 0.3s ease;
        }
        .gold-button:hover:not(:disabled) {
          background-position: 100% 0;
          box-shadow: 0 0 32px rgba(201,168,76,0.35), 0 8px 24px rgba(0,0,0,0.4);
          transform: translateY(-1px);
        }

        .input-luxe {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(201,168,76,0.15);
          transition: all 0.3s ease;
          color: #F5F3EF;
          letter-spacing: 0.12em;
        }
        .input-luxe::placeholder {
          color: rgba(245,243,239,0.35);
          letter-spacing: 0.08em;
          font-size: 11px;
          text-transform: uppercase;
        }
        .input-luxe:focus {
          outline: none;
          border-color: rgba(201,168,76,0.5);
          background: rgba(255,255,255,0.04);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.08);
        }

        .divider-ornament {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(201,168,76,0.4);
        }
        .divider-ornament::before,
        .divider-ornament::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(201,168,76,0.25), transparent);
        }
      `}</style>

      <div
        className={`login-card relative z-10 w-full max-w-[420px] ${shake ? "shake" : ""}`}
        style={{
          background: "linear-gradient(180deg, rgba(20,20,24,0.75) 0%, rgba(10,10,12,0.85) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(201,168,76,0.12)",
          borderRadius: "2px",
          padding: "56px 48px 44px",
          boxShadow:
            "0 0 1px rgba(201,168,76,0.3), 0 40px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Corner ornaments */}
        <div
          className="absolute top-0 left-0 w-8 h-8 pointer-events-none"
          style={{
            borderTop: "1px solid rgba(201,168,76,0.35)",
            borderLeft: "1px solid rgba(201,168,76,0.35)",
          }}
        />
        <div
          className="absolute top-0 right-0 w-8 h-8 pointer-events-none"
          style={{
            borderTop: "1px solid rgba(201,168,76,0.35)",
            borderRight: "1px solid rgba(201,168,76,0.35)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none"
          style={{
            borderBottom: "1px solid rgba(201,168,76,0.35)",
            borderLeft: "1px solid rgba(201,168,76,0.35)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
          style={{
            borderBottom: "1px solid rgba(201,168,76,0.35)",
            borderRight: "1px solid rgba(201,168,76,0.35)",
          }}
        />

        {/* Compact logo — rounded square with Crown + twinkle Star */}
        <div className="flex justify-center mb-8">
          <div
            className="logo-box w-20 h-20 flex items-center justify-center relative"
            style={{
              background:
                "linear-gradient(135deg, #E6C974 0%, #C9A84C 50%, #9E7C1F 100%)",
              borderRadius: "18px",
            }}
          >
            <div
              className="absolute inset-0 rounded-[18px]"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)",
              }}
            />
            <Crown
              className="w-9 h-9 relative z-10"
              style={{ color: "#0A0A0C" }}
              strokeWidth={1.8}
            />
            <svg
              className="absolute top-1.5 right-1.5 logo-star-twinkle"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M7 1 L8.3 5.7 L13 7 L8.3 8.3 L7 13 L5.7 8.3 L1 7 L5.7 5.7 Z"
                fill="#FFF8E7"
                opacity="0.9"
              />
            </svg>
            <div
              className="absolute inset-0 rounded-[18px] logo-border-pulse pointer-events-none"
              style={{
                border: "1.5px solid rgba(230,201,116,0.5)",
              }}
            />
          </div>
        </div>

        <div className="divider-ornament mb-8">
          <span style={{ fontSize: 10, letterSpacing: "0.3em" }}>✦</span>
        </div>

        {error && (
          <div
            className="mb-5 px-4 py-3 text-center text-[11px]"
            style={{
              background: "rgba(220,38,38,0.06)",
              color: "#F87171",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: "2px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="relative">
            {/* Live-sync avatar bubble — reflects current model profile photo */}
            <div
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
              aria-hidden="true"
            >
              <div
                className="relative w-10 h-10 flex items-center justify-center overflow-hidden avatar-bubble"
                style={{
                  background:
                    "linear-gradient(135deg, #E6C974 0%, #C9A84C 50%, #9E7C1F 100%)",
                  borderRadius: "50%",
                  padding: "2px",
                  boxShadow: "0 0 0 1px rgba(230,201,116,0.35), 0 4px 12px rgba(0,0,0,0.4)",
                }}
              >
                <div
                  className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: "#0A0A0C" }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt=""
                      className="w-full h-full object-cover avatar-reveal"
                    />
                  ) : (
                    // Fallback silhouette SVG
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <defs>
                        <linearGradient id="bubbleGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#E6C974" stopOpacity="0.75" />
                          <stop offset="100%" stopColor="#9E7C1F" stopOpacity="0.35" />
                        </linearGradient>
                      </defs>
                      <circle cx="18" cy="14" r="6" fill="url(#bubbleGrad)" />
                      <path
                        d="M6 34 Q6 23 18 23 Q30 23 30 34 Z"
                        fill="url(#bubbleGrad)"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Identifiant"
              required
              autoFocus
              autoComplete="username"
              spellCheck={false}
              className="input-luxe w-full pl-[60px] pr-5 py-4 text-sm"
              style={{ borderRadius: "2px" }}
            />
          </div>

          <div className="relative">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code d'accès"
              required
              autoComplete="current-password"
              className="input-luxe w-full px-5 py-4 text-sm"
              style={{ borderRadius: "2px", marginBottom: "8px" }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="gold-button w-full py-4 text-[11px] flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            style={{
              color: "#0A0A0C",
              fontWeight: 600,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              borderRadius: "2px",
              border: "none",
            }}
          >
            {isLoading ? (
              <div
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: "rgba(10,10,12,0.3)", borderTopColor: "#0A0A0C" }}
              />
            ) : (
              <>
                Entrer
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        {/* Footer — minimal decorative line only */}
        <div className="mt-8 flex justify-center">
          <div
            className="w-12 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(201,168,76,0.5), transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

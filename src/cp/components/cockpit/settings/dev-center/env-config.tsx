"use client";

import { useEffect, useState } from "react";
import {
  Database, Cloud, CreditCard, Server, Globe, CheckCircle, AlertCircle,
  RefreshCw, Flag, Bug, ChevronDown, ChevronUp,
} from "lucide-react";

interface SystemStatus {
  db: { tables: number; total_rows: number };
  env: {
    paypal_configured: boolean;
    revolut_configured: boolean;
    cloudinary_configured: boolean;
    sqwensy_configured: boolean;
  };
}

interface Props {
  authHeaders: () => HeadersInit;
}

// Feature flags locaux — défaut actif/inactif (MVP read-only affichage)
const FEATURE_FLAGS = [
  { key: "messaging_unified_contacts", label: "Messagerie — fusion contacts multi-canal", enabled: true, scope: "brief B7" },
  { key: "dashboard_ig_header", label: "Dashboard — header IG live + avatar sync", enabled: true, scope: "brief B9" },
  { key: "packs_visibility_rules", label: "Packs — règles preview_blur + if_purchased", enabled: true, scope: "brief B8" },
  { key: "agent_dm_auto_reply", label: "Agent DM — auto-reply IA", enabled: false, scope: "brief B11 (Phase 6)" },
  { key: "release_form_portal", label: "Release Form — portail modèle pré-remplissable", enabled: false, scope: "brief B6 (Phase 7)" },
  { key: "mode_b_b2b", label: "Mode B (B2B onboarding)", enabled: false, scope: "conditionnel S7" },
];

// ENV masking for secrets
const ENV_VARS_READONLY = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", masked: false, category: "Supabase" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", masked: true, category: "Supabase" },
  { key: "CLOUDINARY_CLOUD_NAME", masked: false, category: "Cloudinary" },
  { key: "CLOUDINARY_API_SECRET", masked: true, category: "Cloudinary" },
  { key: "NEXT_PUBLIC_PAYPAL_CLIENT_ID", masked: false, category: "PayPal" },
  { key: "PAYPAL_CLIENT_SECRET", masked: true, category: "PayPal" },
  { key: "PAYPAL_WEBHOOK_ID", masked: true, category: "PayPal" },
  { key: "REVOLUT_API_SECRET_KEY", masked: true, category: "Revolut" },
  { key: "REVOLUT_WEBHOOK_SECRET", masked: true, category: "Revolut" },
  { key: "SQWENSY_API_URL", masked: false, category: "SQWENSY" },
  { key: "SQWENSY_INTERNAL_TOKEN", masked: true, category: "SQWENSY" },
  { key: "JWT_SECRET", masked: true, category: "Auth" },
];

/**
 * Dev Center — sous-onglet Config dev.
 * Variables env (read-only, masquées pour secrets), feature flags, debug mode toggle.
 */
export function EnvConfig({ authHeaders }: Props) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Supabase");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/system/status", { headers: authHeaders() });
      const d = await r.json();
      if (!d.error) setStatus(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      const saved = localStorage.getItem("heaven_debug_mode");
      if (saved === "true") setDebugMode(true);
    } catch { /* ignore */ }
  }, []);

  const toggleDebug = () => {
    const next = !debugMode;
    setDebugMode(next);
    try { localStorage.setItem("heaven_debug_mode", String(next)); } catch { /* ignore */ }
  };

  const categories = Array.from(new Set(ENV_VARS_READONLY.map((v) => v.category)));

  return (
    <div className="space-y-4">
      {/* Infrastructure status */}
      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Infrastructure</h3>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 rounded-lg cursor-pointer hover:scale-105 transition-transform disabled:opacity-50"
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Supabase", icon: Database, configured: true, sub: status ? `${status.db.tables} tables` : "…" },
            { label: "Cloudinary", icon: Cloud, configured: status?.env.cloudinary_configured ?? false, sub: "CDN média" },
            { label: "PayPal", icon: CreditCard, configured: status?.env.paypal_configured ?? false, sub: "Paiements" },
            { label: "Revolut", icon: CreditCard, configured: status?.env.revolut_configured ?? false, sub: "Paiements" },
            { label: "SQWENSY", icon: Globe, configured: status?.env.sqwensy_configured ?? false, sub: "Sync global" },
            { label: "Vercel", icon: Server, configured: true, sub: "Hosting" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3"
              style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-3.5 h-3.5" style={{ color: s.configured ? "#10B981" : "#F59E0B" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{s.label}</span>
              </div>
              {s.configured ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
                >
                  <CheckCircle className="w-2.5 h-2.5" /> Configuré
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}
                >
                  <AlertCircle className="w-2.5 h-2.5" /> À configurer
                </span>
              )}
              <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature flags */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flag className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Feature flags</h3>
        </div>
        <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
          Lecture seule — pilotés par code (`src/shared/config/feature-flags.ts`) ou env vars Vercel.
        </p>
        <div className="space-y-1.5">
          {FEATURE_FLAGS.map((flag) => (
            <div
              key={flag.key}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{flag.key}</code>
                </div>
                <p className="text-[11px] truncate" style={{ color: "var(--text)" }}>{flag.label}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{flag.scope}</p>
              </div>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                style={{
                  background: flag.enabled ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)",
                  color: flag.enabled ? "#10B981" : "#94A3B8",
                }}
              >
                {flag.enabled ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Env vars */}
      <div className="card-premium p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Variables d&apos;environnement</h3>
        <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
          Lecture seule — les secrets sont masqués. Configuration via Vercel → Settings → Env vars.
        </p>
        <div className="space-y-2">
          {categories.map((cat) => {
            const vars = ENV_VARS_READONLY.filter((v) => v.category === cat);
            const expanded = expandedCategory === cat;
            return (
              <div key={cat} className="rounded-lg" style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}>
                <button
                  onClick={() => setExpandedCategory(expanded ? null : cat)}
                  className="w-full flex items-center justify-between px-3 py-2 cursor-pointer"
                  style={{ background: "none", border: "none" }}
                >
                  <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{cat}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{vars.length}</span>
                    {expanded ? <ChevronUp className="w-3 h-3" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                  </div>
                </button>
                {expanded && (
                  <div className="px-3 pb-3 space-y-1">
                    {vars.map((v) => (
                      <div key={v.key} className="flex items-center justify-between gap-2 px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
                        <code className="text-[10px] font-mono truncate" style={{ color: "var(--accent)" }}>{v.key}</code>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            background: v.masked ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                            color: v.masked ? "#EF4444" : "#10B981",
                          }}
                        >
                          {v.masked ? "•••••" : "PUBLIC"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Debug mode */}
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bug className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Debug mode</h3>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={toggleDebug}
            className="cursor-pointer"
            style={{ accentColor: "var(--accent)" }}
          />
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text)" }}>
              Activer le mode debug (localStorage `heaven_debug_mode`)
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Affiche les logs verbose, stack traces et headers API côté client.
            </p>
          </div>
        </label>
        {debugMode && (
          <div
            className="mt-3 rounded-lg p-2 text-[10px] font-mono"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
          >
            ⚠ Debug ON — rechargez la page pour appliquer
          </div>
        )}
      </div>
    </div>
  );
}

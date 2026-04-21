"use client";

import { useEffect, useState } from "react";
import { Zap, Sliders, Database, BarChart3, ExternalLink } from "lucide-react";
import { ArchitectureMap } from "./dev-center/architecture-map";
import { EnvConfig } from "./dev-center/env-config";
import { MigrationsLog } from "./dev-center/migrations-log";

type DevSection = "architecture" | "config" | "migrations" | "ops";

interface Props {
  authHeaders: () => HeadersInit;
  initialSection?: DevSection;
}

const SECTIONS: { id: DevSection; label: string; icon: typeof Zap }[] = [
  { id: "architecture", label: "Architecture", icon: Zap },
  { id: "config", label: "Config dev", icon: Sliders },
  { id: "migrations", label: "Migrations", icon: Database },
  { id: "ops", label: "Ops metrics", icon: BarChart3 },
];

/**
 * Dev Center — orchestrateur sous-onglets (brief B1).
 * Sous-sections : Architecture (ex /agence/architecture) + Config dev + Migrations + Ops metrics.
 * Admin-only (root + yumi admin).
 */
export function DevCenterPanel({ authHeaders, initialSection }: Props) {
  const [section, setSection] = useState<DevSection>(initialSection ?? "architecture");

  // Sync from ?section param (support deep link from /agence/architecture redirect)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("section") as DevSection | null;
    if (s && SECTIONS.some((sec) => sec.id === s)) {
      setSection(s);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Info header */}
      <div
        className="rounded-xl p-3 text-[11px] flex items-start gap-2"
        style={{ background: "rgba(232,67,147,0.08)", border: "1px solid rgba(232,67,147,0.2)", color: "var(--text-muted)" }}
      >
        <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#E84393" }} />
        <p>
          Console technique consolidée (brief B1) : Architecture Heaven + config dev + migrations DB + Ops metrics.
          Admin-only (root + yumi).
        </p>
      </div>

      {/* Sub-section tabs */}
      <div className="segmented-control">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={section === s.id ? "active" : ""}
          >
            <s.icon className="w-3.5 h-3.5 inline mr-1.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === "architecture" && <ArchitectureMap />}
      {section === "config" && <EnvConfig authHeaders={authHeaders} />}
      {section === "migrations" && <MigrationsLog authHeaders={authHeaders} />}
      {section === "ops" && (
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Ops metrics</h3>
          </div>
          <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
            Metrics Ops en temps réel — latence API, uptime, rate limits, erreurs récentes.
            Page dédiée disponible à <code className="text-[10px] px-1 rounded" style={{ background: "var(--bg)", color: "var(--accent)" }}>/agence/ops</code>.
          </p>
          <a
            href="/agence/ops"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:scale-[1.02] transition-transform"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            Ouvrir Ops metrics
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

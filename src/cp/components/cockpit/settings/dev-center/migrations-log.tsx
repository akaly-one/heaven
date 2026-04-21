"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, CheckCircle, Clock, FileText } from "lucide-react";

interface Migration {
  version: string;
  name?: string;
  applied_at?: string;
  statements?: string[];
}

interface Props {
  authHeaders: () => HeadersInit;
}

/**
 * Dev Center — sous-onglet Migrations log (read-only).
 * Liste des migrations appliquées lue depuis supabase_migrations.schema_migrations
 * via endpoint de lecture dédié (ou fallback static si pas d'API).
 */
export function MigrationsLog({ authHeaders }: Props) {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Tentative 1 : endpoint dédié (peut exister ou pas)
      const r = await fetch("/api/system/migrations", { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.migrations)) {
          setMigrations(d.migrations);
          return;
        }
      }
      // Fallback : endpoint system/status avec info migrations éventuelles
      const fallback = await fetch("/api/system/status", { headers: authHeaders() });
      if (fallback.ok) {
        const d = await fallback.json();
        if (Array.isArray(d.migrations)) {
          setMigrations(d.migrations);
          return;
        }
      }
      setError("Aucun endpoint de lecture migrations disponible. Afficher via Supabase MCP ou dashboard.");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Migrations appliquées</h3>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg cursor-pointer hover:scale-105 disabled:opacity-50"
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
        <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>
          Lecture seule depuis <code className="text-[10px] px-1 rounded" style={{ background: "var(--bg)", color: "var(--accent)" }}>supabase_migrations.schema_migrations</code>.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
          </div>
        ) : error ? (
          <div
            className="rounded-lg p-3 text-[11px]"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}
          >
            {error}
            <p className="mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
              Les fichiers de migration sont dans <code>supabase/migrations/</code>. Utiliser Supabase CLI ou MCP pour état actuel.
            </p>
          </div>
        ) : migrations.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Aucune migration enregistrée.</p>
        ) : (
          <div className="space-y-2">
            {migrations.map((m) => (
              <div
                key={m.version}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
              >
                <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#10B981" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono font-semibold" style={{ color: "var(--accent)" }}>
                      {m.version}
                    </code>
                    {m.name && (
                      <span className="text-[11px] truncate" style={{ color: "var(--text)" }}>
                        {m.name}
                      </span>
                    )}
                  </div>
                  {m.applied_at && (
                    <p className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(m.applied_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                </div>
                {m.statements && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1"
                    style={{ background: "rgba(99,102,241,0.1)", color: "#6366F1" }}
                  >
                    <FileText className="w-2.5 h-2.5" />
                    {m.statements.length}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="rounded-xl p-3 text-[11px]"
        style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", color: "var(--text-muted)" }}
      >
        <p className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" style={{ color: "#6366F1" }} />
          Source : <code className="px-1 rounded" style={{ background: "var(--bg)", color: "var(--accent)" }}>supabase/migrations/*.sql</code>
        </p>
      </div>
    </div>
  );
}

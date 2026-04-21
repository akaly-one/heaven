"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Clock, Loader2, ShieldCheck } from "lucide-react";

interface ContractVersion {
  id: string;
  version: number;
  contract_url: string;
  signed_url?: string | null;
  signed_at: string | null;
  amendment_reason: string | null;
  created_at: string;
}

interface ContractVersionsListProps {
  modelId: string;
  authHeaders: () => HeadersInit;
  refreshToken?: number;
}

/**
 * Agent 7.C — Contract versions list with signed URLs (15 min).
 *
 * - Liste versions depuis agence_contracts_versions (migration 045).
 * - Version active = max(version). Signed URL generee par la route API.
 * - Audit trail : contract_url, signed_at, amendment_reason.
 */
export function ContractVersionsList({
  modelId,
  authHeaders,
  refreshToken,
}: ContractVersionsListProps) {
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/agence/models/${modelId}/contract`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Erreur chargement");
          return;
        }
        setVersions(data.versions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur reseau");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, refreshToken]);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <FileText size={18} style={{ color: "var(--accent)" }} />
        <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Historique contrats
        </h3>
      </header>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Bucket prive <code>contracts-private</code> — append-only. URLs signees 15
        minutes, scope <code>contract:view</code> requis.
      </p>

      {loading ? (
        <div
          className="flex items-center gap-2 text-[12px]"
          style={{ color: "var(--text-muted)" }}
        >
          <Loader2 size={14} className="animate-spin" /> Chargement...
        </div>
      ) : error ? (
        <p
          className="rounded-md px-3 py-2 text-[12px]"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
        >
          {error}
        </p>
      ) : versions.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
          Aucun contrat enregistre. Genere ou uploade la premiere version
          ci-dessous.
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((v, idx) => {
            const isActive = idx === 0; // versions sorted DESC
            return (
              <li
                key={v.id}
                className="glass rounded-lg p-3"
                style={{
                  border: isActive
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: isActive ? "var(--accent)" : "var(--surface)",
                        color: isActive ? "white" : "var(--text-muted)",
                      }}
                    >
                      {isActive && <ShieldCheck size={10} />} v{v.version}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Clock size={10} className="inline mr-1" />
                      {v.signed_at
                        ? new Date(v.signed_at).toLocaleString("fr-FR")
                        : "non signe"}
                    </span>
                  </div>
                  {v.signed_url && (
                    <a
                      href={v.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      <Download size={12} /> Telecharger
                    </a>
                  )}
                </div>
                {v.amendment_reason && (
                  <p
                    className="mt-2 text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Motif : {v.amendment_reason}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

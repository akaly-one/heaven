"use client";

/**
 * BRIEF-10 TICKET-AG11 — Queue admin verification
 *
 * Liste les fans en attente de validation handle (access_level='pending_upgrade').
 * Actions par ligne : Valider / Rejeter (modal raison) / Voir profil complet.
 * Tri par created_at ASC (les plus anciens en premier).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";
import { getConversationPseudo } from "@/shared/lib/messaging/conversation-display";

interface QueueRow {
  id: string;
  model: string;
  pseudo_insta?: string | null;
  pseudo_snap?: string | null;
  nickname?: string | null;
  firstname?: string | null;
  created_at: string;
  age_certified?: boolean | null;
  age_certified_at?: string | null;
  access_level?: string | null;
}

// NB 2026-04-24 — source unique : getConversationPseudo()
// Fallbacks locaux uniquement pour nickname/firstname (propres à agence_clients).
function primaryHandle(row: QueueRow): string {
  const resolved = getConversationPseudo({
    pseudo_insta: row.pseudo_insta,
    pseudo_snap: row.pseudo_snap,
    fan_id: row.id,
  });
  if (resolved && !resolved.startsWith("visiteur-")) return resolved;
  if (row.nickname) return row.nickname;
  if (row.firstname) return row.firstname;
  return resolved || row.id.slice(0, 8);
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `il y a ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    return `il y a ${d}j`;
  } catch {
    return "—";
  }
}

export default function VerificationQueuePage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agence/verification-queue");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          typeof d.error === "string" ? d.error : `HTTP ${res.status}`
        );
      }
      const data = await res.json();
      setRows(Array.isArray(data.queue) ? data.queue : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  async function doValidate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/agence/clients/${id}/validate`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          typeof d.error === "string" ? d.error : `HTTP ${res.status}`
        );
      }
      // Remove from list
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  async function doReject(id: string) {
    if (!rejectReason.trim()) {
      setError("Raison requise");
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/agence/clients/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          typeof d.error === "string" ? d.error : `HTTP ${res.status}`
        );
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setRejectFor(null);
      setRejectReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <OsLayout>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <header className="mb-6 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #E6C974, #9E7C1F)" }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: "#0A0A0C" }} />
          </div>
          <div>
            <h1
              className="text-lg md:text-xl font-bold"
              style={{ color: "var(--text)" }}
            >
              File validation handle
            </h1>
            <p
              className="text-[11px] md:text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Fans ayant fourni un handle IG/Snap, en attente de validation
              admin avant accès explicite/packs.
            </p>
          </div>
          <div className="ml-auto">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(230,201,116,0.12)",
                color: "#E6C974",
                border: "1px solid rgba(230,201,116,0.28)",
              }}
            >
              {rows.length} en attente
            </span>
          </div>
        </header>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-xs"
            style={{
              background: "rgba(220,38,38,0.08)",
              color: "#F87171",
              border: "1px solid rgba(220,38,38,0.22)",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            className="flex items-center justify-center py-12"
            style={{ color: "var(--text-muted)" }}
          >
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-xs">Chargement…</span>
          </div>
        ) : rows.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <p className="text-sm">Aucun fan en attente de validation.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const handle = primaryHandle(r);
              const isRejecting = rejectFor === r.id;
              return (
                <article
                  key={r.id}
                  className="rounded-xl p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Avatar + handle + meta */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #E6C974, #9E7C1F)",
                        color: "#0A0A0C",
                      }}
                    >
                      {handle.replace(/^@/, "").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--text)" }}
                      >
                        {handle}
                      </div>
                      <div
                        className="text-[11px] inline-flex items-center gap-1 mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Clock className="w-3 h-3" />
                        Ajouté {timeAgo(r.created_at)}
                        {r.age_certified && (
                          <>
                            <span className="mx-1">•</span>
                            <span style={{ color: "#10B981" }}>18+ OK</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isRejecting ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => doValidate(r.id)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold"
                        style={{
                          background:
                            "linear-gradient(135deg, #E6C974, #C9A84C)",
                          color: "#0A0A0C",
                          minHeight: "36px",
                        }}
                      >
                        {busyId === r.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectFor(r.id);
                          setRejectReason("");
                        }}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: "rgba(220,38,38,0.08)",
                          color: "#F87171",
                          border: "1px solid rgba(220,38,38,0.22)",
                          minHeight: "36px",
                        }}
                      >
                        <X className="w-3 h-3" />
                        Rejeter
                      </button>
                      <Link
                        href={`/agence/clients/${r.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: "var(--bg2)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          minHeight: "36px",
                        }}
                        aria-label="Voir profil complet"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto">
                      <input
                        autoFocus
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Raison du rejet…"
                        className="flex-1 md:w-52 text-xs px-2.5 py-1.5 rounded-lg bg-transparent outline-none"
                        style={{
                          border: "1px solid var(--border)",
                          color: "var(--text)",
                          minHeight: "36px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => doReject(r.id)}
                        disabled={busyId === r.id || !rejectReason.trim()}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                        style={{
                          background: "rgba(220,38,38,0.14)",
                          color: "#F87171",
                          border: "1px solid rgba(220,38,38,0.32)",
                          minHeight: "36px",
                        }}
                      >
                        {busyId === r.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        Confirmer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectFor(null);
                          setRejectReason("");
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: "var(--bg2)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          minHeight: "36px",
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </OsLayout>
  );
}

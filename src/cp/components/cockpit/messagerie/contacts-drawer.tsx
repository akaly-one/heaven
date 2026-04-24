"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  X,
  Globe,
  Instagram,
  Zap,
  Heart,
  GitMerge,
  ExternalLink,
  Loader2,
  Search,
  Clock,
  Tag,
  Sparkles,
  Package,
} from "lucide-react";
// BRIEF-10 AG06/AG10 — section certification âge + validation handle admin
import { AgeCertificationSection } from "./age-certification-section";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FanDrawerClient {
  id: string;
  model: string;
  pseudo?: string | null;
  pseudo_insta?: string | null;
  pseudo_snap?: string | null;
  tier?: string | null;
  avatar_url?: string | null;
  display_name?: string | null;
  // BRIEF-10 AG06/AG10 — certification + validation flow
  age_certified?: boolean | null;
  age_certified_at?: string | null;
  access_level?: string | null;
  validated_at?: string | null;
  validated_by?: string | null;
  rejected_at?: string | null;
  rejected_reason?: string | null;
}

export interface FanDrawerData {
  fan: {
    id: string;
    pseudo_web?: string | null;
    pseudo_insta?: string | null;
    pseudo_snap?: string | null;
    fanvue_handle?: string | null;
    phone?: string | null;
    email?: string | null;
    first_seen?: string | null;
    last_seen?: string | null;
    notes?: string | null;
  };
  linked_clients: FanDrawerClient[];
  purchases: Array<{
    id: string;
    pack_name?: string | null;
    price_eur?: number | null;
    created_at: string;
  }>;
}

interface ContactsDrawerProps {
  fanId: string | null;
  open: boolean;
  onClose: () => void;
}

interface MergeCandidate {
  fan_id: string;
  pseudo_insta?: string | null;
  pseudo_web?: string | null;
  display_name?: string | null;
  last_seen?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function primaryHandle(fan: FanDrawerData["fan"]): string {
  if (fan.pseudo_insta) return `@${fan.pseudo_insta}`;
  if (fan.pseudo_web) return fan.pseudo_web;
  if (fan.pseudo_snap) return fan.pseudo_snap;
  if (fan.fanvue_handle) return fan.fanvue_handle;
  return fan.id.slice(0, 8);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

interface StructuredNotes {
  tags?: string[];
  envies?: string[];
  critères_tchat?: string;
  demandes?: string[];
}

function parseNotes(raw: string | null | undefined): StructuredNotes | string | null {
  if (!raw) return null;
  if (typeof raw !== "string") return raw as unknown as StructuredNotes;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as StructuredNotes;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

// ── Channel badges ────────────────────────────────────────────────────────────

const HANDLE_META: Array<{
  key: "pseudo_web" | "pseudo_insta" | "pseudo_snap" | "fanvue_handle";
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  border: string;
  prefix: string;
}> = [
  {
    key: "pseudo_web",
    label: "Web",
    icon: Globe,
    color: "#9CA3AF",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.25)",
    prefix: "",
  },
  {
    key: "pseudo_insta",
    label: "Instagram",
    icon: Instagram,
    color: "#E1306C",
    bg: "rgba(225,48,108,0.1)",
    border: "rgba(225,48,108,0.28)",
    prefix: "@",
  },
  {
    key: "pseudo_snap",
    label: "Snapchat",
    icon: Zap,
    color: "#FFFC00",
    bg: "rgba(255,252,0,0.08)",
    border: "rgba(255,252,0,0.25)",
    prefix: "",
  },
  {
    key: "fanvue_handle",
    label: "Fanvue",
    icon: Heart,
    color: "#6D63F5",
    bg: "rgba(109,99,245,0.1)",
    border: "rgba(109,99,245,0.25)",
    prefix: "",
  },
];

// ── Merge modal ───────────────────────────────────────────────────────────────

function InlineMergeModal({
  fanId,
  onClose,
  onMerged,
}: {
  fanId: string;
  onClose: () => void;
  onMerged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MergeCandidate | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setCandidates([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/agence/fans/search?q=${encodeURIComponent(q)}&exclude=${fanId}`
        );
        if (res.ok) {
          const data = await res.json();
          setCandidates(Array.isArray(data.fans) ? data.fans : []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fanId]);

  const doMerge = async () => {
    if (!selected) return;
    setMerging(true);
    setError(null);
    try {
      const res = await fetch(`/api/agence/fans/${fanId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_fan_id: selected.fan_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erreur lors de la fusion");
        return;
      }
      onMerged();
      onClose();
    } finally {
      setMerging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4" style={{ color: "#C9A84C" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Fusionner avec…
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded opacity-60 hover:opacity-100"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" style={{ color: "var(--text)" }} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher @pseudo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full"
              style={{ color: "var(--text)" }}
            />
            {loading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--text-muted)" }} />
            )}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {query && candidates.length === 0 && !loading && (
              <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                Aucun résultat
              </p>
            )}
            {candidates.map((c) => {
              const active = selected?.fan_id === c.fan_id;
              const handle = c.pseudo_insta || c.pseudo_web || c.display_name || c.fan_id.slice(0, 8);
              return (
                <button
                  key={c.fan_id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="w-full text-left px-3 py-2 rounded-lg"
                  style={{
                    background: active ? "rgba(201,168,76,0.15)" : "var(--bg2)",
                    border: `1px solid ${active ? "rgba(201,168,76,0.4)" : "var(--border2)"}`,
                  }}
                >
                  <div className="text-xs font-medium" style={{ color: "var(--text)" }}>
                    {c.pseudo_insta ? `@${handle}` : handle}
                  </div>
                  {c.last_seen && (
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Dernier contact {formatDate(c.last_seen)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {error && (
            <div
              className="text-[11px] px-3 py-2 rounded"
              style={{
                background: "rgba(220,38,38,0.1)",
                color: "#F87171",
                border: "1px solid rgba(220,38,38,0.25)",
              }}
            >
              {error}
            </div>
          )}
          <div
            className="text-[10px] rounded px-3 py-2"
            style={{
              background: "rgba(201,168,76,0.08)",
              color: "#E6C974",
              border: "1px solid rgba(201,168,76,0.2)",
            }}
          >
            La fusion transférera tous les messages, achats et handles du fan actuel vers la fiche
            sélectionnée. Cette action est irréversible.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={doMerge}
              disabled={!selected || merging}
              className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
              style={{
                background: "linear-gradient(135deg, #E6C974, #C9A84C)",
                color: "#0A0A0C",
              }}
            >
              {merging ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <GitMerge className="w-3.5 h-3.5" />
              )}
              Fusionner
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs"
              style={{ border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

/**
 * Contacts drawer — right-hand panel shown next to the thread in the
 * messagerie unified view. Displays the fan's multi-channel handles,
 * structured notes (tastes, envies, demandes), and actions (go to full
 * profile, merge).
 */
export function ContactsDrawer({ fanId, open, onClose }: ContactsDrawerProps) {
  const [data, setData] = useState<FanDrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  // BRIEF-10 AG06 : détecte si root (affiche bouton révocation)
  const [isRoot, setIsRoot] = useState(false);
  // Reload trigger après mutation age gate
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("heaven_auth") ||
            sessionStorage.getItem("heaven_auth")
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        setIsRoot(parsed?.role === "root");
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!fanId || !open) {
      setData(null);
      return;
    }
    // Pseudo-fan ids ("pseudo:...") are not real DB rows — skip fetch.
    if (fanId.startsWith("pseudo:")) {
      setData(null);
      setError("Fan éphémère — aucune fiche consolidée disponible");
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/agence/fans/${fanId}`)
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) throw new Error("Fan introuvable");
          throw new Error("Erreur de chargement");
        }
        return r.json();
      })
      .then((j) => {
        setData(j);
      })
      .catch((err) => {
        setError(err.message || "Erreur");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fanId, open, reloadKey]);

  const totalSpent = useMemo(
    () => (data?.purchases || []).reduce((s, p) => s + (p.price_eur || 0), 0),
    [data?.purchases]
  );

  const notes = useMemo(() => parseNotes(data?.fan?.notes), [data?.fan?.notes]);
  const structured: StructuredNotes | null =
    notes && typeof notes === "object" ? (notes as StructuredNotes) : null;
  const freetext: string | null = typeof notes === "string" ? notes : null;

  if (!open) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        onClick={onClose}
        style={{ background: "rgba(0,0,0,0.55)" }}
      />

      <aside
        className="fixed lg:static inset-y-0 right-0 z-50 w-full sm:w-[380px] lg:w-[340px] xl:w-[380px] flex flex-col overflow-hidden"
        style={{
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #E6C974, #9E7C1F)" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#0A0A0C" }} />
            </div>
            <h3 className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
              Fiche fan
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 shrink-0"
            style={{ background: "var(--bg2)", color: "var(--text)" }}
            aria-label="Fermer le panneau fan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div
              className="flex items-center justify-center py-10 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Chargement…
            </div>
          )}

          {error && !loading && (
            <div
              className="m-4 p-3 text-[11px] rounded-lg"
              style={{
                background: "rgba(220,38,38,0.08)",
                color: "#F87171",
                border: "1px solid rgba(220,38,38,0.2)",
              }}
            >
              {error}
            </div>
          )}

          {data && !loading && !error && (
            <div className="p-4 space-y-4">
              {/* Identity block */}
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    background: "linear-gradient(135deg, #E6C974, #9E7C1F)",
                    color: "#0A0A0C",
                  }}
                >
                  {primaryHandle(data.fan).replace(/^@/, "").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {primaryHandle(data.fan)}
                  </div>
                  <div
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Vu depuis {formatDate(data.fan.first_seen)}
                  </div>
                  {data.fan.last_seen && (
                    <div
                      className="text-[10px] inline-flex items-center gap-1 mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      Dernière activité {formatDate(data.fan.last_seen)}
                    </div>
                  )}
                </div>
              </div>

              {/* Handles */}
              <section>
                <h4
                  className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Handles multi-canal
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {HANDLE_META.map((h) => {
                    const raw = data.fan[h.key] as string | null | undefined;
                    if (!raw) return null;
                    const Icon = h.icon;
                    return (
                      <span
                        key={h.key}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold"
                        style={{
                          background: h.bg,
                          color: h.color,
                          border: `1px solid ${h.border}`,
                        }}
                        title={`${h.label} — ${h.prefix}${raw}`}
                      >
                        <Icon className="w-3 h-3" />
                        {h.prefix}
                        {raw}
                      </span>
                    );
                  })}
                  {!HANDLE_META.some(
                    (h) => data.fan[h.key as keyof typeof data.fan]
                  ) && (
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Aucun handle enregistré
                    </span>
                  )}
                </div>
              </section>

              {/* KPIs */}
              <section className="grid grid-cols-2 gap-2">
                <div
                  className="rounded-lg p-2.5"
                  style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
                >
                  <div
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Total dépensé
                  </div>
                  <div
                    className="text-base font-bold mt-0.5"
                    style={{ color: "#E6C974" }}
                  >
                    {totalSpent.toFixed(0)}€
                  </div>
                </div>
                <div
                  className="rounded-lg p-2.5"
                  style={{ background: "var(--bg2)", border: "1px solid var(--border2)" }}
                >
                  <div
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Modèles liés
                  </div>
                  <div
                    className="text-base font-bold mt-0.5"
                    style={{ color: "var(--text)" }}
                  >
                    {data.linked_clients.length}
                  </div>
                </div>
              </section>

              {/* BRIEF-10 AG06/AG10 — Certification majorité + validation handle */}
              {data.linked_clients.length > 0 && (
                <>
                  {data.linked_clients.map((c) => (
                    <AgeCertificationSection
                      key={`agc-${c.id}`}
                      client={{
                        id: c.id,
                        age_certified: c.age_certified ?? null,
                        age_certified_at: c.age_certified_at ?? null,
                        access_level: c.access_level ?? null,
                        pseudo_insta: c.pseudo_insta ?? null,
                        pseudo_snap: c.pseudo_snap ?? null,
                        validated_at: c.validated_at ?? null,
                        validated_by: c.validated_by ?? null,
                        rejected_at: c.rejected_at ?? null,
                        rejected_reason: c.rejected_reason ?? null,
                      }}
                      isRoot={isRoot}
                      onMutated={() => setReloadKey((k) => k + 1)}
                    />
                  ))}
                </>
              )}

              {/* Structured context (goûts / envies / demandes / tchat) */}
              {structured && (
                <section className="space-y-2.5">
                  <h4
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Contexte & préférences
                  </h4>

                  {Array.isArray(structured.tags) && structured.tags.length > 0 && (
                    <div>
                      <div
                        className="text-[10px] font-semibold mb-1 inline-flex items-center gap-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <Tag className="w-3 h-3" />
                        Goûts
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {structured.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{
                              background: "rgba(201,168,76,0.12)",
                              color: "#E6C974",
                              border: "1px solid rgba(201,168,76,0.25)",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(structured.envies) && structured.envies.length > 0 && (
                    <div>
                      <div
                        className="text-[10px] font-semibold mb-1 inline-flex items-center gap-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <Heart className="w-3 h-3" />
                        Envies
                      </div>
                      <ul
                        className="space-y-0.5 text-[11px] list-disc pl-4"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {structured.envies.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(structured.demandes) && structured.demandes.length > 0 && (
                    <div>
                      <div
                        className="text-[10px] font-semibold mb-1 inline-flex items-center gap-1"
                        style={{ color: "#F59E0B" }}
                      >
                        <Sparkles className="w-3 h-3" />
                        Demandes
                      </div>
                      <ul
                        className="space-y-0.5 text-[11px] list-disc pl-4"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {structured.demandes.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {structured.critères_tchat && (
                    <div>
                      <div
                        className="text-[10px] font-semibold mb-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Critères tchat
                      </div>
                      <p
                        className="text-[11px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {structured.critères_tchat}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* Free-text notes fallback */}
              {freetext && (
                <section>
                  <h4
                    className="text-[10px] uppercase tracking-wider font-semibold mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Notes
                  </h4>
                  <p
                    className="text-[11px] whitespace-pre-wrap rounded-lg p-2.5"
                    style={{
                      color: "var(--text-secondary)",
                      background: "var(--bg2)",
                      border: "1px solid var(--border2)",
                    }}
                  >
                    {freetext}
                  </p>
                </section>
              )}

              {/* Recent purchases */}
              {data.purchases.length > 0 && (
                <section>
                  <h4
                    className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 inline-flex items-center gap-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Package className="w-3 h-3" />
                    Derniers achats
                  </h4>
                  <div className="space-y-1">
                    {data.purchases.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                        style={{
                          background: "var(--bg2)",
                          border: "1px solid var(--border2)",
                        }}
                      >
                        <div className="min-w-0">
                          <div
                            className="text-[11px] font-medium truncate"
                            style={{ color: "var(--text)" }}
                          >
                            {p.pack_name || "Pack"}
                          </div>
                          <div
                            className="text-[9px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {formatDate(p.created_at)}
                          </div>
                        </div>
                        <div
                          className="text-[11px] font-bold shrink-0"
                          style={{ color: "#E6C974" }}
                        >
                          {(p.price_eur || 0).toFixed(0)}€
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Actions */}
              <section className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/agence/clients/${data.fan.id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #E6C974, #C9A84C)",
                    color: "#0A0A0C",
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  Voir profil complet
                </Link>
                <button
                  type="button"
                  onClick={() => setMergeOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    color: "#A78BFA",
                    border: "1px solid rgba(124,58,237,0.28)",
                  }}
                >
                  <GitMerge className="w-3 h-3" />
                  Fusionner avec…
                </button>
              </section>
            </div>
          )}
        </div>

        {mergeOpen && data && (
          <InlineMergeModal
            fanId={data.fan.id}
            onClose={() => setMergeOpen(false)}
            onMerged={() => {
              // After merge, close drawer; parent will refresh the inbox.
              onClose();
            }}
          />
        )}
      </aside>
    </>
  );
}

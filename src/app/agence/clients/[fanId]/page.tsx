"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  GitMerge,
  Send,
  Package,
  Calendar,
  Search,
  X,
  Loader2,
  Users,
  Instagram,
} from "lucide-react";
import { useModel } from "@/lib/model-context";
import { OsLayout } from "@/components/os-layout";
import {
  FanProfileCard,
  type AgenceFan,
  type AgenceClient,
} from "@/components/cockpit/fan-profile-card";
import { FanTimeline, type TimelineItem } from "@/components/cockpit/fan-timeline";
import {
  FanHandlesManager,
  type FanHandles,
} from "@/components/cockpit/fan-handles-manager";
import { ReplyComposer, type ReplyChannel } from "@/components/cockpit/reply-composer";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FanPurchase {
  id: string;
  pack_name: string;
  price_eur: number;
  created_at: string;
  status?: string | null;
  model?: string | null;
  currency?: string | null;
}

interface FanApiResponse {
  fan: AgenceFan;
  linked_clients: AgenceClient[];
  purchases: FanPurchase[];
  timeline: TimelineItem[];
  instagram_conversations?: { id: string; ig_username?: string | null }[];
  sources?: ("web" | "instagram")[];
}

interface MergeCandidate {
  fan_id: string;
  pseudo_insta?: string | null;
  pseudo_web?: string | null;
  display_name?: string | null;
  last_seen?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function euro(amount: number, currency: string = "EUR"): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount}€`;
  }
}

// ── Merge modal ───────────────────────────────────────────────────────────────

function MergeModal({
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text)" }}
            >
              Fusionner avec un autre fan
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
            <Search
              className="w-3.5 h-3.5"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher @pseudo, nom…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full"
              style={{ color: "var(--text)" }}
            />
            {loading && (
              <Loader2
                className="w-3.5 h-3.5 animate-spin"
                style={{ color: "var(--text-muted)" }}
              />
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {query && candidates.length === 0 && !loading && (
              <p
                className="text-xs text-center py-4"
                style={{ color: "var(--text-muted)" }}
              >
                Aucun résultat
              </p>
            )}
            {candidates.map((c) => {
              const active = selected?.fan_id === c.fan_id;
              const handle =
                c.pseudo_insta ||
                c.pseudo_web ||
                c.display_name ||
                c.fan_id.slice(0, 8);
              return (
                <button
                  key={c.fan_id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="w-full text-left px-3 py-2 rounded-lg"
                  style={{
                    background: active
                      ? "rgba(201,168,76,0.15)"
                      : "var(--bg2)",
                    border: `1px solid ${
                      active ? "rgba(201,168,76,0.4)" : "var(--border2)"
                    }`,
                  }}
                >
                  <div
                    className="text-xs font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {c.pseudo_insta ? `@${handle}` : handle}
                  </div>
                  {c.last_seen && (
                    <div
                      className="text-[10px] mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
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
            La fusion transférera tous les messages, achats et handles du fan
            actuel vers la fiche sélectionnée. Cette action est irréversible.
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
              style={{
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reply drawer ──────────────────────────────────────────────────────────────

function ReplyDrawer({
  fanId,
  availableChannels,
  defaultChannel,
  onClose,
  onSent,
}: {
  fanId: string;
  availableChannels: ReplyChannel[];
  defaultChannel: ReplyChannel;
  onClose: () => void;
  onSent: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
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
            <Send className="w-4 h-4" style={{ color: "#C9A84C" }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text)" }}
            >
              Nouveau message
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
        <div className="p-4">
          <ReplyComposer
            fanId={fanId}
            availableChannels={availableChannels}
            defaultChannel={defaultChannel}
            onSent={() => {
              onSent();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { auth } = useModel();
  const fanId = String(params.fanId);

  const [data, setData] = useState<FanApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/agence/fans/${fanId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Ce fan n'existe pas");
          return;
        }
        setError("Erreur lors du chargement");
        return;
      }
      const json: FanApiResponse = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fanId]);

  // Derive available channels / default
  const sources = data?.sources || [];
  const availableChannels: ReplyChannel[] = useMemo(() => {
    const s = sources.filter((x) => x === "web" || x === "instagram");
    return s.length > 0 ? (s as ReplyChannel[]) : ["web"];
  }, [sources]);

  const defaultChannel: ReplyChannel = useMemo(() => {
    const latest = data?.timeline?.[0];
    if (latest?.source === "web" || latest?.source === "instagram") {
      return latest.source;
    }
    return availableChannels[0] || "web";
  }, [data?.timeline, availableChannels]);

  // Timeline: last 50 items, chronological desc (most recent first)
  const timelineItems = useMemo(() => {
    const items = data?.timeline || [];
    return items.slice(0, 50);
  }, [data?.timeline]);

  // Fan handles (for handles manager)
  const fanHandles: FanHandles = useMemo(
    () => ({
      pseudo_web: data?.fan?.pseudo_web || null,
      pseudo_insta: data?.fan?.pseudo_insta || null,
      pseudo_snap: data?.fan?.pseudo_snap || null,
      fanvue_handle: data?.fan?.fanvue_handle || null,
    }),
    [data?.fan]
  );

  if (loading) {
    return (
      <OsLayout cpId="agence">
        <div className="flex items-center justify-center h-[calc(100vh-48px)]">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#C9A84C" }} />
        </div>
      </OsLayout>
    );
  }

  if (error || !data) {
    return (
      <OsLayout cpId="agence">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-48px)] px-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--bg3)" }}
          >
            <Users
              className="w-6 h-6"
              style={{ color: "var(--text-muted)" }}
            />
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {error || "Fan introuvable"}
          </p>
          <Link
            href="/agence/messagerie?view=contacts"
            className="mt-4 text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(201,168,76,0.1)",
              color: "#E6C974",
              border: "1px solid rgba(201,168,76,0.25)",
            }}
          >
            <ArrowLeft className="w-3 h-3" />
            Retour à la liste
          </Link>
        </div>
      </OsLayout>
    );
  }

  const totalSpent = data.purchases.reduce(
    (sum, p) => sum + (p.price_eur || 0),
    0
  );

  return (
    <OsLayout cpId="agence">
      <div className="max-w-4xl mx-auto px-3 md:px-5 py-4 md:py-6 space-y-5">
        {/* Breadcrumb / back */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg"
            style={{
              background: "var(--bg2)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border2)",
            }}
          >
            <ArrowLeft className="w-3 h-3" />
            Retour
          </button>
          <nav
            className="text-[11px] flex items-center gap-1.5 min-w-0"
            style={{ color: "var(--text-muted)" }}
          >
            <Link href="/agence/messagerie?view=contacts" className="hover:underline truncate">
              Clients
            </Link>
            <span>/</span>
            <span
              className="font-medium truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              Fiche fan
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/agence/messagerie`}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg"
              style={{
                background: "var(--bg2)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border2)",
              }}
            >
              <MessageCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Inbox</span>
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-semibold"
              style={{
                background: "linear-gradient(135deg, #E6C974, #C9A84C)",
                color: "#0A0A0C",
              }}
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Message</span>
            </button>
            <button
              type="button"
              onClick={() => setMergeOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg"
              style={{
                background: "rgba(124,58,237,0.1)",
                color: "#A78BFA",
                border: "1px solid rgba(124,58,237,0.28)",
              }}
            >
              <GitMerge className="w-3 h-3" />
              <span className="hidden sm:inline">Fusionner</span>
            </button>
          </div>
        </div>

        {/* Profile card */}
        <FanProfileCard fan={data.fan} linkedClients={data.linked_clients} />

        {/* Handles + KPIs row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl p-4 md:p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <FanHandlesManager
                fanId={fanId}
                handles={fanHandles}
                onUpdated={load}
              />
            </div>
          </div>

          {/* KPI stack */}
          <div className="space-y-3">
            <div
              className="rounded-2xl p-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                Total dépensé
              </div>
              <div
                className="text-xl font-bold mt-1"
                style={{ color: "var(--text)" }}
              >
                {euro(totalSpent)}
              </div>
              <div
                className="text-[11px] mt-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                {data.purchases.length} achat
                {data.purchases.length > 1 ? "s" : ""}
              </div>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: "var(--text-muted)" }}
              >
                Profils liés
              </div>
              <div
                className="text-xl font-bold mt-1"
                style={{ color: "var(--text)" }}
              >
                {data.linked_clients.length}
              </div>
              <div
                className="text-[11px] mt-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                modèle
                {data.linked_clients.length > 1 ? "s" : ""}
              </div>
            </div>

            {data.instagram_conversations &&
              data.instagram_conversations.length > 0 && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold inline-flex items-center gap-1"
                    style={{ color: "#E1306C" }}
                  >
                    <Instagram className="w-3 h-3" />
                    Instagram
                  </div>
                  <div
                    className="text-xl font-bold mt-1"
                    style={{ color: "var(--text)" }}
                  >
                    {data.instagram_conversations.length}
                  </div>
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    conversation
                    {data.instagram_conversations.length > 1 ? "s" : ""}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Purchases history */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4" style={{ color: "#C9A84C" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text)" }}
            >
              Historique d'achats
            </h2>
            <span
              className="text-[11px] ml-1"
              style={{ color: "var(--text-muted)" }}
            >
              ({data.purchases.length})
            </span>
          </div>

          {data.purchases.length === 0 ? (
            <div
              className="rounded-xl p-6 text-center text-xs"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              Aucun achat enregistré
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.purchases.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl p-3.5 transition-colors"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border2)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-xs font-semibold truncate"
                        style={{ color: "var(--text)" }}
                      >
                        {p.pack_name}
                      </div>
                      <div
                        className="text-[11px] mt-1 inline-flex items-center gap-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(p.created_at)}
                      </div>
                    </div>
                    <div
                      className="text-sm font-bold shrink-0"
                      style={{ color: "#E6C974" }}
                    >
                      {euro(p.price_eur, p.currency || "EUR")}
                    </div>
                  </div>
                  {p.model && (
                    <div
                      className="mt-2 text-[10px] px-1.5 py-0.5 inline-block rounded uppercase tracking-wider font-semibold"
                      style={{
                        background: "rgba(201,168,76,0.1)",
                        color: "#E6C974",
                      }}
                    >
                      {p.model}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Timeline cross-canaux */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4" style={{ color: "#C9A84C" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text)" }}
            >
              Timeline
            </h2>
            <span
              className="text-[11px] ml-1"
              style={{ color: "var(--text-muted)" }}
            >
              ({timelineItems.length} derniers messages)
            </span>
          </div>

          <div
            className="rounded-2xl p-4 md:p-5 max-h-[480px] overflow-y-auto"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <FanTimeline
              items={timelineItems}
              emptyLabel="Aucun message échangé avec ce fan"
              outAvatarName={auth?.display_name?.toUpperCase() || "YUMI"}
              inAvatarName={
                data.fan.pseudo_insta
                  ? `@${data.fan.pseudo_insta}`
                  : data.fan.pseudo_web || "?"
              }
            />
          </div>
        </section>
      </div>

      {/* Merge modal */}
      {mergeOpen && (
        <MergeModal
          fanId={fanId}
          onClose={() => setMergeOpen(false)}
          onMerged={() => {
            // After merge, nav back to clients list (this fan is gone)
            router.push("/agence/messagerie?view=contacts");
          }}
        />
      )}

      {/* Reply drawer */}
      {drawerOpen && (
        <ReplyDrawer
          fanId={fanId}
          availableChannels={availableChannels}
          defaultChannel={defaultChannel}
          onClose={() => setDrawerOpen(false)}
          onSent={load}
        />
      )}
    </OsLayout>
  );
}

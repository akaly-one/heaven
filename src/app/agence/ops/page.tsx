"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Database,
  Gauge, Inbox, RefreshCw, Send, TrendingUp, Zap,
} from "lucide-react";
import { OsLayout } from "@/components/os-layout";

/* ══════════════════════════════════════════════════════════════════════════
   /agence/ops — Observability dashboard (root only)
   6 cards fed by a single GET /api/agence/ops/metrics call (30s auto-refresh).
   ══════════════════════════════════════════════════════════════════════════ */

interface OpsMetrics {
  latency: { p50: number; p95: number; p99: number; samples: number; sparkline: number[] };
  metaQuota: { used: number; limit: number; remaining: number };
  queue: { pending: number; processing: number; failed: number; done: number };
  sync: { last_run: string | null; avg_duration_ms: number; runs: number; runs_with_errors: number };
  inbox: { total: number; ig: number; web: number };
  outreach: { queued: number; sent: number; failed: number };
  fetched_at: string;
}

const REFRESH_MS = 30_000;

function fmtMs(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(2)} s`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "jamais";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "tout de suite";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export default function OpsPage() {
  const [data, setData] = useState<OpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/agence/ops/metrics", { cache: "no-store" });
      if (!res.ok) {
        setError(res.status === 401 ? "Accès root requis" : `Erreur ${res.status}`);
        return;
      }
      const json = (await res.json()) as OpsMetrics;
      setData(json);
      setError(null);
    } catch (err) {
      setError(String(err).slice(0, 160));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(true);
    timerRef.current = setInterval(() => fetchMetrics(false), REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchMetrics]);

  return (
    <OsLayout cpId="agence">
      <div className="min-h-screen p-4 md:p-8 pb-24 md:pb-8" style={{ background: "var(--bg)" }}>
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(6,182,212,0.15)" }}>
                <Activity className="w-5 h-5" style={{ color: "#06B6D4" }} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Ops</h1>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  Observabilité · {data ? `maj ${fmtRelative(data.fetched_at)}` : "chargement..."}
                  {" · auto 30s"}
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchMetrics(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                opacity: refreshing ? 0.5 : 1,
                cursor: refreshing ? "wait" : "pointer",
              }}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-xl p-4 mb-6 flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />
              <span className="text-xs" style={{ color: "#EF4444" }}>{error}</span>
            </div>
          )}

          {/* 2x3 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card 1 — Webhook latency */}
            <CardShell
              icon={Gauge}
              color="#8B5CF6"
              title="Webhook IG latency"
              subtitle="Dernière heure"
              loading={loading && !data}>
              {data && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <LatencyStat label="p50" value={fmtMs(data.latency.p50)} color="#22C55E" />
                    <LatencyStat label="p95" value={fmtMs(data.latency.p95)} color="#F59E0B" />
                    <LatencyStat label="p99" value={fmtMs(data.latency.p99)} color="#EF4444" />
                  </div>
                  <Sparkline values={data.latency.sparkline} />
                  <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
                    {data.latency.samples} échantillon{data.latency.samples !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </CardShell>

            {/* Card 2 — Meta API quota */}
            <CardShell
              icon={Zap}
              color="#EAB308"
              title="Meta API quota"
              subtitle="Appels / heure — plafond 200"
              loading={loading && !data}>
              {data && (() => {
                const pct = Math.min(100, (data.metaQuota.used / data.metaQuota.limit) * 100);
                const barColor =
                  data.metaQuota.used >= 180 ? "#EF4444" :
                  data.metaQuota.used >= 100 ? "#F59E0B" :
                  "#22C55E";
                return (
                  <>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-bold" style={{ color: barColor }}>
                        {data.metaQuota.used}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                        / {data.metaQuota.limit}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
                      Reste {data.metaQuota.remaining} appel{data.metaQuota.remaining !== 1 ? "s" : ""}
                    </p>
                  </>
                );
              })()}
            </CardShell>

            {/* Card 3 — Queue depth */}
            <CardShell
              icon={Database}
              color="#5B8DEF"
              title="Queue worker"
              subtitle="ig_reply_queue — buckets"
              loading={loading && !data}>
              {data && (
                <div className="grid grid-cols-2 gap-3">
                  <QueueStat label="Pending" value={data.queue.pending} color="#F59E0B" />
                  <QueueStat label="Processing" value={data.queue.processing} color="#5B8DEF" />
                  <QueueStat label="Failed" value={data.queue.failed} color="#EF4444" />
                  <QueueStat label="Done" value={data.queue.done} color="#22C55E" />
                </div>
              )}
            </CardShell>

            {/* Card 4 — Sync IG health */}
            <CardShell
              icon={TrendingUp}
              color="#00D68F"
              title="Sync Instagram"
              subtitle="Dernières 24h"
              loading={loading && !data}>
              {data && (
                <div className="space-y-2.5">
                  <StatRow icon={Clock} label="Dernier run" value={fmtRelative(data.sync.last_run)} color="var(--text)" />
                  <StatRow icon={Gauge} label="Durée moyenne" value={fmtMs(data.sync.avg_duration_ms)} color="var(--text)" />
                  <StatRow icon={CheckCircle2} label="Total runs" value={String(data.sync.runs)} color="#22C55E" />
                  <StatRow
                    icon={AlertTriangle}
                    label="Runs avec erreurs"
                    value={String(data.sync.runs_with_errors)}
                    color={data.sync.runs_with_errors > 0 ? "#EF4444" : "var(--text-muted)"}
                  />
                </div>
              )}
            </CardShell>

            {/* Card 5 — Inbox traffic */}
            <CardShell
              icon={Inbox}
              color="#E1306C"
              title="Inbox traffic"
              subtitle="Messages reçus · 24h"
              loading={loading && !data}>
              {data && (
                <>
                  <div className="mb-3">
                    <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                      {data.inbox.total}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      total messages
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SourceChip label="Instagram" value={data.inbox.ig} color="#E1306C" />
                    <SourceChip label="Web" value={data.inbox.web} color="#06B6D4" />
                  </div>
                </>
              )}
            </CardShell>

            {/* Card 6 — Outreach */}
            <CardShell
              icon={Send}
              color="#F59E0B"
              title="Outreach campaign"
              subtitle="24h · tous canaux"
              loading={loading && !data}>
              {data && (
                <div className="grid grid-cols-3 gap-3">
                  <QueueStat label="Queued" value={data.outreach.queued} color="#F59E0B" />
                  <QueueStat label="Sent" value={data.outreach.sent} color="#22C55E" />
                  <QueueStat label="Failed" value={data.outreach.failed} color="#EF4444" />
                </div>
              )}
            </CardShell>
          </div>

        </div>
      </div>
    </OsLayout>
  );
}

/* ── Small building blocks ─────────────────────────────────────────────── */

function CardShell({
  icon: Icon, color, title, subtitle, loading, children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  title: string;
  subtitle?: string;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
      </div>
      {subtitle && (
        <p className="text-[11px] mb-4" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
      )}
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 rounded-md animate-pulse" style={{ background: "var(--bg)" }} />
          <div className="h-2 rounded-md animate-pulse" style={{ background: "var(--bg)" }} />
        </div>
      ) : children}
    </div>
  );
}

function LatencyStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2" style={{ background: "var(--bg)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-base font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function QueueStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "var(--bg)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function StatRow({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function SourceChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "var(--bg)" }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

/* Sparkline SVG — last 20 latency samples, no external lib. */
function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) {
    return (
      <div className="w-full h-8 rounded-md flex items-center justify-center"
        style={{ background: "var(--bg)" }}>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Pas assez de données
        </span>
      </div>
    );
  }
  const W = 240;
  const H = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="#8B5CF6"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

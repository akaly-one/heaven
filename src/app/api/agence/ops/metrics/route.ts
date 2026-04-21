import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/api-auth";

// Node runtime — service_role reads + aggregation queries.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/agence/ops/metrics
//
// Auth  : root only.
// Shape : single JSON with the 6 KPI blocks used by /agence/ops.
// Cache : private, max-age=15 (brief client-side cache; auto-refresh polls).
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== "root") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  try {
    const [latency, metaQuota, queue, sync, inbox, outreach] = await Promise.all([
      fetchLatency(db),
      fetchMetaQuota(db),
      fetchQueueDepth(db),
      fetchSyncHealth(db),
      fetchInboxTraffic(db),
      fetchOutreachStats(db),
    ]);

    return NextResponse.json(
      { latency, metaQuota, queue, sync, inbox, outreach, fetched_at: new Date().toISOString() },
      { headers: { "Cache-Control": "private, max-age=15" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "metrics_failed", detail: String(err).slice(0, 300) },
      { status: 500 }
    );
  }
}

type DB = NonNullable<ReturnType<typeof getServerSupabase>>;

// ─── 1. Webhook IG latency (p50/p95/p99) — last hour ───────────────────────
async function fetchLatency(db: DB) {
  const { data, error } = await db.rpc("ops_latency_percentiles", {
    p_metric: "webhook_latency_ms",
    p_window: "1 hour",
  });
  if (!error && data && (data as unknown as Array<Record<string, unknown>>).length > 0) {
    const row = (data as unknown as Array<Record<string, number>>)[0];
    return {
      p50: Number(row.p50 ?? 0),
      p95: Number(row.p95 ?? 0),
      p99: Number(row.p99 ?? 0),
      samples: Number(row.samples ?? 0),
      sparkline: [] as number[],
    };
  }
  // Fallback : compute percentiles client-side from raw rows.
  const sinceIso = new Date(Date.now() - 3_600_000).toISOString();
  const { data: rows } = await db
    .from("ops_metrics")
    .select("value, created_at")
    .eq("metric", "webhook_latency_ms")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  const values = ((rows as Array<{ value: number }> | null) || [])
    .map((r) => Number(r.value))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const samples = values.length;
  const pick = (p: number) => {
    if (!samples) return 0;
    const idx = Math.min(samples - 1, Math.floor(p * (samples - 1)));
    return values[idx];
  };
  // Sparkline: last 20 raw samples (time-ordered).
  const sparkline = ((rows as Array<{ value: number }> | null) || [])
    .slice(-20)
    .map((r) => Number(r.value));
  return {
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    samples,
    sparkline,
  };
}

// ─── 2. Meta API quota (last hour, cap 200) ────────────────────────────────
async function fetchMetaQuota(db: DB) {
  const sinceIso = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db
    .from("ops_metrics")
    .select("*", { count: "exact", head: true })
    .eq("metric", "meta_api_call")
    .gte("created_at", sinceIso);
  const used = count || 0;
  return { used, limit: 200, remaining: Math.max(0, 200 - used) };
}

// ─── 3. Queue worker depth (4 status buckets) ──────────────────────────────
async function fetchQueueDepth(db: DB) {
  const statuses = ["pending", "processing", "failed", "done"] as const;
  const counts = await Promise.all(
    statuses.map(async (s) => {
      const { count } = await db
        .from("ig_reply_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", s);
      return [s, count || 0] as const;
    })
  );
  const obj = Object.fromEntries(counts) as Record<(typeof statuses)[number], number>;
  return {
    pending: obj.pending,
    processing: obj.processing,
    failed: obj.failed,
    done: obj.done,
  };
}

// ─── 4. Sync Instagram health — last 24h ──────────────────────────────────
async function fetchSyncHealth(db: DB) {
  const sinceIso = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data } = await db
    .from("ops_metrics")
    .select("value, tags, created_at")
    .eq("metric", "sync_instagram_run_ms")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });
  const rows = (data as Array<{ value: number; tags: Record<string, unknown> | null; created_at: string }> | null) || [];
  if (rows.length === 0) {
    return { last_run: null as string | null, avg_duration_ms: 0, runs: 0, runs_with_errors: 0 };
  }
  const runs = rows.length;
  const avg = rows.reduce((s, r) => s + Number(r.value || 0), 0) / runs;
  const withErr = rows.filter((r) => Number((r.tags as Record<string, unknown>)?.errors ?? 0) > 0).length;
  return {
    last_run: rows[0].created_at,
    avg_duration_ms: Math.round(avg),
    runs,
    runs_with_errors: withErr,
  };
}

// ─── 5. Inbox traffic — last 24h ──────────────────────────────────────────
async function fetchInboxTraffic(db: DB) {
  const sinceIso = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const [total, ig, web] = await Promise.all([
    db
      .from("agence_messages_timeline")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso),
    db
      .from("agence_messages_timeline")
      .select("*", { count: "exact", head: true })
      .eq("source", "instagram")
      .gte("created_at", sinceIso),
    db
      .from("agence_messages_timeline")
      .select("*", { count: "exact", head: true })
      .eq("source", "web")
      .gte("created_at", sinceIso),
  ]);
  return {
    total: total.count || 0,
    ig: ig.count || 0,
    web: web.count || 0,
  };
}

// ─── 6. Outreach campaign — last 24h ──────────────────────────────────────
async function fetchOutreachStats(db: DB) {
  const sinceIso = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const statuses = ["queued", "sent", "failed"] as const;
  const counts = await Promise.all(
    statuses.map(async (s) => {
      const { count } = await db
        .from("agence_outreach_log")
        .select("*", { count: "exact", head: true })
        .eq("status", s)
        .gte("created_at", sinceIso);
      return [s, count || 0] as const;
    })
  );
  const obj = Object.fromEntries(counts) as Record<(typeof statuses)[number], number>;
  return {
    queued: obj.queued,
    sent: obj.sent,
    failed: obj.failed,
  };
}

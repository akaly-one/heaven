import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

// Node runtime — service_role delete.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Retention window : keep 7 days of ops_metrics. Rows older are deleted nightly.
const RETENTION_DAYS = 7;

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/cron/purge-ops-metrics
//
// Auth  : Vercel Cron header OR CRON_SECRET (Bearer).
// Run   : daily @ 04:00 UTC (vercel.json crons).
// Purge : ops_metrics rows older than RETENTION_DAYS days.
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  const cutoffIso = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();

  const { error, count } = await db
    .from("ops_metrics")
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso);

  if (error) {
    return NextResponse.json(
      { error: "purge_failed", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: count ?? 0,
    cutoff: cutoffIso,
    retention_days: RETENTION_DAYS,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Auth: Vercel Cron header OR CRON_SECRET (Bearer) — mirrors other cron routes.
// ═══════════════════════════════════════════════════════════════════════════
function isAuthorizedCron(req: NextRequest): boolean {
  const vercelCron = req.headers.get("x-vercel-cron");
  if (vercelCron) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

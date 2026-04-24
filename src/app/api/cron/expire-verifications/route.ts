import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

// Force Node runtime — service_role writes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/cron/expire-verifications
//
// BRIEF-15 Bug #10 : rows agence_client_verifications avec status pending/sent
// dont expires_at est passé restaient bloquées indéfiniment. Ce cron les passe
// à 'expired' quotidiennement.
//
// Auth  : Vercel Cron header OR CRON_SECRET (Bearer).
// Run   : daily @ 02:00 UTC (vercel.json crons).
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json({ error: "db_unavailable" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from("agence_client_verifications")
    .update({ status: "expired" })
    .in("status", ["pending", "sent"])
    .lt("expires_at", nowIso)
    .select("id");

  if (error) {
    console.error("[cron expire-verifications] error:", error);
    return NextResponse.json(
      { error: "expire_failed", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    expired_count: data?.length || 0,
    timestamp: nowIso,
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

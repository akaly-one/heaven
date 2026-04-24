/**
 * /api/agence/ai/health — Diagnostic public minimal pour l'agent IA.
 *
 * GET → rapporte quelles env vars serveur sont configurées (booléens uniquement,
 * jamais les secrets), nombre de runs 24h, dernière erreur agent.
 *
 * Utile pour savoir pourquoi l'agent ne répond pas en prod sans devoir redéployer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import { hasGroqKey } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const db = getServerSupabase();

  const env = {
    groq_configured: hasGroqKey(),
    openrouter_configured: !!process.env.OPENROUTER_API_KEY,
    cron_secret_configured: !!process.env.CRON_SECRET,
    instagram_token_configured: !!process.env.INSTAGRAM_PAGE_ACCESS_TOKEN,
    supabase_configured: !!db,
  };

  let stats: {
    runs_last_24h: number;
    runs_last_hour: number;
    failed_last_24h: number;
    last_run_at: string | null;
    last_error: string | null;
  } = {
    runs_last_24h: 0,
    runs_last_hour: 0,
    failed_last_24h: 0,
    last_run_at: null,
    last_error: null,
  };

  if (db) {
    const since24 = new Date(Date.now() - 86_400_000).toISOString();
    const since1h = new Date(Date.now() - 3_600_000).toISOString();

    const [r24, r1h, rFail, last, lastErr] = await Promise.all([
      db.from("ai_runs").select("*", { count: "exact", head: true }).gte("created_at", since24),
      db.from("ai_runs").select("*", { count: "exact", head: true }).gte("created_at", since1h),
      db.from("ai_runs").select("*", { count: "exact", head: true }).not("error_message", "is", null).gte("created_at", since24),
      db.from("ai_runs").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("ai_runs").select("error_message, created_at").not("error_message", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    stats = {
      runs_last_24h: r24.count || 0,
      runs_last_hour: r1h.count || 0,
      failed_last_24h: rFail.count || 0,
      last_run_at: last.data?.created_at || null,
      last_error: lastErr.data?.error_message ? `${lastErr.data.error_message.slice(0, 160)} (${lastErr.data.created_at})` : null,
    };
  }

  // Queue IG status
  let igQueue: { pending: number; failed: number; done_last_24h: number } | null = null;
  if (db) {
    const since24 = new Date(Date.now() - 86_400_000).toISOString();
    const [pending, failed, done] = await Promise.all([
      db.from("ig_reply_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db.from("ig_reply_queue").select("*", { count: "exact", head: true }).eq("status", "failed"),
      db.from("ig_reply_queue").select("*", { count: "exact", head: true }).eq("status", "done").gte("completed_at", since24),
    ]);
    igQueue = {
      pending: pending.count || 0,
      failed: failed.count || 0,
      done_last_24h: done.count || 0,
    };
  }

  return NextResponse.json({
    ok: env.groq_configured && env.supabase_configured,
    env,
    stats,
    ig_queue: igQueue,
    hint: !env.groq_configured
      ? "Définir GROQ_API_KEY dans Vercel Project Settings → Environment Variables"
      : (stats.runs_last_24h === 0 && stats.last_run_at
          ? "Aucun run 24h — vérifier cron /api/cron/process-ig-replies (vercel.json)"
          : null),
    timestamp: new Date().toISOString(),
  }, { headers: cors });
}

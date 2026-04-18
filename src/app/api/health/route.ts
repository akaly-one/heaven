import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Lightweight uptime probe for Better Stack Uptime (and other monitors).
 * Returns a stable JSON payload — no DB hit, no auth, no side effects.
 * Expected match by monitors: {"ok":true,"service":"heaven"}
 * Heaven silo: no SQWENSY branding exposed here.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ts: Date.now(),
      service: "heaven",
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

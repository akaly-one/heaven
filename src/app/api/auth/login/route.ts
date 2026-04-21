import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/jwt";
import { getCorsHeaders } from "@/lib/auth";

// Server-only: do not expose upstream URL in client bundles.
const SQWENSY_API = process.env.OS_BEACON_URL || process.env.SQWENSY_URL || "";

// Fallback login aliases (while SQWENSY verify-code response doesn't return login_aliases).
// Each entry lists the accepted identifiers for that role/model.
const LOGIN_ALIASES: Record<string, string[]> = {
  root: ["admin", "nb", "root", "yumi", "yumiiiclub"],
  yumi: ["yumi", "yumiiiclub"],
  paloma: ["paloma"],
  ruby: ["ruby"],
};

// ── Rate limiting (in-memory, per-process) ─────────────────────────────────
// Window: 5 attempts per 5 min per IP. Resets on server restart — acceptable
// for MVP. Upgrade to Upstash Redis when we have a dedicated store.
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; firstAt: number }>();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function checkRate(ip: string): { allowed: boolean; retryInSec: number } {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.firstAt > RATE_WINDOW_MS) {
    attempts.set(ip, { count: 0, firstAt: now });
    return { allowed: true, retryInSec: 0 };
  }
  if (entry.count >= RATE_MAX_ATTEMPTS) {
    const retryInSec = Math.max(0, Math.ceil((entry.firstAt + RATE_WINDOW_MS - now) / 1000));
    return { allowed: false, retryInSec };
  }
  return { allowed: true, retryInSec: 0 };
}

function recordAttempt(ip: string) {
  const entry = attempts.get(ip);
  if (!entry) return;
  entry.count += 1;
}

// Uniform error — never differentiate between wrong login vs wrong code
// (avoids account enumeration).
const INVALID_CREDENTIALS = "Identifiants invalides";

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const ip = clientIp(req);

  // Rate limit check before any expensive work
  const rate = checkRate(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { valid: false, error: `Trop de tentatives. Réessaie dans ${rate.retryInSec}s.` },
      { status: 429, headers: cors }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { login, code } = body as { login?: string; code?: string };

    if (!code || typeof code !== "string") {
      recordAttempt(ip);
      return NextResponse.json(
        { valid: false, error: INVALID_CREDENTIALS },
        { status: 401, headers: cors }
      );
    }

    // Verify code via SQWENSY OS (source of truth)
    const res = await fetch(`${SQWENSY_API}/api/agence/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json().catch(() => ({ valid: false }));

    if (!data.valid) {
      recordAttempt(ip);
      return NextResponse.json(
        { valid: false, error: INVALID_CREDENTIALS },
        { status: 401, headers: cors }
      );
    }

    // Optional login check (admin modal sends it; legacy single-credential omits)
    if (login && typeof login === "string") {
      const normalized = login.trim().replace(/^@/, "").toLowerCase();
      const responseAliases: string[] = Array.isArray(data.login_aliases)
        ? data.login_aliases.map((a: string) => a.toLowerCase())
        : [];
      const slug = (data.model_slug || data.role || "").toLowerCase();
      const expected = responseAliases.length > 0
        ? responseAliases
        : LOGIN_ALIASES[slug] || [slug];
      if (!expected.includes(normalized)) {
        recordAttempt(ip);
        return NextResponse.json(
          { valid: false, error: INVALID_CREDENTIALS },
          { status: 401, headers: cors }
        );
      }
    }

    // Success : reset rate limit for this IP
    attempts.delete(ip);

    // Create JWT session token
    const token = await createSessionToken({
      sub: data.model_slug || "root",
      role: data.role,
      scope: data.scope || [],
      display_name: data.display_name || data.role,
    });

    // Build response with user info (never echo secrets or raw code)
    const response = NextResponse.json(
      {
        valid: true,
        role: data.role,
        scope: data.scope,
        model_slug: data.model_slug,
        display_name: data.display_name,
        redirect: data.redirect,
      },
      { status: 200, headers: cors }
    );

    // Set HttpOnly cookie
    response.cookies.set("heaven_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24h
    });

    return response;
  } catch {
    // Don't leak error details — respond as generic 500
    return NextResponse.json(
      { valid: false, error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req) });
}

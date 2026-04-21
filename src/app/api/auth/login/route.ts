import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/jwt";
import { getCorsHeaders } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase-server";

// Server-only: SQWENSY is a fallback verifier when the code isn't found locally.
const SQWENSY_API = process.env.OS_BEACON_URL || process.env.SQWENSY_URL || "";

// Hardcoded fallback aliases — used only when agence_accounts.login_aliases is empty
// AND SQWENSY verify-code response doesn't include login_aliases.
const FALLBACK_LOGIN_ALIASES: Record<string, string[]> = {
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

    // ── 1) Verify locally against agence_accounts (primary source) ─────
    const supabase = getServerSupabase();
    let verified: {
      role: string;
      model_slug: string | null;
      model_id: string | null;
      display_name: string | null;
      scope: string[];
      login_aliases: string[];
    } | null = null;

    if (supabase) {
      const { data: account } = await supabase
        .from("agence_accounts")
        .select("role, model_slug, model_id, display_name, active, login_aliases")
        .eq("code", code.trim())
        .eq("active", true)
        .maybeSingle();

      if (account) {
        verified = {
          role: account.role,
          model_slug: account.model_slug,
          model_id: account.model_id,
          display_name: account.display_name,
          scope: ["/agence"],
          login_aliases: Array.isArray(account.login_aliases) ? account.login_aliases : [],
        };
        // Update last_login (best-effort, non-blocking)
        supabase
          .from("agence_accounts")
          .update({ last_login: new Date().toISOString() })
          .eq("code", code.trim())
          .then(() => { /* ignore */ });
      }
    }

    // ── 2) Fallback : SQWENSY verify-code (legacy path) ─────────────────
    if (!verified && SQWENSY_API) {
      try {
        const res = await fetch(`${SQWENSY_API}/api/agence/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        });
        const data = await res.json().catch(() => ({ valid: false }));
        if (data.valid) {
          verified = {
            role: data.role,
            model_slug: data.model_slug || null,
            model_id: data.model_id || null,
            display_name: data.display_name || null,
            scope: data.scope || ["/agence"],
            login_aliases: Array.isArray(data.login_aliases) ? data.login_aliases : [],
          };
        }
      } catch { /* SQWENSY unreachable — fall through to 401 */ }
    }

    if (!verified) {
      recordAttempt(ip);
      return NextResponse.json(
        { valid: false, error: INVALID_CREDENTIALS },
        { status: 401, headers: cors }
      );
    }

    // ── 3) Login alias check (if login was provided) ─────────────────────
    if (login && typeof login === "string") {
      const normalized = login.trim().replace(/^@/, "").toLowerCase();
      const slugKey = (verified.model_slug || verified.role || "").toLowerCase();
      const dbAliases = verified.login_aliases.map((a: string) => a.toLowerCase());
      const expected = dbAliases.length > 0
        ? dbAliases
        : FALLBACK_LOGIN_ALIASES[slugKey] || [slugKey];
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
    const narrowedRole: "root" | "model" = verified.role === "root" ? "root" : "model";
    const token = await createSessionToken({
      sub: verified.model_slug || "root",
      role: narrowedRole,
      scope: verified.scope,
      display_name: verified.display_name || verified.role,
    });

    // Build response with user info (never echo secrets or raw code)
    const response = NextResponse.json(
      {
        valid: true,
        role: verified.role,
        scope: verified.scope,
        model_slug: verified.model_slug,
        display_name: verified.display_name,
        redirect: "/agence",
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

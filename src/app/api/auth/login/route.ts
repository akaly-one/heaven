import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/jwt";
import { getCorsHeaders } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase-server";

// ── Audit helper (Phase 1 sécurité progressive, migration 051) ──
async function logAuthEvent(
  supabase: ReturnType<typeof getServerSupabase>,
  type: "login_success" | "login_fail" | "account_locked" | "rate_limit_hit",
  params: {
    accountId?: string | null;
    accountCode?: string | null;
    accountLogin?: string | null;
    ip: string;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  if (!supabase) return;
  supabase
    .from("agence_auth_events")
    .insert({
      event_type: type,
      account_id: params.accountId ?? null,
      // Ne jamais logger le password en clair, même pour un fail.
      account_code: null,
      account_login: params.accountLogin ?? null,
      ip_address: params.ip,
      user_agent: params.userAgent ?? null,
      metadata: params.metadata ?? {},
    })
    .then(() => { /* fire-and-forget */ });
}

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
      scopes: string[];
      login_aliases: string[];
    } | null = null;

    let matchedAccountId: string | null = null;
    if (supabase) {
      // SELECT de base (toujours présent) — Phase 1 colonnes lock/fails sont optionnelles
      // (migration 051 peut être pas encore appliquée, fallback gracieux)
      const { data: account } = await supabase
        .from("agence_accounts")
        .select("id, role, model_slug, model_id, display_name, active, login_aliases, scopes")
        .eq("code", code.trim())
        .eq("active", true)
        .maybeSingle();

      if (account) {
        // Phase 1.2 : check lock actif — tentative SELECT séparé, ignore si colonne absente
        try {
          const { data: lockInfo } = await supabase
            .from("agence_accounts")
            .select("locked_until")
            .eq("id", account.id)
            .maybeSingle();
          const lockedUntilStr = (lockInfo as { locked_until?: string | null } | null)?.locked_until;
          const lockedUntil = lockedUntilStr ? new Date(lockedUntilStr).getTime() : 0;
          if (lockedUntil > Date.now()) {
            const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
            await logAuthEvent(supabase, "account_locked", {
              accountId: account.id,
              accountLogin: login ?? null,
              ip,
              userAgent: req.headers.get("user-agent"),
              metadata: { remaining_seconds: remaining },
            });
            recordAttempt(ip);
            return NextResponse.json(
              { valid: false, error: `Compte temporairement verrouillé. Réessaie dans ${Math.ceil(remaining / 60)} min.` },
              { status: 423, headers: cors }
            );
          }
        } catch { /* colonne locked_until absente — migration 051 non appliquée, on continue */ }

        matchedAccountId = account.id;
        verified = {
          role: account.role,
          model_slug: account.model_slug,
          model_id: account.model_id,
          display_name: account.display_name,
          scope: ["/agence"],
          scopes: Array.isArray(account.scopes) ? account.scopes : [],
          login_aliases: Array.isArray(account.login_aliases) ? account.login_aliases : [],
        };
        // Update last_login (best-effort, non-blocking). Reset fails + lock via RPC séparé (ignore si absent).
        supabase
          .from("agence_accounts")
          .update({ last_login: new Date().toISOString() })
          .eq("id", account.id)
          .then(() => { /* ignore */ });
        supabase
          .rpc("reset_login_attempts", { p_account_id: account.id })
          .then(() => { /* ignore si RPC absente */ });
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
            scopes: Array.isArray(data.scopes) ? data.scopes : [],
            login_aliases: Array.isArray(data.login_aliases) ? data.login_aliases : [],
          };
        }
      } catch { /* SQWENSY unreachable — fall through to 401 */ }
    }

    if (!verified) {
      recordAttempt(ip);
      // Si on a un login fourni, essayer de retrouver le compte cible pour audit + lock counter.
      if (supabase && login && typeof login === "string") {
        const normalizedLogin = login.trim().replace(/^@/, "").toLowerCase();
        const { data: byLogin } = await supabase
          .from("agence_accounts")
          .select("id, login_aliases")
          .eq("active", true);
        if (Array.isArray(byLogin)) {
          const target = byLogin.find((a: { id: string; login_aliases?: string[] | null }) =>
            Array.isArray(a.login_aliases) &&
            a.login_aliases.some((al: string) => al.toLowerCase() === normalizedLogin)
          );
          if (target) {
            await supabase.rpc("record_failed_login", {
              p_account_id: target.id,
              p_max_fails: 10,
              p_lock_minutes: 15,
            });
            await logAuthEvent(supabase, "login_fail", {
              accountId: target.id,
              accountLogin: login,
              ip,
              userAgent: req.headers.get("user-agent"),
              metadata: { reason: "wrong_password" },
            });
          } else {
            await logAuthEvent(supabase, "login_fail", {
              accountLogin: login,
              ip,
              userAgent: req.headers.get("user-agent"),
              metadata: { reason: "unknown_login" },
            });
          }
        }
      } else if (supabase) {
        await logAuthEvent(supabase, "login_fail", {
          accountLogin: null,
          ip,
          userAgent: req.headers.get("user-agent"),
          metadata: { reason: "no_account_match" },
        });
      }
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
        if (supabase && matchedAccountId) {
          await supabase.rpc("record_failed_login", {
            p_account_id: matchedAccountId,
            p_max_fails: 10,
            p_lock_minutes: 15,
          });
          await logAuthEvent(supabase, "login_fail", {
            accountId: matchedAccountId,
            accountLogin: login,
            ip,
            userAgent: req.headers.get("user-agent"),
            metadata: { reason: "wrong_login_alias" },
          });
        }
        return NextResponse.json(
          { valid: false, error: INVALID_CREDENTIALS },
          { status: 401, headers: cors }
        );
      }
    }

    // Success : reset rate limit for this IP + log audit
    attempts.delete(ip);
    if (supabase && matchedAccountId) {
      await logAuthEvent(supabase, "login_success", {
        accountId: matchedAccountId,
        accountLogin: login ?? null,
        ip,
        userAgent: req.headers.get("user-agent"),
        metadata: { role: verified.role, model_slug: verified.model_slug },
      });
    }

    // Create JWT session token (Agent 1.B: hydrate model_id + scopes from DB)
    const narrowedRole: "root" | "model" = verified.role === "root" ? "root" : "model";
    const token = await createSessionToken({
      sub: verified.model_slug || "root",
      role: narrowedRole,
      scope: verified.scope,
      display_name: verified.display_name || verified.role,
      model_id: verified.model_id,
      model_slug: verified.model_slug,
      scopes: verified.scopes,
    });

    // Build response with user info (never echo secrets or raw code)
    const response = NextResponse.json(
      {
        valid: true,
        role: verified.role,
        scope: verified.scope,
        model_id: verified.model_id,
        model_slug: verified.model_slug,
        display_name: verified.display_name,
        scopes: verified.scopes,
        redirect: "/agence",
      },
      { status: 200, headers: cors }
    );

    // Set HttpOnly cookie (Strict per SECURITY-v1)
    response.cookies.set("heaven_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
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

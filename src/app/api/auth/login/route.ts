import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/jwt";
import { getCorsHeaders } from "@/lib/auth";

// Server-only: do not expose upstream URL in client bundles.
const SQWENSY_API = process.env.OS_BEACON_URL || process.env.SQWENSY_URL || "";

// Fallback login aliases — kept in sync with agence_model_profiles.login_aliases in DB.
// Used ONLY when SQWENSY verify-code response doesn't include login_aliases
// (e.g. before SQWENSY prod is redeployed with the DB-backed route).
// After redeploy, the DB becomes sole source of truth.
const MODEL_LOGIN_ALIASES: Record<string, string[]> = {
  yumi: ["yumi", "yumiiiclub"],
  ruby: ["ruby", "rubyyyclub"],
  paloma: ["paloma", "palomaaclub"],
};

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  try {
    const { login, code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code requis" },
        { status: 400, headers: cors }
      );
    }

    if (!login || typeof login !== "string") {
      return NextResponse.json(
        { error: "Identifiant requis" },
        { status: 400, headers: cors }
      );
    }

    const normalizedLogin = login.trim().replace(/^@/, "").toLowerCase();

    // Verify code + login via SQWENSY OS (SSOT — reads agence_model_profiles.login_aliases)
    const res = await fetch(`${SQWENSY_API}/api/agence/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), login: normalizedLogin }),
    });

    const data = await res.json();

    if (!data.valid) {
      return NextResponse.json(
        { valid: false, error: "Identifiants invalides" },
        { status: 401, headers: cors }
      );
    }

    // Prefer DB aliases from response (SSOT). Fallback to hardcoded map for retro-compat
    // (in case SQWENSY prod hasn't been redeployed yet with the enriched route).
    const responseAliases: string[] = Array.isArray(data.login_aliases)
      ? data.login_aliases.map((a: string) => a.toLowerCase())
      : [];

    if (data.role === "root") {
      const rootAliases = responseAliases.length > 0
        ? responseAliases
        : ["admin", "nb", "root"];
      if (!rootAliases.includes(normalizedLogin)) {
        return NextResponse.json(
          { valid: false, error: "Identifiants invalides" },
          { status: 401, headers: cors }
        );
      }
    } else if (data.role === "model") {
      const expectedSlug = (data.model_slug || "").toLowerCase();
      const aliases = responseAliases.length > 0
        ? responseAliases
        : MODEL_LOGIN_ALIASES[expectedSlug] ?? [expectedSlug];
      if (!expectedSlug || !aliases.includes(normalizedLogin)) {
        return NextResponse.json(
          { valid: false, error: "Identifiants invalides" },
          { status: 401, headers: cors }
        );
      }
    } else {
      return NextResponse.json(
        { valid: false, error: "Identifiants invalides" },
        { status: 401, headers: cors }
      );
    }

    // Create JWT session token
    const token = await createSessionToken({
      sub: data.model_slug || "root",
      role: data.role,
      scope: data.scope || [],
      display_name: data.display_name || data.role,
    });

    // Build response with user info
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
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req) });
}

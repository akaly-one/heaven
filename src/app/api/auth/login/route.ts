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

    // Verify code via SQWENSY OS (source of truth)
    const res = await fetch(`${SQWENSY_API}/api/agence/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json();

    if (!data.valid) {
      return NextResponse.json(
        { valid: false, error: "Code invalide" },
        { status: 401, headers: cors }
      );
    }

    // Optional login check (admin auth modal sends login, legacy /login page omits it)
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
        return NextResponse.json(
          { valid: false, error: "Identifiants invalides" },
          { status: 401, headers: cors }
        );
      }
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

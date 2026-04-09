import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/jwt";
import { getCorsHeaders } from "@/lib/auth";

const SQWENSY_API = process.env.NEXT_PUBLIC_SQWENSY_URL || "https://sqwensy.com";

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  try {
    const { code } = await req.json();

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

import { NextRequest, NextResponse } from "next/server";
import { authenticateCode, getCorsHeaders, signToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

// POST /api/auth — { code: "heaven" } → session payload + JWT token
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });
    }

    const account = await authenticateCode(code);
    if (!account) {
      return NextResponse.json({ error: "Code invalide" }, { status: 401, headers: cors });
    }

    const scope =
      account.role === "root"
        ? ["*"]
        : account.model_slug
          ? [`/agence`]
          : [];

    // Sign JWT token
    const token = await signToken({
      role: account.role,
      model_slug: account.model_slug || null,
      display_name: account.display_name,
    });

    return NextResponse.json({
      token,
      role: account.role,
      scope,
      model_slug: account.model_slug || null,
      display_name: account.display_name,
      loggedAt: new Date().toISOString(),
    }, { headers: cors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API/auth] POST:", msg);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

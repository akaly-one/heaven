import { NextRequest, NextResponse } from "next/server";
import { authenticateCode, getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// POST /api/auth — { code: "heaven" } → session payload
export async function POST(req: NextRequest) {
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
          : ["*"];

    return NextResponse.json({
      role: account.role,
      scope,
      model_slug: account.model_slug || null,
      display_name: account.display_name,
      loggedAt: new Date().toISOString(),
    }, { headers: cors });
  } catch (err) {
    console.error("[API/auth] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

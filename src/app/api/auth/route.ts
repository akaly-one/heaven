import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function corsHeaders(req?: NextRequest): Record<string, string> {
  const allowed = [
    "https://heaven-os.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
  ];
  let origin = allowed[0];
  if (req) {
    const o = req.headers.get("origin") || "";
    if (allowed.includes(o)) origin = o;
    else if (process.env.NODE_ENV === "development") origin = o || "*";
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

// POST /api/auth — Login { code: "xxx" }
export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);

  let code: string;
  try {
    const body = await req.json();
    code = body?.code;
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400, headers: cors });
  }

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });
  }

  // Use SUPABASE_SERVICE_ROLE_KEY as both DB key and JWT signing secret
  // This key is proven to work (DB connects fine)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500, headers: cors });
  }

  // Query DB
  try {
    const sb = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: account, error } = await sb
      .from("agence_accounts")
      .select("*")
      .eq("code", code.trim().toLowerCase())
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error("[auth] DB:", error.message);
      return NextResponse.json({ error: "Erreur DB" }, { status: 500, headers: cors });
    }
    if (!account) {
      return NextResponse.json({ error: "Code invalide" }, { status: 401, headers: cors });
    }

    // Sign JWT using supabaseKey as secret
    const secret = new TextEncoder().encode(supabaseKey);
    const token = await new SignJWT({
      role: account.role,
      model_slug: account.model_slug || null,
      display_name: account.display_name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // Update last_login
    sb.from("agence_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("id", account.id)
      .then(() => {});

    const scope = account.role === "root" ? ["*"] : account.model_slug ? ["/agence"] : [];

    return NextResponse.json({
      token,
      role: account.role,
      scope,
      model_slug: account.model_slug || null,
      display_name: account.display_name,
      loggedAt: new Date().toISOString(),
    }, { headers: cors });
  } catch (e) {
    console.error("[auth] Exception:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

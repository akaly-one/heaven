import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// ── Helpers (self-contained, no imports that could fail) ──

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

// ── OPTIONS (CORS preflight) ──

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

// ── GET /api/auth — Health check (diagnostic) ──

export async function GET(req: NextRequest) {
  const cors = corsHeaders(req);
  const checks: Record<string, boolean | string> = {};

  // 1. Env vars
  checks.has_jwt_secret = !!process.env.HEAVEN_JWT_SECRET;
  checks.has_supabase_url = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  checks.has_supabase_key = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.node_env = process.env.NODE_ENV || "unknown";

  // 2. Supabase connection
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const sb = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { count, error } = await sb
        .from("agence_accounts")
        .select("id", { count: "exact", head: true });
      checks.db_connected = !error;
      checks.db_accounts_count = error ? `error: ${error.message}` : String(count ?? 0);
    } else {
      checks.db_connected = false;
      checks.db_accounts_count = "missing env vars";
    }
  } catch (e) {
    checks.db_connected = false;
    checks.db_accounts_count = `exception: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 3. JWT signing test
  try {
    const secret = process.env.HEAVEN_JWT_SECRET;
    if (secret) {
      const encoded = new TextEncoder().encode(secret);
      const testToken = await new SignJWT({ test: true })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1m")
        .sign(encoded);
      checks.jwt_signing = testToken.length > 0;
    } else {
      checks.jwt_signing = false;
    }
  } catch (e) {
    checks.jwt_signing = false;
    checks.jwt_error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ status: "auth-health", ...checks }, { headers: cors });
}

// ── POST /api/auth — Login { code: "xxx" } ──

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);

  // Step 1: Parse body
  let code: string;
  try {
    const body = await req.json();
    code = body?.code;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400, headers: cors });
  }

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code requis" }, { status: 400, headers: cors });
  }

  // Step 2: Check env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.HEAVEN_JWT_SECRET;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[auth] Missing Supabase env vars");
    return NextResponse.json({ error: "Config serveur manquante" }, { status: 500, headers: cors });
  }
  if (!jwtSecret) {
    console.error("[auth] Missing HEAVEN_JWT_SECRET");
    return NextResponse.json({
      error: "Config JWT manquante",
      _debug: {
        has_jwt: !!process.env.HEAVEN_JWT_SECRET,
        jwt_len: (process.env.HEAVEN_JWT_SECRET || "").length,
        env_keys_heaven: Object.keys(process.env).filter(k => k.includes("HEAVEN")).join(","),
        method: req.method,
      },
    }, { status: 500, headers: cors });
  }

  // Step 3: Query DB
  let account;
  try {
    const sb = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await sb
      .from("agence_accounts")
      .select("*")
      .eq("code", code.trim().toLowerCase())
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error("[auth] DB error:", error.message);
      return NextResponse.json({ error: "Erreur base de donnees" }, { status: 500, headers: cors });
    }

    if (!data) {
      return NextResponse.json({ error: "Code invalide" }, { status: 401, headers: cors });
    }

    account = data;

    // Update last_login (fire and forget)
    sb.from("agence_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => {});
  } catch (e) {
    console.error("[auth] DB exception:", e);
    return NextResponse.json({ error: "Erreur connexion DB" }, { status: 500, headers: cors });
  }

  // Step 4: Sign JWT
  let token: string;
  try {
    const encoded = new TextEncoder().encode(jwtSecret);
    token = await new SignJWT({
      role: account.role,
      model_slug: account.model_slug || null,
      display_name: account.display_name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(encoded);
  } catch (e) {
    console.error("[auth] JWT sign error:", e);
    return NextResponse.json({ error: "Erreur signature token" }, { status: 500, headers: cors });
  }

  // Step 5: Return success
  const scope = account.role === "root" ? ["*"] : account.model_slug ? ["/agence"] : [];

  return NextResponse.json(
    {
      token,
      role: account.role,
      scope,
      model_slug: account.model_slug || null,
      display_name: account.display_name,
      loggedAt: new Date().toISOString(),
    },
    { headers: cors }
  );
}

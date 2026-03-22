import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { getServerSupabase } from "./supabase-server";

export type HeavenRole = "root" | "model" | "client";

export interface HeavenSession {
  role: HeavenRole;
  scope: string[];
  model_slug: string | null;
  display_name: string;
  loggedAt: string;
}

// ── JWT helpers ──

const JWT_SECRET_RAW = process.env.HEAVEN_JWT_SECRET || "";

function getJwtSecret(): Uint8Array {
  if (!JWT_SECRET_RAW) throw new Error("HEAVEN_JWT_SECRET not set");
  return new TextEncoder().encode(JWT_SECRET_RAW);
}

/** Sign a JWT token for a logged-in user. Expires in 7 days. */
export async function signToken(payload: {
  role: HeavenRole;
  model_slug: string | null;
  display_name: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

/** Verify a JWT token and return the payload, or null if invalid/expired. */
export async function verifyToken(
  token: string
): Promise<{ role: HeavenRole; model_slug: string | null; display_name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      role: payload.role as HeavenRole,
      model_slug: (payload.model_slug as string) || null,
      display_name: (payload.display_name as string) || "",
    };
  } catch {
    return null;
  }
}

// ── CORS ──

const ALLOWED_ORIGINS = [
  "https://heaven-os.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

export function getCorsHeaders(req?: NextRequest): Record<string, string> {
  let origin = "*";
  if (req) {
    const requestOrigin = req.headers.get("origin") || "";
    if (ALLOWED_ORIGINS.includes(requestOrigin)) {
      origin = requestOrigin;
    } else if (process.env.NODE_ENV === "development") {
      origin = requestOrigin || "*";
    } else {
      origin = ALLOWED_ORIGINS[0]; // default to prod
    }
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Extract role + model from Authorization Bearer token.
 * Returns null if no valid token present.
 */
export async function getSessionFromHeaders(
  req: NextRequest
): Promise<{ role: HeavenRole; model: string | null } | null> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) return null;

  return { role: payload.role, model: payload.model_slug };
}

/**
 * Require a specific role. Returns a 403/401 response if not authorized, or null if OK.
 */
export async function requireRole(
  req: NextRequest,
  ...allowed: HeavenRole[]
): Promise<NextResponse | null> {
  const cors = getCorsHeaders(req);
  const session = await getSessionFromHeaders(req);
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401, headers: cors });
  }
  if (!allowed.includes(session.role)) {
    return NextResponse.json({ error: "Acces non autorise" }, { status: 403, headers: cors });
  }
  return null;
}

/**
 * Get the model scope for the current request.
 * Root sees all models (returns null = no filter).
 * Model sees only their own slug.
 */
export async function getModelScope(req: NextRequest): Promise<string | null> {
  const session = await getSessionFromHeaders(req);
  if (!session) return null;
  if (session.role === "root") return null;
  return session.model;
}

/**
 * Authenticate a login code against the DB.
 * Returns the account row or null.
 */
export async function authenticateCode(code: string) {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("agence_accounts")
    .select("*")
    .eq("code", code.trim().toLowerCase())
    .eq("active", true)
    .maybeSingle();

  if (data) {
    await supabase
      .from("agence_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("id", data.id);
  }

  return data;
}

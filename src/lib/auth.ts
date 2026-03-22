import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "./supabase-server";

export type HeavenRole = "root" | "model" | "client";

export interface HeavenSession {
  role: HeavenRole;
  scope: string[];
  model_slug: string | null;
  display_name: string;
  loggedAt: string;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,x-heaven-role,x-heaven-model",
};

export function getCorsHeaders() {
  return cors;
}

/**
 * Extract role + model from request headers (set by client from sessionStorage).
 * Returns null if no auth headers present.
 */
export function getSessionFromHeaders(req: NextRequest): { role: HeavenRole; model: string | null } | null {
  const role = req.headers.get("x-heaven-role") as HeavenRole | null;
  if (!role) return null;
  const model = req.headers.get("x-heaven-model") || null;
  return { role, model };
}

/**
 * Require a specific role. Returns a 403 response if not authorized, or null if OK.
 */
export function requireRole(req: NextRequest, ...allowed: HeavenRole[]): NextResponse | null {
  const session = getSessionFromHeaders(req);
  if (!session || !allowed.includes(session.role)) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403, headers: cors });
  }
  return null;
}

/**
 * Get the model scope for the current request.
 * Root sees all models (returns null = no filter).
 * Model sees only their own slug.
 */
export function getModelScope(req: NextRequest): string | null {
  const session = getSessionFromHeaders(req);
  if (!session) return null;
  if (session.role === "root") return null; // no filter — sees everything
  return session.model; // model sees only their own
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
    // Update last_login
    await supabase
      .from("agence_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("id", data.id);
  }

  return data;
}

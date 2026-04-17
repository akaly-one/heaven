import { NextRequest, NextResponse } from "next/server";

export type { HeavenRole } from "@/types/heaven";

// ── Validation ──

/** Validate model slug OR model ID (mN format): alphanumeric + hyphens, 1-30 chars.
 *  Accepts both slugs ("yumi") and generic model IDs ("m1", "m2", etc.) */
export function isValidModelSlug(slug: string | null | undefined): slug is string {
  if (!slug) return false;
  // mN format (model IDs) and slugs both match this pattern
  return /^[a-z0-9][a-z0-9-]{0,29}$/.test(slug);
}

/** Standard API error response */
export function apiError(message: string, status: number, cors: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers: cors });
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
      origin = ALLOWED_ORIGINS[0];
    }
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

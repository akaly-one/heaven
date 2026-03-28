import { NextRequest, NextResponse } from "next/server";

export type HeavenRole = "root" | "model" | "client";

// ── Validation ──

/** Validate model slug: alphanumeric + hyphens, 1-30 chars */
export function isValidModelSlug(slug: string | null | undefined): slug is string {
  if (!slug) return false;
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

import { NextRequest, NextResponse } from "next/server";

export type HeavenRole = "root" | "model" | "client";

// ── CORS ──

const ALLOWED_ORIGINS = [
  "https://heaven-one.vercel.app",
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

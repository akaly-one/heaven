// ══════════════════════════════════════════════
//  Heaven OS — API Utilities
//  Shared helpers for all API routes
// ══════════════════════════════════════════════

import { NextResponse } from "next/server";

/** Strip HTML tags from user input */
export function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

/** Standardized error response (no DB detail leak) */
export function apiError(
  message: string,
  status: number,
  cors: Record<string, string>
): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: cors });
}

/** Standardized success response */
export function apiSuccess(
  data: unknown,
  cors: Record<string, string>,
  status = 200
): NextResponse {
  return NextResponse.json(data, { status, headers: cors });
}

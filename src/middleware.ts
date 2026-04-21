import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/jwt";

// ── Public GET routes (no auth required) ──
const PUBLIC_GET = new Set([
  "/api/health",
  "/api/models",
  "/api/wall",
  "/api/packs",
  "/api/posts",
  "/api/uploads",
  "/api/uploads/access",
  "/api/codes",
  "/api/clients",
  "/api/messages",
  "/api/system/status",
  "/api/credits/balance",
]);

// Public GET with dynamic segments
const PUBLIC_GET_PREFIXES = [
  "/api/models/",
  "/api/payments/revolut/status",
  "/api/clients/orders",
  "/api/clients/",
];

// ── Public POST routes (no auth required) ──
// Profile visitors need: wall posts, messages, client registration, code validation
const PUBLIC_POST = new Set([
  "/api/wall",
  "/api/messages",
  "/api/clients",
  "/api/codes",
  "/api/codes/security",
  "/api/credits/purchase",
  "/api/payments/paypal/create",
  "/api/payments/paypal/capture",
  "/api/payments/revolut/create",
  "/api/clients/visit",
  "/api/security/screenshot-alert",
]);

// ── Self-authed routes (have their own auth, skip JWT) ──
const SELF_AUTHED_PREFIXES = [
  "/api/payments/paypal/webhook",
  "/api/payments/revolut/webhook",
  "/api/sqwensy",
  "/api/purge",
  "/api/models/activate",
  "/api/auth/login",
  "/api/auth/logout",
];

function isPublicRoute(pathname: string, method: string): boolean {
  // CORS preflight always passes
  if (method === "OPTIONS") return true;

  // Self-authed routes
  for (const prefix of SELF_AUTHED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return true;
  }

  if (method === "GET") {
    if (PUBLIC_GET.has(pathname)) return true;
    for (const prefix of PUBLIC_GET_PREFIXES) {
      if (pathname.startsWith(prefix)) return true;
    }
  }

  if (method === "POST") {
    if (PUBLIC_POST.has(pathname)) return true;
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Root → redirect to Yumi profile (entry point)
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/m/yumi";
    return NextResponse.redirect(url);
  }

  // Only intercept /api/* routes beyond this point
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Public/self-authed routes pass through
  if (isPublicRoute(pathname, req.method)) {
    return NextResponse.next();
  }

  // All other API routes require JWT
  const token = req.cookies.get("heaven_session")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await verifySessionToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/", "/api/:path*"],
};

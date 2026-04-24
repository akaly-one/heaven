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
  "/api/feed",
  // NB 2026-04-24 : diag santé agent IA (env booléens + stats, jamais secrets)
  "/api/agence/ai/health",
]);

// Public GET with dynamic segments
const PUBLIC_GET_PREFIXES = [
  "/api/dev/",         // dev endpoints (désactivés via DISABLE_DEV_ENDPOINTS en prod)
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
  // Instagram webhook — Meta validates via hub.verify_token (GET) and
  // X-Hub-Signature (POST). Must be publicly reachable for Meta to call.
  "/api/instagram/webhook",
  // Meta data deletion callback — GET (health) + POST (Meta signed_request or manual ig_username)
  "/api/meta/data-deletion",
  // Portal routes (token-gated, no JWT) — release form pre-fill, contracts, onboarding.
  // Each route verifies a one-shot token against `agence_portal_tokens`.
  "/api/portal",
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

  // ── Backcompat sidebar D-1 (ADR-013) : /agence?tab=X → /agence/X ──
  // Bookmarks et liens profonds existants (`?tab=clients|contenu|strategie`)
  // sont redirigés vers les nouvelles routes dédiées. `clients` va vers
  // messagerie?view=contacts (B7). `contenu` et `strategie` vont vers leurs
  // pages dédiées (shells redirigeant vers le monolithe en attendant Phase 2.B).
  if (pathname === "/agence") {
    const tab = req.nextUrl.searchParams.get("tab");
    if (tab && ["clients", "contenu", "strategie"].includes(tab)) {
      // Garde-fou : si on vient déjà d'un shell `_from=route`, on NE redirige PAS
      // (évite boucle infinie shell → middleware → shell).
      const fromRoute = req.nextUrl.searchParams.get("_from") === "route";
      if (!fromRoute) {
        const url = req.nextUrl.clone();
        if (tab === "clients") {
          url.pathname = "/agence/messagerie";
          url.searchParams.set("view", "contacts");
        } else {
          url.pathname = `/agence/${tab}`;
        }
        url.searchParams.delete("tab");
        return NextResponse.redirect(url);
      }
    }
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
  // `/agence` ajouté pour intercepter les liens legacy `?tab=X` (ADR-013 backcompat).
  // Les sous-routes `/agence/...` ne sont PAS matchées — seule l'URL exacte `/agence`.
  matcher: ["/", "/agence", "/api/:path*"],
};

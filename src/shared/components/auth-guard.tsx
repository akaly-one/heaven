"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { HeavenAuth } from "@/types/heaven";
export type { HeavenAuth };

export function getHeavenAuth(): HeavenAuth | null {
  try {
    // NB 2026-04-24 : lecture localStorage (persiste 24h cross-onglets).
    // Fallback sessionStorage pour compat sessions existantes avant migration.
    const raw = localStorage.getItem("heaven_auth") || sessionStorage.getItem("heaven_auth");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Pages reserved for root admin — models cannot access these.
// Note: /agence/settings retiré — YUMI (agency admin) + chaque model ont besoin
// d'un accès partiel (sa propre Sécurité/Mode/Packs). Sections sensibles
// (Codes modèles, Dev Center) protégées par section dans la page via isAgencyAdmin/isRoot.
const ROOT_ONLY_ROUTES = ["/agence/finances", "/agence/automation", "/agence/architecture"];

function isPublicPathname(p: string | null): boolean {
  if (!p) return false;
  return (
    p === "/" ||
    p === "/login" ||
    p === "/privacy" ||
    p === "/terms" ||
    p.startsWith("/data-deletion") ||
    p.startsWith("/api/") ||
    p.startsWith("/m/")
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPublicPathname(pathname)) return;

    const raw = localStorage.getItem("heaven_auth") || sessionStorage.getItem("heaven_auth");
    if (!raw) {
      router.replace("/m/yumi");
      return;
    }
    try {
      const auth = JSON.parse(raw);

      // Block models from root-only pages
      if (auth.role === "model" && ROOT_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"))) {
        router.replace("/agence");
        return;
      }

      const scope: string[] = auth.scope || ["*"];
      if (!scope.includes("*")) {
        const allowed = scope.some((s: string) => pathname === s || pathname.startsWith(s + "/"));
        if (!allowed) {
          router.replace(scope[0] || "/m/yumi");
        }
      }
    } catch {
      router.replace("/m/yumi");
    }
  }, [pathname, router]);

  // Always render children. Protected routes redirect client-side via the effect above.
  // Pages themselves should gate their own content read (via useAuth / sessionStorage)
  // to avoid any flash of protected content.
  return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { HeavenAuth } from "@/types/heaven";
export type { HeavenAuth };

export function getHeavenAuth(): HeavenAuth | null {
  try {
    const raw = sessionStorage.getItem("heaven_auth");
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
  return p === "/" || p === "/login" || p.startsWith("/api/") || p.startsWith("/m/");
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Start checked=true to avoid SSR spinner. If this is a protected route,
  // the client-side useEffect below flips it to false then redirects.
  const [checked, setChecked] = useState(true);

  useEffect(() => {
    // Public route : nothing to check
    if (isPublicPathname(pathname)) return;

    const raw = sessionStorage.getItem("heaven_auth");
    if (!raw) {
      setChecked(false);
      router.replace("/m/yumi");
      return;
    }
    try {
      const auth = JSON.parse(raw);

      // Block models from root-only pages
      if (auth.role === "model" && ROOT_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"))) {
        setChecked(false);
        router.replace("/agence");
        return;
      }

      const scope: string[] = auth.scope || ["*"];
      if (!scope.includes("*")) {
        const allowed = scope.some((s: string) => pathname === s || pathname.startsWith(s + "/"));
        if (!allowed) {
          setChecked(false);
          router.replace(scope[0] || "/m/yumi");
          return;
        }
      }
      // Otherwise authorized — keep checked=true
    } catch {
      setChecked(false);
      router.replace("/m/yumi");
    }
  }, [pathname, router]);

  if (!checked && !isPublicPathname(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return <>{children}</>;
}

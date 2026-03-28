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

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/api/") || pathname.startsWith("/m/")) {
      setChecked(true);
      return;
    }
    const raw = sessionStorage.getItem("heaven_auth");
    if (!raw) {
      router.replace("/login");
      return;
    }
    try {
      const auth = JSON.parse(raw);
      const scope: string[] = auth.scope || ["*"];
      if (!scope.includes("*")) {
        const allowed = scope.some((s: string) => pathname === s || pathname.startsWith(s + "/"));
        if (!allowed) {
          router.replace(scope[0] || "/login");
          return;
        }
      }
      setChecked(true);
    } catch {
      router.replace("/login");
    }
  }, [pathname, router]);

  if (!checked && pathname !== "/login") {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(230,51,41,0.2)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return <>{children}</>;
}

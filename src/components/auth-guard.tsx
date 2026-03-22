"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export interface HeavenAuth {
  role: "root" | "model" | "client";
  scope: string[];
  model_slug: string | null;
  display_name: string;
  loggedAt: string;
  token?: string;
}

export function getHeavenAuth(): HeavenAuth | null {
  try {
    const raw = sessionStorage.getItem("heaven_auth");
    if (!raw) return null;
    const parsed: HeavenAuth = JSON.parse(raw);
    // Legacy sessions without JWT token are invalid
    if (!parsed.token) {
      sessionStorage.removeItem("heaven_auth");
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Public routes — no auth needed
    if (pathname === "/login" || pathname.startsWith("/api/") || pathname.startsWith("/m/")) {
      setChecked(true);
      return;
    }

    const auth = getHeavenAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }

    const scope: string[] = auth.scope || ["*"];

    // Root (*) can access everything
    if (scope.includes("*")) {
      setChecked(true);
      return;
    }

    // Scoped users — check access
    const allowed = scope.some((s: string) => pathname === s || pathname.startsWith(s + "/"));
    if (!allowed) {
      router.replace(scope[0] || "/login");
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked && pathname !== "/login") {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,168,76,0.2)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return <>{children}</>;
}

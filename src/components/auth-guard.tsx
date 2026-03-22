"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
      // Admin (*) can access everything. Scoped users can only access their pages.
      if (!scope.includes("*")) {
        const allowed = scope.some((s: string) => pathname === s || pathname.startsWith(s + "/"));
        if (!allowed) {
          // Redirect to their first allowed page
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--sq-bg)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,168,76,0.2)", borderTopColor: "#C9A84C" }} />
      </div>
    );
  }

  return <>{children}</>;
}

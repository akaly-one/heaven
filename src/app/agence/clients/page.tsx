"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Clients page — redirects to the cockpit where clients and codes are unified.
 * The separate clients view has been merged into the main cockpit.
 */
export default function ClientsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/agence");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(201,168,76,0.2)", borderTopColor: "var(--accent)" }} />
    </div>
  );
}

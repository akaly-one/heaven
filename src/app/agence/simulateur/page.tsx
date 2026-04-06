"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SimulateurRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/agence/strategie");
  }, [router]);
  return null;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MessagesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/agence/clients"); }, [router]);
  return null;
}

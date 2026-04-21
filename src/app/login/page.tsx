"use client";

import { useEffect } from "react";

/**
 * Legacy /login route — deprecated.
 * Admin auth now happens via the modal on the Yumi profile (/m/yumi).
 * This page only redirects, it does not render any auth form.
 */
export default function DeprecatedLoginPage() {
  useEffect(() => {
    window.location.replace("/m/yumi");
  }, []);
  return null;
}

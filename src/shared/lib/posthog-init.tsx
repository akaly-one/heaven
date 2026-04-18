"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, type ReactNode } from "react";

/**
 * PostHogProvider — MON-001 (free tier EU)
 *
 * Errors + analytics + session replay + feature flags.
 * Activation conditionnée à la présence de `NEXT_PUBLIC_POSTHOG_KEY`
 * (placeholder tant que NB n'a pas signé eu.posthog.com).
 *
 * Note Heaven : silo confidentiel — project PostHog dédié, aucun lien
 * explicite avec les autres projets SQWENSY côté dashboard.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === "undefined") return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-private]",
      },
    });
  }, []);

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

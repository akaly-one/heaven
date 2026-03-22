"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * useScreenshotDetection — Best-effort screenshot detection hook.
 *
 * Detection methods:
 * 1. Page Visibility API — iOS screenshots trigger a brief visibility change
 * 2. Keyboard shortcuts — Cmd+Shift+3/4 (Mac), PrintScreen (Windows)
 *
 * IMPORTANT: This reduces casual screenshots but cannot prevent determined users.
 * The watermark (ContentProtection) is the real protection layer.
 *
 * On detection:
 * - Blurs all content for 3 seconds
 * - Shows a warning overlay
 * - Fires the onDetected callback (to report to backend)
 */

interface UseScreenshotDetectionOptions {
  /** Whether detection is active */
  enabled: boolean;
  /** Called when a screenshot is detected */
  onDetected: () => void;
  /** Blur duration in ms (default 3000) */
  blurDuration?: number;
}

export function useScreenshotDetection({
  enabled,
  onDetected,
  blurDuration = 3000,
}: UseScreenshotDetectionOptions) {
  const warningRef = useRef<HTMLDivElement | null>(null);
  const cooldownRef = useRef(false);

  const triggerAlert = useCallback(() => {
    // Prevent rapid re-triggers
    if (cooldownRef.current) return;
    cooldownRef.current = true;

    // 1. Blur all content
    document.body.style.filter = "blur(20px)";
    document.body.style.transition = "filter 0.2s ease";

    // 2. Show warning overlay
    const overlay = document.createElement("div");
    overlay.id = "screenshot-warning-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(10,10,15,0.95)",
      backdropFilter: "blur(20px)",
    });
    overlay.innerHTML = `
      <div style="text-align:center;max-width:320px;padding:24px;">
        <div style="width:56px;height:56px;border-radius:16px;background:rgba(239,68,68,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h2 style="color:#fff;font-size:16px;font-weight:700;margin-bottom:8px;">Screenshots are not allowed</h2>
        <p style="color:rgba(255,255,255,0.5);font-size:12px;line-height:1.5;">
          This incident has been reported. All content is watermarked with your identity.
        </p>
      </div>
    `;
    document.body.appendChild(overlay);
    warningRef.current = overlay;

    // 3. Fire callback
    onDetected();

    // 4. Clean up after duration
    setTimeout(() => {
      document.body.style.filter = "";
      document.body.style.transition = "";
      overlay.remove();
      warningRef.current = null;
      cooldownRef.current = false;
    }, blurDuration);
  }, [onDetected, blurDuration]);

  useEffect(() => {
    if (!enabled) return;

    // Method 1: Visibility API — iOS screenshot triggers brief hidden
    let lastHidden = 0;
    const onVisibilityChange = () => {
      if (document.hidden) {
        lastHidden = Date.now();
      } else {
        const elapsed = Date.now() - lastHidden;
        // iOS screenshot causes ~200-500ms hidden state
        if (elapsed > 100 && elapsed < 1500) {
          triggerAlert();
        }
      }
    };

    // Method 2: Keyboard shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        triggerAlert();
        return;
      }
      // Windows: PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        triggerAlert();
        return;
      }
      // Ctrl+P (print to PDF)
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        triggerAlert();
        return;
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("keydown", onKeyDown, true);
      // Cleanup on unmount
      if (warningRef.current) {
        warningRef.current.remove();
        document.body.style.filter = "";
      }
    };
  }, [enabled, triggerAlert]);
}

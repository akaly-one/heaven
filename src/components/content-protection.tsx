"use client";

import { useEffect, useRef } from "react";

/**
 * ContentProtection — Dynamic watermark overlay for protected media.
 *
 * Renders a CSS-only watermark pattern over children (images/videos).
 * The watermark is NOT baked into the file — the original stays clean in storage.
 * If someone screenshots → their username is embedded in the capture.
 *
 * Also applies:
 * - Right-click disabled (contextmenu)
 * - Drag disabled (dragstart)
 * - user-select: none on media
 * - Transparent overlay above images (prevents direct save)
 */

interface ContentProtectionProps {
  children: React.ReactNode;
  /** Subscriber's @username — displayed in the watermark */
  username: string;
  /** Optional timestamp override (defaults to current time) */
  timestamp?: string;
  /** Whether protection is active (e.g. false for public/promo content) */
  enabled?: boolean;
  /** Extra CSS class on the container */
  className?: string;
}

export function ContentProtection({
  children,
  username,
  timestamp,
  enabled = true,
  className = "",
}: ContentProtectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Disable right-click and drag on all images/videos inside
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const blockContext = (e: Event) => { e.preventDefault(); };
    const blockDrag = (e: Event) => { e.preventDefault(); };

    el.addEventListener("contextmenu", blockContext);
    el.addEventListener("dragstart", blockDrag);

    return () => {
      el.removeEventListener("contextmenu", blockContext);
      el.removeEventListener("dragstart", blockDrag);
    };
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  const ts = timestamp || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const watermarkText = `@${username} · ${ts}`;

  return (
    <div
      ref={containerRef}
      className={`content-protection-container ${className}`}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Protected content */}
      <div style={{ WebkitUserSelect: "none", userSelect: "none" }}>
        {children}
      </div>

      {/* Watermark overlay — CSS pattern, not baked into images */}
      <div
        className="content-watermark-overlay"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "-50%",
            width: "200%",
            height: "200%",
            display: "flex",
            flexWrap: "wrap",
            alignContent: "flex-start",
            transform: "rotate(-30deg)",
            opacity: 0.15,
          }}
        >
          {Array.from({ length: 80 }).map((_, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                padding: "20px 40px",
                fontSize: "11px",
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#ffffff",
                whiteSpace: "nowrap",
                letterSpacing: "0.5px",
              }}
            >
              {watermarkText}
            </span>
          ))}
        </div>
      </div>

      {/* Transparent interaction shield — prevents "Save Image As" */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 11,
          background: "transparent",
        }}
        onContextMenu={e => e.preventDefault()}
        onDragStart={e => e.preventDefault()}
      />
    </div>
  );
}

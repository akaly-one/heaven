// Simple browser fingerprint (no external lib needed)
export function getDeviceFingerprint(): string {
  const nav = window.navigator;
  const screen = window.screen;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 0,
    (nav as unknown as Record<string, number>).deviceMemory || 0,
    nav.maxTouchPoints || 0,
    // Canvas fingerprint
    (() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return "no-canvas";
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("fp", 2, 2);
        return canvas.toDataURL().slice(-50);
      } catch { return "err"; }
    })(),
  ].join("|");

  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(8, "0") + raw.length.toString(36);
}

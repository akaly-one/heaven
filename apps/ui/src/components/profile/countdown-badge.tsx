"use client";

import { useEffect, useState } from "react";

export function CountdownBadge({ tier, expiresAt }: { tier: string; expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpiring, setIsExpiring] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("expiré"); setIsExpiring(true); return; }
      setIsExpiring(diff < 600000); // < 10 min
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) setTimeLeft(`${Math.floor(h / 24)}j ${h % 24}h`);
      else if (h > 0) setTimeLeft(`${h}h${m.toString().padStart(2, "0")}`);
      else setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono"
      style={{
        background: isExpiring ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
        color: isExpiring ? "#EF4444" : "#10B981",
        animation: isExpiring ? "pulse 1s infinite" : "none",
      }}>
      {tier.toUpperCase()} {timeLeft}
    </span>
  );
}

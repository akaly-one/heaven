"use client";

import { Bot, User } from "lucide-react";

type Mode = "agent" | "human";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  size?: "sm" | "md";
}

export function ModeToggle({ mode, onChange, size = "md" }: ModeToggleProps) {
  const isSm = size === "sm";
  const btnBase = `flex items-center gap-1 font-medium cursor-pointer transition-all duration-200 rounded-lg border-none outline-none ${
    isSm ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
  }`;
  const iconSize = isSm ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <div
      className="flex rounded-lg p-0.5"
      style={{ background: "var(--bg3)", border: "1px solid var(--border2)" }}
    >
      <button
        className={btnBase}
        style={{
          background: mode === "agent" ? "rgba(99,102,241,0.15)" : "transparent",
          color: mode === "agent" ? "#818CF8" : "var(--text-muted)",
        }}
        onClick={() => onChange("agent")}
      >
        <Bot className={iconSize} />
        Agent
      </button>
      <button
        className={btnBase}
        style={{
          background: mode === "human" ? "rgba(34,197,94,0.15)" : "transparent",
          color: mode === "human" ? "#22C55E" : "var(--text-muted)",
        }}
        onClick={() => onChange("human")}
      >
        <User className={iconSize} />
        Humain
      </button>
    </div>
  );
}

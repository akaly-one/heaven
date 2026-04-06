"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "heaven_theme";

export function ThemeToggle({ size = "default" }: { size?: "default" | "sm" }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  };

  if (!mounted) return null;

  const isSmall = size === "sm";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      className="flex items-center justify-center rounded-lg cursor-pointer transition-all"
      style={{
        width: isSmall ? 28 : 32,
        height: isSmall ? 28 : 32,
        background: "transparent",
        border: "none",
        color: "var(--text-muted)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme === "dark"
          ? "rgba(255,255,255,0.06)"
          : "rgba(0,0,0,0.05)";
        e.currentTarget.style.color = "var(--text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      <Icon className={isSmall ? "w-3.5 h-3.5" : "w-4 h-4"} />
    </button>
  );
}

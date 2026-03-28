"use client";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

const SIZES = { sm: 16, md: 24, lg: 32 };

export function Spinner({ size = "md", color }: SpinnerProps) {
  const px = SIZES[size];
  return (
    <div
      className="animate-spin rounded-full"
      style={{
        width: px,
        height: px,
        border: `2px solid rgba(230,51,41,0.15)`,
        borderTopColor: color || "var(--accent)",
      }}
    />
  );
}

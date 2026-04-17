"use client";

interface SkeletonProps {
  variant?: "line" | "circle" | "card";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ variant = "line", width, height, className = "" }: SkeletonProps) {
  const base: React.CSSProperties = {
    background: "linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s ease-in-out infinite",
  };

  if (variant === "circle") {
    const size = width || 40;
    return (
      <div
        className={`rounded-full flex-shrink-0 ${className}`}
        style={{ ...base, width: size, height: size }}
      />
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-xl ${className}`}
        style={{
          ...base,
          width: width || "100%",
          height: height || 120,
          borderRadius: "var(--radius)",
        }}
      />
    );
  }

  // line (default)
  return (
    <div
      className={`rounded ${className}`}
      style={{
        ...base,
        width: width || "100%",
        height: height || 14,
        borderRadius: 6,
      }}
    />
  );
}

/** Common skeleton patterns */
export function SkeletonCard() {
  return (
    <div className="p-4 space-y-3" style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={36} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={12} />
          <Skeleton width="40%" height={10} />
        </div>
      </div>
      <Skeleton height={10} />
      <Skeleton width="80%" height={10} />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="p-4 space-y-2" style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
      <Skeleton width={80} height={10} />
      <Skeleton width={120} height={24} />
      <Skeleton width={60} height={10} />
    </div>
  );
}

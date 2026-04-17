"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full mb-4"
        style={{ background: "var(--bg2)" }}
      >
        <Icon size={22} style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
        {title}
      </p>
      {description && (
        <p className="text-xs max-w-[280px]" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

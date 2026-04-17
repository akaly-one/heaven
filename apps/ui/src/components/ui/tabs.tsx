"use client";

import type { LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  size?: "sm" | "md";
}

export function Tabs({ tabs, activeTab, onTabChange, size = "md" }: TabsProps) {
  const isSmall = size === "sm";

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className="segmented-control"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            className={active ? "active" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isSmall ? 4 : 6,
              fontSize: isSmall ? 12 : 13,
              padding: isSmall ? "6px 10px" : undefined,
              position: "relative",
            }}
            onKeyDown={(e) => {
              const idx = tabs.findIndex(t => t.id === tab.id);
              if (e.key === "ArrowRight" && idx < tabs.length - 1) {
                e.preventDefault();
                onTabChange(tabs[idx + 1].id);
              } else if (e.key === "ArrowLeft" && idx > 0) {
                e.preventDefault();
                onTabChange(tabs[idx - 1].id);
              }
            }}
          >
            {Icon && <Icon size={isSmall ? 13 : 14} />}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="text-[10px] font-bold text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
                style={{ background: "var(--accent)", lineHeight: 1 }}
              >
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Tab panel wrapper for accessibility */
export function TabPanel({
  id,
  activeTab,
  children,
}: {
  id: string;
  activeTab: string;
  children: React.ReactNode;
}) {
  if (id !== activeTab) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

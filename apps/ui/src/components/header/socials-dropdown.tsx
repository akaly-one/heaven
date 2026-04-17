"use client";

import { X, ExternalLink } from "lucide-react";

interface Platform {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  urlPrefix: string;
}

interface SocialsDropdownProps {
  dropdownBox: string;
  dropdownStyle: React.CSSProperties;
  platforms: Platform[];
  modelPlatforms: Record<string, string | null> | undefined;
  onSavePlatform: (platformId: string, value: string) => void;
  onClose: () => void;
}

export function SocialsDropdown({
  dropdownBox, dropdownStyle,
  platforms, modelPlatforms,
  onSavePlatform, onClose,
}: SocialsDropdownProps) {
  return (
    <div className={dropdownBox} style={dropdownStyle}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-xs font-bold" style={{ color: "var(--text)" }}>Reseaux sociaux</span>
        <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
          style={{ background: "none", border: "none", color: "var(--text-muted)" }}><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-3 space-y-1.5">
        {platforms.map(p => {
          const handle = modelPlatforms?.[p.id] || "";
          return (
            <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-[11px] font-medium shrink-0 w-16" style={{ color: "var(--text-muted)" }}>{p.label}</span>
              <input defaultValue={handle} placeholder="pseudo..."
                className="flex-1 text-[11px] bg-transparent outline-none min-w-0" style={{ color: "var(--text)" }}
                onBlur={e => onSavePlatform(p.id, e.target.value.trim())}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
              {handle && (
                <a href={handle.startsWith("http") ? handle : `${p.urlPrefix}${handle}`}
                  target="_blank" rel="noopener noreferrer"
                  className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md no-underline" style={{ color: p.color }}>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

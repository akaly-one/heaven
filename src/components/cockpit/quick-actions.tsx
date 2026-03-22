"use client";

import { Plus, Upload, Eye } from "lucide-react";

interface QuickActionsProps {
  onGenerateCode: () => void;
  onUploadContent: () => void;
  modelSlug: string;
}

export function QuickActions({ onGenerateCode, onUploadContent, modelSlug }: QuickActionsProps) {
  const actions = [
    { label: "Generate Code", icon: Plus, color: "#6366F1", onClick: onGenerateCode },
    { label: "Upload Content", icon: Upload, color: "#F43F5E", onClick: onUploadContent },
    { label: "View Profile", icon: Eye, color: "#10B981", onClick: () => window.open(`/m/${modelSlug}`, "_blank") },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map(a => (
        <button
          key={a.label}
          onClick={a.onClick}
          className="card-premium p-4 flex flex-col items-center gap-2 cursor-pointer group"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: `${a.color}12` }}
          >
            <a.icon className="w-5 h-5" style={{ color: a.color }} />
          </div>
          <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

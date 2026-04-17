"use client";

import { RotateCcw, Save } from "lucide-react";

interface EditSaveBarProps {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditSaveBar({ dirty, saving, onSave, onCancel }: EditSaveBarProps) {
  if (!dirty) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{ background: "var(--surface)", borderTop: "1px solid var(--border2)", boxShadow: "0 -4px 24px rgba(0,0,0,0.3)" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-12 py-3 flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Modifications non sauvegardées
        </p>
        <div className="flex items-center gap-2">
          <button onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid var(--border2)" }}>
            <RotateCcw className="w-3 h-3" /> Annuler
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#000" }}>
            {saving ? (
              <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

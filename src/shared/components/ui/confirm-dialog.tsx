"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button on open
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 sheet-backdrop animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className="relative glass-strong animate-slide-up w-full max-w-sm mx-4 p-6"
        style={{
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
        }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-desc" : undefined}
      >
        {destructive && (
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full mb-4 mx-auto"
            style={{ background: "rgba(220,38,38,0.08)" }}
          >
            <AlertTriangle size={20} style={{ color: "var(--danger)" }} />
          </div>
        )}

        <h3
          id="confirm-title"
          className="text-base font-bold text-center mb-1"
          style={{ color: "var(--text)" }}
        >
          {title}
        </h3>

        {description && (
          <p
            id="confirm-desc"
            className="text-sm text-center mb-6"
            style={{ color: "var(--text-muted)" }}
          >
            {description}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors"
            style={{
              background: "var(--bg2)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white transition-all"
            style={{
              background: destructive ? "var(--danger)" : "var(--accent)",
              boxShadow: destructive
                ? "0 4px 16px rgba(220,38,38,0.25)"
                : "var(--shadow-accent)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

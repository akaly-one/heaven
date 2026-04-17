"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { X, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

// ── Types ──

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
}

// ── Context ──

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ── Icons & colors per type ──

const TOAST_CONFIG: Record<ToastType, { icon: typeof CheckCircle; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: "var(--success)", bg: "rgba(22,163,74,0.08)" },
  error: { icon: XCircle, color: "var(--danger)", bg: "rgba(220,38,38,0.08)" },
  warning: { icon: AlertTriangle, color: "var(--warning)", bg: "rgba(217,119,6,0.08)" },
  info: { icon: Info, color: "var(--accent)", bg: "rgba(230,51,41,0.08)" },
};

// ── Provider ──

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    }
  }, [dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast container — bottom center */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none"
          style={{ maxWidth: "min(420px, calc(100vw - 32px))" }}
        >
          {toasts.map((t) => {
            const config = TOAST_CONFIG[t.type];
            const Icon = config.icon;
            return (
              <div
                key={t.id}
                role="alert"
                aria-live="polite"
                className="pointer-events-auto animate-slide-up glass-strong flex items-center gap-3 px-4 py-3"
                style={{
                  borderRadius: "var(--radius)",
                  borderLeft: `3px solid ${config.color}`,
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <Icon size={18} style={{ color: config.color, flexShrink: 0 }} />
                <span className="text-sm font-medium flex-1" style={{ color: "var(--text)" }}>
                  {t.message}
                </span>
                <button
                  onClick={() => dismiss(t.id)}
                  className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                  aria-label="Fermer"
                >
                  <X size={14} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

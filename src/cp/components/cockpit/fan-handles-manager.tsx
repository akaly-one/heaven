"use client";

import { useState } from "react";
import { Globe, Instagram, Zap, Heart, Check, X, Plus, Edit2, Loader2 } from "lucide-react";

export type HandleSource = "web" | "instagram" | "snap" | "fanvue";

export interface FanHandles {
  pseudo_web?: string | null;
  pseudo_insta?: string | null;
  pseudo_snap?: string | null;
  fanvue_handle?: string | null;
}

interface FanHandlesManagerProps {
  fanId: string;
  handles: FanHandles;
  onUpdated?: () => void;
}

interface HandleConfig {
  key: HandleSource;
  field: keyof FanHandles;
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  border: string;
  prefix: string;
}

const HANDLES: HandleConfig[] = [
  {
    key: "web",
    field: "pseudo_web",
    label: "Web",
    placeholder: "pseudo-web",
    icon: Globe,
    color: "#9CA3AF",
    bg: "rgba(107,114,128,0.08)",
    border: "rgba(107,114,128,0.25)",
    prefix: "",
  },
  {
    key: "instagram",
    field: "pseudo_insta",
    label: "Instagram",
    placeholder: "pseudo.insta",
    icon: Instagram,
    color: "#E1306C",
    bg: "rgba(225,48,108,0.08)",
    border: "rgba(225,48,108,0.25)",
    prefix: "@",
  },
  {
    key: "snap",
    field: "pseudo_snap",
    label: "Snapchat",
    placeholder: "pseudo-snap",
    icon: Zap,
    color: "#E6C100",
    bg: "rgba(230,193,0,0.10)",
    border: "rgba(230,193,0,0.28)",
    prefix: "",
  },
  {
    key: "fanvue",
    field: "fanvue_handle",
    label: "Fanvue",
    placeholder: "fanvue-handle",
    icon: Heart,
    color: "#C9A84C",
    bg: "rgba(201,168,76,0.10)",
    border: "rgba(201,168,76,0.28)",
    prefix: "",
  },
];

export function FanHandlesManager({
  fanId,
  handles,
  onUpdated,
}: FanHandlesManagerProps) {
  const [editingKey, setEditingKey] = useState<HandleSource | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (cfg: HandleConfig) => {
    setEditingKey(cfg.key);
    setDraft((handles[cfg.field] as string | null) || "");
    setError(null);
  };

  const cancel = () => {
    setEditingKey(null);
    setDraft("");
    setError(null);
  };

  const save = async (cfg: HandleConfig) => {
    const value = draft.trim().replace(/^@/, "");
    setSaving(true);
    setError(null);
    try {
      if (cfg.key === "instagram") {
        const res = await fetch("/api/agence/fans/link-instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fan_id: fanId, ig_username: value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Erreur lors de la mise à jour");
          return;
        }
      } else {
        // Generic handle update — route convention matches link-instagram
        const res = await fetch(`/api/agence/fans/${fanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [cfg.field]: value || null }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Erreur lors de la mise à jour");
          return;
        }
      }
      setEditingKey(null);
      setDraft("");
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3
        className="text-[10px] uppercase tracking-wider font-semibold mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        Handles liés
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {HANDLES.map((cfg) => {
          const Icon = cfg.icon;
          const value = handles[cfg.field] as string | null | undefined;
          const isEditing = editingKey === cfg.key;
          const hasValue = Boolean(value);

          return (
            <div
              key={cfg.key}
              className="rounded-lg p-3 transition-all"
              style={{
                background: hasValue ? cfg.bg : "var(--bg2)",
                border: `1px solid ${hasValue ? cfg.border : "var(--border2)"}`,
              }}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className="w-3 h-3 shrink-0"
                      style={{ color: cfg.color }}
                    />
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {cfg.prefix && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {cfg.prefix}
                      </span>
                    )}
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={cfg.placeholder}
                      autoFocus
                      className="flex-1 px-2 py-1.5 text-xs rounded"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        minWidth: 0,
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") save(cfg);
                        if (e.key === "Escape") cancel();
                      }}
                    />
                  </div>
                  {error && (
                    <div
                      className="text-[10px] px-2 py-1 rounded"
                      style={{
                        background: "rgba(220,38,38,0.08)",
                        color: "#F87171",
                      }}
                    >
                      {error}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => save(cfg)}
                      disabled={saving}
                      className="flex-1 text-[10px] py-1.5 rounded font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                      style={{
                        background: cfg.color,
                        color: "#0A0A0C",
                      }}
                    >
                      {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      {saving ? "" : "OK"}
                    </button>
                    <button
                      type="button"
                      onClick={cancel}
                      className="text-[10px] px-2 py-1.5 rounded"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-muted)",
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Icon
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: cfg.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[9px] uppercase tracking-wider font-semibold"
                        style={{ color: cfg.color }}
                      >
                        {cfg.label}
                      </div>
                      {hasValue ? (
                        <div
                          className="text-xs truncate font-medium"
                          style={{ color: "var(--text)" }}
                        >
                          {cfg.prefix}
                          {value}
                        </div>
                      ) : (
                        <div
                          className="text-[11px] italic"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Non lié
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(cfg)}
                    className="text-[10px] p-1.5 rounded inline-flex items-center gap-1 shrink-0"
                    style={{
                      background: hasValue ? "transparent" : cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                    }}
                    aria-label={hasValue ? "Modifier" : "Ajouter"}
                  >
                    {hasValue ? (
                      <Edit2 className="w-3 h-3" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

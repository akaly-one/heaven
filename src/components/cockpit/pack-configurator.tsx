"use client";

import { useState, useCallback } from "react";
import {
  Package,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
  GripVertical,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { PackConfig } from "@/types/heaven";

// ── Props ──

interface PackConfiguratorProps {
  packs: PackConfig[];
  model: string;
  onSave: (packs: PackConfig[]) => void;
  authHeaders: () => Record<string, string>;
}

// ── Preset swatches ──

const COLOR_SWATCHES = [
  "#C0C0C0",
  "#D4AF37",
  "#1C1C1C",
  "#B8860B",
  "#E63329",
  "#4F46E5",
  "#7C3AED",
  "#10B981",
];

// ── Component ──

export function PackConfigurator({
  packs: initialPacks,
  model,
  onSave,
  authHeaders,
}: PackConfiguratorProps) {
  const [packs, setPacks] = useState<PackConfig[]>(
    () => initialPacks.map((p) => ({ ...p, features: [...p.features] }))
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ──

  const updatePack = useCallback(
    (id: string, patch: Partial<PackConfig>) => {
      setPacks((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
      setSaved(false);
    },
    []
  );

  const updateFeature = useCallback(
    (packId: string, idx: number, value: string) => {
      setPacks((prev) =>
        prev.map((p) => {
          if (p.id !== packId) return p;
          const features = [...p.features];
          features[idx] = value;
          return { ...p, features };
        })
      );
      setSaved(false);
    },
    []
  );

  const addFeature = useCallback((packId: string) => {
    setPacks((prev) =>
      prev.map((p) => {
        if (p.id !== packId) return p;
        return { ...p, features: [...p.features, ""] };
      })
    );
    setSaved(false);
  }, []);

  const removeFeature = useCallback((packId: string, idx: number) => {
    setPacks((prev) =>
      prev.map((p) => {
        if (p.id !== packId) return p;
        const features = p.features.filter((_, i) => i !== idx);
        return { ...p, features };
      })
    );
    setSaved(false);
  }, []);

  // ── Save ──

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/packs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ model, packs }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      onSave(packs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──

  return (
    <div className="space-y-2 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text)" }}
          >
            Packs
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
          style={{
            background: saved ? "#10B981" : "var(--accent)",
            color: "#fff",
            border: "none",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "..." : saved ? "Sauvegard\u00e9" : "Sauvegarder"}
        </button>
      </div>

      {error && (
        <div
          className="px-3 py-1.5 rounded-lg text-[10px]"
          style={{ background: "rgba(230,51,41,0.15)", color: "#E63329" }}
        >
          {error}
        </div>
      )}

      {/* Pack list */}
      <div className="space-y-1.5">
        {packs.map((pack) => {
          const isExpanded = expandedId === pack.id;

          return (
            <div
              key={pack.id}
              className="rounded-lg overflow-hidden transition-all"
              style={{
                background: "var(--surface)",
                border: `1px solid ${isExpanded ? pack.color + "66" : "var(--border)"}`,
              }}
            >
              {/* Collapsed row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : pack.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text)",
                }}
              >
                <GripVertical
                  className="w-3 h-3 shrink-0"
                  style={{ color: "var(--text-muted)" }}
                />
                {/* Color dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: pack.color }}
                />
                {/* Name */}
                <span className="text-[11px] font-bold flex-1 text-left truncate">
                  {pack.name}
                </span>
                {/* Badge */}
                {pack.badge && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: pack.color + "22",
                      color: pack.color === "#1C1C1C" ? "#C0C0C0" : pack.color,
                    }}
                  >
                    {pack.badge}
                  </span>
                )}
                {/* Price */}
                <span
                  className="text-[11px] font-mono font-bold shrink-0"
                  style={{ color: pack.color === "#1C1C1C" ? "#C0C0C0" : pack.color }}
                >
                  {pack.price}&euro;
                </span>
                {/* Active toggle */}
                <span
                  className="shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    updatePack(pack.id, { active: !pack.active });
                  }}
                >
                  {pack.active ? (
                    <ToggleRight
                      className="w-4 h-4"
                      style={{ color: "#10B981" }}
                    />
                  ) : (
                    <ToggleLeft
                      className="w-4 h-4"
                      style={{ color: "var(--text-muted)" }}
                    />
                  )}
                </span>
                {/* Expand icon */}
                <Pencil
                  className="w-3 h-3 shrink-0"
                  style={{
                    color: isExpanded ? "var(--accent)" : "var(--text-muted)",
                  }}
                />
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div
                  className="px-3 pb-3 space-y-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {/* Row: Name + Price */}
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={pack.name}
                        onChange={(v) => updatePack(pack.id, { name: v })}
                      />
                    </div>
                    <div>
                      <Label>Prix (&euro;)</Label>
                      <Input
                        value={String(pack.price)}
                        type="number"
                        onChange={(v) =>
                          updatePack(pack.id, {
                            price: Math.max(0, Number(v) || 0),
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Row: Code prefix + Badge */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Code prefix</Label>
                      <Input
                        value={pack.code || ""}
                        onChange={(v) => updatePack(pack.id, { code: v })}
                        placeholder="AG-SLV"
                      />
                    </div>
                    <div>
                      <Label>Badge</Label>
                      <Input
                        value={pack.badge || ""}
                        onChange={(v) =>
                          updatePack(pack.id, {
                            badge: v.trim() || null,
                          })
                        }
                        placeholder="aucun"
                      />
                    </div>
                  </div>

                  {/* Color picker */}
                  <div>
                    <Label>Couleur</Label>
                    <div className="flex gap-1.5 mt-1">
                      {COLOR_SWATCHES.map((c) => (
                        <button
                          key={c}
                          onClick={() => updatePack(pack.id, { color: c })}
                          className="w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                          style={{
                            background: c,
                            border:
                              pack.color === c
                                ? "2px solid var(--text)"
                                : "2px solid transparent",
                          }}
                        >
                          {pack.color === c && (
                            <Check
                              className="w-2.5 h-2.5"
                              style={{
                                color:
                                  c === "#1C1C1C" || c === "#4F46E5" || c === "#7C3AED"
                                    ? "#fff"
                                    : "#000",
                              }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Face toggle */}
                  <div className="flex items-center justify-between">
                    <Label>Visage visible</Label>
                    <button
                      onClick={() =>
                        updatePack(pack.id, { face: !pack.face })
                      }
                      className="cursor-pointer"
                      style={{ background: "none", border: "none" }}
                    >
                      {pack.face ? (
                        <ToggleRight
                          className="w-5 h-5"
                          style={{ color: "#10B981" }}
                        />
                      ) : (
                        <ToggleLeft
                          className="w-5 h-5"
                          style={{ color: "var(--text-muted)" }}
                        />
                      )}
                    </button>
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center justify-between">
                    <Label>Actif</Label>
                    <button
                      onClick={() =>
                        updatePack(pack.id, { active: !pack.active })
                      }
                      className="cursor-pointer"
                      style={{ background: "none", border: "none" }}
                    >
                      {pack.active ? (
                        <ToggleRight
                          className="w-5 h-5"
                          style={{ color: "#10B981" }}
                        />
                      ) : (
                        <ToggleLeft
                          className="w-5 h-5"
                          style={{ color: "var(--text-muted)" }}
                        />
                      )}
                    </button>
                  </div>

                  {/* Features */}
                  <div>
                    <Label>Features</Label>
                    <div className="space-y-1 mt-1">
                      {pack.features.map((feat, idx) => (
                        <div key={idx} className="flex gap-1 items-center">
                          <input
                            value={feat}
                            onChange={(e) =>
                              updateFeature(pack.id, idx, e.target.value)
                            }
                            className="flex-1 px-2 py-1.5 rounded text-[11px] outline-none"
                            style={{
                              background: "var(--bg)",
                              color: "var(--text)",
                              border: "1px solid var(--border)",
                            }}
                          />
                          <button
                            onClick={() => removeFeature(pack.id, idx)}
                            className="p-1 rounded cursor-pointer hover:opacity-80"
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#E63329",
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addFeature(pack.id)}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                        style={{
                          background: "var(--bg)",
                          color: "var(--accent)",
                          border: "1px dashed var(--border)",
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Micro-components ──

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider block mb-0.5"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </span>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 rounded text-[11px] outline-none"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        border: "1px solid var(--border)",
      }}
    />
  );
}

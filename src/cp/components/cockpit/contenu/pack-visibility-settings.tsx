"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Sparkles, Save, CheckCircle2, AlertCircle } from "lucide-react";
import {
  DEFAULT_VISIBILITY,
  blurInlineStyle,
  type PackVisibility,
  type VisibilityRule,
} from "@/lib/pack-visibility";

/* ══════════════════════════════════════════════════════════════════════════
   <PackVisibilitySettings> — Agent 5.B Phase 5 B8
   UI admin pour éditer les règles de visibilité d'un pack :
   - Select `visibility_rule` (3 options avec tooltips)
   - Slider `blur_intensity` (affiché si rule = preview_blur)
   - Input `preview_count` (affiché si rule = preview_blur)
   - Preview live de l'effet flou sur une image placeholder
   - Bouton Save → PATCH /api/packs/[id]
   ══════════════════════════════════════════════════════════════════════════ */

interface Props {
  packId: string;
  modelSlug: string;
  initialVisibility?: PackVisibility;
  previewImageUrl?: string;
  authHeaders?: () => HeadersInit;
  onSaved?: (visibility: PackVisibility) => void;
}

type RuleOption = {
  value: VisibilityRule;
  label: string;
  icon: React.ElementType;
  tooltip: string;
};

const RULE_OPTIONS: RuleOption[] = [
  {
    value: "public",
    label: "Public",
    icon: Eye,
    tooltip: "Tout le monde voit le pack en entier, y compris les visiteurs non connectés.",
  },
  {
    value: "if_purchased",
    label: "Réservé aux acheteurs",
    icon: Lock,
    tooltip:
      "Seuls les fans ayant acheté le pack voient le contenu. Les autres ne voient rien.",
  },
  {
    value: "preview_blur",
    label: "Preview floutée",
    icon: Sparkles,
    tooltip:
      "Les N premiers items sont nets pour aguicher, le reste est flouté tant que le pack n'est pas acheté.",
  },
];

const DEFAULT_PREVIEW =
  "https://res.cloudinary.com/demo/image/upload/w_640,h_360,c_fill/sample.jpg";

export function PackVisibilitySettings({
  packId,
  modelSlug,
  initialVisibility,
  previewImageUrl = DEFAULT_PREVIEW,
  authHeaders,
  onSaved,
}: Props) {
  const [visibility, setVisibility] = useState<PackVisibility>(
    initialVisibility ?? DEFAULT_VISIBILITY
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    if (initialVisibility) setVisibility(initialVisibility);
  }, [initialVisibility]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showBlurControls = visibility.rule === "preview_blur";

  const previewStyle = useMemo(
    () => (showBlurControls ? blurInlineStyle(visibility.blurIntensity) : {}),
    [showBlurControls, visibility.blurIntensity]
  );

  const update = <K extends keyof PackVisibility>(key: K, value: PackVisibility[K]) => {
    setVisibility((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(authHeaders ? authHeaders() : {}),
      };
      const res = await fetch(`/api/packs/${encodeURIComponent(packId)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          model: modelSlug,
          visibility_rule: visibility.rule,
          blur_intensity: visibility.blurIntensity,
          preview_count: visibility.previewCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erreur serveur");
      }
      setDirty(false);
      setToast({ kind: "ok", msg: "Règles de visibilité enregistrées" });
      onSaved?.(data.visibility ?? visibility);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur réseau";
      setToast({ kind: "err", msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Règles de visibilité</h3>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {/* Rule selector */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {RULE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = visibility.rule === opt.value;
          return (
            <label
              key={opt.value}
              title={opt.tooltip}
              className={`group relative cursor-pointer rounded-md border px-3 py-2 text-xs transition ${
                active
                  ? "border-emerald-500 bg-emerald-500/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white"
              }`}
            >
              <input
                type="radio"
                name={`visibility-${packId}`}
                value={opt.value}
                checked={active}
                onChange={() => update("rule", opt.value)}
                className="sr-only"
              />
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{opt.label}</span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-white/50">{opt.tooltip}</p>
            </label>
          );
        })}
      </div>

      {/* Blur controls (conditionally rendered) */}
      {showBlurControls && (
        <div className="space-y-4 rounded-md bg-white/5 p-3">
          <div>
            <label
              htmlFor={`blur-intensity-${packId}`}
              className="mb-1 flex items-center justify-between text-xs text-white/80"
            >
              <span>Intensité du flou</span>
              <span className="tabular-nums text-white/60">{visibility.blurIntensity}px</span>
            </label>
            <input
              id={`blur-intensity-${packId}`}
              type="range"
              min={0}
              max={20}
              step={1}
              value={visibility.blurIntensity}
              onChange={(e) => update("blurIntensity", Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor={`preview-count-${packId}`}
              className="mb-1 block text-xs text-white/80"
            >
              Nombre d'items nets (avant paywall)
            </label>
            <input
              id={`preview-count-${packId}`}
              type="number"
              min={0}
              max={10}
              value={visibility.previewCount}
              onChange={(e) => {
                const n = Math.max(0, Math.min(10, Math.floor(Number(e.target.value) || 0)));
                update("previewCount", n);
              }}
              className="w-24 rounded border border-white/10 bg-black/50 px-2 py-1 text-sm text-white"
            />
            <p className="mt-1 text-[10px] text-white/40">
              0 = tout flouté pour non-acheteurs. Maximum recommandé : 10.
            </p>
          </div>

          {/* Live preview */}
          <div>
            <p className="mb-1 text-xs text-white/80">Aperçu de l'effet flou</p>
            <div className="relative overflow-hidden rounded-md border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImageUrl}
                alt="Aperçu du flou"
                style={previewStyle}
                className="h-40 w-full object-cover transition-[filter] duration-200"
              />
              {visibility.blurIntensity > 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="rounded bg-black/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white">
                    Paywall — acheter pour voir
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
            toast.kind === "ok"
              ? "bg-emerald-500/15 text-emerald-200"
              : "bg-rose-500/15 text-rose-200"
          }`}
          role="status"
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          <span>{toast.msg}</span>
          {!dirty && toast.kind === "ok" && (
            <EyeOff className="ml-auto h-3 w-3 opacity-40" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}

export default PackVisibilitySettings;

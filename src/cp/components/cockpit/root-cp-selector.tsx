"use client";

/**
 * RootCpSelector
 * ──────────────
 * Sélecteur de CP visible UNIQUEMENT pour le compte root (dev SQWENSY).
 * Permet à root de basculer entre les vues CP des différents modèles (m1/m2/m3).
 *
 * Règle NB : « quand je suis en compte root je peux choisir dans le header
 * le cp de qui je veux qu'il s'affiche — chose que ne peuvent pas les
 * autres comptes » (2026-04-21).
 *
 * - Ne s'affiche PAS pour yumi (agence admin) — elle a son scope fixe.
 * - Ne s'affiche PAS pour paloma/ruby — elles voient uniquement leur propre CP.
 * - S'affiche pour root seul qui peut impersonner n'importe quel modèle pour debug.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { useModel } from "@/lib/model-context";

export function RootCpSelector() {
  const { auth, models, currentModel, setCurrentModel, ready } = useModel();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Root-only gating — absolutely hidden for other accounts
  if (!ready) return null;
  if (auth?.role !== "root") return null;
  // Root dev sans model_id => non-agence root. Root-fusion yumi (model_id=m1) = agence.
  // Ici on affiche pour les deux : root pur ET root-fusion peuvent switch.
  // Le modèle sélectionné par défaut est currentModel ou model_slug ("yumi" pour fusion).

  if (!models || models.length === 0) return null;

  const active = models.find(m => m.slug === currentModel) || models[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(220,38,38,0.12), rgba(232,67,147,0.08))",
          border: "1px solid rgba(220,38,38,0.35)",
          color: "var(--text)",
        }}
        aria-label="Sélectionner le CP à afficher (mode root)"
      >
        <Eye className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
        <span className="hidden sm:inline uppercase tracking-wider text-[10px] font-bold" style={{ color: "#DC2626" }}>
          Root view
        </span>
        <span className="font-semibold">{active.display_name}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 min-w-[180px] rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
          }}
        >
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border2)" }}>
            Basculer vers le CP de…
          </div>
          {models.map(m => (
            <button
              key={m.slug}
              type="button"
              onClick={() => { setCurrentModel(m.slug); setOpen(false); }}
              className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-white/5 transition-colors"
              style={{
                background: m.slug === currentModel ? "rgba(232,67,147,0.1)" : "transparent",
                color: "var(--text)",
                borderLeft: m.slug === currentModel ? "2px solid #E84393" : "2px solid transparent",
              }}
            >
              <span className="font-medium">{m.display_name}</span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

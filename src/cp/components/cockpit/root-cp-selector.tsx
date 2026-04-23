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

interface RootCpSelectorProps {
  /**
   * - "badge" (défaut) : bouton pill rouge/ambre "Root view X" (legacy)
   * - "inline" : bouton minimal intégré au breadcrumb — remplace le pseudo du CP
   *   avec juste le display_name + chevron discret (NB 2026-04-21)
   */
  variant?: "badge" | "inline";
  /** Fallback label quand pas de selection (mode inline) */
  fallbackLabel?: string;
}

export function RootCpSelector({ variant = "badge", fallbackLabel = "HEAVEN" }: RootCpSelectorProps = {}) {
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

  // Pas de fallback : active peut être null si root n'a pas encore choisi.
  const active = currentModel ? models.find(m => m.slug === currentModel) ?? null : null;

  // Variant "inline" : rendu discret qui remplace le pseudo du CP dans le breadcrumb
  // (NB 2026-04-21 : « le cp selector doit tranformer le pseado du cp en bouton
  //  selector tout simplement sinon les 2 se chevauchent »).
  const triggerLabel = active?.display_name || fallbackLabel;
  const isInline = variant === "inline";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={isInline
          ? "inline-flex items-center gap-1 text-xs font-bold truncate cursor-pointer bg-transparent border-none px-0 py-0"
          : "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"}
        style={isInline ? {
          color: active ? "var(--text)" : "#F59E0B",
        } : {
          background: active
            ? "linear-gradient(135deg, rgba(220,38,38,0.12), rgba(232,67,147,0.08))"
            : "rgba(245,158,11,0.1)",
          border: active ? "1px solid rgba(220,38,38,0.35)" : "1px solid rgba(245,158,11,0.4)",
          color: "var(--text)",
        }}
        aria-label="Sélectionner le CP à afficher (mode root)"
        title={isInline ? "Basculer vers un autre CP (root)" : undefined}
      >
        {!isInline && (
          <>
            <Eye className="w-3.5 h-3.5" style={{ color: active ? "#DC2626" : "#F59E0B" }} />
            <span className="hidden sm:inline uppercase tracking-wider text-[10px] font-bold" style={{ color: active ? "#DC2626" : "#F59E0B" }}>
              Root view
            </span>
          </>
        )}
        <span className={isInline ? "truncate" : "font-semibold"}>{triggerLabel}</span>
        <ChevronDown className={isInline ? "w-3 h-3 opacity-60" : "w-3.5 h-3.5"} />
      </button>

      {open && (
        <div
          className={isInline
            ? "absolute top-full left-0 mt-1 min-w-[200px] rounded-lg shadow-lg z-50 overflow-hidden"
            : "absolute top-full right-0 mt-1 min-w-[200px] rounded-lg shadow-lg z-50 overflow-hidden"}
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
          }}
        >
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border2)" }}>
            Basculer vers le CP de…
          </div>
          {/* Option "Aucun CP" (skeleton vide — compte root brut) */}
          <button
            type="button"
            onClick={() => { setCurrentModel(null); setOpen(false); }}
            className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-white/5 transition-colors"
            style={{
              background: !currentModel ? "rgba(245,158,11,0.08)" : "transparent",
              color: "var(--text-muted)",
              borderLeft: !currentModel ? "2px solid #F59E0B" : "2px solid transparent",
              borderBottom: "1px solid var(--border2)",
            }}
          >
            <span className="font-medium">Aucun CP (root brut)</span>
            <span className="text-[10px] italic">vide</span>
          </button>
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

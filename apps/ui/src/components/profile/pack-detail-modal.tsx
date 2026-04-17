"use client";

import { X, Check } from "lucide-react";
import type { PackConfig } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

interface PackDetailModalProps {
  pack: PackConfig;
  onClose: () => void;
}

export function PackDetailModal({ pack, onClose }: PackDetailModalProps) {
  const hex = TIER_HEX[pack.id] || pack.color;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
        </div>

        {/* Pack hero */}
        <div className="p-6 text-center" style={{ background: `color-mix(in srgb, ${hex} 8%, var(--bg2))` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
            style={{ background: `color-mix(in srgb, ${hex} 15%, transparent)`, border: `2px solid color-mix(in srgb, ${hex} 35%, transparent)` }}>
            {TIER_META[pack.id]?.symbol}
          </div>
          <h3 className="text-lg font-bold mb-0.5" style={{ color: "var(--text)" }}>{pack.name}</h3>
          <p className="text-2xl font-black tabular-nums" style={{ color: hex }}>{pack.price}€</p>
        </div>

        <div className="px-6 pb-6">
          <ul className="space-y-2.5 mb-5 pt-4">
            {pack.features.map((f, j) => (
              <li key={j} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
                <Check className="w-4 h-4 shrink-0" style={{ color: hex }} />
                {f}
              </li>
            ))}
          </ul>

          {(pack.stripe_link || pack.wise_url) ? (
            <>
              <a href={pack.stripe_link || pack.wise_url} target="_blank" rel="noopener noreferrer"
                className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 no-underline"
                style={{ background: hex, color: "#fff" }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                Payer {pack.price}€
              </a>
              <p className="text-[10px] text-center mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Paiement securise. L&apos;acces est active sous 15 min apres confirmation.
              </p>
            </>
          ) : (
            <>
              <div className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 opacity-50"
                style={{ background: `${hex}15`, color: hex, border: `1px solid ${hex}20` }}>
                Paiement bientot disponible
              </div>
              <p className="text-[10px] text-center mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Le lien de paiement sera active prochainement.
              </p>
            </>
          )}
          <button onClick={onClose}
            className="w-full py-2 mt-2 rounded-xl text-xs font-medium cursor-pointer"
            style={{ color: "var(--text-muted)" }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

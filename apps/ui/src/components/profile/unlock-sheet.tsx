"use client";

import { X, Check, ChevronRight, Key } from "lucide-react";
import type { PackConfig, ModelInfo } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

interface UnlockSheetProps {
  show: boolean;
  onClose: () => void;
  packs: PackConfig[];
  model: ModelInfo;
  focusPack: string | null;
  setFocusPack: (id: string | null) => void;
  slug: string;
  modelId: string;
  onCodeValidated: (code: { tier: string; expiresAt: string; code: string; id?: string }) => void;
  onCheckoutPack: (pack: PackConfig) => void;
}

export function UnlockSheet({ show, onClose, packs, model, focusPack, setFocusPack, slug, modelId, onCodeValidated, onCheckoutPack }: UnlockSheetProps) {
  if (!show) return null;

  const activePacks = packs.filter(p => p.active);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: "var(--surface)", maxHeight: "85vh", border: "1px solid var(--border2)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border3)" }} />
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Choisis ton acces</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>
        <div className="px-6 pb-6 space-y-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          {/* CODE INPUT */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
              Tu as un code ?
            </label>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
              const code = input?.value?.trim();
              if (!code) return;
              try {
                const res = await fetch("/api/codes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "validate", code, model: modelId }),
                });
                const data = await res.json();
                if (data.code?.tier) {
                  onCodeValidated(data.code);
                  onClose();
                } else {
                  input.style.borderColor = "#EF4444";
                  input.placeholder = data.error || "Code invalide";
                  input.value = "";
                }
              } catch { input.placeholder = "Erreur — reessaye"; input.value = ""; }
            }} className="flex gap-2">
              <input type="text" placeholder="ABC-2026-XXXX"
                className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono uppercase tracking-wider outline-none text-center"
                style={{ background: "var(--bg3)", color: "var(--text)", border: "1px solid var(--border2)" }}
              />
              <button type="submit"
                className="px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:scale-105 transition-transform"
                style={{ background: "var(--accent)", color: "#fff" }}>
                Valider
              </button>
            </form>
          </div>

          <div className="text-center">
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>ou achete un pack</span>
          </div>

          {/* Packs list */}
          {(() => {
            const sorted = focusPack
              ? [...activePacks].sort((a, b) => (a.id === focusPack ? -1 : b.id === focusPack ? 1 : 0))
              : activePacks;
            return sorted.map(pack => {
              const hex = TIER_HEX[pack.id] || pack.color;
              const isFocused = focusPack === pack.id;
              const paypalHandle2 = model?.paypal_handle || "aaclaraa";
              const paypalUrl2 = `https://www.paypal.com/paypalme/${paypalHandle2}/${pack.price}`;

              // Collapsed
              if (!isFocused && focusPack) {
                return (
                  <button key={pack.id} onClick={() => setFocusPack(pack.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                    style={{ background: "var(--bg3)", border: `1.5px solid color-mix(in srgb, ${hex} 30%, transparent)` }}>
                    <span className="text-lg">{TIER_META[pack.id]?.symbol}</span>
                    <span className="text-sm font-bold flex-1 text-left" style={{ color: "var(--text)" }}>{pack.name}</span>
                    <span className="text-sm font-black tabular-nums" style={{ color: hex }}>{pack.price}&euro;</span>
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  </button>
                );
              }

              // Expanded
              return (
                <div key={pack.id} className="w-full rounded-xl overflow-hidden transition-all"
                  style={{ background: "var(--bg3)", border: `2px solid color-mix(in srgb, ${hex} ${isFocused ? "50%" : "25%"}, transparent)`, boxShadow: isFocused ? `0 4px 24px color-mix(in srgb, ${hex} 20%, transparent)` : "none" }}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{TIER_META[pack.id]?.symbol}</span>
                        <div>
                          <span className="text-base font-bold block" style={{ color: "var(--text)" }}>{pack.name}</span>
                          {pack.badge && <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{pack.badge}</span>}
                        </div>
                      </div>
                      <span className="text-2xl font-black tabular-nums" style={{ color: hex }}>{pack.price}&euro;</span>
                    </div>
                    <div className="mb-4 space-y-1.5">
                      {pack.features.map((f: string, j: number) => (
                        <p key={j} className="text-xs flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} /> {f}
                        </p>
                      ))}
                    </div>
                    {/* Payment buttons */}
                    <div className="space-y-2">
                      <button onClick={() => onCheckoutPack(pack)}
                        className="block w-full py-3 rounded-xl text-sm font-bold text-center cursor-pointer transition-all hover:scale-[1.02] hover:brightness-110"
                        style={{ background: hex, color: "#fff", boxShadow: `0 4px 16px color-mix(in srgb, ${hex} 35%, transparent)` }}>
                        &#x1F4B3; Payer {pack.price}&euro;
                      </button>
                      <div className={`grid gap-2 ${pack.wise_url && pack.revolut_url ? "grid-cols-3" : pack.wise_url || pack.revolut_url ? "grid-cols-2" : "grid-cols-1"}`}>
                        {pack.revolut_url && (
                          <a href={pack.revolut_url} target="_blank" rel="noopener noreferrer"
                            className="py-2.5 rounded-xl text-xs font-bold text-center no-underline transition-all hover:scale-[1.02]"
                            style={{ background: "#191C32", color: "#8B9DFE", border: "1.5px solid #2D3258" }}>
                            Revolut
                          </a>
                        )}
                        <a href={paypalUrl2} target="_blank" rel="noopener noreferrer"
                          className={`py-2.5 rounded-xl text-xs font-bold text-center no-underline transition-all hover:scale-[1.02] ${!pack.wise_url && !pack.revolut_url ? "col-span-1" : ""}`}
                          style={{ background: "#1A1D33", color: "#69A3F7", border: "1.5px solid #253056" }}>
                          PayPal
                        </a>
                        {pack.wise_url && (
                          <a href={pack.wise_url} target="_blank" rel="noopener noreferrer"
                            className="py-2.5 rounded-xl text-xs font-bold text-center no-underline transition-all hover:scale-[1.02]"
                            style={{ background: "#1A2E1A", color: "#76D672", border: "1.5px solid #2A4D2A" }}>
                            Wise
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

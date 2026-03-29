"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Coins, ShoppingBag, Check, Crown, ChevronRight,
  Plus, X, Trash2, ToggleLeft, ToggleRight,
  Camera, Play,
} from "lucide-react";
import type { PackConfig, UploadedContent } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

// ── Token pricing by tier ──
const TOKEN_PRICING = [
  { tier: "VIP", symbol: "♥", color: "#E63329", photo: 10, videoPerMin: 20 },
  { tier: "Gold", symbol: "★", color: "#9E7C1F", photo: 20, videoPerMin: 40 },
  { tier: "Diamond", symbol: "♦", color: "#4F46E5", photo: 30, videoPerMin: 60 },
  { tier: "Platinum", symbol: "♛", color: "#7C3AED", photo: 40, videoPerMin: 80 },
];

// ── Credit recharge packs ──
const CREDIT_PACKS = [
  { credits: 10, price: 10 },
  { credits: 25, price: 25 },
  { credits: 50, price: 45 },
  { credits: 100, price: 80 },
];

// ── Tier bonus config ──
const TIER_CREDIT_BONUS: Record<string, { multiplier: number; label: string; bonus?: string }> = {
  platinum: { multiplier: 3, label: "x3", bonus: "Triple crédits sur chaque recharge" },
  diamond: { multiplier: 2, label: "x2", bonus: "Double crédits sur chaque recharge" },
  gold: { multiplier: 1, label: "", bonus: "1 Nude dédicacé offert à réclamer" },
  vip: { multiplier: 1, label: "", bonus: undefined },
};

interface ShopTabProps {
  clientId: string | null;
  unlockedTier: string | null;
  isEditMode: boolean;
  packs: PackConfig[];
  activePacks: PackConfig[];
  displayPacks: PackConfig[];
  expandedPack: string | null;
  setExpandedPack: (v: string | null) => void;
  shopSection: "packs" | "credits";
  setShopSection: (v: "packs" | "credits") => void;
  clientBalance: number;
  topupLoading: boolean;
  handleTopup: (credits: number, price: number) => void;
  setChatOpen: (v: boolean) => void;
  handleUpdatePack: (packId: string, updates: Partial<PackConfig>) => void;
  handleDeletePack: (packId: string) => void;
  handleAddPack: () => void;
  visitorHandle?: string;
}

function paypalUrl(amount: number): string {
  return `https://www.paypal.com/paypalme/aaclaraa/${amount}`;
}

export function ShopTab({
  clientId, unlockedTier, isEditMode, activePacks, displayPacks,
  expandedPack, setExpandedPack, shopSection, setShopSection,
  clientBalance, topupLoading, handleTopup, setChatOpen,
  handleUpdatePack, handleDeletePack, handleAddPack, visitorHandle,
}: ShopTabProps) {
  const pseudo = visitorHandle || "anonyme";
  const [selTier, setSelTier] = useState("vip");
  const [selType, setSelType] = useState<"photo" | "video">("photo");
  const [videoMin, setVideoMin] = useState(1);
  return (
    <div className="space-y-4 fade-up">

      {/* Balance — compact cart badge */}
      {clientId && clientBalance > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full self-end" style={{ background: "rgba(0,0,0,0.05)", border: "1px solid var(--border)" }}>
          <Coins className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
          <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{clientBalance}€</span>
        </div>
      )}

      {/* Sub-tabs: Packs | Crédits */}
      <div className="flex gap-2">
        <button onClick={() => setShopSection("packs")}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5"
          style={{
            background: shopSection === "packs" ? "rgba(230,51,41,0.1)" : "rgba(255,255,255,0.03)",
            color: shopSection === "packs" ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${shopSection === "packs" ? "rgba(230,51,41,0.25)" : "var(--border2)"}`,
          }}>
          <ShoppingBag className="w-3.5 h-3.5" /> Packs
        </button>
        <button onClick={() => setShopSection("credits")}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5"
          style={{
            background: shopSection === "credits" ? "rgba(230,51,41,0.1)" : "rgba(255,255,255,0.03)",
            color: shopSection === "credits" ? "var(--gold)" : "var(--text-muted)",
            border: `1px solid ${shopSection === "credits" ? "rgba(230,51,41,0.25)" : "var(--border2)"}`,
          }}>
          <Camera className="w-3.5 h-3.5" /> Contenu
        </button>
      </div>

      {/* ──── PACKS SECTION — Scrollable tiles ──── */}
      {shopSection === "packs" && (
        <div>
          {(isEditMode ? displayPacks : activePacks).length === 0 ? (
            <EmptyState icon={ShoppingBag} text="No packs available" />
          ) : (
            <>
              {/* Horizontal scrollable tiles */}
              <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                {(isEditMode ? displayPacks : activePacks).map((pack, i) => {
                  const hex = TIER_HEX[pack.id] || pack.color;
                  const isSelected = expandedPack === pack.id;
                  const isCurrentTier = unlockedTier === pack.id;
                  return (
                    <button
                      key={pack.id}
                      onClick={() => setExpandedPack(isSelected ? null : pack.id)}
                      className="snap-center shrink-0 relative overflow-hidden rounded-2xl cursor-pointer group"
                      style={{
                        width: isSelected ? "180px" : "140px",
                        height: isSelected ? "200px" : "170px",
                        background: isSelected ? `linear-gradient(160deg, ${hex}25, ${hex}08)` : "var(--bg2)",
                        border: `${isSelected ? "2px" : "1px"} solid ${isSelected ? `${hex}50` : "var(--border2)"}`,
                        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        transform: isSelected ? "scale(1.05)" : "scale(1)",
                        boxShadow: isSelected ? `0 8px 32px ${hex}30, 0 0 0 1px ${hex}20` : "none",
                        animation: `slideUp 0.4s ease-out ${i * 0.08}s both`,
                      }}>
                      {/* Top glow line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                        background: `linear-gradient(90deg, transparent, ${hex}, transparent)`,
                        opacity: isSelected ? 1 : 0.3,
                        transition: "opacity 0.3s",
                      }} />

                      {/* Badge */}
                      {pack.badge && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: `${hex}20`, color: hex }}>
                          {pack.badge}
                        </div>
                      )}

                      {/* Active indicator */}
                      {isCurrentTier && (
                        <div className="absolute top-2 left-2 w-2 h-2 rounded-full" style={{ background: "var(--success)", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }} />
                      )}

                      {/* Content */}
                      <div className="flex flex-col items-center justify-center h-full px-3 py-4 text-center">
                        <div className="rounded-xl flex items-center justify-center mb-2"
                          style={{
                            width: isSelected ? "48px" : "40px",
                            height: isSelected ? "48px" : "40px",
                            fontSize: isSelected ? "24px" : "20px",
                            background: `${hex}15`,
                            border: `1px solid ${hex}30`,
                            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          }}>
                          {TIER_META[pack.id]?.symbol}
                        </div>
                        <h3 className="font-bold truncate w-full" style={{
                          color: hex,
                          fontSize: isSelected ? "14px" : "12px",
                          transition: "font-size 0.3s",
                        }}>{pack.name}</h3>
                        <p className="font-black tabular-nums mt-1" style={{
                          color: hex,
                          fontSize: isSelected ? "24px" : "18px",
                          transition: "font-size 0.3s ease",
                        }}>{pack.price}€</p>
                        {isCurrentTier && (
                          <span className="text-[10px] font-bold uppercase mt-0.5" style={{ color: "var(--success)" }}>Actif</span>
                        )}
                        {!isCurrentTier && isSelected && (
                          <span className="text-[10px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>Voir details ↓</span>
                        )}
                      </div>

                      {/* Bottom pulse on hover */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100" style={{
                        background: `linear-gradient(90deg, transparent, ${hex}, transparent)`,
                        transition: "opacity 0.3s",
                      }} />
                    </button>
                  );
                })}
              </div>

              {/* Expanded pack detail panel */}
              {expandedPack && !isEditMode && (() => {
                const pack = activePacks.find(p => p.id === expandedPack);
                if (!pack) return null;
                const hex = TIER_HEX[pack.id] || pack.color;
                const tierBonus = TIER_CREDIT_BONUS[pack.id];
                const isCurrentTier = unlockedTier === pack.id;
                return (
                  <div className="mt-3 rounded-2xl overflow-hidden relative" style={{
                    background: "var(--bg2)",
                    border: `1px solid ${hex}30`,
                    animation: "slideUp 0.35s ease-out",
                  }}>
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${hex}, transparent)` }} />

                    <div className="p-5">
                      {/* Header recap */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ background: `${hex}12`, border: `1px solid ${hex}25` }}>
                          {TIER_META[pack.id]?.symbol}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold" style={{ color: hex }}>{pack.name}</h3>
                          {pack.badge && <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{pack.badge}</span>}
                        </div>
                        <span className="text-2xl font-black tabular-nums" style={{ color: hex }}>{pack.price}€</span>
                      </div>

                      {/* Features — staggered */}
                      <ul className="space-y-2 mb-4">
                        {pack.features.map((f, j) => (
                          <li key={j} className="flex items-center gap-2.5 text-[12px]"
                            style={{ color: "var(--text-secondary)", animation: `slideUp 0.3s ease-out ${j * 0.04}s both` }}>
                            <Check className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* Bonus */}
                      {tierBonus && (tierBonus.multiplier > 1 || tierBonus.bonus) && (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl mb-4"
                          style={{ background: `${hex}08`, border: `1px dashed ${hex}20` }}>
                          <Crown className="w-4 h-4 shrink-0" style={{ color: hex }} />
                          <p className="text-[11px] font-semibold" style={{ color: hex }}>
                            {tierBonus.multiplier > 1 ? `Bonus ${tierBonus.label} — ${tierBonus.bonus}` : `🎁 ${tierBonus.bonus}`}
                          </p>
                        </div>
                      )}

                      {/* CTA */}
                      {isCurrentTier ? (
                        <div className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                          style={{ background: `${hex}10`, color: hex, border: `1px solid ${hex}20` }}>
                          <Check className="w-4 h-4" /> Pack actif
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-center mb-2" style={{ color: "var(--text-muted)" }}>
                            {pack.price}€ — choisir paiement :
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {pack.wise_url && (
                              <a href={pack.wise_url} target="_blank" rel="noopener noreferrer"
                                className="py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 no-underline transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: "#00B4D8", color: "#fff" }}>
                                Revolut · {pack.price}€
                              </a>
                            )}
                            <a href={pack.stripe_link || paypalUrl(pack.price)} target="_blank" rel="noopener noreferrer"
                              className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 no-underline transition-all hover:scale-[1.02] active:scale-[0.98] ${!pack.wise_url ? "col-span-2" : ""}`}
                              style={{ background: "#003087", color: "#fff" }}>
                              PayPal · {pack.price}€
                            </a>
                          </div>
                          <p className="text-[9px] text-center mt-1" style={{ color: "var(--accent)" }}>
                            Ajoute <b>@{pseudo}</b> en note PayPal
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Edit mode: full cards */}
              {isEditMode && (
                <div className="space-y-3 mt-3">
                  {displayPacks.map((pack) => {
                    const hex = TIER_HEX[pack.id] || pack.color;
                    const tierBonus = TIER_CREDIT_BONUS[pack.id];
                    return (
                      <div key={pack.id} className="card-premium relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${hex}, transparent)`, opacity: 0.5 }} />
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                style={{ background: `${hex}12`, border: `1px solid ${hex}25` }}>
                                {TIER_META[pack.id]?.symbol}
                              </div>
                              <div>
                                <input value={pack.name} onChange={e => handleUpdatePack(pack.id, { name: e.target.value })}
                                  className="text-sm font-bold bg-transparent outline-none w-full rounded px-1"
                                  style={{ color: hex, border: "1px dashed var(--border3)" }} />
                                {pack.badge && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{pack.badge}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <input value={pack.price} onChange={e => handleUpdatePack(pack.id, { price: Number(e.target.value) || 0 })}
                                  type="number" className="w-16 text-right text-xl font-black tabular-nums bg-transparent outline-none rounded px-1"
                                  style={{ color: hex, border: "1px dashed var(--border3)" }} />
                                <span className="text-xl font-black" style={{ color: hex }}>€</span>
                              </div>
                              <button onClick={() => handleDeletePack(pack.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                style={{ background: "rgba(239,68,68,0.1)" }}>
                                <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
                              </button>
                            </div>
                          </div>

                          {/* Features */}
                          <div className="space-y-1.5 mb-3">
                            {pack.features.map((f, j) => (
                              <div key={j} className="flex items-center gap-2">
                                <Check className="w-3 h-3 shrink-0" style={{ color: hex }} />
                                <input value={f} onChange={e => {
                                  const newFeatures = [...pack.features];
                                  newFeatures[j] = e.target.value;
                                  handleUpdatePack(pack.id, { features: newFeatures });
                                }}
                                  className="flex-1 text-[11px] bg-transparent outline-none rounded px-1 py-0.5"
                                  style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }} />
                                <button onClick={() => {
                                  const newFeatures = pack.features.filter((_, idx) => idx !== j);
                                  handleUpdatePack(pack.id, { features: newFeatures });
                                }}
                                  className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button onClick={() => handleUpdatePack(pack.id, { features: [...pack.features, ""] })}
                              className="flex items-center gap-1 text-[10px] cursor-pointer"
                              style={{ color: "var(--text-muted)" }}>
                              <Plus className="w-3 h-3" /> Ajouter
                            </button>
                          </div>

                          {/* Bonus */}
                          {tierBonus && (tierBonus.multiplier > 1 || tierBonus.bonus) && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3"
                              style={{ background: `${hex}08`, border: `1px dashed ${hex}20` }}>
                              <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} />
                              <p className="text-[10px] font-semibold" style={{ color: hex }}>
                                {tierBonus.multiplier > 1 ? `Bonus ${tierBonus.label} — ${tierBonus.bonus}` : `🎁 ${tierBonus.bonus}`}
                              </p>
                            </div>
                          )}

                          {/* Payment links + Toggle */}
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                                Lien Stripe (paiement via SQWENSY)
                              </label>
                              <input
                                value={pack.stripe_link || ""}
                                onChange={e => handleUpdatePack(pack.id, { stripe_link: e.target.value })}
                                placeholder="https://sqwensy.com/p/..."
                                className="w-full text-[11px] bg-transparent outline-none rounded-lg px-3 py-2"
                                style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                                Lien Wise (alternatif)
                              </label>
                              <input
                                value={pack.wise_url || ""}
                                onChange={e => handleUpdatePack(pack.id, { wise_url: e.target.value })}
                                placeholder="https://wise.com/pay/..."
                                className="w-full text-[11px] bg-transparent outline-none rounded-lg px-3 py-2"
                                style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }}
                              />
                            </div>
                            <button onClick={() => handleUpdatePack(pack.id, { active: !pack.active })}
                              className="flex items-center gap-1.5 cursor-pointer"
                              style={{ color: pack.active ? "var(--success)" : "var(--text-muted)" }}>
                              {pack.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                              <span className="text-[10px] font-medium">{pack.active ? "Actif" : "Inactif"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Pack button (edit mode) */}
              {isEditMode && (
                <button onClick={handleAddPack}
                  className="w-full mt-3 py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ border: "2px dashed var(--border3)", background: "rgba(255,255,255,0.02)" }}>
                  <Plus className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Ajouter un pack</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ──── CONTENU PERSONNALISE ──── */}
      {shopSection === "credits" && (() => {
        const tier = TOKEN_PRICING.find(t => t.tier.toLowerCase() === selTier) || TOKEN_PRICING[0];
        const price = selType === "photo" ? tier.photo : tier.videoPerMin * videoMin;

        return (
          <div className="space-y-4">
            {/* Step 1: Tier */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Niveau</p>
              <div className="flex gap-2">
                {TOKEN_PRICING.map(t => (
                  <button key={t.tier} onClick={() => setSelTier(t.tier.toLowerCase())}
                    className="flex-1 py-2.5 rounded-xl text-center cursor-pointer transition-all"
                    style={{
                      background: selTier === t.tier.toLowerCase() ? `${t.color}15` : "rgba(0,0,0,0.03)",
                      border: `2px solid ${selTier === t.tier.toLowerCase() ? t.color : "transparent"}`,
                      color: selTier === t.tier.toLowerCase() ? t.color : "var(--text-muted)",
                    }}>
                    <span className="text-lg block">{t.symbol}</span>
                    <span className="text-[9px] font-bold">{t.tier}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Photo or Video */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Type</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelType("photo")}
                  className="py-3 rounded-xl text-center cursor-pointer transition-all"
                  style={{
                    background: selType === "photo" ? `${tier.color}15` : "rgba(0,0,0,0.03)",
                    border: `2px solid ${selType === "photo" ? tier.color : "transparent"}`,
                    color: selType === "photo" ? tier.color : "var(--text-muted)",
                  }}>
                  <Camera className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-bold">Photo</span>
                </button>
                <button onClick={() => setSelType("video")}
                  className="py-3 rounded-xl text-center cursor-pointer transition-all"
                  style={{
                    background: selType === "video" ? `${tier.color}15` : "rgba(0,0,0,0.03)",
                    border: `2px solid ${selType === "video" ? tier.color : "transparent"}`,
                    color: selType === "video" ? tier.color : "var(--text-muted)",
                  }}>
                  <Play className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-bold">Video</span>
                </button>
              </div>
            </div>

            {/* Step 3: Duration (video only) */}
            {selType === "video" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Duree</p>
                  <span className="text-sm font-bold" style={{ color: tier.color }}>{videoMin} min</span>
                </div>
                <input type="range" min={1} max={10} value={videoMin} onChange={e => setVideoMin(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${tier.color} ${(videoMin / 10) * 100}%, var(--border) ${(videoMin / 10) * 100}%)` }} />
                <div className="flex justify-between text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                  <span>1 min</span><span>5 min</span><span>10 min</span>
                </div>
              </div>
            )}

            {/* Price + Pay */}
            <div className="rounded-xl p-4 text-center" style={{ background: `${tier.color}08`, border: `1px solid ${tier.color}20` }}>
              <p className="text-3xl font-black mb-1" style={{ color: tier.color }}>{price}€</p>
              <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>
                {selType === "photo" ? "1 photo" : `${videoMin} min de video`} {tier.tier}
              </p>
              <a href={paypalUrl(price)} target="_blank" rel="noopener noreferrer"
                className="block w-full py-3 rounded-xl text-sm font-bold no-underline cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#003087", color: "#fff" }}>
                Payer {price}€ via PayPal
              </a>
              <p className="text-[9px] mt-2" style={{ color: "var(--accent)" }}>
                Ajoute <b>@{pseudo}</b> en note PayPal
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{text}</p>
    </div>
  );
}

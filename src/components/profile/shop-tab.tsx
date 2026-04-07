"use client";

import { useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ShoppingBag, Check, ChevronRight,
  Plus, X, Trash2, ToggleLeft, ToggleRight,
  Camera, Play, Minus, ShoppingCart, Send,
} from "lucide-react";
import type { PackConfig, UploadedContent } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

// ── Custom content pricing by tier (euros) ──
const CONTENT_PRICING = [
  { tier: "VIP", symbol: "♥", color: "#E63329", photo: 10, videoPerMin: 20,
    desc: "Photo ou vidéo personnalisée sur demande — niveau suggestif" },
  { tier: "Gold", symbol: "★", color: "#9E7C1F", photo: 20, videoPerMin: 40,
    desc: "Contenu custom plus poussé — semi-explicite, poses sur mesure" },
  { tier: "Diamond", symbol: "♦", color: "#4F46E5", photo: 30, videoPerMin: 60,
    desc: "Contenu explicite personnalisé — nude artistique, sur demande" },
  { tier: "Platinum", symbol: "♛", color: "#7C3AED", photo: 40, videoPerMin: 80,
    desc: "Sans limites — contenu premium custom selon tes envies" },
];

// No subscription here — packs handle that. This is à la carte custom content only.

// Cart item type
interface CartItem {
  id: string;
  tier: string;
  type: "photo" | "video";
  videoMin?: number;
  qty: number;
  unitPrice: number;
}


interface ShopTabProps {
  clientId: string | null;
  unlockedTier: string | null;
  isEditMode: boolean;
  packs: PackConfig[];
  activePacks: PackConfig[];
  displayPacks: PackConfig[];
  expandedPack: string | null;
  setExpandedPack: (v: string | null) => void;
  focusPack?: string | null;
  setFocusPack?: (v: string | null) => void;
  shopSection: "packs" | "credits";
  setShopSection: (v: "packs" | "credits") => void;
  setChatOpen: (v: boolean) => void;
  handleUpdatePack: (packId: string, updates: Partial<PackConfig>) => void;
  handleDeletePack: (packId: string) => void;
  handleAddPack: () => void;
  visitorHandle?: string;
  model?: string;
  authHeaders?: () => Record<string, string>;
  paypalHandle?: string | null;
}

function paypalUrl(amount: number, paypalHandle?: string | null): string {
  return `https://www.paypal.com/paypalme/${paypalHandle || "aaclaraa"}/${amount}EUR`;
}

// Create pending purchase before redirecting to PayPal
async function createPendingPurchase(model: string, pseudo: string, item: string, amount: number, authHeaders: () => Record<string, string>, paypalHandle?: string | null) {
  try {
    await fetch("/api/wall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, pseudo: "SYSTEM", content: `⏳ @${pseudo} souhaite acheter: ${item} (${amount}€) — en attente de validation` }),
    });
  } catch {}
  window.open(paypalUrl(amount, paypalHandle), "_blank");
}

export function ShopTab({
  clientId, unlockedTier, isEditMode, activePacks, displayPacks,
  expandedPack, setExpandedPack, focusPack, setFocusPack,
  shopSection, setShopSection,
  setChatOpen,
  handleUpdatePack, handleDeletePack, handleAddPack, visitorHandle, model: modelSlug, authHeaders: getAuthHeaders,
  paypalHandle,
}: ShopTabProps) {
  const pseudo = visitorHandle || "anonyme";
  const [selTier, setSelTier] = useState("vip");
  const [selType, setSelType] = useState<"photo" | "video">("photo");
  const [videoMin, setVideoMin] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Detect delivery platform from visitor handle
  const deliveryPlatform = useMemo(() => {
    if (!visitorHandle) return null;
    if (visitorHandle.startsWith("@")) return "instagram";
    return "snapchat";
  }, [visitorHandle]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0), [cart]);

  const addToCart = (tier: string, type: "photo" | "video", vidMin?: number) => {
    const pricing = CONTENT_PRICING.find(t => t.tier.toLowerCase() === tier);
    if (!pricing) return;
    const unitPrice = type === "photo" ? pricing.photo : pricing.videoPerMin * (vidMin || 1);
    const itemId = `${tier}-${type}${type === "video" ? `-${vidMin}min` : ""}`;
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId);
      if (existing) return prev.map(c => c.id === itemId ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: itemId, tier, type, videoMin: vidMin, qty: 1, unitPrice }];
    });
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeFromCart = (itemId: string) => setCart(prev => prev.filter(c => c.id !== itemId));
  return (
    <div className="space-y-4 fade-up">

      {/* Balance badge removed — direct euro pricing */}
      {false && (
        <div />
      )}

      {/* Sub-tabs: Packs | Contenu — underline style */}
      <div className="flex gap-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => setShopSection("packs")}
          className="relative flex-1 py-3 text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 uppercase"
          style={{
            color: shopSection === "packs" ? "var(--accent)" : "var(--text-muted)",
            letterSpacing: "0.06em",
          }}>
          Packs
          {shopSection === "packs" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />}
        </button>
        <button onClick={() => setShopSection("credits")}
          className="relative flex-1 py-3 text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 uppercase"
          style={{
            color: shopSection === "credits" ? "var(--gold)" : "var(--text-muted)",
            letterSpacing: "0.06em",
          }}>
          Contenu
          {shopSection === "credits" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: "var(--gold)" }} />}
        </button>
      </div>

      {/* ──── PACKS SECTION ──── */}
      {shopSection === "packs" && (
        <div>
          {(isEditMode ? displayPacks : activePacks).length === 0 ? (
            <EmptyState icon={ShoppingBag} text="No packs available" />
          ) : (
            <>
              {/* "Voir tous les packs" button when focused on single pack */}
              {focusPack && !isEditMode && (
                <button onClick={() => { setFocusPack?.(null); setExpandedPack(null); }}
                  className="flex items-center gap-1.5 mb-4 text-[11px] font-medium cursor-pointer transition-all hover:opacity-80"
                  style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                  ← Voir tous les packs
                </button>
              )}

              {/* Pack cards — show only focused pack or all */}
              <div className={`grid gap-3 sm:gap-4 ${focusPack && !isEditMode ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
                {(isEditMode ? displayPacks : focusPack ? activePacks.filter(p => p.id === focusPack) : activePacks).map((pack, i) => {
                  const hex = TIER_HEX[pack.id] || pack.color;
                  const isSelected = expandedPack === pack.id;
                  const isCurrentTier = unlockedTier === pack.id;
                  const isFocused = focusPack === pack.id;
                  return (
                    <button
                      key={pack.id}
                      onClick={() => setExpandedPack(isSelected ? null : pack.id)}
                      className="relative overflow-hidden rounded-2xl cursor-pointer group text-left"
                      style={{
                        aspectRatio: isFocused ? "16/9" : "3/4",
                        background: `linear-gradient(160deg, ${hex}12, ${hex}04)`,
                        border: `${isSelected ? "2px" : "1px"} solid ${isSelected ? `${hex}50` : "var(--border2)"}`,
                        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        transform: isSelected ? "scale(1.02)" : "scale(1)",
                        boxShadow: isSelected ? `0 8px 32px ${hex}20` : "var(--shadow-sm)",
                        animation: `slideUp 0.4s ease-out ${i * 0.06}s both`,
                      }}>
                      {/* Top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
                        background: `linear-gradient(90deg, transparent, ${hex}, transparent)`,
                        opacity: isSelected ? 1 : 0.4,
                      }} />

                      {/* Active indicator */}
                      {isCurrentTier && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase" style={{ background: "var(--success)", color: "#fff" }}>Actif</div>
                      )}

                      {/* Content */}
                      <div className="flex flex-col items-center justify-center h-full px-4 py-5 text-center">
                        <span className={`${isFocused ? "text-4xl" : "text-3xl sm:text-4xl"} mb-3`}>{TIER_META[pack.id]?.symbol}</span>
                        <h3 className={`${isFocused ? "text-xl" : "text-base sm:text-lg"} font-bold uppercase tracking-wide mb-1`} style={{ color: hex }}>{pack.name}</h3>
                        {pack.badge && (
                          <span className="text-[9px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>{pack.badge}</span>
                        )}
                        <p className={`${isFocused ? "text-3xl" : "text-2xl sm:text-3xl"} font-black tabular-nums`} style={{ color: hex }}>{pack.price}€</p>
                        {!isCurrentTier && (
                          <span className="text-[10px] font-medium mt-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            {isSelected ? "Details ci-dessous" : "Voir les details"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Expanded pack detail panel */}
              {expandedPack && !isEditMode && (() => {
                const pack = activePacks.find(p => p.id === expandedPack);
                if (!pack) return null;
                const hex = TIER_HEX[pack.id] || pack.color;
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

                      {/* CTA — premium full-width */}
                      {isCurrentTier ? (
                        <div className="w-full py-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                          style={{ background: `${hex}10`, color: hex, border: `1px solid ${hex}20` }}>
                          <Check className="w-4 h-4" /> Pack actif
                        </div>
                      ) : (() => {
                        const hasPaymentLinks = pack.wise_url || pack.revolut_url || pack.stripe_link;
                        return (
                        <div className="space-y-2.5">
                          {/* Primary CTA — first available payment link */}
                          {pack.stripe_link ? (
                            <a href={pack.stripe_link} target="_blank" rel="noopener noreferrer"
                              className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center no-underline transition-all hover:scale-[1.01] active:scale-[0.98]"
                              style={{ background: hex, color: "#fff", boxShadow: `0 4px 20px ${hex}30` }}>
                              Acheter {pack.price}€
                            </a>
                          ) : pack.wise_url ? (
                            <a href={pack.wise_url} target="_blank" rel="noopener noreferrer"
                              className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center no-underline transition-all hover:scale-[1.01] active:scale-[0.98]"
                              style={{ background: hex, color: "#fff", boxShadow: `0 4px 20px ${hex}30` }}>
                              Acheter {pack.price}€
                            </a>
                          ) : pack.revolut_url ? (
                            <a href={pack.revolut_url} target="_blank" rel="noopener noreferrer"
                              className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center no-underline transition-all hover:scale-[1.01] active:scale-[0.98]"
                              style={{ background: hex, color: "#fff", boxShadow: `0 4px 20px ${hex}30` }}>
                              Acheter {pack.price}€
                            </a>
                          ) : (
                            <button onClick={() => createPendingPurchase(modelSlug || "", pseudo, `Pack ${pack.name}`, pack.price, getAuthHeaders || (() => ({ "Content-Type": "application/json" })), paypalHandle)}
                              className="w-full py-3.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.98]"
                              style={{ background: hex, color: "#fff", border: "none", boxShadow: `0 4px 20px ${hex}30` }}>
                              Acheter {pack.price}€
                            </button>
                          )}

                          {/* Secondary payment methods */}
                          {hasPaymentLinks && (
                            <div className="flex gap-2">
                              {pack.revolut_url && (
                                <a href={pack.revolut_url} target="_blank" rel="noopener noreferrer"
                                  className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 no-underline transition-all hover:scale-[1.01] active:scale-[0.98]"
                                  style={{ background: "rgba(0,111,238,0.08)", color: "#006FEE", border: "1px solid rgba(0,111,238,0.2)" }}>
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.037 5.98H3.963A1.963 1.963 0 0 0 2 7.943v8.114c0 1.084.879 1.963 1.963 1.963h16.074A1.963 1.963 0 0 0 22 16.057V7.943A1.963 1.963 0 0 0 20.037 5.98zM7.5 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm9 0a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>
                                  Revolut
                                </a>
                              )}
                              {pack.wise_url && !pack.stripe_link && (
                                <a href={pack.wise_url} target="_blank" rel="noopener noreferrer"
                                  className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 no-underline transition-all hover:scale-[1.01] active:scale-[0.98]"
                                  style={{ background: "rgba(159,232,112,0.08)", color: "#5BB318", border: "1px solid rgba(159,232,112,0.2)" }}>
                                  Wise
                                </a>
                              )}
                              <button onClick={() => createPendingPurchase(modelSlug || "", pseudo, `Pack ${pack.name}`, pack.price, getAuthHeaders || (() => ({ "Content-Type": "application/json" })), paypalHandle)}
                                className="flex-1 py-2.5 rounded-xl text-[11px] font-medium cursor-pointer flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.98]"
                                style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border2)" }}>
                                PayPal
                              </button>
                            </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* Edit mode: full cards */}
              {isEditMode && (
                <div className="space-y-3 mt-3">
                  {displayPacks.map((pack) => {
                    const hex = TIER_HEX[pack.id] || pack.color;
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
                                Lien Wise
                              </label>
                              <input
                                value={pack.wise_url || ""}
                                onChange={e => handleUpdatePack(pack.id, { wise_url: e.target.value })}
                                placeholder="https://wise.com/pay/..."
                                className="w-full text-[11px] bg-transparent outline-none rounded-lg px-3 py-2"
                                style={{ color: "var(--text-secondary)", border: "1px dashed var(--border3)" }}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                                Lien Revolut
                              </label>
                              <input
                                value={pack.revolut_url || ""}
                                onChange={e => handleUpdatePack(pack.id, { revolut_url: e.target.value })}
                                placeholder="https://revolut.me/..."
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

      {/* ──── CONTENU PERSONNALISE — CART BUILDER ──── */}
      {shopSection === "credits" && (() => {
        const activeTier = CONTENT_PRICING.find(t => t.tier.toLowerCase() === selTier) || CONTENT_PRICING[0];
        const currentPrice = selType === "photo" ? activeTier.photo : activeTier.videoPerMin * videoMin;

        return (
          <div className="space-y-5">

            {/* ── Delivery platform indicator ── */}
            {visitorHandle && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
                <Send className="w-3.5 h-3.5" style={{ color: deliveryPlatform === "snapchat" ? "#FFFC00" : "#E4405F" }} />
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  Livraison via <strong style={{ color: deliveryPlatform === "snapchat" ? "#FFFC00" : "#E4405F" }}>
                    {deliveryPlatform === "snapchat" ? "Snapchat" : "Instagram"}
                  </strong> à <strong style={{ color: "var(--text-primary)" }}>{visitorHandle}</strong>
                </span>
              </div>
            )}

            {/* ── Tier selector with descriptions ── */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-muted)" }}>
                Choisis le niveau
              </p>
              <div className="space-y-2">
                {CONTENT_PRICING.map(t => {
                  const isActive = selTier === t.tier.toLowerCase();
                  return (
                    <button key={t.tier} onClick={() => setSelTier(t.tier.toLowerCase())}
                      className="w-full rounded-xl cursor-pointer transition-all text-left overflow-hidden"
                      style={{
                        background: isActive ? `${t.color}10` : "var(--bg2)",
                        border: `1.5px solid ${isActive ? `${t.color}50` : "var(--border)"}`,
                        transform: isActive ? "scale(1.01)" : "scale(1)",
                      }}>
                      <div className="flex items-center gap-3 px-3.5 py-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${t.color}15`, border: `1px solid ${t.color}25` }}>
                          <span className="text-lg">{t.symbol}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: isActive ? t.color : "var(--text-primary)" }}>{t.tier}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${t.color}12`, color: t.color }}>
                              {t.photo}€/photo · {t.videoPerMin}€/min
                            </span>
                          </div>
                          <p className="text-[10px] mt-0.5 leading-snug" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                        </div>
                        {isActive && <Check className="w-4 h-4 shrink-0" style={{ color: t.color }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Type + Duration + Add to cart ── */}
            <div className="rounded-2xl p-4" style={{ background: `${activeTier.color}06`, border: `1px solid ${activeTier.color}15` }}>
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => setSelType("photo")}
                  className="py-2.5 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2"
                  style={{
                    background: selType === "photo" ? `${activeTier.color}18` : "rgba(0,0,0,0.04)",
                    border: `1.5px solid ${selType === "photo" ? activeTier.color : "transparent"}`,
                    color: selType === "photo" ? activeTier.color : "var(--text-muted)",
                  }}>
                  <Camera className="w-4 h-4" />
                  <span className="text-xs font-bold">Photo</span>
                  <span className="text-[10px] font-medium opacity-70">{activeTier.photo}€</span>
                </button>
                <button onClick={() => setSelType("video")}
                  className="py-2.5 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2"
                  style={{
                    background: selType === "video" ? `${activeTier.color}18` : "rgba(0,0,0,0.04)",
                    border: `1.5px solid ${selType === "video" ? activeTier.color : "transparent"}`,
                    color: selType === "video" ? activeTier.color : "var(--text-muted)",
                  }}>
                  <Play className="w-4 h-4" />
                  <span className="text-xs font-bold">Vidéo</span>
                  <span className="text-[10px] font-medium opacity-70">{activeTier.videoPerMin}€/min</span>
                </button>
              </div>

              {/* Video duration slider */}
              {selType === "video" && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Durée</p>
                    <span className="text-sm font-bold tabular-nums" style={{ color: activeTier.color }}>{videoMin} min</span>
                  </div>
                  <input type="range" min={1} max={10} value={videoMin} onChange={e => setVideoMin(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${activeTier.color} ${(videoMin / 10) * 100}%, var(--border) ${(videoMin / 10) * 100}%)` }} />
                  <div className="flex justify-between text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                    <span>1 min</span><span>5 min</span><span>10 min</span>
                  </div>
                </div>
              )}

              {/* Add to cart button */}
              <button onClick={() => addToCart(selTier, selType, selType === "video" ? videoMin : undefined)}
                className="w-full py-3 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: `${activeTier.color}15`, color: activeTier.color, border: `1px solid ${activeTier.color}30` }}>
                <Plus className="w-4 h-4" />
                Ajouter — {currentPrice}€
              </button>
            </div>

            {/* ── Cart ── */}
            {cart.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg2)" }}>
                {/* Cart header */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <ShoppingCart className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="text-xs font-bold flex-1" style={{ color: "var(--text-primary)" }}>
                    Ma commande ({cart.reduce((s, c) => s + c.qty, 0)} article{cart.reduce((s, c) => s + c.qty, 0) > 1 ? "s" : ""})
                  </span>
                  <button onClick={() => setCart([])} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                    Vider
                  </button>
                </div>

                {/* Cart items */}
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {cart.map(item => {
                    const tierData = CONTENT_PRICING.find(t => t.tier.toLowerCase() === item.tier);
                    if (!tierData) return null;
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${tierData.color}12` }}>
                          {item.type === "photo" ? <Camera className="w-3.5 h-3.5" style={{ color: tierData.color }} /> : <Play className="w-3.5 h-3.5" style={{ color: tierData.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold block" style={{ color: "var(--text-primary)" }}>
                            {item.type === "photo" ? "Photo" : `Vidéo ${item.videoMin}min`} {tierData.tier}
                          </span>
                          <span className="text-[10px]" style={{ color: tierData.color }}>{item.unitPrice}€ chacun</span>
                        </div>
                        {/* Qty controls */}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateCartQty(item.id, -1)}
                            className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                            style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                            <Minus className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                          </button>
                          <span className="text-xs font-bold w-5 text-center tabular-nums" style={{ color: "var(--text-primary)" }}>{item.qty}</span>
                          <button onClick={() => updateCartQty(item.id, 1)}
                            className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                            style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                            <Plus className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                          </button>
                        </div>
                        <span className="text-xs font-bold tabular-nums w-12 text-right" style={{ color: "var(--text-primary)" }}>
                          {item.unitPrice * item.qty}€
                        </span>
                        <button onClick={() => removeFromCart(item.id)}
                          className="cursor-pointer p-1" style={{ background: "none", border: "none" }}>
                          <X className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Cart total + pay */}
                <div className="px-4 py-4" style={{ borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Total</span>
                    <span className="text-2xl font-black tabular-nums" style={{ color: "var(--accent)" }}>{cartTotal}€</span>
                  </div>
                  {visitorHandle && (
                    <p className="text-[10px] mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Send className="w-3 h-3" style={{ color: deliveryPlatform === "snapchat" ? "#FFFC00" : "#E4405F" }} />
                      Envoyé via {deliveryPlatform === "snapchat" ? "Snap" : "Insta"} à {visitorHandle}
                    </p>
                  )}
                  <button onClick={() => {
                    const desc = cart.map(c => {
                      const tData = CONTENT_PRICING.find(t => t.tier.toLowerCase() === c.tier);
                      return `${c.qty}x ${c.type === "photo" ? "Photo" : `Video ${c.videoMin}min`} ${tData?.tier || c.tier}`;
                    }).join(", ");
                    createPendingPurchase(modelSlug || "", pseudo, desc, cartTotal, getAuthHeaders || (() => ({ "Content-Type": "application/json" })), paypalHandle);
                  }}
                    className="w-full py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "#fff", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                    <ShoppingCart className="w-4 h-4" />
                    Commander — {cartTotal}€
                  </button>
                </div>
              </div>
            )}

            {/* ── Quick add shortcuts (when cart empty) ── */}
            {cart.length === 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Ajout rapide
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_PRICING.map(t => (
                    <button key={t.tier} onClick={() => addToCart(t.tier.toLowerCase(), "photo")}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: `${t.color}08`, border: `1px solid ${t.color}18` }}>
                      <span className="text-sm">{t.symbol}</span>
                      <div className="text-left">
                        <span className="text-[10px] font-bold block" style={{ color: t.color }}>Photo {t.tier}</span>
                        <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{t.photo}€</span>
                      </div>
                      <Plus className="w-3 h-3 ml-auto" style={{ color: t.color }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

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

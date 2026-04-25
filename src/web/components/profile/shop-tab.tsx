"use client";

import { useState, useMemo } from "react";
import {
  Camera, Play, Minus, Plus, ShoppingCart, Send, X, Flame, MessageSquare,
} from "lucide-react";
import type { PackConfig } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

// ── Pricing per tier (euros) ──
const TIER_PRICING: Record<string, { photo: number; videoPerMin: number }> = {
  p1: { photo: 5, videoPerMin: 10 },
  p2: { photo: 10, videoPerMin: 25 },
  p3: { photo: 8, videoPerMin: 15 },
  p4: { photo: 20, videoPerMin: 50 },
  p5: { photo: 35, videoPerMin: 80 },
};

const TIER_ORDER = ["p1", "p2", "p3", "p4", "p5"] as const;

interface CartItem {
  id: string;
  tier: string;
  type: "photo" | "video";
  videoMin?: number;
  qty: number;
  unitPrice: number;
  description?: string;
}

interface ShopTabProps {
  visitorHandle?: string;
  model?: string;
  paypalHandle?: string | null;
  /* Legacy props — accepted but unused (kept for backward compat) */
  clientId?: string | null;
  unlockedTier?: string | null;
  isEditMode?: boolean;
  packs?: PackConfig[];
  activePacks?: PackConfig[];
  displayPacks?: PackConfig[];
  expandedPack?: string | null;
  setExpandedPack?: (v: string | null) => void;
  focusPack?: string | null;
  setFocusPack?: (v: string | null) => void;
  shopSection?: "packs" | "credits";
  setShopSection?: (v: "packs" | "credits") => void;
  setChatOpen?: (v: boolean) => void;
  handleUpdatePack?: (packId: string, updates: Partial<PackConfig>) => void;
  handleDeletePack?: (packId: string) => void;
  handleAddPack?: () => void;
  authHeaders?: () => Record<string, string>;
}

function paypalUrl(amount: number, paypalHandle?: string | null): string {
  return `https://www.paypal.com/paypalme/${paypalHandle || "aaclaraa"}/${amount}EUR`;
}

async function createPendingPurchase(model: string, pseudo: string, item: string, amount: number, description: string, paypalHandle?: string | null) {
  try {
    const descLine = description ? `\n📝 "${description}"` : "";
    await fetch("/api/wall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, pseudo: "SYSTEM", content: `⏳ @${pseudo} commande: ${item} (${amount}€)${descLine} — en attente de validation` }),
    });
  } catch {}
  window.open(paypalUrl(amount, paypalHandle), "_blank");
}

export function ShopTab({
  visitorHandle, model: modelSlug, paypalHandle,
  ..._ /* legacy props ignored */
}: ShopTabProps) {
  const pseudo = visitorHandle || "anonyme";

  // ── Fire bar tier index ──
  const [tierIdx, setTierIdx] = useState(0);
  const selTier = TIER_ORDER[tierIdx];
  const pricing = TIER_PRICING[selTier];
  const tierHex = TIER_HEX[selTier] || "#E63329";
  // CSS var adapts to light/dark theme (TIER_HEX is static, --tier-X is theme-aware)
  const tierVar = `var(--tier-${selTier})`;
  const tierBg = (pct: number) => `color-mix(in srgb, var(--tier-${selTier}) ${pct}%, transparent)`;
  const tierSymbol = TIER_META[selTier]?.symbol || "♥";

  // ── Content builder ──
  const [selType, setSelType] = useState<"photo" | "video">("photo");
  const [photoQty, setPhotoQty] = useState(1);
  const [videoMin, setVideoMin] = useState(1);
  const [description, setDescription] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const deliveryPlatform = useMemo(() => {
    if (!visitorHandle) return null;
    return visitorHandle.startsWith("@") ? "instagram" : "snapchat";
  }, [visitorHandle]);

  const currentPrice = selType === "photo"
    ? pricing.photo * photoQty
    : pricing.videoPerMin * videoMin;

  const cartTotal = useMemo(() => cart.reduce((s, c) => s + c.unitPrice * c.qty, 0), [cart]);

  const addToCart = () => {
    const qty = selType === "photo" ? photoQty : 1;
    const unitPrice = selType === "photo" ? pricing.photo : pricing.videoPerMin * videoMin;
    const itemId = `${selTier}-${selType}${selType === "video" ? `-${videoMin}min` : ""}-${Date.now()}`;
    setCart(prev => [...prev, {
      id: itemId, tier: selTier, type: selType,
      videoMin: selType === "video" ? videoMin : undefined,
      qty, unitPrice, description: description.trim() || undefined,
    }]);
    setDescription("");
    setPhotoQty(1);
    setVideoMin(1);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

  // ── Gradient stops for fire bar ──
  const fireGradient = TIER_ORDER.map((t, i) => {
    const hex = TIER_HEX[t] || "#888";
    const pct = (i / (TIER_ORDER.length - 1)) * 100;
    return `${hex} ${pct}%`;
  }).join(", ");

  return (
    <div className="fade-up">

      {/* ── Delivery indicator ── */}
      {visitorHandle && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl mb-3" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
          <Send className="w-3.5 h-3.5" style={{ color: deliveryPlatform === "snapchat" ? "#FFFC00" : "#E4405F" }} />
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Envoyé via <strong style={{ color: deliveryPlatform === "snapchat" ? "#FFFC00" : "#E4405F" }}>
              {deliveryPlatform === "snapchat" ? "Snapchat" : "Instagram"}
            </strong> à <strong style={{ color: "var(--text)" }}>{visitorHandle}</strong>
          </span>
        </div>
      )}

      {/* ── 2-column desktop: builder left + cart right ── */}
      {/* NB 2026-04-25 evening : compacté — paddings p-5→p-3 sm:p-4, gaps mb-5→mb-3, textarea rows 3→2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4">

        {/* ══════ LEFT — Configurateur (3 cols) ══════ */}
        <div className="lg:col-span-3 space-y-3">

          {/* ── FIRE BAR — Tier slider ── */}
          <div className="rounded-2xl p-3 sm:p-4 relative overflow-hidden" style={{ background: "var(--surface)", border: `1.5px solid ${tierBg(15)}` }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${tierVar}, transparent)` }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" style={{ color: tierVar }}>{tierSymbol}</span>
                <div>
                  <span className="text-sm font-black block" style={{ color: tierVar }}>{TIER_META[selTier]?.label}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {pricing.photo}€/photo · {pricing.videoPerMin}€/min vidéo
                  </span>
                </div>
              </div>
              <Flame className="w-5 h-5" style={{ color: tierVar, opacity: 0.6 + (tierIdx * 0.13) }} />
            </div>
            {/* Slider + labels — same px-[10px] so thumb center aligns with label center */}
            <div className="relative px-[10px]">
              <input type="range" min={0} max={4} step={1} value={tierIdx}
                onChange={e => setTierIdx(Number(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, ${fireGradient})` }} />
              <div className="flex justify-between mt-2">
                {TIER_ORDER.map((t, i) => {
                  const isActive = i === tierIdx;
                  return (
                    <button key={t} onClick={() => setTierIdx(i)}
                      className="flex flex-col items-center cursor-pointer transition-all"
                      style={{ opacity: isActive ? 1 : 0.4, width: 0, overflow: "visible" }}>
                      <span className="text-base" style={{ color: isActive ? `var(--tier-${t})` : "var(--text-muted)" }}>{TIER_META[t]?.symbol}</span>
                      <span className="text-[9px] font-bold uppercase whitespace-nowrap" style={{ color: isActive ? `var(--tier-${t})` : "var(--text-muted)" }}>{TIER_META[t]?.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── TYPE + QUANTITY (fusion : type + qty + description + bouton dans un seul card) ── */}
          <div className="rounded-2xl p-3 sm:p-4" style={{ background: "var(--surface)", border: `1px solid ${tierBg(12)}` }}>
            {/* Photo / Video toggle compact */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setSelType("photo")}
                className="py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                style={{
                  background: selType === "photo" ? tierBg(10) : "var(--bg2)",
                  border: `1.5px solid ${selType === "photo" ? tierVar : "var(--border)"}`,
                  color: selType === "photo" ? tierVar : "var(--text-muted)",
                  minHeight: 44,
                }}>
                <Camera className="w-4 h-4" />
                <span className="text-sm font-bold">Photo</span>
                <span className="text-[10px] opacity-70">{pricing.photo}€</span>
              </button>
              <button onClick={() => setSelType("video")}
                className="py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                style={{
                  background: selType === "video" ? tierBg(10) : "var(--bg2)",
                  border: `1.5px solid ${selType === "video" ? tierVar : "var(--border)"}`,
                  color: selType === "video" ? tierVar : "var(--text-muted)",
                  minHeight: 44,
                }}>
                <Play className="w-4 h-4" />
                <span className="text-sm font-bold">Vidéo</span>
                <span className="text-[10px] opacity-70">{pricing.videoPerMin}€/min</span>
              </button>
            </div>

            {/* Quantity / Durée compact */}
            {selType === "photo" ? (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Qté</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPhotoQty(Math.max(1, photoQty - 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ background: tierBg(8), border: `1px solid ${tierBg(20)}`, color: tierVar }}>
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xl font-black tabular-nums w-9 text-center" style={{ color: tierVar }}>{photoQty}</span>
                  <button onClick={() => setPhotoQty(photoQty + 1)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ background: tierBg(8), border: `1px solid ${tierBg(20)}`, color: tierVar }}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-base font-black tabular-nums" style={{ color: tierVar }}>{currentPrice}€</span>
              </div>
            ) : (
              <div className="mb-3 px-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Durée</span>
                  <span className="text-base font-black tabular-nums" style={{ color: tierVar }}>{videoMin} min — {currentPrice}€</span>
                </div>
                <input type="range" min={1} max={10} value={videoMin}
                  onChange={e => setVideoMin(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${tierVar} ${(videoMin / 10) * 100}%, var(--border) ${(videoMin / 10) * 100}%)` }} />
                <div className="flex justify-between text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                  <span>1 min</span><span>5 min</span><span>10 min</span>
                </div>
              </div>
            )}

            {/* Description compact */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Décris ce que tu veux</span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: lingerie rouge, pose allongée..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none transition-all focus:ring-1"
                style={{
                  background: "var(--bg2)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  "--tw-ring-color": tierVar,
                } as React.CSSProperties} />
              <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                ⚠️ Contenu sexy/explicite uniquement — validation modèle
              </p>
            </div>

            {/* Add to cart */}
            <button onClick={addToCart}
              className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: tierVar, color: "#fff", border: "none", boxShadow: `0 4px 20px ${tierBg(30)}`, minHeight: 44 }}>
              <ShoppingCart className="w-4 h-4" />
              Ajouter — {currentPrice}€
            </button>
          </div>
        </div>

        {/* ══════ RIGHT — Panier (2 cols) ══════ */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden lg:sticky lg:top-[100px]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            {/* Header compact */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <ShoppingCart className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span className="text-xs sm:text-sm font-bold flex-1" style={{ color: "var(--text)" }}>
                {cart.length > 0 ? `Ma commande (${cart.length})` : "Mon panier"}
              </span>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                  Vider
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-6 text-center">
                <ShoppingCart className="w-7 h-7 mx-auto mb-1.5" style={{ color: "var(--text-muted)", opacity: 0.25 }} />
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Ton panier est vide</p>
                <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Configure ton contenu et ajoute-le ici</p>
              </div>
            ) : (
              <>
                {/* Items compact */}
                <div>
                  {cart.map(item => {
                    const itemVar = `var(--tier-${item.tier})`;
                    const symbol = TIER_META[item.tier]?.symbol || "•";
                    return (
                      <div key={item.id} className="px-3 sm:px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `color-mix(in srgb, var(--tier-${item.tier}) 10%, transparent)` }}>
                            {item.type === "photo" ? <Camera className="w-3.5 h-3.5" style={{ color: itemVar }} /> : <Play className="w-3.5 h-3.5" style={{ color: itemVar }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold block" style={{ color: "var(--text)" }}>
                              {item.qty}x {item.type === "photo" ? "Photo" : `Vidéo ${item.videoMin}min`} {symbol} {TIER_META[item.tier]?.label}
                            </span>
                            <span className="text-[10px] font-bold" style={{ color: itemVar }}>{item.unitPrice * item.qty}€</span>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="cursor-pointer p-1 rounded-lg transition-colors hover:bg-red-50" style={{ background: "none", border: "none" }}>
                            <X className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-[9px] mt-1 ml-11 leading-snug" style={{ color: "var(--text-muted)" }}>
                            📝 {item.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total + Pay compact */}
                <div className="px-3 sm:px-4 py-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Total</span>
                    <span className="text-xl font-black tabular-nums" style={{ color: "var(--accent)" }}>{cartTotal}€</span>
                  </div>
                  {visitorHandle && (
                    <p className="text-[10px] mb-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Send className="w-3 h-3" style={{ color: deliveryPlatform === "snapchat" ? "#FFFC00" : "#E4405F" }} />
                      Envoyé via {deliveryPlatform === "snapchat" ? "Snap" : "Insta"} à {visitorHandle}
                    </p>
                  )}
                  <button onClick={() => {
                    const desc = cart.map(c => {
                      const label = TIER_META[c.tier]?.label || c.tier;
                      const line = `${c.qty}x ${c.type === "photo" ? "Photo" : `Video ${c.videoMin}min`} ${label}`;
                      return c.description ? `${line} (${c.description})` : line;
                    }).join(", ");
                    createPendingPurchase(modelSlug || "", pseudo, desc, cartTotal, cart.map(c => c.description).filter(Boolean).join(" | "), paypalHandle);
                  }}
                    className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "#fff", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minHeight: 44 }}>
                    <ShoppingCart className="w-4 h-4" />
                    Commander — {cartTotal}€
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

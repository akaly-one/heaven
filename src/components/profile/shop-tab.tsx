"use client";

import { useState, useMemo } from "react";
import {
  Camera, Play, Minus, Plus, ShoppingCart, Send, X, Flame, MessageSquare,
} from "lucide-react";
import type { PackConfig } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";

// ── Pricing per tier (euros) ──
const TIER_PRICING: Record<string, { photo: number; videoPerMin: number }> = {
  silver: { photo: 5, videoPerMin: 10 },
  gold: { photo: 10, videoPerMin: 20 },
  black: { photo: 25, videoPerMin: 50 },
  platinum: { photo: 40, videoPerMin: 80 },
};

const TIER_ORDER = ["silver", "gold", "black", "platinum"] as const;

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

  // ── Fire bar tier index (0=VIP, 1=Gold, 2=Diamond, 3=Platinum) ──
  const [tierIdx, setTierIdx] = useState(0);
  const selTier = TIER_ORDER[tierIdx];
  const pricing = TIER_PRICING[selTier];
  const tierHex = TIER_HEX[selTier] || "#E63329";
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-5" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
          <Send className="w-3.5 h-3.5" style={{ color: deliveryPlatform === "snapchat" ? "#FFFC00" : "#E4405F" }} />
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Envoyé via <strong style={{ color: deliveryPlatform === "snapchat" ? "#FFFC00" : "#E4405F" }}>
              {deliveryPlatform === "snapchat" ? "Snapchat" : "Instagram"}
            </strong> à <strong style={{ color: "var(--text-primary)" }}>{visitorHandle}</strong>
          </span>
        </div>
      )}

      {/* ── 2-column desktop: builder left + cart right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">

        {/* ══════ LEFT — Configurateur (3 cols) ══════ */}
        <div className="lg:col-span-3 space-y-5">

          {/* ── FIRE BAR — Tier slider ── */}
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "var(--surface)", border: `1.5px solid ${tierHex}20` }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${tierHex}, transparent)` }} />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{tierSymbol}</span>
                <div>
                  <span className="text-base font-black block" style={{ color: tierHex }}>{TIER_META[selTier]?.label}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {pricing.photo}€/photo · {pricing.videoPerMin}€/min vidéo
                  </span>
                </div>
              </div>
              <Flame className="w-6 h-6" style={{ color: tierHex, opacity: 0.6 + (tierIdx * 0.13) }} />
            </div>
            <div className="relative">
              <input type="range" min={0} max={3} step={1} value={tierIdx}
                onChange={e => setTierIdx(Number(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, ${fireGradient})` }} />
              <div className="flex justify-between mt-2 px-0.5">
                {TIER_ORDER.map((t, i) => {
                  const hex = TIER_HEX[t] || "#888";
                  const isActive = i === tierIdx;
                  return (
                    <button key={t} onClick={() => setTierIdx(i)}
                      className="flex flex-col items-center cursor-pointer transition-all"
                      style={{ opacity: isActive ? 1 : 0.35 }}>
                      <span className="text-base">{TIER_META[t]?.symbol}</span>
                      <span className="text-[9px] font-bold uppercase" style={{ color: hex }}>{TIER_META[t]?.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── TYPE + QUANTITY ── */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: `1px solid ${tierHex}15` }}>
            {/* Photo / Video toggle */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button onClick={() => setSelType("photo")}
                className="py-4 rounded-xl cursor-pointer transition-all flex flex-col items-center gap-2"
                style={{
                  background: selType === "photo" ? `${tierHex}12` : "var(--bg2)",
                  border: `1.5px solid ${selType === "photo" ? tierHex : "var(--border)"}`,
                  color: selType === "photo" ? tierHex : "var(--text-muted)",
                }}>
                <Camera className="w-6 h-6" />
                <span className="text-sm font-bold">Photo</span>
                <span className="text-xs opacity-70">{pricing.photo}€ / photo</span>
              </button>
              <button onClick={() => setSelType("video")}
                className="py-4 rounded-xl cursor-pointer transition-all flex flex-col items-center gap-2"
                style={{
                  background: selType === "video" ? `${tierHex}12` : "var(--bg2)",
                  border: `1.5px solid ${selType === "video" ? tierHex : "var(--border)"}`,
                  color: selType === "video" ? tierHex : "var(--text-muted)",
                }}>
                <Play className="w-6 h-6" />
                <span className="text-sm font-bold">Vidéo</span>
                <span className="text-xs opacity-70">{pricing.videoPerMin}€ / min</span>
              </button>
            </div>

            {/* Quantity */}
            {selType === "photo" ? (
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Quantité</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setPhotoQty(Math.max(1, photoQty - 1))}
                    className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ background: `${tierHex}10`, border: `1px solid ${tierHex}25`, color: tierHex }}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-3xl font-black tabular-nums w-12 text-center" style={{ color: tierHex }}>{photoQty}</span>
                  <button onClick={() => setPhotoQty(photoQty + 1)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ background: `${tierHex}10`, border: `1px solid ${tierHex}25`, color: tierHex }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xl font-black tabular-nums" style={{ color: tierHex }}>{currentPrice}€</span>
              </div>
            ) : (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Durée</span>
                  <span className="text-xl font-black tabular-nums" style={{ color: tierHex }}>{videoMin} min — {currentPrice}€</span>
                </div>
                <input type="range" min={1} max={10} value={videoMin}
                  onChange={e => setVideoMin(Number(e.target.value))}
                  className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${tierHex} ${(videoMin / 10) * 100}%, var(--border) ${(videoMin / 10) * 100}%)` }} />
                <div className="flex justify-between text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  <span>1 min</span><span>5 min</span><span>10 min</span>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Décris ce que tu veux</span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: photo en lingerie rouge, pose allongée..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all focus:ring-1"
                style={{
                  background: "var(--bg2)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  "--tw-ring-color": tierHex,
                } as React.CSSProperties} />
              <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                ⚠️ Contenu sexy et explicite uniquement — la modèle valide chaque demande
              </p>
            </div>

            {/* Add to cart */}
            <button onClick={addToCart}
              className="w-full py-4 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: tierHex, color: "#fff", border: "none", boxShadow: `0 4px 20px ${tierHex}30` }}>
              <ShoppingCart className="w-4 h-4" />
              Ajouter — {currentPrice}€
            </button>
          </div>
        </div>

        {/* ══════ RIGHT — Panier (2 cols) ══════ */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden lg:sticky lg:top-[100px]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <ShoppingCart className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span className="text-sm font-bold flex-1" style={{ color: "var(--text)" }}>
                {cart.length > 0 ? `Ma commande (${cart.length})` : "Mon panier"}
              </span>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                  Vider
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)", opacity: 0.25 }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ton panier est vide</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Configure ton contenu et ajoute-le ici</p>
              </div>
            ) : (
              <>
                {/* Items */}
                <div>
                  {cart.map(item => {
                    const hex = TIER_HEX[item.tier] || "#888";
                    const symbol = TIER_META[item.tier]?.symbol || "•";
                    return (
                      <div key={item.id} className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${hex}10` }}>
                            {item.type === "photo" ? <Camera className="w-4 h-4" style={{ color: hex }} /> : <Play className="w-4 h-4" style={{ color: hex }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold block" style={{ color: "var(--text)" }}>
                              {item.qty}x {item.type === "photo" ? "Photo" : `Vidéo ${item.videoMin}min`} {symbol} {TIER_META[item.tier]?.label}
                            </span>
                            <span className="text-[11px] font-bold" style={{ color: hex }}>{item.unitPrice * item.qty}€</span>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="cursor-pointer p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ background: "none", border: "none" }}>
                            <X className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-[10px] mt-1.5 ml-12 leading-snug" style={{ color: "var(--text-muted)" }}>
                            📝 {item.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total + Pay */}
                <div className="px-5 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Total</span>
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
                      const label = TIER_META[c.tier]?.label || c.tier;
                      const line = `${c.qty}x ${c.type === "photo" ? "Photo" : `Video ${c.videoMin}min`} ${label}`;
                      return c.description ? `${line} (${c.description})` : line;
                    }).join(", ");
                    createPendingPurchase(modelSlug || "", pseudo, desc, cartTotal, cart.map(c => c.description).filter(Boolean).join(" | "), paypalHandle);
                  }}
                    className="w-full py-4 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "#fff", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
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

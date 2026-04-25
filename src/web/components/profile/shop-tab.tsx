"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  // NB 2026-04-25 evening : panier en popup à côté du slider tier (plus de colonne droite)
  const [cartOpen, setCartOpen] = useState(false);
  // NB 2026-04-25 evening late : popup positionné en `fixed` viewport pour échapper
  // au `overflow-hidden` du parent fire bar (sinon clip = chevauchement). Coords
  // calculés au click via getBoundingClientRect du bouton cart.
  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const [cartPos, setCartPos] = useState<{ top: number; right: number } | null>(null);
  const openCart = () => {
    if (cartBtnRef.current) {
      const rect = cartBtnRef.current.getBoundingClientRect();
      setCartPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setCartOpen(true);
  };
  // Recompute on resize/scroll so popup follows the button
  useEffect(() => {
    if (!cartOpen) return;
    const update = () => {
      if (cartBtnRef.current) {
        const rect = cartBtnRef.current.getBoundingClientRect();
        setCartPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [cartOpen]);

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

      {/* ── Layout single column avec panier en popup (NB 2026-04-25 evening) ── */}
      <div className="space-y-3 max-w-2xl mx-auto">

          {/* ── FIRE BAR — Tier slider AVEC bouton panier intégré ── */}
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
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5" style={{ color: tierVar, opacity: 0.6 + (tierIdx * 0.13) }} />
                {/* Panier popup trigger (popup rendu au root pour échapper au overflow-hidden) */}
                <button
                  ref={cartBtnRef}
                  onClick={() => cartOpen ? setCartOpen(false) : openCart()}
                  aria-label={`Panier (${cart.length} articles)`}
                  aria-expanded={cartOpen}
                  className="relative w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95"
                  style={{ background: cart.length > 0 ? tierVar : "var(--bg2)", border: `1px solid ${cart.length > 0 ? tierVar : "var(--border)"}` }}
                >
                  <ShoppingCart className="w-4 h-4" style={{ color: cart.length > 0 ? "#fff" : "var(--text-muted)" }} />
                  {cart.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                      style={{ background: "#10B981", color: "#fff", border: "1.5px solid var(--surface)" }}>{cart.length}</span>
                  )}
                </button>
              </div>
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
            {/* Photo / Video toggle — NB 2026-04-25 late : segment-control style.
                L'inactif est SANS bordure pour éviter la confusion "inactif paraît plus highlighté". */}
            <div className="grid grid-cols-2 gap-1 mb-3 p-1 rounded-xl" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
              <button onClick={() => setSelType("photo")}
                aria-pressed={selType === "photo"}
                className="py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: selType === "photo" ? tierVar : "transparent",
                  border: "none",
                  color: selType === "photo" ? "#fff" : "var(--text-muted)",
                  boxShadow: selType === "photo" ? `0 2px 8px ${tierBg(40)}` : "none",
                  minHeight: 40,
                  fontWeight: selType === "photo" ? 700 : 500,
                  opacity: selType === "photo" ? 1 : 0.7,
                }}>
                <Camera className="w-4 h-4" />
                <span className="text-sm">Photo</span>
                <span className="text-[10px] opacity-90">{pricing.photo}€</span>
              </button>
              <button onClick={() => setSelType("video")}
                aria-pressed={selType === "video"}
                className="py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: selType === "video" ? tierVar : "transparent",
                  border: "none",
                  color: selType === "video" ? "#fff" : "var(--text-muted)",
                  boxShadow: selType === "video" ? `0 2px 8px ${tierBg(40)}` : "none",
                  minHeight: 40,
                  fontWeight: selType === "video" ? 700 : 500,
                  opacity: selType === "video" ? 1 : 0.7,
                }}>
                <Play className="w-4 h-4" />
                <span className="text-sm">Vidéo</span>
                <span className="text-[10px] opacity-90">{pricing.videoPerMin}€/min</span>
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
            <button onClick={() => { addToCart(); openCart(); }}
              className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ background: tierVar, color: "#fff", border: "none", boxShadow: `0 4px 20px ${tierBg(30)}`, minHeight: 44 }}>
              <ShoppingCart className="w-4 h-4" />
              Ajouter — {currentPrice}€
            </button>
          </div>

      </div>

      {/* Panier popup rendu au root ShopTab (fixed viewport) — échappe au overflow-hidden du fire bar */}
      {cartOpen && cartPos && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setCartOpen(false)} />
          <div
            className="fixed z-[51] w-[300px] sm:w-[340px] max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden"
            style={{
              top: `${cartPos.top}px`,
              right: `${Math.max(16, cartPos.right)}px`,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <ShoppingCart className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span className="text-xs font-bold flex-1" style={{ color: "var(--text)" }}>
                {cart.length > 0 ? `Ma commande (${cart.length})` : "Mon panier"}
              </span>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)", background: "none", border: "none" }}>
                  Vider
                </button>
              )}
              <button onClick={() => setCartOpen(false)} aria-label="Fermer panier" className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer hover:bg-white/[0.06]" style={{ background: "transparent", border: "none" }}>
                <X className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
            {cart.length === 0 ? (
              <div className="py-6 text-center px-3">
                <ShoppingCart className="w-7 h-7 mx-auto mb-1.5" style={{ color: "var(--text-muted)", opacity: 0.25 }} />
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Ton panier est vide</p>
                <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Configure ton contenu et ajoute-le ici</p>
              </div>
            ) : (
              <>
                <div className="max-h-[40vh] overflow-y-auto">
                  {cart.map(item => {
                    const itemVar = `var(--tier-${item.tier})`;
                    const symbol = TIER_META[item.tier]?.symbol || "•";
                    return (
                      <div key={item.id} className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `color-mix(in srgb, var(--tier-${item.tier}) 10%, transparent)` }}>
                            {item.type === "photo" ? <Camera className="w-3 h-3" style={{ color: itemVar }} /> : <Play className="w-3 h-3" style={{ color: itemVar }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold block truncate" style={{ color: "var(--text)" }}>
                              {item.qty}x {item.type === "photo" ? "Photo" : `Vidéo ${item.videoMin}min`} {symbol} {TIER_META[item.tier]?.label}
                            </span>
                            <span className="text-[10px] font-bold" style={{ color: itemVar }}>{item.unitPrice * item.qty}€</span>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="cursor-pointer p-1 rounded-lg transition-colors hover:bg-red-50" style={{ background: "none", border: "none" }}>
                            <X className="w-3 h-3" style={{ color: "#EF4444" }} />
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-[9px] mt-0.5 ml-9 leading-snug" style={{ color: "var(--text-muted)" }}>
                            📝 {item.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-3 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Total</span>
                    <span className="text-lg font-black tabular-nums" style={{ color: "var(--accent)" }}>{cartTotal}€</span>
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
                    className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "#fff", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minHeight: 40 }}>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Commander — {cartTotal}€
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

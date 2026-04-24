"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Image as ImageIcon,
  Video,
  Plus,
  Minus,
  Loader2,
  ShoppingBag,
} from "lucide-react";

/**
 * BRIEF-16 livrable 3 — CustomCartSheet
 *
 * Panier composable pour pack "Custom" — grille Silver/Gold/VIP Black/VIP
 * Platinum × photo/video + quantité + "spécial pied" (×3) + description libre.
 *
 * Flow :
 * 1. Fan choisit quantité par catégorie/type
 * 2. Call /api/packs/custom/quote (debounce 500ms) → renvoie totalCents + breakdown
 * 3. Fan accepte CGV + décrit
 * 4. POST /api/payment/create avec packSlug='custom' + breakdown + amount
 * 5. Parent ouvre PaymentReferenceModal avec la référence
 */

type MediaType = "photo" | "video";
type Category = "silver" | "gold" | "vip_black" | "vip_platinum";

interface CartItemKey {
  type: MediaType;
  category: Category;
}

interface CartItemValue {
  quantity: number;
  duration_min?: number; // only video
  special_feet?: boolean; // x3 multiplier
}

type CartState = Record<string, CartItemValue>;

interface QuoteItem {
  type: MediaType;
  category: Category;
  quantity: number;
  duration_min?: number;
  special_feet?: boolean;
}

interface QuoteResponse {
  totalCents: number;
  totalEur: number;
  breakdown?: unknown;
}

interface CreatePaymentResponse {
  redirectUrl: string;
  referenceCode: string;
  pendingPaymentId: string;
}

interface CustomCartSheetProps {
  show: boolean;
  onClose: () => void;
  model: string; // model slug
  clientPseudo: string;
  clientId?: string;
  onPaymentCreated: (res: CreatePaymentResponse & { amount: number }) => void;
}

// ── Grille tarifaire (référence brief section décisions) ──
const PHOTO_BASE = 5;
const VIDEO_BASE = 10;
const CATEGORY_META: Record<
  Category,
  { label: string; multiplier: number; color: string }
> = {
  silver: { label: "Silver", multiplier: 1, color: "#7A8A8E" },
  gold: { label: "Gold", multiplier: 2, color: "#D4AF37" },
  vip_black: { label: "VIP Black", multiplier: 4, color: "#8B5CF6" },
  vip_platinum: { label: "VIP Platinum", multiplier: 8, color: "#B8860B" },
};

const CATEGORIES: Category[] = [
  "silver",
  "gold",
  "vip_black",
  "vip_platinum",
];
const MEDIA_TYPES: MediaType[] = ["photo", "video"];

function itemKey(type: MediaType, category: Category): string {
  return `${type}:${category}`;
}

// ── Prix unitaire d'un item (utilisé pour total local "optimistic" avant quote) ──
function localUnitPrice(
  type: MediaType,
  category: Category,
  specialFeet = false
): number {
  const base = type === "photo" ? PHOTO_BASE : VIDEO_BASE;
  const mult = CATEGORY_META[category].multiplier;
  const feet = specialFeet ? 3 : 1;
  return base * mult * feet;
}

export function CustomCartSheet({
  show,
  onClose,
  model,
  clientPseudo,
  clientId,
  onPaymentCreated,
}: CustomCartSheetProps) {
  const [cart, setCart] = useState<CartState>({});
  const [description, setDescription] = useState("");
  const [acceptedCgv, setAcceptedCgv] = useState(false);
  const [quoteCents, setQuoteCents] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Close on Escape ──
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  // ── Reset quand on ferme ──
  useEffect(() => {
    if (!show) {
      setCart({});
      setDescription("");
      setAcceptedCgv(false);
      setQuoteCents(null);
      setQuoteError(null);
      setSubmitError(null);
    }
  }, [show]);

  // ── Convert cart → items[] pour API ──
  const cartItems: QuoteItem[] = useMemo(() => {
    const out: QuoteItem[] = [];
    for (const [key, val] of Object.entries(cart)) {
      if (!val || val.quantity <= 0) continue;
      const [type, category] = key.split(":") as [MediaType, Category];
      out.push({
        type,
        category,
        quantity: val.quantity,
        ...(type === "video" && val.duration_min
          ? { duration_min: val.duration_min }
          : {}),
        ...(val.special_feet ? { special_feet: true } : {}),
      });
    }
    return out;
  }, [cart]);

  // ── Total local (fallback tant que le quote API n'a pas répondu) ──
  const localTotalCents = useMemo(() => {
    let total = 0;
    for (const item of cartItems) {
      const unit = localUnitPrice(
        item.type,
        item.category,
        item.special_feet || false
      );
      if (item.type === "video") {
        const dur = item.duration_min || 1;
        total += unit * item.quantity * dur * 100;
      } else {
        total += unit * item.quantity * 100;
      }
    }
    return Math.round(total);
  }, [cartItems]);

  // ── Call quote API (debounced 500ms) ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cartItems.length === 0) {
      setQuoteCents(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await fetch("/api/packs/custom/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            items: cartItems,
            description: description.trim() || undefined,
          }),
        });
        if (!res.ok) {
          // Fallback silencieux : on garde le local total
          setQuoteCents(null);
          setQuoteError(null);
          return;
        }
        const data: QuoteResponse = await res.json();
        setQuoteCents(data.totalCents);
      } catch {
        // Fallback silencieux : on garde le local total
        setQuoteCents(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // description n'est pas inclus pour éviter un re-fetch à chaque frappe
    // (description ne modifie pas le total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, model]);

  // Prix affiché : API quote (prioritaire) sinon fallback local
  const displayTotalCents = quoteCents ?? localTotalCents;
  const displayTotalEur = (displayTotalCents / 100).toFixed(2);

  // ── Update cart ──
  const updateQuantity = useCallback(
    (type: MediaType, category: Category, delta: number) => {
      setCart((prev) => {
        const key = itemKey(type, category);
        const curr = prev[key] || { quantity: 0 };
        const nextQty = Math.max(0, Math.min(99, curr.quantity + delta));
        if (nextQty === 0) {
          const { [key]: _removed, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [key]: {
            ...curr,
            quantity: nextQty,
            ...(type === "video" && !curr.duration_min
              ? { duration_min: 1 }
              : {}),
          },
        };
      });
    },
    []
  );

  const updateDuration = useCallback(
    (type: MediaType, category: Category, duration: number) => {
      setCart((prev) => {
        const key = itemKey(type, category);
        const curr = prev[key];
        if (!curr) return prev;
        return {
          ...prev,
          [key]: { ...curr, duration_min: Math.max(1, Math.min(60, duration)) },
        };
      });
    },
    []
  );

  const toggleFeet = useCallback((type: MediaType, category: Category) => {
    setCart((prev) => {
      const key = itemKey(type, category);
      const curr = prev[key];
      if (!curr) return prev;
      return {
        ...prev,
        [key]: { ...curr, special_feet: !curr.special_feet },
      };
    });
  }, []);

  // ── Submit order ──
  const handleOrder = useCallback(async () => {
    if (submitting) return;
    if (cartItems.length === 0) return;
    if (!description.trim()) {
      setSubmitError("Décris précisément ce que tu veux");
      return;
    }
    if (description.length > 500) {
      setSubmitError("Description trop longue (max 500 caractères)");
      return;
    }
    if (!acceptedCgv) {
      setSubmitError("Tu dois accepter les CGV");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: "manual",
          packId: "custom",
          packSlug: "custom",
          amount: displayTotalCents,
          model,
          clientPseudo,
          ...(clientId ? { clientId } : {}),
          breakdown: {
            items: cartItems,
            description: description.trim(),
            total_cents: displayTotalCents,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de la création du paiement");
      }

      const data = (await res.json()) as CreatePaymentResponse;
      onPaymentCreated({
        ...data,
        amount: Math.round(displayTotalCents / 100),
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur inconnue";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    cartItems,
    description,
    acceptedCgv,
    displayTotalCents,
    model,
    clientPseudo,
    clientId,
    onPaymentCreated,
  ]);

  if (!show) return null;

  const canOrder =
    cartItems.length > 0 &&
    description.trim().length > 0 &&
    description.length <= 500 &&
    acceptedCgv &&
    !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-cart-title"
    >
      <div
        className="w-full max-w-lg rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up flex flex-col"
        style={{
          background: "var(--surface)",
          maxHeight: "92vh",
          border: "1px solid var(--border2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Mobile handle ── */}
        <div className="flex justify-center pt-3 md:hidden shrink-0">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--border3)" }}
          />
        </div>

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border2)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
            />
            <h2
              id="custom-cart-title"
              className="text-sm font-semibold"
              style={{ color: "var(--text)" }}
            >
              Composer ton pack custom
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <X
              className="w-3.5 h-3.5"
              style={{ color: "var(--text-muted)" }}
            />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {MEDIA_TYPES.map((type) => (
            <div key={type}>
              <h3
                className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                {type === "photo" ? (
                  <ImageIcon className="w-3 h-3" />
                ) : (
                  <Video className="w-3 h-3" />
                )}
                {type === "photo" ? "Photos" : "Vidéos"}
              </h3>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const key = itemKey(type, cat);
                  const val = cart[key] || { quantity: 0 };
                  const meta = CATEGORY_META[cat];
                  const unitPrice = localUnitPrice(
                    type,
                    cat,
                    val.special_feet || false
                  );
                  const hasItem = val.quantity > 0;
                  return (
                    <div
                      key={key}
                      className="rounded-xl p-3 transition-all"
                      style={{
                        background: hasItem
                          ? `color-mix(in srgb, ${meta.color} 8%, var(--bg3))`
                          : "var(--bg3)",
                        border: `1.5px solid ${
                          hasItem
                            ? `color-mix(in srgb, ${meta.color} 30%, transparent)`
                            : "var(--border2)"
                        }`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-bold"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </p>
                          <p
                            className="text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {unitPrice}€ {type === "video" ? "/ min" : "/ unité"}
                            {val.special_feet ? " (pied ×3)" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(type, cat, -1)}
                            disabled={val.quantity === 0}
                            aria-label={`Retirer 1 ${meta.label}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:brightness-110"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              color: "var(--text)",
                            }}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className="w-6 text-center text-xs font-bold tabular-nums"
                            style={{ color: "var(--text)" }}
                          >
                            {val.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(type, cat, 1)}
                            aria-label={`Ajouter 1 ${meta.label}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:brightness-110"
                            style={{
                              background: `color-mix(in srgb, ${meta.color} 25%, transparent)`,
                              color: meta.color,
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Video duration + special feet */}
                      {hasItem && (
                        <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid var(--border2)" }}>
                          {type === "video" && (
                            <label className="flex items-center gap-1.5 flex-1">
                              <span
                                className="text-[10px]"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Durée (min)
                              </span>
                              <input
                                type="number"
                                min={1}
                                max={60}
                                value={val.duration_min || 1}
                                onChange={(e) =>
                                  updateDuration(
                                    type,
                                    cat,
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                                className="w-14 px-2 py-1 rounded-md text-[11px] font-mono outline-none"
                                style={{
                                  background: "var(--bg)",
                                  color: "var(--text)",
                                  border: "1px solid var(--border2)",
                                }}
                                aria-label={`Durée vidéo ${meta.label} en minutes`}
                              />
                            </label>
                          )}
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={val.special_feet || false}
                              onChange={() => toggleFeet(type, cat)}
                              className="cursor-pointer"
                              style={{ accentColor: meta.color }}
                              aria-label={`Spécial pied ×3 pour ${meta.label} ${type}`}
                            />
                            <span
                              className="text-[10px]"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Spécial pied (×3)
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── Description ── */}
          <div>
            <label
              htmlFor="custom-desc"
              className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Décris précisément ce que tu veux *
            </label>
            <textarea
              id="custom-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Ex : 3 photos en lingerie rouge, pose allongée, angle bas..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-xs outline-none resize-none"
              style={{
                background: "var(--bg3)",
                color: "var(--text)",
                border: "1px solid var(--border2)",
              }}
            />
            <p
              className="text-[10px] text-right mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              {description.length}/500
            </p>
          </div>
        </div>

        {/* ── Footer avec total + CTA ── */}
        <div
          className="shrink-0 px-6 py-4 space-y-3"
          style={{
            borderTop: "1px solid var(--border2)",
            background: "var(--bg)",
          }}
        >
          {/* Total */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Total
            </span>
            <span
              className="text-xl font-black tabular-nums flex items-center gap-2"
              style={{ color: "var(--accent)" }}
            >
              {quoteLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin opacity-60" />
              )}
              {displayTotalEur}€
            </span>
          </div>

          {quoteError && (
            <p className="text-[10px]" style={{ color: "#EF4444" }}>
              {quoteError}
            </p>
          )}

          {/* CGV */}
          <label
            className="flex items-start gap-2 cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <input
              type="checkbox"
              checked={acceptedCgv}
              onChange={(e) => setAcceptedCgv(e.target.checked)}
              className="mt-0.5 cursor-pointer shrink-0"
              style={{ accentColor: "var(--accent)" }}
              aria-label="J'accepte les CGV"
            />
            <span className="text-[10px] leading-snug">
              J&apos;accepte les{" "}
              <a
                href="/cgv"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: "var(--accent)" }}
              >
                Conditions Générales de Vente
              </a>
            </span>
          </label>

          {submitError && (
            <p className="text-[11px]" style={{ color: "#EF4444" }}>
              {submitError}
            </p>
          )}

          <button
            onClick={handleOrder}
            disabled={!canOrder}
            className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: "var(--accent)",
              color: "#fff",
              boxShadow: canOrder
                ? "0 4px 20px color-mix(in srgb, var(--accent) 30%, transparent)"
                : "none",
            }}
            aria-label="Commander"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création commande...
              </>
            ) : (
              <>
                Commander — {displayTotalEur}€
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

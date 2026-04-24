"use client";

import { useCallback, useState } from "react";
import { X, Check, ChevronRight, Loader2 } from "lucide-react";
import type { PackConfig, ModelInfo } from "@/types/heaven";
import { TIER_META, TIER_HEX } from "@/constants/tiers";
import { PaymentReferenceModal } from "./payment-reference-modal";
import { CustomCartSheet } from "./custom-cart-sheet";
import { PayPalCheckoutButton } from "./paypal-checkout-button";

/**
 * BRIEF-16 livrable 1 — MODIF unlock-sheet
 *
 * Ancien flow : bouton PayPal.me → redirection directe (perte tracking DB).
 * Nouveau flow :
 *   1. Clic "Acheter avec PayPal" → POST /api/payment/create (providerId=manual)
 *   2. Affiche PaymentReferenceModal avec reference + CGV
 *   3. Redirect vers PayPal.me dans nouvel onglet après acceptation CGV
 *
 * Pack Custom → ouvre CustomCartSheet (panier composable) à la place.
 */

interface CreatePaymentResponse {
  redirectUrl: string;
  referenceCode: string;
  pendingPaymentId: string;
}

interface UnlockSheetProps {
  show: boolean;
  onClose: () => void;
  packs: PackConfig[];
  model: ModelInfo;
  focusPack: string | null;
  setFocusPack: (id: string | null) => void;
  slug: string;
  modelId: string;
  clientPseudo?: string;
  clientId?: string;
  onCodeValidated: (code: {
    tier: string;
    expiresAt: string;
    code: string;
    id?: string;
  }) => void;
  onCheckoutPack: (pack: PackConfig) => void;
}

export function UnlockSheet({
  show,
  onClose,
  packs,
  model,
  focusPack,
  setFocusPack,
  slug,
  modelId,
  clientPseudo,
  clientId,
  onCodeValidated,
  onCheckoutPack,
}: UnlockSheetProps) {
  // ── State nouvelle modale paiement manuel ──
  const [manualPayment, setManualPayment] = useState<{
    referenceCode: string;
    redirectUrl: string;
    amount: number;
    packName: string;
    accentColor: string;
  } | null>(null);
  const [customCartOpen, setCustomCartOpen] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // ── Handler création paiement manuel ──
  const handleManualPurchase = useCallback(
    async (pack: PackConfig) => {
      if (creatingPayment) return;

      // Pack custom → ouvre panier composable
      if (pack.id === "custom" || pack.code === "AG-CUSTOM") {
        setCustomCartOpen(true);
        return;
      }

      // Clients pseudo minimum requis (au moins anonymous string)
      const pseudo = clientPseudo || "anonyme";

      setCreatingPayment(pack.id);
      setPaymentError(null);
      try {
        const res = await fetch("/api/payment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId: "manual",
            packId: pack.id,
            packSlug: pack.code || pack.id,
            amount: pack.price * 100, // en centimes
            model: slug,
            clientPseudo: pseudo,
            ...(clientId ? { clientId } : {}),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Erreur ${res.status}`);
        }

        const data = (await res.json()) as CreatePaymentResponse;
        const hex = TIER_HEX[pack.id] || pack.color;
        setManualPayment({
          referenceCode: data.referenceCode,
          redirectUrl: data.redirectUrl,
          amount: pack.price,
          packName: pack.name,
          accentColor: hex,
        });
      } catch (err) {
        setPaymentError(
          err instanceof Error ? err.message : "Erreur inconnue"
        );
      } finally {
        setCreatingPayment(null);
      }
    },
    [creatingPayment, clientPseudo, clientId, slug]
  );

  const handleCustomPaymentCreated = useCallback(
    (res: CreatePaymentResponse & { amount: number }) => {
      setCustomCartOpen(false);
      setManualPayment({
        referenceCode: res.referenceCode,
        redirectUrl: res.redirectUrl,
        amount: res.amount,
        packName: "Pack Custom",
        accentColor: "#A78BFA",
      });
    },
    []
  );

  if (!show && !manualPayment && !customCartOpen) return null;

  const activePacks = packs.filter((p) => p.active);

  return (
    <>
      {/* ── Sheet principale ── */}
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center sheet-backdrop"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Choisir un pack pour ${model?.display_name || model?.slug || "la modèle"}`}
        >
          <div
            className="w-full max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up"
            style={{
              background: "var(--surface)",
              maxHeight: "85vh",
              border: "1px solid var(--border2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 md:hidden">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "var(--border3)" }}
              />
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--text)" }}
              >
                Choisis ton acces
              </h2>
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
            <div
              className="px-6 pb-6 space-y-3 overflow-y-auto"
              style={{ maxHeight: "60vh" }}
            >
              {/* ── CODE INPUT ── */}
              <div>
                <label
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Tu as un code ?
                </label>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const input = (e.target as HTMLFormElement).querySelector(
                      "input"
                    ) as HTMLInputElement;
                    const code = input?.value?.trim();
                    if (!code) return;
                    try {
                      const res = await fetch("/api/codes", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "validate",
                          code,
                          model: modelId,
                        }),
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
                    } catch {
                      input.placeholder = "Erreur — reessaye";
                      input.value = "";
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="ABC-2026-XXXX"
                    aria-label="Code d'accès"
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono uppercase tracking-wider outline-none text-center"
                    style={{
                      background: "var(--bg3)",
                      color: "var(--text)",
                      border: "1px solid var(--border2)",
                    }}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:scale-105 transition-transform"
                    style={{
                      background: "var(--accent)",
                      color: "#fff",
                    }}
                  >
                    Valider
                  </button>
                </form>
              </div>

              <div className="text-center">
                <span
                  className="text-[10px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  ou achete un pack
                </span>
              </div>

              {paymentError && (
                <div
                  className="text-xs rounded-lg px-3 py-2"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    color: "#F87171",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                  role="alert"
                >
                  {paymentError}
                </div>
              )}

              {/* ── Packs list ── */}
              {(() => {
                const sorted = focusPack
                  ? [...activePacks].sort((a, b) =>
                      a.id === focusPack ? -1 : b.id === focusPack ? 1 : 0
                    )
                  : activePacks;
                return sorted.map((pack) => {
                  const hex = TIER_HEX[pack.id] || pack.color;
                  const isFocused = focusPack === pack.id;
                  const isLoading = creatingPayment === pack.id;

                  // Collapsed
                  if (!isFocused && focusPack) {
                    return (
                      <button
                        key={pack.id}
                        onClick={() => setFocusPack(pack.id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          background: "var(--bg3)",
                          border: `1.5px solid color-mix(in srgb, ${hex} 30%, transparent)`,
                        }}
                      >
                        <span className="text-lg">
                          {TIER_META[pack.id]?.symbol}
                        </span>
                        <span
                          className="text-sm font-bold flex-1 text-left"
                          style={{ color: "var(--text)" }}
                        >
                          {pack.name}
                        </span>
                        <span
                          className="text-sm font-black tabular-nums"
                          style={{ color: hex }}
                        >
                          {pack.price}&euro;
                        </span>
                        <ChevronRight
                          className="w-4 h-4"
                          style={{ color: "var(--text-muted)" }}
                        />
                      </button>
                    );
                  }

                  // Expanded
                  return (
                    <div
                      key={pack.id}
                      className="w-full rounded-xl overflow-hidden transition-all"
                      style={{
                        background: "var(--bg3)",
                        border: `2px solid color-mix(in srgb, ${hex} ${
                          isFocused ? "50%" : "25%"
                        }, transparent)`,
                        boxShadow: isFocused
                          ? `0 4px 24px color-mix(in srgb, ${hex} 20%, transparent)`
                          : "none",
                      }}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">
                              {TIER_META[pack.id]?.symbol}
                            </span>
                            <div>
                              <span
                                className="text-base font-bold block"
                                style={{ color: "var(--text)" }}
                              >
                                {pack.name}
                              </span>
                              {pack.badge && (
                                <span
                                  className="text-[10px] font-medium"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {pack.badge}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className="text-2xl font-black tabular-nums"
                            style={{ color: hex }}
                          >
                            {pack.price}&euro;
                          </span>
                        </div>
                        <div className="mb-4 space-y-1.5">
                          {pack.features.map((f: string, j: number) => (
                            <p
                              key={j}
                              className="text-xs flex items-center gap-2"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <Check
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: hex }}
                              />{" "}
                              {f}
                            </p>
                          ))}
                        </div>
                        {/* ── Nouveau flow paiement manuel ── */}
                        <div className="space-y-2">
                          <button
                            onClick={() => handleManualPurchase(pack)}
                            disabled={isLoading}
                            aria-label={`Acheter ${pack.name} avec PayPal pour ${pack.price} euros`}
                            className="block w-full py-3 rounded-xl text-sm font-bold text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] hover:brightness-110 flex items-center justify-center gap-2"
                            style={{
                              background: hex,
                              color: "#fff",
                              boxShadow: `0 4px 16px color-mix(in srgb, ${hex} 35%, transparent)`,
                            }}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Création...
                              </>
                            ) : (
                              <>
                                Acheter avec PayPal — {pack.price}&euro;
                              </>
                            )}
                          </button>

                          {/* BRIEF-16 Phase C — PayPal Checkout SDK bouton inline.
                              Rendu automatiquement si NEXT_PUBLIC_PAYPAL_CLIENT_ID est défini.
                              Sinon null → fallback bouton "Autres modes" ci-dessous. */}
                          <div className="pt-1">
                            <PayPalCheckoutButton
                              model={slug}
                              packId={pack.id}
                              packName={pack.name}
                              packSlug={pack.id}
                              amountEur={pack.price}
                              tier={pack.id}
                              clientPseudo={clientPseudo || "anonyme"}
                              clientId={clientId}
                              onSuccess={(code) => {
                                onCodeValidated({
                                  tier: pack.id,
                                  code,
                                  expiresAt: new Date(
                                    Date.now() + 30 * 24 * 3600 * 1000,
                                  ).toISOString(),
                                });
                              }}
                              onError={(msg) => setPaymentError(msg)}
                            />
                          </div>

                          {/* Fallback bouton "checkout auto" si SDK non configuré (legacy handler) */}
                          <button
                            onClick={() => onCheckoutPack(pack)}
                            className="block w-full py-2.5 rounded-xl text-[11px] font-semibold text-center cursor-pointer transition-all hover:brightness-110"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border2)",
                            }}
                            aria-label="Alternative paiement automatique"
                          >
                            Autres modes (Revolut / Wise)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Cart ── */}
      <CustomCartSheet
        show={customCartOpen}
        onClose={() => setCustomCartOpen(false)}
        model={slug}
        clientPseudo={clientPseudo || "anonyme"}
        clientId={clientId}
        onPaymentCreated={handleCustomPaymentCreated}
      />

      {/* ── Payment Reference Modal ── */}
      {manualPayment && (
        <PaymentReferenceModal
          referenceCode={manualPayment.referenceCode}
          redirectUrl={manualPayment.redirectUrl}
          amount={manualPayment.amount}
          packName={manualPayment.packName}
          accentColor={manualPayment.accentColor}
          onClose={() => {
            setManualPayment(null);
            // Ferme aussi la sheet principale (le fan attend maintenant la
            // validation de la modèle dans PayPal + message)
            onClose();
          }}
        />
      )}

    </>
  );
}

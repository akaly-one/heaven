"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Copy, RefreshCw } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { toSlot } from "@/lib/tier-utils";

// ── Types ──────────────────────────────────────────────────

interface PackInfo {
  id: string;
  name: string;
  price: number;
  color: string;
}

interface PaymentCheckoutProps {
  model: string;
  pack: PackInfo;
  tier: string;
  clientPseudo: string;
  clientPlatform: string;
  paypalClientId?: string;
  revolutEnabled?: boolean;
  onSuccess: (code: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

type PaymentTab = "paypal" | "revolut";
type CheckoutState = "idle" | "loading" | "success" | "error";

// ── Helpers ────────────────────────────────────────────────

function accentBg(color: string, pct: number) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

// ── Component ──────────────────────────────────────────────

export function PaymentCheckout({
  model,
  pack,
  tier,
  clientPseudo,
  clientPlatform,
  paypalClientId,
  revolutEnabled,
  onSuccess,
  onError,
  onClose,
}: PaymentCheckoutProps) {
  const [tab, setTab] = useState<PaymentTab>("paypal");
  const [state, setState] = useState<CheckoutState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revolutPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resolvedPaypalId =
    paypalClientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
  const paypalReady = resolvedPaypalId.length > 0;

  // ── Auto-close after success ──
  useEffect(() => {
    if (state === "success" && generatedCode) {
      autoCloseRef.current = setTimeout(() => {
        onSuccess(generatedCode);
      }, 5000);
    }
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, [state, generatedCode, onSuccess]);

  // ── Cleanup revolut polling on unmount ──
  useEffect(() => {
    return () => {
      if (revolutPollRef.current) clearInterval(revolutPollRef.current);
    };
  }, []);

  // ── Copy code ──
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatedCode]);

  // ── Retry from error ──
  const handleRetry = useCallback(() => {
    setState("idle");
    setErrorMsg("");
  }, []);

  // ── Handle error display ──
  const showError = useCallback(
    (msg: string) => {
      setState("error");
      setErrorMsg(msg);
      onError(msg);
    },
    [onError]
  );

  // ── Handle success ──
  const handlePaymentSuccess = useCallback((code: string) => {
    setGeneratedCode(code);
    setState("success");
  }, []);

  // ── PayPal: create order ──
  const paypalCreateOrder = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/payments/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          packId: pack.id,
          packName: pack.name,
          price: pack.price,
          tier,
          clientPseudo,
          clientPlatform,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.orderID) {
        throw new Error(data.error || "Erreur lors de la creation de la commande");
      }
      setState("idle");
      return data.orderID as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur PayPal";
      showError(msg);
      throw err;
    }
  }, [model, pack, tier, clientPseudo, clientPlatform, showError]);

  // ── PayPal: capture order ──
  const paypalOnApprove = useCallback(
    async (data: { orderID: string }) => {
      setState("loading");
      try {
        const res = await fetch("/api/payments/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderID: data.orderID,
            model,
            packId: pack.id,
            tier,
            clientPseudo,
            clientPlatform,
          }),
        });
        const result = await res.json();
        if (!res.ok || !result.code) {
          throw new Error(result.error || "Echec de la capture du paiement");
        }
        handlePaymentSuccess(result.code);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur de capture";
        showError(msg);
      }
    },
    [model, pack.id, tier, clientPseudo, clientPlatform, showError, handlePaymentSuccess]
  );

  // ── Revolut: initiate payment ──
  const handleRevolutPay = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/payments/revolut/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          packId: pack.id,
          packName: pack.name,
          price: pack.price,
          tier,
          clientPseudo,
          clientPlatform,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkout_url) {
        throw new Error(data.error || "Erreur Revolut");
      }

      // Start polling for payment completion before redirect
      if (data.order_id) {
        revolutPollRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch(
              `/api/payments/revolut/status?order_id=${data.order_id}`
            );
            const statusData = await statusRes.json();
            if (statusData.status === "completed" && statusData.code) {
              if (revolutPollRef.current) clearInterval(revolutPollRef.current);
              handlePaymentSuccess(statusData.code);
            } else if (statusData.status === "failed") {
              if (revolutPollRef.current) clearInterval(revolutPollRef.current);
              showError("Le paiement Revolut a echoue");
            }
          } catch {
            // Polling silently retries
          }
        }, 3000);
      }

      // Redirect to Revolut checkout
      window.open(data.checkout_url, "_blank");
      setState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Revolut";
      showError(msg);
    }
  }, [model, pack, tier, clientPseudo, clientPlatform, showError, handlePaymentSuccess]);

  // ── Close overlay on Escape ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Render ───────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border2)",
          boxShadow: `0 25px 60px rgba(0,0,0,0.4), 0 0 40px ${accentBg(pack.color, 10)}`,
        }}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
          style={{
            background: "var(--bg3)",
            border: "1px solid var(--border2)",
            color: "var(--text-muted)",
          }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Pack header ── */}
        <div
          className="px-6 pt-6 pb-4 text-center"
          style={{
            background: accentBg(pack.color, 8),
            borderBottom: "1px solid var(--border2)",
          }}
        >
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
            style={{
              background: accentBg(pack.color, 15),
              color: pack.color,
              fontSize: "1.5rem",
            }}
          >
            {toSlot(tier) === "p1"
              ? "\u2663"
              : toSlot(tier) === "p2"
                ? "\u2666"
                : toSlot(tier) === "p3"
                  ? "\uD83E\uDDB6"
                  : toSlot(tier) === "p4"
                    ? "\u2660"
                    : toSlot(tier) === "p5"
                      ? "\u2665"
                      : "\u2726"}
          </div>
          <h3
            className="text-base font-bold mb-1"
            style={{ color: "var(--text)" }}
          >
            {pack.name}
          </h3>
          <p
            className="text-2xl font-black tabular-nums"
            style={{ color: pack.color }}
          >
            {pack.price}€
          </p>
        </div>

        {/* ── Success state ── */}
        {state === "success" && generatedCode && (
          <div className="px-6 py-8 text-center">
            <CheckCircle2
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: "#22C55E" }}
            />
            <h4
              className="text-lg font-bold mb-2"
              style={{ color: "var(--text)" }}
            >
              Paiement confirme !
            </h4>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Voici ton code d&apos;acces :
            </p>
            <div
              className="px-4 py-3 rounded-xl mb-4 font-mono text-lg font-bold tracking-widest"
              style={{
                background: "var(--bg2)",
                color: pack.color,
                border: `1.5px solid ${accentBg(pack.color, 25)}`,
              }}
            >
              {generatedCode}
            </div>
            <button
              onClick={handleCopy}
              className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: copied ? "#22C55E" : pack.color,
                color: "#fff",
                border: "none",
              }}
            >
              <Copy className="w-4 h-4" />
              {copied ? "Code copie !" : "Copier le code"}
            </button>
            <p
              className="text-[11px] mt-3"
              style={{ color: "var(--text-muted)" }}
            >
              Fermeture automatique dans quelques secondes...
            </p>
          </div>
        )}

        {/* ── Error state ── */}
        {state === "error" && (
          <div className="px-6 py-8 text-center">
            <AlertCircle
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: "#EF4444" }}
            />
            <h4
              className="text-lg font-bold mb-2"
              style={{ color: "var(--text)" }}
            >
              Erreur de paiement
            </h4>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              {errorMsg || "Une erreur est survenue. Veuillez reessayer."}
            </p>
            <button
              onClick={handleRetry}
              className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: "var(--bg3)",
                color: "var(--text)",
                border: "1px solid var(--border2)",
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Reessayer
            </button>
          </div>
        )}

        {/* ── Payment tabs + widgets (hidden during success/error) ── */}
        {state !== "success" && state !== "error" && (
          <div className="px-6 py-5">
            {/* Tab selector */}
            <div
              className="flex gap-2 p-1 rounded-xl mb-5"
              style={{ background: "var(--bg2)" }}
            >
              <button
                onClick={() => setTab("paypal")}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                style={{
                  background:
                    tab === "paypal" ? accentBg(pack.color, 15) : "transparent",
                  color:
                    tab === "paypal" ? pack.color : "var(--text-muted)",
                  border:
                    tab === "paypal"
                      ? `1px solid ${accentBg(pack.color, 30)}`
                      : "1px solid transparent",
                }}
              >
                PayPal
              </button>
              <button
                onClick={() => setTab("revolut")}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                style={{
                  background:
                    tab === "revolut"
                      ? accentBg(pack.color, 15)
                      : "transparent",
                  color:
                    tab === "revolut" ? pack.color : "var(--text-muted)",
                  border:
                    tab === "revolut"
                      ? `1px solid ${accentBg(pack.color, 30)}`
                      : "1px solid transparent",
                }}
              >
                Revolut
              </button>
            </div>

            {/* Loading overlay */}
            {state === "loading" && (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2
                  className="w-8 h-8 animate-spin mb-3"
                  style={{ color: pack.color }}
                />
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Traitement en cours...
                </p>
              </div>
            )}

            {/* PayPal tab content */}
            {tab === "paypal" && state === "idle" && (
              <div>
                {paypalReady ? (
                  <PayPalScriptProvider
                    options={{
                      clientId: resolvedPaypalId,
                      currency: "EUR",
                      intent: "capture",
                    }}
                  >
                    <PayPalButtons
                      createOrder={paypalCreateOrder}
                      onApprove={paypalOnApprove}
                      onError={(err) => {
                        const msg =
                          err instanceof Error
                            ? err.message
                            : "Erreur PayPal inattendue";
                        showError(msg);
                      }}
                      style={{
                        layout: "vertical",
                        color: "black",
                        shape: "rect",
                        label: "pay",
                        height: 45,
                      }}
                    />
                  </PayPalScriptProvider>
                ) : (
                  <div
                    className="rounded-xl py-8 text-center"
                    style={{
                      background: "var(--bg2)",
                      border: "1px solid var(--border2)",
                    }}
                  >
                    <p
                      className="text-sm font-medium mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      PayPal sera disponible prochainement
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)", opacity: 0.6 }}
                    >
                      Configuration en cours
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Revolut tab content */}
            {tab === "revolut" && state === "idle" && (
              <div>
                {revolutEnabled ? (
                  <button
                    onClick={handleRevolutPay}
                    className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{
                      background: pack.color,
                      color: "#fff",
                      border: "none",
                      boxShadow: `0 4px 20px ${accentBg(pack.color, 25)}`,
                    }}
                  >
                    Payer avec Revolut — {pack.price}€
                  </button>
                ) : (
                  <div
                    className="rounded-xl py-8 text-center"
                    style={{
                      background: "var(--bg2)",
                      border: "1px solid var(--border2)",
                    }}
                  >
                    <p
                      className="text-sm font-medium mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Revolut sera disponible prochainement
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)", opacity: 0.6 }}
                    >
                      Configuration en cours
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Security note */}
            <p
              className="text-[10px] text-center mt-5"
              style={{ color: "var(--text-muted)", opacity: 0.6 }}
            >
              Paiement securise — Aucune donnee bancaire stockee
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

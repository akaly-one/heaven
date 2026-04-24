"use client";

import { useMemo } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface PayPalCheckoutButtonProps {
  model: string;
  packId: string;
  packName: string;
  packSlug: string;
  amountEur: number;          // en euros (pas centimes)
  tier: string;               // p1..p5 (pour capture)
  clientPseudo: string;
  clientPlatform?: string;
  clientId?: string;
  durationHours?: number;     // default 720 (30j)
  disabled?: boolean;
  onSuccess?: (generatedCode: string) => void;
  onError?: (msg: string) => void;
  onCancel?: () => void;
}

// BRIEF-16 Phase C — PayPal JavaScript SDK wrapper (@paypal/react-paypal-js)
// Flow hybride : SDK rend le bouton inline + backend /api/payments/paypal/create
// crée l'ordre et /api/payments/paypal/capture finalise + génère le code d'accès.
//
// Le bouton est rendu uniquement si NEXT_PUBLIC_PAYPAL_CLIENT_ID est défini
// (sinon SDK ne peut pas charger). Silencieux en absence de config (pas d'erreur).
export function PayPalCheckoutButton({
  model,
  packId,
  packName,
  amountEur,
  tier,
  clientPseudo,
  clientPlatform = "snapchat",
  durationHours = 720,
  disabled = false,
  onSuccess,
  onError,
  onCancel,
}: PayPalCheckoutButtonProps) {
  const clientIdEnv =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID : undefined;

  const initOptions = useMemo(
    () => ({
      clientId: clientIdEnv || "",
      currency: "EUR",
      intent: "capture" as const,
      locale: "fr_BE",
    }),
    [clientIdEnv],
  );

  if (!clientIdEnv) {
    // Pas d'env var → flow JS SDK désactivé, retour null silencieux.
    // Le flow V1 manuel (PayPal.me) reste accessible en parallèle.
    return null;
  }

  return (
    <PayPalScriptProvider options={initOptions}>
      <PayPalButtons
        disabled={disabled}
        style={{ layout: "horizontal", tagline: false, height: 44, shape: "rect", color: "gold" }}
        createOrder={async () => {
          try {
            const res = await fetch("/api/payments/paypal/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                pack_id: packId,
                pack_name: packName,
                amount: amountEur,
                currency: "EUR",
                client_pseudo: clientPseudo,
                client_platform: clientPlatform,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data?.id) {
              const msg = data?.error || "Erreur création ordre PayPal";
              onError?.(msg);
              throw new Error(msg);
            }
            return data.id as string;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Erreur PayPal";
            onError?.(msg);
            throw err;
          }
        }}
        onApprove={async (data) => {
          try {
            const res = await fetch("/api/payments/paypal/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderID: data.orderID,
                model,
                pack_id: packId,
                pack_name: packName,
                client_pseudo: clientPseudo,
                client_platform: clientPlatform,
                tier,
                duration: durationHours,
                amount: amountEur,
                currency: "EUR",
              }),
            });
            const result = await res.json();
            if (!res.ok || !result?.code) {
              onError?.(result?.error || "Erreur capture PayPal");
              return;
            }
            onSuccess?.(result.code);
          } catch (err) {
            onError?.(err instanceof Error ? err.message : "Erreur capture");
          }
        }}
        onCancel={() => onCancel?.()}
        onError={(err) => {
          onError?.(err instanceof Error ? err.message : "Erreur PayPal SDK");
        }}
      />
    </PayPalScriptProvider>
  );
}

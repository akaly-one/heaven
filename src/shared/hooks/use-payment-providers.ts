/* ══════════════════════════════════════════════
   usePaymentProviders — hook React cockpit
   BRIEF-16 (2026-04-25) — Phase D (T16-D3)
   Lit GET /api/payment/providers?model=... et permet toggle via POST.
   ══════════════════════════════════════════════ */

"use client";

import { useCallback, useEffect, useState } from "react";

export interface PaymentProviderUi {
  id: string;
  displayName: string;
  mode?: "manual" | "checkout";
  enabled: boolean;
  /** true si env verrouille (ex: Stripe sans ALLOW_STRIPE) */
  locked: boolean;
  lockedReason?: string;
}

export interface UsePaymentProvidersResult {
  providers: PaymentProviderUi[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  toggle: (providerId: string, enabled: boolean) => Promise<void>;
}

/**
 * Hook React : charge la liste des payment providers pour un model.
 * @param model model slug ou mN id (null = hook inert, utile côté root multi-model)
 */
export function usePaymentProviders(
  model: string | null,
): UsePaymentProvidersResult {
  const [providers, setProviders] = useState<PaymentProviderUi[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(model));
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!model) {
      setProviders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/payment/providers?model=${encodeURIComponent(model)}`,
        { credentials: "include" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        providers?: PaymentProviderUi[];
        error?: string;
      };
      if (!res.ok) {
        setError(body.error || `HTTP ${res.status}`);
        setProviders([]);
        return;
      }
      setProviders(Array.isArray(body.providers) ? body.providers : []);
    } catch (err) {
      console.error("[usePaymentProviders] fetch error:", err);
      setError("Erreur réseau");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [model]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const toggle = useCallback(
    async (providerId: string, enabled: boolean) => {
      if (!model) throw new Error("model requis pour toggle");
      // Optimistic update
      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, enabled } : p)),
      );
      try {
        const res = await fetch("/api/payment/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ model, providerId, enabled }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          // Revert en cas d'erreur serveur
          await refetch();
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        // Refetch pour récupérer la forme canonique (locked/lockedReason à jour)
        await refetch();
      } catch (err) {
        await refetch();
        throw err;
      }
    },
    [model, refetch],
  );

  return { providers, loading, error, refetch, toggle };
}

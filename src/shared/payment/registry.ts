/* ══════════════════════════════════════════════
   Payment Providers — registry (V2 complet)
   BRIEF-16 (2026-04-25) — Phase C + D
   - Enregistre tous les providers : manual, paypal, revolut, stripe
   - getProvider(id) : lookup par id
   - getEnabledProviders(model) : lit agence_settings.payment_providers JSONB
   - toggleProvider() : UPDATE agence_settings.payment_providers avec guards
   - Safe fallback : si aucun provider activé ou DB down → manual seul
   ══════════════════════════════════════════════ */

import { getServerSupabase } from "@/lib/supabase-server";
import { manualProvider } from "./providers/manual";
import { paypalProvider } from "./providers/paypal";
import { revolutProvider } from "./providers/revolut";
import { stripeProvider, isStripeAllowed } from "./providers/stripe";
import type { PaymentProvider, PaymentProviderId } from "./types";

const providers: Record<PaymentProviderId, PaymentProvider> = {
  manual: manualProvider,
  paypal: paypalProvider,
  revolut: revolutProvider,
  stripe: stripeProvider,
};

const VALID_IDS: readonly PaymentProviderId[] = [
  "manual",
  "paypal",
  "revolut",
  "stripe",
];

/**
 * Récupère un provider par son id.
 * Throw si non enregistré (devrait être impossible vu le type).
 */
export function getProvider(id: PaymentProviderId): PaymentProvider {
  const p = providers[id];
  if (!p) throw new Error(`Provider ${id} not registered`);
  return p;
}

/**
 * Vérifie si un string est un PaymentProviderId valide.
 */
export function isPaymentProviderId(v: unknown): v is PaymentProviderId {
  return typeof v === "string" && (VALID_IDS as readonly string[]).includes(v);
}

/**
 * Forme brute lue/écrite dans agence_settings.payment_providers.
 */
type ProviderToggleMap = Partial<
  Record<
    PaymentProviderId,
    { enabled?: boolean; displayName?: string; mode?: string }
  >
>;

/**
 * Lit le singleton global payment_providers depuis agence_settings.
 * `_model` est accepté pour extension future (scoping par modèle non implémenté V1).
 */
async function readToggles(_model: string): Promise<ProviderToggleMap | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("agence_settings")
    .select("payment_providers")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    console.warn("[payment/registry] agence_settings read error:", error);
    return null;
  }
  return (data?.payment_providers as ProviderToggleMap | undefined) ?? {};
}

/**
 * Liste les providers activés pour un modèle (V1 : toggles globaux).
 * Fallback : manual seul si DB down ou aucun provider activé.
 */
export async function getEnabledProviders(
  model: string,
): Promise<PaymentProvider[]> {
  const toggles = await readToggles(model);
  if (!toggles) return [manualProvider];

  const enabled: PaymentProvider[] = [];
  for (const id of VALID_IDS) {
    const cfg = toggles[id];
    if (cfg?.enabled !== true) continue;
    // Hard guard Stripe : même si DB dit enabled, refuse si ALLOW_STRIPE != true
    if (id === "stripe" && !isStripeAllowed()) continue;
    enabled.push(providers[id]);
  }

  if (enabled.length === 0) return [manualProvider];
  return enabled;
}

/**
 * Liste tous les providers enregistrés avec leur statut enabled.
 * Utilisé pour UI toggle cockpit : affiche TOUS les providers (enabled + disabled).
 */
export async function listProvidersForUi(
  model: string,
): Promise<
  Array<{
    id: PaymentProviderId;
    displayName: string;
    mode: "manual" | "checkout" | undefined;
    enabled: boolean;
    /** true si le provider est verrouillé au niveau env (ex: Stripe sans ALLOW_STRIPE) */
    locked: boolean;
    lockedReason?: string;
  }>
> {
  const toggles = (await readToggles(model)) ?? {};

  return VALID_IDS.map((id) => {
    const p = providers[id];
    const cfg = toggles[id];
    const stripeLocked = id === "stripe" && !isStripeAllowed();
    return {
      id,
      displayName: cfg?.displayName || p.displayName,
      mode: p.mode,
      enabled: cfg?.enabled === true && !stripeLocked,
      locked: stripeLocked,
      lockedReason: stripeLocked
        ? "Stripe désactivé au niveau serveur (ALLOW_STRIPE≠true)"
        : undefined,
    };
  });
}

/**
 * Liste tous les providers enregistrés (surface API sans DB call).
 */
export function getAllRegisteredProviders(): PaymentProvider[] {
  return VALID_IDS.map((id) => providers[id]);
}

/**
 * Active/désactive un provider dans agence_settings.payment_providers.
 * - Guard Stripe : refuse enabled=true si ALLOW_STRIPE!=true.
 * - Merge : conserve displayName/mode si déjà présents.
 * - Audit : log console.
 * - `_model` accepté pour extension future scoping par modèle.
 *
 * @throws Error si DB non configurée, providerId invalide, ou guard Stripe.
 */
export async function toggleProvider(
  _model: string,
  providerId: PaymentProviderId,
  enabled: boolean,
  actor?: { userId?: string; role?: string },
): Promise<void> {
  if (!isPaymentProviderId(providerId)) {
    throw new Error(`Invalid providerId: ${providerId}`);
  }
  if (providerId === "stripe" && enabled && !isStripeAllowed()) {
    throw new Error(
      "Stripe cannot be enabled : ALLOW_STRIPE env var is not 'true'",
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  // Lecture actuelle pour merge
  const { data: current, error: readErr } = await supabase
    .from("agence_settings")
    .select("payment_providers")
    .eq("id", "global")
    .maybeSingle();
  if (readErr) {
    console.error("[payment/registry] toggleProvider read error:", readErr);
    throw new Error("Failed to read agence_settings");
  }

  const existing =
    (current?.payment_providers as ProviderToggleMap | undefined) ?? {};
  const base = existing[providerId] ?? {};
  const p = providers[providerId];

  const nextCfg = {
    ...base,
    enabled,
    displayName: base.displayName || p.displayName,
    mode: base.mode || p.mode,
  };

  const nextAll: ProviderToggleMap = {
    ...existing,
    [providerId]: nextCfg,
  };

  // Upsert sur singleton id='global'
  const { error: writeErr } = await supabase
    .from("agence_settings")
    .upsert(
      {
        id: "global",
        payment_providers: nextAll,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (writeErr) {
    console.error("[payment/registry] toggleProvider write error:", writeErr);
    throw new Error("Failed to write agence_settings");
  }

  // Audit log — required par BRIEF-16 (traçabilité opérations toggle)
  console.log(
    `[payment-toggle] model=${_model} provider=${providerId} enabled=${enabled} by=${
      actor?.userId || "unknown"
    } role=${actor?.role || "unknown"}`,
  );
}

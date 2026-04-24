/* ══════════════════════════════════════════════
   Webhook Store — anti-replay helper
   BRIEF-16 (2026-04-25) — Phase C (T16-C4)
   Persistance webhook events + guard idempotence via UNIQUE(provider,event_id).
   Retourne isReplay=true si l'évent était déjà stocké → le caller DOIT ignorer
   le fulfillment pour éviter la génération double d'un code d'accès.
   ══════════════════════════════════════════════ */

import { getServerSupabase } from "@/lib/supabase-server";

export interface WebhookStoreResult {
  /** true si UNIQUE(provider,event_id) a déjà une entrée identique */
  isReplay: boolean;
  /** true si la ligne a été insérée (nouveau cas légitime) */
  stored: boolean;
}

export interface StoreWebhookInput {
  provider: string;
  eventId: string;
  eventType: string;
  /** rawBody JSON-parseable — sera stocké en JSONB */
  rawBody: string;
  /** signature header reçue (null si provider non signé) */
  signature: string | null;
  /** true si signature validée côté caller */
  verified: boolean;
}

/**
 * Insère un webhook event et détecte les replays.
 *
 * Contrat :
 *   - Premier appel avec (provider,event_id) → { isReplay:false, stored:true }
 *   - Second appel même (provider,event_id) → { isReplay:true,  stored:false }
 *   - Autre erreur DB → throw
 *
 * Usage type :
 *   ```ts
 *   const { isReplay } = await storeAndCheckWebhook({...});
 *   if (isReplay) return ack200();
 *   await fulfillPayment({...});
 *   ```
 *
 * Note : si rawBody n'est pas du JSON valide, on stocke { _raw: string }.
 */
export async function storeAndCheckWebhook(
  input: StoreWebhookInput,
): Promise<WebhookStoreResult> {
  const { provider, eventId, eventType, rawBody, signature, verified } = input;

  const supabase = getServerSupabase();
  if (!supabase) {
    // Pas de DB → degrade gracefully. On ne peut pas garantir idempotence,
    // mais on n'est pas censé tourner en prod sans DB configurée.
    console.warn("[webhook-store] Supabase not configured — idempotence disabled");
    return { isReplay: false, stored: false };
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    parsedBody = { _raw: rawBody };
  }

  const { error } = await supabase.from("agence_webhook_events").insert({
    provider,
    event_id: eventId,
    event_type: eventType,
    raw_body: parsedBody,
    signature,
    verified,
  });

  if (error) {
    // 23505 = unique_violation Postgres → replay détecté
    if (error.code === "23505") {
      console.log(
        `[webhook-store] replay blocked provider=${provider} event_id=${eventId}`,
      );
      return { isReplay: true, stored: false };
    }
    console.error("[webhook-store] insert error:", error);
    throw error;
  }

  return { isReplay: false, stored: true };
}

/**
 * Variant signature positional pour compat avec le pattern du brief.
 * Accepte les 6 args séparément.
 */
export async function storeAndCheckWebhookPositional(
  provider: string,
  eventId: string,
  eventType: string,
  rawBody: string,
  signature: string | null,
  verified: boolean,
): Promise<WebhookStoreResult> {
  return storeAndCheckWebhook({
    provider,
    eventId,
    eventType,
    rawBody,
    signature,
    verified,
  });
}

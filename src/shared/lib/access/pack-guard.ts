/**
 * BRIEF-16 Phase B (Enforcement cloisonnement pack) — pack guard server helper.
 *
 * Enforces strict pack-slug ↔ code binding : un fan qui détient un code Gold
 * ne doit PAS accéder au contenu VIP Black / Platinum. Le système existant
 * raisonne en tiers positionnels (p1..p5) ; cette couche ajoute la dimension
 * "pack slug" (DB column `agence_codes.pack`), plus stricte.
 *
 * - `hasPackAccess(clientId, packSlug, model)` — true si un code actif, non
 *   révoqué, non expiré matche EXACTEMENT le packSlug pour ce client/model.
 * - `listClientPacks(clientId, model)` — liste complète (active + expired)
 *   des codes pack-based du client, avec `remainingDays` précalculé.
 *
 * Utilisation attendue :
 *  - API `/api/packs` + `/api/profile/[slug]` avant de servir du contenu
 *    pack-scoped (filtre côté serveur).
 *  - Agent IA (pack awareness) via `buildPackHistoryContext()`.
 *
 * Log tag : `[pack-guard]`.
 */

import { getServerSupabase } from "@/lib/supabase-server";

export interface PackAccessResult {
  allowed: boolean;
  code?: string;
  expiresAt?: string;
  reason?: string;
}

export interface ClientPackEntry {
  packSlug: string;
  code: string;
  expiresAt: string;
  createdAt: string;
  remainingDays: number;
  status: "active" | "expired" | "revoked";
}

/**
 * Vérifie qu'un client possède un code actif correspondant strictement au
 * `packSlug` pour le `model` donné.
 *
 * Règles :
 *  - match EXACT sur `agence_codes.pack = packSlug` (pas de hiérarchie
 *    inclusive via tier — cf. tier-utils `slotIncludes`).
 *  - `active = true`, `revoked = false`, `expires_at > now()`.
 *  - Prend le code le plus récent (par expires_at DESC) si plusieurs matches.
 */
export async function hasPackAccess(
  clientId: string,
  packSlug: string,
  model: string
): Promise<PackAccessResult> {
  const supabase = getServerSupabase();
  if (!supabase) {
    console.warn("[pack-guard] DB unavailable");
    return { allowed: false, reason: "DB unavailable" };
  }

  if (!clientId || !packSlug || !model) {
    return { allowed: false, reason: "Missing required args" };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("agence_codes")
    .select("code, pack, expires_at, active, revoked, used")
    .eq("client_id", clientId)
    .eq("model", model)
    .eq("pack", packSlug)
    .eq("active", true)
    .eq("revoked", false)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[pack-guard] query error:", error.message);
    return { allowed: false, reason: "Query error" };
  }
  if (!data) {
    return { allowed: false, reason: "No valid code for this pack" };
  }
  return { allowed: true, code: data.code, expiresAt: data.expires_at };
}

/**
 * Liste tous les codes pack-based d'un client pour un model donné,
 * triés par expires_at DESC, avec `remainingDays` calculé côté serveur.
 *
 * Retourne également les codes expirés/révoqués (utile pour l'agent IA qui
 * doit pouvoir répondre "le pack Gold a expiré il y a 3 jours").
 *
 * Filtre les codes `pack IS NULL` (codes legacy non cloisonnés).
 */
export async function listClientPacks(
  clientId: string,
  model: string
): Promise<ClientPackEntry[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    console.warn("[pack-guard] DB unavailable (listClientPacks)");
    return [];
  }
  if (!clientId || !model) return [];

  const { data, error } = await supabase
    .from("agence_codes")
    .select("code, pack, expires_at, created_at, active, revoked")
    .eq("client_id", clientId)
    .eq("model", model)
    .not("pack", "is", null)
    .order("expires_at", { ascending: false });

  if (error) {
    console.warn("[pack-guard] listClientPacks error:", error.message);
    return [];
  }
  if (!data || data.length === 0) return [];

  const now = Date.now();
  return data.map((row) => {
    const expiresAt = row.expires_at as string;
    const expiresTs = new Date(expiresAt).getTime();
    const remainingMs = expiresTs - now;
    const remainingDays = Math.max(0, Math.ceil(remainingMs / 86_400_000));
    const isExpired = remainingMs <= 0;
    const isRevoked = row.revoked === true || row.active === false;
    let status: ClientPackEntry["status"] = "active";
    if (isRevoked) status = "revoked";
    else if (isExpired) status = "expired";

    return {
      packSlug: row.pack as string,
      code: row.code as string,
      expiresAt,
      createdAt: row.created_at as string,
      remainingDays,
      status,
    };
  });
}

/**
 * Retourne uniquement les pack slugs ACTIFS (validés, non expirés, non révoqués)
 * pour un client — utile pour filtrer un feed côté serveur sans ré-interroger
 * la DB par pack.
 */
export function extractActivePackSlugs(packs: ClientPackEntry[]): string[] {
  return packs.filter((p) => p.status === "active").map((p) => p.packSlug);
}

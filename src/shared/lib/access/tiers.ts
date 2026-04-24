/**
 * BRIEF-10 TICKET-AG07 — Helper hiérarchie d'accès fan
 *
 * Détermine le niveau d'accès runtime d'un fan basé sur la combinaison :
 * - age_certified (case cochée dans AgeGateModal)
 * - pseudo_insta / pseudo_snap (handle fourni via IdentityGate)
 * - access_level explicite en DB (validated/rejected par admin)
 *
 * Matrice (§ BRIEF-10) :
 *   anonymous       → profile_basic              | flirt_light
 *   major_visitor   → profile_basic + profile +  | flirt_hot
 *                     sensual (age certifié sans handle)
 *   pending_upgrade → idem major_visitor          | flirt_hot
 *                     (handle fourni, en attente admin)
 *   validated       → tout (packs + explicit)    | explicit
 *   rejected        → profile_basic uniquement   | flirt_light
 *
 * Utilisé côté serveur (API /api/messages, /api/packs) ET côté client
 * (UI /m/[slug] overlay packs, filter wall explicite).
 */

export type AccessLevel =
  | "anonymous"
  | "major_visitor"
  | "pending_upgrade"
  | "validated"
  | "rejected";

export type AllowedContent =
  | "profile_basic"
  | "profile"
  | "sensual"
  | "explicit"
  | "packs";

export type MaxAiTone = "flirt_light" | "flirt_hot" | "explicit";

export interface ClientForAccess {
  age_certified?: boolean | null;
  pseudo_insta?: string | null;
  pseudo_snap?: string | null;
  access_level?: AccessLevel | string | null;
  verified_handle?: string | null;
}

export interface AccessDecision {
  level: AccessLevel;
  allowedContent: AllowedContent[];
  maxAiTone: MaxAiTone;
}

/**
 * BRIEF-16 Phase B — décision enrichie avec la dimension "pack slug" (codes
 * actifs détenus par le client). Complémentaire à `allowedContent` qui
 * correspond au tier global. Les deux axes sont combinés côté API :
 *  - `allowedContent.includes("packs")` → fan peut acheter des packs
 *  - `allowedPackSlugs.includes(<slug>)` → fan a accès au contenu du pack
 */
export interface PackAwareAccessDecision extends AccessDecision {
  allowedPackSlugs: string[];
}

/**
 * Détecte si le fan a fourni un vrai handle (pas un pseudo auto-généré
 * type "visiteur-123" ou "guest-abc").
 */
function hasRealHandle(client: ClientForAccess): boolean {
  if (client.pseudo_insta && client.pseudo_insta.trim() !== "") return true;
  if (client.pseudo_snap && client.pseudo_snap.trim() !== "") {
    if (!/^(visiteur|guest)/i.test(client.pseudo_snap)) return true;
  }
  return false;
}

/**
 * Retourne la décision d'accès complète pour un client.
 *
 * Ordre de priorité :
 * 1. access_level explicit (validated/rejected) — admin a statué
 * 2. age_certified=false → anonymous (bloque tout hors profile_basic)
 * 3. age_certified=true sans handle → major_visitor
 * 4. age_certified=true + handle → pending_upgrade (en attente admin)
 */
export function computeAccessLevel(client: ClientForAccess): AccessDecision {
  // 1. Décision admin explicite en DB
  if (client.access_level === "validated") {
    return {
      level: "validated",
      allowedContent: [
        "profile_basic",
        "profile",
        "sensual",
        "explicit",
        "packs",
      ],
      maxAiTone: "explicit",
    };
  }
  if (client.access_level === "rejected") {
    return {
      level: "rejected",
      allowedContent: ["profile_basic"],
      maxAiTone: "flirt_light",
    };
  }

  // 2. Pas d'age gate validé → anonymous
  if (!client.age_certified) {
    return {
      level: "anonymous",
      allowedContent: ["profile_basic"],
      maxAiTone: "flirt_light",
    };
  }

  // 3 & 4. Age certifié : check si handle réel fourni
  if (!hasRealHandle(client)) {
    return {
      level: "major_visitor",
      allowedContent: ["profile_basic", "profile", "sensual"],
      maxAiTone: "flirt_hot",
    };
  }

  return {
    level: "pending_upgrade",
    allowedContent: ["profile_basic", "profile", "sensual"],
    maxAiTone: "flirt_hot",
  };
}

/**
 * Helper pratique : true si le fan peut accéder au contenu demandé.
 */
export function canAccess(
  client: ClientForAccess,
  content: AllowedContent
): boolean {
  return computeAccessLevel(client).allowedContent.includes(content);
}

// ══════════════════════════════════════════════════════════════════════════
//  BRIEF-16 Phase B — enrichissement pack-slug
// ══════════════════════════════════════════════════════════════════════════

/**
 * Cache mémoire in-process pour éviter N+1 sur le rendu page profil (un
 * composant par tier + compute access par rendu = 4-6 queries sinon).
 *
 * Key : `${clientId}:${model}` — Value : { slugs, expiresAt }
 * TTL : 30s (volontairement court — un code freshly generated doit apparaître
 * rapidement dans l'UI suivant la validation PayPal manual).
 */
const PACK_CACHE_TTL_MS = 30_000;
type CacheEntry = { slugs: string[]; expiresAt: number };
const packSlugsCache = new Map<string, CacheEntry>();

function cacheKey(clientId: string, model: string): string {
  return `${clientId}:${model}`;
}

/**
 * Invalide le cache pour un client+model donné. À appeler juste après
 * `fulfillPayment` ou `POST /api/codes action=create` pour que le profil
 * reflète immédiatement le nouveau pack.
 */
export function invalidatePackSlugsCache(clientId: string, model: string): void {
  packSlugsCache.delete(cacheKey(clientId, model));
}

/**
 * Vide entièrement le cache pack-slugs (utilisé en tests).
 */
export function clearPackSlugsCache(): void {
  packSlugsCache.clear();
}

/**
 * Calcule la décision d'accès COMPLÈTE pour un client, incluant les pack
 * slugs actifs (stricts) déduits de `agence_codes`.
 *
 * @param client  row client minimal (pour computeAccessLevel)
 * @param opts.clientId  UUID du client (pour query agence_codes)
 * @param opts.model     model_id (m1 / m2 / m3) ou slug (yumi / paloma / ruby)
 *
 * Si `clientId` ou `model` sont absents → retourne la décision standard sans
 * pack slugs (backwards compat).
 *
 * Cache 30s par (clientId, model) pour éviter N+1 côté SSR.
 */
export async function computePackAwareAccessLevel(
  client: ClientForAccess,
  opts: { clientId?: string | null; model?: string | null }
): Promise<PackAwareAccessDecision> {
  const baseDecision = computeAccessLevel(client);

  const clientId = opts.clientId?.trim();
  const model = opts.model?.trim();

  // Si pas de clientId ou model → pas de pack slugs (visiteur anonyme / guest)
  if (!clientId || !model) {
    return { ...baseDecision, allowedPackSlugs: [] };
  }

  // Lecture cache
  const key = cacheKey(clientId, model);
  const now = Date.now();
  const cached = packSlugsCache.get(key);
  if (cached && cached.expiresAt > now) {
    return { ...baseDecision, allowedPackSlugs: cached.slugs };
  }

  // Miss → query DB via listClientPacks (import dynamique pour éviter le cycle
  // tiers.ts → pack-guard.ts → supabase-server au niveau top-level dans les
  // contextes qui n'en ont pas besoin).
  let activeSlugs: string[] = [];
  try {
    const { listClientPacks, extractActivePackSlugs } = await import("./pack-guard");
    const packs = await listClientPacks(clientId, model);
    activeSlugs = extractActivePackSlugs(packs);
  } catch (err) {
    console.warn("[tiers] pack-guard query failed:", err);
    activeSlugs = [];
  }

  packSlugsCache.set(key, { slugs: activeSlugs, expiresAt: now + PACK_CACHE_TTL_MS });
  return { ...baseDecision, allowedPackSlugs: activeSlugs };
}

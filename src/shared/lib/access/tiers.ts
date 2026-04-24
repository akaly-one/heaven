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

/**
 * BRIEF-10 TICKET-AG05 — Persistance cookie age gate
 *
 * Cookie côté navigateur pour skip la modale à chaque session.
 * Validité : 30 jours (règle NB validée).
 * SameSite=Lax + path=/ → accessible partout, bloqué cross-site.
 *
 * Note : la vérité absolue reste en DB (agence_clients.age_certified).
 * Le cookie est juste un proxy rapide pour ne pas re-prompt le fan à
 * chaque reload. Si cookie effacé mais fan déjà certifié en DB, la
 * prochaine interaction re-valide côté serveur (IP hash match).
 */

const COOKIE_NAME = "heaven_age_certified";
const COOKIE_DAYS = 30;

/**
 * Set le cookie pour 30 jours. No-op côté serveur (SSR safe).
 */
export function setAgeCertifiedCookie(): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
  document.cookie = `${COOKIE_NAME}=1; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Vérifie si le cookie est présent. No-op côté serveur → false.
 */
export function hasAgeCertifiedCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${COOKIE_NAME}=1`));
}

/**
 * Supprime le cookie (utilisé sur révocation admin ou self-reset).
 */
export function clearAgeCertifiedCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`;
}

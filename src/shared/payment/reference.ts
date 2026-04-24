/* ══════════════════════════════════════════════
   Payment reference code — human-readable
   BRIEF-16 (2026-04-25) : format YUMI-PGLD-K3M9X2
   Base32 sans voyelles ambiguës pour lisibilité cockpit
   ══════════════════════════════════════════════ */

// Base32 sans voyelles ambiguës (évite A/E/I/O/U + 0/1 confondus avec O/I)
const ALPHABET = "23456789BCDFGHJKLMNPQRSTVWXYZ";

/**
 * Génère une référence human-readable pour flow manuel PayPal.me.
 * Format : {MODEL_UPPER}-P{PACK_UPPER}-{RAND6}
 * Ex : "YUMI-PGLD-K3M9X2", "PALOMA-PVIPBL-K7Z9WB"
 *
 * @param modelSlug slug modèle (yumi, paloma, ruby...) ou mN id
 * @param packSlug slug pack (silver, gold, vip_black, vip_platinum, custom)
 */
export function generateReferenceCode(modelSlug: string, packSlug: string): string {
  const model = modelSlug.toUpperCase().slice(0, 6);
  const pack = packSlug.toUpperCase().replace(/_/g, "").slice(0, 4);
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${model}-P${pack}-${rand}`;
}

/**
 * Parse une référence PayPal.me pour retrouver model + pack + rand.
 * Utilisé par cockpit pour afficher les infos du pending_payment.
 *
 * @returns null si format invalide
 */
export function parseReferenceCode(
  ref: string,
): { model: string; pack: string; rand: string } | null {
  const m = /^([A-Z]+)-P([A-Z]+)-([A-Z0-9]{6})$/i.exec(ref.trim());
  if (!m) return null;
  return {
    model: m[1].toLowerCase(),
    pack: m[2].toLowerCase(),
    rand: m[3].toUpperCase(),
  };
}

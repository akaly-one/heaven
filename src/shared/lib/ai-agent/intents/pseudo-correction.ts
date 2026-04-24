/**
 * BRIEF-16 Phase G (Agent IA) — détection intent "correction pseudo".
 *
 * Use case : un fan a payé un pack mais a renseigné le mauvais pseudo web.
 * Il recrée un compte avec le bon pseudo et envoie un message du style
 * « j'ai payé le pack Gold avec le pseudo @xxx mais je me suis trompé, voici
 * mon vrai pseudo @yyy, référence paiement: YUMI-P42-ABC123 ».
 *
 * L'agent IA doit :
 *   1. Reconnaître l'intent (ce détecteur).
 *   2. Tagger la conversation `pending_pseudo_correction` (caller responsibility).
 *   3. Injecter une alerte dans le system prompt pour proposer une réponse
 *      de compréhension + signaler à la modèle via event
 *      `heaven:pseudo-correction-detected` (caller responsibility).
 *
 * Le détecteur ne fait QUE du matching regex — pas de LLM call. Ça permet de
 * tourner à chaque ingestion message sans coût token.
 *
 * Log tag : `[pseudo-correction]`.
 */

export interface PseudoCorrectionMatch {
  /** `confidence >= 0.5` (seuil choisi après cas de test). */
  isCorrection: boolean;
  /** Référence paiement extraite (ex: `YUMI-PGLD-K3M9X2`). */
  referenceCode?: string;
  /** Ancien pseudo mentionné (sans préfixe `@`). */
  oldPseudo?: string;
  /** Pseudo du fan courant (celui qui envoie le message). */
  newPseudo?: string;
  /** 0..1 — somme pondérée des signaux. */
  confidence: number;
  /** Raisons déclenchées — utile pour debug + tests. */
  reasons: string[];
}

/**
 * Pattern référence : BRIEF-16 §4 décision NB — `{MODEL_SLUG_UPPER}-P{PACK_ID}-{RAND6}`
 * Exemples : `YUMI-PGLD-K3M9X2`, `PALOMA-PP42-ABC123`.
 *
 * On matche de manière tolérante :
 *  - préfix alphabétique (2-20 chars) = model upper
 *  - `-P` littéral (case-insensitive)
 *  - identifiant pack 1-10 chars alphanumériques
 *  - `-` + 4-10 chars random alphanumériques
 * Le `i` flag permet aux fans de coller la ref sans respecter la casse.
 */
const REF_CODE_RE = /\b([A-Z]{2,20}-P[A-Z0-9]{1,10}-[A-Z0-9]{4,10})\b/i;

/**
 * Mots-clés signalant une correction (FR + EN minimal). On évite les regex
 * trop larges type `change` (faux positifs sur "je change d'avis").
 */
const KEYWORD_RE =
  /\b(correct(?:ion)?|correcte?r|erreur|tromp(?:é|e)|mauvais\s+pseudo|faux\s+pseudo|mal\s+fourni|me\s+suis\s+plant(?:é|e)|wrong\s+(?:handle|username|pseudo)|changer?\s+(?:de\s+)?pseudo)\b/i;

/**
 * Ancien pseudo : on cherche des formes « ancien pseudo X », « avant X »,
 * « au lieu de @X », « previous was @X », « before @X ».
 * Capture le handle (sans `@`, 2-32 chars alphanumériques + `._-`).
 *
 * On accepte jusqu'à 3 mots optionnels entre le marqueur et le `@` (ex:
 * « previous was @oldAccount », « before it was @foo »). Si aucun `@` n'est
 * présent on prend le premier token "handle-like" qui suit directement.
 */
const OLD_PSEUDO_RE =
  /(?:ancien(?:\s+pseudo)?|avant|au\s+lieu\s+de|previous|before)(?:\s+\w+){0,3}\s+@([a-z0-9._-]{2,32})/i;

/**
 * Détecte si un message entrant est une correction de pseudo.
 *
 * @param messageContent contenu brut du message envoyé par le fan
 * @param currentPseudo  pseudo du fan courant (celui qui a envoyé le message)
 *
 * Pondération (total max = 1.0) :
 *   - 0.5 si un mot-clé correction est présent
 *   - 0.4 si une référence `XXX-PYY-ZZZZZZ` est détectée (signal le + fort)
 *   - 0.1 si un ancien pseudo est mentionné
 *
 * Seuil d'activation : `confidence >= 0.5`.
 */
export function detectPseudoCorrection(
  messageContent: string,
  currentPseudo: string
): PseudoCorrectionMatch {
  const reasons: string[] = [];
  const text = (messageContent || "").trim();

  if (!text) {
    return { isCorrection: false, confidence: 0, reasons: ["empty_message"] };
  }

  const hasKeyword = KEYWORD_RE.test(text);
  if (hasKeyword) reasons.push("keyword_match");

  const refMatch = REF_CODE_RE.exec(text);
  if (refMatch) reasons.push("ref_code_match");

  const oldPseudoMatch = OLD_PSEUDO_RE.exec(text);
  if (oldPseudoMatch) reasons.push("old_pseudo_match");

  const confidence =
    (hasKeyword ? 0.5 : 0) +
    (refMatch ? 0.4 : 0) +
    (oldPseudoMatch ? 0.1 : 0);

  const isCorrection = confidence >= 0.5;

  if (isCorrection) {
    console.log(
      "[pseudo-correction] detected",
      JSON.stringify({
        confidence,
        reasons,
        ref: refMatch?.[1] ? `${refMatch[1].slice(0, 8)}...` : null,
      })
    );
  }

  const result: PseudoCorrectionMatch = {
    isCorrection,
    confidence,
    reasons,
    newPseudo: currentPseudo || undefined,
  };
  if (refMatch) result.referenceCode = refMatch[1].toUpperCase();
  // Normalisation pseudo : toujours lowercase pour matching ultérieur avec
  // pseudo_insta / pseudo_snap stockés en lowercase dans agence_clients.
  if (oldPseudoMatch) result.oldPseudo = oldPseudoMatch[1].toLowerCase();
  return result;
}

/**
 * Formate l'alerte à injecter dans le system prompt de l'agent IA quand une
 * correction est détectée. Gardé très court pour ne pas perturber la persona.
 */
export function formatPseudoCorrectionAlert(
  match: PseudoCorrectionMatch
): string {
  if (!match.isCorrection) return "";
  const parts: string[] = [
    "ALERTE CORRECTION PSEUDO :",
    "Le client signale probablement une erreur de pseudo sur un paiement précédent.",
  ];
  if (match.referenceCode) {
    parts.push(`Référence paiement mentionnée : ${match.referenceCode}.`);
  }
  if (match.oldPseudo) {
    parts.push(`Ancien pseudo indiqué : @${match.oldPseudo}.`);
  }
  if (match.newPseudo) {
    parts.push(`Pseudo actuel (nouveau compte) : @${match.newPseudo}.`);
  }
  parts.push(
    "Réponds avec empathie, rassure qu'on va vérifier, et indique que la modèle validera manuellement la correction. N'invente jamais de code ni de validation."
  );
  return parts.join("\n");
}

/**
 * Event dispatch helper — appelable dans un browser ctx. Ne JAMAIS l'appeler
 * côté serveur (pas de window). Les callers serveur utilisent la DB update
 * sur `agence_clients.pending_pseudo_correction` puis la UI cockpit observe
 * la row via Supabase realtime.
 */
export const PSEUDO_CORRECTION_EVENT = "heaven:pseudo-correction-detected";

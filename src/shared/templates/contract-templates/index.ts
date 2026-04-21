// ══════════════════════════════════════════════════════════════════════════
// contract-templates — Internal templates for Agence ↔ Modele contracts.
//
// P0 Confidentialite : ces templates restent LOCAUX. Ne jamais les exposer
// via API publique ni les commiter avec de vraies donnees modele.
//
// Les blocs sont parametrables par :
//   - Mode       : 'A' | 'B' | 'C'
//   - IdentityPlan : 'discovery' | 'shadow'
//   - Palier     : 'P1' | 'P2' | 'P3' | 'P4'
//   - Statut     : 'salariee' | 'etudiante' | 'chomage' | 'sans_activite' | 'pensionnee'
//
// Les placeholders {{PSEUDO}}, {{MODEL_ID}}, {{DATE_SIGNATURE}} sont remplaces
// a la generation. Les vrais prenoms/nom legal ne sont JAMAIS embarques dans
// le markdown ; ils passent par le champ chiffre `signer_legal_name`.
// ══════════════════════════════════════════════════════════════════════════

export type ContractMode = "A" | "B" | "C";
export type ContractIdentityPlan = "discovery" | "shadow";
export type ContractPalier = "P1" | "P2" | "P3" | "P4";
export type ContractStatut =
  | "salariee"
  | "etudiante"
  | "chomage"
  | "sans_activite"
  | "pensionnee";

export interface ContractGenInput {
  mode: ContractMode;
  identity_plan: ContractIdentityPlan;
  palier: ContractPalier;
  statut_initial?: ContractStatut;
  pseudo: string;
  model_id: string;
  date_signature: string;
  version: number;
  amendment_reason?: string;
}

// Clause de remuneration par palier
const PALIER_CLAUSES: Record<ContractPalier, string> = {
  P1: `Palier P1 (Test — revenu brut < 1 000 €/an). Voie fiscale : droit à l'image / profits divers occasionnels. Paiement via note de paiement signée.`,
  P2: `Palier P2 (Démarrage — 1-9 k€/an). Voie fiscale : droit à l'image (régime mobilier). Paiement mensuel sur note de paiement.`,
  P3: `Palier P3 (Structuration — 9-20 k€/an). Voie fiscale : indépendante complémentaire BE (INASTI). Paiement sur facture.`,
  P4: `Palier P4 (Pro — > 20 k€/an). Voie fiscale : indépendante renforcée avec TVA. Paiement sur facture TVA, déclarations trimestrielles.`,
};

// Clause identity plan
const IDENTITY_CLAUSES: Record<ContractIdentityPlan, string> = {
  discovery: `Plan Identité : **Découverte**. Visage et image visibles. Identité légale, adresse et entourage strictement protégés. Aucune publication de données personnelles hors pseudo.`,
  shadow: `Plan Identité : **Shadow**. Visage, tatouages, cicatrices, arrière-plan reconnaissable masqués ou floutés systématiquement. Surcoût production +15 à 25% acté (anonymisation technique).`,
};

// Clause mode
const MODE_CLAUSES: Record<ContractMode, string> = {
  A: `Mode A — Studio IA pur. Le profil {{PSEUDO}} est une persona créée et opérée par SQWENSY. Aucun revenu reversé à un tiers modèle physique.`,
  B: `Mode B — Hub annexe modèle. La modèle accepte que SQWENSY publie son contenu sur les comptes agence via Release Form signé. Partage 70% modèle / 30% SQWENSY du net distribuable.`,
  C: `Mode C — Services B2B. SQWENSY prestataire tech/stratégique. La modèle conserve pleine propriété de ses comptes plateformes. Rémunération SQWENSY = setup + subscription + % croissance convenu séparément.`,
};

// Clause statut juridique (alerte si chomage)
const STATUT_CLAUSES: Record<ContractStatut, string> = {
  salariee: `Statut initial déclaré : salariée. Activité en cumul autorisé selon contrat employeur principal.`,
  etudiante: `Statut initial déclaré : étudiante. Régime étudiant-indépendant (BE) applicable au-delà des seuils P3.`,
  chomage: `Statut initial déclaré : chômage. **PRÉREQUIS BLOQUANT** — vérification ONEM/CAPAC Article 48 obligatoire avant tout revenu. Onboarding bloqué tant que \`statut_initial_verified\` = false.`,
  sans_activite: `Statut initial déclaré : sans activité. Aucun cumul à gérer.`,
  pensionnee: `Statut initial déclaré : pensionnée. Plafond cumul revenu applicable selon règlement ONP/CAPAC.`,
};

export function generateContractMarkdown(input: ContractGenInput): string {
  const {
    mode,
    identity_plan,
    palier,
    statut_initial,
    pseudo,
    model_id,
    date_signature,
    version,
    amendment_reason,
  } = input;

  const statutClause = statut_initial
    ? STATUT_CLAUSES[statut_initial]
    : "Statut initial non renseigné — à compléter avant signature.";

  return `# Contrat Agence ↔ Modèle — Version ${version}

**Pseudo modèle** : ${pseudo}
**ID interne** : ${model_id}
**Date de génération** : ${date_signature}
${amendment_reason ? `**Motif avenant** : ${amendment_reason}\n` : ""}
---

## Article 1 — Parties

Le présent contrat est conclu entre SQWENSY (la « Société ») et la personne signataire ci-dessous
(la « Modèle », pseudo **${pseudo}**).

L'identité légale de la Modèle est enregistrée séparément de ce document dans le champ chiffré
\`signer_legal_name\` (pgsodium, AES-256). Ce contrat n'expose que le pseudo.

## Article 2 — Mode opérationnel

${MODE_CLAUSES[mode]}

## Article 3 — Plan Identité

${IDENTITY_CLAUSES[identity_plan]}

## Article 4 — Palier de rémunération

${PALIER_CLAUSES[palier]}

Bascule automatique de palier : dès 3 mois consécutifs > 750 €/mois, escalade au palier supérieur
après confirmation admin (workflow \`agence_palier_history\`).

## Article 5 — Statut juridique et fiscal

${statutClause}

## Article 6 — Propriété intellectuelle et consentement

La Modèle reconnaît avoir signé le Release Form DMCA nécessaire à la publication sur les plateformes
adulte (Fanvue / OnlyFans / MYM). Le retrait de consentement est un droit inaliénable (RGPD Art. 7)
exerçable à tout moment via le canal \`agence_consent_log\`.

## Article 7 — Rémunération et paiement

Conformément au palier actif (voir Article 4), les paiements sont calculés selon la vue matérialisée
\`agence_commission_calcul\` (brut → net distribuable → 70% modèle / 30% SQWENSY en Mode B,
100% SQWENSY en Mode A, accord séparé en Mode C).

## Article 8 — Protection des données

- Identité légale chiffrée (pgsodium)
- Documents DMCA bucket privé \`dmca-dossiers\` (URLs signées 15 min)
- Ce contrat stocké bucket privé \`contracts-private\` (versioning append-only)
- Scope RLS requis : \`contract:view\`

## Article 9 — Résiliation

Soit des parties peut résilier moyennant préavis de 30 jours. Retrait immédiat du contenu sur
demande de la Modèle sous 7 jours (RGPD Art. 7), confirmé par écrit.

## Article 10 — Droit applicable

Droit belge. Tribunal de Bruxelles compétent.

---

**Signé à** _________________________  **le** ${date_signature}

**Pour SQWENSY** : ______________________

**Pour la Modèle** (${pseudo}) : ______________________

> Document version ${version} — référence bucket \`contracts-private\`.
`;
}

# PALOMA — Plan de collaboration Heaven

> **STRICTEMENT CONFIDENTIEL — silo Heaven.** Ce document vit dans le repo `clients/heaven/` (déploiement `heaven-os.vercel.app`) et n'est jamais référencé depuis `sqwensy-os` public. Paloma = id interne (aucun vrai prénom). Référence Masterplan Heaven : `./HEAVEN-MASTERPLAN-2026.md`.
>
> **Date de figeage : 2026-04-18**

---

## Disclaimer juridique (à lire AVANT toute action)

Ce document est un **plan indicatif** basé sur les règles publiques ONEM/INASTI connues au 18 avril 2026. Il ne remplace pas un avis professionnel.

**NB DOIT obligatoirement, AVANT tout démarrage de la collaboration :**
1. Consulter un **comptable BE** ou **avocat en droit social BE** pour valider le statut retenu pour Paloma.
2. Faire rédiger/relire le **contrat de collaboration** par un avocat.
3. Valider avec Paloma que la démarche ONEM a été effectuée et **acceptée par écrit** avant le premier contenu.

Aucune rémunération ne doit circuler entre NB et Paloma avant ces 3 validations.

---

## Sommaire

1. Statut juridique BE — analyse des 4 options
2. Contrat de collaboration NB ↔ Paloma (template)
3. Process opérationnel mensuel
4. Plan évolutif graduel (Phases 0 → 4)
5. Sécurité & confidentialité Paloma
6. Budget & projections 2026-2027
7. Documents annexes à créer
8. Risques & mitigations
9. Entrée CHANGELOG (à coller dans `clients/heaven/CHANGELOG.md`)

---

## 1. Statut juridique BE — analyse approfondie

### Constat préalable critique

Paloma est **DÉJÀ au chômage** au moment où la collaboration démarre. Or la règle ONEM (T41) impose : *« Pour pouvoir continuer une activité exercée à titre accessoire pendant le chômage, vous devez avoir déjà exercé cette activité pendant au moins 3 mois avant votre demande d'allocations. »*

Conséquence directe : **l'Option A "pure activité accessoire"** (article 48 arrêté royal 25/11/1991) n'est **pas ouverte** à Paloma car elle n'exerçait pas cette activité avant son entrée au chômage. Le dispositif correct qui s'applique à son cas est le **« Tremplin-indépendants »** — conçu précisément pour permettre à un chômeur complet de **démarrer** une activité indépendante à titre accessoire tout en gardant ses allocations, pendant **12 mois maximum**.

### Option A — Tremplin-indépendants (12 mois) — **RECOMMANDÉ**

**Cadre** : Paloma, chômeuse complète indemnisée, démarre une activité indépendante complémentaire *et* bénéficie du dispositif "Tremplin-indépendants" (12 mois, non renouvelable).

**Conditions** :
- Déclaration préalable écrite à l'ONEM via l'organisme de paiement (CAPAC, FGTB, CSC, CGSLB) **avant** le début de l'activité. Formulaire ONEM Tremplin-indépendants (à vérifier nom exact avec l'organisme de paiement).
- Activité exercée pendant l'inscription comme demandeur d'emploi, disponible sur le marché du travail.
- Durée : 12 mois consécutifs maximum.
- Inscription comme **indépendant complémentaire** auprès d'une caisse d'assurances sociales (Partena, Acerta, Securex, Xerius, Liantis, UCM…).
- Cotisations sociales : **exonération possible** les 4 premiers trimestres si revenus < ~1.621,72 €/an (primo-starter) ; sinon cotisations minimales réduites (indépendant complémentaire < 1.865,45 €/an = 0 cotisation). Au-delà, ~20,5 % des revenus nets.
- Affiliation TVA si CA > 25.000 €/an (sinon régime franchise PME art. 56bis CTVA).

**Seuil journalier 2026 (au 01.03.2026)** :
- Revenu net imposable journalier = revenu annuel net / 312.
- Portion au-dessus de **18,08 €/jour nets** → réduit proportionnellement l'allocation journalière.
- Exemple : 17.000 €/an nets → 54,48 €/jour → 36,40 €/jour au-dessus du seuil → allocation journalière quasi-nulle sur cette portion.

**Impact pratique pour Paloma** : si elle génère **moins de ~5.640 €/an nets** (= 18,08 × 312), l'allocation reste **intégrale**. Entre 5.640 € et ~13.000 €/an nets, l'allocation est partielle. Au-dessus, l'allocation chute fortement ou passe à zéro.

**Avantages** :
- Paloma conserve la sécurité du statut chômage 12 mois.
- Statut indépendant complémentaire = TVA + facturation légales → paiement Wise propre et traçable.
- Transition douce vers indépendant complet si le business prend.
- Déclaration simple (1 formulaire + 1 caisse sociale).

**Risques** :
- Durée limitée à 12 mois : après, soit Paloma devient indépendante principale, soit elle cesse l'activité.
- Contrôle ONEM possible sur volume et horaires (activité "hors heures normales de travail" — soir/weekend).
- Dépassement seuil → réduction allocation.

### Option B — Sortie chômage + statut indépendant principal

**Cadre** : Paloma renonce à ses allocations et s'inscrit comme indépendante à titre principal.

**Coûts mensuels** :
- Caisse assurances sociales : cotisations minimales ~**85-90 €/mois** la 1ère année (puis ajustement sur revenus réels 3 ans plus tard).
- Caisse sociale fee : ~15-25 €/trimestre selon caisse.
- Mutuelle indépendant (obligatoire).
- Comptable forfait : ~50-150 €/mois selon volume factures.

**Avantages** :
- Plafond de revenus illimité.
- Possibilité SRL ultérieurement.
- Pas de contrôle ONEM.

**Risques** :
- Perte du filet chômage : si l'activité ne décolle pas, aucun revenu de remplacement (sauf « droit passerelle » sous conditions strictes).
- Pression de production immédiate.
- Si revenus faibles < 1.865 €/an, cotisations minimales à payer quand même (hors primo-starter).

### Option C — Échange en nature (contenu contre service)

**Risque fiscal** : tout échange de valeur économique = revenu imposable au sens de l'art. 49 CIR 92, même sans flux monétaire. **Fortement déconseillé** sauf cas très limité (ex : Paloma paye un vêtement/accessoire contre 1 photo ponctuelle — pas une collaboration régulière).

**Verdict** : à **écarter** pour une collaboration régulière et récurrente.

### Option D — « Petit indépendant » / régime forfaitaire

Contrairement à la France (micro-entrepreneur), **la Belgique n'a pas d'équivalent direct**. Les régimes proches sont :
- **Régime de franchise TVA** (CA < 25.000 €/an) → pas de TVA à facturer, mais oblige quand même statut indépendant + cotisations sociales.
- **Article 17 / économie collaborative** : plafonds très bas (~7.460 €/an en 2026) et exclut explicitement les prestations artistiques rémunérées type contenu adulte.

**Verdict** : à **écarter** pour Paloma.

### Recommandation finale argumentée

**Option A — Tremplin-indépendants — pendant 12 mois (juin 2026 → mai 2027)**, puis transition vers **Option B** si l'activité dépasse 1.500 €/mois nets 3 mois d'affilée, ou cessation si en dessous.

**Pourquoi** :
- Couvre légalement le cas "chômeuse qui démarre une activité" (alors que la pure activité accessoire art. 48 non applicable).
- Rémunération via facturation indépendante → paiement Wise propre.
- 12 mois pour stabiliser le modèle et décider.
- Filet de sécurité chômage conservé.

**Checklist avant démarrage Option A** :
- [ ] Paloma prend RDV avec son organisme de paiement (CAPAC, FGTB, CSC, CGSLB) pour déclarer Tremplin-indépendants.
- [ ] Paloma ouvre numéro BCE et s'affilie à une caisse sociale.
- [ ] Paloma vérifie seuil franchise TVA (rester < 25.000 €/an en 2026-2027).
- [ ] NB consulte comptable BE pour valider la chaîne et structurer côté SQWENSY.
- [ ] NB et Paloma signent contrat collaboration (cf. section 2).

**Disclaimer rappelé** : ces chiffres (18,08 €/jour, 25.000 €/an franchise TVA, cotisations 85-90 €) sont indicatifs au 18/04/2026. **Paloma et NB doivent les faire confirmer par comptable BE avant démarrage**. Les montants indexés peuvent changer au 01.01.2027.

---

## 2. Contrat de collaboration NB ↔ Paloma (template)

> **Rédaction finale à confier à un avocat BE**. Le template ci-dessous est une trame structurelle.

### 2.1 Identification des parties

- **Partie A — Client** : NB, agissant en nom propre ou via SQWENSY (selon décision NB et comptable). Adresse fiscale BE. Numéro BCE SQWENSY.
- **Partie B — Prestataire** : Paloma (identité civile complète sur contrat papier physique uniquement), domiciliée à [ville BE], numéro BCE à compléter après inscription, statut indépendant complémentaire (Tremplin-indépendants).

Le contrat **papier signé** contient le vrai nom légal. Les copies digitales (PDF signé) sont **chiffrées GPG** et stockées côté NB uniquement (coffre-fort physique + backup chiffré offline). **Aucune version non chiffrée ne circule par email ou cloud.**

### 2.2 Objet de la collaboration

Création de contenus visuels et audiovisuels (photo, vidéo, audio) destinés à être publiés par NB sur son profil **Fanvue personnel** et sur les canaux numériques que NB désigne par écrit (liste exhaustive annexée au contrat, modifiable par avenant).

### 2.3 Modalités de production

- **Formats** : photo sets (séries 5-20 images), vidéos courtes (30s-3min), audio (à la demande).
- **Volume mensuel indicatif** : 4 photo sets + 2 vidéos (ajustable d'un commun accord par avenant mensuel).
- **Lieu de production** : studio privé sécurisé (chez NB ou location ponctuelle). Jamais lieu public ni identifiant lié à l'identité civile de Paloma.
- **Matériel** : NB fournit appareil photo, éclairage, accessoires. Paloma fournit garde-robe ou accepte styling proposé.
- **Planning** : shoots programmés au moins 7 jours à l'avance par mail ou message chiffré.

### 2.4 Droits et propriété intellectuelle

- **Cession exclusive** à NB des droits patrimoniaux sur les contenus livrés pour **usage Fanvue + canaux désignés**.
- **Durée** : 5 ans à compter de chaque livraison, renouvelable par tacite reconduction annuelle sauf dénonciation par écrit.
- **Territoire** : monde entier.
- **Droit moral** : Paloma conserve le droit moral (intégrité de l'œuvre, opposition à modification déformante).
- **Limites d'usage NB** : interdiction d'usage hors canaux désignés sans accord écrit de Paloma (pas de revente à tiers, pas de licence aux plateformes concurrentes).
- **Retrait** : en cas de rupture, Paloma peut demander le retrait complet des contenus dans les **90 jours**. NB s'engage à retirer/archiver de Fanvue + détruire les backups non nécessaires à la comptabilité/légal.

### 2.5 Rémunération — 3 variantes au choix

**Variante 1 — Forfait par livrable (Phase 1)**
- Photo set : 150-250 € net / livrable selon complexité.
- Vidéo courte : 200-500 € net / livrable.
- Paiement mensuel sur facture.

**Variante 2 — Pourcentage sur revenus Fanvue générés (Phase 2+)**
- 30 à 40 % des revenus nets Fanvue (après fees Fanvue ~20 %) générés par les contenus de Paloma.
- Traçabilité : tag interne par contenu dans dashboard Heaven + export mensuel transparent à Paloma.
- Paiement mensuel à M+30 jours après réception payout Fanvue.

**Variante 3 — Mix forfait + bonus performance (recommandée)**
- Forfait minimum garanti : 300-500 € / mois (même si contenus performent peu).
- Bonus : 25 % des revenus Fanvue nets au-delà d'un seuil de 1.000 €/mois.
- Stabilité revenu Paloma + incitation performance alignée.

**Paiement** : virement Wise Business SQWENSY → IBAN BE de Paloma. Délai 30 jours max après réception facture conforme.

**Facturation** : Paloma émet **facture mensuelle** conforme (mentions légales BE + numéro BCE + TVA si applicable, sinon mention franchise art. 56bis). Template fourni (cf. section 7).

### 2.6 Confidentialité

- Identité civile de Paloma **non divulgable** publiquement. Pseudo `paloma` utilisé partout (Fanvue, Heaven, docs).
- NB s'engage à ne **jamais** associer publiquement Paloma à SQWENSY ni aux branches Brands/Studio/Agence/Privé.
- Clauses NDA mutuelles : backstage (photos shoot, contrats, factures, conversations privées) = confidentiel indéfiniment.
- Sanction contractuelle : en cas de fuite volontaire d'une partie, pénalité forfaitaire + dommages & intérêts à fixer avec avocat.

### 2.7 Limites de contenu (hard limits)

- **Hard limits Paloma** (liste personnalisée annexée, confidentielle) : actes refusés, sujets refusés, partenaires refusés.
- **Hard limits NB** : qualité minimale technique, ton éditorial compatible Fanvue (conforme TOS Fanvue pour éviter bannissement).
- **Right to refuse** : chaque partie peut refuser un contenu avant publication sans justification ni pénalité.

### 2.8 Sécurité personnelle

- Lieu shoot privé/sécurisé, pas de témoin non signataire NDA.
- Aucune donnée personnelle Paloma publique (vrai nom, adresse, téléphone, email perso, géolocalisation EXIF photos).
- Procédure harcèlement fan : escalade immédiate à NB, NB prend la main sur la conversation Fanvue, blocage/signalement.
- Assurance RC professionnelle souscrite par la caisse sociale de Paloma (vérifier à l'affiliation).

### 2.9 Durée et résiliation

- **Période d'essai** : 3 mois à compter de la première facture réglée.
- **Durée initiale** : 9 mois après essai (= aligné sur fin Tremplin-indépendants).
- **Renouvellement** : tacite par période de 6 mois, sauf dénonciation 30 jours avant échéance.
- **Préavis résiliation ordinaire** : 30 jours par mail avec accusé réception.
- **Résiliation immédiate** : manquement grave (fuite confidentialité, contenu interdit, non-paiement > 60 jours).
- **Post-rupture** : droit retrait contenu (90 jours max), archivage Fanvue selon clause 2.4, confidentialité perpétuelle.

### 2.10 Litiges

- **Droit applicable** : droit belge.
- **Médiation préalable obligatoire** : 60 jours avant toute action judiciaire, via un médiateur agréé BE.
- **Juridiction** : tribunal de Bruxelles francophone en cas d'échec médiation.

---

## 3. Process opérationnel mensuel

### Workflow type (cycle mensuel)

**Semaine 1 — Brief**
- NB prépare brief contenu via document partagé chiffré : 4 sets + 2 vidéos, thèmes, outfit, ambiance, basé sur trends Fanvue + demandes fans actives.
- Validation Paloma : accepte / propose ajustements sous 48 h.

**Semaine 2 — Production**
- 1 à 2 sessions shoot en studio privé (3-6 heures chacune).
- NB ou prestataire externe sous NDA = photographe.
- Backup brut chiffré immédiat sur disque local NB (pas de cloud public).

**Semaine 3 — Édition & validation**
- NB édite (Lightroom + Premiere). Délégation possible à éditeur sous NDA.
- Watermark discret pour dissuader repiratage.
- **Validation obligatoire Paloma** sur chaque contenu avant publication (right of approval).

**Semaine 4 — Publication & facturation**
- Publication Fanvue selon calendrier optimisé (tests timezone fans).
- Pricing PPV décidé par NB (basé analytics).
- Paloma émet facture du mois (montant selon variante rémunération).
- NB paye via Wise → IBAN Paloma sous 30 jours.

### Reporting transparent mensuel (obligatoire)

NB envoie à Paloma chaque mois (15 du mois suivant) :
- Liste des contenus publiés avec tag interne.
- Revenu brut Fanvue généré par ses contenus.
- Fees Fanvue déduites.
- Revenu net calculé.
- Part Paloma calculée selon variante rémunération.
- Dashboard Heaven privé avec historique 12 mois glissants.

Cette transparence **élimine le ressentiment** et aligne les incitations.

---

## 4. Plan évolutif graduel

### Phase 0 — Mai 2026 : Validation juridique (AVANT tout démarrage)

- [ ] NB consulte comptable BE ou avocat droit social BE (budget 200-400 € consultation initiale).
- [ ] Paloma prend RDV organisme de paiement pour déclarer Tremplin-indépendants (gratuit).
- [ ] Paloma obtient numéro BCE + s'affilie caisse sociale (gratuit démarrage, cotisations au trimestre).
- [ ] Rédaction contrat par avocat (budget 300-600 €).
- [ ] Signature contrat **papier** en double original, stockage coffre-fort NB + coffre-fort Paloma.
- [ ] Paloma émet **facture blanche test 1 €** pour valider chaîne Wise → IBAN BE.
- [ ] Mise à jour `clients/heaven/CHANGELOG.md` entrée Phase 0 validée.

**Exit criteria Phase 0** : contrat signé + ONEM validé par écrit + affiliation caisse sociale confirmée + facture test payée.

### Phase 1 — Juin 2026 : Premier mois de production

- 2 photo sets test publiés sur profil Fanvue NB.
- Rémunération Variante 1 (forfait) : 2 × 200 € = **400 € payés**.
- Mesure des premières recettes Fanvue sur 30 jours.
- Ajustement pricing PPV selon conversion.
- Retour d'expérience Paloma sur process (shoot, validation, timing) → ajustements.
- Première facture réelle Paloma → paiement Wise sous 30 j.

**Exit criteria Phase 1** : 2 sets livrés + 1 facture payée + 0 incident sécurité/confidentialité.

### Phase 2 — Q3 2026 : Stabilisation du rythme

- Calendrier régulier : **4 sets + 2 vidéos / mois**.
- Passage progressif à **Variante 3** (forfait + bonus) : 400 € min garanti + 25 % au-delà de 1.000 € revenus nets.
- Tracking revenu net par contenu dans Supabase Heaven DB (table `fanvue_revenue_by_content`, à créer).
- Premier reporting mensuel transparent envoyé à Paloma.
- Alerte automatique seuil ONEM : si cumul revenus mensuels Paloma approche 470 €/mois nets (= ~18 €/jour × ~26 jours ouvrés), notification NB + décision gel temporaire ou bascule Option B.

**Exit criteria Phase 2** : 3 mois consécutifs de production stable + 0 dépassement seuil ONEM imprévu.

### Phase 3 — Q4 2026 : Optimisation & décision de bascule

- Analyse 6 mois de données : revenu mensuel moyen Paloma, revenu mensuel moyen NB profil Fanvue, marge.
- **Décision stratégique** :
  - Si revenu Paloma > 1.500 €/mois nets sur 3 mois consécutifs → **proposer Option B (indépendant principal)** pour lever le plafond Tremplin.
  - Si revenu Paloma < 500 €/mois → maintenir Option A jusqu'à fin 12 mois + évaluer reconduction différente.
  - Si entre les deux → maintenir Option A + pousser volume.
- Recrutement éventuel Ruby sur même template contractuel (si Ruby confirmée humaine réelle).
- Préparation fiscale 2026 : export comptable Wise + déclaration IPP Paloma + SQWENSY.

**Exit criteria Phase 3** : décision bascule actée par écrit + comptable BE consulté sur transition.

### Phase 4 — 2027 : Maturité & structuration

- Si volume Heaven justifie (> 60 000 €/an CA Heaven) → envisager **SRL Heaven séparée** (NB + Paloma + Ruby = prestataires de la SRL, pas associés).
- Comptabilité dédiée Heaven via comptable BE spécialisé secteur créateurs.
- Audit fiscal annuel externe.
- Révision annuelle du contrat collaboration (indexation rémunération, clauses, limites).
- Si Paloma souhaite devenir associée SRL → avenant spécifique + structuration capital (hors scope ce plan, nouveau doc dédié à créer).

---

## 5. Sécurité & confidentialité Paloma

### Où le vrai nom de Paloma peut apparaître (autorisé)

- Contrat papier signé physique → coffre-fort NB + coffre-fort Paloma.
- Factures mensuelles PDF → **chiffrées GPG** (clé NB + clé Paloma), stockage local offline + backup chiffré.
- Compte Wise Business (bénéficiaire IBAN) → accès 2FA TOTP obligatoire, aucun partage écran.
- Déclarations fiscales BE (IPP Paloma, comptabilité SQWENSY).
- Dossier ONEM/caisse sociale Paloma (côté Paloma uniquement).

### Où le vrai nom NE DOIT JAMAIS apparaître

- Code source (monorepo `heaven-os`, `sqwensy-os`, aucun repo).
- Tables DB (Supabase Heaven, Supabase main).
- Workflows n8n, logs, webhooks.
- Commits git, messages de commit, branches, tags.
- Fichiers Drive/Dropbox/iCloud non chiffrés.
- MEMORY.md, plans/*.md, docs/*.md (tous fichiers plan).
- Conversations Slack/Discord/Telegram (sauf messagerie chiffrée E2E avec Paloma directement).
- Emails non chiffrés.

### Pseudo `paloma` — usage

- Pseudo public Fanvue + Heaven + toute communication fan.
- Identifiant interne DB : `paloma`.
- Cockpit accès via code `paloma-code`.

### Backstage photos shoot

- Stockage **local chiffré** (disque dur macOS FileVault + Time Machine chiffré).
- Aucun upload cloud public (pas iCloud Photos, pas Google Photos).
- Upload Cloudinary uniquement sur dossier privé avec signed URLs.
- Purge rushes non retenus après 90 jours.

### Right to be forgotten

En cas de rupture ou demande écrite de Paloma :
- Suppression Fanvue sous 90 jours.
- Suppression Cloudinary dossier dédié sous 30 jours (sauf contenus publiés gardés pour compta 10 ans légaux, mais dépubliés).
- Suppression backups locaux non-légaux sous 90 jours.
- Attestation écrite signée NB confirmant purge.

### Anti-piratage

- Watermark discret invisible (type Digimarc) sur tous contenus publiés.
- Monitoring régulier via Rulta, Batdongle, Pirate Check (budget 50-100 €/mois Phase 2+).
- DMCA takedown automatisé dès détection fuite.
- Clause contrat Paloma : NB prend en charge tous frais DMCA.

---

## 6. Budget & projections 2026-2027

### Hypothèses de base

- Profil Fanvue NB commence à ~200 abonnés fin juin 2026 (trafic Heaven/Instagram).
- ARPU Fanvue standard : 8-15 $/mois abonné + PPV ponctuels.
- Croissance mensuelle : +15-25 % M/M premiers 6 mois, puis +5-10 %.
- Fees Fanvue : 20 % plateforme + ~5 % processing.

### Projection mensuelle 2026-2027

| Mois | Volume livrables Paloma | Modèle rém. Paloma | Coût NB (Paloma) | Revenu Fanvue NB profil (brut $) | Revenu net NB ($) | Marge NB nette ($) |
|---|---|---|---|---|---|---|
| Mai 2026 | 0 (validation juridique) | — | 0 € | 0 | 0 | 0 |
| Juin 2026 | 2 sets test | V1 forfait 200 €×2 | 400 € | 500 | 375 | ~0 (break-even test) |
| Juil 2026 | 4 sets + 2 vidéos | V1 forfait | 800 € | 1.000 | 750 | ~-50 € |
| Août 2026 | 4 sets + 2 vidéos | V1 forfait | 800 € | 1.400 | 1.050 | +250 € |
| Sept 2026 | 4 sets + 2 vidéos | V3 mix | 500 € forfait + 0 bonus | 1.800 | 1.350 | +850 € |
| Oct 2026 | 4 sets + 2 vidéos | V3 mix | 500 € + 150 € bonus | 2.400 | 1.800 | +1.150 € |
| Nov 2026 (Black Friday) | 6 sets + 3 vidéos | V3 mix | 700 € + 300 € bonus | 3.500 | 2.625 | +1.625 € |
| Déc 2026 | 4 sets + 2 vidéos | V3 mix | 500 € + 250 € bonus | 3.200 | 2.400 | +1.650 € |
| Q1 2027 moy | 4 sets + 2 vidéos | V3 mix | 550 €+300 € bonus | 3.600 | 2.700 | +1.850 € |
| Q2 2027 moy | 5 sets + 3 vidéos | V3 mix ou bascule V2 | 700 €+400 € bonus ou 35% | 4.500 | 3.375 | +2.275 € |

**Décision bascule Option A → B** : si mi-2027 le revenu Paloma dépasse 1.500 €/mois nets 3 mois d'affilée, sortie Tremplin obligatoire de toute façon à 12 mois → bascule Option B prévue.

### Coûts structurels annuels (hors rémunération Paloma)

| Poste | Coût annuel | Notes |
|---|---|---|
| Comptable BE (Heaven) | 1.200-2.400 € | Forfait 100-200 €/mois |
| Avocat initial (contrat) | 500-800 € | One shot Phase 0 |
| Consultations ponctuelles avocat | 200-500 €/an | Avenants, litiges |
| Outils anti-piratage | 600-1.200 € | Rulta/Batdongle Phase 2+ |
| Hébergement Cloudinary Heaven | 240-480 € | Selon volume |
| Studio location ponctuelle | 500-1.500 € | Si shoots hors NB |
| Matériel (light, accessoires) | 800-1.500 € | One shot 2026 |
| **Total hors Paloma** | **4.040 - 8.380 €/an** | |

### Seuil de rentabilité

Point mort NB (profil Fanvue) = ~600 €/mois revenus nets Fanvue pour couvrir 500 €/mois Paloma + 100 €/mois frais structurels. Atteint **dès mois 2-3** selon projections. Rentabilité nette positive **dès mois 4**.

---

## 7. Documents annexes à créer

- [ ] **Template contrat collaboration BE** — Word/PDF, validation avocat, 15-25 pages. Stockage : `clients/heaven/plans/templates/CONTRACT-PALOMA-TEMPLATE.docx` (chiffré GPG).
- [ ] **Template facture Paloma → SQWENSY** — Markdown + convertisseur PDF, mentions BCE, franchise TVA art. 56bis, coordonnées Wise. Stockage : `clients/heaven/plans/templates/INVOICE-PALOMA-TEMPLATE.md`.
- [ ] **Template brief mensuel contenu** — Notion privé ou Markdown local. Stockage : `clients/heaven/plans/templates/MONTHLY-BRIEF-TEMPLATE.md`.
- [ ] **Template reporting transparent** — Google Sheet privé OU dashboard custom Heaven CP route `/agence/paloma/reporting` (auth stricte root + paloma).
- [ ] **Lien officiel ONEM Tremplin-indépendants** — page officielle à vérifier avec organisme paiement Paloma.
- [ ] **Annexe hard limits Paloma** — document confidentiel signé, seulement papier.

---

## 8. Risques & mitigations

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Revenus dépassent seuil ONEM 18,08 €/j | Moyenne | Haut | Tracking mensuel auto, alerte à 80 % seuil, gel temporaire production, bascule Option B anticipée |
| R2 | Litige rémunération Paloma/NB | Faible | Moyen | Transparence reporting + V3 aligné incitations + médiation contrat |
| R3 | Fuite identité civile Paloma | Faible | Critique | Phase 3 sécurité SQWENSY, GPG systématique, zéro cloud non chiffré, watermark, DMCA |
| R4 | Paloma quitte sans préavis | Moyenne | Moyen | Préavis 30 j, archivage 90 j, buffer contenus 1 mois |
| R5 | Réglementation BE évolue | Haute | Moyen | Revue annuelle plan avec comptable BE en janvier |
| R6 | Bannissement Fanvue (TOS breach) | Faible | Haut | Validation stricte vs TOS, profil secondaire secours, diversification Fansly 2027 |
| R7 | Contrôle ONEM surprise | Moyenne | Moyen | Dossier propre : factures datées, volume horaire traçable, "hors heures normales" respecté |
| R8 | Problème paiement Wise | Faible | Critique | 2FA TOTP, pas de transactions > 1.000 € sans confirm manuelle, compte BE secours |
| R9 | Piratage/fuite contenus | Moyenne | Haut | Watermark + Rulta + DMCA auto + protection Fanvue |
| R10 | Paloma enceinte / maladie longue | Faible | Haut | Clause suspension bonne foi 3 mois, buffer contenus, backup Ruby/freelance |

---

## 9. Entrée CHANGELOG Heaven

À coller dans `clients/heaven/CHANGELOG.md` en haut :

```markdown
## [v1.0.0-plan] — 2026-04-18 — Plan Collaboration Paloma

### PLANNING STRATÉGIQUE
- Création `plans/PALOMA-COLLABORATION.md` — plan complet collaboration Paloma (9 sections)
- Analyse 4 options juridiques BE (Tremplin-indépendants recommandé vs activité accessoire art. 48 non applicable)
- Template contrat collaboration 10 clauses
- Process opérationnel mensuel (brief → production → édition → publication → facturation → reporting)
- Plan évolutif 5 phases (Phase 0 validation juridique mai 2026 → Phase 4 maturité 2027)

### JURIDIQUE (SOURCE ONEM 2026)
- Seuil journalier revenu activité accessoire confirmé : 18,08 €/jour nets au 01.03.2026
- Tremplin-indépendants = dispositif applicable (12 mois max) car Paloma déjà chômeuse au démarrage
- Activité accessoire pure art. 48 NON applicable (requiert 3 mois d'activité avant chômage)
- Caisse sociale minimale ~85-90 €/mois (primo-starter exonération possible < 1.622 €/an)

### SÉCURITÉ
- Zéro vrai prénom dans code/docs/DB/commits
- Vrai nom autorisé uniquement : contrat papier, facture GPG, Wise, dossiers fiscaux/ONEM
- Pseudo `paloma` partout ailleurs

### BUDGET PROJECTION
- Point mort atteint mois 4 (Sept 2026)
- Revenu net NB fin 2026 estimé +1.650 $/mois
- Coûts structurels hors Paloma : 4.040-8.380 €/an
- Décision bascule Option A → Option B mi-2027 selon performance

### DISCLAIMER
- Plan indicatif, validation obligatoire comptable BE + avocat droit social BE avant démarrage
- Aucune rémunération ne doit circuler avant : ONEM validé écrit + contrat signé + caisse sociale confirmée
```

---

## Sources officielles consultées (2026-04-18)

- ONEM — T41 *Vous commencez ou continuez une activité durant votre chômage* : seuil 18,08 €/j au 01.03.2026.
- ONEM — *Tremplin-indépendants* : dispositif 12 mois pour démarrer activité indépendante depuis le chômage.
- ONEM — formulaire C45A (bénévolat) et page formulaires & attestations officielles.
- INASTI — cotisations minimales indépendant complémentaire 2026 (caisses sociales Liantis, Partena, Acerta, Xerius, Securex, UCM).
- SPF Finances — franchise TVA PME (25.000 €/an art. 56bis CTVA).

---

**Fin du document. Toute modification doit passer par avenant signé ou mise à jour CHANGELOG Heaven.**

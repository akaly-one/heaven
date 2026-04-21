# BP Agence Heaven — avril 2026

Source de vérité business pour la branche agence Heaven. Document **pilote** pour le dev full-stack : toute décision produit/tech doit s'aligner sur ce BP jusqu'à itération ultérieure.

## 🚨 Règles P0 confidentialité (rappel)

Ces docs contiennent des références aux **handles publics** des profils (YUMI, RUBY, PALOMA) et au **compte Fanvue assumé `yumiclub`**. Ce sont des identifiants publics de l'agence, pas des données privées.

- **AUCUN vrai prénom** n'apparaît dans les docs ni ne doit apparaître en code/DB/commentaires.
- **AUCUN lien public** depuis Heaven vers SQWENSY (cf. `CLAUDE.md`).
- Les documents juridiques (Release Form, ID, contrats signés) contiendront des noms légaux → stockage **chiffré en bucket Supabase privé avec RLS stricte**, accès UI masqué par défaut.

---

## 📚 Les 4 documents

| Doc | Rôle | Audience |
|---|---|---|
| `Heaven_BP_v1.docx` | Business Plan interne 14 p., par modes de fonctionnement | Interne direction + dev |
| `Heaven_BP_financier_v1.xlsx` | Modèle financier 24 mois, 6 onglets, 1 251 formules | Interne direction + comptable |
| `Heaven_Paliers_Remuneration_Modeles.docx` | Document d'onboarding modèle (4 paliers BE) | Remis aux candidates Mode B |
| `Heaven_Analyse_Model_Release_Form.docx` | Analyse pédagogique du Release Form Fanvue/OF | Remis aux candidates avant signature |

---

## 🎯 Résumé stratégique (TL;DR)

Heaven opère **3 modes de fonctionnement** + **2 standards transversaux** + **4 paliers de rémunération**.

### Les 3 modes

| Mode | Description | Revenu Sqwensy | Priorité impl |
|------|-------------|----------------|---------------|
| **A — Studio IA pur** | Personas 100 % IA sur comptes agence | 100 % après coûts | 🔴 T1 (M1-M3) |
| **B — Hub annexe modèles** | Modèles réelles publiées sur comptes agence via Release Form | 30 % du net (70 % modèle) | 🟠 T2 (M4-M6) |
| **C — Services B2B indépendantes** | Sqwensy = prestataire tech/stratégique, modèle autonome | Setup + subscription + % croissance | 🟡 T4 (M10-M12) |

### Les 2 Plans Identité (standard transversal Mode B + C)

- **Découverte** — visage + image assumés, mais identité légale/adresse/entourage **toujours protégée**.
- **Shadow** — visage + marques distinctives (tatouages, cicatrices, arrière-plan) cachés ou floutés.

Chaque profil modèle a un `identity_plan` qui conditionne : le workflow de publication, le coût production, les filtres UI de rendu.

### Les 4 Paliers de rémunération (Mode B)

Palier applicable = fonction du revenu brut annualisé généré par la modèle.

| Palier | Seuil annualisé | Voie fiscale | Action CP |
|--------|-----------------|--------------|-----------|
| P1 Test | < 1 000 € | Droit à l'image / profits divers | Note paiement signée |
| P2 Démarrage | 1-9 k€ | Droit à l'image | Note paiement mensuelle |
| P3 Structuration | 9-20 k€ | Indép. complémentaire BE | Facturation + INASTI |
| P4 Pro | > 20 k€ | Indép. renforcée ± TVA | Facturation TVA, déclarations trim. |

**Règle de bascule automatique** : dès 3 mois consécutifs > 750 €/mois, déclencher passage palier suivant.

### Canaux d'acquisition (hiérarchie)

1. **Caming live** (Stripchat / Bongacams / Chaturbate) — canal **primaire** Mode B. Session live → redirection → pages PPV Fanvue. Funnel intégré dans l'agent IA DM.
2. **Social organique** (IG `@Yumiiiclub` + backups, TikTok, Snap) — top of funnel.
3. **Collaborations / influenceurs** — M6+.
4. **Paid ads adult-friendly** (Reddit, X, Telegram) — hors scope phase bootstrap.

---

## 🧱 Implications codebase Heaven

### Data model Supabase — champs à ajouter

Les tables existantes (`agence_profiles`, `agence_models`, équivalent selon le schéma en place) doivent être étendues. Migration à créer quand le contexte est validé.

#### Table profil modèle (ou table dédiée `agence_model_business_config`)

| Champ | Type | Commentaire |
|-------|------|-------------|
| `mode_operation` | enum `A` / `B` / `C` | Mode opérationnel du profil |
| `identity_plan` | enum `discovery` / `shadow` | Plan Identité choisi à l'onboarding |
| `palier_remuneration` | enum `P1` / `P2` / `P3` / `P4` | Palier fiscal actuel |
| `fiscal_voie` | enum `droit_image` / `profits_divers` / `indep_complementaire` / `indep_principal` | Voie fiscale active |
| `statut_initial` | enum `salariee` / `etudiante` / `chomage` / `sans_activite` / `pensionnee` | Statut légal BE de la modèle à l'onboarding |
| `statut_initial_verified` | bool | Vérification ONEM / contrat salarié effectuée |
| `caming_active` | bool | Modèle accepte le caming ? |
| `caming_platforms` | jsonb array | Plateformes cam activées (Stripchat / Bongacams / Chaturbate) |
| `caming_weekly_hours_target` | int | Objectif heures live/sem |
| `release_form_status` | enum `pending` / `submitted` / `validated` / `rejected` | État du dossier DMCA plateforme |
| `release_form_submitted_at` | timestamptz | Date soumission DMCA |
| `release_form_validated_at` | timestamptz | Date validation plateforme |
| `contract_signed_at` | timestamptz | Date signature contrat privé Agence↔Modèle |
| `contract_url` | text | Pointeur bucket privé chiffré |
| `revenue_monthly_avg_3m` | numeric | Moyenne rolling 3 mois pour calcul palier |
| `palier_escalation_locked_until` | timestamptz | Délai de grâce avant bascule forcée |

#### Table `agence_releaseform_dossier` (nouvelle, Mode B)

Un dossier DMCA par modèle par plateforme.

| Champ | Type | Commentaire |
|-------|------|-------------|
| `id` | uuid | PK |
| `model_id` | text (`m1`/`m2`/`m4`) | FK modèle |
| `platform` | enum `fanvue` / `onlyfans` / `mym` | Plateforme cible |
| `release_form_pdf_url` | text | Bucket privé chiffré |
| `id_document_recto_url` | text | Bucket privé chiffré |
| `id_document_verso_url` | text | Bucket privé chiffré |
| `headshot_dated_url` | text | Headshot avec papier daté + username compte agence |
| `full_body_url` | text | Full body non retouché |
| `faceswap_before_url` / `faceswap_after_url` | text | Si deepfake |
| `submitted_at` / `validated_at` / `rejected_at` | timestamptz | États workflow |
| `rejection_reason` | text | Si rejet plateforme |

**RLS stricte** : accès au bucket chiffré **uniquement** via JWT admin avec scope `dmca:read`. Les URLs stockées sont des pointeurs signés à durée limitée (15 min).

#### Table `agence_revenus_modele` (existe probablement déjà — à étendre)

| Champ | Type | Commentaire |
|-------|------|-------------|
| `source_platform` | enum `fanvue` / `onlyfans` / `mym` / `stripchat` / `bongacams` / `chaturbate` / `manuel` | |
| `source_type` | enum `subscription` / `ppv` / `tip` / `caming_tokens` / `private_session` | |
| `acquisition_channel` | enum `caming` / `ig_organic` / `tiktok` / `snap` / `collab` / `paid` / `other` | Canal d'acquisition de l'abonné à l'origine du revenu |
| `caming_session_id` | uuid NULL | Lien vers session cam d'origine si applicable |

#### Table `agence_caming_sessions` (nouvelle)

| Champ | Type | Commentaire |
|-------|------|-------------|
| `id` | uuid | PK |
| `model_id` | text | FK |
| `platform` | enum | Stripchat / Bongacams / Chaturbate |
| `started_at` / `ended_at` | timestamptz | |
| `duration_minutes` | int | |
| `viewers_unique_estimated` | int | Pic viewers uniques |
| `tokens_earned` | numeric | |
| `tips_received` | numeric | |
| `private_sessions_count` | int | |
| `redirections_fanvue_utm` | int | Tracking UTM lien cam → Fanvue |
| `new_fanvue_subscribers_attributed` | int | Conversion mesurée J+7 |

#### Table `agence_commission_calcul` (nouvelle ou vue matérialisée)

Vue mensuelle pour calcul automatisé Net distribuable → Part modèle 70 % / Sqwensy 30 %, avec :
- `revenu_brut_plateforme`
- `commission_plateforme_pct` (15 % Fanvue, 20 % OF, etc.)
- `tva_applicable` (selon voie fiscale)
- `frais_production_dedies`
- `net_distribuable`
- `part_modele` (70 % par défaut, override possible)
- `part_sqwensy` (30 %)
- `palier_detected` (calculé auto)
- `palier_escalation_triggered` (bool si 3 mois consécutifs > 750 €)

---

### CP admin Heaven — pages/composants à construire ou adapter

| Zone CP | Feature | État | Action |
|---------|---------|------|--------|
| `/agence/clients` ou `/agence/models` | Switch `mode_operation` sur profil | À adapter | Ajouter select A/B/C + badge visuel dans la card profil |
| `/agence/models/[id]` | Panel « Plan Identité » | À créer | Radio `discovery` / `shadow` + guidelines par plan + coût prod appliqué |
| `/agence/models/[id]` | Panel « Palier rémunération » | À créer | Affichage palier actuel + historique bascules + simulateur intégré |
| `/agence/models/[id]` | Onglet « Release Form DMCA » | À créer | Upload sécurisé documents + état workflow + bouton "Envoi DMCA@fanvue.com" pré-rempli |
| `/agence/models/[id]` | Onglet « Contrat privé » | À créer | Stockage bucket chiffré + versioning + date signature |
| `/agence/caming` | Dashboard caming multi-profils | À créer | Sessions actives, viewers, conversion cam→Fanvue, planning |
| `/agence/finances` | Calcul commission auto par modèle | À adapter | Intégrer logique palier + voie fiscale + simulateur Paliers |
| `/agence/finances` | Alertes palier | À créer | Si seuil 3 mois > 750 € → notification + pré-rempli bascule P2→P3 |
| `/agence/strategie` | Vue par Mode (A/B/C) | À créer | Filtre global, KPIs par mode, attribution canaux |
| `/agence/cms` | Filtre Plan Identité | À adapter | Masquer/flouter previews Shadow côté équipe si niveau accès < DPO |
| `/agence/automation` | Agent IA DM avec scripts Mode | À adapter | Scripts différents Mode A (IA persona) vs Mode B (modèle réelle) |
| `/agence/ops` | Ajouter KPIs caming | À adapter | Conversion cam→Fanvue, heures live, tokens |

### Workflows critiques à implémenter

1. **Onboarding modèle Mode B** — 11 étapes depuis contact initial jusqu'à 1er drop. Cf. section 11 du doc `Heaven_Paliers_Remuneration_Modeles.docx`. Chaque étape = state machine trackée dans le CP avec dates et responsables.

2. **Release Form DMCA** — upload 5 documents (Release Form signé + ID recto/verso + headshot daté + full body), génération email pré-rempli à DMCA@fanvue.com, tracking soumission/validation/rejet.

3. **Bascule palier automatique** — cron mensuel qui recalcule `revenue_monthly_avg_3m` pour chaque modèle, détecte dépassement seuil, crée notification admin avec template de bascule (ex : pré-remplissage guichet d'entreprise BE pour P2→P3).

4. **Calcul commission mensuel** — fin de mois : calcul automatique net distribuable + part modèle + part Sqwensy, génération justificatif PDF (note de paiement régime mobilier pour P1/P2, attendu facture pour P3/P4).

5. **Tracking funnel caming → PPV** — UTM dynamique par session cam, attribution J+7 des nouveaux abonnés Fanvue à une session cam via UTM.

6. **Alerte statut légal modèle** — si `statut_initial` = `chomage`, bloquer l'onboarding au step "signature contrat" tant que `statut_initial_verified` = false (contrôle manuel ONEM fait).

7. **Retrait consentement** — workflow dédié : la modèle écrit pour retirer, ouverture ticket, retrait contenu sous 7 j, confirmation suppression par email + log immuable.

---

## 🗺 Plan d'implémentation full-stack priorisé

### Sprint 1 — Fondations data model (S1-S2)

- [ ] Migration Supabase : ajout champs `mode_operation`, `identity_plan`, `palier_remuneration`, `fiscal_voie`, `statut_initial*`, `caming_active`, `caming_platforms`.
- [ ] Migration : nouvelles tables `agence_releaseform_dossier`, `agence_caming_sessions`.
- [ ] Extension table `agence_revenus_modele` avec `source_platform`, `source_type`, `acquisition_channel`, `caming_session_id`.
- [ ] RLS policies par `model_id` + scope admin DMCA.
- [ ] Seed 3 profils `m1` (Mode A), `m2` (Mode B, palier P1, plan Shadow), `m4` (Mode B, palier P1, plan Découverte).

### Sprint 2 — CP panel Plan Identité + Palier (S3-S4)

- [ ] Composant `<IdentityPlanPanel>` — radio + guidelines + impact coût prod.
- [ ] Composant `<PalierRemunerationPanel>` — affichage palier courant + simulateur (à partir d'un input revenu mensuel).
- [ ] Composant `<StatutInitialCard>` — alerte si statut = chomage + bouton "Marquer vérifié ONEM".
- [ ] Intégration dans `/agence/models/[id]`.

### Sprint 3 — Release Form DMCA workflow (S5-S6)

- [ ] Bucket Supabase privé `dmca-dossiers` + RLS admin uniquement.
- [ ] Composant `<ReleaseFormUploader>` — 5 uploads séquentiels avec validation format/taille.
- [ ] State machine workflow : `pending` → `documents_collected` → `submitted_dmca` → `validated` / `rejected`.
- [ ] Template email pré-rempli `mailto:DMCA@fanvue.com?...`.
- [ ] Blocage publication tant que `release_form_status != validated`.

### Sprint 4 — Caming tracking (S7-S8)

- [ ] Table `agence_caming_sessions` + CRUD admin.
- [ ] UTM dynamique sur Beacon (link-in-bio) : `?utm_source=cam&utm_medium={platform}&utm_campaign=session_{uuid}`.
- [ ] Attribution : script cron quotidien qui relie nouveaux abonnés Fanvue (via webhook Fanvue si dispo, sinon import manuel) aux sessions cam avec UTM match.
- [ ] Dashboard `/agence/caming` : sessions actives, viewers, conversion.

### Sprint 5 — Calcul commission + bascule palier (S9-S10)

- [ ] Vue `agence_commission_calcul` mensuelle.
- [ ] Cron fin de mois : calcul net distribuable + part modèle + part Sqwensy.
- [ ] Génération PDF note de paiement (P1/P2) ou état préparation facturation (P3/P4).
- [ ] Cron mensuel : détection bascule palier + notification admin.
- [ ] Page `/agence/finances` : vue consolidée par modèle + bascules en attente.

### Sprint 6 — Agent IA DM différencié par Mode (S11-S12)

- [ ] Scripts agent IA par Mode (A persona IA / B modèle réelle) et par Plan Identité (Découverte/Shadow).
- [ ] Intégration funnel cam → PPV : suivi DM après session cam, upsell PPV scripté.
- [ ] Escalade humaine sur conversations scoring > seuil.

### Sprint 7 — Mode C B2B (M10-M12, conditionnel)

- [ ] Ne démarre que si milestones BP M9 validés (cf. `Heaven_BP_v1.docx` §9).
- [ ] Nouveau schéma `agence_b2b_clients` + CRM clientes B2B.
- [ ] Facturation setup / subscription / commission croissance.
- [ ] Instance agent IA dédiée par cliente B2B.

---

## ⚠️ Contraintes P0 à respecter

1. **Confidentialité**
 - Aucun vrai prénom stocké (cf. `CLAUDE.md`).
 - Aucun lien public Heaven → SQWENSY.
 - `contract_url` et `release_form_*` = bucket chiffré + URLs signées 15 min.

2. **RGPD**
 - ID documents = données personnelles sensibles. Chiffrement au repos (Supabase pgsodium) + journalisation accès.
 - Politique de rétention documentée (contrat → 10 ans après résiliation comme obligation comptable BE).
 - Bouton « Export mes données » dans espace modèle + « Demander effacement » (workflow manuel, pas auto pour respecter obligation légale de conservation comptable).

3. **Compliance Fanvue**
 - Bio compte agence mention « AI-generated content » (Mode A) — enforced en CI via lint sur contenu statique si possible.
 - Aucun deepfake non-consenti côté plateforme (workflow validation face-swap avec before/after obligatoire avant publication).

4. **Fiscalité BE (À VALIDER comptable)**
 - Tous les calculs fiscaux dans l'Excel et le simulateur sont des **ordres de grandeur 2024-2025** à faire valider pour 2026. Marquer les cellules/composants concernés avec un tooltip « À valider comptable BE ».

5. **Statut chômage modèle**
 - Workflow onboarding BLOQUE la signature du contrat privé tant que `statut_initial_verified = false` pour les modèles au chômage. Prévoir un checklist UI admin confirmation ONEM / Article 48 / Tremplin indépendant.

---

## 📎 Références externes et internes

- BP Word : `Heaven_BP_v1.docx` (14 p.)
- Modèle financier : `Heaven_BP_financier_v1.xlsx` (6 onglets)
- Onboarding modèle : `Heaven_Paliers_Remuneration_Modeles.docx` (9 p.)
- Analyse Release Form : `Heaven_Analyse_Model_Release_Form.docx` (5 p.)
- Masterplan : `../../HEAVEN-MASTERPLAN-2026.md`
- Roadmap courante : `../../ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md`
- Agent IA spec : `../../IA-AGENT-SPEC.md`
- Contexte financier précédent : `../contexte-financier.md` (à migrer vers ce dossier ou archiver)

---

## 📋 Checklist pour Claude Code avant toute modification

Avant d'implémenter une feature issue de ce BP :

1. Lire le doc BP concerné (section ciblée, pas tout).
2. Vérifier que la feature respecte les règles P0 (confidentialité, RGPD, Compliance Fanvue).
3. Vérifier qu'aucun vrai prénom ne s'introduit via cette feature.
4. Créer la migration Supabase dans `supabase/migrations/` avec numérotation continue.
5. Mettre à jour CHANGELOG.md.
6. Passer `npm run verify` (typecheck + env + build) avant toute PR.
7. Si feature impacte le workflow modèle : vérifier impact sur `Heaven_Paliers_Remuneration_Modeles.docx` et `Heaven_Analyse_Model_Release_Form.docx` (mise à jour doc modèle éventuelle).

---

_Dernière révision : 2026-04-21. À itérer dès M3 avec les vrais chiffres de Mode A._

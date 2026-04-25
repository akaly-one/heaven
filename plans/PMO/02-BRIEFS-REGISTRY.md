# 02 — Registre des briefs NB

> Append-only. Ordre chronologique (plus récent en bas). Chaque ligne = 1 brief formellement accepté par NB.

---

## Légende statuts

- 🟡 **received** — demande reçue, pas encore cadrée
- 🟠 **cadré** — compréhension + scope validés par NB, en attente consolidation
- 🔵 **consolidé** — intégré au plan global, tickets générés
- 🟢 **dispatché** — phase multi-agent en cours
- ✅ **livré** — tous tickets DoD validés + NB signe off
- ⚪ **archivé** — clos depuis > 30 jours

---

## Tableau

| ID | Date | Titre | Type | Priorité | Branches | Statut | Fichier |
|---|---|---|---|---|---|---|---|
| BRIEF-2026-04-24-01 | 2026-04-24 | Session recovery — restaurer migrations manquantes + fix FK ai_runs | bug | P0 | DB, BE, Doc | ✅ livré (commit `5b64abc`) | [briefs/BRIEF-2026-04-24-01-session-recovery.md](./briefs/BRIEF-2026-04-24-01-session-recovery.md) |
| BRIEF-2026-04-24-02 | 2026-04-24 | Messenger UI Standards — uniformiser pseudo + avatar + bulles chat + mode agent par conversation | standard + feature | P1 | FE, BE, QA, Doc | 🔵 consolidé (→ Phase 2 plan v1) | [briefs/BRIEF-2026-04-24-02-messenger-ui-standards.md](./briefs/BRIEF-2026-04-24-02-messenger-ui-standards.md) |
| BRIEF-2026-04-24-03 | 2026-04-24 | Structure unifiée + CONTEXT par module + roadmap trackable + auto-update | standard + méta gouvernance | P1 | Doc, Architect | 🔵 consolidé (→ Phases 1, 3, 4 plan v1) | [briefs/BRIEF-2026-04-24-03-structure-unifiee-auto-update.md](./briefs/BRIEF-2026-04-24-03-structure-unifiee-auto-update.md) |
| BRIEF-2026-04-24-04 | 2026-04-24 | Push env vars Vercel prod pour activer agent IA online | config infra / follow-up BRIEF-01 | P0 | DevOps, Doc | ✅ livré + vérifié (commit `831cb83` prod, agent IA health OK) | [briefs/BRIEF-2026-04-24-04-vercel-env-vars-agent-ia.md](./briefs/BRIEF-2026-04-24-04-vercel-env-vars-agent-ia.md) |
| BRIEF-2026-04-24-05 | 2026-04-24 | QStash cron provider + toggle UI CP root/yumi | feature + infra | P2 | DB, BE, FE, DevOps, QA, Doc | 🟠 cadré (attente GO NB + compte Upstash) | [briefs/BRIEF-2026-04-24-05-cron-provider-qstash-toggle.md](./briefs/BRIEF-2026-04-24-05-cron-provider-qstash-toggle.md) |
| BRIEF-2026-04-24-06 | 2026-04-24 | Cycle de vie visiteurs (24h temp / 7j pending / archive) + sync bouton header pseudos | feature + règle métier | P1 | DB, BE, FE, QA, Doc | 🟠 cadré (hotfix b5e005e livré, refonte en attente GO) | [briefs/BRIEF-2026-04-24-06-visitor-lifecycle-header-sync.md](./briefs/BRIEF-2026-04-24-06-visitor-lifecycle-header-sync.md) |
| BRIEF-2026-04-24-07 | 2026-04-24 | Bouton "Générer message" dans thread (flow Fanvue) — mode on-demand IA | feature | P2 | DB, BE, FE, QA, Doc | 🟠 cadré (hotfix 85ee934 after() livré, feature en attente GO) | [briefs/BRIEF-2026-04-24-07-generate-button-in-thread.md](./briefs/BRIEF-2026-04-24-07-generate-button-in-thread.md) |
| BRIEF-2026-04-24-08 | 2026-04-24 | Persona Yumi v2 : diversité endings + knowledge grounding (URLs Fanvue/IG/Snap/Heaven) + simulation humaine | feature + knowledge | P1 | AI, DB, BE, FE, QA, Doc | 🟠 cadré (toutes URLs confirmées — hotfix L1 exécutable) | [briefs/BRIEF-2026-04-24-08-persona-yumi-v2-knowledge-grounding.md](./briefs/BRIEF-2026-04-24-08-persona-yumi-v2-knowledge-grounding.md) |
| BRIEF-2026-04-24-09 | 2026-04-24 | Fiche fan dynamique + extraction progressive + dashboard market research | feature majeure + data | P1 | DB, BE, AI, FE, QA, Doc, Legal | 🟠 cadré (7 questions RGPD/scope en attente, Phase A DB exécutable immédiat) | [briefs/BRIEF-2026-04-24-09-fan-profile-insights-market-research.md](./briefs/BRIEF-2026-04-24-09-fan-profile-insights-market-research.md) |
| BRIEF-2026-04-24-10 | 2026-04-24 | Privacy Policy + Age Gate + Accès hiérarchisé (sensuel vs explicite) | feature + légal + sécu | P0 (bloquant explicite/packs) | DB, BE, FE, Legal, QA, Doc | 🟢 partial (11/13 tickets livrés — Phase 1 AG01-AG03 + Phase 2 AG04-AG11, reste AG12-AG13 audit log/tests Playwright) | [briefs/BRIEF-2026-04-24-10-privacy-age-gate-tiered-access.md](./briefs/BRIEF-2026-04-24-10-privacy-age-gate-tiered-access.md) |
| BRIEF-2026-04-24-11 | 2026-04-24 | Usage meters stack + alertes upgrade (Groq/Vercel/Cloudinary/Supabase) | feature + DevOps + monitoring | P1 | DB, BE, FE, DevOps, Doc | 🟠 cadré (4 questions tokens + fréquence en attente) | [briefs/BRIEF-2026-04-24-11-stack-usage-meters-upgrade-alerts.md](./briefs/BRIEF-2026-04-24-11-stack-usage-meters-upgrade-alerts.md) |
| BRIEF-2026-04-24-12 | 2026-04-24 | Détection langue + adaptation multilingue agent IA (FR/EN/ES MVP) | feature + IA prompting + i18n | P1 | AI, DB, BE, FE, QA, Doc | 🟠 cadré (4 questions langues/UI en attente) | [briefs/BRIEF-2026-04-24-12-ai-language-detection-multilingual.md](./briefs/BRIEF-2026-04-24-12-ai-language-detection-multilingual.md) |
| BRIEF-2026-04-24-13 | 2026-04-24 | Unification Clients & Codes ↔ Messages + flow self-verification IP-matched | feature majeure + refactor data | P1 | DB, BE, FE, QA, Doc, DevOps | 🟢 partial (4/20 UV01-UV04 livrés Phase 2.2, RBAC fix C3) | [briefs/BRIEF-2026-04-24-13-unified-client-self-verification-flow.md](./briefs/BRIEF-2026-04-24-13-unified-client-self-verification-flow.md) |
| BRIEF-2026-04-24-14 | 2026-04-24 | Domaine yumii.club + uniformisation handles Yumi + sync Chrome extension | feature infra + refactor + tooling | P1 | Doc, FE, BE, DevOps | 🟠 cadré (5 questions en attente) | [briefs/BRIEF-2026-04-24-14-domain-yumii-club-uniformisation.md](./briefs/BRIEF-2026-04-24-14-domain-yumii-club-uniformisation.md) |
| BRIEF-2026-04-24-15 | 2026-04-24 | Messagerie UX polish + fiche fan accessible + sync pseudo + UI admin validation + régressions R2 | UX + bugs + DB | P0 | FE, BE, DB, DevOps | 🟢 dispatched (4 agents CORRECTIF parallèles) | [briefs/BRIEF-2026-04-24-15-messagerie-ux-polish-phase25.md](./briefs/BRIEF-2026-04-24-15-messagerie-ux-polish-phase25.md) |
| BRIEF-2026-04-25-16 | 2026-04-25 | Packs + Payment Providers modulaires (V1 manuel PayPal.me + V2 auto + custom pricing cart + CGV + agent IA pack awareness + PayPal SDK + Wise) | feature majeure + refactor archi + légal | P1 | DB, BE, FE, AI, QA, Legal, DevOps, Doc | 🟢 partial livré (Phases A-H + I PayPal SDK/Wise — commits `c7a797a` + `cdb03df`. Reste : T16-E1 tests E2E + 6 TODO post-merge dont 2 config NB côté Vercel/KYB) | [briefs/BRIEF-2026-04-25-16-packs-payment-providers.md](./briefs/BRIEF-2026-04-25-16-packs-payment-providers.md) |
| BRIEF-2026-04-25-17 | 2026-04-25 | Header admin enrichi + Feed IG vignettes + Likes/Commentaires | feature + UX + DB | P1 | DB, BE, FE, Doc | 🟢 livré (3 agents parallèles — migration 077 + 2 routes API + HeaderBar 5 boutons + previewMode + InstagramFeedGrid + FeedItemDetailModal + likes/comments UI complet, tsc 0) | [briefs/BRIEF-2026-04-25-17-header-admin-feed-ig-likes.md](./briefs/BRIEF-2026-04-25-17-header-admin-feed-ig-likes.md) |
| BRIEF-2026-04-25-18 | 2026-04-25 | Header unifié Root / Modèle Admin / Client (HeavenHeader auto-detect rôle, cohérent CP + /m/[slug]) | refactor archi UI majeur | P1 | FE, UI, Doc | 🟢 partial livré (Phase 1+2 minimum viable — 3 nouveaux fichiers + retrait Eye + ternaire /m/[slug], tsc 0. Phase 3 différée : extraction HeaderTabs/HeaderActions config-driven + suppression legacy) ⚠️ Partiellement révisé par BRIEF-22+23 Profile-as-Hub | [briefs/BRIEF-2026-04-25-18-unified-header-admin-client.md](./briefs/BRIEF-2026-04-25-18-unified-header-admin-client.md) |
| BRIEF-2026-04-25-19 | 2026-04-25 | CP Header centralisé icônes seules (Eye/Link2/Key/Story centrés) + retrait labels textes | feature UX + refactor FE | P1 | FE | 🟢 livré (Session evening — `<HeavenAdminActions>` réutilisable header CP + profil admin, tsc 0) | [briefs/BRIEF-2026-04-25-19-cp-header-centralise-icones.md](./briefs/BRIEF-2026-04-25-19-cp-header-centralise-icones.md) |
| BRIEF-2026-04-25-20 | 2026-04-25 | Bouton Clé Générer fonctionnel (codes d'accès manuels via GenerateModal existant) | feature wiring | P1 | FE | 🟢 livré (déjà fonctionnel via dispatch event `heaven:generate` — aucune modif BE nécessaire) | [briefs/BRIEF-2026-04-25-20-bouton-cle-generer-fonctionnel.md](./briefs/BRIEF-2026-04-25-20-bouton-cle-generer-fonctionnel.md) |
| BRIEF-2026-04-25-21 | 2026-04-25 | Bouton Story Générateur image téléchargeable (canvas 1080×1920 + image bg + flou + code optionnel + preview) | feature majeure | P1 | FE | 🟢 livré (`<StoryGeneratorModal>` complet, 4 customisations, output PNG, responsive mobile-first, tsc 0) | [briefs/BRIEF-2026-04-25-21-bouton-story-generateur-image.md](./briefs/BRIEF-2026-04-25-21-bouton-story-generateur-image.md) |
| BRIEF-2026-04-25-22+23 | 2026-04-25 | Profile-as-Hub (fusion Contenu+Feed CP→Profil, pattern SPRBP Instagram-style) + Cockpit simplifié 2 tabs (Messagerie+Stratégie) | refactor archi MAJEUR | P0 | FE refactor + Doc | 🟢 partial livré V1 (overlay admin + PostComposer + cockpit 2 tabs + contenu-panel @deprecated, tsc 0). Phase 2 différée : PacksEditorInline + BlurPreviewToggle + suppression legacy + extraction MessagingPageInner | [briefs/BRIEF-2026-04-25-22-23-profile-as-hub-fusion.md](./briefs/BRIEF-2026-04-25-22-23-profile-as-hub-fusion.md) |

---

## Compteur

- Total reçus : 22 (+4 session 2026-04-25 evening : BRIEF-19/20/21/22+23)
- Livrés totaux : 6 (BRIEF-01 + BRIEF-04 + BRIEF-17 + **BRIEF-19** + **BRIEF-20** + **BRIEF-21**)
- Livrés partial : 5 (BRIEF-10 11/13, BRIEF-13 4/20, BRIEF-16 phases A-I sauf E1, BRIEF-18 phase 1+2 ⚠️ partiellement révisé par 22+23, **BRIEF-22+23 V1**)
- Cadrés en attente GO : 8 (BRIEF-05/06/07/08/09/11/12/14)
- Dispatched en cours : 1 (BRIEF-15)
- Hotfixes inline session 25/04 : 3 (commit `1387047` mark_read POST→PATCH + fan localStorage | commit `a599f5d` hover taglines IdentityGate | commit `cdb03df` PayPal SDK + Wise)
- Hotfixes session 24/04 : 2 (commit `b5e005e` ai_run_id + pseudo-fan reply | commit `85ee934` after() for serverless)

## Vue d'ensemble implications full-stack (tous briefs cadrés)

Pour orchestrer proprement la redistribution multi-agent (Charte §1.3), synthèse des impacts :

| Brief | DB tables nouvelles | API routes nouvelles | Composants FE nouveaux | Stack tier concerné |
|---|---|---|---|---|
| 02 Messenger UI | 0 | 0 | 3 shared (Avatar/Row/Bubble) | Aucun nouveau |
| 03 Structure PMO | 0 | 0 | 0 | Aucun |
| 05 QStash toggle | 1 (cron_settings) | 2 (cron/config) | 1 (CronProviderToggle) | **+QStash Upstash** |
| 06 Cycle visiteurs | 0 (extension clients) | 3 | 3 (badges/filtres/drawer) | Aucun |
| 07 Bouton Générer | 0 (extension ai_runs) | 1 | 1 (GenerateButton) | Groq usage ↑ |
| 08 Persona v2 | 0 | 0 | 0 | Groq usage = |
| 09 Fiche fan insights | 3 (insights/heat/agg) | 3 | 3 (drawer/dashboard/consent) | Groq usage ↑↑ |
| 10 Privacy + Age Gate | 1 (age_gate_events + ext clients) | 3 | 5 (modal/footer/drawer/queue/badge) | Aucun |
| 11 Usage meters | 2 (snapshots/alerts) | 2 | 4 (dashboard/widget/banner/upgrade) | **+Vercel API, +Supabase Mgmt API, +Telegram** |
| 12 Multilingue | 0 (ext clients) | 0 | 2 (badge/preferences) | Groq usage ↑ |

**Nouveaux stacks à provisionner** :
- QStash Upstash (BRIEF-05) — gratuit
- Vercel API token (BRIEF-11) — gratuit
- Supabase Management token (BRIEF-11) — gratuit
- Telegram Bot NB (BRIEF-11) — à vérifier si déjà existant

**Croissance Groq** : BRIEFs 07/09/12 multiplient les appels LLM. Prévoir fallback OpenRouter (BRIEF-11 auto-fallback) quand Groq >95%.

## Follow-up du jour

BRIEF-04 a débloqué une cascade : le redeploy auto Vercel était cassé depuis v1.4.0 (cron `*/2` rejeté par Hobby). Patch appliqué (cron → daily) + deploy manuel. Agent IA maintenant **vraiment opérationnel en prod** (commit `831cb83`, verified via `/api/agence/ai/health`).

BRIEF-05 est la suite logique : garder le cron rapide en option via QStash + toggle UI pour switcher quand Meta App Review sera validée.

## Plan global d'exécution

Consolidation des 3 briefs dans **[plan-global-v1.md](./plan-global-v1.md)** (4 phases ordonnées, dépendances, parallélisations, distribution agents). En attente GO NB.

## Observations CDP

**Pattern du cycle courant** : NB construit un système d'orchestration complet en 3 briefs :
- BRIEF-01 = hotfix (DB + FK) — dette technique à solder avant tout
- BRIEF-02 = application concrète (messenger) — cas réel qui alimente les standards
- BRIEF-03 = méta gouvernance (structure unifiée + auto-update) — **socle orchestrateur**

**Ordre d'exécution logique** :
1. BRIEF-03 (structure) avant BRIEF-02 (application) → on définit les standards AVANT de les appliquer
2. OU en parallèle : BRIEF-03 livrables L1-L2 (audit + template) → L3 (rollout CONTEXT messenger en premier) → redescend dans BRIEF-02

À consolider quand NB signale "tous briefs donnés".

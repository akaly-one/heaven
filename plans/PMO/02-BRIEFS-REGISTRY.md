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

---

## Compteur

- Total reçus : 5
- En attente consolidation : 1
- Consolidés dans plan global : 2
- En exécution : 0
- Livrés : 2 (BRIEF-01 + BRIEF-04)

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

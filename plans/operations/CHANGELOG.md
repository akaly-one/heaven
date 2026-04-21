# Changelog — Operations

> Append-only. Date ISO. Nouveau en haut.

---

## 2026-04-21 (20:34) — Phases 4 + 5 exécutées (5 agents parallèles)

Exécution simultanée Phase 4 (Messagerie + Contacts fusion, B7) et Phase 5 (Contenu + Packs drop&drag, B8).

- **Agent 4.A** : migration 046 + helper fan-matcher + 3 APIs + backfill 15 clients legacy (0 orphan)
- **Agent 4.B** : layout messagerie 3-colonnes + 3 composants (drawer, timer, multi-channel reply) + redirect clients + sidebar nettoyée
- **Agent 5.A** : 4 composants drag&drop HTML5 natif extraits (pas de dnd-kit) + post-composer créé
- **Agent 5.B** : migration 047 + helper visibilité 6 scénarios + API PATCH packs + API feed enrichie + UI admin
- **Agent 5.C** : helpers cloudinary-signed + instagram-publish + 2 APIs + cron sync-instagram mirror Cloudinary

Briefs livrés : B7 ✅, B8 ✅, B9 partiel (sidebar)
Défauts résolus : P0-11, P1-3, P1-5, P1-8 (partiel), P2-1, P2-3

ADRs ajoutés : ADR-010 (DnD HTML5), ADR-011 (backfill auto-merge fans), ADR-012 (metadata IG sur source_payload)

Rapport : `plans/_reports/UPDATE-REPORT-2026-04-21-2034-phase4-5.md`

## 2026-04-21 (20:30) — Traçabilité briefs ajoutée au ROADMAP multi-agent

Ajout dans `ROADMAP-multiagent-execution-v1.2026-04-21.md` :
- Tableau de traçabilité brief-par-brief (B1 à B11) avec phases + agents + acceptance criteria
- Vue verticale permettant de vérifier en fin de phase que chaque brief NB est réellement livré
- Récap 11/11 briefs couverts, avec 8 briefs restant à livrer sur Phases 2-10

Pas de version bump (changement mineur, edit + CHANGELOG selon protocole).

Rapport : `plans/_reports/UPDATE-REPORT-2026-04-21-2030.md`

## 2026-04-21 (20:05) — Phase 1 exécutée (3 agents parallèles)

Exécution Phase 1 du plan multi-agent : 7 migrations SQL (039-045) + refonte auth + RLS scopes + 5 tables log append-only.

- **Agent 1.A** — migrations 039-042 (data model Modes/Paliers/DMCA/Caming/Commission matview)
- **Agent 1.B** — migration 043 + refonte auth (fusion yumi admin+IA, scopes granulaires, JWT enrichi, 5/5 comptes testés)
- **Agent 1.C** — migrations 044-045 + policies (5 helpers PG, 5 tables log immutables, 16 policies, append-only enforced)

Rapport : `plans/_reports/UPDATE-REPORT-2026-04-21-2005.md`
ADRs ajoutés : ADR-008 (fusion yumi), ADR-009 (compat role root/admin)

## 2026-04-21

- Création `ROADMAP-multiagent-execution-v1.2026-04-21.md`
  - Plan multi-agent phasé consolidé basé sur briefs NB B1-B11 + audit full-stack (P0/P1/P2) + sprints BP Cowork S1-S7
  - 12 phases séquentielles, 2-5 agents parallèles par phase
  - 8 décisions bloquantes NB (D-1 à D-8)
  - Durée estimée : 5-9 semaines dev + 2-4 sem Meta review
- Rapatriement V2 depuis `plans_01/` :
  - `ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md` → `ROADMAP-mise-a-niveau-v1.2026-04-21.md`
  - `IA-AGENT-SPEC.md` → `SPEC-agent-ia-v1.2026-04-21.md`
  - `META-APP-PUBLICATION-PLAN.md` → `SPEC-meta-app-review-v1.2026-04-21.md`
  - `REFACTOR-NAVIGATION-SPEC.md` → `SPEC-navigation-refactor-v1.2026-04-21.md`

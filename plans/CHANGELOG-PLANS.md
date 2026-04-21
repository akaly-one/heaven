# Changelog — Plans Heaven

> Historique des refontes structurelles des plans.
> Entries anti-chronologiques (nouveau en haut). Format date ISO.

---

## 2026-04-21 — Refonte V2 (complète)

### Phase 1 — Structure V2
- Structure V2 conforme à `STANDARD-SUIVI-PROJET.md` cross-CP
- Couches transverses : `00-brief/`, `01-strategy/`, `02-design/`, `03-tech/`, `04-ops/`
- `NOMENCLATURE.md` synthétique + `STANDARD-SUIVI-PROJET.md` copie référence
- `DECISIONS.md` racine avec ADR-001 à ADR-004
- `README.md` racine = index scan <1min

### Phase 2 — Rapatriement contenu (17 fichiers migrés)

**Couches transverses** :
- `HEAVEN-MASTERPLAN-2026.md` → `01-strategy/STRATEGY-v1.2026-04-21.md`
- `product/roadmap.md` → `01-strategy/ROADMAP-v1.2026-04-21.md`
- `product/objectifs.md` → `00-brief/OBJECTIVES-v1.2026-04-21.md`
- `product/modules.md` → `00-brief/SCOPE-v1.2026-04-21.md`
- `tech/architecture.md` → `03-tech/ARCHITECTURE-v1.2026-04-21.md`
- `tech/stack-config.md` → `03-tech/STACK-v1.2026-04-21.md`
- `tech/outils.md` → `03-tech/TOOLS-v1.2026-04-21.md`
- `security/roles-entities.md` → `03-tech/SECURITY-v1.2026-04-21.md`
- `design/design-system.md` → `02-design/DESIGN-SYSTEM-v1.2026-04-21.md`
- `MIGRATION-2026-04.md` → `04-ops/MIGRATION-LOG-v1.2026-04-21.md`
- `MAINTENANCE-PREVENTIVE.md` → `04-ops/MAINTENANCE-v1.2026-04-21.md`
- `ops/procedures.md` → `04-ops/PROCEDURES-v1.2026-04-21.md`

**Operations (ponctuel)** :
- `ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md` → `operations/ROADMAP-mise-a-niveau-v1.2026-04-21.md`
- `IA-AGENT-SPEC.md` → `operations/SPEC-agent-ia-v1.2026-04-21.md`
- `META-APP-PUBLICATION-PLAN.md` → `operations/SPEC-meta-app-review-v1.2026-04-21.md`
- `REFACTOR-NAVIGATION-SPEC.md` → `operations/SPEC-navigation-refactor-v1.2026-04-21.md`

**Business** :
- `PALOMA-COLLABORATION.md` → `business/paloma-collaboration-2026-04/STRATEGY-v1.2026-04-18.md`
- `business/bp-agence-heaven-2026-04/` → `business/bp-agence-heaven-2026-04/` (intact)

**Modules existants (V2)** :
- `modules/dashboard/` créé (briefs B9 + sources nav + modules catalog)
- `modules/profil-public/` créé (briefs B10 + sync IG)
- `modules/messagerie-contacts/` créé (briefs B7 fusion contacts multi-canal)
- `modules/contenu-packs/` créé (briefs B8 drop&drag + règles)
- `modules/models/` créé (INFRA yumi/paloma/ruby + README + DECISIONS + CHANGELOG)

**Archives** :
- `CLEANUP-ARCHIVE-REPORT-2026-04-18.md` → `_archive-v1/AUDIT-cleanup-2026-04-18.md`

### Phase 3 — Nettoyage plans_01/
- Suppression des 12 dossiers vides (MASTERPLAN, operations, _archive-v1, 9 modules vides non-peuplés)
- `plans_01/` ne contient plus que les fichiers **obsolètes ou redondants** :
  - `NOMENCLATURE.md` V1 (remplacé)
  - `README.md` V1 (remplacé)
  - `masterplan.md` V1 (remplacé)
  - `business/contexte-financier.md` (legacy SaaS 25% abandonné)
  - Dossier `business/` coquille post-rapatriement
- `plans_01/README-archive.md` mis à jour avec le statut final

### Changements nomenclature
- `STRATEGIE-` → `STRATEGY-` (anglais uniforme, ADR-003)
- `INFRA-` → `TECH-` (pour modules) ou `INFRA-<slug>` (pour entités, ex: modules/models/INFRA-yumi)
- Ajout TYPE : `SCOPE-`, `TOOLS-`, `PROCEDURES-`, `INFRA-` au standard

### Phase 4 — Complétude masterplan (ADR-006)
Création de 4 fichiers couches pour compléter le masterplan V2 :
- `00-brief/BRIEF-v1.2026-04-21.md`
- `00-brief/SYNERGY-v1.2026-04-21.md`
- `01-strategy/BUSINESS-v1.2026-04-21.md`
- `01-strategy/RISKS-v1.2026-04-21.md`

### Phase 5 — Protocole mise à jour obligatoire (ADR-005)
Création de `PROTOCOLE-MISE-A-JOUR.md` : quand NB dit « met à jour le plan », Claude Code applique auto-détection CP + analyse session + versioning + rapport horodaté + validation NB + commit git séparé. Référencé dans `CLAUDE.md` racine Heaven.

### Phase 6 — Suppression plans_01/ (ADR-007)
`plans_01/` supprimé définitivement. Tous contenus actionnables migrés en V2, les 5 restants étaient obsolètes.

### À venir
- Création des modules restants au fur et à mesure des besoins (instagram, strategie, agence-modules, settings-dev-center, comptes-acces)
- Application du standard + protocole à JPS, OPearly, SQWENSY OS (quand NB déclenchera)
- Premier `_reports/UPDATE-REPORT-*.md` à la prochaine invocation du protocole

### Source des décisions
Voir `DECISIONS.md` ADR-001 à ADR-007.

---

## 2026-04-17 — Refonte V1

Restructuration initiale post-merge Turborepo, avec :
- `plans/` standard (10 annexes + `models/` YUMI/RUBY/PALOMA)
- `docs/` reforgé USER only
- `MIGRATION-2026-04.md` log complet
- Phase F rollback Turborepo → single Next.js (2026-04-19)

Archive complète V1 : voir `plans_01/` depuis la refonte V2.

---

_Append-only. Nouvelles entries en haut avec date ISO._

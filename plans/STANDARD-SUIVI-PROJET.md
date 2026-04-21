# STANDARD DE SUIVI DE PROJET — cross-CP

> **Règle immuable cross-CP SQWENSY**
> Version : V2 (avril 2026) — déployée Heaven en premier
> Source de vérité : **ce document** + copie locale `plans/STANDARD-SUIVI-PROJET.md` dans chaque CP

---

## 1. Objectif

Ergonomiser le suivi de projet dev pour :
- **Claude Code** puisse charger le contexte minimal pertinent (pas de monolithes)
- **Scalabilité** : plus le projet grandit, plus la structure reste navigable
- **Zéro doublon** — un thème = un endroit unique
- **Traçabilité** — décisions + changelog + versions visibles
- **Cross-CP** — même structure partout (Heaven, JPS, OPearly, SQWENSY OS)

---

## 2. Standards inspirateurs

| Standard | Apport |
|---|---|
| **arc42** (Starke/Hruschka, 2005+) | Template 12 sections architecture — source pour les couches `00-brief/`, `01-strategy/`, `03-tech/` |
| **C4 Model** (Simon Brown) | Niveaux 1-4 (Context / Container / Component / Code) — appliqués dans `03-tech/ARCHITECTURE` (lvl 1-2) et `modules/<m>/TECH` (lvl 3-4) |
| **Diátaxis** | 4 types docs (Tutorial / How-to / Reference / Explanation) — nos plans = Reference + Explanation |
| **ADRs** (Michael Nygard) | `DECISIONS.md` append-only (ADR-001, ADR-002…) format Context / Decision / Consequences |
| **CLAUDE.md hiérarchique** (Claude Code) | README.md dans chaque module = contexte local |
| **Docs-as-Code** | Markdown + Git + review, versionnage natif |

---

## 3. Principes fondateurs

### 3.1 Séparation des couches

- **Couches transverses** (projet global) → dossiers numérotés `00-brief/`, `01-strategy/`, `02-design/`, `03-tech/`, `04-ops/`
- **Modules** (UI ou fonctionnels) → `modules/<nom>/`
- **Sources externes** (BP Cowork, docs tiers) → `business/<scope>-<YYYY-MM>/`
- **Tâches ponctuelles** → `operations/SPEC-<scope>-v<N>.<date>.md`
- **Legacy** → `_archive-v<N>/`

### 3.2 Un thème = un fichier

Jamais de fusion forcée si les sujets sont distincts. Si une refonte unifie 2 fichiers, le « vieux » passe en archive.

### 3.3 Versioning majeur + date

- `v<N>` = **refonte majeure** (sémantique breaking)
- `YYYY-MM-DD` = date de cette version
- Ajustements mineurs → entry `CHANGELOG.md`, pas de version bump

### 3.4 Append-only pour histoire

- `DECISIONS.md` = ADRs (Context / Decision / Consequences) numérotés, **jamais éditer** une ADR passée (créer ADR-N+1 qui remplace si nécessaire)
- `CHANGELOG.md` = journal dates + résumés, append-only

---

## 4. Arborescence obligatoire

```
plans/
├── README.md                        ← index global, scan <1 min
├── NOMENCLATURE.md                  ← rappel synthétique standard (copie locale)
├── STANDARD-SUIVI-PROJET.md         ← copie de ce doc (référence)
├── CHANGELOG-PLANS.md               ← refontes V1→V2→V3
├── DECISIONS.md                     ← ADRs globaux (append-only)
│
├── 00-brief/                        ← contexte initial (peu de churn)
│   ├── BRIEF-v<N>.<YYYY-MM-DD>.md          ← pitch + origine + pourquoi
│   ├── OBJECTIVES-v<N>.<YYYY-MM-DD>.md     ← objectifs globaux + KPIs
│   └── SYNERGY-v<N>.<YYYY-MM-DD>.md        ← rapport écosystème / autres CPs
│
├── 01-strategy/                     ← vision + business + roadmap global
│   ├── STRATEGY-v<N>.<YYYY-MM-DD>.md       ← vision + niches + modes
│   ├── BUSINESS-v<N>.<YYYY-MM-DD>.md       ← BP + finances + investissement
│   ├── ROADMAP-v<N>.<YYYY-MM-DD>.md        ← phases séquencées + cadence
│   └── RISKS-v<N>.<YYYY-MM-DD>.md          ← risques + mitigations
│
├── 02-design/                       ← UI/UX global
│   ├── DESIGN-SYSTEM-v<N>.<YYYY-MM-DD>.md
│   └── JOURNEYS-v<N>.<YYYY-MM-DD>.md       ← user flows globaux
│
├── 03-tech/                         ← tech global (C4 lvl 1-2)
│   ├── ARCHITECTURE-v<N>.<YYYY-MM-DD>.md
│   ├── STACK-v<N>.<YYYY-MM-DD>.md
│   ├── DATA-MODEL-v<N>.<YYYY-MM-DD>.md
│   └── SECURITY-v<N>.<YYYY-MM-DD>.md
│
├── 04-ops/                          ← opérations + infra run
│   ├── DEPLOY-v<N>.<YYYY-MM-DD>.md
│   ├── MAINTENANCE-v<N>.<YYYY-MM-DD>.md
│   └── MIGRATION-LOG-v<N>.<YYYY-MM-DD>.md
│
├── business/                        ← sources externes datées (INCHANGÉES)
│   └── <scope>-<YYYY-MM>/           ← ex: bp-agence-heaven-2026-04/
│       └── ... (fichiers source)
│
├── modules/<module-name>/           ← 1 dossier / module UI ou fonctionnel
│   ├── README.md                    ← mini-index module (1 page max)
│   ├── STRATEGY-v<N>.<YYYY-MM-DD>.md       ← briefs + objectifs + success criteria
│   ├── DESIGN-v<N>.<YYYY-MM-DD>.md         ← UX/UI (OPTIONNEL si UI)
│   ├── TECH-v<N>.<YYYY-MM-DD>.md           ← front + back + data + API
│   ├── DECISIONS.md                 ← ADRs module (append-only)
│   └── CHANGELOG.md                 ← append-only
│
├── operations/                      ← tâches actionables ponctuelles
│   └── SPEC-<scope>-v<N>.<YYYY-MM-DD>.md
│
└── _archive-v<N>/                   ← legacy (read-only)
    ├── README-archive.md            ← log origine de chaque archivage
    └── ...
```

---

## 5. Nomenclature fichiers

### 5.1 Pattern

```
<TYPE>-<scope?>-v<N>.<YYYY-MM-DD>.md
```

- **`TYPE`** = MAJUSCULES (BRIEF / STRATEGY / BUSINESS / DESIGN / TECH / ROADMAP / SPEC / AUDIT / MIGRATION / OBJECTIVES / SYNERGY / RISKS / DEPLOY / MAINTENANCE / SECURITY / DATA-MODEL / ARCHITECTURE / STACK / MIGRATION-LOG)
- **`scope`** = kebab-case, optionnel si déjà dans le chemin
- **`v<N>`** = version majeure (1, 2, 3…)
- **`YYYY-MM-DD`** = date ISO

### 5.2 Préfixes TYPE

| Préfixe | Usage | Couche |
|---|---|---|
| `BRIEF-` | Contexte initial projet | 00-brief |
| `OBJECTIVES-` | Objectifs + KPIs | 00-brief |
| `SCOPE-` | Catalogue périmètre (modules, features actuelles) | 00-brief |
| `SYNERGY-` | Rapport écosystème | 00-brief |
| `STRATEGY-` | Vision + stratégie (global ou module) | 01-strategy / modules |
| `BUSINESS-` | BP + finances | 01-strategy |
| `ROADMAP-` | Phases + cadence | 01-strategy / operations |
| `RISKS-` | Risques + mitigations | 01-strategy |
| `DESIGN-` | UX/UI | 02-design / modules |
| `DESIGN-SYSTEM-` | Design tokens, patterns | 02-design |
| `JOURNEYS-` | User flows | 02-design |
| `ARCHITECTURE-` | C4 lvl 1-2 | 03-tech |
| `STACK-` | Comptes services + env vars + ports | 03-tech |
| `TOOLS-` | Usage fonctionnel des outils (helpers, APIs tierces) | 03-tech |
| `DATA-MODEL-` | Schema DB global | 03-tech |
| `SECURITY-` | RLS, RGPD, scopes, RBAC | 03-tech |
| `TECH-` | Front + back + data + API (module) | modules |
| `INFRA-` | Configuration infrastructure d'une entité ou ressource spécifique | modules (ex: `modules/models/INFRA-yumi-v1`) |
| `DEPLOY-` | CI/CD, infra deploy | 04-ops |
| `MAINTENANCE-` | Cadences, hygiene | 04-ops |
| `PROCEDURES-` | Safe-update, audit, release workflow | 04-ops |
| `MIGRATION-LOG-` | Log SQL global | 04-ops |
| `SPEC-` | Spec ponctuelle | operations |
| `AUDIT-` | Rapport d'audit | operations / _archive |
| `MIGRATION-` | Migration SQL individuelle | 04-ops |

### 5.3 Fichiers sans version ni date

- `README.md` (index dossier)
- `NOMENCLATURE.md` (rappel standard local)
- `STANDARD-SUIVI-PROJET.md` (copie de ce doc)
- `CHANGELOG.md` / `CHANGELOG-PLANS.md` (append-only)
- `DECISIONS.md` (ADRs append-only)

---

## 6. Patterns

### 6.1 ADR format (DECISIONS.md)

```markdown
## ADR-001 — <Titre court>

**Date** : 2026-04-21
**Status** : Accepted | Proposed | Superseded by ADR-XXX

### Context
Pourquoi cette décision a lieu. Problème à résoudre.

### Decision
Le choix retenu.

### Consequences
Conséquences positives / négatives / neutres.
```

ADRs numérotés sans trou. Jamais éditer une ADR "Accepted" — superseded en créant ADR-N+1 référencée.

### 6.2 CHANGELOG.md format (append-only)

```markdown
# Changelog — <scope>

## 2026-04-22
- Ajustement brief B9 : couronne cliquable = raccourci dash

## 2026-04-21
- Création v1 initiale depuis : REFACTOR-NAVIGATION-SPEC.md + product/modules.md
```

Tri anti-chronologique (nouveau en haut). Format date ISO `YYYY-MM-DD`.

### 6.3 README.md module (mini-index 1 page)

```markdown
# <Module Name>

> Dossier : `plans/modules/<nom>/`
> Version courante : `STRATEGY-v1.2026-04-21.md` + `TECH-v1.2026-04-21.md`
> Dernière mise à jour : 2026-04-21

## Scope
1-3 lignes de description du périmètre module.

## Fichiers
- [STRATEGY](./STRATEGY-v1.2026-04-21.md) — briefs + objectifs + success
- [TECH](./TECH-v1.2026-04-21.md) — routes + composants + data
- [DESIGN](./DESIGN-v1.2026-04-21.md) — UX/UI (si applicable)
- [DECISIONS](./DECISIONS.md) — ADRs
- [CHANGELOG](./CHANGELOG.md) — journal

## Dépendances
- Module X (raison)
- Couche 03-tech/SECURITY (scope DMCA)

## Statut
- [x] STRATEGY v1 livrée
- [ ] TECH v1 en cours
```

---

## 7. Workflows

### 7.1 Créer un nouveau module

1. `mkdir plans/modules/<nom>/`
2. Créer `README.md` (mini-index)
3. Créer `STRATEGY-v1.<date>.md`
4. Créer `TECH-v1.<date>.md` (si applicable)
5. Créer `DECISIONS.md` vide (entête + à venir)
6. Créer `CHANGELOG.md` avec entry v1
7. Ajouter entry dans `plans/README.md` index

### 7.2 Refondre un fichier (version bump)

1. Créer `<TYPE>-v<N+1>.<nouvelle date>.md` avec le nouveau contenu
2. Déplacer ancien vers `_archive-v1/` (préserver nom)
3. Entry `_archive-v1/README-archive.md` (date + raison)
4. Entry `CHANGELOG.md` du module
5. Si décision structurelle → ajouter ADR dans `DECISIONS.md`

### 7.3 Ajustement mineur (sans version bump)

1. Éditer le fichier courant
2. Entry `CHANGELOG.md` avec date + résumé
3. Pas de version bump

### 7.4 Migration CP existant vers V2

1. Audit exhaustif `.md` (scan plans/, docs/, racine)
2. Créer dossier `plans_01/` dans `plans/` et y déplacer tout le contenu actuel
3. Créer la structure V2 vide dans `plans/` selon §4
4. Depuis `plans_01/`, rapatrier uniquement les dossiers/fichiers conformes (renommer selon §5)
5. Ce qui reste dans `plans_01/` → renommer en `_archive-v1/` + README-archive
6. Mettre à jour `README.md`, `NOMENCLATURE.md`, `CHANGELOG-PLANS.md`, `DECISIONS.md`
7. Actualiser `CLAUDE.md` racine CP + `README.md` racine CP

---

## 8. Règles cross-CP

- **Chaque CP** copie ce doc localement dans `plans/STANDARD-SUIVI-PROJET.md` + `plans/NOMENCLATURE.md` synthétique
- **Business sources** (BP Cowork, docs Excel, contrats) vont dans `plans/business/<scope>-<YYYY-MM>/` dossiers datés, INCHANGÉS
- **Archive jamais supprimée sans décision NB** — read-only
- **Confidentialité L3** : docs sensibles (contrats, finances, identité légale) peuvent vivre en bucket chiffré Supabase selon RLS du CP, mais respectent la même nomenclature
- **Cross-CP coordination** : si un module Heaven impacte SQWENSY OS, créer ADR dans les 2 DECISIONS.md

---

## 9. Déploiement par CP

| CP | Statut V2 | Date migration |
|---|---|---|
| **Heaven** | ✅ En cours (référence) | Avril 2026 |
| JPS | ⏳ À planifier | — |
| OPearly | ⏳ À planifier | — |
| SQWENSY OS | ⏳ À planifier (ce repo) | — |

---

## 10. Anti-patterns à éviter

- ❌ Fichiers racine éparpillés sans dossier de rattachement (type `RANDOM-PLAN.md` racine plans/)
- ❌ Plusieurs fichiers parlant du même sujet sans référence mutuelle
- ❌ Fusion monolithique qui perd le contexte de chaque source
- ❌ Suppression sans passage par archive
- ❌ Éditer une ADR "Accepted" au lieu de superseder
- ❌ Nomenclature française/anglaise mélangée pour TYPE (standard = anglais)
- ❌ Date non-ISO (évite `21-04-2026`, préfère `2026-04-21`)
- ❌ Modules tentaculaires sans README mini-index
- ❌ CHANGELOG écrasé (doit être append-only)

---

## 11. Exemples nomenclature concrète (Heaven V2)

```
plans/
├── README.md
├── NOMENCLATURE.md
├── STANDARD-SUIVI-PROJET.md
├── CHANGELOG-PLANS.md
├── DECISIONS.md
│
├── 00-brief/
│   ├── BRIEF-v1.2026-04-21.md
│   ├── OBJECTIVES-v1.2026-04-21.md
│   └── SYNERGY-v1.2026-04-21.md
│
├── 01-strategy/
│   ├── STRATEGY-v1.2026-04-21.md
│   ├── BUSINESS-v1.2026-04-21.md
│   ├── ROADMAP-v1.2026-04-21.md
│   └── RISKS-v1.2026-04-21.md
│
├── 02-design/
│   └── DESIGN-SYSTEM-v1.2026-04-21.md
│
├── 03-tech/
│   ├── ARCHITECTURE-v1.2026-04-21.md
│   ├── STACK-v1.2026-04-21.md
│   ├── DATA-MODEL-v1.2026-04-21.md
│   └── SECURITY-v1.2026-04-21.md
│
├── 04-ops/
│   ├── MAINTENANCE-v1.2026-04-21.md
│   └── MIGRATION-LOG-v1.2026-04-21.md
│
├── business/
│   └── bp-agence-heaven-2026-04/        ← Cowork inchangé
│
├── modules/
│   ├── dashboard/
│   │   ├── README.md
│   │   ├── STRATEGY-v1.2026-04-21.md
│   │   ├── TECH-v1.2026-04-21.md
│   │   ├── DECISIONS.md
│   │   └── CHANGELOG.md
│   └── instagram/
│       └── ...
│
├── operations/
│   ├── SPEC-meta-app-review-v1.2026-04-21.md
│   └── ROADMAP-mise-a-niveau-v1.2026-04-21.md
│
└── _archive-v1/
    ├── README-archive.md
    └── ... (anciens fichiers préservés)
```

---

## 12. Relecture & conformité

Checklist avant commit de modifications plans :
- [ ] Nomenclature respectée (§5)
- [ ] Pas de doublon avec un fichier existant
- [ ] CHANGELOG entry ajouté si modification
- [ ] Si refonte structurelle : ADR créé dans `DECISIONS.md`
- [ ] `README.md` index à jour si nouveau fichier/module
- [ ] Aucun vrai prénom (règle P0 Heaven)
- [ ] Date ISO valide

---

_Document immuable de référence. Édits possibles uniquement via ADR explicite ajouté à `DECISIONS.md` de ce document (dans `sqwensy-os/docs/`)._

# Plans Heaven — V2

> **Source de vérité courante** pour la documentation stratégique, business, design, tech, ops du projet Heaven.
> Standard appliqué : [`STANDARD-SUIVI-PROJET.md`](./STANDARD-SUIVI-PROJET.md) (copie locale du référentiel cross-CP).

---

## Navigation rapide

### Couches transverses (projet global)

| Couche | Dossier | Fichiers V2 |
|---|---|---|
| **00 — Brief** | [`00-brief/`](./00-brief/) | `BRIEF`, `OBJECTIVES`, `SCOPE`, `SYNERGY` (v1.2026-04-21) |
| **01 — Strategy** | [`01-strategy/`](./01-strategy/) | `STRATEGY`, `BUSINESS`, `ROADMAP`, `RISKS` (v1.2026-04-21) |
| **02 — Design** | [`02-design/`](./02-design/) | `DESIGN-SYSTEM-v1.2026-04-21.md` |
| **03 — Tech** | [`03-tech/`](./03-tech/) | `ARCHITECTURE`, `STACK`, `TOOLS`, `SECURITY` (v1.2026-04-21) |
| **04 — Ops** | [`04-ops/`](./04-ops/) | `MAINTENANCE`, `MIGRATION-LOG`, `PROCEDURES` (v1.2026-04-21) |

### Modules (UI / fonctionnels)

| Module | Statut | Fichiers |
|---|---|---|
| [`dashboard/`](./modules/dashboard/) | ✅ v1 livrée | README + STRATEGY + TECH + DECISIONS + CHANGELOG |
| [`profil-public/`](./modules/profil-public/) | ✅ v1 livrée | README + STRATEGY + TECH + DECISIONS + CHANGELOG |
| [`messagerie-contacts/`](./modules/messagerie-contacts/) | ✅ v1 livrée | README + STRATEGY + TECH + DECISIONS + CHANGELOG |
| [`contenu-packs/`](./modules/contenu-packs/) | ✅ v1 livrée | README + STRATEGY + TECH + DECISIONS + CHANGELOG |
| [`models/`](./modules/models/) | ✅ INFRA v1 livrée | README + 3 INFRA + DECISIONS + CHANGELOG |
| *instagram* | ⏳ à créer | — |
| *strategie* | ⏳ à créer | — |
| *agence-modules* | ⏳ à créer | — |
| *settings-dev-center* | ⏳ à créer | — |
| *comptes-acces* | ⏳ à créer | — |
| *tech-infra* | ⏳ à créer (si distinct de 03-tech/) | — |
| *ops-maintenance* | ⏳ à créer (si distinct de 04-ops/) | — |
| *design* | ⏳ à créer (si distinct de 02-design/) | — |

### Sources externes datées

| Chemin | Contenu |
|---|---|
| [`business/bp-agence-heaven-2026-04/`](./business/bp-agence-heaven-2026-04/) | BP Cowork 4 docs (BP 14p. + financier + paliers + Release Form) — **source vérité business** |
| [`business/paloma-collaboration-2026-04/`](./business/paloma-collaboration-2026-04/) | Plan collaboration Paloma (juridique BE + ONEM + contrat) |

### Tâches actionables

| Chemin | Rôle |
|---|---|
| [`operations/`](./operations/) | SPEC + ROADMAP ponctuelles (4 fichiers actifs : roadmap mise à niveau, spec agent IA, spec Meta App Review, spec navigation refactor) |

### Référence & archive

| Chemin | Rôle |
|---|---|
| [`STANDARD-SUIVI-PROJET.md`](./STANDARD-SUIVI-PROJET.md) | Standard cross-CP immuable (source : `sqwensy-os/docs/`) |
| [`PROTOCOLE-MISE-A-JOUR.md`](./PROTOCOLE-MISE-A-JOUR.md) | **Protocole obligatoire** quand NB dit « met à jour le plan » |
| [`NOMENCLATURE.md`](./NOMENCLATURE.md) | Rappel synthétique nomenclature |
| [`DECISIONS.md`](./DECISIONS.md) | ADRs globaux projet (append-only, ADR-001 à ADR-007) |
| [`CHANGELOG-PLANS.md`](./CHANGELOG-PLANS.md) | Historique refontes V1→V2 |
| [`_archive-v1/`](./_archive-v1/) | Archives V2 (currently : `AUDIT-cleanup-2026-04-18.md`) |
| `_reports/` (à créer à la 1ère MAJ) | Rapports horodatés des mises à jour plans |

---

## État migration V1 → V2

**✅ Migré** (17 fichiers) :
- Masterplan → `01-strategy/STRATEGY-v1`
- Roadmap mise à niveau → `operations/ROADMAP-mise-a-niveau-v1`
- IA Agent Spec → `operations/SPEC-agent-ia-v1`
- Meta App Review → `operations/SPEC-meta-app-review-v1`
- Navigation Refactor → `operations/SPEC-navigation-refactor-v1`
- Migration log → `04-ops/MIGRATION-LOG-v1`
- Maintenance → `04-ops/MAINTENANCE-v1`
- Procedures → `04-ops/PROCEDURES-v1`
- Objectifs → `00-brief/OBJECTIVES-v1`
- Scope modules → `00-brief/SCOPE-v1`
- Roadmap produit → `01-strategy/ROADMAP-v1`
- Architecture → `03-tech/ARCHITECTURE-v1`
- Stack config → `03-tech/STACK-v1`
- Outils → `03-tech/TOOLS-v1`
- Roles entities → `03-tech/SECURITY-v1`
- Design system → `02-design/DESIGN-SYSTEM-v1`
- Cleanup report → `_archive-v1/AUDIT-cleanup-2026-04-18`
- 3 profils YUMI/PALOMA/RUBY → `modules/models/INFRA-<slug>-v1`
- PALOMA Collaboration → `business/paloma-collaboration-2026-04/STRATEGY-v1`

**🗑️ `plans_01/` supprimé définitivement (ADR-007, 2026-04-21)** :
- Tous les fichiers actionnables avaient été migrés vers V2
- Les 5 fichiers restants étaient obsolètes (NOMENCLATURE V1, README V1, masterplan V1, contexte-financier legacy, README-archive)
- Consultation historique possible via `git show <commit-avant-V2>:plans/`

**Complétude masterplan V2** (ADR-006, 2026-04-21) :
- `00-brief/BRIEF-v1.2026-04-21.md` (pitch projet)
- `00-brief/SYNERGY-v1.2026-04-21.md` (rapport écosystème SQWENSY)
- `01-strategy/BUSINESS-v1.2026-04-21.md` (BP synthétique + pointers BP Cowork)
- `01-strategy/RISKS-v1.2026-04-21.md` (matrice risques + mitigations)

---

## Règles P0 (confidentialité Heaven)

- Aucun vrai prénom stocké dans les plans (aliases uniquement : `m1`=yumi, `m2`=paloma, `m3`=ruby)
- Aucun lien public Heaven ↔ SQWENSY
- Documents sensibles (contrats, identité) → bucket Supabase chiffré, jamais en `plans/`

---

## Pour Claude Code

Pour travailler sur un sujet :
1. Ce README (index)
2. `STANDARD-SUIVI-PROJET.md` si édition de plans
3. `business/bp-agence-heaven-2026-04/README.md` (contexte business)
4. Le `modules/<nom>/README.md` pertinent + ses fichiers
5. Les couches `00-brief/` à `04-ops/` selon besoin

Ne charge jamais `plans_01/` sauf pour audit historique.

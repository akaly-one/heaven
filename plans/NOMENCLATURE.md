# Nomenclature — rappel synthétique

> Source complète : [`STANDARD-SUIVI-PROJET.md`](./STANDARD-SUIVI-PROJET.md) (cross-CP)

---

## Pattern

```
<TYPE>-<scope?>-v<N>.<YYYY-MM-DD>.md
```

- **`TYPE`** MAJUSCULES (anglais)
- **`scope`** kebab-case, optionnel si déjà dans le chemin
- **`v<N>`** version majeure
- **`YYYY-MM-DD`** date ISO

---

## Préfixes TYPE

| Préfixe | Usage |
|---|---|
| `BRIEF-` | Contexte initial (00-brief/) |
| `OBJECTIVES-` | Objectifs + KPIs (00-brief/) |
| `SCOPE-` | Catalogue périmètre modules/features (00-brief/) |
| `SYNERGY-` | Rapport écosystème (00-brief/) |
| `STRATEGY-` | Vision + stratégie (01-strategy/ ou modules/) |
| `BUSINESS-` | BP + finances (01-strategy/) |
| `ROADMAP-` | Phases + cadence |
| `RISKS-` | Risques + mitigations (01-strategy/) |
| `DESIGN-` | UX/UI |
| `DESIGN-SYSTEM-` | Design tokens (02-design/) |
| `JOURNEYS-` | User flows (02-design/) |
| `ARCHITECTURE-` | C4 lvl 1-2 (03-tech/) |
| `STACK-` | Comptes + env vars + ports (03-tech/) |
| `TOOLS-` | Usage fonctionnel outils (03-tech/) |
| `DATA-MODEL-` | Schema DB global (03-tech/) |
| `SECURITY-` | RLS, RGPD, scopes |
| `TECH-` | Front + back + data + API module |
| `INFRA-` | Config infra d'une entité spécifique (modules/models/INFRA-<slug>) |
| `DEPLOY-` | CI/CD, infra (04-ops/) |
| `MAINTENANCE-` | Cadences, hygiene (04-ops/) |
| `PROCEDURES-` | Safe-update, release workflow (04-ops/) |
| `MIGRATION-LOG-` | Log SQL (04-ops/) |
| `SPEC-` | Spec ponctuelle (operations/) |
| `AUDIT-` | Rapport d'audit |

---

## Fichiers sans version ni date

- `README.md` (index dossier)
- `NOMENCLATURE.md` (ce doc)
- `STANDARD-SUIVI-PROJET.md`
- `CHANGELOG.md` / `CHANGELOG-PLANS.md` (append-only)
- `DECISIONS.md` (ADRs append-only)

---

## Module = 5 fichiers

```
modules/<nom>/
├── README.md                    ← mini-index 1 page
├── STRATEGY-v<N>.<YYYY-MM-DD>.md   ← briefs + objectifs + success criteria
├── TECH-v<N>.<YYYY-MM-DD>.md       ← front + back + data + API
├── DESIGN-v<N>.<YYYY-MM-DD>.md     ← UX/UI (optionnel)
├── DECISIONS.md                 ← ADRs module
└── CHANGELOG.md                 ← append-only
```

---

## Règles rapides

1. Un thème = un fichier
2. Version bump seulement si refonte majeure
3. Ajustement mineur = entry CHANGELOG, pas de version
4. Legacy → archive avec README-archive (jamais suppression brute)
5. ADRs jamais éditer une "Accepted", superseder par ADR-N+1
6. Date ISO `YYYY-MM-DD`, tri chronologique naturel

Détails complets : [`STANDARD-SUIVI-PROJET.md`](./STANDARD-SUIVI-PROJET.md) §5.

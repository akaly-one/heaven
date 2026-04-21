# CLAUDE.md — Heaven

Plateforme de gestion profils + abonnements. Single Next.js 15 (post merge Turborepo d32a53f, 2026-04-19).

## Structure repo

- `src/app/` — routes (m/[slug] public, agence/* CP, api/*)
- `src/shared/` — composants + lib + hooks cross-domaines
- `src/cp/` — composants cockpit CP
- `src/config/` — entities, roles, permissions
- `plans/` — **docs DEV V2** (structure standard cross-CP, voir `plans/README.md`)
- `docs/` — docs USER (credentials, access)
- `supabase/` — migrations + policies RLS (scopées par model_id)

## Plans V2 (avril 2026)

Structure conforme au [`STANDARD-SUIVI-PROJET.md`](./plans/STANDARD-SUIVI-PROJET.md) cross-CP (arc42 + C4 + ADRs + Diátaxis) :

```
plans/
├── 00-brief/ 01-strategy/ 02-design/ 03-tech/ 04-ops/   ← couches transverses
├── business/bp-agence-heaven-2026-04/                    ← source vérité BP Cowork
├── modules/<nom>/{README, STRATEGY, TECH, DESIGN, DECISIONS, CHANGELOG}
├── operations/    ← SPECs ponctuelles
├── plans_01/      ← archive V1 (read-only)
└── _archive-v1/   ← archives futures V2→V3
```

Pour travailler : charger d'abord `plans/README.md` (index) puis le module pertinent.

## 🔒 Protocole OBLIGATOIRE mise à jour plans

Dès que NB dit « met à jour le plan » (ou équivalent : « update le plan », « synchronise les plans », « reflète ça dans les plans »), appliquer impérativement le protocole documenté dans [`plans/PROTOCOLE-MISE-A-JOUR.md`](./plans/PROTOCOLE-MISE-A-JOUR.md).

Points non-négociables :
1. Détecter le CP concerné via CWD + contexte (Heaven par défaut si ambigu ici) ; demander si doute
2. Analyser la session + diffs pour scoper les fichiers à toucher
3. Décider versioning (mineur = edit + CHANGELOG / majeur = v<N+1> + archive + ADR)
4. Proposer le plan d'update à NB avant écriture
5. Générer un rapport horodaté dans `plans/_reports/UPDATE-REPORT-YYYY-MM-DD-HHMM.md`
6. Commit git séparé `docs(plans): update report ...`

Aucune improvisation. Toute exception passe par ADR dans `plans/DECISIONS.md`.

## Stack
- Next.js 15, TypeScript, Tailwind v4
- Supabase (projet dédié Heaven)
- Cloudinary pour médias
- jose pour JWT

## Profils gérés
Handles UNIQUEMENT (AUCUN vrai prénom stocké nulle part) :
- YUMI (m1)
- RUBY (m2)
- PALOMA (m4)

Config per-profile : `apps/lib/src/config/entities/{yumi,ruby,paloma}.ts`.

## Règles critiques P0
- **AUCUN vrai prénom** dans code/docs/DB/commentaires/variables
- **AUCUN lien public vers SQWENSY** (pas de NEXT_PUBLIC_SQWENSY_URL)
- **AUCUN alias `gret`** dans src/
- Projet CONFIDENTIEL — discret, pas de branding externe lié
- CHANGELOG à jour à chaque patch

## 📘 Source de vérité business (avril 2026)

**Avant toute évolution du CP admin, du data model Supabase ou des workflows modèle :** lire impérativement [`plans/business/bp-agence-heaven-2026-04/README.md`](./plans/business/bp-agence-heaven-2026-04/README.md).

Ce document trace :
- Les 3 modes de fonctionnement (A=Studio IA / B=Hub annexe modèles / C=Services B2B indépendantes)
- Les 2 Plans Identité (Découverte / Shadow) applicables aux modèles
- Les 4 Paliers de rémunération fiscaux BE (P1 Test / P2 Démarrage / P3 Structuration / P4 Pro)
- Le caming live comme canal d'acquisition **primaire** (pas parallèle)
- Le mapping concret BP → schémas Supabase, composants CP, routes API, workflows
- Le plan d'implémentation priorisé en 7 sprints

---

## Standard de vérification pré-push (2026-04-17)

Avant tout push vers `main`, le repo exige trois vérifs passantes :

1. **TypeScript** — `npx tsc --noEmit` doit passer (strict mode on)
2. **Env vars** — toute `process.env.X` utilisée dans `src/` doit apparaître dans `.env.example` (check via `scripts/check-env.mjs`)
3. **Build Next.js** — `npm run build` doit réussir avec `typescript.ignoreBuildErrors: false` et `eslint.ignoreDuringBuilds: false`

### Commandes

```bash
# Vérification complète (typecheck + env + build)
npm run verify

# Équivalent direct
bash scripts/verify-before-push.sh
```

### Git hook auto-installé

Le script `prepare` de `package.json` active `core.hooksPath=.githooks` à chaque `npm install`. Le hook `.githooks/pre-push` bloque tout `git push` si la vérification échoue.

Pour forcer la réactivation manuelle : `git config core.hooksPath .githooks`.

### CI GitHub Actions

`.github/workflows/verify.yml` relance les 3 checks sur PR vers `main` et sur push direct. Objectif : bloquer un merge qui casserait Vercel.

### Règle Heaven (confidentialité)

Le CI publique ne doit jamais référencer SQWENSY ni exposer Heaven comme client SQWENSY. Les secrets `SQWENSY_*` restent côté Vercel uniquement.

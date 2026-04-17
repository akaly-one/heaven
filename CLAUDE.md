# CLAUDE.md — Heaven

Plateforme de gestion profils + abonnements. Turborepo monorepo.

## Structure
- `apps/web/` — profils publics /m/[slug] + pages publiques
- `apps/cp/` — admin /agence multi-profils
- `apps/ui/` — composants partagés
- `apps/lib/` — config/entities, supabase, auth, rbac
- `plans/` — docs DEV (masterplan + annexes + models/)
- `docs/` — docs USER
- `supabase/` — migrations + policies RLS (scopées par model_id)

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

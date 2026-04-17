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

# Index plans/

Navigation ergonomique (Turborepo, Next.js 15, Supabase).

## Vue globale
- `masterplan.md` — vue globale + pointeurs
- `MIGRATION-2026-04.md` — log restructure

## Tech
- `tech/architecture.md` — archi multi-entity, API, DB
- `tech/stack-config.md` — env vars, comptes, tooling
- `tech/outils.md` — Cloudinary, JWT, OpenRouter, Meta API

## Design
- `design/design-system.md` — poker branding, tiers, identity gate

## Security
- `security/roles-entities.md` — **3 entités** (YUMI/RUBY/PALOMA) + **2 rôles** (admin/model) + matrice permissions

## Product
- `product/objectifs.md` — KPIs, cibles
- `product/modules.md` — catalogue modules (Profile, Cockpit, Codes, Gallery, Messages, Payment, IA Agent)
- `product/roadmap.md` — phases + 8 fixes status

## Ops
- `ops/procedures.md` — worktree, audit, release, migration DB

## Business
- `business/contexte-financier.md` — modèle éco, cost projection, scenarios

## Models (per-entity)
- `models/YUMI.md`, `models/RUBY.md`, `models/PALOMA.md`

## Règles P0
- AUCUN vrai prénom stocké
- AUCUN lien public externe vers autres projets internes
- `supabase/policies/` applique scoping par `model_id`

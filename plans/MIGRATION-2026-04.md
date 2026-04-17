# Migration Log — Restructure Standard 2026-04-17

Branch : `restructure/standard-2026-04`
HEAD pre-migration : `9cb065fc510d89b81553bfbdfc1ff6877aa3a0f8`

## Objectif
Passer Heaven vers le Standard unique :
- `plans/` (10 annexes + `plans/models/` YUMI/RUBY/PALOMA)
- `docs/` reforgé (USER only)
- Route groups `src/app/(web)/m/[slug]/` + `src/app/(cp)/agence/`
- `src/config/entities/{yumi,ruby,paloma}.ts` (seul lieu de singularité)
- `src/config/roles/{model,admin}.ts` + `permissions.ts`
- RLS policies scopées par `model_id`
- + 8 fixes en attente (stories TTL, gate edit, etc.)
- + Rapatriement Agence Root CP dans dashboard YUMI

## Phases
- [ ] Phase 6.1 — Docs migration
- [ ] Phase 6.2 — Code restructure + multi-entity
- [ ] Phase 6.3 — 8 fixes
- [ ] Phase 6.4 — Validation

## Flags P0 critiques
- `_backups/auth-phase0-2026-03-22/cms-page.tsx:41-42` contient vrais prénoms → **purger en Phase 7**
- Conflit BP v1.0 root (748L) vs v2.0 local (624L) → merger sections manquantes en annexes

## Table de correspondance old → new

_À remplir au fur et à mesure_

| Ancien chemin | Nouveau chemin | Phase |
|---|---|---|

## Rollback
`git reset --hard 9cb065fc510d89b81553bfbdfc1ff6877aa3a0f8`

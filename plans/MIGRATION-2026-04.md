# Migration Log — Restructure Standard 2026-04-17

Branch : `restructure/standard-2026-04`
HEAD pre-migration : `9cb065fc510d89b81553bfbdfc1ff6877aa3a0f8`
HEAD actuel : `0b1741a`

## Objectif
Passer Heaven vers le Standard unique :
- `plans/` (10 annexes + `plans/models/` YUMI/RUBY/PALOMA)
- `docs/` reforgé (USER only)
- Monorepo Turborepo `apps/web` + `apps/cp` + `apps/ui` + `apps/lib`
- `config/entities/{yumi,ruby,paloma}.ts` (seul lieu de singularité)
- `config/roles/{model,admin}.ts` + `permissions.ts`
- RLS policies scopées par `model_id`
- + 8 fixes (stories TTL, gate edit, etc.)
- + Rapatriement Agence Root CP dans dashboard YUMI

## Phases

- [x] **Phase A — P0 Purge** (`1737c99`, `6dbd73c`)
  - Purge vrais prénoms des `_backups/` legacy
  - Suppression leak `SQWENSY_URL`
  - Scrub alias `gret*` des plans + procédures
- [x] **Phase B — Turborepo Structure** (`d29ad54`)
  - Monorepo `apps/web` (vitrine + `m/[slug]`)
  - `apps/cp` (agence dashboard)
  - `apps/ui` (composants partagés)
  - `apps/lib` (helpers + rbac)
  - `config/entities/` (multi-modèle)
- [x] **Phase C — Docs + Plans Standard** (`e9b4753`)
  - `plans/` standard (10 annexes)
  - `plans/models/` YUMI / RUBY / PALOMA
  - `README.md` racine
  - `CHANGELOG.md` racine
- [x] **Phase D — 8 Fixes partiels** (`5c5030e`, `3e3d226`)
  - Story TTL 24h auto-expire
  - Fix close button z-index
  - Déconnexion pseudo
  - Procedures checklist scrubbed (civil name pattern)
  - D4-D8 reportés (gate edit, etc.)
- [x] **Phase E — Finitions + RLS policies** (`0b1741a`, current commit)
  - `CLAUDE.md` cleanup
  - `public/` cleanup
  - `supabase/policies/` créé (template + 5 tables scopées par `model_id`)
  - MIGRATION log complété
  - `.gitignore` `.turbo/` ajouté
- [ ] **Phase F — Validation**
  - Apply RLS policies (nouvelle migration `031_rls_policies_standard.sql`)
  - Smoke tests multi-entity
  - Merge vers `main`

## Flags P0 critiques (résolus)
- ~~`_backups/auth-phase0-2026-03-22/cms-page.tsx:41-42` vrais prénoms~~ → PURGÉ `1737c99` + `6dbd73c`
- Conflit BP v1.0 root (748L) vs v2.0 local (624L) → mergé en annexes `plans/`

## Table de correspondance old → new

### Commits (historique)

| SHA | Phase | Description |
|---|---|---|
| `1737c99` | A | `security(heaven): purge P0 — vrais prénoms backups + leak SQWENSY_URL + alias gret` |
| `d29ad54` | B | `refactor(heaven): Turborepo apps/web + apps/cp + apps/ui + apps/lib + config/entities` |
| `e9b4753` | C | `docs(heaven): plans/ standard + README + CHANGELOG racine + models/` |
| `5c5030e` | D | `feat(heaven): 8 fixes — story TTL 24h + close button z-index + déconnexion pseudo (D1-D3, D4-D8 reportés)` |
| `3e3d226` | D | `docs(heaven): scrub civil name pattern from procedures checklist` |
| `6dbd73c` | A | `security(heaven): P0 purge — _backups legacy + plans gret refs` |
| `0b1741a` | E | `chore(heaven): finitions standard — CLAUDE.md + empty public/ cleanup` |

### Moves principaux (structurels)

| Ancien chemin | Nouveau chemin | Phase |
|---|---|---|
| `src/app/m/` | `apps/web/src/app/m/` | B |
| `src/app/agence/` | `apps/cp/src/app/agence/` | B |
| `src/lib/` | `apps/lib/src/` | B |
| `src/components/` | `apps/ui/src/` | B |
| `src/config/entities/` | `config/entities/` (root shared) | B |
| `src/config/roles/` | `config/roles/` (root shared) | B |
| `_backups/auth-phase0-2026-03-22/` | supprimé (purge P0) | A |
| (absent) | `plans/models/{yumi,ruby,paloma}.md` | C |
| (absent) | `supabase/policies/*.sql` | E |

## Rollback
SHA ultime (avant restructure, état stable `main`) :
```bash
git reset --hard 9cb065fc510d89b81553bfbdfc1ff6877aa3a0f8
```

Rollback partiel phase par phase : voir SHA dans la table ci-dessus.

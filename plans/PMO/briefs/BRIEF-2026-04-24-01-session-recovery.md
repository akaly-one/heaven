# BRIEF-2026-04-24-01 — Session recovery : migrations manquantes + fix FK ai_runs

> **Status** : ✅ livré
> **Source** : NB message du 2026-04-24 ~10:50 ("fix tout les anomalie et push a nouveau...")
> **Type** : bug
> **Priorité** : P0 (bloquant agent IA)
> **Commit** : `5b64abc` (pushé sur `origin/main`)

---

## Demande NB (verbatim résumé)

Fixer toutes les anomalies détectées en début de session (migrations SQL 053/054 manquantes en local, health endpoint 401 en prod) et push à nouveau. Identifier le plan d'implémentation de l'autre conversation. Corriger l'agent IA pour qu'il fonctionne en ligne.

## Compréhension CDP

3 anomalies détectées :
1. Migrations SQL 052/053/054 appliquées en DB mais fichiers absents en local → drift de repo
2. Drift 050 : fichier local v1, DB v2 (schéma différent)
3. `/api/agence/ai/health` renvoie 401 en prod → suspicion Vercel Deployment Protection

Après investigation, **découverte d'un BUG CRITIQUE** : agent IA répond correctement aux messages web (conversations visibles dans `agence_messages`) mais `ai_runs` table reste vide. Cause : `provider_id="groq-direct-llama-3.3-70b"` inséré dans `ai_runs` n'existe pas dans `ai_providers` (seed utilise `groq-llama-3.3-70b`). Supabase `.insert()` ne throw pas sur FK violation → silent fail → 0 runs loggés.

## Scope

### IN
- Restaurer 052_ai_providers.sql, 053_agent_personas.sql, 054_ai_runs_v2.sql depuis DB prod
- Aligner 050_seed_root_m0.sql local avec v2 DB
- Créer migration 058_seed_groq_direct_provider.sql (fix FK)
- Appliquer 058 sur DB prod
- Test insert ai_runs pour validation
- Commit + push
- Documenter Vercel Deployment Protection comme blocker user-action

### OUT
- Désactivation Vercel Deployment Protection (config user, pas code)
- Meta App Review submission (autre brief)
- Refactor code call sites provider_id (approche B non retenue, seed est plus propre)

## Branches concernées

- ☒ DB — migrations SQL + apply MCP
- ☒ BE — audit call sites, aucune modification de code requise
- ☒ Doc — brief + rapport session
- ☐ FE / AI / QA / DevOps — pas concerné

## Dépendances

- Aucune

## Livrables attendus

1. 4 fichiers SQL migrations en local repo
2. Migration 058 appliquée en DB prod
3. Test ai_runs fonctionnel
4. Commit + push sur main
5. Documentation blocker Vercel

## Acceptance criteria

- [x] `ls supabase/migrations/` contient 050_seed_root_m0_v2.sql, 052/053/054/058
- [x] `INSERT INTO ai_runs (... provider_id='groq-direct-llama-3.3-70b' ...)` succeeds en DB prod
- [x] `git log origin/main -1` = fix commit
- [x] Pré-push checks (tsc + build) passent
- [x] Vercel Deployment Protection documenté (3 actions NB listées)

## Tickets générés

Aucun — traité directement en hotfix par le CDP (scope < 50 lignes code, P0 bloquant).

## Notes CDP

**Pattern à retenir** : Supabase `.insert()` ne throw pas sur contrainte FK → à encoder en standard BE (toujours check `{ error }` avant de considérer succès). Ajouter à `PMO/standards/BACKEND.md` quand créé (BRIEF futur).

**Migrations drift** : risque de récurrence (Supabase MCP renomme parfois les migrations avec suffixe `_v2`). Protocole à formaliser : aligner fichier local immédiatement après `apply_migration` MCP. Pattern à encoder dans `PMO/standards/DATABASE.md`.

**Memory files manquants** (`session_state_heaven_2026_04_21.md`, `protocol_clean_safe.md`) référencés dans MEMORY.md index mais absents du disque — à investiguer dans un brief doc séparé si NB le demande.

# Supabase RLS Policies — Heaven

## Principe
Double barrière :
1. Front : `can(role, resource, action)` dans `apps/lib/src/rbac.ts`
2. DB : policies ci-dessous, scopées par `model_id` via `auth.jwt()`

## Rôles
- `admin` — YUMI admin master, full access cross-modèles
- `model` — scoped à son `model_id` propre

## Tables couvertes
agence_models, agence_clients, agence_posts, agence_wall_posts, agence_codes (+ template)

## TODO
Créer migration `031_rls_policies_standard.sql` qui applique ces policies en DB, ou les exécuter via Supabase SQL Editor.

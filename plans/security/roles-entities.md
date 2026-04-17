# 04 — Roles & Entities

## Entités (profils publics)

Configurées dans `apps/lib/src/config/entities/`.

| Slug | model_id | Display | Couleur | Statut |
|------|----------|---------|---------|--------|
| `yumi` | `m1` | YUMI | `#E84393` | Actif |
| `ruby` | `m2` | RUBY | `#9B6BFF` | Actif |
| `paloma` | `m4` | PALOMA | `#D4A574` | À activer |

> **Note identité** : aucun vrai prénom (civil/personnel) n'est stocké dans le code, la DB, les commits, les commentaires ou les docs. Les entités sont toujours référencées par leur alias public uniquement.

## Rôles

Configurés dans `apps/lib/src/config/roles/`.

| Slug | Label | Scope |
|------|-------|-------|
| `admin` | Admin Master | Tous profils, paramètres, finances, purge |
| `model` | Modèle | Son propre profil uniquement |

## Matrice de permissions

Source : `apps/lib/src/config/permissions.ts`.

| Permission | admin | model |
|------------|:-----:|:-----:|
| manage_entities | ✅ | ❌ |
| manage_codes | ✅ | ❌ |
| manage_finances | ✅ | ❌ |
| manage_packs | ✅ | ✅ |
| view_all_profiles | ✅ | ❌ |
| post_wall | ✅ | ✅ |
| send_messages | ✅ | ✅ |
| purge | ✅ | ❌ |

## RBAC helpers

`apps/lib/src/rbac.ts` :
- `isAdmin(session)` — bool
- `canAccessEntity(session, slug)` — enforce scoping model
- `authorize(session, permission)` — check perm

## Session JWT

Payload : `{ sub, role, scope, display_name }`. Cookie `heaven_session` HttpOnly, 24h TTL. Signed HMAC-SHA256 via `jose` + `HEAVEN_JWT_SECRET`.

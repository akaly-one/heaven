# Backup Auth Phase 0 — Heaven Studio
**Date:** 2026-03-22
**Systeme:** Codes hardcodes (pas de JWT, pas d'API auth)

## Codes d'acces
| Code | Role | Scope | Model |
|------|------|-------|-------|
| gret1 | root | * | — |
| yumi | model | /agence | yumi |
| ruby | model | /agence | ruby |

## Fichiers sauvegardes
| Fichier backup | Source originale |
|---------------|-----------------|
| login-page.tsx | src/app/login/page.tsx |
| auth-guard.tsx | src/components/auth-guard.tsx |
| auth.ts | src/lib/auth.ts |
| model-context.tsx | src/lib/model-context.tsx |
| supabase-server.ts | src/lib/supabase-server.ts |
| sidebar.tsx | src/components/sidebar.tsx |
| cms-page.tsx | src/app/agence/cms/page.tsx |
| api-accounts.ts | src/app/api/accounts/route.ts |
| api-codes.ts | src/app/api/codes/route.ts |
| api-clients.ts | src/app/api/clients/route.ts |
| api-models-slug.ts | src/app/api/models/[slug]/route.ts |
| env-local.txt | .env.local |

## Schema DB Supabase (tables liees)

### agence_accounts
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
code        text UNIQUE NOT NULL
role        text NOT NULL  -- "root" | "model"
model_slug  text
display_name text NOT NULL
active      boolean DEFAULT true
created_at  timestamptz DEFAULT now()
last_login  timestamptz
```

### agence_codes
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
code        text NOT NULL
model       text NOT NULL
client      text
client_id   uuid REFERENCES agence_clients(id)
platform    text DEFAULT 'snapchat'
role        text DEFAULT 'client'
tier        text DEFAULT 'vip'
pack        text
type        text DEFAULT 'paid'
duration    integer DEFAULT 72
expires_at  timestamptz
is_trial    boolean DEFAULT false
used        boolean DEFAULT false
active      boolean DEFAULT true
revoked     boolean DEFAULT false
last_used   timestamptz
created_at  timestamptz DEFAULT now()
```

### agence_clients
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
model       text NOT NULL
pseudo_snap text
pseudo_insta text
tag         text
tier        text
notes       text
verified    boolean DEFAULT false
blocked     boolean DEFAULT false
total_spent numeric DEFAULT 0
last_active timestamptz
preferences jsonb
created_at  timestamptz DEFAULT now()
```

### agence_models
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
slug        text UNIQUE NOT NULL
display_name text
bio         text
avatar_url  text
cover_url   text
snap_username text
insta_username text
theme_color text
created_at  timestamptz DEFAULT now()
```

## Comment restaurer
1. Copier chaque fichier backup vers sa source originale
2. Les env vars Supabase sont dans env-local.txt
3. Les comptes DB sont dans agence_accounts (3 comptes: gret1, yumi, ruby)
4. `npm run build` pour verifier
5. `git push` pour deployer

## Flux auth (Phase 0)
```
Navigateur → /login → code hardcode → sessionStorage["heaven_auth"]
                                        ↓
                                   AuthGuard verifie sessionStorage
                                        ↓
                                   /agence (cockpit)
```
Zero appel API pour le login. Les API routes (codes, clients, etc.) n'ont pas de verification auth.

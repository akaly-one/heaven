# 01 — Architecture

## Monorepo Turborepo

```
heaven/
├── apps/
│   ├── web/              @heaven/web  (port 3000)
│   │   └── src/app/
│   │       ├── layout.tsx
│   │       ├── page.tsx           ← landing / redirect
│   │       ├── icon.svg
│   │       └── m/[slug]/          ← profils publics
│   ├── cp/               @heaven/cp  (port 3001)
│   │   ├── middleware.ts          ← JWT protection /api/*
│   │   └── src/app/
│   │       ├── layout.tsx
│   │       ├── agence/            ← cp
│   │       ├── login/
│   │       └── api/               ← toutes les APIs (22 namespaces)
│   ├── ui/               @heaven/ui  — composants partagés
│   └── lib/              @heaven/lib — config, hooks, types, rbac
├── plans/                docs de projet (internes, non USER)
├── docs/                 docs USER only (credentials, procédures)
├── supabase/migrations/  SQL migrations (026 → 030)
├── package.json          root workspaces
├── turbo.json
└── vercel.json           build = apps/cp/.next
```

## Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind v4 (`@tailwindcss/postcss`)
- Supabase (Postgres + RLS + Auth)
- Cloudinary (storage tier-locked par model_id)
- Jose (JWT HMAC-SHA256)
- Vercel (déploiement @heaven/cp)

## Base de données (19 tables)

Tables scopées par `model_id` (format `mN`) :
- `agence_models` — registre profils (slug, model_id, display_name)
- `agence_clients` — CRM visiteurs
- `agence_codes` — codes accès temporaires
- `agence_messages` — conversations
- `agence_uploads` — médias (photos, vidéos, stories)
- `agence_posts` — feed posts
- `agence_wall_posts` — murs clients
- `agence_packs` — offres packagées
- `agence_purchases` — transactions
- `agence_pending_payments`, `agence_revenue_log`
- `agence_pages`, `agence_collaborators`
- `agence_platform_accounts`, `agence_content_pipeline`, `agence_fan_lifecycle`
- `agence_goals`, `agence_media_config`
- `instagram_config`, `instagram_conversations`, `instagram_messages`

## API (apps/cp/src/app/api/)

22 namespaces : `accounts`, `auth`, `clients`, `cms`, `codes`, `credits`, `finances`, `heaven-beacon` (proxy), `instagram`, `messages`, `models`, `packs`, `payments`, `pipeline`, `posts`, `purge`, `security`, `sqwensy` (sync), `system`, `upload`, `uploads`, `wall`.

## Middleware JWT

`apps/cp/src/middleware.ts` protège `/api/*` :
- Routes publiques GET : models, wall, packs, posts, uploads, codes, clients, messages, system/status, credits/balance
- Routes publiques POST : wall, messages, clients, codes, payments (create/capture)
- Self-authed : auth/login, auth/logout, payments/webhook, sqwensy, purge, models/activate
- Reste : JWT cookie `heaven_session` obligatoire

## Sync SQWENSY OS

- Validation codes login : `apps/cp/src/app/api/auth/login/route.ts` → `OS_BEACON_URL`
- Proxy BEACON : `apps/cp/src/app/api/heaven-beacon/{chat,lead}/route.ts` server-only
- Aucun `NEXT_PUBLIC_*` n'expose l'URL de l'OS (anti-leak branding)

# 07 — Stack & Config

## Comptes & services

| Service | Rôle | Compte |
|---------|------|--------|
| Vercel | Hosting + déploiement | heaven-os (projet privé) |
| Supabase | Postgres + RLS + Auth | projet Heaven dédié |
| Cloudinary | Storage médias tier-locked | cloud dédié |
| Resend | Emails transactionnels | clé partagée écosystème |
| OpenRouter | LLM Instagram Agent | compte dédié |
| Meta Graph API | Instagram DMs | app Meta dédiée |
| PayPal / Revolut | Paiements | comptes merchant (KYC en cours) |

Credentials détaillés : `docs/ACCESS-HEAVEN-OS.md` (USER only).

## Environment variables

### Runtime (prod)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Auth JWT
HEAVEN_JWT_SECRET=...            # HMAC-SHA256 secret
HEAVEN_ROOT_CODE=...             # code admin master

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# OS sync (server-only, NO NEXT_PUBLIC_)
OS_BEACON_URL=...                # URL OS pour proxy BEACON + validation codes
HEAVEN_SYNC_SECRET=...           # HMAC entre Heaven et OS

# Emails
RESEND_API_KEY=...
RESEND_FROM=...

# Instagram Agent (en attente)
META_APP_ID=...
META_APP_SECRET=...
META_PAGE_ACCESS_TOKEN=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
OPENROUTER_API_KEY=...

# Paiements
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
REVOLUT_API_KEY=...
```

### Règles env
- **JAMAIS** de `NEXT_PUBLIC_` sur URLs OS/API sensibles
- **JAMAIS** committer `.env*` (déjà `.gitignore`)
- Vercel : env vars configurées dashboard, ne PAS dupliquer dans code

## Configuration Turbo

- `turbo.json` — tâches build/dev/lint/start
- `package.json` root — workspaces `apps/*`
- `vercel.json` — buildCommand = `turbo build --filter=@heaven/cp`
- `tsconfig.base.json` — config TS commune (ES2022, strict, bundler)

## Ports dev

- `@heaven/web` → 3000 (profils publics)
- `@heaven/cp` → 3001 (admin + APIs)

`apps/web/next.config.ts` rewrite `/api/*` → `CP_INTERNAL_URL` (si set) — sinon consommé direct par le CP en dev.

# 07 — Stack & Config

> **Mise à jour 2026-04-21** : single Next.js 15 (merge Turborepo `d32a53f`), Webpack dev, Vercel Hobby (1 cron/jour).

---

## Comptes & services

| Service | Rôle | Compte |
|---------|------|--------|
| Vercel | Hosting + déploiement | `heaven-os` (projet privé, plan Hobby) |
| Supabase | Postgres + RLS + Auth | projet `tbvojfjfgmjiwitiudbn` (Heaven dédié) |
| Cloudinary | Storage médias tier-locked + edge cache 30j | cloud dédié |
| Resend | Emails transactionnels | clé partagée écosystème |
| OpenRouter | LLM Instagram Agent (Claude Sonnet 4.6) | compte dédié — clé en attente NB |
| Meta Graph API v19 | Instagram DMs + posts + comments | app Meta `Yumi-AI` (App ID `981952864691167`) |
| PayPal / Revolut | Paiements | comptes merchant (KYC en cours) |
| Upstash QStash (prévu) | Cron worker externe (Hobby limit workaround) | à créer — D-6 NB |

Credentials détaillés : `docs/ACCESS-HEAVEN-OS.md` (USER only).

---

## Environment variables

### Runtime (prod Vercel)

```bash
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://tbvojfjfgmjiwitiudbn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...              # server-only

# === Auth JWT ===
HEAVEN_JWT_SECRET=...                      # HMAC-SHA256 secret (jose)
HEAVEN_ROOT_CODE=...                       # code admin master

# === Cloudinary (edge cache 30j configuré next.config.ts) ===
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# === OS sync (server-only — AUCUN NEXT_PUBLIC_) ===
OS_BEACON_URL=...                          # URL OS pour proxy BEACON + validation codes
HEAVEN_SYNC_SECRET=...                     # HMAC entre Heaven et OS

# === Emails ===
RESEND_API_KEY=...
RESEND_FROM=...

# === Instagram Agent (partiel — clé IA en attente) ===
META_APP_ID=981952864691167
META_APP_SECRET=d258cf4126e22eb7856498bd4af36c06
META_PAGE_ACCESS_TOKEN=...                 # token permanent
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400193217961
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=yumiii_webhook_secret_2026
INSTAGRAM_AGENT_ENABLED=true               # feature flag worker IA
OPENROUTER_API_KEY=...                     # EN ATTENTE D-5 NB

# === Paiements ===
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
REVOLUT_API_KEY=...

# === Cron security (recommandé si migration QStash / GitHub Actions) ===
CRON_SECRET=...                            # signe les requests vers /api/cron/*
```

### Règles env
- **JAMAIS** de `NEXT_PUBLIC_` sur URLs OS/API sensibles ou clés secrètes
- **JAMAIS** committer `.env*` (déjà `.gitignore`)
- Vercel : env vars configurées dashboard, ne PAS dupliquer dans code
- **Rotation obligatoire** : clés Supabase service_role (leak historique git sqwensy-os — alerte active MEMORY)

---

## Configuration Next.js (single app)

- `package.json` — **pas** de workspaces (rollback Turborepo)
- `next.config.ts` — `images.remotePatterns` Cloudinary + `minimumCacheTTL: 2592000` (30j)
- `vercel.json` — framework nextjs, crons daily (limitation Hobby plan)
- `tsconfig.json` — ES2022, strict, bundler
- **Dev server** : Webpack (pas Turbopack — bug vendor-chunks récurrent). `predev: rm -rf .next` avant chaque run.

### vercel.json cron (actuel — Hobby 1/jour)

```json
"crons": [
  { "path": "/api/cron/sync-instagram",    "schedule": "0 6 * * *" },
  { "path": "/api/cron/purge-ops-metrics", "schedule": "0 4 * * *" }
]
```

**Manque** : `/api/cron/process-ig-replies` (worker IA). Options D-6 :
- Vercel Pro (~20$/mois) → cron 1/min possible
- Upstash QStash (free tier) → HTTP post scheduler externe
- GitHub Actions (free) → cron workflow avec `fetch` signé

---

## Ports dev

- Heaven unique : **port 3002** (conflits 3000/3001 avec sqwensy-os)
- Lancement : `npm run dev` (Webpack — script `predev` supprime `.next`)

---

## Patterns de config par environnement

### Preview (PR deploys)
- Env vars auto-propagées depuis prod Vercel
- Webhook Meta pointe toujours vers prod → **preview ne reçoit pas d'événements IG** (safe)

### Prod
- Branch `main` = auto-deploy
- Webhook callback URL : `https://heaven-os.vercel.app/api/instagram/webhook`
- Data deletion callback : `https://heaven-os.vercel.app/api/meta/data-deletion`

# 01 — Architecture

> **Mise à jour 2026-04-21** : merge Turborepo → single Next.js app (commit `d32a53f`).
> L'arborescence `apps/web + apps/cp + apps/ui + apps/lib` est **historique** — tout vit maintenant sous `src/`.

---

## Arborescence courante (single Next.js 15)

```
heaven/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← redirect → /m/yumi
│   │   ├── m/[slug]/             ← profils publics (IdentityGate + AdminAuthModal)
│   │   ├── agence/               ← cockpit (dashboard, messagerie, IG, ops…)
│   │   ├── privacy/              ← RGPD (Meta App Review)
│   │   ├── terms/
│   │   ├── data-deletion/
│   │   └── api/                  ← 24 namespaces API
│   ├── shared/components/        ← sidebar, auth-guard, identity-gate…
│   ├── cp/components/cockpit/    ← widgets IG, fan timeline, reply composer
│   ├── middleware.ts             ← JWT `/api/*` (whitelists feed, data-deletion, webhook IG)
│   └── config/
│       ├── entities/             ← yumi.ts, paloma.ts, ruby.ts
│       └── roles/                ← model.ts, admin.ts, permissions.ts
├── plans/                        ← docs projet (internes)
├── docs/                         ← docs USER only (credentials, procédures)
├── supabase/migrations/          ← SQL migrations (030, 032 → 038b)
├── supabase/policies/            ← RLS templates scopés par `model_id`
├── public/meta/                  ← yumi-ai-icon.svg (1024×1024)
├── vercel.json                   ← crons daily (Hobby limit)
├── next.config.ts                ← Cloudinary edge cache 30j
└── package.json                  ← dev Webpack (pas Turbopack, bug chunks)
```

## Stack

- **Next.js 15** + React 19 + TypeScript (dev sous **Webpack** — Turbopack a un bug chunks `.next` récurrent)
- Tailwind v4 (`@tailwindcss/postcss`)
- Supabase (Postgres + RLS + Auth JWT HMAC-SHA256 via `jose`)
- Cloudinary (storage tier-locked par `model_id`, edge cache 30j)
- Meta Graph API v19 (Instagram Business Account 17841400193217961 @yumiiiclub)
- OpenRouter Claude Sonnet 4.6 (prompt caching) — placeholder worker IA

---

## Base de données (~22 tables)

### Scoping `model_id`
Toutes les tables `agence_*` sont scopées par `model_id` format `mN` :
- **`m1`** = YUMI (root admin)
- **`m2`** = PALOMA
- **`m3`** = RUBY

### Tables principales

**Identity & Accounts**
- `agence_models` — registre profils (slug, model_id, display_name)
- `agence_accounts` — auth locale (login + code) SSOT (post migration 034)
- `agence_login_aliases` — alias login additionnels

**CRM & Messagerie**
- `agence_clients` — CRM visiteurs (nickname, pseudo_insta, pseudo_snap)
- `agence_codes` — codes accès temporaires
- `agence_messages` — conversations web
- `agence_messages_timeline` — **vue UNION** web + IG (unified inbox)
- `agence_fans` — registre fan unifié multi-canal

**Content**
- `agence_uploads` — médias (photos, vidéos, stories)
- `agence_posts` — feed posts manuels
- `agence_wall_posts` — murs clients
- `agence_feed_items` — **feed polymorphe** (source_type: manual / instagram / wall)
- `agence_packs` — offres packagées

**Paiements**
- `agence_purchases`, `agence_pending_payments`, `agence_revenue_log`

**Pipeline & Stratégie**
- `agence_pages`, `agence_collaborators`
- `agence_platform_accounts`, `agence_content_pipeline`, `agence_fan_lifecycle`
- `agence_goals`, `agence_media_config`

**Instagram Agent (migration 030 + 038)**
- `instagram_config` (token permanent, business_account_id)
- `instagram_conversations` (dernier message, count)
- `instagram_messages` (UNIQUE sur `ig_message_id` pour idempotence)
- `ig_reply_queue` + RPC `claim_ig_reply_jobs` (FOR UPDATE SKIP LOCKED)

**Outreach & Ops**
- `agence_outreach_leads` (pending welcome messages)
- `agence_ops_metrics` (webhook latency, IA latency, Meta quota, queue depth — rétention 7j)

**IA Agent (spec — table à créer)**
- `agence_ai_replies` (cf. `plans/IA-AGENT-SPEC.md` — review/auto modes)

### Helpers RLS (GUC-based)
- `can_see_model_id(target_id text)` — lecture scopée
- `can_write_model_id(target_id text)` — écriture scopée
- JWT claim `model_id` injecté via session cookie

---

## API (src/app/api/) — 24 namespaces

**Auth & Sessions**
- `auth` : login (dual-credential login+code, rate limiting)

**Content & Messaging**
- `posts`, `uploads`, `upload`, `wall`, `feed` (polymorphe public)
- `messages`, `clients`, `codes`, `cms`

**Agence Cockpit**
- `agence/messaging/inbox` (unified)
- `agence/messaging/reply` (dispatch multi-canal)
- `agence/fans/[id]` + `/merge` + `/link-instagram` + `/search`
- `agence/ops/metrics` (6 KPI)

**Instagram**
- `instagram/webhook` (async `<500ms`, signed_request HMAC, atomic dedup, enqueue)
- `instagram/conversations`, `instagram/media`, `instagram/comments`, `instagram/config`
- `instagram/profile-stats`, `instagram/daily-stats`
- `instagram/exchange-token` (long-lived)

**Meta App Review**
- `meta/data-deletion` (callback RGPD)

**Cron workers**
- `cron/sync-instagram` (daily 6h — posts sync)
- `cron/process-ig-replies` (worker IA — placeholder)
- `cron/purge-ops-metrics` (daily 4h — rétention 7j)

**SQWENSY sync & utilitaires**
- `heaven-beacon` (proxy chat/lead), `sqwensy` (sync), `system`, `purge`, `security`
- `accounts`, `models`, `packs`, `payments`, `pipeline`, `credits`, `finances`

---

## Middleware JWT

`src/middleware.ts` protège `/api/*` avec whitelist publique :
- **Routes publiques GET** : models, wall, packs, posts, uploads, codes, clients, messages, system/status, credits/balance, feed
- **Routes publiques POST** : wall, messages, clients, codes, payments (create/capture)
- **Self-authed** : auth/login, auth/logout, payments/webhook, sqwensy, purge, models/activate
- **Meta public** : `/api/meta/data-deletion`, `/api/instagram/webhook`
- **Reste** : JWT cookie `heaven_session` obligatoire

Pages publiques AuthGuard whitelist : `/privacy`, `/terms`, `/data-deletion`, `/data-deletion/status`.

---

## Patterns architecturaux clés

### 1. Webhook async idempotent
Meta impose `<500ms` response. Pattern appliqué :
1. Verify signed_request HMAC-sha256
2. Dedup atomique via UNIQUE constraint `ig_message_id`
3. INSERT message + RPC `ig_conv_increment_count`
4. Enqueue job `ig_reply_queue`
5. 200 OK immédiat

### 2. Queue + Worker (cron ou externe)
- Producteurs : webhook IG, futurs triggers (outreach welcome)
- RPC `claim_ig_reply_jobs` (FOR UPDATE SKIP LOCKED) évite double-processing multi-workers
- Worker cron respecte rate limit Meta 180 calls/h
- ⚠️ **Vercel Hobby** = 1 cron/jour max → migration vers Upstash QStash (free) ou Vercel Pro prévue (D-6)

### 3. Feed polymorphe
`agence_feed_items` avec `source_type` (manual / instagram / wall) → une seule query pour home profil.

### 4. Unified Inbox
Vue `agence_messages_timeline` = UNION ALL `agence_messages` (web) + `instagram_messages` → une seule fenêtre pour `/agence/messagerie`.

### 5. RLS + GUC JWT claims
Session cookie porte `model_id` + `role` → helpers PG `can_see_model_id()` / `can_write_model_id()` appliquent le scoping sans JOIN explicite dans les queries.

---

## Sync SQWENSY OS

- Validation codes login : `src/app/api/auth/login/route.ts` → `OS_BEACON_URL` (fallback local `agence_accounts`)
- Proxy BEACON : `src/app/api/heaven-beacon/{chat,lead}/route.ts` server-only
- Aucun `NEXT_PUBLIC_*` n'expose l'URL de l'OS (anti-leak branding confidentialité Heaven)

---

## Config Vercel

- `vercel.json` : framework nextjs, build `next build`, crons daily only (Hobby limit)
- `next.config.ts` : Cloudinary `images.remotePatterns` + `minimumCacheTTL: 2592000` (30j)
- Deploy : `heaven-os.vercel.app` — prod sur `main`

## Historique structurel

| Commit | Date | Changement |
|--------|------|------------|
| `d29ad54` | 2026-04-17 | Refactor Turborepo apps/web + apps/cp + apps/ui + apps/lib |
| `d32a53f` | 2026-04-19 | Merge back to single Next.js app (plus de workspaces) |
| `030` → `038b` | 2026-04-20 | 9 migrations IG + messaging unifié + ops + queue |

Voir `plans/MIGRATION-2026-04.md` pour le log détaillé.

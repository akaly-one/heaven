# 08 — Outils

> **Mise à jour 2026-04-21** : chemins alignés sur single Next.js (post merge Turborepo).

---

## Supabase

- Projet dédié Heaven `tbvojfjfgmjiwitiudbn` (isolé de JPS/OPearly/SQWENSY main)
- ~22 tables scopées par `model_id` (`agence_*` + `instagram_*` + `ig_reply_queue` + `agence_ops_metrics` + `agence_feed_items` + `agence_fans` + `agence_outreach_leads`)
- **RLS policies** par `model_id` via GUC helpers `can_see_model_id()` / `can_write_model_id()` (migration 032)
- Helpers code : `src/shared/lib/supabase.ts` (client browser) + `src/shared/lib/supabase-server.ts` (service role)
- **Migrations via Supabase MCP** (pas de CLI locale) — batch appliqué 030, 032-038b

## Cloudinary

- Storage médias : photos, vidéos, stories
- Folders isolés par `model_id` (`m1/`, `m2/`, `m3/`)
- Upload via API `src/app/api/upload/` + `src/app/api/uploads/`
- Cleanup orphelins : `src/app/api/upload/cleanup/`
- Signed URLs tier-locked (access control server-side)
- **Edge cache 30j** : `next.config.ts` `minimumCacheTTL: 2592000`

## OpenRouter (LLM provider)

- Client : `src/shared/lib/openrouter.ts` (si présent, sinon via `process-ig-replies`)
- Modèle cible : **Claude Sonnet 4.6** avec prompt caching (-90% coût system prompt)
- Fallback chain : Claude → Gemini Pro → Perplexity (si provider down)
- Routing par task type (chat casual vs qualification vs analytical)
- **Utilisé par** : worker `/api/cron/process-ig-replies` (placeholder jusqu'à clé D-5)
- Spec : `plans/IA-AGENT-SPEC.md`

## Meta Graph API v19

- Client : `src/shared/lib/instagram.ts`
- **Webhook verify GET** (hub.challenge) + **POST signed_request HMAC-SHA256**
- **Webhook async <500ms** : verify → dedup UNIQUE(`ig_message_id`) → INSERT + RPC `ig_conv_increment_count` → enqueue `ig_reply_queue` → 200 OK
- **Endpoints utilisés** :
  - `/me/messages` — envoi DM (permission `instagram_manage_messages`)
  - `/{ig-user-id}/media` — sync posts (permission `instagram_basic`)
  - `/{media-id}/comments` — lecture comments (permission `instagram_manage_comments`)
  - `/me/accounts` — liste Pages liées (permission `pages_read_engagement`)
  - `/{ig-user-id}` fields=followers_count,media_count — stats profil
- **App Review Meta pending** (cf. `plans/META-APP-PUBLICATION-PLAN.md`) — App ID `981952864691167` `Yumi-AI` en Dev Mode
- Rate limit : 180 calls/h respecté par worker (queue throttle)

## Queue & Worker pattern

- **Producer** : webhook IG enqueue dans `ig_reply_queue` (table Supabase)
- **RPC `claim_ig_reply_jobs(limit)`** : FOR UPDATE SKIP LOCKED (évite double-processing multi-workers)
- **Worker** : `src/app/api/cron/process-ig-replies/route.ts` (placeholder — logique IA en attente D-5)
- **Cron infra** (Vercel Hobby = 1/jour max) :
  - `sync-instagram` : daily 6h (posts/stats)
  - `purge-ops-metrics` : daily 4h (rétention 7j)
  - `process-ig-replies` : **pending D-6** (Vercel Pro vs Upstash QStash vs GitHub Actions)

## Observabilité Ops

- Table `agence_ops_metrics` (rétention 7j via cron purge)
- Métriques : `webhook_latency_ms`, `ia_latency_ms`, `meta_quota_remaining`, `queue_depth`, `errors_total`
- API : `src/app/api/agence/ops/metrics/route.ts`
- UI : `src/app/agence/ops/page.tsx` (6 KPIs dashboard)

## Jose (JWT)

- Lib `jose@6` — HMAC-SHA256
- Helpers : `src/shared/lib/jwt.ts`
- `createSessionToken({ sub, role, scope, display_name, model_id })` → 24h TTL
- `verifySessionToken(token)` → payload (utilisé par middleware + RLS GUC)
- Secret : `HEAVEN_JWT_SECRET` env

## Paiements

### PayPal (React SDK)
- `@paypal/react-paypal-js@9`
- Routes : `/api/payments/paypal/{create,capture,webhook}`
- Webhook self-authed (verify signature)

### Revolut Business
- Routes : `/api/payments/revolut/{create,status,webhook}`
- Intégration manuelle (pas de SDK officiel React)

## Fingerprinting & security

- Device fingerprint : `src/shared/lib/device-fingerprint.ts`
- Screenshot detection : `src/shared/components/content-protection.tsx`
- Alert API : `/api/security/screenshot-alert`
- Anti-embed : headers CSP `frame-ancestors`
- Auth rate limiting : `/api/auth/login` via `src/shared/lib/rate-limit.ts`

## Meta App Review — Artifacts livrés

- Privacy Policy : `src/app/privacy/page.tsx` → `https://heaven-os.vercel.app/privacy`
- Terms of Service : `src/app/terms/page.tsx` → `https://heaven-os.vercel.app/terms`
- Data Deletion UI : `src/app/data-deletion/page.tsx` + `/status`
- Data Deletion callback : `src/app/api/meta/data-deletion/route.ts` (HMAC signed_request parse)
- App Icon : `public/meta/yumi-ai-icon.svg` (1024×1024, conversion PNG à faire NB)

## Analytics

- Vercel Analytics v2.0.1 (`@vercel/analytics` dans `src/app/layout.tsx`)
- PostHog (complémentaire — events custom + session replay)

## Cloudflare / CDN (pour info)

- Vercel Edge Network en natif (pas de Cloudflare séparé)
- Pas de Workers utilisés

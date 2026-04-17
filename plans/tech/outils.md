# 08 — Outils

## Supabase

- Projet dédié Heaven (not shared avec JPS/OPearly/SQWENSY)
- 19 tables scopées par `model_id` (`agence_*` + `instagram_*`)
- RLS policies par `model_id` (à auditer — voir `product/roadmap.md`)
- Helpers : `apps/lib/src/lib/supabase.ts` (client) + `supabase-server.ts` (service role)

## Cloudinary

- Storage médias : photos, vidéos, stories
- Folders isolés par `model_id` (`m1/`, `m2/`, `m4/`)
- Upload via API `apps/cp/src/app/api/upload/`
- Cleanup orphelins : `apps/cp/src/app/api/upload/cleanup/`
- Signed URLs tier-locked (access control server-side)

## OpenRouter

- Client : `apps/lib/src/lib/openrouter.ts`
- Modèles : Claude Sonnet / GPT-4 / Gemini Pro / Perplexity
- Routing par task type (sales vs casual vs analytical)
- Fallback chain si un provider down
- Utilisé par Instagram Agent

## Meta Graph API

- Client : `apps/lib/src/lib/instagram.ts`
- Webhook verify GET (hub.challenge)
- Webhook POST : parse event → dedup (agence_messages UUID) → store → agent reply
- Signature HMAC-SHA256 (App Secret)
- Permission requise : `instagram_manage_messages` (App Review Meta pending)

## Jose (JWT)

- Lib `jose@6` — HMAC-SHA256
- Helpers : `apps/lib/src/lib/jwt.ts`
- `createSessionToken({ sub, role, scope, display_name })` → 24h TTL
- `verifySessionToken(token)` → payload
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

- Device fingerprint : `apps/lib/src/lib/device-fingerprint.ts`
- Screenshot detection : `apps/ui/src/components/content-protection.tsx`
- Alert API : `/api/security/screenshot-alert`
- Anti-embed : headers CSP `frame-ancestors`

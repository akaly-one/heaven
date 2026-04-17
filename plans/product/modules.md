# 06 — Modules

## Catalogue modules (dashboard CP)

Source : `apps/cp/src/app/agence/`.

| Module | Route | Description |
|--------|-------|-------------|
| Cockpit | `/agence` | Vue d'ensemble multi-profil |
| Architecture | `/agence/architecture` | Diagramme live du système (dev) |
| Automation | `/agence/automation` | Flows automatiques (posts, messages) |
| Clients | `/agence/clients` | CRM par profil (tier, revenus, activité) |
| CMS | `/agence/cms` | Éditeur pages + collaborateurs |
| Finances | `/agence/finances` | Revenus, commission 25%, export |
| Instagram | `/agence/instagram` | Agent IA — v0.4.0 |
| Pipeline | `/agence/pipeline` | Planning contenu + goals |
| Settings | `/agence/settings` | Tarifs, paramètres par profil |
| Stratégie | `/agence/strategie` | Simulateur revenus + onboarding platforms |

## Instagram AI Agent

Module v0.4.0 (ajouté 2026-04-13).

### Architecture
- Migration `030_instagram_agent.sql` : 3 tables (config, conversations, messages) + seed YUMI
- `apps/lib/src/lib/openrouter.ts` — client multi-LLM (Claude / GPT / Gemini / Perplexity)
- `apps/lib/src/lib/instagram.ts` — helpers Meta Graph API
- API `/api/instagram/webhook` — GET verify + POST receive + dedup + agent auto-reply
- API `/api/instagram/send` — manual reply auth root/model
- API `/api/instagram/conversations` — GET list + PATCH (mode, archive, block)
- Dashboard `/agence/instagram` — split-pane (liste + chat + mode toggle + stats)

### Sécurité
- Webhook signature HMAC-SHA256 (Meta App Secret)
- Auth JWT sur send + conversations
- Fallback human si AI fail

### En attente (credentials USER)
- `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` (@yumiiiclub)
- `OPENROUTER_API_KEY`
- Meta App Review (permission `instagram_manage_messages`)

Détail complet : `docs/os/INSTAGRAM-AGENT.md`.

## BEACON widget

`apps/ui/src/components/beacon-widget.tsx` — widget chat flottant.

- Proxy server-side `/api/heaven-beacon/{chat,lead}` (apps/cp)
- Aucun leak de l'URL OS dans le bundle client
- 3 quick actions (Découvrir profils, Packs, J'ai un code)

## Stories system

- Upload photo/vidéo via Cloudinary
- TTL souhaité : 24h (pending — voir ROADMAP 8 fixes)
- Fullscreen viewer (apps/ui/src/components/profile/story-viewer.tsx)

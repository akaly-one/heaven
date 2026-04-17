# 09 — Roadmap

Source originale : `docs/os/masterplan/ROADMAP-HEAVEN.md` (maintenant USER).

Progress global (2026-04-17) : ~58% (43/77 tasks done).

## Phase 1 — Fondation ✅ (9/9)
Auth JWT, DB Supabase, Cloudinary, Vercel deploy, login, 24 security fixes.

## Phase 2 — Profil public ✅ (15/16, 94%)
Identity gate, tier gallery, wall, feed, pack shop, adaptive polling, stories, hero collapse, theme-aware colors.
- Pending : 2.16 SEO metadata + Open Graph

## Phase 3 — Dashboard CP (75%)
Cockpit, CRM clients, messages, pipeline, finances, settings, stratégie, automation.
- Pending : fine-grain permissions model role, export CSV finances

## Phase 4 — Multi-profil (60%)
- Done : YUMI + RUBY actifs (DB migration 026 legacy slug → m1)
- Done : `apps/lib/src/config/entities/` unique source
- Pending : activation PALOMA (m4), flow onboarding profil (self-serve)

## Phase 5 — Paiements live (30%)
- Done : PayPal capture + webhook
- Done : Revolut create + status
- Pending : KYC creator, Stripe Connect (si choisi), auto payout 25%/75%

## Phase 6 — Instagram Agent (40%)
- Done : migration 030, OpenRouter, Meta helpers, webhook, send, conversations, dashboard
- Pending : credentials Meta, App Review, fine-tune prompt YUMI

## Phase 7 — Écosystème SQWENSY (25%)
- Done : proxy BEACON server-side
- Done : sync codes login via OS API
- Pending : widget BEACON intelligent avec contexte profil, unified notifications

## Restructure 2026-04 ✅
- Monorepo Turborepo
- `plans/` standard
- Purge P0 confidentialité
- Build turbo PASS

## 8 fixes en attente (UX)

1. **Story TTL 24h** — migration `031_story_expires.sql` + filter expired dans API posts
2. **Bouton fermer story cassé** — fix X handler dans `story-viewer.tsx`
3. **Déconnexion pseudo** — bouton header `/m/[slug]` + clear sessionStorage
4. Galerie scroll restoration (partiel)
5. Pack tier gate — animation reveal
6. Wall reply threading
7. Dashboard filter persistance (localStorage)
8. Message read receipts

4-8 : reportés Phase 3 polish.

## Priorités 2026-Q2

1. Credentials Meta → activation Instagram Agent prod
2. Stripe Connect + KYC creator
3. Fix 1-3 (story TTL + X button + déconnexion)
4. Decomposition `apps/cp/src/app/agence/page.tsx` (2453 lignes)

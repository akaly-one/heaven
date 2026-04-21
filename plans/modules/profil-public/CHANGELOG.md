# Profil public — Changelog

## 2026-04-21

- Création initiale V2 fusion depuis :
  - `plans/product/modules.md` (sections profil, feed polymorphe, stories)
  - `plans/tech/architecture.md` (route `/m/[slug]`, `agence_feed_items`, RLS, whitelist)
  - `plans/product/objectifs.md` (tier system P1-P4, Plans Identité)
  - `plans/business/bp-agence-heaven-2026-04/README.md` (règles publication Mode A vs Mode B)
  - Briefs NB B9 (avatar sync IG cross-module + CTA natifs)
  - Briefs NB B10 (posts IG apparaissent sur profil public, click → Insta natif, badges distinctifs couronne/Instagram)
  - Code existant analysé : `src/web/components/profile/feed-section.tsx`, `src/app/m/[slug]/page.tsx`, `src/app/api/feed/route.ts`, `src/app/api/cron/sync-instagram/route.ts`
- Livrables : `STRATEGIE-v1.2026-04-21.md` + `INFRA-v1.2026-04-21.md`
- Hors scope : DMCA Release Form workflow (Sprint 3 BP), edit mode avancé, paiement Stripe

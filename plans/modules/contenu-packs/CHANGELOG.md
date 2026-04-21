# Contenu + Packs — Changelog

## 2026-04-21 (20:34) — Livraison Phase 5 (briefs B8)

Phase 5 du plan multi-agent exécutée (Agents 5.A + 5.B + 5.C).

### Agent 5.A — Drag & drop
- **Découverte clé** : le drag&drop HTML5 natif n'est **pas cassé** dans `src/app/agence/page.tsx` (handlers useCallback + `application/json`, lignes 558-593). L'architecture est monolithique (2537L), pas le code du DnD. Extraction préparatoire pour futur refactor Phase 2.
- 3 nouveaux composants dans `src/cp/components/cockpit/contenu/` :
  - `content-draggable-item.tsx` (102L) — drag source
  - `pack-drop-zone.tsx` (89L) — drop target
  - `pack-composer.tsx` (429L) — 3 vues Dossiers/Colonnes/Liste
- `post-composer.tsx` (créé, n'existait pas) — upload direct + checkbox cross-post IG
- Intégration opt-in via `?composer=new` (non destructif, ancien rendu fonctionne)
- **Aucune dépendance npm ajoutée** (HTML5 natif seulement — cohérent avec feedback memory `extreme_cost_optimization_2026`)

### Agent 5.B — Règles visibilité
- Migration 047 : `visibility_rule` enum (public/if_purchased/preview_blur), `blur_intensity` 0-20, `preview_count` int
- Helper `src/shared/lib/pack-visibility.ts` : `computeFeedItemState` couvrant 6 scénarios (fan null/acheteur/non-acheteur × 3 règles)
- API PATCH/GET `/api/packs/[id]` scope-checked (model own-packs seulement, root global)
- API `/api/feed?fan_id=` étendu : retourne `visibility_computed: { visible, blurred, blurIntensity, showPaywall }` par item
- UI admin `pack-visibility-settings.tsx` avec preview flou live (Tailwind `backdrop-blur-*` + CSS `filter: blur`)

### Agent 5.C — Upload direct + IG publish
- Helper `cloudinary-signed.ts` : `generateSignedUpload` SHA-1 signature, TTL 5min, scope folder `heaven/{model_id}/...` forcé
- API `/api/upload/signed-url` : POST signed URL, auth JWT, enforce model ownership
- Helper `instagram-publish.ts` : flow Meta Graph 2-étapes (container → publish), `InstagramPublishError` flag `devModeLikely` (detect code #200)
- API `/api/posts/[id]/publish-ig` : idempotent via `source_payload.ig.ig_media_id`, model scope enforced
- Cron `sync-instagram` étendu : fonction `mirrorMetaMediaToCloudinary` (6 posts/tick max), re-upload URLs Meta CDN avant expiration 24h → `media_url` Cloudinary permanent (résout P2-3)
- Upload XHR direct (progress bar, cancel) dans `post-composer.tsx`

### Défauts résolus
- P0-5 (tab Contenu lit agence_feed_items) — toujours via Phase 1 matview + Phase 5.B visibility_computed ✅
- P0-9 (composer pas sync IG) ✅
- P1-5 (composer poste uniquement web) ✅
- P2-3 (Meta CDN URLs 24h expire) ✅

### Limitations
- `instagram_content_publish` limité DevMode → pleinement opérationnel après App Review Phase 11
- Composer opt-in via `?composer=new` pour éviter régression sur monolithe existant
- Cache `.next` corruption récurrent (non lié au scope) → `rm -rf .next` avant dev

Rapport : `plans/_reports/UPDATE-REPORT-2026-04-21-2034-phase4-5.md`

---

## 2026-04-21

- Création initiale V2 fusion depuis :
  - `plans/product/modules.md` (tab contenu, packs, stories)
  - `plans/tech/architecture.md` (Cloudinary, `agence_packs`, `agence_uploads`, `agence_feed_items`)
  - `plans/business/bp-agence-heaven-2026-04/README.md` (BP Mode A/B/C, stratégie packs)
  - Briefs NB B8 (restaurer drag & drop, 3 vues, règles pack affinables, upload Cloudinary direct, sync feed selon règles visibility)
  - Analyse git history : commits `6078376` (drag & drop merge), `977f6ba` (Kanban), `ae5c7f3` (mobile touch glow), `3654a10` (kanban per pack), `efb799b` (DnD 3 vues), `9e93428` (suppression 2026-04-10)
  - Code existant : `src/cp/components/cockpit/pack-configurator.tsx`, `packs-editor.tsx`, `src/app/api/packs/route.ts`, `src/app/api/uploads/route.ts`, `src/app/api/feed/route.ts`
- Livrables : `STRATEGIE-v1.2026-04-21.md` + `INFRA-v1.2026-04-21.md`
- Point critique identifié : drag & drop existait + a été supprimé par erreur dans le commit de cleanup 2026-04-10 → restauration prioritaire via git history

  **Ajustement Phase 5.A** : le drag&drop natif HTML5 reste fonctionnel dans `page.tsx`. La « suppression » concernait `/agence/contenu/page.tsx` dédiée, fusionnée dans le dashboard monolithe. Extraction en composants réutilisables faite à la place.

- Hors scope : stories TTL 24h (déjà livré v1.0), paiement Fanvue/Stripe (côté visiteur), modération IA, watermarking

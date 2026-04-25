# Heaven — Changelog

## [v1.6.1] — 2026-04-25 evening — Profile-as-Hub Phase 2 (MessagerieEmbedded + BlurPreviewToggle)

> Suite de v1.6.0 — extraction MessagingPageInner + drawer admin floutage.

### Features

- **Phase 2.1 — `<MessagerieEmbedded>`** : variante exportable de la page messagerie
  pour mount inline dans le cockpit (vs redirect Phase 1). Hauteur ajustée
  (`calc(100vh - 96px)` en embedded vs `calc(100vh - 48px)` standalone) pour rester
  sous le AgenceHeader sticky. Tab Messagerie default activée au mount.
- **Phase 2.2 — `<BlurPreviewToggle>`** : drawer FAB admin bottom-right pour basculer
  simulation vue floutée (8px blur) vs débloquée. Apply via classe body
  `heaven-blur-preview` + selectors `.heaven-blur-target` / `.heaven-blur-target-strong`.
  Dispatch event `heaven:blur-preview-toggle` pour synchronisation autres composants.
  Touch target 44+ FAB pinned bottom-right tous viewports.

### Refactor

- `src/app/agence/messagerie/page.tsx` : `MessagingPageInner` étendu avec prop
  `embedded?: boolean`. Si true, skip wrapper `<OsLayout>` (déjà fourni par parent).
  Export `MessagerieEmbedded` ajouté avec Suspense pour usage inline cockpit.
- `src/app/agence/page.tsx` : tab Messagerie mount inline `<MessagerieEmbedded />`
  au lieu de redirect `window.location.href`. Default activeTab = "messagerie".

### Phase 2 livrée (sur les items reportés v1.6.0)

- ✅ Extraction `MessagingPageInner` exportable
- ✅ `<BlurPreviewToggle>` drawer admin
- ⏸ `<PacksEditorInline>` reporté (l'existant TierView L1697 couvre 90% — édit déjà inline)
- ⏸ Suppression effective `contenu-panel.tsx` / `home-panel.tsx` reportée (vérif imports cycle suivant)
- ⏸ Décomposition `/m/[slug]/page.tsx` 2050 LOC reportée (gros refacto, hors scope session)

### Commits clés

- `b01ec27` — v1.6.0 Profile-as-Hub V1 + Header CP centralisé
- *(à venir)* — v1.6.1 Phase 2 MessagerieEmbedded + BlurPreviewToggle

---

## [v1.6.0] — 2026-04-25 evening — BRIEF-19/20/21/22+23 Profile-as-Hub + Header CP centralisé

> Session multi-briefs en mode chef d'équipe — vision macro NB : pattern SPRBP
> (Single Page Role-Based Permissions) style Instagram/TikTok. Profil = hub unique
> de gestion contenu/feed/packs avec couches admin overlayées si propriétaire connecté.

### Features

- **BRIEF-19** — Header CP global centralisé : 4 boutons icônes seules `[👁 Eye] [🔗 Link2] [🔑 Key] [🎬 Story]` centrés, retrait labels textes "Générer"/"Story". Eye + Link2 retirés de `agence-header.tsx` (déplacés vers header global, accessibles partout dans le CP).
- **BRIEF-20** — Bouton Clé Générer fonctionnel (déjà câblé via dispatch event `heaven:generate` → ouvre `<GenerateModal>` existant). Aucune modif BE nécessaire.
- **BRIEF-21** — Bouton Story Générateur image téléchargeable : nouveau `<StoryGeneratorModal>` (~330 LOC) avec 4 customisations :
  1. Image bg : default = dernière photo upload modèle (GET /api/uploads), toggle "Choisir autre" → file input local (max 10 MB)
  2. Slider flou 0-20px (filter CSS)
  3. Toggle code d'accès inline (durée jours + pack/tier, généré via POST /api/codes existant)
  4. Aperçu canvas 1080×1920 redessiné temps réel + output PNG téléchargeable
- **BRIEF-22+23** — Profile-as-Hub V1 (pattern SPRBP) :
  - Overlay admin sur `/m/[slug]` quand propriétaire connecté (visible uniquement si `isModelLoggedInActual && !previewMode`)
  - 4 boutons admin (Eye/Link2/Key/Story) via `<HeavenAdminActions>` réutilisable
  - `<PostComposer>` inline (text + photo upload Cloudinary + POST /api/wall)
  - Mount `<StoryGeneratorModal>` admin
  - Mode preview admin (`previewMode=true`) masque toute la couche admin
- **Cockpit `/agence` simplifié** : passage de 3 tabs (Dashboard/Contenu/Stratégie) à **2 tabs** (Messagerie/Stratégie). Tab Messagerie redirige vers `/agence/messagerie`. Onglet Contenu retiré.

### Refactor

- `src/cp/components/cockpit/contenu/contenu-panel.tsx` (1432 LOC) annoté `@deprecated` (conservé pour rollback rapide, suppression cycle suivant)
- `src/shared/components/header.tsx` : retrait imports `Eye`, `Link2`, `KeyRound`, `ImagePlus`, `Pencil`, `StoryGenerator` legacy → mount `<HeavenAdminActions>` + `<StoryGeneratorModal>`
- `src/cp/components/cockpit/dashboard/agence-header.tsx` : retrait Eye/Link2 inline + imports
- `src/app/agence/page.tsx` : TABS const 3→2, default activeTab = "strategie", onTabChange Messagerie redirect, cast `as string` sur conditions panels devenus dead code

### Architecture

- **Pattern SPRBP** adopté : Single Page (`/m/[slug]`) avec Role-Based Permissions overlay
- **ADR-001** Profile-as-Hub : `plans/modules/profile/DECISIONS.md`
- **ADR-002** Responsive mobile-first transversal : tous les nouveaux composants respectent touch targets 44+ + patterns Tailwind responsive
- Anti-patterns formellement bannis : pages dupliquées CP/Profil, composants miroirs, routes API dédoublées, hooks parallèles

### Docs

- 4 briefs formalisés `plans/PMO/briefs/BRIEF-2026-04-25-{19,20,21,22-23}-*.md`
- `plans/PMO/02-BRIEFS-REGISTRY.md` mis à jour : 22 briefs reçus, 6 livrés totaux, 5 partial
- `plans/PMO/04-PROTOCOLE-CHEF-EQUIPE-MULTIAGENT.md` v1.1 : §13.1 enrichi avec critère responsive mobile-first transversal
- `plans/PMO/_drafts/SESSION-2026-04-25-evening-briefs.md` : buffer briefs accumulés pendant phase intake
- `plans/PMO/plan-global-v2-profile-as-hub.md` : plan global session
- `plans/modules/profile/CONTEXT.md` (NOUVEAU) : architecture en couches + hooks + routes API
- `plans/modules/profile/DECISIONS.md` (NOUVEAU) : ADR-001 + ADR-002
- BRIEF-17 et BRIEF-18 annotés `⚠️ Partiellement révisé par BRIEF-22+23 Profile-as-Hub`

### Phase 2 différée

- `<PacksEditorInline>` édit prix/details/photo cover inline (existant TierView L1697 couvre 90%)
- `<BlurPreviewToggle>` drawer admin "vue floutée vs débloquée"
- Extraction `MessagingPageInner` exportable pour mount inline cockpit (vs redirect actuel)
- Suppression effective `contenu-panel.tsx`, `home-panel.tsx`, `story-generator.tsx` legacy après vérif zéro imports
- Décomposition `/m/[slug]/page.tsx` 2050 LOC → composants extraits

### Commits clés

- À venir post-livraison (consolidation Wave 2 — tsc + commit + push)

---

## [v1.5.2] — 2026-04-25 — BRIEF-18 Header unifié Root / Modèle Admin / Client

### Features
- **`<HeavenHeader>` wrapper auto-detect** : composant unifié qui détecte automatiquement le rôle utilisateur via `useModel()` et rend le header approprié (admin OU client). Évite hydration mismatch via guard `ready`.
- **`<HeavenAdminHeader>` context-aware** : header admin unifié pour root (m0) + modèles (m1=Yumi, m2=Paloma, m3=Ruby...). Cohérent en CP `/agence/*` et profil `/m/[slug]` quand admin connecté. Délègue vers `<AgenceHeader>` legacy en context "cockpit" pour zero régression.
- **Header admin sur `/m/[slug]`** : quand admin connecté navigue sur le profil public, voit désormais le header admin unifié (logo HEAVEN + display_name + RootCpSelector si root + slot extraActions + bouton Logout). Plus de confusion avec le HeaderBar visiteur.
- **`<HeavenClientHeader>`** : wrapper minimal qui délègue vers `<ModelHeaderBar>` legacy (visiteurs/fans). Phase 3 inlinera le markup.
- **Cohérence cross-vue** : même header admin partout (CP + profil), bouton login/logout position fixe (extrême droite), label adaptatif selon état.
- **AdminEditToolbox** : boutons photo/banner/save/cancel/preview de BRIEF-17 désormais hébergés dans le slot `extraActions` du HeavenAdminHeader (cohérent partout).

### Fixes
- Bouton Eye 👁 "Voir profil public" supprimé d'`agence-header.tsx:290` (devenu redondant car header admin unifié rend la navigation cross-vue cohérente sans raccourci dédié)
- Import `Eye` retiré du fichier agence-header

### Technical
- Nouveau dossier `src/shared/components/header/` (préparation extraction future :
  - `heaven-header.tsx` (50 LOC) — wrapper auto-detect avec `useModel()`
  - `heaven-admin-header.tsx` (146 LOC) — context-aware (cockpit / profile-public / messagerie / stats / settings)
  - `heaven-client-header.tsx` (78 LOC) — wrapper ModelHeaderBar
- Approche **adapter pattern** : zero breaking change. Anciens composants (`header.tsx`, `agence-header.tsx`, `model-header-bar.tsx`) restent fonctionnels — Phase 3 fusionnera progressivement.
- `/m/[slug]/page.tsx` : ternaire conditionnel `isModelLoggedInActual && !previewMode` → `<HeavenAdminHeader>` sinon HeaderBar inline visiteur (préservé pour rollback safe).
- Mode preview admin : HeaderBar visiteur reste rendu mais avec bouton "ADMIN" pour sortir (logique déjà en place depuis BRIEF-17).

### Architecture
- **Adapter pattern** Phase 1+2 livré (zero régression confirmée tsc + grep imports)
- Phase 3 différée : extraction `<HeaderTabs>` et `<HeaderActions>` config-driven, suppression effective des legacy headers, doc `docs/architecture/HEADER-SYSTEM.md`

### TODO post-merge
- Migrer `<AgenceHeader>` call-site (`src/app/agence/page.tsx:894`) vers `<HeavenAdminHeader context="cockpit">` quand stable
- Marquer `model-header-bar.tsx` `@deprecated` (déjà sans call-site externe)
- Retirer HeaderBar inline (`/m/[slug]/page.tsx` L823-1037) une fois Phase 2 stabilisée
- Doc architecture HEADER-SYSTEM.md

### Commits clés
- `d9ead8f` — cadrage BRIEF-18
- *(à venir)* — application Phase 1+2 (3 nouveaux fichiers + 2 modifs)

---

## [v1.5.1] — 2026-04-25 — BRIEF-17 Header admin enrichi + Feed IG vignettes + Likes/Commentaires

### Features
- **HeaderBar admin enrichi** : quand admin connecté (yumi/paloma/ruby/root) sur `/m/[slug]`, le header expose 5 boutons d'édition : Camera (photo profil), Image (banner), Save (si modifs en attente), Cancel, Eye (mode visiteur preview)
- **Mode édition auto-actif** : plus besoin de `?edit=true` query param, l'édition s'active automatiquement quand `isModelLoggedIn=true`
- **Mode preview visiteur** : bouton Eye dans le HeaderBar admin permet de prévisualiser le profil comme un visiteur normal (sans déconnexion). Bouton ADMIN pour sortir du preview. Lien partageable `?preview=true`
- **Feed Instagram en grille de vignettes** : nouveaux composants `<InstagramFeedGrid>` (3 cols mobile, 4-5 desktop) + `<FeedItemDetailModal>` lightbox. Posts IG retirés du feed vertical (qui garde wall + manual posts)
- **Likes** : bouton Heart dans `FeedItemCard` (modes card + thumbnail), optimistic UI + revert on error, persistance DB via `agence_feed_likes` UNIQUE(feed_item_id, client_id)
- **Commentaires** : bouton MessageCircle ouvre lightbox avec liste comments + zone saisie textarea (Enter = submit, Shift+Enter = newline), validation 1-500 chars, soft delete owner-only ou admin

### Fixes
- Bouton "Modifier profil" Pencil supprimé de `agence-header.tsx` (obsolète, édition désormais inline via HeaderBar admin)
- HeroSection : ancien bloc photo/banner remplacé par hint discret (refs partagées avec HeaderBar pour éviter conflits)

### Technical
- Migration `077_feed_interactions.sql` (live Supabase) :
  - Tables `agence_feed_likes` (UNIQUE feed_item_id+client_id) + `agence_feed_comments` (1-500 chars + soft delete)
  - Triggers auto-incrément `like_count` / `comment_count` sur `agence_feed_items` (insert+delete likes, insert+update soft-delete comments)
  - RLS enabled + policies open-all (pattern repo)
- Routes API :
  - `POST /api/feed-items/[id]/like` body `{clientId}` → toggle, `{liked, likeCount}`
  - `GET /api/feed-items/[id]/comments?limit=50&offset=0` → `{comments, total, hasMore}` avec join clients pseudo
  - `POST /api/feed-items/[id]/comments` body `{clientId, content}` → `{comment}`
  - `DELETE /api/feed-items/[id]/comments?commentId=xxx` → soft delete owner ou admin
- Helpers serveur `src/shared/lib/feed/likes.ts` : `hasLiked(feedItemId, clientId)` + `getLikedSet(ids[], clientId)` batch
- `useEditMode` étendu : `previewMode` + `setPreviewMode` + auto-active edit quand `isModelLoggedIn`
- Composants nouveaux :
  - `src/web/components/profile/instagram-feed-grid.tsx`
  - `src/web/components/profile/feed-item-detail-modal.tsx`
- `FeedItemCard` étendu : props `mode: "card" | "thumbnail"`, `clientId`, `initialLiked`, `onClick` ; mode thumbnail = aspect-square + hover overlay caption + counts
- `HeaderBar` /m/[slug] : 11 nouvelles props (refs, handlers, previewMode, etc.)

### Commits clés
- `57125ea` — suppression Pencil + cadrage BRIEF-17
- *(à venir)* — dispatch 3 agents : DB+BE migration 077 + routes API + HeaderBar admin enrichi + Instagram Grid + Likes UI

### TODO post-merge
- Câbler `getLikedSet()` côté `/m/[slug]/page.tsx` pour pre-render `initialLiked` (route batch à ajouter)
- Endpoint `GET /api/feed-items/liked-by-client?ids=a,b,c&clientId=X` pour hydrater likedSet sur navigation

---

## [v1.5.0] — 2026-04-25 — BRIEF-16 Packs + Payment Providers modulaires

### Features
- Payment providers modulaires activables/désactivables via toggle cockpit (manual, paypal, revolut, stripe, **wise**)
- Flow V1 manuel PayPal.me : référence human-readable copiable (`YUMI-PGLD-K3M9X2`) + validation cockpit modèle
- **PayPal Checkout JavaScript SDK (hybride)** : bouton inline via `@paypal/react-paypal-js` (popup, pas de redirect plein écran), rendu auto si `NEXT_PUBLIC_PAYPAL_CLIENT_ID` défini, sinon silencieux. Le V1 manuel reste actif en parallèle comme fallback.
- **Wise Payment Requests provider** : génère un lien `wise.com/pay/...` partageable via API v3 (POST `/v3/profiles/{id}/payment-requests`)
- Custom pack shopping cart : sélection photo/vidéo × catégorie × quantité + description libre + total live
- Agent IA pack awareness : historique achats + temps restant + intent correction pseudo (regex `detectPseudoCorrection()`)
- Cloisonnement strict code ↔ pack_slug au niveau serveur (plus d'accès croisé par tier)
- CGV publiques `/cgv` + checkbox acceptation obligatoire avant commande
- Fix sync messages lu/non-lu : cockpit `POST → PATCH` sur `/api/messages` (mark_read désormais effectif), fan public `readMsgIdsRef` persisté en localStorage `heaven_read_<slug>_<clientId>`
- Hover taglines IdentityGate Snap/Code/Insta (Cercle Intime / Accès Premium / Backstage) remplacent le titre modèle au survol

### Technical
- Migration `073_payment_providers_toggle.sql` — table `agence_settings` singleton `id='global'` avec `payment_providers` JSONB + extension `agence_pending_payments` (`reference_code`, `pseudo_web`, `pack_breakdown JSONB`, `rejected_reason`)
- Migration `074_webhook_events_antireplay.sql` — table `agence_webhook_events` avec contrainte `UNIQUE(provider, event_id)`
- Migration `075_custom_pricing.sql` — table `agence_custom_pricing` (photo 5 € base + vidéo 10 €/min × multiplicateur Silver/Gold/VIP Black/VIP Platinum + pied ×3) + seed 24 rows Yumi/Paloma/Ruby (m1/m2/m3)
- Migration `076_pending_pseudo_correction.sql` — colonne `agence_clients.pending_pseudo_correction` BOOLEAN + index partiel
- Interface `PaymentProvider` unifiée dans `src/shared/payment/types.ts` (id étendu : `manual | paypal | revolut | stripe | wise`)
- Registry `src/shared/payment/registry.ts` avec `getProvider(id)` + `getEnabledProviders()` + `toggleProvider()` (audit log) + fallback manual seul
- Wrappers providers : `manual.ts`, `paypal.ts`, `revolut.ts`, `stripe.ts`, **`wise.ts`** dans `src/shared/payment/providers/`
- Composant `<PayPalCheckoutButton>` (`src/web/components/profile/paypal-checkout-button.tsx`) wire avec `/api/payments/paypal/{create,capture}` existant
- Stripe feature-flagged OFF par défaut + triple-guard (`ALLOW_STRIPE=true` env + provider throws + registry refuse enable + route 403)
- Helper `storeAndCheckWebhook()` centralisé (signature `timingSafeEqual` + anti-replay code 23505 + raw body JSONB)
- Routes API : `POST /api/payment/create` (registry dispatch), `POST /api/payments/manual/confirm` (approve/reject), `POST /api/packs/custom/quote` (breakdown total), `GET /api/payments/pending` (liste cockpit), `GET/POST /api/payment/providers` (toggle root-only audit)
- UI cockpit `/agence/payments` (liste pending + Valider/Refuser) + `<PaymentPendingDrawer>` messagerie + `<PaymentProvidersToggle>` cockpit
- Pack guard serveur `hasPackAccess(clientId, packSlug, model)` strict EXACT match + cache 30s in-memory
- Agent IA system prompt enrichi automatiquement avec `formatPackHistoryForPrompt(ctx)` ("HISTORIQUE ACHATS CLIENT : Gold actif 12j, VIP Black expiré 3j")

### Dependencies
- `@paypal/react-paypal-js` (PayPal JavaScript SDK wrapper officiel React)

### Env vars ajoutées
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — déjà présent, sert au SDK client
- `ALLOW_STRIPE` — feature flag (défaut vide ou `false`)
- `WISE_API_TOKEN` — token API Wise Business (Settings → API tokens)
- `WISE_BUSINESS_PROFILE_ID` — récupéré via `GET /v2/profiles`
- `WISE_API_URL` — défaut `https://api.wise.com` (sandbox `https://api.sandbox.transferwise.tech`)

### Docs
- `docs/architecture/PAYMENT-INTEGRATION-GUIDE-NB.md` — guide opérationnel NB :
  - §2 PayPal Business (handle, webhooks, env vars)
  - §2.6 différence REST API vs JavaScript SDK + approche hybride Heaven (nouveau)
  - §3 Revolut Merchant (KYB, webhooks, signature HMAC, payout SEPA Wise)
  - §4 Wise + Apple Pay (3 alternatives + recommandation Revolut→Wise payout)
  - §4.5 Wise Payment Requests API concret (KYB, token, profileId, env vars, limites) (nouveau)
  - §5 Stripe urgence + feature flag
  - §7 checklist env vars Vercel complète
  - §9 DAC7 BE (déclaration revenus ≥ 2000€/an ou 30 ventes)
  - §10 FAQ correction pseudo
- 5 ADR dans `plans/modules/payments/DECISIONS.md` (architecture modulaire, V1 manuel ref, anti-replay UNIQUE, custom pricing multiplicateurs, settings singleton)
- CGV publiques `/cgv` — 14 sections (objet, 18+, prix, accès 30 j, paiement, responsabilité pseudo, rétractation art. VI.53 CDE BE, usage perso, révocation, juridiction Bruxelles FR)

### Commits clés
- `796d056` / `c7a797a` — BRIEF-16 V1 dispatch 6 agents parallèles (37 fichiers, 4 migrations live Supabase)
- `cdb03df` — PayPal Checkout SDK hybride + Wise provider (9 fichiers)
- `1387047` — fix mark_read messages cockpit POST→PATCH + fan localStorage persist
- `a599f5d` — hover taglines IdentityGate

---

## [v1.4.0] — 2026-04-24 — Messagerie unifiée + Agent IA 3 modes + per-conversation override

> Rapport détaillé : [plans/_reports/UPDATE-REPORT-2026-04-24-1112-messagerie-copilot-per-conversation.md](plans/_reports/UPDATE-REPORT-2026-04-24-1112-messagerie-copilot-per-conversation.md)

### Agent IA — 3 modes opérationnels (aligné Intercom Fin / Zendesk Agent Assist / GitHub Copilot)
- `auto` : l'agent répond seul (défaut)
- `copilot` : toi tu écris + envoies, l'agent génère en parallèle un draft (`ai_runs.sent=false`) et apprend de tes corrections
- `user` : 100% humain, l'agent est désactivé
- Fusion des ébauches précédentes `shadow` + `learning` → un seul mode `copilot` (HITL avec feedback loop)
- Migration `055_agent_persona_modes` + `056_merge_shadow_learning_into_copilot` appliquées
- Helper `src/shared/lib/ai-agent/modes.ts` expose `decideForMode()` + `MODE_LABELS`
- Backward-compat frontend : anciennes valeurs `shadow`/`learning` normalisées en `copilot` à la lecture

### Agent IA — mode par conversation (override persona)
- Migration `057_per_conversation_agent_mode` : colonne `agent_mode` sur `agence_fans`, `agence_clients`, `instagram_conversations` (NULL = défaut persona)
- API `/api/agence/messaging/mode` GET/PUT, parse `fan_id` UUID direct ou `pseudo:<client_id|ig_conv_id>`
- Worker IG + web `triggerWebAutoReply` honorent l'override AVANT le persona default
- UI : chip mode cliquable dans le header de thread avec popover 3 choix + "Retour au défaut persona"

### Agent IA — configuration dédiée dans messagerie
- Nouveau tab `[Messages] [Agent IA]` dans `/agence/messagerie`
- Panel `agent-ia-panel.tsx` : Status (Groq / persona / runs 24h / état) · Mode d'opération · Persona editor · Playground sans envoi · 15 derniers runs
- API complète :
  - `GET/PUT /api/agence/ai/settings` — persona + runs + provider_status
  - `POST /api/agence/ai/test` — playground Groq
  - `GET /api/agence/ai/health` (public) — diag env booléens + file d'attente IG

### Messagerie — standards d'affichage unifiés (source unique)
- Nouveau helper `src/shared/lib/messaging/conversation-display.ts` : `getConversationPseudo` · `getAvatarStyle` · `getExternalUrl` · `conversationSortKey` · `formatConversationTime`
- Header dropdown et page messagerie appellent les MÊMES fonctions → plus de divergence pseudo entre les deux vues
- Header = raccourci messagerie, pas un univers séparé
- Avatar visiteur web = icône Globe neutre (plus de faux tag Instagram/Snap)
- Lien externe (`ExternalLink`) uniquement pour Snap/Insta upgradés
- Lien "Voir tous les messages →" en bas du dropdown header pointe directement `/agence/messagerie` (plus via `?tab=clients`)

### Messagerie — sync header ↔ inbox unifié
- `header.tsx fetchMessages()` switch vers `/api/agence/messaging/inbox?source=all` (même endpoint que `/agence/messagerie`)
- Fallback legacy `/api/messages` si inbox 401/500
- Pseudo-fan key = `pseudo:<UUID>` (`client_id` ou `ig_conversation_id`) au lieu de `display_handle` (fin des collisions si 2 clients ont le même nickname)
- Thread fetch pour pseudo-fans : tente `agence_messages` par `client_id`, fallback `instagram_messages` par `ig_conversation_id`
- Pseudos `visiteur-NNN` cohérents partout (header dropdown · messagerie list · thread header · profil)

### Visiteurs web — upgrade path
- Bouton "LOGIN" du header `/m/[slug]` renommé → "Upgrade", tooltip "Ajouter ton Insta/Snap → stories privées & promos Fanvue"
- Nouveau bandeau dans `ChatPanel` pour visiteurs anonymes → rouvre `IdentityGate` pour lier un handle

### Dashboard — Stratégie tab unifiée
- Dashboard tab "Stratégie" utilise maintenant la version 3-plans (Plan A Yumi IA / B Modèles / C Consultance) au lieu du monolithe legacy (~660L avec `realData` props)
- Même composant pour la tab dashboard et la page dédiée `/agence/strategie`

### Auth — persistance cross-onglets
- `heaven_auth` migré `sessionStorage` → `localStorage` dans 7 fichiers lecture
- Fallback lecture sessionStorage pour compat sessions existantes
- Fin des déconnexions aléatoires à la fermeture d'onglet / reload preview / nouveau tab
- Logout nettoie déjà les 2 stores

### Infrastructure
- `vercel.json` — cron `/api/cron/process-ig-replies` déclaré (`*/2 * * * *`)
- `.env.example` — `INSTAGRAM_PAGE_ACCESS_TOKEN` documenté
- `middleware.ts` — `/api/agence/ai/health` whitelist en GET public (diag sans auth)

---

## [v1.3.0] — 2026-04-24 — ROOT CP m0 + Sécurité Phase 1 + Hiérarchie comptes

> Rapport détaillé : [plans/_reports/UPDATE-REPORT-2026-04-24-0707-root-cp-m0-security-phase1.md](plans/_reports/UPDATE-REPORT-2026-04-24-0707-root-cp-m0-security-phase1.md)

### CP maître ROOT (m0) — nouvelle entité
- Seed `agence_models` row `root` (model_id=m0, display_name="ROOT", is_active=true) via migration 050_v2
- Entity config `src/shared/config/entities/root.ts` + ajout au registre ENTITIES
- `toModelId("root")` → `"m0"`, `/api/models` retourne maintenant 4 CPs

### Skeleton spécimen ROOT (`/agence` mode root)
- Remplace empty state par template dev : 13 cartes modules descriptives (fonction · rôles · sources DB · statut done/planned)
- Header badge "SPECIMEN / DEV MODE" + footer tips dev

### Header selector root
- Label fixe "ROOT" (supprime HEAVEN hardcodé historique)
- Rendu dès `auth.role === "root"` OR auth null (dev fallback)
- Dropdown liste les 4 CPs depuis DB (plus d'option "Aucun CP brut")

### Hiérarchie comptes enforced backend
- Helper `canEditTarget(user, target)` dans PATCH `/api/agence/accounts` + POST `/api/agence/accounts/[code]/reset-code`
- Root Master (m0 ou slug=root) → modifie tout
- Yumi root-fusion (m1) → modifie Paloma/Ruby mais PAS Root
- Model (paloma/ruby) → uniquement son propre compte

### Édition inline comptes (admin)
- Drawer modal → **accordéon inline** par ligne (mobile-friendly)
- Sous-accordéon "Modifier identifiant & mot de passe"
- Username = `login_aliases[0]`, Password = custom (pas juste regen aléatoire)
- API PATCH accepte `login_aliases`, `model_id`, `model_slug`
- API reset-code accepte `custom_code` (validation regex 4-32 chars)

### Credentials standardisés
- Règle : 1 username unique par CP, password `Mod{3lettres}2026` pour modèles
- ROOT/`root`/Root2026 · Yumi/`yumi`/ModYum2026 · Paloma/`paloma`/ModPal2026 · Ruby/`ruby`/ModRub2026

### Sécurité Phase 1 (migration 051 appliquée)
- Table `agence_auth_events` (audit log complet login/fail/lock/password/username events)
- Colonnes `failed_attempts`, `locked_until`, `last_failed_at`, `code_hash` sur `agence_accounts`
- Table `auth_rate_limits` (future Phase 1.5 — DB-persistant)
- RPC `record_failed_login(account_id, max_fails, lock_minutes)` — auto-lock atomique après 10 échecs
- RPC `reset_login_attempts(account_id)` — reset sur login success
- Login route `/api/auth/login` instrumentée (defensive, fonctionne même sans migration appliquée)
- Vérifié live : `login_success` + `login_fail` enregistrés dans `agence_auth_events`

### Plan sécurité progressive
- Nouveau doc `plans/03-tech/SECURITY-PROGRESSIVE-2026.md` — 5 phases jusqu'à Passkeys/YubiKey sur 12 mois
- Directive NB : pas de 2FA ultime maintenant, durcissement progressif

---

## [v1.2.0-strategy] — 2026-04-21 soir — Unification stratégique BP v1 + adaptation Claude Code

### Intégration BP Cowork
- BP avril 2026 (`plans/business/bp-agence-heaven-2026-04/`) adopté comme **source de vérité business unique** — 4 documents Cowork : BP Word 14 p., modèle financier 24 mois (6 onglets, 1 251 formules), doc paliers rémunération BE, analyse Release Form Fanvue/OF
- README d'adaptation Claude Code (17 KB) = pont entre BP business et codebase Heaven (data model + CP panels + 7 sprints + P0 constraints + checklist pré-modification)

### Cadre opérationnel nouveau — 3 Modes
- **Mode A — Studio IA pur** (100 % Sqwensy) : personas IA sur comptes agence Fanvue `yumiclub` + IG `@Yumiiiclub`
- **Mode B — Hub annexe modèles réelles** (70 % modèle / 30 % Sqwensy) : Release Form DMCA + contrat privé Agence↔Modèle
- **Mode C — Services B2B** : prestataire tech/stratégique (setup 800-2 500 € + sub 150-500 €/mois + 5-10 % croissance)
- **2 Plans Identité transversaux** (Modes B + C) : Découverte (visage assumé) ou Shadow (visage caché)
- **4 Paliers rémunération** : P1 Test (< 1 k€) / P2 Démarrage (1-9 k€) / P3 Structuration (9-20 k€, indép complémentaire OBLIGATOIRE) / P4 Pro (> 20 k€, ±TVA)
- **Caming = canal d'acquisition primaire** (pas parallèle) : Stripchat/Bongacams/Chaturbate → UTM → PPV Fanvue, attribution J+7

### Plans alignés (9 fichiers mis à jour)
- `HEAVEN-MASTERPLAN-2026.md` — TL;DR exécutif réécrit autour des 3 Modes + hiérarchie documentaire pointant vers BP. Ancienne vision « YUMI IA + NB profil humain » remplacée.
- `product/objectifs.md` — KPIs alignés BP §10 (conversion caming→PPV, NPS modèles, abonnés free/sem, panier moyen, heures live, trésorerie)
- `product/modules.md` — catalogue CP étendu (existants v1.1 + 11 nouveaux modules dérivés BP : Panel Mode, Plan Identité, Palier, Statut initial, DMCA, Contrat, Caming, Commission auto, Alertes palier, Vue par Mode, Scripts par Mode)
- `product/roadmap.md` — 7 sprints BP S1→S7 (data model → CP panels → DMCA → caming → commission → agent IA différencié → Mode C conditionnel) + matrice trimestres × modes + décisions D-7/D-8
- `security/roles-entities.md` — rôles étendus (admin / model / dpo futur) + scopes granulaires `dmca:*` `identity:view_legal` `contract:*` `palier:escalate` + workflows escalade
- `business/contexte-financier.md` — passage modèle SaaS 25 % commission (legacy, archivé) → 3 Modes BP avec exemples chiffrés paliers P1-P4
- `ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md` — articulation explicite avec BP Cowork (roadmap tech ≠ sprints BP business)
- `IA-AGENT-SPEC.md` — matrice scripts × Mode × Plan Identité + funnel caming (détection UTM, upsell adapté cam-origin, attribution J+7)
- `CHANGELOG.md` — cette entrée

### Data model dérivé BP (à implémenter Sprint 1)
Extension `agence_models` avec : `mode_operation` (enum A/B/C), `identity_plan` (discovery/shadow), `palier_remuneration` (P1-P4), `fiscal_voie`, `statut_initial` (salariée/étudiante/chomage/sans_activite/pensionnée), `statut_initial_verified`, `caming_active`, `caming_platforms` (jsonb), `release_form_status`, `contract_url` (bucket chiffré), `revenue_monthly_avg_3m`.

Nouvelles tables : `agence_releaseform_dossier`, `agence_caming_sessions`, `agence_commission_calcul` (vue matérialisée), `agence_dmca_access_log`, `agence_consent_log`, `agence_identity_plan_changes`, `agence_palier_history`, `agence_contracts_versions`.

### Décisions business nouvelles
- D-7 : Ouverture Mode B (1ère modèle) — attendre M3 validé Mode A (BP milestone)
- D-8 : Caming platform prioritaire — Stripchat (meilleur split 50-65 %)

### Règle unifiée pour Claude Code
Cf. section « Checklist Claude Code » du README Cowork :
1. Lire section BP concernée avant impl
2. Vérifier règles P0 (confidentialité, RGPD, Compliance Fanvue)
3. Aucun vrai prénom stocké
4. Migration Supabase numérotation continue
5. Mettre à jour CHANGELOG
6. `npm run verify` (typecheck + env + build)
7. Si impact workflow modèle : vérifier docs paliers + Release Form

---

## [v1.1.0] — 2026-04-21 — Messagerie unifiée + IG ops + Meta App Review artifacts

### DB (9 migrations Supabase MCP)

- `030_instagram_agent.sql` — tables `instagram_config` / `instagram_conversations` / `instagram_messages`
- `032_yumi_unified_messaging.sql` — hierarchy root/model + `agence_fans` + helpers RLS GUC `can_see_model_id()` / `can_write_model_id()` + vue `agence_messages_timeline` (UNION web + IG)
- `033_realign_model_ids.sql` — **YUMI `m2 → m1`, PALOMA `m4 → m2`** (slug = alias front, mN = backend canonique)
- `034_realign_agence_accounts.sql` — `agence_accounts` SSOT auth locale + `login_aliases`
- `035_align_instagram_to_model_id.sql` — scope IG tables à `model_id`
- `036_sync_model_number.sql` — colonne dérivée tri
- `037_realign_media_config.sql` — config média par `model_id`
- `038_yumi_full_ops.sql` — `agence_feed_items` polymorphe (manual/instagram/wall) + `agence_outreach_leads` + `ig_reply_queue` + `agence_ops_metrics` + UNIQUE(`ig_message_id`) + RPC `ig_conv_increment_count`
- `038b_claim_jobs_rpc.sql` — RPC `claim_ig_reply_jobs` (FOR UPDATE SKIP LOCKED) pour worker multi-tenant

### Backend (API + routes)

- **Webhook IG async < 500ms** : `/api/instagram/webhook` — verify HMAC → dedup UNIQUE → INSERT + RPC increment → enqueue → 200 OK
- **Unified inbox** : `/api/agence/messaging/inbox` (vue timeline) + `/reply` (dispatch multi-canal)
- **Fans polymorphes** : `/api/agence/fans/[id]` GET/PATCH + `/merge` (soft-merge) + `/link-instagram` + `/search`
- **IG routes standardisées shapes** : `/conversations` → `{conversations}`, `/media` → `{posts}`, `/comments` → `{comments}`
- **Cron workers** :
  - `/api/cron/sync-instagram` (daily 6h — sync posts/stats)
  - `/api/cron/process-ig-replies` (worker IA — placeholder jusqu'à clé OpenRouter)
  - `/api/cron/purge-ops-metrics` (daily 4h — rétention 7j)
- **Meta App Review callback** : `/api/meta/data-deletion` (HMAC signed_request parse, statut 410 sur fan purgé)
- **Ops observabilité** : `/api/agence/ops/metrics` (6 KPIs)
- **Feed public polymorphe** : `/api/feed` (lecture `agence_feed_items`)

### Frontend (pages + composants)

- **Dashboard IG widget** : `src/cp/components/cockpit/instagram-stats-widget.tsx` (followers/médias/dernière sync)
- **Page IG 3 tabs** : `/agence/instagram` avec `ig-media-grid` / `ig-comments-list` / `ig-config-panel`
- **Page Ops** : `/agence/ops` (6 KPIs dashboard observabilité)
- **Page fan consolidée** : `/agence/clients/[fanId]` avec `fan-profile-card` + `fan-timeline` + `fan-handles-manager` + `reply-composer`
- **Messagerie refactorée** : `/agence/messagerie` (540L) inbox unifiée + fan_id grouping
- **Modal auth admin** : `admin-auth-modal.tsx` (dismissable X + backdrop click + onAdminRequest callback)
- **IdentityGate enrichi** : dismissable + bouton admin en dessous
- **HeaderBar ClientBadge** + bouton Login visible dans profil `/m/yumi`
- **Error boundaries** : `src/app/agence/error.tsx` + `src/app/m/[slug]/error.tsx`
- **Pages publiques Meta App Review** :
  - `/privacy` (RGPD Art. 15-22)
  - `/terms`
  - `/data-deletion` + `/data-deletion/status`
- **AuthGuard whitelist** mise à jour pour pages publiques

### Infrastructure

- **Merge Turborepo → single Next.js** (commit `d32a53f`, 2026-04-19) — bug vendor-chunks récurrent + complexité disproportionnée
- **Dev switché Webpack** (pas Turbopack) + `predev: rm -rf .next`
- **Middleware whitelist** : `/api/feed`, `/api/meta/data-deletion`, `/api/instagram/webhook`
- **Vercel Hobby workaround** : crons réduits à daily (2 slots utilisés / 1 max → limite stricte bientôt à traiter D-6)
- **Cloudinary edge cache 30j** via `next.config.ts`
- **Sidebar nav** : ajout items Instagram + Ops

### Meta App Review artifacts livrés

- App Icon SVG 1024×1024 `public/meta/yumi-ai-icon.svg` (gradient rose→violet, lettre Y)
- Privacy Policy + Terms of Service + Data Deletion workflow
- Pages publiques déployées prod `heaven-os.vercel.app`
- Plan Business Verification BE + App Review permissions : `plans/META-APP-PUBLICATION-PLAN.md`

### Plans documentation (roadmap consolidée)

- **`plans/ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md`** créé — roadmap d'exécution courante (P0-P2 défauts + modules A-I + sequencing + garde-fous)
- **`plans/REFACTOR-NAVIGATION-SPEC.md`** créé — 3 options nav cockpit (D-1/D-2/D-3 décisions NB)
- **`plans/META-APP-PUBLICATION-PLAN.md`** créé — process Business Verification BE + App Review + screencast guide + justifications permissions
- **`plans/IA-AGENT-SPEC.md`** créé — persona YUMI flirt classy FR/EN/ES + prompt + coût $0.008/reply + modes review/auto + table `agence_ai_replies`
- Plans existants synchronisés : `product/roadmap.md`, `tech/architecture.md`, `tech/stack-config.md`, `tech/outils.md`, `HEAVEN-MASTERPLAN-2026.md`, `MIGRATION-2026-04.md`, `MAINTENANCE-PREVENTIVE.md`, `README.md`, `masterplan.md`

### Décisions bloquantes NB (pending)

| Clé | Scope | Défaut recommandé |
|-----|-------|--------------------|
| D-1 | Option navigation (1/2/3) | Option 1 sidebar 1:1 pages |
| D-2 | Rename `/agence` | Garder `/agence` |
| D-3 | Sidebar par défaut | Expanded + toggle persistant |
| D-4 | BM Meta | SQWENSY via Business Manager |
| D-5 | Provider clé IA | OpenRouter Claude Sonnet 4.6 |
| D-6 | Cron worker infra | Upstash QStash (free tier) |

### Fixes critiques

- Colonne `agence_clients.pseudo` inexistante → SELECT refait (`nickname, firstname, pseudo_insta, pseudo_snap`)
- Alias `gret1` admin toujours actif → désactivé via UPDATE
- Dashboard crash client-side (shape API mismatch) → `last_message` nested `{text, source, direction, created_at}`
- IG dashboard tabs crash (array vs shape) → routes standardisées
- `ON CONFLICT` partial unique index échec → pattern DELETE+INSERT pour sync 21 posts IG
- Meta `(#3) Application does not have capability` attendu (Dev Mode — documented in roadmap)
- Revert commit `b769282` non-autorisé (dual-credential login non sollicité) → fix ciblé : redirect `/` → `/m/yumi` + admin modal + sidebar login button

## [v1.0.1] — 2026-04-18 soir — Vercel Analytics + hygiene standards

### Infrastructure
- Installé `@vercel/analytics` v2.0.1 (commit `c9c8d80`)
- Ajouté `<Analytics />` dans `src/app/layout.tsx` (complémentaire au PostHogProvider existant — Web Vitals + page views)
- PR #1 Vercel bot `vercel/install-vercel-web-analytics-6lz5er` fermée (conflits avec PostHog landed after draft, résolu directement sur main)

### Hygiene repo (cross-CP standard)
- Script `scripts/check-repo-hygiene.sh` copié (source : sqwensy-os) — détecte duplicats/artefacts/litter/env/vides
- Cadence maintenance : hebdo/mensuel/trimestriel documentée dans sqwensy-os/docs/STANDARDS-REPO-HYGIENE.md

### Cleanup session 2026-04-18
- 27 fichiers archive triés (tous obsolètes, aucune restauration requise)
- Archive `_duplicate-archive-2026-04-18/` à la racine AI-LAB (185 fichiers cross-CPs)
- Rapport détaillé : `plans/CLEANUP-ARCHIVE-REPORT-2026-04-18.md`

## [v1.0.0-plan] — 2026-04-18 — Masterplan Stratégique 2026-2027 + Plan Collaboration Paloma

### STRATÉGIE
- `plans/HEAVEN-MASTERPLAN-2026.md` créé (Agent G audit multi-agent SQWENSY) — 10 sections, vision Q2 2026 → Q4 2027
- `plans/PALOMA-COLLABORATION.md` créé (Agent H) — plan complet juridique BE + contrat type + 5 phases évolutives
- Vision : niche AI premium mode/lifestyle YUMI + hub humain NB profil complémentaire (PALOMA + RUBY)
- Positionnement défendable vs Aitana Lopez €10k/mois 149k IG, Lil Miquela, Imma, Rozy

### ROADMAP
- 7 phases trimestrielles avec gates quantifiables
- Objectif MRR consolidé Q4 2027 : $13 000/mois ($8k YUMI + $5k NB profil)
- ROI net annuel cible fin 2027 : ~$120k/an après coûts + commissions + %

### STACK IA BUDGÉTÉ
- Q2 2026 starter : Midjourney + ElevenLabs + Suno = $62/mois
- Q4 2026 scaling : + HeyGen + Runway + CapCut = $161/mois
- Q4 2027 pleine : HeyGen Pro + Midjourney Pro + Runway Unlimited + ElevenLabs Pro = $378/mois
- Paiement via carte virtuelle Wise "Heaven" (cap mensuel gated)

### MODULE IA SOCIAL-MANAGER
- Spec technique : Claude Sonnet 4.6 + prompt caching -90%
- 3 phases évolutives : manual review (Q2-Q3) → semi-auto (Q4-Q1) → full-auto (Q2 2027+)
- DB schema migration 031 : 6 tables (model_chat_memory, model_chat_persona, model_content_calendar, model_revenue_tracking, model_outils_ia_usage, model_chat_audit_log)
- Safety filter + audit log + kill switch

### CONFORMITÉ AI ACT EU
- **Enforcement 2 août 2026** : label AI-generated obligatoire bio + tag #AI #Virtual tous posts YUMI
- €15M amende max si non-compliance
- Audit mensuel automatisé prévu

### JURIDIQUE PALOMA
- Tremplin-indépendants 12 mois (juin 2026 → mai 2027) — dispositif applicable car chômeuse au démarrage
- Activité accessoire art. 48 NON applicable (requiert 3 mois activité avant chômage)
- Seuil journalier 18,08 €/jour nets confirmé au 01.03.2026
- Validation obligatoire comptable BE + avocat avant signature

### SÉCURITÉ
- Confidentialité Heaven ↔ SQWENSY : audit mensuel grep automatisé
- Aucun vrai prénom dans code/docs/DB/commits (IDs `yumi`, `ruby`, `paloma`)
- Niveau cible L4 (cf. SECURITY-PLAN-EVOLUTIVE-2026-2027.md SQWENSY)

### CALENDRIER COMMERCIAL HEAVEN
- Saint-Valentin, été, Halloween, Black Friday, Noël, Nouvel An (ignore Ramadan/Eid scope OPearly)

---

## [v0.5.0] — 2026-04-17 — Turborepo Restructure + Multi-Entity Config

### ARCHITECTURE
- Migration monolithe Next.js → Turborepo (`apps/web` + `apps/cp` + `apps/ui` + `apps/lib`)
- `apps/web` : profils publics `/m/[slug]` + landing (port 3000)
- `apps/cp` : admin `/agence` + `/login` + APIs + middleware JWT (port 3001)
- `apps/ui` : composants partagés (`@heaven/ui`)
- `apps/lib` : logique, hooks, types, config, RBAC (`@heaven/lib`)

### MULTI-ENTITY
- `apps/lib/src/config/entities/{yumi,ruby,paloma}.ts` — source unique des profils
- `apps/lib/src/config/roles/{admin,model}.ts` + `permissions.ts` + `rbac.ts`
- `model-utils.ts` refactoré pour lire depuis `ENTITIES` (plus de hardcode)

### SÉCURITÉ (P0)
- Purge `_backups/auth-phase0-2026-03-22/` (contenait prénoms réels + codes alpha)
- Suppression alias legacy `gret` (code + docs)
- `NEXT_PUBLIC_SQWENSY_URL` → proxy server-side `/api/heaven-beacon/*` (plus de leak bundle client)
- `src/app/api/auth/login` passé sur env server-only `OS_BEACON_URL`

### DOCS
- `plans/` standard (11 annexes + `plans/models/`)
- `README.md` + `CHANGELOG.md` à la racine
- `docs/` réduit à USER-only (credentials, procédures)

### MIGRATION-2026-04
- Branch : `restructure/standard-2026-04`
- HEAD pre-migration : `9cb065f`
- Build `turbo build` : `@heaven/cp` + `@heaven/web` ✅

## [v0.4.0] — 2026-04-13 — Instagram AI Agent Module

### INSTAGRAM AGENT — Architecture complete
- **Migration 030** : 3 tables (instagram_config, instagram_conversations, instagram_messages) + indexes + seed YUMI config
- **lib/openrouter.ts** : Client OpenRouter multi-modele (Claude, GPT, Gemini, Perplexity)
- **lib/instagram.ts** : Meta Graph API helpers (webhook verify, parse events, send reply)
- **API /api/instagram/webhook** : GET (Meta verification) + POST (receive messages, dedup, store, agent auto-reply)
- **API /api/instagram/send** : POST (manual reply from dashboard, auth root/model)
- **API /api/instagram/conversations** : GET (list) + PATCH (toggle mode, archive, block)
- **Dashboard /agence/instagram** : Split-pane UI (conversation list + chat view + mode toggle + stats bar)
- **Composants** : InstagramDashboard, ConversationList, ChatView, ModeToggle, StatsBar (5 fichiers)
- **Config** : YUMI system prompt pre-configure, mode human par defaut, basculement agent/human par conversation
- **Securite** : Webhook signature verification (HMAC-SHA256), auth JWT sur send/conversations, fallback human si AI fail

### DOCUMENTATION
- `docs/os/INSTAGRAM-AGENT.md` : Architecture complete, flow, DB schema, API specs, UX wireframe, phases implementation
- `docs/os/masterplan/ROADMAP-HEAVEN.md` : Task 7.1 mise a jour (In Progress)
- `docs/INDEX.md` : Lien vers INSTAGRAM-AGENT.md ajoute

### EN ATTENTE (credentials user)
- META_APP_ID, META_APP_SECRET, META_PAGE_ACCESS_TOKEN
- INSTAGRAM_BUSINESS_ACCOUNT_ID (@yumiiiclub)
- OPENROUTER_API_KEY
- Meta App Review (permission instagram_manage_messages)

---

## [v0.3.0] — 2026-03-22 — Socle Securite + Fusion Cockpit

### SECURITE — Auth JWT Server-Side
- **CRITIQUE** : Remplace l'auth basee sur headers HTTP spoofables (`x-heaven-role`, `x-heaven-model`) par des tokens JWT signes (HMAC-SHA256 via `jose`)
- Login (`/api/auth`) genere un token JWT avec `role`, `model_slug`, `display_name`, expire en 7 jours
- Toutes les routes API verifient le token via `Authorization: Bearer <token>`
- Secret JWT via variable d'environnement `HEAVEN_JWT_SECRET`
- Client envoie le token depuis `sessionStorage` au lieu des headers custom

### SECURITE — Failles API Corrigees
- **Messages POST auth** : `sender_type === "model"` requiert maintenant un token JWT valide (root/model). Les clients sont verifies par `client_id` en DB
- **Posts race condition** : Likes/comments utilisent des increments atomiques via `rpc()` avec fallback. Doublons de likes geres par check INSERT error
- **Wall XSS** : Sanitization HTML (`<[^>]*>` stripped) sur `pseudo`, `content`. Photo URL validee (Cloudinary only)
- **Screenshot-alert** : `modelId` verifie en DB, timestamp genere cote serveur, `page` valide contre whitelist
- **Accounts cascade** : DELETE supprime les records lies (codes, clients, messages, posts, uploads, wall_posts, security_alerts) avant de supprimer le compte
- **CMS auth** : Mot de passe hardcode `"agence2026"` supprime. Auth via session JWT existante (heaven_auth)
- **CORS restrictif** : Wildcard `"*"` remplace par domaines autorises (`heaven-os.vercel.app`, `localhost:3000/3001`). Dev mode permissif
- **Clients API** : PUT utilise une whitelist de champs modifiables + requireRole async
- **Codes lookup** : Recherche client par `pseudo_snap` ET `pseudo_insta` (au lieu de snap seulement)
- **Clients [id] detail** : Codes recherches par FK `client_id` + fallback pseudo snap + insta (dedupliques)
- **Posts/comments sanitization** : Contenu HTML strip avant stockage

### COCKPIT — Fusion Clients + Codes
- Page `/agence/clients` redirige vers `/agence` (cockpit unifie)
- `CodesList` enrichi avec info client inline : pseudos, tag, preferences, verified/blocked, total spent
- Detail client expandable : tokens achetes/depenses, derniere activite, notes editables
- Actions client directement depuis la liste : verifier, bloquer, envoyer message promo
- Sidebar : entree "Clients" supprimee (fusionnee dans Cockpit)
- FAB simplifie : plus de lien "Client" separé

### COCKPIT — Profil
- Bouton "Voir profil" ajoute dans le header cockpit (ouvre `/m/{slug}` dans un nouvel onglet)
- Bouton "Edit Profile" conserve (pointe vers `/m/{slug}?edit=true`)
- Section header renommee "Codes & Clients" avec compteur clients

### TECHNIQUE
- Package `jose` ajoute pour JWT sign/verify
- `getCorsHeaders()` centralise avec support origine dynamique
- `requireRole()`, `getSessionFromHeaders()`, `getModelScope()` sont maintenant async
- Toutes les routes API utilisent `getCorsHeaders()` centralise (plus de cors inline)
- `HeavenAuth` interface inclut `token?: string`

---

## [v0.2.0] — 2026-03-21 — Profil Public Overhaul

### Profil (`/m/[slug]`)
- Posts s'affichent tous (filtre `tier_required === "public"` supprime)
- Media tier-gate : blur + cadenas si pas d'acces, visible si `tierIncludes()`
- Chat deplace du FAB flottant vers 4eme tab dans la barre du bas
- Badge unread sur l'icone Chat
- Galerie Instagram-style : dossiers par pack (VIP/Gold/Diamond/Platinum)
- Uploads + posts avec media fusionnes dans la grille galerie
- Polling chat adaptatif : 5s sur tab chat, 15s sinon
- Avatar/banner upload : toast d'erreur si Cloudinary echoue
- Upload media : switch auto vers galerie apres upload
- `saveAllEdits`, `sendMessage`, `handleUpdateMedia` verifient `res.ok`

### API
- `globalThis` ephemere supprime de `/api/uploads`, `/api/packs`, `/api/codes`
- Supabase comme seule source de donnees (plus de localStorage fallback)
- Auth scope bypass corrige : model sans slug ne recoit plus `["*"]`
- Messages GET requiert parametre `model`
- Credits routes : CORS + OPTIONS handlers ajoutes
- Uploads PUT : whitelist de champs
- Code validation : verifie la mise a jour DB
- Reviews key dynamique par model

### Cockpit
- `uniqueClients` calcule et affiche dans StatCards
- Code generation : prefixe dynamique base sur le model slug

---

## [v0.1.0] — 2026-03-20 — Premier Deploiement

- Deploiement initial sur Vercel (`heaven-os.vercel.app`)
- Profil public `/m/[slug]` avec Wall, Gallery, Shop
- Cockpit admin `/agence` avec gestion codes d'acces
- Pages : Login, Messages, CMS, Clients
- API routes : auth, codes, clients, messages, posts, uploads, packs, models, wall, credits, security
- Stack : Next.js 15, TypeScript, Tailwind v4, Supabase, Cloudinary

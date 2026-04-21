# Heaven — Changelog

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

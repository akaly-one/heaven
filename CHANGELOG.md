# Heaven — Changelog

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

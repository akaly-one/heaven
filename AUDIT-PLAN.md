# HEAVEN OS — Plan d'Audit & Corrections

**Date**: 28 mars 2026
**Scope**: Dashboard complet Heaven (`clients/heaven/`)
**Status**: EN COURS

---

## Vue d'ensemble

Audit realise par 6 equipes specialisees. **149 issues identifiees** sur l'ensemble du dashboard.

| Equipe | Score | Critique | Important | Mineur |
|--------|-------|----------|-----------|--------|
| UX/UI | 4/10 | 12 | 24 | 13 |
| Frontend | 5/10 | 3 | 10 | 5 |
| Backend Securite | 3/10 | 4 | 16 | 5 |
| Design System | 5/10 | 4 | 3 | 7 |
| SEO/SaaS | 4/10 | 3 | 7 | 5 |
| Ergonomie | 5/10 | 9 | 10 | 9 |

---

## Phase 1 — Securite & Stabilite (CRITIQUE)

### 1.1 Auth middleware sur les API routes
- **Probleme**: Aucune route API ne verifie d'authentification. Toute personne connaissant un model slug peut lire/ecrire donnees.
- **Fichiers**: Toutes les routes dans `src/app/api/`
- **Solution**: Creer `src/lib/auth-middleware.ts` avec validation JWT + role-based access
- **Status**: [ ] A FAIRE (hors scope fondations — necessite refonte auth)

### 1.2 Race condition credits (double-depense)
- **Probleme**: `src/app/api/credits/purchase/route.ts` — check-then-act sans transaction. Requetes concurrentes peuvent debiter plus que le solde.
- **Solution**: UPDATE atomique avec `.lte("total_tokens_spent", bought - price)` guard
- **Status**: [x] CORRIGE (28/03/2026)

### 1.3 Code validation double-spending
- **Probleme**: `src/app/api/codes/route.ts` — un code peut etre valide 2 fois si 2 requetes arrivent en meme temps
- **Solution**: `.eq("used", false)` dans l'UPDATE atomique + `.maybeSingle()` pour detecter conflit
- **Status**: [x] CORRIGE (28/03/2026)

### 1.4 CORS wildcard par defaut
- **Probleme**: 21 routes API appelaient `getCorsHeaders()` au niveau module (sans `req`) → origin `"*"`
- **Solution**: `getCorsHeaders(req)` dans chaque handler (GET/POST/PUT/DELETE/OPTIONS)
- **Status**: [x] CORRIGE (28/03/2026) — 21/21 routes

### 1.5 Confirmation avant actions destructives
- **Probleme**: Revoke/pause/delete code = 1 clic, pas de confirmation visuelle
- **Fichiers**: `src/components/cockpit/codes-list.tsx`
- **Solution**: `<ConfirmDialog>` integre pour revoke + delete avec message contextuel
- **Status**: [x] CORRIGE (28/03/2026)

### 1.6 Cascade delete non atomique
- **Probleme**: `src/app/api/accounts/route.ts` DELETE — Promise.all de 7+ deletes, si un fail = DB inconsistante
- **Solution**: Supabase function ou soft-delete avec period de grace
- **Status**: [ ] A FAIRE

### 1.7 Error messages leak info DB
- **Probleme**: Certaines routes retournaient `detail: error.message` de Supabase au client (31 occurrences)
- **Solution**: Suppression de tous les `detail:` dans les reponses JSON, log server-side conserve
- **Status**: [x] CORRIGE (28/03/2026) — 0 leak restant

---

## Phase 2 — UX Fondamentale

### 2.1 Loading skeletons
- **Probleme**: Ecran blanc pendant fetch sur profile (`m/[slug]`) et dashboard (`agence/`)
- **Solution**: Composant `<Skeleton />` + `<SkeletonCard />` + `<SkeletonStat />` crees
- **Status**: [~] COMPOSANT PRET — a utiliser dans les pages (remplacement progressif)

### 2.2 Toast/error system global
- **Probleme**: 90% des erreurs reseau sont console.error — user ne voit rien
- **Solution**: `<ToastProvider>` integre dans layout.tsx, `useToast()` disponible partout
- **Status**: [x] CORRIGE (28/03/2026) — provider integre, hook pret a utiliser dans les pages

### 2.3 Remplacer emojis par lucide-react
- **Probleme**: Pipeline stages et skills utilisaient emojis
- **Fichiers**: `agence/page.tsx` (PIPELINE_STAGES), `m/[slug]/page.tsx` (skills + credits)
- **Mapping**: Lightbulb, ClipboardList, Camera, Film, Check, Rocket, Flame, Zap, Palette, Diamond, MessageCircle
- **Status**: [x] CORRIGE (28/03/2026) — 0 emoji restant dans src/

### 2.4 Font sizes minimum 10px
- **Probleme**: 137 occurrences de `text-[7px]`, `text-[8px]`, `text-[9px]` dans 13 fichiers
- **Solution**: Toutes remplacees par `text-[10px]`
- **Status**: [x] CORRIGE (28/03/2026) — 137/137 remplacees, 0 restant

### 2.5 Tabs accessibles (ARIA)
- **Probleme**: Pivot tabs Feed/Messages sans semantique ARIA
- **Solution**: Remplace par `<Tabs />` avec `role="tablist"`, `aria-selected`, keyboard nav (fleches)
- **Status**: [x] CORRIGE (28/03/2026) — integre dans agence/page.tsx

### 2.6 FAB + sidebar accessibilite
- **Probleme**: Boutons sans `aria-label`, sidebar toggle sans `aria-expanded`
- **Fichiers**: `src/components/sidebar.tsx`, `src/components/pilot-assistant.tsx`
- **Status**: [ ] A FAIRE

---

## Phase 3 — Architecture & Performance

### 3.1 Refactor m/[slug]/page.tsx (2400 lignes)
- **Probleme**: Monolithe avec 60+ useState, 5+ responsabilites
- **Solution**: Extraire en sous-composants:
  - `ModelWallTab.tsx` — feed posts, wall input
  - `ModelGalleryTab.tsx` — gallery grid, tier filter
  - `ModelShopTab.tsx` — packs, credits, purchase flow
  - `ModelChatPanel.tsx` — chat messages, send
  - `ModelEditMode.tsx` — edit profile, media upload
- **Status**: [ ] A FAIRE

### 3.2 Centraliser types
- **Probleme**: `AccessCode`, `PackConfig`, `ClientInfo` definis 3-4 fois inline
- **Solution**: `src/types/heaven.ts` — 20 interfaces centralisees, imports dans 10 fichiers
- **Status**: [x] CORRIGE (28/03/2026)

### 3.3 Centraliser constantes tiers
- **Probleme**: TIER_COLORS, TIER_META, TIER_HEX dupliques dans 5 fichiers
- **Solution**: `src/constants/tiers.ts` — TIER_CONFIG unique + exports backward-compat
- **Status**: [x] CORRIGE (28/03/2026)

### 3.4 CSS vars pour shadows et gradients
- **Probleme**: 15+ box-shadow inline differentes, aucune standardisee
- **Solution**: `--shadow-xs/sm/md/lg/xl/accent` + `--gradient-gold/accent` dans globals.css
- **Status**: [x] CORRIGE (28/03/2026)

### 3.5 Couleurs hardcodees → CSS vars
- **Probleme**: Hex (#C9A84C, #7C3AED, etc.) utilises au lieu de var(--gold), var(--accent)
- **Fichiers**: pilot-assistant.tsx, agence/page.tsx, sidebar.tsx, login/page.tsx
- **Status**: [ ] A FAIRE (Couche 4)

### 3.6 Error boundaries
- **Probleme**: Aucun `error.tsx` dans /agence ou /m — page crash = ecran blanc
- **Solution**: Creer `src/app/agence/error.tsx` et `src/app/m/[slug]/error.tsx`
- **Status**: [ ] A FAIRE

### 3.7 next/image au lieu de <img>
- **Probleme**: 15 balises `<img>` brutes — pas d'optimisation AVIF/WebP, pas de lazy-load natif
- **Solution**: Remplacer par `<Image>` de next/image avec sizes et priority
- **Status**: [ ] A FAIRE

---

## Phase 4 — SEO & SaaS

### 4.1 generateMetadata() pour profils publics
- **Probleme**: `/m/[slug]` n'a aucun OG tag dynamique — partage sur Discord/Twitter = pas de preview
- **Fichier**: `src/app/m/[slug]/layout.tsx`
- **Solution**: `generateMetadata()` avec fetch model data
- **Status**: [ ] A FAIRE

### 4.2 Open Graph + Twitter Cards
- **Probleme**: Layout root n'a que title + description basiques
- **Fichier**: `src/app/layout.tsx`
- **Status**: [ ] A FAIRE

### 4.3 robots.txt + sitemap
- **Probleme**: Aucun fichier SEO de base
- **Note**: Si plateforme privee, `robots.txt` avec Disallow est OK mais doit exister
- **Status**: [ ] A FAIRE

### 4.4 Analytics + Error tracking
- **Probleme**: Aucun tracking — impossible de mesurer conversion ou detecter erreurs prod
- **Solution**: Vercel Analytics (zero-config) + Sentry
- **Status**: [ ] A FAIRE

### 4.5 Dynamiser liste models
- **Probleme**: `model-context.tsx` hardcode yumi/ruby — bloque scale
- **Solution**: Fetch depuis `agence_accounts` au login
- **Status**: [ ] A FAIRE

---

## Journal des Modifications

> Chaque correction effectuee sera documentee ici avec date, fichier, et description.

### 28 mars 2026
| Heure | Fichier | Modification |
|-------|---------|-------------|
| - | `src/app/api/upload/route.ts` | Fix extraction erreur Cloudinary (etait [object Object]) |
| - | `src/app/agence/page.tsx` | Messages tab: conversations groupees par client, reply inline, badge plateforme SNAP/INSTA |
| - | `src/components/os-layout.tsx` | Integration PILOT assistant |
| - | `src/components/pilot-assistant.tsx` | Nouveau composant PILOT (chatbot guide admin) |
| - | `src/lib/pilot-flows.ts` | Config flows PILOT (3 flows: post, code, contenu) |

### 28 mars 2026 — Fondations (Couches 0-3)
| Heure | Fichier | Modification |
|-------|---------|-------------|
| - | `src/types/heaven.ts` | **NOUVEAU** — 20 interfaces centralisees (PackConfig, AccessCode, ClientInfo, FeedPost, Post, WallPost, ModelInfo, UploadedContent, Message, Conversation, ContentItem, PlatformAccount, Goal, CodeRow, etc.) |
| - | `src/constants/tiers.ts` | **NOUVEAU** — TIER_CONFIG, TIER_COLORS, TIER_META, TIER_HEX, PLATFORM_COLORS — source unique |
| - | `src/constants/packs.ts` | **NOUVEAU** — DEFAULT_PACKS reconcilie (couleurs alignees sur CSS vars) |
| - | `src/lib/api-utils.ts` | **NOUVEAU** — sanitize(), apiError(), apiSuccess() |
| - | `src/components/ui/toast.tsx` | **NOUVEAU** — ToastProvider + useToast() hook, 4 types, auto-dismiss, aria-live |
| - | `src/components/ui/spinner.tsx` | **NOUVEAU** — Spinner sm/md/lg reutilisable |
| - | `src/components/ui/empty-state.tsx` | **NOUVEAU** — EmptyState avec icon, title, description, action |
| - | `src/components/ui/confirm-dialog.tsx` | **NOUVEAU** — ConfirmDialog avec backdrop, destructive mode, Escape |
| - | `src/components/ui/tabs.tsx` | **NOUVEAU** — Tabs accessible (role=tablist, aria-selected, keyboard nav) |
| - | `src/components/ui/skeleton.tsx` | **NOUVEAU** — Skeleton line/circle/card + SkeletonCard + SkeletonStat |
| - | `src/components/ui/tier-badge.tsx` | **NOUVEAU** — TierBadge utilisant TIER_CONFIG |
| - | `src/app/globals.css` | Ajout shadow scale (xs→xl), gradient tokens, tier vars (free, public) |
| - | 10 fichiers pages/components | Remplacement types inline par imports `@/types/heaven` |
| - | 5 fichiers pages/components | Remplacement TIER_COLORS/TIER_META inline par imports `@/constants/tiers` |
| - | 21 routes API | Fix CORS: `getCorsHeaders(req)` dans chaque handler (etait module-level sans req) |
| - | 21 routes API | Suppression 31 occurrences `detail: error.message` (leak info DB) |
| - | `src/app/api/codes/route.ts` | Fix race condition: `.eq("used", false)` dans UPDATE atomique |
| - | `src/app/api/credits/purchase/route.ts` | Fix race condition: `.lte()` balance guard, deduct-before-record |

### 28 mars 2026 — Integration (Couche 4)
| Heure | Fichier | Modification |
|-------|---------|-------------|
| - | `src/app/layout.tsx` | Integration `<ToastProvider>` dans root layout |
| - | `src/app/agence/page.tsx` | Pivot Feed/Messages remplace par `<Tabs />` accessible (ARIA) |
| - | `src/app/agence/page.tsx` | PIPELINE_STAGES: emojis remplacees par Lucide icons (Lightbulb, ClipboardList, CameraIcon, Film, Check, Rocket) |
| - | `src/app/m/[slug]/page.tsx` | Skills + credits: emojis remplacees par Lucide icons (Flame, Zap, Palette, Diamond, Camera, MessageCircle) |
| - | `src/components/cockpit/codes-list.tsx` | Integration `<ConfirmDialog>` pour revoke + delete codes |
| - | `src/components/sidebar.tsx` | Hex hardcodes remplacees par CSS vars |
| - | 13 fichiers | 137 font sizes < 10px remplacees par `text-[10px]` (WCAG) |

---

## Notes Techniques

### Architecture actuelle
```
src/
├── app/
│   ├── layout.tsx          ← Root layout (meta basiques)
│   ├── page.tsx            ← Landing publique
│   ├── login/page.tsx      ← Auth Phase 0 (codes hardcodes)
│   ├── agence/
│   │   ├── page.tsx        ← Dashboard cockpit (1258 lignes)
│   │   ├── simulateur/     ← Strategie
│   │   ├── pipeline/       ← Pipeline contenu
│   │   ├── messages/       ← Messages (page dediee)
│   │   ├── clients/        ← Gestion clients
│   │   ├── finances/       ← Finances
│   │   ├── automation/     ← Automation
│   │   ├── settings/       ← Parametres
│   │   └── architecture/   ← Architecture (root only)
│   ├── m/[slug]/
│   │   ├── layout.tsx      ← Layout profil (robots: noindex)
│   │   └── page.tsx        ← Profil model (2392 lignes!)
│   └── api/                ← 21 routes API (CORS fixe, detail leak supprime)
├── types/
│   └── heaven.ts           ← Types centralises (20 interfaces)
├── constants/
│   ├── tiers.ts            ← TIER_CONFIG/COLORS/META/HEX + PLATFORM_COLORS
│   └── packs.ts            ← DEFAULT_PACKS reconcilie
├── components/
│   ├── sidebar.tsx
│   ├── os-layout.tsx
│   ├── pilot-assistant.tsx
│   ├── auth-guard.tsx
│   ├── content-protection.tsx
│   ├── cockpit/
│   │   ├── stat-cards.tsx
│   │   ├── codes-list.tsx
│   │   └── generate-modal.tsx
│   └── ui/                 ← Composants atomiques reutilisables
│       ├── toast.tsx        ← ToastProvider + useToast()
│       ├── spinner.tsx      ← Spinner sm/md/lg
│       ├── empty-state.tsx  ← EmptyState
│       ├── confirm-dialog.tsx ← ConfirmDialog
│       ├── tabs.tsx         ← Tabs accessible (ARIA)
│       ├── skeleton.tsx     ← Skeleton + SkeletonCard + SkeletonStat
│       └── tier-badge.tsx   ← TierBadge
└── lib/
    ├── auth.ts             ← CORS + validation slug
    ├── api-utils.ts        ← sanitize(), apiError(), apiSuccess()
    ├── cloudinary.ts       ← Upload/delete/transform
    ├── model-context.tsx   ← Context models (hardcode)
    └── supabase-server.ts  ← Client Supabase service_role
```

### CSS Variables definies (globals.css)
- Backgrounds: `--bg`, `--bg2`, `--bg3`, `--bg4`
- Surfaces: `--surface`, `--surface-hover`
- Borders: `--border`, `--border2`, `--border3`
- Accents: `--accent`, `--accent-hover`, `--rose`, `--gold`, `--gold2`
- Tiers: `--tier-vip`, `--tier-gold`, `--tier-diamond`, `--tier-platinum`, `--tier-free`, `--tier-public`
- Status: `--success`, `--danger`, `--warning`
- Text: `--text`, `--text-secondary`, `--text-muted`
- Radius: `--radius` (12px), `--radius-lg` (16px), `--radius-xl` (20px)
- Shadows: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-accent`
- Gradients: `--gradient-gold`, `--gradient-accent`

### Tables Supabase utilisees
- `agence_accounts` — comptes model
- `agence_models` — profils model
- `agence_clients` — clients par model
- `agence_codes` — codes d'acces
- `agence_posts` — feed posts
- `agence_messages` — chat messages
- `agence_uploads` — gallery media
- `agence_packs` — packs abonnement
- `agence_purchases` — historique achats
- `agence_wall` — wall posts visiteurs
- `agence_post_interactions` — likes/comments
- `agence_fan_lifecycle` — pipeline fans
- `agence_pipeline_goals` — objectifs pipeline

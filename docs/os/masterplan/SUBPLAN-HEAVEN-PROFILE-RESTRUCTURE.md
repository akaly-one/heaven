# SUBPLAN: Heaven Profile Restructure

> Restructuration complete du profil public `/m/[slug]` — Avril 2026

---

## 1. OVERVIEW

| | |
|---|---|
| **Objectif** | Restructuration complete du profil public `/m/[slug]` avec poker branding, securite device, stories, payment automation |
| **Date** | 7 avril 2026 |
| **Fichiers modifies** | 15 files |
| **Insertions totales** | 904 lignes |
| **Scope** | Frontend (profil public, CP header), Backend (APIs), DB (3 migrations), Security (device fingerprint) |

---

## 2. COMPOSANTS CREES

| Composant | Fichier | Lignes | Status |
|-----------|---------|--------|--------|
| Stories Bar | `src/components/profile/stories-bar.tsx` | ~120 | ✅ Cree |
| Story Generator | `src/components/profile/story-generator.tsx` | ~200 | ✅ Cree, ❌ pas integre CP |
| Device Fingerprint | `src/lib/device-fingerprint.ts` | ~37 | ✅ Cree |
| Code Security API | `src/app/api/codes/security/route.ts` | ~80 | ✅ Cree |
| Client Badge | `src/components/profile/client-badge.tsx` | ~40 | ✅ Mis a jour (tier-based) |
| Order History | `src/components/profile/order-history-panel.tsx` | ~100 | ✅ Cree |

---

## 3. FICHIERS MODIFIES

| Fichier | Changements |
|---------|-------------|
| `src/app/m/[slug]/page.tsx` | +332 lignes: poker nav tiles, gallery masonry, hero collapse, stories integration, security check, daily shuffle, zoom overlay, status display, tier mini-header |
| `src/components/header.tsx` | +114 lignes: auto code generation on accept, beacon delivery, responsive dropdowns, order display with amount/method |
| `src/app/api/posts/route.ts` | +4: post_type field support, `?type=story` filter |
| `src/app/api/models/[slug]/route.ts` | +6: status_text and status_updated_at fields |
| `src/types/heaven.ts` | +2: status_text, status_updated_at on ModelInfo |
| `src/app/globals.css` | +4: @keyframes scaleUp animation |
| `src/constants/tiers.ts` | Updated: poker symbols ♣♦🦶♠♥ |
| `src/constants/badges.ts` | Rewritten: tier-based badges instead of engagement grades |
| `package.json` | +html-to-image dependency |

---

## 4. MIGRATIONS SQL

| # | Fichier | Contenu | Execute sur Supabase |
|---|---------|---------|----------------------|
| 020 | `020_code_security.sql` | `agence_code_devices` + `agence_client_connections` + security fields on `agence_codes` | ⏳ Pending |
| 021 | `021_model_status.sql` | `status_text` + `status_updated_at` on `agence_models` | ⏳ Pending |
| 022 | `022_stories.sql` | `post_type` + `story_expires_at` on `agence_posts` | ⏳ Pending |

**IMPORTANT:** Ces 3 migrations doivent etre executees sur Supabase avant que les features stories, status et security soient fonctionnelles en production.

---

## 5. FEATURES DETAILLEES

### 5.1 Navigation Poker Card Tiles

- **CSS class:** `.poker-tile`
- **Symbols par tier:**
  - ♣ Silver
  - ♦ Gold
  - 🦶 Feet
  - ♠ Black
  - ♥ Platinum
- **Comportement:**
  - Blanc par defaut
  - Couleur tier au hover avec effet 3D perspective
  - Fond solid tier quand selectionne
- **Fix applique:** VIP Black (`#1C1C1C`) illisible sur fond dark → `var(--text-muted)` pour inactif, `#fff` pour actif
- **Min width:** 90px par tile

### 5.2 Stories System

- **StoriesBar:** thumbnails circulaires avec gradient ring tier
- **Viewer:** fullscreen 9:16 avec barre de progression
- **Navigation:** tap gauche/droite + auto-advance
- **Filtrage:** posts avec `post_type="story"` filtres separement
- **Collapse:** masque quand tier gallery active (`isTierView`)

### 5.3 Security Device Fingerprint

- **Fingerprint composition:** Canvas + hardware concurrency + screen + timezone + UA
- **Format:** hash 8-char alphanumeric
- **Endpoint:** `POST /api/codes/security` verifie: `code_id`, `fingerprint`, `user_agent`
- **Limites par code:**
  - Max 2 devices autorises
  - 3eme device → `security_alert=true` sur le code
  - 4eme+ → `blocked=true`, acces refuse
- **Logging:** `agence_client_connections` log chaque connexion

### 5.4 Payment Flow Automatise

1. Client commande via wall post: `⏳ @handle commande: pack tier prix€ via method`
2. Model voit dans CP header → bouton "Valider paiement"
3. Accept → `POST /api/codes` genere code auto (tier + duree + client)
4. Code envoye via `POST /api/messages` au client
5. Wall post SYSTEM ✅ confirmation avec details explicites
6. Client recoit notification dans order history panel

### 5.5 Gallery Masonry + Zoom

- **Layout:** CSS columns (2-3 colonnes responsive)
- **Shuffle:** `dailyShuffle()` avec seeded PRNG base sur la date
  - Positions changent chaque jour
  - Restent stables dans la journee
- **Zoom:** clic → overlay fullscreen Google Photos style
- **Contenu:** merge posts + uploads pour tier galleries
- **Locked posts:** image reelle avec `blur(14px)` + `brightness(0.4)`

### 5.6 Hero Collapse Animation

- **Transition:** `maxHeight: 70vh → 0px` avec `cubic-bezier(0.16, 1, 0.3, 1)`
- **Declencheur:** `isTierView` (quand une tier gallery est ouverte)
- **Mini-header:** apparait avec avatar + nom + tier label
- **Stories bar:** collapse simultanement

### 5.7 Model Status/Mood

- **Champ:** `status_text` (200 chars max) sur `agence_models`
- **Edition:** mode edit dans le hero
- **Visibilite:** tous les visiteurs
- **Fraicheur:** `status_updated_at` pour tracking

### 5.8 Image Generators (Story Generator)

- **3 modes:**
  - Code client
  - Promo story
  - Content teaser
- **Preview:** live preview scaled 270x480
- **Export:** 1080x1920 PNG via `html-to-image` `toPng()`
- **Implementation:** dynamic DOM creation avec cleanup
- **Pattern:** meme que OPearly (eprouve)
- **STATUS:** ⚠️ Composant cree mais PAS ENCORE integre dans le CP

---

## 6. BUGS CORRIGES PENDANT L'IMPLEMENTATION

| Bug | Cause | Fix |
|-----|-------|-----|
| VIP Black tile illisible | `TIER_HEX["black"]` = `#1C1C1C` sur fond dark | `var(--text-muted)` inactif, `#fff` actif |
| Fire bar desalignee | Padding manquant slider vs labels | `px-[10px]` matching + `width:0 overflow:visible` |
| `var(--text-primary)` missing | Jamais defini dans CSS | Remplace par `var(--text)` |
| Feed images noires | Locked posts = gradient vide | `img` + `blur(14px) brightness(0.4)` |
| SYSTEM messages dans feed | Pas filtre | `w.pseudo !== "SYSTEM"` |
| Feed posts invisibles apres validation | Verifie seulement `visitorVerified` | Ajout check `unlockedTier` + `tierIncludes()` |
| Tier gallery sans uploads | Ne montre que posts | Merge posts + uploads |
| Slider max=3 pour 5 tiers | Erreur valeur | `max=4` |
| TypeScript Story type | `media_url string\|null` vs `string` | `.filter().map()` avec `!` assertion |
| `AccessCode.id` inexistant | Type n'a pas de champ `id` | Utilise `code.code` |
| `avatar` null coercion | `null` vs `undefined` | `?? undefined` |

---

## 7. REMAINING WORK

| Tache | Priorite | Estime |
|-------|----------|--------|
| Executer migrations 020-022 sur Supabase | 🔴 CRITIQUE | 2 min |
| Integrer story-generator dans CP header | 🟡 HIGH | 30 min |
| Test complet payment flow end-to-end | 🟡 HIGH | 1h |
| Test security flow (fingerprint + device limit) | 🟡 HIGH | 30 min |
| Stories posting UI (comment model choisit story vs feed) | 🟡 HIGH | 45 min |
| Mobile responsive audit complet | 🟠 MEDIUM | 1h |
| Dark mode persistence | 🟠 MEDIUM | 30 min |
| Order history notifications live | 🟠 MEDIUM | 45 min |

**Temps total restant estime:** ~5h30

---

## 8. TECHNICAL DEBT

| Probleme | Impact | Priorite |
|----------|--------|----------|
| `page.tsx` a 2400+ lignes | Maintenabilite, lisibilite | Decomposer en sous-composants |
| RLS permissive (`USING true`) | Securite DB | Policies par role |
| Pas de validation Zod sur API inputs | Securite, fiabilite | Ajouter schemas Zod |
| Pas de rate limiting | Abuse potential | Middleware rate limit |
| Pas de error boundaries React | UX en cas d'erreur | Ajouter error boundaries |
| `console.error` sans tracking | Pas de visibilite prod | Integrer Sentry ou equivalent |

---

## 9. RESUME ARCHITECTURE

```
/m/[slug]/page.tsx (2400+ lignes)
├── Hero Section (collapse animation)
│   ├── Avatar + Status
│   ├── Bio + Stats
│   └── Stories Bar
├── Poker Nav Tiles (♣♦🦶♠♥)
├── Tier Galleries (masonry + zoom)
│   ├── Posts filtered by tier
│   ├── Uploads merged
│   └── Locked content (blur overlay)
├── Feed Section
│   ├── Wall posts (filtred SYSTEM)
│   └── Order commands
├── Security Layer
│   ├── Device Fingerprint check
│   ├── Code validation
│   └── Connection logging
└── Mini-Header (tier view mode)
    ├── Avatar thumbnail
    ├── Model name
    └── Tier label
```

---

*Document genere le 7 avril 2026 — SQWENSY Agence / Heaven OS*

# Profil public — Infra v1 (2026-04-21)

> Plan technique pour `/m/<slug>` (feed polymorphe + hero + packs + chat + stories).
> Complète `STRATEGIE-v1.2026-04-21.md`.

---

## 1. Routes

| Route | Source | Rôle |
|---|---|---|
| `/m/[slug]` | `src/app/m/[slug]/page.tsx` | Profil public unique (les 3 modèles) |
| `/m/[slug]/layout.tsx` | idem | Wrapper Identity Gate + Admin modal |
| `/m/[slug]/error.tsx` | idem | Fallback erreur propre |
| `/` | `src/app/page.tsx` | Redirect → `/m/yumi` (compat historique) |

Slug → model_id :

```
/m/yumi    → m1
/m/paloma  → m2
/m/ruby    → m3
```

Résolution dans `src/lib/model-utils.ts` (`toModelId(slug)`).

---

## 2. Composants

### 2.1. Arbo cible

```
src/app/m/[slug]/page.tsx                     ← orchestrateur (à dégraisser, 1 473L)
└── <ModelHeaderBar>                           ← existant
    ├── <ModelAvatar />                        ← partagé avec Dashboard
    ├── <BioBlock />
    └── <HeaderActions>                        ← MAJ : ajouter CTA IG natifs
        ├── [Chat Heaven]
        ├── [Suivre sur Insta]                 ← NEW (target=_blank)
        └── [Message sur Insta]                ← NEW (target=_blank, ig.me)
├── <StoriesBar />                             ← existant (TTL 24h)
├── <FeedSection>                              ← existant (polymorphe)
│   ├── <InstagramCard>                        ← badge gradient, click → permalink
│   ├── <ManualPostCard>                       ← badge couronne modèle (NEW)
│   └── <WallPostCard>                         ← badge pseudo fan
├── <TierGallery>                              ← existant (packs PPV)
├── <PackTiles>                                ← existant
├── <ChatSheet>                                ← via useChat hook
└── <UnlockSheet>                              ← via useAccessCode hook
```

### 2.2. Nouveaux sous-composants

- **`<InstagramActionsButton>`** (partagé avec Dashboard) : 2 CTA « Suivre » + « Message » Insta
- **`<ExclusiveBadge>`** : badge couronne pour posts `source_type='manual'` (à ajouter dans `feed-section.tsx`)

### 2.3. Existants à ajuster

- `<FeedSection>` (`src/web/components/profile/feed-section.tsx`) :
  - **Actuel** : rend Instagram + merged legacy posts+wall
  - **Cible** : ajouter badge couronne sur les cartes `source_type='manual'`
  - **Actuel** : cartes Instagram cliquables sur image (ouvre lightbox locale)
  - **Cible** : click carte Instagram → ouvre `item.permalink` en nouvel onglet (pas de lightbox pour IG)

---

## 3. Data model

### 3.1. Table `agence_feed_items` (existante, migration 038)

```
id              uuid PK
model_id        text  (m1/m2/m3)
source_type     enum('manual','instagram','wall')
external_id     text NULL   -- ig_media_id si instagram
media_url       text
thumbnail_url   text
caption         text
posted_at       timestamptz
like_count      int DEFAULT 0
comment_count   int DEFAULT 0
pinned          bool DEFAULT false
permalink       text NULL   -- https://www.instagram.com/p/<code> si IG
media_type      text        -- image/video/carousel
tier_required   text NULL   -- p0..p4 si manual
author_handle   text NULL   -- si wall
UNIQUE(model_id, source_type, external_id)
```

### 3.2. Table `agence_models` (extraits pertinents)

```
slug             text UNIQUE   -- yumi / paloma / ruby
model_id         text          -- m1 / m2 / m3
display_name     text
bio              text
avatar_url       text          -- legacy Cloudinary
avatar_ig_url    text          -- NEW (module dashboard)
tier_palette     jsonb         -- custom color per model tier
ig_username      text          -- indirectement via instagram_config
```

### 3.3. Table `instagram_config`

Réutilisée pour récupérer `ig_username` nécessaire aux liens `instagram.com/<user>` + `ig.me/m/<user>`.

---

## 4. Endpoints API

### 4.1. Existants

| Route | Méthode | Usage public profil |
|---|---|---|
| `/api/feed?model=<slug>` | GET | Feed polymorphe (principal) |
| `/api/models?slug=<slug>` | GET | Metadata modèle |
| `/api/packs?model=<slug>` | GET | Packs PPV actifs |
| `/api/uploads?model=<slug>` | GET | Stories actives TTL 24h |
| `/api/codes/verify` | POST | Vérifier un code d'accès |
| `/api/messages` | POST | Envoyer un message chat Heaven |
| `/api/clients` | GET/POST | CRM visiteur (fingerprint + pseudo) |
| `/api/wall` | POST | Poster sur le mur |

### 4.2. Whitelist middleware

Toutes les routes ci-dessus sont déjà en **whitelist publique GET/POST** (cf. `src/middleware.ts`). Pas de JWT requis pour consommer le profil en anonyme — c'est le design RGPD Meta validé (Meta App Review).

### 4.3. Nouveau (optionnel) `/api/feed/<slug>/pin`

Pour permettre au modèle connectée de pin/unpin un post. Protégé JWT `role=model|root`. Utilisé en edit mode.

---

## 5. Patterns techniques

### 5.1. Feed polymorphe — render switch

```tsx
{unifiedItems.map(item => {
  switch (item.source_type) {
    case "instagram":
      return <InstagramCard item={item} onClick={() => window.open(item.permalink, "_blank")} />;
    case "manual":
      return <ManualPostCard item={item} tierRequired={item.tier_required} unlockedTier={unlockedTier} />;
    case "wall":
      return <WallPostCard item={item} />;
  }
})}
```

### 5.2. Badge couronne posts manuels

Fichier cible : `src/web/components/profile/feed-section.tsx` (~ligne 210, section « UNIFIED RENDERING »).

```tsx
{item.source_type === "manual" && (
  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
    style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>
    <Crown className="w-2.5 h-2.5" />
    {model.display_name.toUpperCase()} EXCLU
  </span>
)}
```

### 5.3. Click Instagram → permalink natif

Le rendu actuel (ligne 263) wrappe l'image dans un `<div onClick={setLightboxUrl}>`. Remplacer par :

```tsx
{item.source_type === "instagram" ? (
  <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="block">
    <img ... />
  </a>
) : (
  <div onClick={() => setLightboxUrl(src)}>
    <img ... />
  </div>
)}
```

### 5.4. Scope RLS profils publics

Feed, posts, packs, uploads, messages → toutes les requêtes GET publiques filtrent par `model_id` via `slug`. RLS appliquée via `can_see_model_id()` côté DB mais la majorité du contenu est déjà **tier P0 public** donc lu en `anon` sans leak.

### 5.5. Skeleton uniforme 3 modèles

Aucun branching `if (slug === "yumi")` dans le code. Tout passe par :
- `agence_models[slug]`
- `instagram_config[model_id]`
- `tier_palette` JSON pour les couleurs custom

---

## 6. Interaction avec Dashboard (module `dashboard`)

| Point | Relation |
|---|---|
| Avatar | Même source (IG live > `avatar_ig_url` < 24h > Cloudinary) |
| IG username | Partagé via `instagram_config.ig_username` |
| Boutons CTA natifs | Composant partagé `<InstagramActionsButton>` |
| KPIs followers | Dashboard-only — pas affiché sur `/m/<slug>` (discrétion) |

---

## 7. Tests & acceptation

- [ ] `/m/yumi`, `/m/paloma`, `/m/ruby` rendent le même skeleton (diffs uniquement via data)
- [ ] Feed contient posts manuels + IG + wall avec badges distincts
- [ ] Carte Instagram : click → `instagram.com/p/<code>` nouvel onglet
- [ ] Carte manuel : badge couronne visible + tier_required respecté
- [ ] Header : boutons « Suivre sur Insta » + « Message sur Insta » opérationnels
- [ ] Avatar reflète IG live (si token valide) sinon fallback DB
- [ ] Stories TTL 24h fonctionnelles (régression non)
- [ ] Visiteur anonyme voit uniquement tier P0 (packs P1+ floutés)
- [ ] Visiteur avec code : tier unlocked correctement

---

## 8. Liens

- Route : `src/app/m/[slug]/page.tsx`
- Feed : `src/web/components/profile/feed-section.tsx`
- API : `src/app/api/feed/route.ts`
- Cron IG : `src/app/api/cron/sync-instagram/route.ts`
- Migration 038 feed polymorphe : `supabase/migrations/038_yumi_full_ops.sql`
- Middleware whitelist : `src/middleware.ts`
- Dashboard (partage avatar) : `plans/modules/dashboard/INFRA-v1.2026-04-21.md`
- BP : `plans/business/bp-agence-heaven-2026-04/README.md`

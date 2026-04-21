# Dashboard — Infra v1 (2026-04-21)

> Plan technique pour le Dashboard cockpit Heaven (index `/agence`).
> Complète `STRATEGIE-v1.2026-04-21.md` (briefs NB B9 + B1 split settings).

---

## 1. Routes

### 1.1. Routes UI

| Route | Source | Rôle |
|---|---|---|
| `/agence` | `src/app/agence/page.tsx` | Dashboard — home cockpit |
| `/agence` redirect | `src/middleware.ts` (à étendre) | `?tab=contenu|clients|strategie` → routes dédiées (backcompat Module A) |

### 1.2. Pas de nouveau chemin

Le Dashboard reste sur `/agence` (D-2 de `REFACTOR-NAVIGATION-SPEC.md`). Aucun `/dashboard`, aucun `/cockpit`.

### 1.3. Navigation sortante

| Action | Destination |
|---|---|
| « Profil public » | `/m/<slug>` (même tab, route interne) |
| « Suivre sur Insta » | `https://instagram.com/<ig_username>` (cible `_blank`) |
| « Message sur Insta » | `https://ig.me/m/<ig_username>` (cible `_blank`) |
| Logo couronne (sidebar header) | `/agence` (click handler sur l'icône) |

---

## 2. Composants

### 2.1. Hiérarchie cible

```
src/app/agence/page.tsx                       ← shell (wraps OsLayout)
└── <DashboardView>                            ← NEW (extrait monolithe, ~400L)
    ├── <DashboardHeader>                      ← NEW
    │   ├── <ModelAvatar />                    ← priorité IG > Cloudinary
    │   ├── <ModelIdentityBlock />             ← display_name + bio
    │   ├── <InstagramStatsRow />              ← followers / following / media
    │   └── <HeaderActions>                    ← [Profil public | Suivre IG | DM IG]
    ├── <InstagramStatsWidget />               ← DÉJÀ EXISTANT (src/cp/components/cockpit/instagram-stats-widget.tsx)
    ├── <BusinessKpisRow />                    ← CA mois / PPV / abos Fanvue
    ├── <RecentActivityList />                 ← derniers messages + paiements
    └── <OverviewSimulator />                  ← existant, à conserver
```

### 2.2. `<Sidebar>` — mises à jour

Fichier : `src/shared/components/sidebar.tsx`

```ts
const NAV_MAIN = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/agence", color: "#E63329" },
  // ... le reste inchangé
];

// Logo couronne cliquable (lignes 115-124 actuelles)
<a href="/agence" aria-label="Retour Dashboard">
  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E63329" }}>
    <Crown className="w-4 h-4" style={{ color: "#fff" }} />
  </div>
</a>
```

Retrait : `NAV_ROOT` conserve Finances/Ops/Automation/Settings — `architecture` déplacé dans Settings → géré dans module `settings-dev-center`.

### 2.3. `<ModelAvatar>` — priorité source

```tsx
interface ModelAvatarProps {
  modelId: "m1" | "m2" | "m3";
  size?: "sm" | "md" | "lg";
}

function pickAvatar(model: AgenceModel, ig: IgProfileStats | null) {
  if (ig?.profile_picture_url) return ig.profile_picture_url;
  if (model.avatar_ig_url && isFresh(model.avatar_ig_synced_at, 24 * 3600)) return model.avatar_ig_url;
  if (model.cloudinary_avatar_url) return model.cloudinary_avatar_url;
  return "/placeholder-avatar.svg";
}
```

---

## 3. Data model

### 3.1. Migration `039_dashboard_ig_avatar_sync.sql` (à créer)

```sql
ALTER TABLE agence_models
  ADD COLUMN IF NOT EXISTS avatar_ig_url         text,
  ADD COLUMN IF NOT EXISTS avatar_ig_synced_at   timestamptz,
  ADD COLUMN IF NOT EXISTS ig_bio_cached         text,
  ADD COLUMN IF NOT EXISTS ig_bio_cached_at      timestamptz;

CREATE INDEX IF NOT EXISTS idx_agence_models_avatar_sync
  ON agence_models(avatar_ig_synced_at DESC NULLS LAST);
```

### 3.2. Table `instagram_config` (existante — extrait)

```
ig_long_lived_token       text     -- 60 jours
ig_business_account_id    text     -- 17841400193217961 pour m1
ig_username               text     -- @yumiiiclub
profile_picture_url       text     -- dernière photo récupérée
followers_count           int
follows_count             int
media_count               int
last_synced_at            timestamptz
```

Note : `instagram_config` est déjà scopé par `model_id` (migration 030).

---

## 4. Endpoints API

### 4.1. Existants réutilisés

| Route | Méthode | Fichier | Usage Dashboard |
|---|---|---|---|
| `/api/instagram/profile-stats` | GET | `src/app/api/instagram/profile-stats/route.ts` | Avatar + stats header |
| `/api/models` | GET | `src/app/api/models/route.ts` | Profil actif + display_name |
| `/api/finances` | GET | `src/app/api/finances/route.ts` | KPIs CA/PPV |
| `/api/agence/ops/metrics` | GET | `src/app/api/agence/ops/metrics/route.ts` | (optionnel) latence IG |

### 4.2. Nouveau endpoint `/api/agence/dashboard/summary`

```
GET /api/agence/dashboard/summary?model=m1
→ 200 {
    model: { id, slug, display_name, bio, avatar_url },
    instagram: { username, followers, following, media_count, profile_picture_url },
    kpis: { revenue_mtd, ppv_30d, active_subscribers, average_basket },
    activity: [{ type, at, summary }] (5 items)
  }
```

But : une seule requête pour éviter le waterfall N+1 actuel. Appelle les 3 endpoints existants en parallèle server-side + cache 60s (Vercel Runtime Cache).

### 4.3. Cron sync avatar

Cron `sync-instagram` (`src/app/api/cron/sync-instagram/route.ts`) étend sa fonction :

```ts
// Avant
await supabase.from("agence_feed_items").upsert(...);

// Ajouté
await supabase.from("agence_models")
  .update({
    avatar_ig_url: data.profile_picture_url,
    avatar_ig_synced_at: new Date().toISOString(),
    ig_bio_cached: data.biography,
    ig_bio_cached_at: new Date().toISOString(),
  })
  .eq("model_id", modelId);
```

Fréquence : 1/jour 6h (limite Vercel Hobby — D-6 NB pour Upstash QStash).

---

## 5. Patterns techniques

### 5.1. Sync avatar IG : fallback chain

```
1. Page load Dashboard
2. Parallel fetch: /api/instagram/profile-stats + /api/agence/dashboard/summary
3. Si IG stats OK → display avatar live + persist async (fire-and-forget)
4. Si IG stats KO → display avatar_ig_url DB (si < 24h)
5. Si DB stale → display cloudinary_avatar_url
6. Si rien → placeholder neutre
```

### 5.2. Deep-links Insta

```ts
const IG_LINKS = {
  profile: (username: string) => `https://instagram.com/${username}`,
  dm: (username: string) => `https://ig.me/m/${username}`,
} as const;
```

Utiliser `target="_blank" rel="noopener noreferrer"`. Aucune API Meta requise (pas de permission `instagram_manage_messages` nécessaire pour ces liens universels).

### 5.3. Icône couronne globale (sidebar)

- Composant : `<Sidebar>` (`src/shared/components/sidebar.tsx` lignes 115-124)
- Change : wrap `<div>` logo dans `<a href="/agence">`
- ARIA : `aria-label="Accueil Dashboard"` + `title="Dashboard"` au hover
- Mobile : idem sur `MOBILE_NAV_MAIN[0]` — déjà OK

### 5.4. RBAC

- Dashboard accessible pour `role=model` ET `role=root`
- `role=model` voit uniquement SON `model_id` (scoping via JWT claim + `can_see_model_id()`)
- `role=root` a un sélecteur pour switch entre `m1`/`m2`/`m3`

---

## 6. Migration — ce qui part ailleurs

### 6.1. Architecture map → Settings/Dev Center (brief B1)

| Avant | Après |
|---|---|
| `src/app/agence/architecture/page.tsx` | `src/app/agence/settings/dev-center/architecture/page.tsx` |
| `NAV_ROOT.architecture` sidebar | Retiré de la sidebar, accessible via Settings |

Traité dans module séparé `modules/settings-dev-center/` (hors lot actuel).

### 6.2. Tabs internes du Dashboard → routes dédiées

| Avant | Après (D-1 Option 1) |
|---|---|
| `/agence?tab=contenu` | `/agence/contenu` |
| `/agence?tab=clients` | `/agence/clients` (existe déjà, à reconstruire) |
| `/agence?tab=strategie` | `/agence/strategie` |

Traité dans `modules/contenu-packs/`, `modules/messagerie-contacts/` et module `strategie` (ultérieur).

---

## 7. Tests & acceptation

- [ ] Sidebar label = « Dashboard » (pas « agence »)
- [ ] Click sur couronne → `/agence`
- [ ] Header Dashboard affiche avatar IG live + fallback DB < 24h
- [ ] Bouton « Suivre sur Insta » ouvre `instagram.com/<username>`
- [ ] Bouton « Message sur Insta » ouvre `ig.me/m/<username>`
- [ ] Stats followers / media count visibles sans scroll
- [ ] Bouton « Dashboard » redondant supprimé du header cockpit
- [ ] `agence_models.avatar_ig_url` mis à jour après passage cron 6h
- [ ] Fallback Cloudinary OK si IG token expiré

---

## 8. Liens

- BP : `plans/business/bp-agence-heaven-2026-04/README.md`
- Navigation spec : `plans/REFACTOR-NAVIGATION-SPEC.md`
- Profil public (avatar partagé) : `plans/modules/profil-public/INFRA-v1.2026-04-21.md`
- Architecture globale : `plans/tech/architecture.md`
- Migration 030/038 : `supabase/migrations/030_instagram_agent.sql`, `038_yumi_full_ops.sql`

# Dashboard — Stratégie v1 (2026-04-21)

> Module cockpit principal du CP Heaven — index d'arrivée après login.
> Hébergé aujourd'hui sur `/agence` ; sidebar labellisée « agence ».
> Source business : `plans/business/bp-agence-heaven-2026-04/README.md`.

---

## 1. Contexte

Le Dashboard est la **home page du cockpit modèle**. Il agrège pour le profil actif (`m1`/`m2`/`m3`) :

- identité visuelle du compte (avatar, display name, bio)
- KPIs Instagram temps réel (followers, following, media count)
- KPIs business (CA mois, PPV, abos Fanvue, panier moyen)
- raccourcis vers les canaux (profil public, Insta natif)

Aujourd'hui, le Dashboard est monté sous `/agence/page.tsx` (2 537 lignes — monolithe à décomposer, traité Module B de la roadmap tech). Le widget Instagram `InstagramStatsWidget` est déjà intégré (ligne 853). La sidebar pointe vers `/agence` avec le label provisoire « Dashboard » via `NAV_MAIN[0]`.

---

## 2. Briefs NB — ce qui change (B9)

### 2.1. Rename sidebar

- ❌ Label historique « agence » / « Dashboard » prête à confusion avec la branche SQWENSY Agence (interne) et le reste des pages model
- ✅ Label unique : **« Dashboard »** pour marquer clairement l'index du cockpit
- URL cible conservée : `/agence` (D-2 de `REFACTOR-NAVIGATION-SPEC.md` → pas de renaming racine)

### 2.2. Header « rempli » — infos Insta du modèle

Le header actuel affiche juste le nom du profil et des actions rapides. Brief NB : **remplir le header du Dashboard avec la photo, le display name, la bio et les stats Instagram** pour donner un sens visuel immédiat.

Zones cible :

- **Avatar** — `profile_picture_url` Insta (cf. § 3 sync automatique)
- **Display name** — `username` Insta (`@yumiiiclub`, `@paloma_*`, `@ruby_*`)
- **Bio courte** — 1-2 lignes extraites du profil Meta
- **Stats** — `followers_count`, `follows_count`, `media_count` (déjà fournis par `/api/instagram/profile-stats`)
- **KPIs business** — CA mois, PPV 30j, abos Fanvue actifs

### 2.3. Photo profil sync IG automatique

Règle produit : **la photo de profil du modèle dans le CP = toujours la photo Insta actuelle**.

- Pas de re-upload manuel (zéro friction pour le modèle/admin)
- Source unique de vérité : Meta Graph API → `profile_picture_url`
- Rafraîchissement : à l'ouverture du Dashboard + cron daily 6h
- Fallback : avatar Cloudinary si IG non connecté ou API en erreur

### 2.4. Bouton profil public — deux actions directes Insta

Dans le header, à côté du bouton « Profil public » (`/m/<slug>`), ajouter :

- **« Suivre sur Insta »** → `https://instagram.com/<username>` (ouvre onglet natif)
- **« Message sur Insta »** → `https://ig.me/m/<username>` (ouvre DM natif)

Contrainte : utiliser les liens universels Meta (pas de deep-link custom).

### 2.5. Icône couronne = raccourci Dashboard

- Aujourd'hui : une **icône `Crown`** figure dans le header de la sidebar comme logo + un lien « Dashboard » séparé
- Brief : **la couronne devient cliquable et renvoie toujours à `/agence`** (le Dashboard)
- Conséquence : suppression du bouton « Dash » redondant à côté — l'icône fait le job

---

## 3. Sync photo IG → carte modèle (B9 détail)

### 3.1. Boucle d'update
1. User ouvre Dashboard → front fetch `/api/instagram/profile-stats`
2. Route lit `instagram_config.ig_long_lived_token` + `ig_business_account_id`
3. Appel Meta `?fields=username,followers_count,follows_count,media_count,profile_picture_url`
4. Retour vers front
5. Parallèle : UPSERT dans `agence_models.avatar_ig_url` (nouveau champ) + `avatar_ig_synced_at`
6. Next.js invalide `revalidateTag("model:<id>")`

### 3.2. Priorité d'affichage avatar

```
1. agence_models.avatar_ig_url (si synced_at < 24h)
2. Meta Graph fetch live (si Dashboard ouvert + token valide)
3. agence_uploads avatar Cloudinary (fallback legacy)
4. Placeholder neutre
```

### 3.3. Diffusion cross-modules

L'avatar IG est aussi utilisé sur le **profil public `/m/<slug>`** (module `profil-public`). Même règle de priorité. Voir `modules/profil-public/STRATEGIE-v1.2026-04-21.md`.

---

## 4. Liens entre modules

| Dépendance | Module source | Raison |
|---|---|---|
| `/agence/architecture` → Settings/Dev Center | `settings-dev-center` | Brief B1 : ne reste PAS en sidebar top-level |
| Widget stats IG Dashboard | `instagram` | Le Dashboard consomme `/api/instagram/profile-stats` mais ne le gère pas |
| Avatar IG sync | `profil-public` | Même source, doit rester cohérent |
| KPIs business (CA/PPV/abos) | `contenu-packs`, `messagerie-contacts` | Agrégations remontées au Dashboard |

---

## 5. Critères UX de succès

1. **1 regard = identité complète modèle visible** : avatar + nom + bio + followers sans scroll
2. **0 clic pour relancer Insta** : les 2 boutons natifs sont visibles dès le header
3. **Cohérence absolue** : avatar CP = avatar Insta = avatar `/m/<slug>` à tout moment (tolérance 24h)
4. **La couronne = toujours retour Dashboard** : nulle part ailleurs dans la navigation elle ne fait autre chose
5. **Zéro bouton « Dashboard » redondant** dans le header du Dashboard lui-même
6. **Sidebar item = « Dashboard »** — jamais « agence », jamais « Home », jamais « Cockpit »

---

## 6. Dépendances techniques

- `/api/instagram/profile-stats` opérationnel (OK, cf. `src/app/api/instagram/profile-stats/route.ts`)
- Table `agence_models` étendue avec `avatar_ig_url` + `avatar_ig_synced_at` (migration à créer)
- Composant `<Sidebar>` modifié (label + fallback collapsed)
- Composant `<DashboardHeader>` nouveau (extraction du monolithe `/agence/page.tsx`)
- Migration cron `sync-instagram` pour rafraîchir les avatars (déjà existant, extension du périmètre)

---

## 7. Hors scope de ce module

- Décomposition du monolithe `/agence/page.tsx` (Module B roadmap tech)
- Widgets business avancés (Commission, Palier) → Sprint 5 BP
- Migration route `/agence/architecture` vers `/agence/settings/dev-center` → module `settings-dev-center`
- KPIs Caming (Sprint 4 BP) et vue par Mode (Sprint 6 BP) → modules dédiés ultérieurs

---

## 8. Liens

- BP source : `plans/business/bp-agence-heaven-2026-04/README.md`
- Spec navigation : `plans/REFACTOR-NAVIGATION-SPEC.md` (Option 1, D-1/D-2/D-3)
- Profil public : `plans/modules/profil-public/STRATEGIE-v1.2026-04-21.md`
- Settings/Dev Center : `plans/modules/settings-dev-center/` (à créer hors ce lot)
- Modules catalogue : `plans/product/modules.md`
- Architecture : `plans/tech/architecture.md`

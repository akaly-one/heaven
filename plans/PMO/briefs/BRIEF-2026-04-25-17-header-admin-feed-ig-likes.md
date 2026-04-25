# BRIEF-2026-04-25-17 — Header admin enrichi + Feed IG vignettes + Likes/Commentaires

> ⚠️ **Partiellement révisé 2026-04-25 evening** — La section HeaderBar admin enrichi
> a été rolled back (commit `f09298c`). Le profil admin = profil visiteur intact +
> couche admin overlay (pas de header séparé). Les boutons admin Camera/Image/Save/
> Cancel/Eye preview restent actifs via overlay hover BRIEF-18. Les autres parties
> (likes/comments, feed IG, drawer) restent valides.
> Voir BRIEF-22+23 Profile-as-Hub pour la nouvelle direction.

> **Date** : 2026-04-25 ~01:50
> **Émetteur** : NB
> **Type** : feature + UX + DB
> **Priorité** : P1
> **Branches** : DB, BE, FE, Doc
> **Statut** : 🟢 dispatched 3 agents parallèles (post-audit)

---

## 🎯 Demande NB

> "le bouton edit profil est obsolette, tu peux le suprimer j'aimerai que les boutons d'editions du profil soient ajouter au header si je me connecte en mode admin yumi par exemple le header soit un header admin pour pouvoir changer la photo profil le banner a partir de la et ensuite les images du feed insta doit apparaitre dans le feed du profil mais avec les images aussi, en petit, et avec l'option de pouvoir metre de likes et des commentaires"

### Décomposition
1. **Supprimer bouton "Modifier profil"** (Pencil) du raccourci CP `agence-header.tsx` → ✅ livré inline
2. **HeaderBar admin enrichi** sur `/m/[slug]` : quand admin connecté (yumi/paloma/ruby/root), ajouter dans le header les boutons :
   - Changer photo profil
   - Changer banner
   - (Bonus suggéré : Save/Cancel + mode preview visiteur)
3. **Feed Instagram intégré** dans le feed du profil :
   - Grille de vignettes Instagram-style (petites images)
   - Boutons **like** et **comment** sur chaque vignette
   - Lightbox/modal au click pour voir détail

---

## 📊 Audit (livré 25/04 ~01:50)

### Existant à réutiliser ✅
- **`useEditMode` hook** (`src/shared/hooks/use-edit-mode.ts`) : déjà complet avec `editProfile`, `editPacks`, `displayModel`, refs `avatarInputRef`/`bannerInputRef`, handlers `handleAvatarUpload`/`handleBannerUpload`, `saveAllEdits`, `cancelEdits`. Activé par `?edit=true && isModelLoggedIn`.
- **Upload Cloudinary** via `POST /api/upload` (base64 → URL)
- **Route PATCH `/api/models/[slug]`** pour persister avatar/banner/profile
- **`FeedItemCard`** (`src/cp/components/profile/feed-item-card.tsx`) qui affiche caption + media + badges IG/Crown/Author
- **Type `FeedItem`** dans `src/shared/types/heaven.ts` avec `like_count` + `comment_count` colonnes
- **Route `/api/feed`** + sync IG cron `/api/cron/sync-instagram`
- **Section feed dans `/m/[slug]/page.tsx` L1212+** affiche `FeedItemCard` en liste verticale

### À étendre ⚠️
- **Boutons photo/banner** sont actuellement dans `HeroSection` (L1050-1058) visibles en `isEditMode` → **déplacer vers `HeaderBar`** L802+ quand `isModelLoggedIn=true`
- **Activer auto `isEditMode`** quand `isModelLoggedIn=true` sans besoin de `?edit=true` query param
- **Affichage feed** : passer de liste verticale à **grille de vignettes** (Instagram-style 3-4 cols)

### À créer ❌
- **Tables DB** : `agence_feed_likes` (id, feed_item_id, client_id, created_at, UNIQUE) + `agence_feed_comments` (id, feed_item_id, client_id, content, created_at)
- **Triggers** auto-incrément `like_count`/`comment_count` sur `agence_feed_items`
- **Routes API** : `POST /api/feed-items/[id]/like` (toggle) + `POST /api/feed-items/[id]/comment` (create) + `GET /api/feed-items/[id]/comments` (list)
- **Logique onClick** dans `FeedItemCard` pour Heart + MessageCircle
- **Composant `<InstagramGrid>`** + mode "thumbnail" du `FeedItemCard`
- **Modal/lightbox** détail d'un post avec zone commentaires

---

## 🎫 Plan tickets (3 agents parallèles)

### Phase A — DB + BE likes/comments (Agent 1)
- **T17-A1** : Migration `077_feed_interactions.sql` avec tables `agence_feed_likes` + `agence_feed_comments` + triggers auto-incrément count
- **T17-A2** : Route `POST/DELETE /api/feed-items/[id]/like` (toggle, anti-replay client_id)
- **T17-A3** : Route `POST /api/feed-items/[id]/comments` (create) + `GET` (list paginated)
- **T17-A4** : Helper `hasLiked(feedItemId, clientId)` côté serveur pour pre-render

### Phase B — FE HeaderBar admin (Agent 2)
- **T17-B1** : Activer `isEditMode` automatiquement quand `isModelLoggedIn=true` (modifier `useEditMode`)
- **T17-B2** : Ajouter boutons photo/banner dans `HeaderBar` `/m/[slug]/page.tsx` (réutiliser `edit.avatarInputRef` + `edit.bannerInputRef` + `edit.handleAvatarUpload` + `edit.handleBannerUpload`)
- **T17-B3** : Bouton "Save" si `editDirty=true` + bouton "Cancel" → `cancelEdits()`
- **T17-B4** : Bouton "Mode visiteur" toggle pour prévisualiser comme visiteur normal (force `isModelLoggedIn=false` côté UI seulement)
- **T17-B5** : Retirer/atténuer les boutons photo/banner de `HeroSection` (déplacés au header) — option : garder un fallback discret

### Phase C — FE Instagram Grid + Likes/Comments (Agent 3)
- **T17-C1** : Composant `<InstagramFeedGrid>` layout grille (3 cols mobile, 4-5 desktop) — chaque cell = miniature carrée avec image + mini badges
- **T17-C2** : Mode "thumbnail" du `FeedItemCard` (image only, badges mini, hover overlay : caption + likes count + comments count)
- **T17-C3** : Onclick handlers Heart + MessageCircle dans `FeedItemCard` (call routes API Phase A)
- **T17-C4** : Lightbox modal au click sur vignette : image full + caption + liste comments + zone saisie commentaire (enabled si `clientId` présent)
- **T17-C5** : Intégrer `<InstagramFeedGrid>` dans `/m/[slug]/page.tsx` à la place de la liste verticale (ou en complément, à valider avec NB)

---

## 🔀 Dispatch agents

- **Agent 1 (DB+BE)** : T17-A1 + T17-A2 + T17-A3 + T17-A4 (autonome)
- **Agent 2 (FE Header admin)** : T17-B1 + T17-B2 + T17-B3 + T17-B4 + T17-B5 (autonome — utilise hook existant)
- **Agent 3 (FE IG Grid + Likes UI)** : T17-C1 + T17-C2 + T17-C3 + T17-C4 + T17-C5 (dépend partiellement Agent 1 pour API likes/comments — Agent 3 peut commencer le grid + thumbnail mode en attendant)

**Cycle estimé** : 1-2h en parallèle.

---

## ✅ Definition of Done

- [ ] Bouton "Modifier profil" Pencil supprimé d'`agence-header.tsx` (✅ livré inline)
- [ ] Admin connecté (yumi/paloma/ruby/root) sur `/m/[slug]` voit dans HeaderBar les boutons photo/banner/save/cancel
- [ ] Mode édition auto-activé quand admin connecté (plus besoin `?edit=true`)
- [ ] Feed IG s'affiche en grille de vignettes (3-4 cols)
- [ ] Like + Comment fonctionnels (DB persistée, count auto-incrémenté via trigger)
- [ ] Lightbox détail avec liste comments + zone saisie
- [ ] Migration `077_feed_interactions.sql` appliquée live Supabase
- [ ] tsc --noEmit exit 0
- [ ] CHANGELOG v1.5.1 + commit + push main

---

## 📌 Références croisées

- BRIEF-08 (Persona Yumi v2) : feed IG est la source des contents
- BRIEF-13 (Unified clients) : `client_id` requis pour like/comment

---

## 🔗 Fichiers de référence

- `src/shared/hooks/use-edit-mode.ts` (hook complet existant)
- `src/app/m/[slug]/page.tsx` L802 (HeaderBar) + L1050 (HeroSection edit buttons) + L1212 (FeedView)
- `src/cp/components/profile/feed-item-card.tsx` (composant à étendre)
- `src/app/api/models/[slug]/route.ts` (PATCH avatar/banner/profile)
- `src/app/api/feed/route.ts` (GET feed items)
- `src/cp/components/cockpit/dashboard/agence-header.tsx` (bouton Pencil supprimé ✅)
- `src/shared/types/heaven.ts` (type FeedItem avec like_count/comment_count)

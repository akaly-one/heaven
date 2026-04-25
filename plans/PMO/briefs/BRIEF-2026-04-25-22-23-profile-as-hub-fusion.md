# BRIEF-2026-04-25-22+23 — Profile-as-Hub (fusion contenu + feed CP→Profil + cockpit 2 tabs)

> **Date** : 2026-04-25 evening
> **Émetteur** : NB
> **Type** : refactor archi majeur (P0 structurant)
> **Priorité** : P0
> **Layer** : FE refactor + Doc
> **Statut** : 🟢 partial livré V1 (Profile-as-Hub overlay admin + cockpit 2 tabs livrés ; phases avancées éditeur packs inline + drawer blur preview reportées Phase 2)
> **Fusion** : BRIEF-22 (fusion onglet Contenu CP→Profil) + BRIEF-23 (fusion feed dashboard CP→Profil + refonte cockpit 2 tabs) consolidés en 1 plan unique vu la dépendance critique sur les mêmes fichiers.

---

## Vision NB

> "tout ce qui concerne le contenu upload par la modèle se fait directement à partir du profil de la modèle en mode admin... la modèle sera connectée à son CP via le header, et donc les options admin seront activées en profil, car si la modèle n'est pas connectée à son compte la page profil sera toujours affichée en mode client"
>
> "C'est un pattern de gestion de profil et réglages dans le style réseau social comme Instagram ou TikTok : tu as des accès différents qui te permettent de ajouter/modifier/supprimer les infos ou contenu à un seul endroit grâce aux accès admin ou accès visiteur. Sinon ça crée des pages redondantes qui alourdissent le code."

## Pattern adopté : SPRBP (Single Page, Role-Based Permissions)

Inspiration directe : Instagram (`instagram.com/yumi`), TikTok (`tiktok.com/@yumi`), X (`x.com/yumi`).

- Visiteur voit : grille feed + bio + actions sociales (chat, suivre, etc.)
- Owner voit : la même grille + Edit profile + Camera hover avatar + +Post inline + Settings
- **Même URL, même skeleton, layer overlay selon `auth.uid === profile.uid`**

## Décisions architecturales

### Profil `/m/[slug]` = HUB unique
- Skeleton client par défaut (vitrine intacte — **zero info sacrifiée** quand admin)
- Couche admin overlayée si `isModelLoggedInActual && !previewMode` :
  - 4 boutons admin header (Eye/Link2/Key/Story) via `<HeavenAdminActions>` — BRIEF-19
  - PostComposer inline FeedView — BRIEF-23
  - Hover edit photo/banner ✅ déjà livré BRIEF-18
  - Mount `<StoryGeneratorModal>` admin
- Mode preview admin (`previewMode=true`) → masque toute la couche admin pour preview pure visiteur

### Cockpit `/agence` = 2 tabs
- TABS const : `[messagerie, strategie]` (ex 3 : `[dashboard, contenu, strategie]`)
- Default activeTab = "strategie" (le tab Messagerie redirige direct vers `/agence/messagerie`)
- onTabChange : tab Messagerie → `window.location.href = "/agence/messagerie"` ; tab Stratégie → setActiveTab inline
- Composants `<HomePanel>` et `<ContenuPanel>` conservés non-mountés pour rollback rapide (cast `as string` désactive narrow type check sur les comparaisons devenues "always false")

### Anti-patterns évités
- ❌ Pages dupliquées (`/agence/contenu` séparée)
- ❌ Composants miroirs CP/Profil (`<ContentManager>` + `<ContentDisplay>`)
- ❌ Routes API dédoublées
- ❌ Hooks parallèles (`useCpContent` vs `useProfileContent`)

### Pattern correct adopté
- Une seule `<ProfilePage>` (`/m/[slug]/page.tsx`) qui détecte la session
- `<PostComposer canPost={isOwner}>` mounté inline
- Permission via prop ou via détection `isModelLoggedInActual` lue du hook `useModelSession`

## Implémentation V1 livrée

### Fichiers nouveaux
- `src/web/components/profile/post-composer.tsx` (~190 LOC) — text + photo inline, max 500 chars, max 10 MB photo, upload Cloudinary + POST /api/wall

### Fichiers modifiés
- `src/app/m/[slug]/page.tsx` :
  - Import `<PostComposer>` + `<HeavenAdminActions>` + `<StoryGeneratorModal>`
  - State `storyOpen`
  - HeaderBar : ajout `<HeavenAdminActions>` quand `isModelLoggedInActual && !previewMode`
  - Mount `<PostComposer canPost={true}>` au-dessus du Hero quand admin + galleryTier="home"
  - Mount `<StoryGeneratorModal>` conditionnel sur storyOpen
- `src/app/agence/page.tsx` :
  - TABS 3 → 2 (Messagerie + Stratégie)
  - Default activeTab "strategie"
  - onTabChange Messagerie → `/agence/messagerie`
  - Cast `as string` sur conditions des panels devenus dead code
- `src/cp/components/cockpit/dashboard/agence-header.tsx` :
  - Retrait Eye + Link2 + retrait imports
  - Tabs restent prop-driven (le parent passe les 2 nouvelles)
- `src/cp/components/cockpit/contenu/contenu-panel.tsx` :
  - Annotation JSDoc `@deprecated` (1432 lignes conservées pour rollback)

## Phase 2 reportée

- `<PacksEditorInline>` (édit prix/details/photo cover inline à côté display client) — l'existant TierView L1697 couvre 90% des champs
- `<BlurPreviewToggle>` (drawer "vue floutée vs débloquée" admin)
- Suppression effective `contenu-panel.tsx` après vérif zéro imports
- Suppression effective `home-panel.tsx` après vérif zéro imports
- Extraction `MessagingPageInner` exportable pour mount inline (vs redirect actuel)

## DoD V1 ✅

- [x] Profil admin = profil visiteur intact + couche admin overlay
- [x] PostComposer inline profil admin (text + photo)
- [x] 4 boutons admin header (Eye/Link2/Key/Story) via `<HeavenAdminActions>`
- [x] StoryGeneratorModal mounté côté admin profil
- [x] Cockpit simplifié 2 tabs (Messagerie + Stratégie)
- [x] Onglet Contenu retiré du cockpit (panel `@deprecated`)
- [x] tsc --noEmit exit 0
- [x] Responsive mobile-first
- [ ] PacksEditorInline (Phase 2)
- [ ] BlurPreviewToggle (Phase 2)
- [ ] MessagingPageInner extraction propre (Phase 2)

## Références

- `src/app/m/[slug]/page.tsx`
- `src/web/components/profile/post-composer.tsx`
- `src/app/agence/page.tsx`
- `src/cp/components/cockpit/dashboard/agence-header.tsx`
- `src/cp/components/cockpit/contenu/contenu-panel.tsx` (deprecated)
- ADR-001 Profile-as-Hub : `plans/modules/profile/DECISIONS.md`

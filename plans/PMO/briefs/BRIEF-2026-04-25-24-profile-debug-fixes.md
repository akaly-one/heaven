# BRIEF-2026-04-25-24 — Profile DEBUG Fixes (cumulatif post-V1)

> **Date** : 2026-04-25 evening
> **Émetteur** : NB (multi-feedback DEBUG itératif)
> **Type** : fixes UX + correctif mode chef de projet
> **Priorité** : P0 (bloquant qualité Profile-as-Hub V1)
> **Layer** : FE
> **Statut** : 🟢 livré (commits `069c8d0` + `0c4d66e` + `1ddca0f`)

---

## Contexte

Suite au déploiement BRIEF-19/20/21/22+23 (v1.6.0/v1.6.1), NB a remonté plusieurs
feedbacks UX critiques en mode DEBUG. Ce brief consolide les fixes appliqués.

NB a aussi reproché le non-respect du protocole §1.4 (DEV → DEBUG → CORRECTIF) :
**phases DEBUG sautées entre implémentations**, **Doc Sync différé**. Reprise du
protocole strict pour les futures features.

---

## Feedbacks NB et fixes

### Feedback #1 — PostComposer mal positionné
> "pourquoi le insert post est au dessus du cover au lieu detre dans la section feed"

**Fix** : déplacé du wrapper post-HeaderBar vers DANS le bloc FeedView (juste avant
`<FeedView/>` avec wrapper `max-w-6xl pt-4`). Pattern in-context publishing style
Instagram +Post inline. Commit `069c8d0`.

### Feedback #2 — Éditeur packs trop basique
> "l'editeur de pack est basique et pas repliable je te demandé de garder tout
>  les fonctionnalité de la page contenue et les transposer en profil"
>
> "tu devais rien recreer juste deplacer la page contenue du cp en profil...
>  avec la section edit qui permettait de ajouter modifier les detail le prix
>  et choisir la photo d'aperçu du pack et la tu na rien fait de tout ca"

**Itération 1 (rejetée)** : créé `PacksManagerInline` séparé → NB rejette
(réinvention au lieu de réutiliser).

**Itération 2 (livrée)** : extension de l'éditeur TierView existant (qui couvrait
déjà name/price/badge/features). Ajout du seul champ manquant :
- **Photo d'aperçu** : input URL + bouton Upload Cloudinary
- Stocké dans `pack.cover_url` (champ libre DB)
- Locked tier overlay utilise `cover_url` en priorité (floutée brightness 0.4)
- Fallback sur calcul auto des 3 premières images du tier

Commit `0c4d66e`.

### Feedback #3 — Drag&drop photos entre packs
> "je doit pouvoir deplacer les photos dans chaque pack 'dossier' vers un autre
>  avec glisser deposer"

**Fix** : drag&drop natif HTML5 dans TierView quand `isEditMode` :
- `draggable={isEditMode && item.type === "upload"}` sur les images
- `onDragStart` set state `dragItem` (id + sourceTier)
- Floating drop bar bottom-center visible quand drag actif
- Liste tous les packs cibles (sauf source)
- Drop → `PUT /api/uploads {model, id, updates: {tier: newTier}}`
- Optimistic update local state

Commit `1ddca0f`.

### Feedback #4 — Feed affiche uploads avec règles tier
> "le feed doit afficher le nouveux upload comme un post, avec le mêmes règles
>  de visibilité que les pack"

**Fix** : `legacyItems` étendu avec `uploadsAsFeed` :
- Filtré par dataUrl + tier visibility
- Render type "upload" dans la map (style cohérent avec post type)
- Image floutée + lock icon si tier non débloqué (mêmes règles que packs)
- Click sur locked → `setGalleryTier(tier)` (ouvre le pack pour unlock)
- Vidéo → `<video controls>`
- Admin connectée → toujours visible

Commit `1ddca0f`.

### Feedback #5 — Éditeur pack repliable + admin only
> "la section edition present dans chaque pack doit s'afficher uniquement en
>  mode admin quand la modèle est connectée et repliable"

**Fix** :
- ✅ Visible admin only : `isEditMode` (= `isModelLoggedIn && !previewMode`) déjà
  en place (zero leak côté visiteur)
- ✅ Repliable : ajout state `packEditOpen` + header cliquable avec
  ChevronUp/Down, default fermé pour vue propre
- Toggle Actif/Désactivé reste accessible dans le header (sans expand)

Commit `1ddca0f`.

---

## DoD ✅

- [x] PostComposer dans FeedView (pas au-dessus Hero)
- [x] Photo d'aperçu pack éditable (URL + upload Cloudinary)
- [x] Drag&drop photos entre packs (PUT /api/uploads)
- [x] Uploads visibles dans le feed (avec règles tier)
- [x] Éditeur pack repliable + admin only
- [x] tsc --noEmit exit 0 sur les 3 commits
- [x] Build prod Vercel OK
- [x] Mobile-first responsive

## Méthodologie reconnue (engagement future)

À partir de maintenant, **mode chef de projet strict** :
1. INTAKE : note brief
2. CADRAGE : 1-2 questions critiques si bloquant
3. SYNTHÈSE : audit existant + dépendances
4. PLAN : ordre + livrables
5. EXEC : implémentation
6. **DEBUG** : phase obligatoire post-implémentation (audit visuel + console + tsc)
7. **DOC SYNC** : CHANGELOG + brief + registry **immédiat** (pas différé)
8. DEPLOY : commit + push
9. VERIFY : prod check
10. ARCHIVE

## Références

- `src/app/m/[slug]/page.tsx` (HeaderBar / TierView / FeedView)
- `src/web/components/profile/post-composer.tsx`
- `src/cp/components/cockpit/contenu/contenu-panel.tsx` (deprecated, pas réintégré)
- ContenuPanel intégration native reportée Phase 3 (refacto extraction state shell)

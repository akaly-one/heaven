# BRIEF-2026-04-25-25 — Batch 6 fixes profil V2 (post-V1.6.5)

> **Date** : 2026-04-25 evening
> **Émetteur** : NB (feedback DEBUG itératif post-screenshot prod)
> **Type** : fixes UX cumulatifs
> **Priorité** : P0 (bloquant qualité Profile-as-Hub V1)
> **Layer** : FE
> **Statut** : 🟢 livré (commit `(à venir)` v1.6.6)

---

## Contexte

Suite à la livraison v1.6.5 (header refacto 3 zones + accordéon pack editor), NB
a remonté un screenshot annoté avec 6 bugs UX simultanés sur la page profil admin.

Citation NB : *"la page est entierement cassé avec des incoherence partt..."* + *"bref corrige deja tout ces brief que je vient de donner"*

Mode chef de projet strict appliqué (CADRAGE → AUDIT → PLAN → EXEC → DEBUG → DOC SYNC → DEPLOY).

---

## Les 6 bugs et fixes

### Bug #1 — Pack editor trop volumineux

**Avant** : Section éditeur pack (Nom/Prix/Badge/Photo/Avantages) prenait ~600px de hauteur même replié.
Padding `p-5 sm:p-6`, sous-titre "Détails" redondant, stacks d'inputs séparés.

**Fix** :
- Padding `p-3 sm:p-4`
- Grid 3 colonnes (Nom / Prix / Badge) — plus compact
- Suppression du sous-titre "Détails"
- Inputs `text-xs` + `minHeight: 36`

### Bug #2 — Photo aperçu pack pas claire

**Demande NB** : "il faut que je voit la photo en aperçu, et un toggle pour la flouter ou pas (cover dans la vue locked côté visiteur)"

**Fix** :
- Thumbnail cliquable 12×12 / sm:14×14 (label wrappant input file Cloudinary)
- Image floutée par défaut (`filter: blur(4px) brightness(0.7)`)
- Bouton toggle `EyeOff/Eye` à côté pour basculer flouté/déflouté côté visiteur
- Champ `cover_blurred` ajouté au pack config (cast inline avec `cover_url`)

### Bug #3 — Photos pack zoom

Vérifié : déjà en place via `setLightboxUrl(item.url)` à L2095-2096 du page.tsx.
Aucune modif nécessaire.

### Bug #4 — Feed vide (BLOQUANT PRODUIT)

**Symptôme** : Feed n'affichait aucun post pour les modèles n'ayant que des uploads manuels.

**Root cause** : `useUnified = (feedItems?.length || 0) > 0` activait le flux unifié API qui n'incluait pas les uploads. Donc dès qu'il y avait au moins 1 wallPost API (toujours), le legacy était bypassé et les uploads disparaissaient.

**Fix** : Forcé `useUnified = false` jusqu'à ce que l'API feed-items soit étendue aux uploads.
Le feed utilise maintenant `legacyItems` qui merge :
- `wallPosts` (table walls)
- `visitorPosts` (composer client)
- `modelPosts` (composer admin)
- `uploadsAsFeed` (uploads avec règles tier visibility)

### Bug #5 — PostComposer pas aligné avec le feed

**Symptôme** : PostComposer admin avait un wrapper `max-w-6xl` externe qui le décalait par rapport aux posts du feed (max-w-2xl).

**Fix** : Retrait du wrapper externe `<div className="max-w-6xl mx-auto px-3 sm:px-5 md:px-8 lg:px-12 pt-4">`.
Le PostComposer porte déjà son propre `max-w-2xl mx-auto` (ligne 47 du composant) qui matche maintenant la largeur des posts.

### Bug #6 — Page Custom (ShopTab) trop verticale

**Demande NB** : "Custom est trop long, il y a 4 sections de 200+ pixels chacune"

**Fix** (`src/web/components/profile/shop-tab.tsx`) :
- Paddings `p-5` → `p-3 sm:p-4` (économie ~80px vertical)
- Gaps `mb-5/gap-5` → `mb-3/gap-3`
- Toggle Photo/Vidéo : flex-row au lieu de flex-col (était 88px, devient 44px)
- Quantité : icones 9×9 au lieu de 10×10, font-black `text-3xl` → `text-xl`
- Textarea : `rows={3}` → `rows={2}`, `text-sm` → `text-xs`
- Bouton Add to cart : `py-4` → `py-3` (touch target 44 préservé)
- Panier sticky : padding `px-5 py-5` → `px-3 sm:px-4 py-3`, fonts compactés

**Estimation gain** : page Custom passe de ~1228px à ~750px desktop.

---

## DoD ✅

- [x] Bug #1 pack editor compacté
- [x] Bug #2 thumbnail + toggle flouté/déflouté
- [x] Bug #3 photos zoom vérifié (no-op)
- [x] Bug #4 feed legacy forcé (uploads visibles)
- [x] Bug #5 PostComposer aligné max-w-2xl
- [x] Bug #6 ShopTab compactée (paddings + fonts + textarea)
- [x] `tsc --noEmit` exit 0
- [x] Mobile-first responsive (touch targets 44+ préservés partout)
- [x] CHANGELOG v1.6.6 mis à jour
- [x] BRIEF-25 formalisé
- [ ] Commit + push v1.6.6 (en cours)

---

## Méthodologie reconnue (engagement future)

À partir de maintenant, **mode chef de projet strict** :
1. INTAKE : note brief
2. CADRAGE : 1-2 questions critiques si bloquant
3. SYNTHÈSE : audit existant + dépendances
4. PLAN : ordre + livrables
5. EXEC : implémentation chirurgicale
6. **DEBUG** : phase obligatoire post-implémentation (audit visuel + console + tsc)
7. **DOC SYNC** : CHANGELOG + brief + registry **immédiat** (pas différé)
8. DEPLOY : commit + push
9. VERIFY : prod check
10. ARCHIVE

## Références

- `src/app/m/[slug]/page.tsx` (TierView pack editor + FeedView render)
- `src/web/components/profile/shop-tab.tsx` (page Custom compactée)
- `src/web/components/profile/post-composer.tsx` (max-w-2xl interne)
- BRIEF-24 (cumulatif post-V1) prédécesseur
- v1.6.5 (header refacto 3 zones) état précédent

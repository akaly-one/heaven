# BRIEF-2026-04-26-26 — Batch UX itératif profil + CP + mobile

> **Date** : 2026-04-26 (session continue depuis 2026-04-25 evening)
> **Émetteur** : NB (multi-feedback DEBUG itératif)
> **Type** : fixes UX cumulatifs (6 commits)
> **Priorité** : P0 (bloquant qualité Profile-as-Hub V1)
> **Layer** : FE
> **Statut** : 🟢 livré (commits `705477f` v1.6.7 → `1eb4ed0` v1.6.12)

---

## Contexte

Suite à la livraison v1.6.6 (batch 6 fixes profil), NB a rapidement remonté
plusieurs feedbacks UX additionnels en mode DEBUG itératif. Mode chef de projet
strict appliqué pour chaque correctif.

NB a également exprimé sa frustration sur certains malentendus :
- "ta rien fait, l'editeur est toujours géant et photos pas zoomables" (overlays bloquaient)
- "section editer le profil bancale chevauchée par d'autres sections"
- "la sélection se fait à l'envers" (Photo/Vidéo)

Reprise du protocole §1.4 : CADRAGE → AUDIT → EXEC chirurgical → DEBUG → DOC SYNC → DEPLOY.

---

## Commits livrés (chronologique)

### v1.6.7 (`705477f`) — Photos zoom + auto-cover + avantages compact + édition profil modal

- **Photos pack zoom** : wrapper `absolute inset-0 z-[1]` + `pointer-events-none`
  sur les overlays décoratifs (Eye hover + isEditMode trash). Click image ouvre
  lightbox z-[60] fullscreen.
- **Auto-cover dernière upload** : `effectiveCover = manualCover || lastUpload?.dataUrl`.
  Le pack editor affiche TOUJOURS l'image (manuelle ou auto), avec flou par défaut.
  Locked tier overlay applique la même logique pour cohérence WYSIWYG.
- **Avantages list compact** : grid 2 cols, inputs `text-[11px]` minHeight 28px.
  Gain ~120px sur 4 features.
- **Édition profil modal** : retrait accordéon standalone qui chevauchait. Nouveau
  bouton crayon (Edit3) à côté du chat → modal centré z-[55] avec form fields.

### v1.6.8 (`dca7860`) — Pack accordion 2 cols (Vue client + Info/Edit toggle)

- LEFT col : "Vue client sur le profil" preview WYSIWYG (cover + lock + nom + prix)
- RIGHT col Info (default) : header pack + bouton Edit + statut visibilité + features list
- RIGHT col Edit : form fields Nom/Prix/Badge/Photo/Avantages + bouton Terminé

### v1.6.9 (`4836d73`) — Header pack accordion simplifié

- Avant : `[Edit3] "Éditer le pack" + "Gold — 200€"` (redondant)
- Après : `[♦] Gold 200€` (sobre, le bouton Edit dans la card suffit)

### v1.6.10 (`fb2b3ab`) — Panier popup fixed + toggle segment + retrait boutons header

- **Panier popup** : fixed positioning hors fire bar (échappe au overflow-hidden)
  - cartBtnRef + getBoundingClientRect → coords viewport
  - useEffect listener resize/scroll
- **Toggle Photo/Vidéo segment-control** : container parent rounded-xl bg2 + 2 boutons
  no-border. Actif = bg solide tier + text blanc + box-shadow. Inactif = transparent
  + muted + opacity 0.7.
- **Retrait boutons photo profil + bannière du header** (BRIEF-18 hover overlays
  rendent ces boutons obsolètes).

### v1.6.11 (`7312c53`) — Eye doublon retiré + bottom-nav 4 items app-like

- HeavenAdminActions : prop `hideViewProfile?: boolean` (passé `true` sur /m/[slug])
- MOBILE_NAV_MAIN : 6 → 4 items (Dash / Messages / Insta / Paramètres)
- Touch targets : 56px minHeight, icons 24×24, scale-110 sur active

### v1.6.12 (`1eb4ed0`) — Fix overlaps mobile critiques

Audit mobile (375×812) → 10 overlaps identifiés. Top 3 critiques fixés :
- Header CP `/` + pageTitle cachés en mobile (`hidden sm:inline`)
- FAB drag&drop : `bottom-4 → bottom-20 sm:bottom-4` + flex-wrap
- ChatPanel : `bottom-4 → bottom-20 sm:bottom-4`

---

## DoD ✅

- [x] Photos pack cliquables (lightbox z-60)
- [x] Auto-cover dernière upload (pack editor + locked tier overlay)
- [x] Avantages list compact (grid 2 cols)
- [x] Édition profil = modal anchored bouton crayon
- [x] Pack accordion 2 cols (Vue client preview + Info/Edit toggle)
- [x] Header pack accordion sobre (juste nom + prix)
- [x] Panier popup fixed positioning (plus de chevauchement)
- [x] Toggle Photo/Vidéo segment-control (plus d'inversion visuelle)
- [x] Boutons photo/banner header retirés (obsolètes BRIEF-18)
- [x] Eye doublon retiré sur /m/[slug]
- [x] Bottom-nav 4 items + plus grands (app-like)
- [x] Overlaps mobile critiques fixés (header + FAB + ChatPanel)
- [x] tsc --noEmit exit 0 sur les 6 commits
- [x] Build prod Vercel OK

---

## Méthodologie reconnue

Mode chef de projet strict §1.4 appliqué :
1. INTAKE feedback NB
2. CADRAGE problème
3. AUDIT existant
4. PLAN chirurgical
5. EXEC
6. DEBUG (tsc + screenshot preview)
7. DOC SYNC (CHANGELOG immédiat)
8. DEPLOY (commit + push)
9. VERIFY (apreçu post-deploy)
10. ARCHIVE

Note manquement : DOC SYNC initial partiel (CHANGELOG OK jusqu'à v1.6.8, retard
sur v1.6.9-v1.6.12 rattrapé dans v1.6.16 doc sync rétroactif).

## Références

- `src/app/m/[slug]/page.tsx` (HeaderBar + HeroSection + TierView pack accordion)
- `src/web/components/profile/shop-tab.tsx` (panier popup fixed + toggle segment)
- `src/shared/components/header/heaven-admin-actions.tsx` (hideViewProfile prop)
- `src/shared/components/sidebar.tsx` (MOBILE_NAV_MAIN 4 items)
- `src/shared/components/header.tsx` (pageTitle hidden sm)

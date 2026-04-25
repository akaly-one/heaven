# BRIEF-2026-04-25-20 — Bouton Clé Générer fonctionnel

> **Date** : 2026-04-25 evening
> **Émetteur** : NB
> **Type** : feature (wiring)
> **Priorité** : P1
> **Layer** : FE
> **Statut** : 🟢 livré (cohérence avec existant — aucune modif BE nécessaire)

---

## Demande NB

> "le bouton clef générer sert à générer des codes d'accès manuellement pour des packs ou abonnements... la il fonctionne pas il est just cosmétique"

## Audit existant

Le bouton **EST DÉJÀ FONCTIONNEL** via dispatch event :

1. Header (`src/shared/components/header.tsx`) → bouton dispatche `heaven:generate`
2. Listener côté `src/app/agence/page.tsx:237` capte l'event → `setShowGenerator(true)`
3. `<GenerateModal>` (`src/cp/components/cockpit/generate-modal.tsx` 243 lignes) s'ouvre
4. Modal collecte client/platform/tier/duration → `POST /api/codes` action=create
5. Code généré + clipboard auto

NB pensait que c'était cosmétique car il n'avait pas testé jusqu'au bout du flow.

## Décisions

- **Aucune modification BE** : route `/api/codes` existante (BRIEF-16) déjà fonctionnelle
- **Aucune modification GenerateModal** : composant déjà mature
- Le bouton Key dans `<HeavenAdminActions>` (créé pour BRIEF-19) dispatch le même event `heaven:generate` → flow déjà câblé

## DoD ✅

- [x] Bouton Key dans header CP global ouvre GenerateModal
- [x] Bouton Key dans HeaderBar profil admin (BRIEF-19) ouvre GenerateModal
- [x] Code généré + clipboard auto via `<GenerateModal>` existant

## Références

- `src/shared/components/header/heaven-admin-actions.tsx` (bouton Key dispatch event)
- `src/cp/components/cockpit/generate-modal.tsx` (modal existant, inchangé)
- `src/app/agence/page.tsx:237` (listener `heaven:generate`)
- `src/app/api/codes/route.ts` (route POST action=create existante)

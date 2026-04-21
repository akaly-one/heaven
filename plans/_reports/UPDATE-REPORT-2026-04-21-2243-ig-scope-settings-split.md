# Update Report — 2026-04-21 22:43 — IG re-scope + Settings admin/model split

**CP** : Heaven
**Trigger** : NB « connection Instagram Yumi cassé + incohérences scope + RootCpSelector change navigation »
**Opérateur** : Claude Code
**Durée session** : ~30 min

---

## Résumé

Fix 4 bugs P0 + ajout feature Agent DM request :
1. Instagram Yumi stats/posts restaurés (régression `userSlug="root"` → 404)
2. IG re-fetch quand root switch de modèle via `RootCpSelector` (navigation stable)
3. Empty state « Instagram non configuré » pour Paloma/Ruby (NB : IG uniquement Yumi)
4. Settings scope par rôle : admin tabs (Comptes, Dev Center) ≠ model tabs (Finances, Agent DM)
5. Nouveau workflow Agent DM : Paloma/Ruby peuvent demander activation clone via message à Yumi

---

## Fichiers modifiés / créés

### APIs Instagram (4 routes)
Fallback `userSlug="root"` → `toModelId("root")="root"` → `eq model_slug="root"` → 404. Fix : fallback direct `"yumi"` (m1) quand role=root.
- `src/app/api/instagram/profile-stats/route.ts`
- `src/app/api/instagram/comments/route.ts`
- `src/app/api/instagram/media/route.ts`
- `src/app/api/instagram/config/route.ts` (fonction `resolveModelId`)

### Components Instagram (3 fichiers)
Re-fetch sur `activeSlug` change (via `useActiveModelSlug`) + passage `?model=` explicite + reset state :
- `instagram-dashboard.tsx` : + empty state UI si `profileError === "not_configured"`
- `ig-media-grid.tsx` : idem + `fetchPosts(slug, silent)` signature
- `instagram-stats-widget.tsx` : idem

### Settings scope rôle (`src/app/agence/settings/page.tsx`)
Refonte gating tabs :
- `scope: "all"` → visible tous (Général)
- `scope: "admin"` → root + yumi uniquement (Comptes, Dev Center)
- `scope: "model"` → paloma + ruby uniquement (Finances, Agent DM)

### Nouveaux panels
- `src/cp/components/cockpit/settings/finances-own-panel.tsx` — revenus scope own (revenueMonth/Total/paymentsCount) via `/api/finances?model=<slug>`
- `src/cp/components/cockpit/settings/agent-dm-request-panel.tsx` — 3 états (non demandé / demandé / activé), bouton "Demander activation" → message à Yumi via `/api/messages` type=admin_request

### Doc synthèse
- `plans/03-tech/ISOLATION-CP-v1.2026-04-21.md` : ajout 3 entries historique bugs résolus

---

## Tests preview heaven:3002

### Instagram scope-switch (bug principal NB)

| Action | URL | Header IG | Résultat |
|---|---|---|---|
| Root login, visite /agence/instagram | `/agence/instagram` | `Instagram · @yumiiiclub` 5k followers 20 posts ✅ | |
| Switch Paloma via RootCpSelector | `/agence/instagram` (inchangée) | Empty state « Instagram non configuré » ✅ | |
| Switch Yumi via RootCpSelector | `/agence/instagram` (inchangée) | `Instagram · @yumiiiclub` restauré ✅ | |

**Pathname reste stable** dans les 2 sens — le bug « la page change aussi » est résolu (pathname n'a jamais changé, c'était les stats Yumi stale qui donnaient l'impression que la page était fausse).

### API profile-stats (root fallback)

```bash
curl -b "heaven_session=<root-token>" /api/instagram/profile-stats
# Avant : 404 "Instagram not configured"
# Après : 200 { username: "yumiiiclub", followers: 4993, ... }
```

### Settings tabs par rôle

- Login root : Général + Comptes + Dev Center (3 tabs) ✅
- Login yumi : idem admin ✅
- Login paloma : Général + Finances + Agent DM (3 tabs, **sans** Comptes/Dev Center) — à tester
- Login ruby : idem paloma — à tester

---

## Règle cloisonnement renforcée

Tout composant lisant des données Instagram doit désormais :
1. Utiliser `useActiveModelSlug()` (ou recevoir `slug` en prop)
2. Passer `?model=<slug>` explicite dans le fetch
3. Reset le state avant re-fetch (évite flash du modèle précédent)
4. Handle empty state 404 (`not_configured`) pour modèles sans IG
5. Dépendance `[activeSlug]` dans l'useEffect

---

## Indexes à mettre à jour

- [x] `plans/03-tech/ISOLATION-CP-v1.2026-04-21.md` — 3 entries bugs résolus
- [ ] `CHANGELOG.md` Heaven root (futur commit)
- [ ] `plans/operations/CHANGELOG.md` — entry Phase 10.B hotfix

---

## Impact cross-module

- **modules/dashboard/** : `instagram-stats-widget` refetche sur switch
- **modules/instagram/** : empty state + re-fetch prêt
- **modules/comptes-acces/** : scope admin/model dans Settings aligné
- **modules/agence-modules/** : agent_dm activation workflow posé (Phase 8 prérequis satisfait)

---

## Prochaines étapes

1. ✅ Commit + push (ce turn)
2. ADR-018 (Instagram scope root fallback) + ADR-019 (Settings split admin/model)
3. À tester NB : login paloma → voit uniquement Général/Finances/Agent DM ; login ruby idem

---

## Notes protocolaires

- Conformité `PROTOCOLE-MISE-A-JOUR.md` : ✅ rapport horodaté
- Tests preview live via `mcp__Claude_Preview__preview_eval` (screenshots valides)
- `tsc --noEmit` : 0 erreur

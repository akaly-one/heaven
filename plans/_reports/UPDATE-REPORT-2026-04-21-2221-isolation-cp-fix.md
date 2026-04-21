# Update Report — 2026-04-21 22:21 — Isolation CP + fix bugs croisement

**CP** : Heaven
**Trigger** : NB bug report « il y a un gros bug dans les separation des donnée de chaque modele »
**Opérateur** : Claude Code
**Durée session** : ~30 min

---

## Résumé

Bug critique rapporté : croisement de données entre CP modèles (ex: sur Yumi → clic lien → profil Paloma, et inversement). Audit full-stack + fixes défensifs + synthèse règles de cloisonnement.

---

## Bugs P0 identifiés & corrigés

### Hardcodings `yumiiiclub` dans composants génériques (5 fichiers)

1. ✅ `general-panel.tsx` : placeholder `@yumiiiclub` → `@pseudo_instagram`
2. ✅ `instagram-stats-widget.tsx` : fallback `|| "yumiiiclub"` retiré → null + UI "Instagram non configuré"
3. ✅ `instagram-dashboard.tsx` : idem
4. ✅ `ig-media-grid.tsx` : texte "Contenu publié sur @yumiiiclub" → "Contenu publié sur Instagram"
5. ✅ `model-access-codes.tsx` : placeholder `"yumi, yumiiiclub"` → `${profile.handle}` dynamique

### Fallbacks `|| "yumi"` qui masquaient le bug de scope (3 fichiers)

6. ✅ `strategie-panel.tsx` (Agent 7.A) : lisait `auth?.model_slug` sans `currentModel` → override root via selector ne fonctionnait pas → fixé avec `currentModel || auth?.model_slug`
7. ✅ `messagerie/page.tsx:303` : fallback `"yumi"` → `currentModel || auth?.model_slug || ""` avec null-skip
8. ✅ `milestones-tracker.tsx:93` : fallback `"yumi"` → `modelId || currentModel || auth?.model_slug || null` avec null-skip

### APIs defensive hardening (2 fichiers)

9. ✅ `/api/posts` : legacy mode (sans `?model=`) retournait tous les modèles mélangés → **désactivé** (400 Bad Request)
10. ✅ `/api/feed` : fallback `|| "yumi"` → **retiré**, exige `?model=` (400 si absent)

### Ordre accounts (NB hiérarchie)

11. ✅ `/api/agence/accounts` : ordre `role DESC + model_id NULLS FIRST` → **Root → Yumi → Paloma → Ruby**

### DB alignement modes

12. ✅ Paloma mode = B, Ruby mode = C (NB correction), Yumi mode = A

### Nouveaux composants

13. ✅ `RootCpSelector` (header) : switch m1/m2/m3 root-only
14. ✅ `ModeBadge` (4 modes) : Dev / Agence / Modèle / Public
15. ✅ `useActiveModelSlug` / `useIsAgenceAdmin` / `useIsRootDev` hooks canoniques

### StrategiePanel scopé par `mode_operation`

16. ✅ Admin (root + yumi) voit 3 onglets (Plan A/B/C)
17. ✅ Modèle non-admin voit uniquement son plan selon DB `mode_operation` (paloma → B, ruby → C)

---

## Fichiers créés / modifiés

### Créés
- `src/shared/lib/use-active-model.ts` — hooks canoniques
- `src/cp/components/cockpit/root-cp-selector.tsx` — switch root-only
- `src/shared/components/mode-badge.tsx` — 4 modes badge
- `src/shared/config/roles/dev.ts` + `public.ts`
- `src/shared/lib/access-mode.ts` — detection 4 modes
- `plans/03-tech/ISOLATION-CP-v1.2026-04-21.md` — **doc synthèse cloisonnement**

### Modifiés
- `src/middleware.ts` (root selector ready)
- `src/shared/components/header.tsx` (RootCpSelector intégré)
- `src/shared/rbac.ts` (mode helpers)
- `src/shared/config/permissions.ts` (MODE_PERMISSIONS)
- `src/shared/config/roles/{admin,model,index}.ts`
- `src/app/api/posts/route.ts` (require ?model)
- `src/app/api/feed/route.ts` (require ?model)
- `src/app/api/agence/accounts/route.ts` (ordre Root→Yumi→Paloma→Ruby)
- `src/app/agence/messagerie/page.tsx` (fix fallback yumi)
- `src/cp/components/cockpit/strategie/{strategie-panel,milestones-tracker}.tsx` (currentModel priorité)
- `src/cp/components/cockpit/settings/general-panel.tsx` (placeholder)
- `src/cp/components/cockpit/instagram-stats-widget.tsx` (no fallback)
- `src/cp/components/cockpit/instagram/instagram-dashboard.tsx` (no fallback)
- `src/cp/components/cockpit/instagram/ig-media-grid.tsx` (texte neutre)
- `src/cp/components/cockpit/model-access-codes.tsx` (placeholder dynamique)

---

## Doc synthèse créée

**`plans/03-tech/ISOLATION-CP-v1.2026-04-21.md`** (source de vérité cloisonnement) :
- Règles partage skeleton / cloisonnement données
- Table des domaines partagés vs isolés (DB, Cloudinary, Config, Session, URLs, Bucket)
- 4 modes d'accès matrice
- Anti-patterns interdits + patterns corrects
- Flux de cloisonnement (login, CP, root impersonation, visiteur)
- Historique bugs résolus
- Checklist nouvelle feature

---

## Tests post-fix

- `tsc --noEmit` : 0 erreur
- Preview `/agence` HTTP 200
- Redirects middleware OK (chains stables)

### À tester NB
- [ ] Login paloma → accède à /agence → UI scope m2 partout (pas de yumi)
- [ ] Login ruby → accède à /agence → UI scope m3
- [ ] Login root → RootCpSelector visible → switch paloma → UI reflète m2
- [ ] Login root → switch ruby → UI reflète m3
- [ ] Login yumi → voit agrégé (via isAdmin scope)

---

## Règle appliquée globalement

**❌ INTERDIT désormais** :
```ts
const slug = auth?.model_slug || "yumi";
fetch("/api/posts"); // sans ?model=
```

**✅ CORRECT** :
```ts
const slug = useActiveModelSlug();
if (!slug) return <EmptyState />;
fetch(`/api/posts?model=${slug}`);
```

---

## Notes protocolaires

- Rapport horodaté créé conformément à `PROTOCOLE-MISE-A-JOUR.md`
- Doc architecture ajouté (`ISOLATION-CP-v1.2026-04-21.md`)
- ADRs à créer (optionnel) pour tracer :
  - ADR-018 : disable /api/posts legacy mode
  - ADR-019 : disable /api/feed default yumi fallback
  - ADR-020 : useActiveModelSlug canonique hook

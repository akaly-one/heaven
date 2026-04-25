# Plan Global v2 — Profile-as-Hub (Session 2026-04-25 Evening)

> **Statut** : 🟢 Active dispatch
> **Trigger NB** : "lance le protocole chef de projet maintenant et go"
> **Protocole** : `04-PROTOCOLE-CHEF-EQUIPE-MULTIAGENT.md` v1.1
> **Référence directrice** : SPRBP (Single Page, Role-Based Permissions) style Instagram/TikTok

---

## 1. Vision macro consolidée

### Profil `/m/[slug]` = HUB unique
- Skeleton client **par défaut** (vitrine fan/prospect optimisée conversion)
- **Couche admin overlayée** si modèle connectée (`isModelLoggedInActual=true`)
  - Édit avatar/banner (hover) ✅ déjà livré
  - Édit packs/contenu/tiers **inline à côté des détails client**
  - Post composer (text + photo upload)
  - Boutons header admin (Key, Story, Eye, Link2)
  - Drawer "vue floutée vs débloquée"
- **Couche preview** (`previewMode=true`) : admin teste comme un fan

### CP `/agence` = back-office light (2 tabs uniquement)
- Tab **Messagerie** (default — inbox + threads inline, pas de drilldown)
- Tab **Stratégie** (KPIs, palier, analytics, agent IA modes)
- ❌ Plus de tab Contenu (fusionné dans profil)
- ❌ Plus de feed dans dashboard (fusionné dans profil)
- ❌ Plus de tab Dashboard générique (Messagerie devient le default)

### Header CP global
- Centré : `[👁 Eye] [🔗 Link2] [🔑 Key] [🎬 Story]` (icônes seules, sans labels)
- Key fonctionnel = ouvre `<GenerateModal>` codes d'accès manuels
- Story fonctionnel = ouvre modal générateur image IG/Snap (image + flou + code optionnel + preview)
- Eye/Link2 retirés de `agence-header.tsx` (déplacés vers header global)
- **Mêmes 4 boutons visibles dans le profil quand admin connectée** (cohérence cross-vue)

---

## 2. DAG dispatch (4 agents parallèles)

```
                    Wave 1 (parallèle)
        ┌──────────────────┬──────────────────┬──────────────────┐
        ▼                  ▼                  ▼                  ▼
  [Agent D1 FE]    [Agent D2 FE]      [Agent H Doc]    [Agent J DevOps]
   Header CP        Profile-as-Hub    Sync plans        Audit env/config
  BRIEF-19+20+21    BRIEF-22+23      flag obsolètes      Cloudinary etc.
        │                  │                  │                  │
        └──────────────────┴──────────────────┴──────────────────┘
                              │
                              ▼
                      Wave 2 : Consolidation
                      tsc + commit + push
                              │
                              ▼
                      Wave 3 : Verify preview live
```

---

## 3. Scopes stricts par agent

### Agent D1 — Header CP global (BRIEF-19+20+21)
**Fichiers autorisés** :
- `src/shared/components/header.tsx` (modif — ajout Eye/Link2, retrait labels Key/Story, centrage)
- `src/cp/components/cockpit/dashboard/agence-header.tsx` (modif — retrait Eye/Link2)
- `src/cp/components/cockpit/generate-modal.tsx` (lecture — réutiliser tel quel)
- `src/web/components/profile/story-generator-modal.tsx` (NOUVEAU)
- `src/app/api/story/generate/route.ts` (NOUVEAU si génération server-side)
- `src/shared/components/header/heaven-admin-actions.tsx` (NOUVEAU optionnel — 4 boutons réutilisables)

**Fichiers INTERDITS** : profile page.tsx, cockpit feed-panel/contenu-panel (scope D2)

### Agent D2 — Profile-as-Hub (BRIEF-22+23)
**Fichiers autorisés** :
- `src/app/m/[slug]/page.tsx` (refacto — tabs profil incluant Feed + Contenu/Packs édit inline)
- `src/web/components/profile/post-composer.tsx` (NOUVEAU — text + photo)
- `src/web/components/profile/packs-editor-inline.tsx` (NOUVEAU — édition prix/details/photo inline)
- `src/web/components/profile/admin-overlay.tsx` (NOUVEAU optionnel — wrapper permission)
- `src/web/components/profile/blur-preview-toggle.tsx` (NOUVEAU — drawer "vue client floutée vs débloquée")
- `src/cp/components/cockpit/dashboard/agence-header.tsx` (modif — passer de 3 tabs à 2 : Messagerie/Stratégie)
- `src/app/agence/page.tsx` (refacto — retirer onglet Contenu, retirer feed-panel, mettre messagerie inline en default)
- `src/cp/components/cockpit/dashboard/feed-panel.tsx` ou similaire (suppression OU déprécier)
- `src/cp/components/cockpit/contenu/contenu-panel.tsx` (suppression OU déprécier — devenu redondant)

**Fichiers INTERDITS** : header.tsx, story-generator-modal (scope D1)

### Agent H — Doc + sync plans + audit briefs obsolètes
**Fichiers autorisés** :
- `plans/PMO/02-BRIEFS-REGISTRY.md` (append BRIEF-19/20/21/22/23 + flag obsolètes)
- `plans/PMO/03-ROADMAP-MASTER.md` (mise à jour roadmap globale)
- `plans/PMO/briefs/BRIEF-2026-04-25-19-*.md` à `BRIEF-2026-04-25-23-*.md` (NOUVEAUX 5 briefs formalisés)
- `plans/PMO/_drafts/SESSION-2026-04-25-evening-briefs.md` (archiver après consolidation)
- `CHANGELOG.md` (entrée v1.6.0)
- `plans/modules/profile/CONTEXT.md` (NOUVEAU si pas existe — module profile-as-hub)
- `plans/modules/profile/DECISIONS.md` (ADR-XXX Profile-as-Hub pattern)
- Audit + mise à jour de tous les briefs antérieurs (BRIEF-15/16/17/18) impactés par nouvelle direction → flagger sections obsolètes ou archiver

**Fichiers INTERDITS** : code source `src/`, migrations SQL

### Agent J — DevOps audit
**Fichiers autorisés** :
- `.env.example` (audit + adaptation si besoin)
- `vercel.json` (audit cron, headers)
- Lecture seule : `next.config.js`, `tsconfig.json`, `package.json`
- Rapport dans `plans/PMO/_audits/2026-04-25-devops-audit.md` (NOUVEAU)

**Fichiers INTERDITS** : tout sauf ci-dessus

---

## 4. Standards à appliquer (rappel §2 protocole)

- **TS strict** : `tsc --noEmit` exit 0 obligatoire
- **Conventional Commits** : `feat(BRIEF-N):` / `refactor:` / `docs:`
- **No any** sauf cast contrôlé DB
- **Mobile-first** + WCAG aria-labels
- **SPRBP pattern** : permission via Context React (`useProfilePermissions`) ou prop `canEdit`/`canPost`
- **Confidentialité Heaven↔SQWENSY** : grep pré-commit

---

## 5. DoD globaux session

- [ ] Header CP global a 4 boutons centrés (Eye/Link2/Key/Story)
- [ ] Bouton Key ouvre GenerateModal fonctionnel
- [ ] Bouton Story ouvre StoryGeneratorModal fonctionnel (image + flou + code + preview)
- [ ] Profil `/m/yumi` admin = profil visiteur intact + couche admin overlay
- [ ] Édition packs/contenu/tiers inline depuis profil admin
- [ ] Post composer fonctionnel (text + photo) inline profil admin
- [ ] CP cockpit a 2 tabs uniquement : Messagerie | Stratégie
- [ ] Onglet Contenu CP retiré
- [ ] Feed dashboard CP retiré
- [ ] Briefs antérieurs (BRIEF-17/18) à jour avec nouvelle direction
- [ ] CHANGELOG v1.6.0
- [ ] Plans + ROADMAP synchronisés
- [ ] tsc 0 + commit + push main

---

## 6. Versioning post-livraison

- CHANGELOG : `v1.6.0` — "Profile-as-Hub : fusion contenu/feed CP→Profil + header CP centralisé fonctionnel"
- Tag git optionnel : `v1.6.0-profile-as-hub`

---

## 7. Risques détectés et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Régression UI profil visiteur (admin overlay mal conditionné) | Moyenne | Élevé | Tests visuels admin/visiteur/preview en wave 3 |
| Composants profil supprimés cassent imports anciens | Moyenne | Moyen | Agent H grep imports avant retrait |
| Cockpit messagerie inline performance lente | Faible | Moyen | Réutiliser hook polling existant `useMessages` |
| Conflit Git entre D1 et D2 sur agence-header.tsx | Faible | Moyen | D1 fait sa modif en 1er commit, D2 attend (sequential pour ce fichier) |

**Action mitigation conflit** : D1 commit son modif `agence-header.tsx` (retrait Eye/Link2) AVANT que D2 commence. Ou : D2 fait les 2 modifs (retrait Eye/Link2 + passage à 2 tabs) et D1 ne touche pas ce fichier. Je choisis option 2 — plus safe.

**Update scope D1** : ne touche PAS `agence-header.tsx`. D2 fait tout sur ce fichier (retrait Eye/Link2 + tabs 2).

---

## 8. Cycle d'exécution

1. **T0** : dispatch 4 agents en parallèle background
2. **T+30min~** : premières livraisons (D1 + J probablement les plus rapides)
3. **T+2h~** : D2 + H finissent (gros refacto + doc)
4. **T+2h30** : consolidation, tsc global, commit, push
5. **T+3h** : verify preview live, screenshot diff admin/visiteur/preview
6. **T+3h30** : présentation NB pour validation finale ou pivot

# Module Profile — Architectural Decision Records

> Format : ADR (Architectural Decision Records) — https://adr.github.io/

---

## ADR-001 — Profile-as-Hub pattern (SPRBP)

**Status** : ✅ Accepted (NB session 2026-04-25 evening)
**Date** : 2026-04-25
**Briefs** : BRIEF-22, BRIEF-23 (consolidés)

### Context

Avant cette session, Heaven exposait deux surfaces distinctes pour la gestion du contenu modèle :

1. **Cockpit `/agence`** avec onglet "Contenu" (`contenu-panel.tsx` 1432 LOC) qui dupliquait partiellement les sections du profil
2. **Profil `/m/[slug]`** (page publique) qui affichait packs + feed sans capacité d'édition inline

Cette duplication créait :
- Maintenance double (modifier prix/photo dans 2 endroits)
- Incohérences UI/UX entre ce que voit l'admin (CP) et ce que voit le fan (profil)
- Code lourd (~1500 LOC redondants entre `contenu-panel.tsx` et sections profil)
- Friction admin (basculer CP↔Profil pour vérifier le rendu live)

NB a explicitement référencé le pattern Instagram/TikTok :

> "C'est un pattern de gestion de profil et réglages dans le style réseau social comme Instagram ou TikTok : tu as des accès différents qui te permettent de ajouter/modifier/supprimer les infos ou contenu à un seul endroit grâce aux accès admin ou accès visiteur. Sinon ça crée des pages redondantes qui alourdissent le code."

### Decision

Adopter le pattern **SPRBP — Single Page, Role-Based Permissions** :

1. **Une seule URL** = `/m/[slug]` qui sert simultanément vitrine fan ET hub gestion modèle
2. **Détection session** via `useModelSession(slug)` → `isModelLoggedInActual`
3. **Couches d'accès gradées** :
   - Client (default) — toujours visible
   - Admin overlay — additive si `isModelLoggedInActual && !previewMode`
   - Preview admin — masque overlay si `previewMode === true`
4. **Permissions propagées** via prop (`canEdit`, `canPost`) ou détection inline du `isModelLoggedInActual`
5. **Cockpit `/agence` simplifié** à 2 tabs (Messagerie + Stratégie) — focus back-office opérationnel pur

### Consequences

✅ **Positives** :
- Synergie CP↔Profil garantie (single source of truth UI)
- Code allégé : ~1500 LOC redondants prêts à être supprimés (Phase 2)
- UX cohérente entre admin et fan (admin voit son profil tel qu'il apparaît au fan)
- Pattern familier (Instagram/TikTok) → courbe d'apprentissage minimale
- Onboarding nouvelles modèles simplifié (un seul endroit à apprendre)

⚠️ **Négatives / risques** :
- `/m/[slug]/page.tsx` devient encore plus monolithique (~2050 LOC) — décomposition à prévoir Phase 3
- Régression possible si admin overlay leak en mode visiteur — mitigé par tests visuels admin/visiteur/preview
- Composants legacy (`contenu-panel.tsx`, `home-panel.tsx`) conservés `@deprecated` jusqu'au cycle suivant pour rollback rapide

### Implementation V1 livrée

- Profil admin : `<HeavenAdminActions>` + `<PostComposer>` + mount `<StoryGeneratorModal>` overlayés
- Cockpit : TABS const passé de 3 (`dashboard|contenu|strategie`) à 2 (`messagerie|strategie`)
- Tab Messagerie redirige vers `/agence/messagerie` (extraction `MessagingPageInner` reportée Phase 2)
- `contenu-panel.tsx` annoté `@deprecated`
- Eye + Link2 retirés de `agence-header.tsx` (déplacés vers header global via `<HeavenAdminActions>`)

### Phase 2 différée

- Édit packs inline `<PacksEditorInline>` à côté du display client
- Drawer `<BlurPreviewToggle>` admin "vue floutée vs débloquée"
- Extraction `MessagingPageInner` exportable (sans `<OsLayout>` wrapper) pour mount inline cockpit
- Suppression effective `contenu-panel.tsx`, `home-panel.tsx` après vérif zéro imports
- Décomposition `page.tsx` 2050 LOC en composants extraits (HeaderBar, HeroSection, FeedView, TierView)

### Anti-patterns formellement bannis

- ❌ Pages dupliquées (`/agence/contenu` séparée du profil)
- ❌ Composants miroirs CP/Profil (`<ContentManager>` + `<ContentDisplay>`)
- ❌ Routes API dédoublées (`/api/contenu/edit` vs `/api/profile/edit`)
- ❌ Hooks parallèles (`useCpContent` vs `useProfileContent`)

### Références

- Pattern Instagram : https://instagram.com/yumiiiclub (visiteur vs owner mode)
- Pattern TikTok : https://tiktok.com/@username (idem)
- Pattern X : https://x.com/username (idem)
- BRIEF-22+23 : `plans/PMO/briefs/BRIEF-2026-04-25-22-23-profile-as-hub-fusion.md`

---

## ADR-002 — Critère responsive mobile-first transversal

**Status** : ✅ Accepted (NB 2026-04-25 evening)
**Date** : 2026-04-25
**Brief** : transversal toutes briefs session

### Context

NB a explicitement étendu le mandat §13 du protocole chef d'équipe :

> "tous les ajustements du plan doivent être responsive. UX et UI et front pour la version mobile"

### Decision

Tous les nouveaux composants ou modifications visuelles **DOIVENT** respecter :

- Mobile-first viewport cible : 375px (iPhone SE/14), 414px (iPhone 14 Pro Max), 360px (Android)
- Tablet : 768px (iPad Mini)
- Touch targets minimum 44×44px (Apple HIG / WCAG)
- Pas de hover-only sans fallback tap
- Patterns Tailwind responsive obligatoires :
  - `flex-col sm:flex-row` / `text-xs sm:text-sm md:text-base` / `gap-1 sm:gap-2`
  - `hidden sm:inline` / `inline sm:hidden`
  - `w-full sm:w-auto` / `max-w-full sm:max-w-md md:max-w-2xl`
  - `p-3 sm:p-5 md:p-8` / `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`
- Drawer pattern : bottom sheet mobile, sidebar desktop
- Modal : full-screen mobile (`p-0 rounded-none`), centré desktop (`max-w-2xl rounded-2xl`)

### Consequences

✅ Tous les composants Profile-as-Hub livrés cette session respectent les patterns
✅ Tests visuels post-deploy obligatoires sur DevTools iPhone 14 + Android
⚠️ Si un agent livre du code non-responsive, renvoyé en correctif avant merge

### Références

- WCAG 2.2 AA touch targets : https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Apple HIG : https://developer.apple.com/design/human-interface-guidelines/buttons
- Tailwind responsive : https://tailwindcss.com/docs/responsive-design

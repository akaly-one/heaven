# Buffer Briefs — Session 2026-04-25 Evening

> ✅ **CONSOLIDÉ** dans `plan-global-v2-profile-as-hub.md` + 4 briefs formalisés
> (BRIEF-19/20/21/22+23) le 2026-04-25 evening. Peut être archivé/supprimé après
> 2026-05-02 (7 jours).

> Mode chef d'équipe multi-agent **ACTIF** (déclenché par NB)
> Append-only — synthèse au signal "terminer"
> Protocole : `plans/PMO/04-PROTOCOLE-CHEF-EQUIPE-MULTIAGENT.md`

---

## Briefs reçus (en attente consolidation)

### BRIEF-19 — CP Header centralisé (déplacement Eye + Link2, retrait labels Key/Story, centrage)

> **Reçu** : 2026-04-25 evening
> **Layer** : FE
> **Priorité** : P1 (UX polish + cohérence)
> **Mandat §13.1** : élimination doublons (Eye actuellement dans agence-header), synergie CP↔Profil (raccourci toujours visible)

**Demande NB** :
1. Bouton **Eye 👁 "Voir profil public"** → déplacer dans le **header global CP** (visible partout dans le cockpit, pas juste dashboard) → retirer de `agence-header.tsx`
2. Bouton **Link2 🔗 "Liens sociaux"** → pareil, déplacer dans le header global → retirer de `agence-header.tsx`
3. Bouton **Générer (KeyRound)** → retirer le texte "Générer" → garder uniquement l'icône
4. Bouton **Story (ImagePlus)** → retirer le texte → garder uniquement l'icône
5. **Centrer** les 4 boutons (Eye + Link2 + Key + Story) dans le header global

**Précision NB** : les Eye + Link2 sont actuellement dans la **rangée des tabs Dashboard/Contenu/Stratégie** de `agence-header.tsx` (cockpit dashboard). Doivent **remonter** dans le **header CP global** (`src/shared/components/header.tsx`) où Key + Story existent déjà avec du texte.

**Cible état final header CP global (centré)** :
```
[ ... left selector / logo ... ]   [ 🔑 ]  [ 🎬 ]  [ 👁 ]  [ 🔗 ]   [ ... right dropdowns ... ]
                                       ↑ centrés ↑
```

**Fichiers impactés** :
- `src/shared/components/header.tsx` :
  - Retirer texte des boutons Key (Générer) et Story
  - Ajouter Eye 👁 "Voir profil public" (target=_blank → /m/[currentModel])
  - Ajouter Link2 🔗 "Liens sociaux" (dispatch event `heaven:toggle-socials`)
  - Centrer les 4 boutons (flex-1 + justify-center sur le wrapper, ou ml/mr-auto)
- `src/cp/components/cockpit/dashboard/agence-header.tsx` :
  - Retirer Eye 👁 (L290) — déjà rollback fait, à re-supprimer maintenant que header global a le bouton
  - Retirer Link2 🔗 (L298)
  - Cleanup imports

**Agent assignment anticipé** : Agent D (Frontend) seul
**Estimation** : ~15 min

---

### BRIEF-20 — Bouton Clé Générer fonctionnel (codes d'accès manuels)

> **Reçu** : 2026-04-25 evening
> **Layer** : FE + BE (modal + route API)
> **Priorité** : P1 (feature)
> **Mandat §13.1** : cohérence front↔back (le bouton est cosmétique → faire fonctionner)

**Demande NB** :
- Bouton **Clé "Générer"** dans header CP est actuellement **cosmétique** (n'ouvre rien de fonctionnel)
- Doit ouvrir un modal pour **générer des codes d'accès manuellement** pour :
  - Packs (silver/gold/vip_black/vip_platinum/custom)
  - Abonnements (tier-based)
- Identifier le **pattern existant** dans les modals d'accès / generate-modal pour réutiliser

**Existant à réutiliser (audit anticipé)** :
- `src/cp/components/cockpit/generate-modal.tsx` (composant déjà présent)
- Route `POST /api/codes` action=create (existe — BRIEF-16 audit)
- Pattern référence `YUMI-PGLD-K3M9X2` déjà standardisé
- Table `agence_codes` complète (code, model, client, pack, tier, type, duration, expires_at)

**Action attendue** :
1. Wire le bouton Clé header → dispatch event `heaven:generate` (déjà existant?) ou ouvrir directement `<GenerateModal>`
2. S'assurer que le modal appelle bien `POST /api/codes` action=create
3. Toast confirmation + clipboard copy auto du code généré

**Agent assignment anticipé** : Agent D (Frontend) — wiring + Agent C (Backend) si route à compléter
**Estimation** : ~30 min

---

### BRIEF-21 — Bouton Story Générateur (image téléchargeable IG/Snap)

> **Reçu** : 2026-04-25 evening
> **Layer** : FE + BE (canvas génération + upload optionnel)
> **Priorité** : P1 (feature majeure)
> **Mandat §13.1** : ergonomie (un seul flow pour créer story promo)

**Demande NB** :
Bouton **Story** dans header CP doit ouvrir une box modal qui permet de générer une image téléchargeable aux dimensions Instagram/Snap story avec :

**Customisation pré-génération** :
1. **Image de fond** :
   - Default : dernière photo upload dans les albums contenu
   - Toggle : choisir une autre image
     - Soit upload local
     - Soit sélection dans la galerie existante
2. **% de floutage** de l'image arrière-plan (slider 0-100)
3. **Code d'accès généré inline** :
   - Toggle ON/OFF pour inclure
   - Si ON :
     - Choisir durée du code (jours)
     - Choisir pack/tier lié
     - Code généré à la volée + affiché sur l'image story
4. **Aperçu temps réel** avant génération finale

**Action attendue** :
- Modal avec preview canvas
- Génération côté client via Canvas API ou côté server (Sharp/Jimp) — à arbitrer selon perf
- Output : PNG téléchargeable (1080x1920 IG story, ou 1080x1920 Snap)
- Si toggle code ON : appel `POST /api/codes` pour générer + insertion sur image avant download

**Existant à réutiliser** :
- Last upload : `agence_uploads` ou `agence_feed_items` (latest by model)
- Code generation : route `POST /api/codes` (BRIEF-16)
- Image upload : Cloudinary helper

**Agent assignment anticipé** : Agent D (Frontend canvas + modal) + Agent C (Backend si génération server-side) + Agent E (AI optionnel pour suggestions copy)
**Estimation** : ~1-2h

---

### BRIEF-22 — Fusion Onglet "Contenu" CP → Profil (refactor archi MAJEUR)

> **Reçu** : 2026-04-25 evening
> **Layer** : FE (refactor majeur) + Doc (deprecate + roadmap)
> **Priorité** : P0 (refonte structurante — impacte tous les autres briefs)
> **Mandat §13.1** : 🎯 cœur du mandat — synergie CP↔Profil + élimination doublon massif + simplification

**Demande NB** :
- Actuellement : **onglet "Contenu" du CP** synchronise avec le profil (data partagée mais UI dupliquée)
- Cible : **fusionner toute la gestion contenu DIRECTEMENT dans le profil `/m/[slug]`**
- Si admin connecté (yumi/paloma/ruby/root) → voit les options admin **inline** dans le profil
- Si client/visiteur → ne voit pas les options admin (déjà partiellement implémenté via `isModelLoggedInActual`)

**Exemples sections à fusionner** (depuis cockpit Contenu vers profil) :
- Section "vue client sur le profil flouté ou non" → directement sur le profil, accessible admin only
- Changer prix / details / photo des packs → directement sur la card pack du profil (déjà partiellement avec hover overlay BRIEF-18)
- Liste fichiers contenu (5 fichiers, filtres Tous/Manuel/Instagram/Wall) → équivalent dans le profil
- Tabs tier (Tout/Public/Silver/Gold/VIP B/VIP P/Custom) → équivalent dans le profil
- VIP Glamour fold-out (3 vendus, 450€, contenu inclus, edit, voir profil) → directement éditable inline sur la card profil

**Conséquence finale** :
- Retirer l'**onglet "Contenu"** du CP (devenu redondant)
- Le profil `/m/[slug]` devient **le hub unique** de gestion + display contenu
- Skeleton profil **simplifié + intelligent** : même structure pour visiteur et admin, avec couches d'édition admin overlayées

**Décisions archi à prendre par Claude au dispatch (selon mandat §13.2)** :
- Stratégie d'overlay admin : drawer latéral, sections inline collapsibles, ou edit-on-click ?
- Migration progressive : déprécier onglet Contenu (read-only banner "→ va sur ton profil") puis suppression dans cycle suivant
- Routes API : `/api/contenu/*` à conserver (consommées par profil) — pas de breaking change BE
- Tests visuels critiques : profil admin yumi vs profil visiteur → preview/screenshot diff

**Risque archi** : MOYEN — pas de schema DB change, mais refacto FE conséquent
**Agent assignment anticipé** : Agent A (Architect — décisions overlay pattern + ADR) + Agent D (Frontend) en sequential, puis Agent H (Doc deprecation) + Agent G (QA visuel)
**Estimation** : ~3-5h

**⚠️ Dépendances inter-briefs détectées** :
- BRIEF-19 (header centralisé) : impact direct si on retire les tabs Dashboard/Contenu/Stratégie après fusion → ordre exec à arbitrer
- BRIEF-20 (Clé Générer) + BRIEF-21 (Story) : ces boutons restent dans header CP global (indépendants de l'onglet Contenu)
- BRIEF-17/18 livrés : overlay hover photo/banner déjà sur profil → cohérent avec direction de fusion

**Précision NB confirmée 2026-04-25** :
> "tout ce qui concerne le contenu upload par la modèle se fait directement à partir du profil de la modèle en mode admin. La modèle sera connectée à son CP via le header, et donc les options admin seront activées en profil, car si la modèle n'est pas connectée à son compte la page profil sera toujours affichée en mode client."

**Architecture implicite à respecter au dispatch** :
- Source de vérité auth : `localStorage.heaven_auth` (déjà en place, consommé par `useModelSession` + `useModel`)
- État admin = `isModelLoggedInActual=true` (déjà calculé dans `/m/[slug]/page.tsx`)
- État client = `isModelLoggedInActual=false` → HeaderBar visiteur classique, aucune option admin visible
- État admin = HeaderBar visiteur intact (pour preview pure) **+ couche overlay admin** :
  - Hover edit photo/banner (BRIEF-18 — déjà livré)
  - Header admin avec boutons Key/Story/Eye/Link2 → **à intégrer dans le profil aussi** quand admin (cohérence header CP↔Profil)
  - Sections édition packs/contenu/tiers inline (BRIEF-22 fusion)
  - Drawer/section vue client floutée (BRIEF-22 fusion)
- Mode preview admin (`previewMode=true`) → masque toutes les options admin temporairement pour QA visuelle visiteur

**Conséquence concrète sur BRIEF-19** :
Les 4 boutons (Key/Story/Eye/Link2) doivent être visibles **dans le header profil quand admin** ET dans le header CP. Implémentation : composant header admin partagé OU réplication contrôlée des 4 boutons dans le HeaderBar profil sous condition `isModelLoggedInActual`.

---

### BRIEF-23 — Fusion Feed CP → Profil + Refonte Dashboard CP

> **Reçu** : 2026-04-25 evening
> **Layer** : FE (refactor majeur) + Doc
> **Priorité** : P0 (refonte structurante — suite BRIEF-22)
> **Mandat §13.1** : 🎯 cœur du mandat — synergie CP↔Profil + simplification + élimination doublons

**Demande NB** :

#### Côté Profil `/m/[slug]` (mode admin)
- Onglet **"Feed"** dans le profil (existe déjà partiellement avec FeedView vertical + InstagramFeedGrid BRIEF-17)
- Quand admin connectée : **autoriser publication directe** depuis le profil :
  - Post texte (wall post)
  - Upload photo (manual feed item)
  - Mêmes fonctions que dashboard CP actuel mais **unifiées dans le profil**
- Détection identité poster via session admin connectée (`isModelLoggedInActual`) → la modèle Yumi connectée poste sur SON feed

#### Côté Dashboard CP (`/agence` cockpit)
- **Retirer le feed** (déplacé vers profil)
- **Retirer l'onglet Contenu** (déjà tranché BRIEF-22)
- **Conserver uniquement** :
  - **Messagerie inline** dans dashboard (vue principale, pas en sous-onglet)
  - **Stratégie** en onglet à côté (KPIs, palier, analytics)
- Simplification massive : 2 vues (Messagerie + Stratégie), tout le reste migré ailleurs
- Note NB : "on affinera encore plus après"

**Cible état final cockpit** :
```
┌─ Header CP global [logo|selector|Key|Story|Eye|Link2|messages|clients|socials]
├─ Tabs : [Messagerie ▼ active] [Stratégie]
└─ Contenu :
   ├─ Si Messagerie : inbox + threads inline (pas de drilldown)
   └─ Si Stratégie : KPIs revenue/abos/posts/codes + palier rémunération + analytics
```

**Cible état final profil admin** :
```
┌─ HeaderBar visiteur intact + couche admin (Key/Story/Eye/Link2)
├─ Hero (avatar + banner editables hover)
├─ Tabs profil :
│  ├─ Feed → grille IG + wall + posts manuels (admin: bouton "Poster" inline)
│  ├─ Contenu/Packs → fusion BRIEF-22 (admin: édition prix/details/photo)
│  └─ ...autres tabs déjà existants
└─ Footer
```

**Décisions archi à prendre par Claude au dispatch** :
- Nouveau composant `<PostComposer>` dans le profil pour admin (text input + photo upload + submit)
- Routes API : réutiliser `POST /api/wall` (wall posts) + `POST /api/uploads` (manual feed items) — déjà existantes
- Migration Dashboard cockpit : retirer composants feed actuels (probablement `feed-panel.tsx` ou similaire dans `src/cp/components/cockpit/dashboard/`) + supprimer onglet "Contenu"
- Tabs dashboard : passer de 3 (Dashboard|Contenu|Stratégie) à 2 (Messagerie|Stratégie)
- Messagerie inline dashboard : intégrer la liste threads + détail conversation directement dans la vue Messagerie tab
- Préserver toutes les routes API et hooks existants (pas de breaking change BE)

**Risque archi** : MOYEN-ÉLEVÉ — gros refacto FE cockpit + profil, mais BE intact
**Agent assignment anticipé** :
- Agent A (Architect) : décisions overlay pattern unifié BRIEF-22+23 + ADR
- Agent D (Frontend) : refacto profil (PostComposer, tabs, fusion contenu) + cockpit (retrait feed/contenu, messagerie inline, simplification tabs)
- Agent H (Doc) : deprecation guides + CHANGELOG
- Agent G (QA) : verify visuel CP avant/après + profil admin/visiteur

**Estimation** : ~4-6h (combiné avec BRIEF-22 qui est très lié)

**⚠️ Dépendances inter-briefs** :
- BRIEF-22 (fusion Contenu) + BRIEF-23 (fusion Feed) = **doivent être dispatchés ensemble** car ils touchent les mêmes fichiers (cockpit dashboard + profil tabs)
- BRIEF-19 (header centralisé) + BRIEF-20 (Clé fonctionnel) + BRIEF-21 (Story) = peuvent être dispatchés en parallèle car concernent uniquement le header CP global (indépendants des tabs cockpit)
- Préserver acquis BRIEF-15/16/17/18 livrés (hover edit, packs, payments, likes/comments IG grid)

---

## Notes synthèse silencieuse

### 🎯 Vision macro session (clarification NB 2026-04-25)

> Filtre directeur appliqué à TOUS les briefs de cette session (19-23 et suivants).

#### CP Dashboard `/agence` — outil opérationnel temps réel
**Mission** : simplifier les process de la modèle + monitoring temps réel.

**Affiche** :
- KPIs live (revenu, conversions, etc.)
- Conversions (visiteurs → registered → validated → buyers)
- Nouveaux clients connectés
- Demandes de validation en attente
- Messages reçus → accessibles en messagerie inline
- Suivi discussion avec agent IA (mode **auto** | **manuel** override | **shadow/copilot**)
  - Cohérent avec BRIEF-04 + persona modes existants
  - Override possible à tout moment depuis le dashboard

**Tabs simplifiés** : Messagerie (default) | Stratégie. Plus de Contenu, plus de Feed.

#### Profil `/m/[slug]` — hub unique de gestion (admin) + vitrine (client)
**Mission** : skeleton unique, couches d'accès gradées par session.

**Architecture en couches** :
1. **Couche client** (default, toujours visible) : vitrine fan/prospect, conversion-optimisée
2. **Couche admin** (overlayée si `isModelLoggedInActual=true`) :
   - Édition photo/banner (hover) ✅ BRIEF-18 livré
   - Édition contenu/packs **inline à côté des détails client** (pas en dropdown séparé)
     → preview live + édition simultanées dans la même vue
   - Publication feed (text/photo) inline
   - Boutons header admin (Key/Story/Eye/Link2)
   - Drawer/section "vue client floutée vs débloquée"
3. **Couche preview admin** (`previewMode=true`) : admin teste comme un fan, masque toutes les couches admin

#### Sécurité et permissions
- **RBAC** strict basé sur `auth.role` ∈ {root, model, client/null}
- Modifications de contenu/déplacement = admin only (RLS Supabase + check côté UI)
- Modifications infos pack (prix, photo, details) = admin only avec audit log
- Toutes les écritures critiques passent par routes API auth-protected (déjà en place)

#### Implication pour le dispatch
- BRIEF-22 + BRIEF-23 = **consolidés en 1 plan unique** "Profile-as-Hub"
- Pattern édit inline avec `EditableInPlace` ou similaire (à arbitrer au dispatch)
- Cockpit simplifié = retrait feed-panel, contenu-panel, garder messagerie + stratégie
- Aucune duplication d'UI entre CP et profil pour la gestion contenu

#### 🎨 Pattern UX de référence (NB 2026-04-25)

> "C'est un pattern de gestion de profil et réglages dans le style réseau social
> comme Instagram ou TikTok : tu as des accès différents qui te permettent de
> ajouter/modifier/supprimer les infos ou contenu à un seul endroit grâce aux
> accès admin ou accès visiteur. Sinon ça crée des pages redondantes qui
> alourdissent le code. Mon but est de rendre le plus ergonomique possible."

**Modèle mental** : **Single Page, Role-Based Permissions** (SPRBP)

**Inspirations directes** :
- **Instagram** : `instagram.com/yumi`
  - Visiteur voit : grille feed, bio, follow, message
  - Propriétaire voit : grille feed + bouton "Edit profile" + camera icon hover sur avatar + "Add post" inline + Settings cog
  - **Même URL, même skeleton, layer overlay selon `auth.uid === profile.uid`**
- **TikTok** : `tiktok.com/@yumi`
  - Pareil : visiteurs vs owner, options édition inline, pas de page admin séparée
- **Twitter/X** : `x.com/yumi`
  - Idem, "Edit profile" button visible uniquement pour owner

**Conséquences techniques** :
- ❌ **Pas** de page `/agence/contenu` séparée (refactor BRIEF-22)
- ❌ **Pas** de page `/agence/feed` séparée (refactor BRIEF-23)
- ❌ **Pas** de duplication composants gestion contenu entre `/m/[slug]` et `/agence/*`
- ✅ Un **seul `<ProfilePage>`** qui détecte la session via `useModelSession` + `useModel`
- ✅ Composants `<AdminEditOverlay>` / `<EditableField>` / `<PostComposer>` mountés conditionnellement si `isModelLoggedInActual && model.slug === auth.model_slug` (ou root)
- ✅ Code plus léger, single source of truth UI, maintenance simplifiée

**Anti-pattern à éviter** :
- Créer un `<ContentManager>` côté CP ET un `<ContentDisplay>` côté profil → duplication
- Avoir 2 routes API pour le même CRUD (`/api/contenu/edit` vs `/api/profile/edit`)
- Maintenir 2 hooks similaires (`useCpContent` vs `useProfileContent`)

**Pattern correct (cible)** :
- `<ProfilePage>` consomme `useProfileData(slug)` (data + write hooks)
- `<EditableField field="display_name" value={...} canEdit={isOwner}>` détecte permission et bascule input/display
- `<PostComposer canPost={isOwner}>` mounté inline si owner
- Tous les composants child reçoivent le contexte permission via prop ou Context React

---

## Décisions critiques en attente NB

(à remplir si questions de cadrage bloquantes)

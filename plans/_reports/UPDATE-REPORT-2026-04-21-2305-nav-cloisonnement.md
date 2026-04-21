# Update Report — 2026-04-21 23:05 — Navigation cloisonnement root + fix leak header

**CP** : Heaven
**Trigger** : NB « si je suis dans yumi et je cliq dans le bouton dash je pass chez paloma » + « pour root afficher skeleton mais vide »
**Opérateur** : Claude Code
**Durée session** : ~25 min

---

## Bug racine identifié

`/api/models` retournait la liste triée par `display_name` alphabétique → **Paloma** apparaissait en premier → ModelContext auto-sélectionnait `currentModel = "paloma"` pour root → navigation suivante affichait data Paloma au lieu de Yumi.

---

## Fixes

### 1. `/api/models` ordre canonique
- Query principale : `agence_models .eq("is_active", true).not("model_id", "is", null).order("model_id", { ascending: true })`
- Résultat : Yumi (m1) → Paloma (m2) → Ruby (m3)
- Filtrage explicite comptes sans `model_id` (root/heaven)
- Fallback `agence_accounts` similaire avec mêmes règles

### 2. ModelContext : persistance + no auto-select
- Nouveau key `localStorage.heaven_root_viewing_cp`
- Root login : `currentModel = null` par défaut (pas auto-select first model)
- Sélection via `RootCpSelector` persiste dans localStorage
- Au reload : localStorage restauré automatiquement
- Modèle non-admin (paloma/ruby) : inchangé, `currentModel = auth.model_slug`

### 3. ModelContext : `modelId` empty string si pas de slug
- Avant : `toModelId("") = "m1"` (fallback silencieux = leak Yumi)
- Après : `modelId = ""` si currentModel + auth.model_slug tous null
- Conséquence : composants doivent gérer `!slug` → empty state

### 4. RootCpSelector : option « Aucun CP (root brut) »
- Badge color adapté : ambre (#F59E0B) si pas de sélection, rouge (#DC2626) sinon
- Label dynamique : « Aucun CP » si pas de sélection
- Nouvelle option dans dropdown en tête : « Aucun CP (root brut) — vide »
- Click sur cette option → `setCurrentModel(null)` → localStorage cleared

### 5. `agence-header.tsx` IG leak fix
- Ancien : `fetch("/api/instagram/profile-stats")` sans scope → root fallback "yumi" → affichage stats Yumi pour Paloma
- Fix : `fetchIg(slug)` avec signature scope + passage `?model=<slug>` explicite
- Reset `igProfile` avant chaque fetch pour éviter flash du modèle précédent
- Handle 404 `not_configured` proprement (Paloma/Ruby n'ont pas d'IG config)

### 6. DB alignment
- `UPDATE agence_models SET is_active=true WHERE model_id='m3'` (Ruby était `false`)

---

## Tests preview heaven:3002 — scénarios NB

### Scénario 1 : Root fresh login (sans selection)
- `localStorage.heaven_root_viewing_cp` : vide
- `/api/models` : [Yumi m1, Paloma m2, Ruby m3] (ordre canonique ✅)
- RootCpSelector label : « Root view Aucun CP » (ambre) ✅
- `/agence` affiché : skeleton vide (pas de fallback Yumi) ✅
- Breadcrumb : « Root Admin / Dashboard » ✅

### Scénario 2 : Root switch Yumi
- Selector click Yumi → `currentModel = "yumi"` + `localStorage = "yumi"` ✅
- Breadcrumb : « Yumi / Dashboard » ✅
- Selector : « Root view Yumi » (rouge) ✅
- Reload page → Yumi restauré via localStorage ✅

### Scénario 3 : Root switch Paloma + click couronne Dashboard
- Selector Paloma → Paloma loaded ✅
- Click couronne (sidebar) → `/agence` → **reste sur Paloma** (pas de saut vers Yumi) ✅
- Breadcrumb : « Paloma / Dashboard » ✅

### Scénario 4 : Paloma view (bug original NB)
- Header Dashboard : **plus de leak `@yumiiiclub 4993 followers`** ✅
- Widget IG home affiche : « Instagram non configuré » (Paloma n'a pas d'IG) ✅
- Instagram dashboard `/agence/instagram` : empty state ✅

---

## Règle principale (NB 2026-04-21)

> « pour root ca doit afficher le meme skeleton mais vide »

Implémentation :
- ModelContext `modelId = ""` si pas de slug
- Composants testent `!slug` et affichent état vide
- RootCpSelector force choix explicite (pas de fallback Yumi par défaut)
- Persistance localStorage garantit la continuité entre pages/reloads

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/app/api/models/route.ts` | Query ordonnée par model_id + filter non-null |
| `src/shared/lib/model-context.tsx` | Persistance localStorage root + no auto-select + modelId empty fallback |
| `src/cp/components/cockpit/root-cp-selector.tsx` | Option « Aucun CP » + badge dynamique |
| `src/cp/components/cockpit/dashboard/agence-header.tsx` | fetchIg scope + reset state |
| DB agence_models | Ruby is_active=true |

---

## Doc mise à jour

`plans/03-tech/ISOLATION-CP-v1.2026-04-21.md` :
- 5 nouvelles entries "Bugs historiques résolus"
- Pattern « ModelContext — persistance localStorage »
- Section « Règle root sans CP = vide »

---

## Notes protocolaires

- Conformité `PROTOCOLE-MISE-A-JOUR.md` : ✅ rapport horodaté
- Tests preview live captures screenshot × 2
- `tsc --noEmit` : 0 erreur
- Commit + push à suivre

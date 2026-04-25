# BRIEF-2026-04-25-18 — Header unifié Root / Modèle Admin / Client

> **Date** : 2026-04-25 ~02:30
> **Émetteur** : NB
> **Type** : refactor archi UI majeur
> **Priorité** : P1
> **Branches** : FE, UI, Doc
> **Statut** : 🟢 dispatched (audit livré, plan validé)

---

## 🎯 Demande NB

> "uniformise un seul header admin pour les modeles quand elle sont connecté a leur cp, et donc si on arrive sur la page profil a partir du cp ou juste du lien direct le profil doit reconnaitre qui est connecté au cp, et afficher le header coorespondant... le bouton deconecté ou login est au meme endroit en fontion de l'etat de conection... dans le cp faut retirer le bouton dans la nav... unifirmisé pour un header qui correspont a root m0, Yumi m1, standard scalable Paloma m2 etc, et le header Client profil"

### Décomposition
1. **3 types de header standardisés** :
   - **Root (m0)** : admin global SQWENSY — switch model + cross-modèles tools
   - **Modèle Admin (m1=Yumi, m2=Paloma, m3=Ruby...)** : scope modèle propre, scalable pour nouveaux modèles
   - **Client / Profil** : visiteur fan sur `/m/[slug]`
2. **Cohérence cross-vue** : MÊME header admin apparait dans le CP ET dans `/m/[slug]` quand admin connecté
3. **Détection auto** : si admin connecté → render header admin scoped au rôle ; sinon → header client
4. **Bouton login/logout** position fixe, label adaptatif selon état
5. **Retirer bouton redondant** dans nav CP (probable : Eye 👁 "Voir profil public" devenu inutile car header admin sera unifié)

---

## 📊 Audit (livré 25/04 ~02:30)

### 4 headers existants
| Fichier | Contexte | Détection rôle | Boutons clés |
|---|---|---|---|
| `src/shared/components/header.tsx` | CP `/agence/*` | `useModel()` → `auth.role` | Générer, Story, Messages, Clients, Socials, Theme |
| `src/cp/components/cockpit/dashboard/agence-header.tsx` | Cockpit dashboard | Props `auth` | Avatar, IG profil, KPIs, Tabs (Dashboard/Contenu/Stratégie), Eye, Link2 |
| `src/web/components/profile/model-header-bar.tsx` | `/m/[slug]` visiteur | Props (`isModelLoggedIn`, etc.) | Logo modèle, Code input, Order history, Tier badge, Theme |
| `HeaderBar` inline `/m/[slug]/page.tsx:823+` | `/m/[slug]` admin mode | `isModelLoggedInActual` | Avatar/Banner edit, Save/Cancel, Preview, Admin auth modal |

### Source auth (cohérente)
- `useModel()` hook (`src/shared/lib/model-context.tsx`) → `{ auth, currentModel, isRoot, ready, authHeaders }`
- `auth.role` ∈ `"root" | "model" | "client"`
- `auth.model_slug` ∈ `null | "yumi" | "paloma" | "ruby"`
- `localStorage.heaven_auth` (persistance 24h cross-onglets)

### Bouton à retirer
**Eye 👁 `agence-header.tsx:290`** — actuellement "Voir profil public" → redondant car le futur header admin sera identique en CP et sur `/m/[slug]`. NB navigue librement entre les deux contextes sans avoir besoin d'un raccourci dédié.

---

## 🏗️ Architecture cible

### Composant unifié `<HeavenHeader>`
```typescript
// src/shared/components/header/heaven-header.tsx
interface HeavenHeaderProps {
  /** Si omis : auto-détecte via useModel() */
  forceRole?: "admin" | "client";
  /** Slug modèle pour scope ; si root → switch dropdown actif */
  modelSlug?: string;
  /** Vue actuelle pour highlight tabs (cockpit | profile | messagerie | etc.) */
  context?: "cockpit" | "profile-public" | "messagerie" | "stats" | "settings";
  /** Slot pour boutons custom contexte spécifique (ex. édit photo/banner sur /m/[slug]) */
  extraActions?: React.ReactNode;
}

export function HeavenHeader(props: HeavenHeaderProps) {
  const { auth, isRoot, currentModel } = useModel();
  const role: "admin" | "client" = props.forceRole 
    ?? (auth?.role === "root" || auth?.role === "model" ? "admin" : "client");
  
  if (role === "admin") return <HeavenAdminHeader {...props} />;
  return <HeavenClientHeader {...props} />;
}
```

### Sous-composants standardisés
```
src/shared/components/header/
├─ heaven-header.tsx              ← Wrapper auto-detect
├─ heaven-admin-header.tsx        ← Pour root + modèles (cohérent CP + /m/[slug])
├─ heaven-client-header.tsx       ← Pour visiteurs/fans sur /m/[slug]
├─ header-tabs.tsx                ← Tabs config-driven (déjà nav cockpit)
├─ header-actions.tsx             ← Boutons droite (messages/clients/socials/login)
├─ messages-dropdown.tsx          ✓ (existe)
├─ clients-dropdown.tsx           ✓ (existe)
└─ socials-dropdown.tsx           ✓ (existe)
```

### Comportements clés

#### Header Admin (Root m0 + Modèles m1/m2/m3...)
- **Logo / titre** : "HEAVEN" + sous-titre = display_name modèle scopé (ex: "Yumi")
- **Si Root** : RootCpSelector dropdown (switch entre Yumi / Paloma / Ruby / vue cross)
- **Si Modèle** : nom modèle en read-only span
- **Tabs nav contextuels** :
  - Cockpit/dashboard : Dashboard | Contenu | Stratégie
  - Profil `/m/[slug]` : Aperçu | Édit profil | Édit banner | Preview visiteur
  - Messagerie : Inbox | Threads | Stats messages
- **Actions right** : Messages 🔔 | Clients 👥 | Socials 🔗 | Avatar dropdown
- **Avatar dropdown** : Mon profil, Settings, Switch modèle (si root), Déconnexion (avec icône `LogOut` au même endroit que login client)

#### Header Client / Profil (`/m/[slug]` visiteur)
- **Logo / titre** : nom modèle uppercase (ex: "YUMI")
- **Status modèle** : online indicator
- **Si visiteur registered** : avatar @pseudo + tier badge + countdown si code actif + order history
- **Si visiteur anonyme** : bouton "Login / Upgrade" (gradient accent) au même emplacement
- **Code input** desktop / Key icon mobile → CodeSheet
- **Chat / Beacon** centre
- **Shield admin login** (toujours visible non-admin) → AdminAuthModal

### Bouton login/logout — position fixe
Le bouton est **toujours en haut-droite extrême** :
- État anonyme : `<Button>Login</Button>` (gradient)
- État admin connecté : avatar dropdown avec menu Logout
- État visiteur registered : badge avatar + dropdown
- **Position pixel-identique** dans les 3 cas pour cohérence visuelle

---

## 🎫 Plan tickets (1 agent senior + revue NB)

### Phase A — Composant unifié
- **T18-A1** : Créer `src/shared/components/header/heaven-admin-header.tsx` (consolide header.tsx + agence-header.tsx + HeaderBar admin tools de page.tsx)
- **T18-A2** : Créer `src/shared/components/header/heaven-client-header.tsx` (consolide model-header-bar.tsx + HeaderBar visiteur de page.tsx)
- **T18-A3** : Créer `src/shared/components/header/heaven-header.tsx` (wrapper auto-detect)
- **T18-A4** : Extraire `<HeaderTabs config={...} />` config-driven
- **T18-A5** : Extraire `<HeaderActions role={...} />` config-driven (Messages/Clients/Socials/Avatar/Login)

### Phase B — Migration call-sites
- **T18-B1** : Remplacer `agence-header.tsx` usage par `<HeavenAdminHeader context="cockpit">` dans `/agence/page.tsx` + autres routes cockpit
- **T18-B2** : Remplacer `header.tsx` usage par `<HeavenAdminHeader>` dans `OsLayout`
- **T18-B3** : Remplacer `HeaderBar` inline dans `/m/[slug]/page.tsx` par `<HeavenHeader>` auto-detect (admin OU client selon session)
- **T18-B4** : Garder `model-header-bar.tsx` mais re-export depuis `heaven-client-header.tsx` (compat)

### Phase C — Cleanup
- **T18-C1** : Retirer Eye 👁 `agence-header.tsx:290` (devenu redondant car header unifié)
- **T18-C2** : Marquer ancien `agence-header.tsx` `@deprecated` ou supprimer
- **T18-C3** : Marquer ancien `model-header-bar.tsx` `@deprecated` ou supprimer
- **T18-C4** : `HeaderBar` inline retiré de `/m/[slug]/page.tsx`

### Phase D — QA + Doc
- **T18-D1** : tsc --noEmit exit 0
- **T18-D2** : Tests visuels CP (root, yumi, paloma, ruby) + `/m/[slug]` (visiteur, admin)
- **T18-D3** : Doc `docs/architecture/HEADER-SYSTEM.md`
- **T18-D4** : CHANGELOG v1.5.2 + commit + push

---

## 🔀 Dispatch

**1 agent senior frontend** (scope full refactor incremental safe avec verification step à chaque phase). Chemin recommandé : approche **adapter pattern** — créer `HeavenHeader` qui DELEGATES vers les composants existants au début, puis fusionne progressivement.

Cycle estimé : 2-3h.

---

## ✅ Definition of Done

- [ ] `<HeavenHeader>` wrapper unifié auto-détecte rôle via `useModel()`
- [ ] Header admin identique en CP `/agence/*` et profil `/m/[slug]` quand admin connecté
- [ ] Header client visible uniquement quand pas de session admin
- [ ] Bouton login/logout position fixe, label adaptatif
- [ ] Eye 👁 retiré d'`agence-header.tsx`
- [ ] Ancien `HeaderBar` inline dans `/m/[slug]/page.tsx` retiré
- [ ] tsc --noEmit exit 0
- [ ] Pas de régression visuelle (avatar, tabs, dropdowns fonctionnent)
- [ ] CHANGELOG v1.5.2 + commit + push

---

## 📌 Références

- BRIEF-17 (HeaderBar admin enrichi) : déjà livré, à intégrer dans le nouveau système
- BRIEF-15 (Messagerie UX) : header messagerie cohérent avec le standard

---

## 🔗 Fichiers de référence

- `src/shared/components/header.tsx` (CP)
- `src/cp/components/cockpit/dashboard/agence-header.tsx` (cockpit)
- `src/web/components/profile/model-header-bar.tsx` (visiteur)
- `src/app/m/[slug]/page.tsx` L823+ (HeaderBar inline)
- `src/shared/lib/model-context.tsx` (useModel + auth)
- `src/shared/components/os-layout.tsx` (wrapper CP)

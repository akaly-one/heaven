# Cloisonnement CP — règles de séparation par modèle

> **Source de vérité** pour la séparation des données entre les 3 CP modèles.
> Règle NB (2026-04-21) : « chaque cp est cloisoné par securité en db en cloudinary en skeleton et infos qui circulent en config en tout, les modeles partagent que le chasis skeleton pas les donnée qui circulent ».

---

## 1. Principes

### 1.1 Séparation stricte

| Domaine | Partagé | Cloisonné |
|---|---|---|
| **Code source (skeleton)** | ✅ Un seul codebase Next.js | — |
| **Composants React** | ✅ `src/cp/components/*` réutilisables | — |
| **Design system** | ✅ Tailwind v4 + tokens `var(--*)` | — |
| **Routes Next.js** | ✅ `/agence/*`, `/m/[slug]`, `/agence/models/[id]` | — |
| **DB rows** | ❌ | ✅ Filtrées par `model_id` via RLS + `.eq("model", …)` |
| **Cloudinary folders** | ❌ | ✅ `m1/`, `m2/`, `m3/` avec signed URLs scopées |
| **Config entités** | ❌ | ✅ `src/config/entities/{yumi,paloma,ruby}.ts` individuels |
| **Session JWT** | ❌ | ✅ `model_slug` + `scopes` encodés au login |
| **Instagram creds** | ❌ | ✅ 1 ligne par model_id dans `instagram_config` |
| **State client (sessionStorage, localStorage)** | ❌ | ✅ Clés préfixées `heaven_*_${slug}` |
| **URLs profils** | ❌ | ✅ `/m/yumi`, `/m/paloma`, `/m/ruby` distincts |
| **Contrats, Release Form, DMCA** | ❌ | ✅ Tables `agence_releaseform_dossier`, bucket privé `dmca-dossiers` scopés |

### 1.2 Accès par rôle

| Rôle | Mode accès | Scope DB |
|---|---|---|
| **root** (dev SQWENSY) | **Dev** | Override complet (`scopes: ["*"]`) ; peut impersonner via `RootCpSelector` |
| **yumi** (agence+IA fusion, m1) | **Agence** | Voit les 3 modèles (scopes admin étendus) |
| **paloma** (m2) | **Modèle** | Uniquement son propre profil (scope `model_id = m2`) |
| **ruby** (m3) | **Modèle** | Uniquement son propre profil (scope `model_id = m3`) |
| **public** (visiteur) | **Public** | Lecture seule selon Plan Identité du modèle, page `/m/{slug}` |

---

## 2. Règles d'implémentation

### 2.1 Résolution du slug actif (CP admin)

**Helper canonique** : `src/shared/lib/use-active-model.ts`

```ts
import { useActiveModelSlug, useIsAgenceAdmin, useIsRootDev } from "@/lib/use-active-model";

const slug = useActiveModelSlug();        // currentModel || auth.model_slug || null
const isAdmin = useIsAgenceAdmin();        // isRoot || slug === "yumi"
const isDev = useIsRootDev();              // role === "root" && !model_slug
```

**Priorité** :
1. `currentModel` (override via `RootCpSelector`, root seulement)
2. `auth?.model_slug` (JWT session, modèle logué)
3. `null` (visiteur, root sans sélection) — **pas de fallback "yumi"**

### 2.2 API endpoints scopés

**Règle absolue** : tout endpoint retournant des données d'un modèle doit **exiger** le paramètre scope :

| Endpoint | Param requis | Comportement si absent |
|---|---|---|
| `GET /api/posts` | `?model=` | `400 Bad Request` (legacy mode désactivé) |
| `GET /api/feed` | `?model=` | `400 Bad Request` |
| `GET /api/clients` | `?model=` | `[]` vide |
| `GET /api/packs` | `?model=` | Scope server-side via JWT |
| `GET /api/messages` | `?model=` | `[]` vide |
| `GET /api/wall` | `?model=` | `[]` vide |
| `GET /api/codes` | `?model=` | `[]` vide |
| `GET /api/finances` | `?model=` | `[]` vide |
| `GET /api/instagram/*` | scope session | Enforcement via JWT `model_slug` |
| `GET /api/agence/models/[id]` | URL `id` explicite | 404 si inexistant |

**Hardening depuis avril 2026** :
- ❌ `/api/posts` legacy mode (sans `?model`) — retournait tous les modèles mélangés → **désactivé**
- ❌ `/api/feed` fallback `"yumi"` → **retiré**, exige `?model=`

### 2.3 Composants CP

**❌ ANTI-PATTERNS interdits** :

```ts
// ❌ Ignore le root selector → les liens ne suivent pas l'override
const slug = auth?.model_slug;

// ❌ Fallback "yumi" hardcodé → masque un état incohérent
const slug = auth?.model_slug || "yumi";

// ❌ Pas de null-guard → fetch silencieux avec slug vide
fetch(`/api/posts?model=${auth.model_slug}`);
```

**✅ PATTERNS corrects** :

```ts
// ✅ Priorité currentModel (root override) > session
const slug = useActiveModelSlug();
if (!slug) return <EmptyState />;
fetch(`/api/posts?model=${slug}`);

// ✅ Via helper direct
const { currentModel, auth } = useModel();
const slug = currentModel || auth?.model_slug || null;
```

### 2.4 Cloudinary scoping

- **Upload** : signed URL server-side avec `folder=heaven/{model_id}/...` forcé par l'API (impossible pour client de tamperer)
- **Signature** : régénérée à chaque upload, TTL 5 min
- **Cleanup orphelins** : scope model_id via cron
- **RLS effective** : quota Cloudinary séparé par folder pour monitoring

### 2.5 Session storage

Clés préfixées **obligatoirement** par slug :

```ts
// ✅
sessionStorage.setItem(`heaven_client_${slug}`, ...);
localStorage.setItem(`heaven_access_${slug}`, ...);

// ❌
sessionStorage.setItem("heaven_client", ...); // partagé entre modèles !
```

**Exception** : clés globales non-model-specific (ex: `heaven_theme`, `heaven_sidebar_expanded`).

### 2.6 Instagram config

- **Unique** par modèle : 1 ligne dans `instagram_config` par `model_slug`
- **Aucun fallback hardcodé** sur `@yumiiiclub` dans les composants génériques
- Actuellement : seule m1 (yumi) a une `instagram_config` configurée
- Paloma/Ruby : placeholder "Instagram non configuré" tant que pas de config DB

---

## 3. Flux de cloisonnement

### 3.1 Login

```
POST /api/auth/login { code: "paloma" }
  ↓
Supabase: agence_accounts.select(code = "paloma")
  ↓
JWT: { sub: "paloma", role: "model", model_id: "m1" ❌→ "m2" ✅, model_slug: "paloma", scopes: [...] }
  ↓
Cookie HttpOnly heaven_session=<jwt>
  ↓
Client: sessionStorage.heaven_auth = { role, model_slug, model_id, scopes }
  ↓
ModelContext: auth.model_slug = "paloma", currentModel = null
```

### 3.2 Affichage CP

```
User paloma visite /agence
  ↓
useModel() retourne { auth: { model_slug: "paloma" }, currentModel: null }
  ↓
useActiveModelSlug() = "paloma"
  ↓
Tous les fetch scope-aware :
  /api/clients?model=paloma
  /api/packs?model=paloma
  /api/feed?model=paloma
  ↓
DB retourne rows where model = "m2" (paloma)
```

### 3.3 Root impersonation

```
Root connecté, auth.model_slug = null
  ↓
RootCpSelector visible → setCurrentModel("paloma")
  ↓
useModel() retourne { auth: { model_slug: null }, currentModel: "paloma" }
  ↓
useActiveModelSlug() = "paloma" (currentModel prime)
  ↓
Tous les fetch scope = paloma
  ↓
UI reflète data paloma, mais JWT session reste root (override visuel seulement)
```

### 3.4 Visiteur anonyme

```
Visiteur → /m/paloma
  ↓
Pas de sessionStorage
  ↓
auth-guard vérifie pas public → pas de redirect (page publique)
  ↓
Page /m/[slug] avec slug="paloma"
  ↓
fetch /api/feed?model=paloma
  ↓
Rendu profil Paloma scopé m2
```

---

## 4. Bugs historiques résolus

| Date | Bug | Fix | Commit |
|---|---|---|---|
| 2026-04-21 | `/agence/settings` placeholder `@yumiiiclub` visible Paloma/Ruby | → `@pseudo_instagram` générique | 6c24bf0 |
| 2026-04-21 | `instagram-stats-widget` fallback `|| "yumiiiclub"` affichait Yumi pour Paloma/Ruby | → null + "Instagram non configuré" | 6c24bf0 |
| 2026-04-21 | `instagram-dashboard` idem | idem | 6c24bf0 |
| 2026-04-21 | `ig-media-grid` texte "Contenu publié sur @yumiiiclub" hardcodé | → "Contenu publié sur Instagram" | 6c24bf0 |
| 2026-04-21 | `model-access-codes` placeholder `"yumi, yumiiiclub"` hardcodé | → `${profile.handle}` dynamique | 6c24bf0 |
| 2026-04-21 | `strategie-panel` lisait `auth?.model_slug` (ignore root selector) | → `currentModel || auth?.model_slug` | — |
| 2026-04-21 | `messagerie/page` fallback `\|\| "yumi"` | → currentModel prioritaire + null-skip | — |
| 2026-04-21 | `milestones-tracker` fallback `\|\| "yumi"` | → null-skip | — |
| 2026-04-21 | `/api/posts` legacy mode retournait tous modèles mélangés | → 400 si `?model=` absent | — |
| 2026-04-21 | `/api/feed` default `"yumi"` | → 400 si `?model=` absent | — |
| 2026-04-21 | Ordre `accounts-table` : model avant root | → Root → Yumi → Paloma → Ruby (role DESC) | 6c24bf0 |

---

## 5. Checklist nouvelle feature

Avant de push une feature CP, vérifier :

- [ ] Tout fetch API inclut `?model=` ou `model_id`
- [ ] Utiliser `useActiveModelSlug()` plutôt que lire `auth?.model_slug` brut
- [ ] Aucun fallback hardcodé `|| "yumi"` dans les composants génériques
- [ ] Cloudinary upload avec folder `heaven/{model_id}/...`
- [ ] SessionStorage/localStorage clés préfixées `_${slug}`
- [ ] RootCpSelector compatible (lit `currentModel` du context)
- [ ] Tests : login paloma → ne voit pas m1 ; login ruby → ne voit pas m2
- [ ] Tests : root switch via selector → UI reflète currentModel sans fuite

---

## 6. Références

- [access-mode.ts](../../src/shared/lib/access-mode.ts) — detection des 4 modes
- [use-active-model.ts](../../src/shared/lib/use-active-model.ts) — hook canonique slug actif
- [model-context.tsx](../../src/shared/lib/model-context.tsx) — state global + currentModel
- [root-cp-selector.tsx](../../src/cp/components/cockpit/root-cp-selector.tsx) — selector root-only
- [SECURITY-v1.2026-04-21.md](./SECURITY-v1.2026-04-21.md) — RLS + scopes
- [BP Cowork §Data model](../business/bp-agence-heaven-2026-04/README.md) — schéma canonique 3 Modes

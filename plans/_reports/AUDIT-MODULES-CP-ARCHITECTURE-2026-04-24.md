# AUDIT MODULES + RÈGLES CP ARCHITECTURE v1 — 2026-04-24

> **Source** : règles figées NB 2026-04-23 soir / 2026-04-24 + audit read-only Explore agent
> **Scope** : Heaven — définir les 3 niveaux de CP (ROOT dev / YUMI agence / PALOMA-RUBY standard)
> **Statut** : en attente validation NB sur matrice cible — NE PAS IMPLÉMENTER AVANT GO

---

## Partie 1 — Règles des 3 niveaux de CP (figées NB)

### 1.1 CP ROOT — mode développeur

- **Compte** : `role=root`, `model_slug=null`, `scopes=["*"]`
- **Skeleton** : identique à tous les autres CPs (même chassis)
- **Data** : **AUCUNE** (pas d'infos réelles d'un modèle, pas de données DB m1/m2/m3)
- **Modules affichés** : **TOUS** — même ceux exclusifs yumi ou paloma/ruby
- **Particularités clés** :
  - ✅ Tous les réglages au complet (général + comptes + **Dev Center**)
  - ✅ **Réglages généraux de tous les CPs** accessibles (config globale Heaven)
  - ✅ Au lieu d'afficher les infos d'un modèle, les panels **listent les fonctionnalités et descriptifs** de chaque module — comme une **doc développeur / mode présentation / récap architectural**
  - ✅ Vue 360° des modules mais sans fuite de data (skeleton "inspectable")
- **Usage** : NB (dev SQWENSY) pour vérifier, tester, présenter l'architecture, préparer futur Root Master Console (`/cp/root` planifié long terme)

### 1.2 CP YUMI — agence (m1)

- **Compte** : `role=root` (fusion) OU `role=model`, `model_slug=yumi`, `model_id=m1`
- **Skeleton** : identique au commun (même chassis que ROOT / PALOMA / RUBY)
- **Data** : **UNIQUEMENT m1 (Yumi)** — **JAMAIS mélange** avec paloma/ruby
- **Modules affichés** : tous les modules standard + modules agence (gestion modèles, DMCA, contrats) pour sa propre instance m1
- **Particularités clés** :
  - ❌ **PAS de mode dev** (pas de Dev Center, pas de mode présentation/récap)
  - ❌ Pas de vue agrégée 3 modèles dans son CP
  - ✅ Yumi est l'agence qui gère administrativement les autres modèles, mais son CP reste **scopé m1 uniquement**
  - ⚠️ **À préciser NB** : où/comment Yumi gère paloma/ruby si ce n'est pas dans son CP ? Via modules admin séparés ? Via impersonnation ? Via Root seulement ?
- **Usage** : Yumi admin + IA — opère sa propre activité (messagerie fans, contenu, IG, stratégie) et fonctions agence côté contrats/DMCA sur m1

### 1.3 CPs PALOMA / RUBY — modèles standard (m2/m3)

- **Comptes** : `role=model`, `model_slug=paloma|ruby`, `model_id=m2|m3`
- **Skeleton** : identique au commun mais **fractionné** (subset)
- **Data** : uniquement leur propre `model_id`
- **Modules affichés** :
  - ✅ Dashboard own
  - ✅ Messagerie own
  - ✅ Instagram own
  - ✅ Contenu own (packs)
  - ✅ Stratégie own
  - ✅ Settings (général + finances own + agent DM)
- **Modules interdits** :
  - ❌ Dev Center
  - ❌ Réglages des autres modèles
  - ❌ Gestion modèles (`/agence/models/[id]/*`)
  - ❌ Settings/Comptes (gestion comptes global)
  - ❌ Ops, Finances agence, Automation, Architecture

---

## Partie 2 — Inventaire modules (audit 2026-04-24)

### 2.1 Pages sous `/agence/*` (17 routes)

| Route | Fichier | Rôles actuels | Statut |
|-------|---------|---------------|--------|
| `/agence` | `src/app/agence/page.tsx` | root, yumi, paloma, ruby | Dashboard + 3 tabs |
| `/agence/messagerie` | `src/app/agence/messagerie/page.tsx` | root, yumi, paloma, ruby | Inbox + Contacts drawer |
| `/agence/instagram` | `src/app/agence/instagram/page.tsx` | root, yumi, paloma, ruby | IG stats + feed |
| `/agence/contenu` | `src/app/agence/contenu/page.tsx` | root, yumi, paloma, ruby | Content grid packs/tiers |
| `/agence/strategie` | `src/app/agence/strategie/page.tsx` | root, yumi, paloma, ruby | Plans A/B/C + milestones |
| `/agence/settings` | `src/app/agence/settings/page.tsx` | root, yumi, paloma, ruby | Onglets scopés par rôle |
| `/agence/models/[id]` | `src/app/agence/models/[id]/page.tsx` | root, yumi (via API `authorizeAdmin`) | Dispatcher profile |
| `/agence/models/[id]/profile` | idem/profile | root, yumi | Identity + Palier + Statut |
| `/agence/models/[id]/contract` | idem/contract | root, yumi | Contract generator |
| `/agence/models/[id]/dmca` | idem/dmca | root, yumi | Release form uploader |
| `/agence/clients` | `src/app/agence/clients/page.tsx` | root, yumi | **DEPRECATED** (Messagerie absorbe) |
| `/agence/clients/[fanId]` | idem/[fanId] | root, yumi | **DEPRECATED** |
| `/agence/cms` | `src/app/agence/cms/page.tsx` | root, yumi | Phase future |
| `/agence/ops` | `src/app/agence/ops/page.tsx` | **root only** (`ROOT_ONLY_ROUTES`) | Ops metrics + health |
| `/agence/finances` | `src/app/agence/finances/page.tsx` | **root only** | Agence financials |
| `/agence/automation` | `src/app/agence/automation/page.tsx` | **root only** | Workflow builder |
| `/agence/architecture` | `src/app/agence/architecture/page.tsx` | **root only** | CP schema viewer |

**Public** : `/m/[slug]` — profil public modèle (visiteur, pas d'auth)

### 2.2 Composants cockpit par domaine (~50 composants)

#### Dashboard
`home-panel.tsx` · `stat-cards.tsx` · `kpi-strip.tsx` · `agence-header.tsx` · `ig-cta-buttons.tsx`

#### Messagerie
`contacts-drawer.tsx` · `multi-channel-reply.tsx` · `meta-24h-timer.tsx`

#### Instagram
`instagram-dashboard.tsx` + 14 sous-composants (`ig-stats-bar`, `ig-media-grid`, `ig-conversation-list`, `ig-comments-list`, `ig-config-panel`, `ig-mode-toggle`, `ig-chat-view`, `instagram-stats-widget`, etc.)

#### Contenu (packs + uploads)
`contenu-panel.tsx` · `pack-composer.tsx` · `pack-configurator.tsx` · `post-composer.tsx` · `content-draggable-item.tsx` · `pack-visibility-settings.tsx` · `pack-drop-zone.tsx` · `packs-editor.tsx`

#### Stratégie
`strategie-panel.tsx` · `plan-a-yumi-ia.tsx` · `plan-b-hub-annexe.tsx` · `plan-c-consultance.tsx` · `milestones-tracker.tsx`

#### Modèles (business plan agence)
`identity-plan-panel.tsx` · `palier-remuneration-panel.tsx` · `statut-initial-card.tsx` · `contract-generator.tsx` · `contract-versions-list.tsx` · `business-dossier-form.tsx`

#### DMCA / Release Form
`dmca-state-machine.tsx` · `release-form-uploader.tsx` · `dmca-email-generator.tsx`

#### Settings (onglets scopés)
`general-panel.tsx` · `comptes-panel.tsx` · `dev-center-panel.tsx` · `finances-own-panel.tsx` · `agent-dm-request-panel.tsx` · `accounts-table.tsx`

#### Utilitaires transversaux
`root-cp-selector.tsx` (root-only) · `model-access-codes.tsx` · `codes-list.tsx` · `fan-profile-card.tsx` · `fan-timeline.tsx` · `client-activity-timeline.tsx` · `reply-composer.tsx` · `generate-modal.tsx` · `security-alerts.tsx` · `fan-handles-manager.tsx` · `overview-simulator.tsx`

### 2.3 Sidebar & navigation actuelle

**`src/shared/components/sidebar.tsx`**

| Item | Href | Visible actuel |
|------|------|----------------|
| Dashboard | `/agence` | all |
| Messagerie | `/agence/messagerie` | all |
| Instagram | `/agence/instagram` | all |
| Contenu | `/agence/contenu` | all |
| Stratégie | `/agence/strategie` | all |
| Paramètres | `/agence/settings` | all (onglets scopés) |
| **Ops** | `/agence/ops` | **isRoot only** ⚠️ (devrait aussi YUMI pour certains sous-modules ?) |

### 2.4 APIs scopées (principales)

| Endpoint | Auth | Scoping |
|----------|------|---------|
| `/api/agence/accounts` | root \| model | Admin: all ; Model: own |
| `/api/agence/messaging/inbox` | root \| model | `?model_slug=` |
| `/api/agence/messaging/reply` | root \| model | Model scoped |
| `/api/agence/models/[id]` | root \| model | `authorizeAdmin()` pour écriture |
| `/api/agence/models/[id]/contract` | root \| yumi | `authorizeAdmin()` |
| `/api/agence/models/[id]/identity-plan` | root \| yumi | `authorizeAdmin()` |
| `/api/agence/models/[id]/palier` | root \| yumi | `authorizeAdmin()` |
| `/api/agence/dmca/[model_id]/*` | root \| yumi | `authorizeAdmin()` |
| `/api/agence/fans/*` | root \| model | Model scoped |
| `/api/agence/dashboard/kpis` | root \| model | Model scoped |
| `/api/agence/ops/metrics` | **root only** | — |
| `/api/instagram/*` | root \| model | Model scoped |
| `/api/posts` | scoped | `400` si `?model=` absent |
| `/api/feed` | scoped | `400` si `?model=` absent |
| `/api/models` | public-ish | Liste 3 modèles |

### 2.5 Matrice d'accès ACTUELLE (audit)

| Module | root | yumi | paloma | ruby | public |
|--------|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✓ | ✓ | ✓ own | ✓ own | — |
| Messagerie | ✓ all | ✓ all | ✓ own | ✓ own | — |
| Instagram | ✓ all | ✓ all | ✓ own | ✓ own | — |
| Contenu | ✓ | ✓ | ✓ own | ✓ own | — |
| Stratégie | ✓ | ✓ | ✓ own | ✓ own | — |
| Settings/Général | ✓ | ✓ | ✓ | ✓ | — |
| Settings/Comptes | ✓ | ✓ | ✗ | ✗ | — |
| Settings/Dev Center | ✓ | ✓ ⚠️ | ✗ | ✗ | — |
| Settings/Finances own | ✓ | ✓ | ✓ own | ✓ own | — |
| Settings/Agent DM | ✓ | ✓ | ✓ own | ✓ own | — |
| Modèles/Profile+Contract+DMCA | ✓ | ✓ | ✗ (API) | ✗ (API) | — |
| Ops | ✓ | ✗ ⚠️ | ✗ | ✗ | — |
| Finances agence | ✓ | ✗ | ✗ | ✗ | — |
| Automation | ✓ | ✗ | ✗ | ✗ | — |
| Architecture | ✓ | ✗ | ✗ | ✗ | — |

---

## Partie 3 — Matrice CIBLE v1 (à valider NB)

### 3.1 Matrice cible `module × skeleton`

| Module | ROOT (dev) | YUMI (agence m1) | PALOMA (m2) | RUBY (m3) |
|--------|:-:|:-:|:-:|:-:|
| Dashboard | ✅ présentation | ✅ data m1 | ✅ data m2 | ✅ data m3 |
| Messagerie | ✅ présentation | ✅ data m1 | ✅ data m2 | ✅ data m3 |
| Instagram | ✅ présentation | ✅ data m1 | ✅ data m2 | ✅ data m3 |
| Contenu | ✅ présentation | ✅ data m1 | ✅ data m2 | ✅ data m3 |
| Stratégie | ✅ présentation | ✅ data m1 | ✅ data m2 | ✅ data m3 |
| Settings/Général | ✅ config globale | ✅ own | ✅ own | ✅ own |
| Settings/Comptes | ✅ all CPs | ❌ | ❌ | ❌ |
| Settings/Dev Center | ✅ exclusif | ❌ | ❌ | ❌ |
| Settings/Finances own | ✅ présentation | ✅ own | ✅ own | ✅ own |
| Settings/Agent DM | ✅ présentation | ✅ own | ✅ own | ✅ own |
| Modèles/Profile+Contract+DMCA | ✅ présentation | ✅ m1 seulement | ❌ | ❌ |
| Ops | ✅ exclusif | ❌ | ❌ | ❌ |
| Finances agence | ✅ exclusif | ❌ | ❌ | ❌ |
| Automation | ✅ exclusif | ❌ | ❌ | ❌ |
| Architecture | ✅ exclusif | ❌ | ❌ | ❌ |

> ⚠️ **Question ouverte NB** : Yumi "gère les autres modèles" comment si son CP n'affiche que m1 ? Via `/agence/models/[id]` = OK si elle peut naviguer (mais là elle verrait m2/m3) — OU Yumi délègue gestion des autres modèles à Root uniquement ? À trancher.

### 3.2 Règle "ROOT = mode présentation sans data"

Le CP ROOT doit afficher :
- Tous les panels avec **structure vide** (skeleton visible)
- Remplacer les zones data par des **cartes descriptives** listant :
  - Nom du module
  - Fonction principale
  - Sous-modules / features
  - APIs utilisées
  - Rôles qui y ont accès
  - Data sources
- Exemple : au lieu d'afficher "12 345 € revenus m1", afficher carte "Module Dashboard → KPIs financiers · API `/api/agence/dashboard/kpis` · accessible root/yumi/paloma/ruby · source `agence_fans` + `agence_payments`"

### 3.3 Incohérences à corriger (après validation matrice)

1. **Sidebar `isRoot` only pour Ops** → déjà aligné avec matrice cible (seul root voit Ops)
2. **Pages `/agence/models/[id]/*` non protégées AuthGuard** → ajouter à `ROOT_ONLY_ROUTES` OU nouveau guard `MODEL_ADMIN_ROUTES` (yumi peut accéder pour m1 seulement)
3. **Stratégie panel agrège 3 modèles pour yumi** → scoper à m1 uniquement
4. **Fallback `"yumi"` hardcodé** dans `/api/codes`, `/api/clients`, `/api/packs` → retirer, exiger `?model=` explicit
5. **Ops/Finances/Automation/Architecture** → vérifier qu'APIs backend sont protégées (pas uniquement frontend)
6. **ROOT current = skeleton vide (null)** → transformer en **skeleton présentation** avec cartes descriptives

---

## Partie 4 — Next steps (à GO NB)

### Étape A — Valider matrice cible (conversation)
- NB confirme matrice Partie 3.1
- NB tranche question Yumi → gestion autres modèles
- NB précise "mode présentation ROOT" (style cartes ? liste ? panel dev ?)

### Étape B — Définir `config/modules.ts` (code, ~1h)
- Fichier central : pour chaque module, définir `{id, label, path, allowedRoles, scope, description, apiEndpoints, dataSource}`
- Sidebar + AuthGuard + pages lisent cette config

### Étape C — Implémenter guard unifié (code, ~2h)
- Hook `useModuleAccess(moduleId)` → checke matrice
- AuthGuard utilise config (plus de `ROOT_ONLY_ROUTES` hardcodé)
- Pages `/agence/models/[id]/*` protégées via guard spécifique

### Étape D — Mode présentation ROOT (code, ~3h)
- Nouveau composant `<ModulePresentationCard />`
- Chaque panel détecte `isRootDev` → affiche présentation au lieu de data
- Dashboard root = galerie de cartes modules

### Étape E — Fixes incohérences (code, ~1h)
- Retirer fallbacks `"yumi"` hardcodés
- Scoper stratégie à m1 pour yumi
- Protéger APIs Ops/Finances/Automation/Architecture server-side

**Total estimé code** : ~7h après validation matrice

---

## Références

- Audit source : conversation session 2026-04-24 (agent Explore read-only)
- Règles NB : messages 2026-04-23 soir + 2026-04-24
- [plans/03-tech/ISOLATION-CP-v1.2026-04-21.md](../03-tech/ISOLATION-CP-v1.2026-04-21.md) — règles précédentes (à réviser)
- [feedback_root_master_authority.md](~/.claude/projects/-Users-aka-Documents-AI-LAB/memory/feedback_root_master_authority.md) — directive sécurité long terme
- [src/shared/components/auth-guard.tsx](../../src/shared/components/auth-guard.tsx) — `ROOT_ONLY_ROUTES`
- [src/shared/components/sidebar.tsx](../../src/shared/components/sidebar.tsx) — nav conditionnelle
- [src/shared/lib/model-context.tsx](../../src/shared/lib/model-context.tsx) — state global CP

---

**Statut** : rapport vivant, à tenir à jour au fil des décisions NB. **NE PAS CODER AVANT GO matrice 3.1 + résolution question 3.2.**

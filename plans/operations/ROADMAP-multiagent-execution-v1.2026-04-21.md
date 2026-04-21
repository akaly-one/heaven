# ROADMAP Multi-Agent Execution — Heaven V2

> **Intégration** : briefs NB B1-B11 + défauts audit full-stack (P0/P1/P2) + sprints BP S1-S7
> **Contraintes** : pas de code avant GO NB par phase, protocole mise à jour obligatoire
> **Durée cible** : 8-12 semaines (selon décisions bloquantes D-1→D-8)
> **Version** : v1 — 2026-04-21

---

## 0. Vue d'ensemble

### Principes d'orchestration

1. **Phases séquentielles** : chaque phase dépend de la précédente (infra avant UI, UI avant IA)
2. **Agents parallèles par phase** : 2-5 agents simultanés, scopes distincts pour éviter conflits de fichiers
3. **Skills activés** : general-purpose par défaut, specialized (vercel:ai-architect, deployment-expert, performance-optimizer) quand pertinent
4. **QA intégrée à chaque phase** : un agent dédié vérifie avant merge
5. **Protocole mise à jour** appliqué systématiquement après chaque phase

### Matrice consolidation briefs × défauts × sprints BP

| Zone | Briefs NB | Défauts audit | Sprints BP |
|---|---|---|---|
| Data model | B3/B4 | — | **S1** |
| Navigation & Dashboard | B1/B9 | P0-1, P0-2, P0-3, P0-4, P1-4 | — |
| Messagerie + Contacts | B7 | P0-11, P1-3, P1-8 | — |
| Contenu + Packs | B8 | P0-5, P0-9, P1-5, P2-3 | — |
| Profil public | B9/B10 | P0-6, P0-10 | — |
| Instagram + Agent IA | B10/B11 | P0-12, P1-7 | **S6** |
| Stratégie 3 Plans | B6 | — | **S3** |
| Release Form DMCA | B6 | — | **S3** |
| Caming tracking | — | — | **S4** |
| Commission + Paliers | — | — | **S5** |
| Agence Modules template | — | — | **S6** |
| Settings + Dev Center | B1/B2 | P1-6 | — |
| Comptes & Accès | B3/B4/B5 | — | — |
| Monolithe décomposition | — | P0-7, P0-8 | — |
| Worker + Cron infra | — | P1-1 | — |
| Business Verif + App Review | — | — | **Module D roadmap tech** |
| Mode C B2B | — | — | **S7 (conditionnel)** |

### 🎯 Traçabilité brief-par-brief + acceptance criteria

Vue verticale pour vérifier en fin de phase que chaque brief NB est réellement livré.

#### B1 — Dev Center consolidé (Settings + Architecture tab)
- **Phase(s)** : 2 (Agent 2.C)
- **Livrables attendus** :
  - `/agence/settings` unifié avec tabs : Général + Comptes + Dev Center
  - Tab Dev Center contient : config dev + Architecture map (déplacée depuis `/agence/architecture` top-level)
  - Sidebar top-level : plus aucun lien « Architecture »
- **Acceptance** : navigation tab Dev Center → Architecture visible + config dev accessible ; pas de 404 sur `/agence/architecture` (redirect vers Settings)

#### B2 — Nettoyage redondances Settings
- **Phase(s)** : 2 (Agent 2.C) + 10 (Agent 10.A)
- **Livrables attendus** :
  - Tab « Packs » Settings supprimée (packs gérés dans Dashboard + Contenu)
  - Tab « Codes modèles » fusionnée dans « Comptes » Settings
  - Zone « Comptes » gère : codes + accès + modules actifs pour les 3 modèles
- **Acceptance** : Settings a exactement 3 tabs (Général / Comptes / Dev Center), pas de Packs ni Codes standalone

#### B3 — 2 comptes techniques (révisé)
- **Phase(s)** : 1 (Agent 1.B, ✅ livré) + 10 (Agent 10.A)
- **Livrables attendus** :
  - `root` actif = dev SQWENSY (scopes `["*"]`, model_id NULL)
  - `yumi` actif = fusion agence + modèle IA (admin principal, scopes étendus, model_id m1)
  - Pas de compte `agence` standalone
- **Acceptance** : ✅ LIVRÉ Phase 1 (5 comptes testés curl, tous OK)

#### B4 — Modèles + skeleton uniforme
- **Phase(s)** : 1 (Agent 1.A ✅ seed) + 3 (Agent 3.B skeleton UI) + 10 (Agent 10.A profil dédié)
- **Livrables attendus** :
  - 3 profils DB avec `model_id` canonique m1/m2/m3 (✅ livré Phase 1)
  - Dossiers Cloudinary isolés par `model_id` (`m1/`, `m2/`, `m3/`)
  - Même code `/m/[slug]/page.tsx` pour les 3 (scoping runtime seul diffère)
  - Même CP skeleton, accès admin Yumi via scopes (pas UI différente)
- **Acceptance** : visiter `/m/paloma` et `/m/ruby` fonctionne comme `/m/yumi` (skeleton identique, contenu scopé)

#### B5 — 4 modes d'accès
- **Phase(s)** : 10 (Agent 10.B)
- **Livrables attendus** :
  - Mode **Dev root** : accès toutes options + édition infos/corrections + Dev Center
  - Mode **Agence** (yumi) : vue agrégée 3 modèles + pages Finance/Ops/Agent DM standardisées + modules activables pour paloma/ruby
  - Mode **Modèle** (paloma/ruby) : scope own profile, lecture+écriture
  - Mode **Public** : page `/m/{slug}` sans auth, selon Plan Identité
  - Matrice permissions dans `plans/03-tech/SECURITY-v1`
- **Acceptance** : 4 scénarios login → interface adaptée (root voit tout, yumi voit les 3 modèles, paloma voit uniquement m2, visiteur sans auth voit profil public)

#### B6 — Stratégie 3 Plans A/B/C + Release Form
- **Phase(s)** : 7 (Agents 7.A + 7.B + 7.C)
- **Livrables attendus** :
  - Tab Stratégie avec 3 onglets (Plan A / Plan B / Plan C)
  - Plan C : stratégie visage vs sans visage + plans prospect + plan financier facturation
  - Release Form Fanvue pré-remplissable via portail modèle (pas seulement admin)
  - Templates contrats standards + dossier infos + stratégie commerciale
  - Workflow conclusion accord pro
- **Acceptance** : une modèle externe peut pré-remplir Release Form depuis portail dédié → admin valide + génère contrat type → signature

#### B7 — Messagerie fusion contacts multi-canal
- **Phase(s)** : 4 (Agents 4.A + 4.B)
- **Livrables attendus** :
  - Tab « Clients » sidebar supprimée (redirect vers `/agence/messagerie?view=contacts`)
  - Fusion auto contacts : web + Snap + Insta + Fanvue = un seul profil fan
  - Drawer fan avec historique unifié (messages toutes sources)
  - Profil fan recense goûts + critères + envies + demandes
  - Reply cross-canal : choix web OU Instagram (si fenêtre Meta 24h ouverte)
- **Acceptance** : fan qui donne pseudo Snap puis compte Insta → 1 seul contact DB avec les 2 handles + messages unifiés

#### B8 — Contenu drop&drag restauré + règles packs
- **Phase(s)** : 5 (Agents 5.A + 5.B + 5.C)
- **Livrables attendus** :
  - Drag & drop restauré (récupéré depuis git history commits `6078376`/`977f6ba`/`ae5c7f3`)
  - Règles visibilité par pack : `public` / `if_purchased` / `preview_blur` (intensity 0-20)
  - Upload Cloudinary direct signé (TTL 5min)
  - Sync feed applique règles : fan sans accès voit flouté, fan payé voit net
- **Acceptance** : pack avec `preview_blur` affiché flouté au fan non-acheteur dans le feed ; après achat → affiché net automatiquement

#### B9 — Dashboard (ex agence index) + sync IG header
- **Phase(s)** : 2 (Agent 2.A, lien sidebar) + 3 (Agent 3.A, contenu)
- **Livrables attendus** :
  - Lien sidebar « agence » → « Dashboard » (résout P0-4)
  - Header rempli par infos IG live : profil + bio + followers + médias + dernière sync
  - Avatar modèle sync automatique depuis photo profil IG (priorité Meta Graph > DB < 24h > Cloudinary fallback)
  - KPI modèle (revenus 30j, conv PPV, abonnés actifs) intégrés
  - Bouton « Suivre sur Insta » + « Message sur Insta » (liens `instagram.com/<u>` et `ig.me/m/<u>`)
  - Icône couronne Heaven sidebar = raccourci `/agence` → suppression bouton Dashboard redondant
- **Acceptance** : click couronne → `/agence` ; avatar visible dans header = photo IG live

#### B10 — Posts IG sur profil public + badges distinctifs
- **Phase(s)** : 3 (Agent 3.B) + 6 (Agent 6.A)
- **Livrables attendus** :
  - Posts IG de `@yumiiiclub` visibles sur `/m/yumi` (via `agence_feed_items` polymorphe)
  - Badge **Instagram** (gradient IG) sur posts source IG
  - Badge **couronne Yumi** sur posts exclu web
  - Click carte IG → ouvre `permalink_url` IG natif (nouvel onglet)
  - Posts IG = tous publics par défaut (pas de tier gate)
- **Acceptance** : visite `/m/yumi` → voir les 21 posts IG + exclu web, chaque carte distinguable visuellement, click IG → redirige Instagram.com

#### B11 — Config IA agent séparation agence / yumi
- **Phase(s)** : 6 (Agent 6.A Yumi-specific) + 8 (Agent 8.A Agence template)
- **Livrables attendus** :
  - Section **Agence** (générique, standardisée) : module Agent DM templatable + assignable aux 3 modèles via UI (yumi/paloma/ruby)
  - Section **Instagram yumi** (spécifique) : config affinée pour `@yumiiiclub` avec 4 canaux :
    - DMs Instagram
    - Commentaires posts IG
    - Likes
    - Stories
  - Pas de redondance : template Agence édite la base, Instagram yumi surcharge finement
- **Acceptance** : modifier persona dans Agence → disponible pour assignment aux 3 modèles ; modifier prompt DMs dans Instagram → n'affecte que yumi (surcharge scope m1)

---

### Récap 11/11 briefs couverts

Tous les briefs NB sont intégrés. Phase 1 ayant livré B3 + partie de B4, **8 briefs restent à livrer** sur Phases 2-10 :
- Phase 2 : B1, B2, B9 (partiel)
- Phase 3 : B4 (skeleton), B9 (contenu), B10 (partiel)
- Phase 4 : B7
- Phase 5 : B8
- Phase 6 : B10 (complet), B11 (partiel)
- Phase 7 : B6
- Phase 8 : B11 (complet)
- Phase 10 : B2 (partiel), B4 (complet), B5

---

## Phase 0 — Décisions bloquantes NB (prérequis)

**Aucun agent** — NB seul, puis GO déblocage.

| Clé | Scope | Défaut recommandé |
|---|---|---|
| D-1 | Option navigation (1/2/3 cf. SPEC-navigation-refactor) | Option 1 sidebar 1:1 pages |
| D-2 | Rename `/agence` | Garder `/agence` |
| D-3 | Sidebar par défaut | Expanded + toggle persistant |
| D-4 | BM Meta (SQWENSY vs perso) | SQWENSY Business Manager |
| D-5 | Provider clé IA | OpenRouter Claude Sonnet 4.6 |
| D-6 | Cron worker infra | Upstash QStash (free tier) |
| D-7 | Ouverture Mode B (1ère modèle) | Attendre M3 validé Mode A |
| D-8 | Caming platform prioritaire | Stripchat (50-65 % split) |

**Gate** : D-1/D-2/D-3 requis pour Phase 2 ; D-5 requis pour Phase 7 ; D-4 requis pour Phase 11 ; D-6 requis pour Phase 11.

---

## Phase 1 — Data Model + Auth refonte (Sprint 1 BP + B3/B4)

**Prérequis** : aucun (peut démarrer immédiatement)
**Durée estimée** : 3-5 jours
**Agents en parallèle** : 3

### Agent 1.A — Migrations Supabase
- **Scope** : `supabase/migrations/039_*` → `042_*`
- **Livrables** :
  - `039_agence_models_business_fields.sql` : ajout `mode_operation`, `identity_plan`, `palier_remuneration`, `fiscal_voie`, `statut_initial*`, `caming_active`, `caming_platforms`, `release_form_status`, `contract_signed_at`, `contract_url`, `revenue_monthly_avg_3m`, `palier_escalation_locked_until`
  - `040_agence_releaseform_dossier.sql` : table DMCA (1 par modèle × plateforme)
  - `041_agence_caming_sessions.sql` : tracking sessions cam
  - `042_agence_commission_calcul.sql` : vue matérialisée mensuelle
- **Skill** : general-purpose
- **QA** : `supabase-jps:list_migrations` + tests RLS scopés
- **Bloquant P2-3** : intégrer re-upload Cloudinary pour URLs Meta CDN 24h

### Agent 1.B — Refonte `agence_accounts` (B3)
- **Scope** : `supabase/migrations/043_agence_accounts_refonte.sql` + `src/app/api/auth/*`
- **Livrables** :
  - Migration SQL : fusion compte `agence` → `yumi` (yumi = admin principal + modèle IA), garder `root` dev SQWENSY, paloma/ruby = comptes modèles scopés
  - Seed auth locale + mapping `login_aliases`
  - API `/api/auth/login` mise à jour (dual-credential + scopes)
- **Skill** : general-purpose
- **QA** : Test login 4 comptes (root / yumi / paloma / ruby) + isolation scope model_id

### Agent 1.C — RLS policies + scopes étendus
- **Scope** : `supabase/policies/*.sql` + helpers GUC
- **Livrables** :
  - Policies scope `dmca:read` pour `agence_releaseform_dossier`
  - Policies scope `contract:view` pour `contract_url`
  - Policies scope `identity:view_legal` pour champs sensibles
  - Helpers PG : `can_access_dmca(target)`, `can_view_contract(target)`, `can_view_identity(target)`
  - Tables log append-only : `agence_dmca_access_log`, `agence_consent_log`, `agence_identity_plan_changes`, `agence_palier_history`, `agence_contracts_versions`
- **Skill** : general-purpose
- **QA** : tests multi-rôle (admin / model / dpo futur)

**Gate Phase 1 → 2** : migrations appliquées + login 4 comptes OK + RLS testés.

---

## Phase 2 — Navigation + Settings Dev Center (B1/B2 + P0-1/2/3/4 + P1-4)

**Prérequis** : D-1/D-2/D-3 validés
**Durée estimée** : 4-6 jours
**Agents en parallèle** : 3

### Agent 2.A — Refonte sidebar (selon D-1)
- **Scope** : `src/shared/components/sidebar.tsx` + `src/app/agence/layout.tsx`
- **Livrables** :
  - Application option validée (1 / 2 / 3)
  - Renommage « agence » → « Dashboard » (résout P0-4)
  - Sidebar expanded default + toggle persistant (résout P0-2, P1-4)
  - Naming unifié « Clients » partout (résout P0-3)
  - Icône couronne Heaven = raccourci `/agence` (B9)
  - Suppression tab Clients standalone (B7)
  - Suppression tab Packs Settings (B2)
  - Middleware redirect `/agence?tab=X` → `/agence/X` si option 1
- **Skill** : general-purpose
- **QA** : test navigation 8 items sidebar + bookmarks externes → redirects OK

### Agent 2.B — Décomposition monolithe `agence/page.tsx` (P0-7/8)
- **Scope** : `src/app/agence/page.tsx` (2453L) → shell ~300L + 4 composants
- **Livrables** :
  - Extraction home dashboard (Phase 3 prend le relais)
  - Extraction tab Contenu → composant `<ContenuPanel>` (Phase 5)
  - Extraction tab Clients → redirige Phase 4
  - Extraction tab Stratégie → composant `<StrategiePanel>` (Phase 7)
  - Idem `clients-panel.tsx` (1351L → ~400L)
- **Skill** : general-purpose
- **QA** : diff visuel avant/après + tests click routes + lint + typecheck

### Agent 2.C — Settings Dev Center consolidé (B1/B2 + P1-6)
- **Scope** : `src/app/agence/settings/` + `src/app/agence/architecture/*` → déplacement vers Settings
- **Livrables** :
  - `/agence/settings` refondu avec tabs : Général + Comptes (codes + accès + modules actifs, fusion B2) + Dev Center (Architecture map, config tech, env vars read-only)
  - Retrait Architecture de la sidebar top-level
  - Nettoyage nodes morts `/agence/architecture` (résout P1-6)
  - Suppression Packs tab Settings (B2, redondant avec Contenu)
- **Skill** : general-purpose
- **QA** : smoke test tabs Settings + access role-gated

**Gate Phase 2 → 3/4/5** : Navigation stable + monolithe décomposé + Settings unifié.

---

## Phase 3 — Dashboard home + Profil public (B9/B10)

**Prérequis** : Phase 2 (décomposition monolithe)
**Durée estimée** : 4-5 jours
**Agents en parallèle** : 2 (peut être en parallèle avec Phase 4 + 5)

### Agent 3.A — Dashboard home (B9)
- **Scope** : `src/app/agence/page.tsx` (shell allégé) + `src/cp/components/cockpit/*`
- **Livrables** :
  - Header Dashboard avec **infos IG live** : profil_pic, bio, followers, médias, dernière sync
  - **Sync avatar auto** : priorité `Meta Graph live` > `avatar_ig_url` DB < 24h > Cloudinary mirror (résout P0-12)
  - KPI modèle intégrés (revenus 30j, conv PPV, abonnés actifs)
  - Boutons « Suivre sur Insta » / « Message sur Insta » → `instagram.com/<u>` + `ig.me/m/<u>`
  - Widget IG existant conservé mais rafraîchi
- **Skill** : general-purpose
- **QA** : test profil Yumi + fallback si API Meta down + responsive

### Agent 3.B — Profil public `/m/{slug}` (B9/B10 + P0-6/10)
- **Scope** : `src/app/m/[slug]/page.tsx` + composants feed
- **Livrables** :
  - Skeleton uniforme cross-modèles (m1/m2/m3) — vérification scope
  - Feed polymorphe : badges distinctifs (gradient IG pour posts instagram / couronne Yumi pour exclu web / pseudo wall) (résout P0-5 via `agence_feed_items`)
  - Click post IG → `permalink_url` natif (nouvel onglet)
  - Header avec boutons CTA natifs IG (même logique Dashboard)
  - Bouton Login admin **toujours visible** (résout P0-10, supprimer condition `onReopenGate`)
  - IdentityGate + AdminAuthModal (déjà livré v1.1, vérification uniforme m1/m2/m3)
- **Skill** : general-purpose
- **QA** : test `/m/yumi` affiche les 21 posts IG (résout P0-6) + badges distinguent sources

**Gate Phase 3 → 7** : Dashboard et Profil public opérationnels sur les 3 modèles.

---

## Phase 4 — Messagerie + Contacts fusion (B7 + P0-11 + P1-3/8)

**Prérequis** : Phase 1 (data model)
**Durée estimée** : 4-5 jours
**Agents en parallèle** : 2 (parallélisable avec Phase 3 et 5)

### Agent 4.A — Fusion contacts multi-canal (B7)
- **Scope** : `supabase/migrations/044_agence_fans_handles_multi.sql` + `src/app/api/agence/fans/*`
- **Livrables** :
  - Migration : `agence_fans.handles jsonb` (web + insta + snap + fanvue)
  - API merge auto : fingerprint (IP + UA, fenêtre 7j) + trgm similarity > 0.9 sur handles
  - API merge manuel : `/api/agence/fans/[id]/merge` (déjà livré v1.1, étendre)
  - Backfill 18 clients legacy (résout P2-1)
  - Auto-link fan_id depuis IdentityGate (résout P1-8)
- **Skill** : general-purpose
- **QA** : tests merge (faux positifs / vrais positifs) + backfill intégral

### Agent 4.B — UI Messagerie + drawer Contacts (B7 + P0-11 + P1-3)
- **Scope** : `src/app/agence/messagerie/page.tsx` + composants
- **Livrables** :
  - Suppression tab Clients (redirect `/agence/clients` → `/agence/messagerie?view=contacts`)
  - Panneau Contacts intégré à la Messagerie
  - Drawer fan avec historique unifié (web + IG + Snap + Fanvue) et goûts/critères/envies
  - Timer Meta 24h window visible par conversation IG
  - Resolve threads sans fan_id (résout P0-11, P1-3)
  - Reply cross-canal avec fallback web si fenêtre IG expirée
- **Skill** : general-purpose
- **QA** : smoke test fusion 3 canaux + timer précis + reply multi-channel

**Gate Phase 4** : une seule zone pour CRM + conversations, fans unifiés.

---

## Phase 5 — Contenu + Packs drop&drag (B8 + P0-5/9 + P1-5 + P2-3)

**Prérequis** : Phase 1 (data model)
**Durée estimée** : 5-7 jours (restauration drop&drag coûteuse)
**Agents en parallèle** : 3 (parallélisable avec Phase 3 et 4)

### Agent 5.A — Restauration drag & drop
- **Scope** : recherche git history commit `9e93428`, récupération composants depuis `6078376`, `977f6ba`, `ae5c7f3`
- **Livrables** :
  - Composant `<PackComposer>` avec 3 vues : Dossiers / Colonnes / Liste
  - Drag & drop items → pack
  - Drag inter-packs
  - Retest compat post-merge Turborepo `d32a53f`
- **Skill** : general-purpose
- **QA** : test drag 20 items + cleanup + perf

### Agent 5.B — Règles visibilité packs (B8 + P0-5)
- **Scope** : `supabase/migrations/045_pack_visibility_rules.sql` + `src/app/api/packs/*`
- **Livrables** :
  - Migration : `agence_packs.visibility_rule` (enum `public`/`if_purchased`/`preview_blur`), `blur_intensity` (0-20), `preview_count` (int)
  - API applique règles au rendu feed
  - Cron sync feed utilise `agence_feed_items` (résout P0-5) et respecte règles
- **Skill** : general-purpose
- **QA** : 3 scénarios (fan public / fan payé / fan sans accès) + feed cohérent

### Agent 5.C — Upload Cloudinary direct signé + cross-post IG (B8 + P0-9 + P1-5 + P2-3)
- **Scope** : `src/app/api/upload/*` + composer post
- **Livrables** :
  - Signed URL Cloudinary TTL 5min (upload client direct)
  - Composer poste sync web + IG publish (résout P0-9, P1-5)
  - Re-upload Cloudinary automatique des posts IG sync (résout P2-3)
- **Skill** : vercel:performance-optimizer (pour cache + edge)
- **QA** : test upload 100MB + publish cross-canal + CDN persistent

**Gate Phase 5** : packs opérationnels avec règles + drag&drop + sync feed respecté.

---

## Phase 6 — Instagram dashboard affinée + Agent IA Yumi (B10/B11 + S6 BP)

**Prérequis** : Phases 1, 3, 5 + D-5 (clé IA)
**Durée estimée** : 5-7 jours
**Agents en parallèle** : 3

### Agent 6.A — Dashboard IG étendu (B10/B11)
- **Scope** : `src/app/agence/instagram/page.tsx`
- **Livrables** :
  - Onglets actuels (Posts / Commentaires / Config) + **nouvel onglet Agent IA** (config spécifique Yumi)
  - Posts visibles avec lien direct profil public Yumi + stats engagement
  - Config agent IA Yumi : DMs + commentaires + likes + stories (affinée)
  - Séparation claire : config agence-level (Phase 8) vs config Yumi-specific (ici)
- **Skill** : general-purpose
- **QA** : 4 tabs + config scope yumi uniquement

### Agent 6.B — Agent IA worker + prompt par Mode (S6 BP)
- **Scope** : `src/app/api/cron/process-ig-replies/route.ts` + `src/shared/lib/openrouter.ts`
- **Livrables** :
  - Implémentation complète worker (OpenRouter Claude Sonnet 4.6 + prompt caching)
  - Matrice scripts × Mode (A IA / B réelle) × Plan Identité (Découverte / Shadow)
  - Table `agence_ai_replies` (migration `046_*`)
  - Modes review/auto (review par défaut)
  - Escalade humaine si score > seuil
  - Funnel caming → PPV (UTM detection, upsell cam-origin)
- **Skill** : vercel:ai-architect (agent design) + general-purpose
- **QA** : test 10 DMs Yumi + coût mesuré ≤ $0.008/reply + modération filter

### Agent 6.C — Observabilité & indicateurs (P1-7)
- **Scope** : `src/app/agence/ops/` + `src/shared/lib/ops-metrics.ts`
- **Livrables** :
  - Indicateur visible dans Dashboard « Sync IG : OK / En cours / Échec » (résout P1-7)
  - Métriques agent IA (latency, coût/jour, escalades)
  - Alerte si quota Meta < 20 %
- **Skill** : general-purpose
- **QA** : dashboard Ops lit métriques live

**Gate Phase 6** : agent IA en review mode actif sur Yumi + visible dans Dashboard.

---

## Phase 7 — Stratégie 3 Plans A/B/C + Release Form (B6 + S3 BP + S2 BP)

**Prérequis** : Phases 1, 2
**Durée estimée** : 5-7 jours
**Agents en parallèle** : 3

### Agent 7.A — Tab Stratégie refondue (B6)
- **Scope** : `src/app/agence/strategie/page.tsx` (nouveau ou extrait Phase 2)
- **Livrables** :
  - Refonte avec 3 onglets : Plan A (Yumi IA) / Plan B (modèles physiques) / Plan C (consultance indépendante)
  - Chaque onglet : objectifs + KPI cibles + status + next steps (tirés de `01-strategy/ROADMAP-v1`)
  - Vue spécifique « visage / sans visage » pour Plan C (B6)
- **Skill** : general-purpose
- **QA** : navigation tabs + data live

### Agent 7.B — Release Form DMCA workflow (B6 + S3 BP)
- **Scope** : `src/app/agence/models/[id]/dmca/` + `src/app/api/agence/dmca/*`
- **Livrables** :
  - Bucket Supabase privé `dmca-dossiers` + RLS scope `dmca:read`
  - Composant `<ReleaseFormUploader>` 5 uploads séquentiels (Release Form signé + ID recto/verso + headshot daté + full body)
  - State machine : `pending` → `documents_collected` → `submitted_dmca` → `validated`/`rejected`
  - Template email pré-rempli `mailto:DMCA@fanvue.com?subject=...&body=...`
  - Blocage publication si `release_form_status != validated`
  - Release Form **pré-remplissable par la modèle** (B6) via portail modèle dédié
- **Skill** : general-purpose
- **QA** : 5 uploads + validation séquentielle + template email + blocage publi

### Agent 7.C — Contrats + dossier infos (B6 + S2 BP)
- **Scope** : `src/app/agence/models/[id]/contract/` + templates
- **Livrables** :
  - Panel Plan Identité (radio Découverte/Shadow + guidelines + impact coût prod)
  - Panel Palier rémunération (courant + simulateur revenu)
  - Panel Statut initial (enum + bouton « Vérifié ONEM »)
  - Bucket `contracts-private` + versioning contrat
  - Template contrat Agence↔Modèle par Mode (A/B/C) + par Plan Identité
  - Dossier infos + stratégie commerciale (pour Mode C)
- **Skill** : general-purpose
- **QA** : template contrat généré + version signée stockée + accès RLS

**Gate Phase 7** : onboarding modèle Mode B complet (Plan Identité + Palier + Release Form + Contrat).

---

## Phase 8 — Agence Modules Template (B5 + S5/S6 BP)

**Prérequis** : Phase 6 (agent IA Yumi validé)
**Durée estimée** : 6-8 jours
**Agents en parallèle** : 3

### Agent 8.A — Module Agent DM template réplicable (B5 + B11)
- **Scope** : `src/app/agence/agent-dm/` + config per-modèle
- **Livrables** :
  - Module « Agent DM » dans section Agence (générique)
  - Config template dérivée de Yumi (Phase 6)
  - Surcharges fines par modèle (paloma/ruby) : persona, scripts, funnel
  - Assignment UI : activer Agent DM pour X modèle
  - Instance dédiée par modèle avec rate limit propre
- **Skill** : general-purpose
- **QA** : activation template sur paloma → agent opérationnel

### Agent 8.B — Module Finance + Commission auto (S5 BP)
- **Scope** : `src/app/agence/finances/` + cron mensuel
- **Livrables** :
  - Vue matérialisée `agence_commission_calcul` (créée Phase 1)
  - Cron fin de mois : calcul net distribuable + part modèle 70 % + part Sqwensy 30 %
  - Génération PDF justificatif :
    - P1/P2 : note de paiement régime mobilier
    - P3/P4 : état préparation facturation (+ simple facture à envoyer)
  - Alertes bascule palier : 3 mois > 750 € → notif admin + pré-rempli guichet entreprise BE
  - Vue consolidée par modèle + bascules en attente
- **Skill** : general-purpose
- **QA** : calcul exemple 300 € / 800 € / 2000 € brut → résultat conforme BP

### Agent 8.C — Module Ops étendu (déjà partiel v1.1)
- **Scope** : `src/app/agence/ops/`
- **Livrables** :
  - KPIs existants conservés
  - **Nouveaux KPIs caming** (Phase 9) — hook d'extension
  - Module réplicable pour activation par modèle
- **Skill** : general-purpose
- **QA** : KPIs live sur yumi + activable paloma

**Gate Phase 8** : 3 modules Agence (Agent DM / Finance / Ops) templatables + activables par modèle.

---

## Phase 9 — Caming tracking (S4 BP + D-8)

**Prérequis** : D-7 (ouverture Mode B) + D-8 (platform)
**Durée estimée** : 4-5 jours
**Agents en parallèle** : 2

### Agent 9.A — Backend caming sessions
- **Scope** : `src/app/api/agence/caming/*` + table `agence_caming_sessions`
- **Livrables** :
  - CRUD sessions cam admin
  - UTM dynamique Beacon : `?utm_source=cam&utm_medium={platform}&utm_campaign=session_{uuid}`
  - Attribution cron quotidienne : nouveaux abonnés Fanvue ↔ sessions cam (UTM match, fenêtre J+7)
  - Enrichissement `agence_revenus_modele` avec `caming_session_id` + `acquisition_channel`
- **Skill** : general-purpose
- **QA** : création session test + UTM tracké + attribution J+7 validée

### Agent 9.B — Dashboard `/agence/caming`
- **Scope** : `src/app/agence/caming/page.tsx`
- **Livrables** :
  - Sessions actives en temps réel
  - Viewers estimés + tokens + tips
  - Conversion cam → Fanvue par session
  - Planning live
  - Intégration KPIs Ops (Phase 8.C)
- **Skill** : general-purpose
- **QA** : visuel clair + data live + planning éditable

**Gate Phase 9** : funnel caming opérationnel pour Mode B Paloma/Ruby.

---

## Phase 10 — Comptes & Accès + 4 modes (B3/B4/B5)

**Prérequis** : Phase 1 (data model auth) + Phase 7 (modèles complets)
**Durée estimée** : 3-5 jours
**Agents en parallèle** : 2

### Agent 10.A — Panel « Comptes » unifié (B2 + B3)
- **Scope** : `src/app/agence/settings/comptes/` (déjà structure Phase 2)
- **Livrables** :
  - 4 comptes visibles pour Yumi admin : root / yumi / paloma / ruby
  - Gestion codes + accès + modules actifs par compte
  - Activation modules Agence (Agent DM / Finance / Ops) per-modèle
  - Supprimer tab Codes séparée (fusion B2)
- **Skill** : general-purpose
- **QA** : yumi admin voit/gère 3 modèles + scope model_id préservé

### Agent 10.B — 4 modes d'accès (B5)
- **Scope** : `src/config/roles/*` + middleware + UI conditionnelle
- **Livrables** :
  - Mode **Dev root** : édition infos/corrections + options dev (Settings Dev Center)
  - Mode **Agence** : vue agrégée 3 modèles + modules standardisés
  - Mode **Modèle** : scope own profile uniquement
  - Mode **Public** : page profil sans auth (selon Plan Identité)
  - Matrice permissions actualisée dans `plans/03-tech/SECURITY-v1`
- **Skill** : general-purpose
- **QA** : 4 scénarios testés (login root / login yumi / login paloma / visite publique)

**Gate Phase 10** : structure admin cohérente, paloma/ruby peuvent gérer leur propre profil.

---

## Phase 11 — Business Verification Meta + App Review + Cron infra (D-4 + D-6)

**Prérequis** : D-4 + D-6 validés + NB fournit docs BCE
**Durée estimée** : 2-4 semaines (meta review latency)
**Agents en parallèle** : 2 (dev) + NB (docs)

### Agent 11.A — Migration cron worker externe (D-6 + P1-1)
- **Scope** : `src/app/api/cron/process-ig-replies/` + config externe
- **Livrables** :
  - Setup Upstash QStash (gratuit) ou Vercel Pro ou GitHub Actions
  - Webhook signed + `CRON_SECRET` variable env
  - Schedule 1-5 min (vs Hobby 1/jour max)
  - Monitoring temps d'exécution + retry policy
- **Skill** : vercel:deployment-expert
- **QA** : worker run chaque 5 min, queue consommée, latency < 30s

### Agent 11.B — Conversion icone + screencast (NB action)
- **Scope** : `public/meta/yumi-ai-icon.svg` → PNG 1024×1024 + vidéo 2-3 min
- **Livrables NB** :
  - Conversion SVG → PNG (cloudconvert.com ou Figma)
  - Screencast vidéo 2-3 min selon scénario `SPEC-meta-app-review-v1.2026-04-21.md` §5
  - Soumission Business Verification SQWENSY (docs BCE)
  - Soumission App Review permissions IG
- **Skill** : — (NB humain)
- **QA** : Meta validation reçue (2-4 semaines)

**Gate Phase 11** : worker IA auto + App Review validée → agent review → auto.

---

## Phase 12 — Observabilité + QA + Docs end-to-end

**Prérequis** : Phases 1-11
**Durée estimée** : 3-4 jours
**Agents en parallèle** : 3

### Agent 12.A — QA full-stack
- **Scope** : tests E2E Playwright + smoke tests
- **Livrables** :
  - Test login 4 comptes
  - Test onboarding Mode B complet (signature → Release Form → premier drop)
  - Test funnel caming → PPV
  - Test agent IA mode review → mode auto
  - Test commission mensuelle
- **Skill** : general-purpose
- **QA** : 100 % scénarios critiques passent

### Agent 12.B — Docs utilisateur (Paloma/Ruby onboarding)
- **Scope** : `docs/ONBOARDING-MODELE.md` + guide portail modèle
- **Livrables** :
  - Guide pas-à-pas : signature → Release Form → profil → calendrier drops
  - FAQ juridique BE (droit à l'image, INASTI, Article 48 ONEM)
  - Vidéo tuto portail modèle
- **Skill** : general-purpose (ou brand-voice pour ton)
- **QA** : test NB lisibilité + NB fait lire à une modèle

### Agent 12.C — Docs plans V2 final sync (protocole de mise à jour)
- **Scope** : application du protocole `PROTOCOLE-MISE-A-JOUR.md` sur tout ce qui a changé
- **Livrables** :
  - Rapports horodatés dans `plans/_reports/`
  - CHANGELOG modules actualisés
  - ADRs ajoutés pour décisions structurelles Phase 1-11
  - Indexes finalisés
- **Skill** : general-purpose
- **QA** : protocole respecté, tous CHANGELOG à jour

**Gate Phase 12** : Heaven prêt pour scale M6+ du BP.

---

## Récapitulatif séquencement

```
Phase 0 (NB décisions) ─────────────────┬──────────────┐
                                        │              │
Phase 1 (Data Model + Auth) ────────────┼──────────────┼──── indépendant
                                        │              │
                     ┌──────────────────┴──────────┐   │
                     │                             │   │
Phase 2 (Nav + Settings) ──┬──────────────────┐   │   │
                           │                  │   │   │
         ┌─────────────────┼─────┬────────────┼───┤   │
         │                 │     │            │   │   │
Phase 3 ─┘  Phase 4 ──────┘  Phase 5 ────────┘   │   │  (parallèles)
                                                  │   │
                         ┌────────────────────────┤   │
                         │                        │   │
Phase 6 (Agent IA) ──────┘ (après D-5)            │   │
                                                  │   │
Phase 7 (Stratégie + Release Form) ───────────────┘   │
                                                      │
Phase 8 (Agence modules) ─────────────────────────────┤
                                                      │
Phase 9 (Caming) ──────────────────────── (après D-7/D-8)
                                                      │
Phase 10 (Comptes + 4 modes) ─────────────────────────┘
                                                      │
Phase 11 (Biz Verif + Cron infra) ─── (après D-4/D-6) │
                                                      │
Phase 12 (QA + Docs) ────────────────── (fin orchestration)
```

---

## Règles d'exécution multi-agent

1. **Jamais 2 agents sur le même fichier** dans une même phase (éviter conflits git)
2. **Agent QA systématique** en fin de phase (1 agent dédié relecture + tests)
3. **Protocole mise à jour plans** appliqué après chaque phase → rapport horodaté
4. **Commit séparé plans vs code** pour lisibilité git log
5. **Rollback possible** : chaque phase doit être rollbackable via `git revert <sha>` sans casser les suivantes
6. **GO NB explicite** avant démarrage de chaque phase (sauf si NB dit « GO direct toutes phases »)
7. **ADR obligatoire** si décision structurelle imprévue émerge en cours de phase
8. **Skills** activés selon nature :
   - `vercel:ai-architect` : agent IA worker (Phase 6)
   - `vercel:deployment-expert` : migration cron (Phase 11)
   - `vercel:performance-optimizer` : cache + edge (Phase 5.C)
   - `general-purpose` : toutes les autres

---

## Dépendances cross-phases critiques

| De | Vers | Raison |
|---|---|---|
| Phase 0 | Phase 2 | D-1/D-2/D-3 navigation |
| Phase 0 | Phase 6 | D-5 clé IA |
| Phase 0 | Phase 9 | D-7/D-8 Mode B + caming |
| Phase 0 | Phase 11 | D-4 Business Verif + D-6 cron |
| Phase 1 | Phase 2-10 | Data model requis |
| Phase 2 | Phase 3-10 | Navigation et monolithe décomposé |
| Phase 6 | Phase 8.A | Agent DM template dérivé Yumi |
| Phase 7 | Phase 9-10 | Onboarding modèle + contrats requis |
| Phase 11 | Go-live prod | App Review Meta |

---

## Livrables finaux attendus (fin Phase 12)

- ✅ Plateforme `heaven-os.vercel.app` avec navigation V2 complète
- ✅ 3 modèles opérationnels (Yumi Mode A + Paloma/Ruby Mode B)
- ✅ Agent IA conversationnel review/auto, coût mesurable
- ✅ Release Form DMCA pré-remplissable + workflow complet
- ✅ Caming tracking avec attribution PPV
- ✅ Commission auto mensuelle avec bascule palier
- ✅ 4 modes d'accès opérationnels (Dev / Agence / Modèle / Public)
- ✅ App Review Meta validée (DMs prod IG)
- ✅ Documentation utilisateur + plans V2 à jour
- ✅ Prêt pour M6 milestone BP (≥ 2 modèles B actives + ≥ 400 €/mois A+B)

---

## Estimation globale

| Phase | Durée | Agents | Parallélisable avec |
|---|---|---|---|
| 0 | NB dépend | 0 | — |
| 1 | 3-5j | 3 | — |
| 2 | 4-6j | 3 | — |
| 3 | 4-5j | 2 | 4, 5 |
| 4 | 4-5j | 2 | 3, 5 |
| 5 | 5-7j | 3 | 3, 4 |
| 6 | 5-7j | 3 | — (après Phase 5) |
| 7 | 5-7j | 3 | — (après Phase 6) |
| 8 | 6-8j | 3 | — (après Phase 6) |
| 9 | 4-5j | 2 | 10 |
| 10 | 3-5j | 2 | 9 |
| 11 | 2-4 sem | 2 (+NB) | 12 |
| 12 | 3-4j | 3 | 11 |

**Durée séquentielle minimale** (si toutes phases enchaînent) : ~7-9 semaines dev + 2-4 semaines Meta review.
**Durée optimisée** (avec parallélisation phases 3/4/5 et 9/10) : **~5-6 semaines** dev + 2-4 sem Meta.

---

## Prochaines étapes immédiates

1. NB valide ce plan global (ou ajuste)
2. NB se positionne sur les 8 décisions bloquantes (D-1 à D-8)
3. Phase 1 démarre immédiatement (indépendante des décisions)
4. Au fur et à mesure des validations D-X, débloquer phases suivantes
5. Appliquer protocole mise à jour plans après chaque phase (rapport horodaté)

**Pas de code avant GO NB explicite sur Phase 1 ou autres phases validées.**

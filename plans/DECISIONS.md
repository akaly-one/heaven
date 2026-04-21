# Decisions — ADRs globaux Heaven

> Format : Context / Decision / Consequences (Michael Nygard)
> Append-only. Jamais éditer une ADR "Accepted" — superseder via ADR-N+1 référencée.
> Standard : [`STANDARD-SUIVI-PROJET.md`](./STANDARD-SUIVI-PROJET.md) §6.1

---

## ADR-001 — Adoption du Standard de Suivi de Projet V2

**Date** : 2026-04-21
**Status** : Accepted

### Context
Avant V2, la documentation Heaven accumulait fichiers `.md` en racine `plans/` et sous-dossiers sans nomenclature cohérente. Difficulté pour Claude Code et humains à :
- Savoir à quoi sert chaque fichier
- Distinguer vieux/récent
- Suivre le fil de construction
- Éviter doublons et fichiers intermédiaires perdus

### Decision
Adopter le Standard cross-CP `STANDARD-SUIVI-PROJET.md` (sqwensy-os/docs/) inspiré de :
- **arc42** (template architecture)
- **C4 Model** (niveaux 1-4)
- **Diátaxis** (4 types docs)
- **ADRs Nygard** (décisions append-only)
- **CLAUDE.md hiérarchique** (contexte local Claude Code)

Arborescence : couches transverses `00-brief/` → `04-ops/` + `modules/<nom>/` + `business/` + `operations/` + `_archive-v1/`.

Nomenclature : `<TYPE>-<scope?>-v<N>.<YYYY-MM-DD>.md` (anglais MAJUSCULES + date ISO).

### Consequences
- ✅ Navigation scan <1 min via `README.md` index
- ✅ Fichiers clairement typés (TYPE + version + date)
- ✅ Modules autonomes pour Claude Code (charge uniquement ce qu'il faut)
- ✅ Cross-CP : JPS/OPearly/SQWENSY appliqueront même standard
- ⚠️ Migration initiale coûteuse (déplacement + rapatriement)
- ⚠️ Discipline équipe requise pour respecter le standard dans le temps

---

## ADR-002 — Archivage structure V1 dans `plans_01/`

**Date** : 2026-04-21
**Status** : Accepted

### Context
La structure V1 contenait 26 fichiers `.md` éparpillés (plans/, tech/, product/, security/, etc.) avec contenu utile mais organisation incohérente. Refonte V2 nécessite table rase ciblée.

### Decision
Tout le contenu V1 est déplacé dans `plans/plans_01/` (sous-dossier). Depuis `plans_01/`, seuls les dossiers conformes V2 sont rapatriés vers `plans/` :
- `business/bp-agence-heaven-2026-04/` (Cowork, structure déjà V2)
- `modules/{dashboard,profil-public,messagerie-contacts,contenu-packs}/` (créés V2-compatible, après renommage STRATEGIE→STRATEGY, INFRA→TECH)

Le reste dans `plans_01/` est préservé read-only comme archive.

### Consequences
- ✅ Zéro perte de contenu (archive préservée intégralement)
- ✅ Structure V2 propre sans fichiers intermédiaires
- ✅ Retour en arrière possible si besoin (cp `plans_01/<X>` vers racine)
- ⚠️ Dédoublement temporaire (V1 dans plans_01/ + V2 dans plans/) jusqu'à suppression explicite

---

## ADR-003 — Séparation STRATEGY (ex STRATEGIE) et TECH (ex INFRA) en anglais

**Date** : 2026-04-21
**Status** : Accepted

### Context
Les 4 modules V1 utilisaient `STRATEGIE-` et `INFRA-` (français/mixte). Incohérence avec standards internationaux (arc42, C4, ADRs sont en anglais).

### Decision
Nomenclature TYPE uniformément en anglais MAJUSCULES : `STRATEGY-`, `TECH-`, `DESIGN-`, `BUSINESS-`, `ROADMAP-`, etc.

Renommage rétroactif des 4 modules rapatriés : `STRATEGIE-v1.*` → `STRATEGY-v1.*`, `INFRA-v1.*` → `TECH-v1.*`.

### Consequences
- ✅ Aligné sur standards internationaux
- ✅ Cross-CP cohérent
- ✅ Évite ambiguïté FR/EN
- ⚠️ Fichiers existants à renommer (fait pour les 4 modules V1)

---

## ADR-004 — Modules "briefs NB" non implémentés à créer progressivement

**Date** : 2026-04-21
**Status** : Accepted

### Context
Briefs NB (B1-B11) identifient 9 modules supplémentaires à créer : `instagram`, `strategie`, `agence-modules`, `settings-dev-center`, `comptes-acces`, `tech-infra`, `ops-maintenance`, `design`, `models`.

### Decision
Créer ces modules **au fur et à mesure** des besoins (pas en batch prématuré), selon la priorité définie dans le BP et les décisions NB pending (D-1 à D-8).

Les briefs NB (B1-B11) déjà captés restent en référence (voir `plans_01/` + conversation actuelle).

### Consequences
- ✅ Évite la création de fichiers vides/incomplets
- ✅ Focus sur les modules à impact immédiat
- ⚠️ Risque de perte des briefs si pas formalisés à temps → à rappeler lors de chaque dispatch

---

## ADR-005 — Protocole obligatoire mise à jour plans

**Date** : 2026-04-21
**Status** : Accepted

### Context
NB travaille sur plusieurs CPs et veut qu'un seul déclencheur « met à jour le plan » suffise pour que tout soit mis à jour intelligemment, sans avoir à spécifier chaque fichier. Besoin de traçabilité totale (rapport horodaté), de cohérence (versioning + ADR), et de validation avant écriture.

### Decision
Création de `plans/PROTOCOLE-MISE-A-JOUR.md` obligatoire dans le CP Heaven. Référencé dans `CLAUDE.md` racine Heaven pour application automatique.

Workflow : détection CP (CWD) → analyse session+diff → mapping modules → versioning (mineur/majeur/ADR) → rapport horodaté `plans/_reports/UPDATE-REPORT-YYYY-MM-DD-HHMM.md` → validation NB → commit git séparé `docs(plans): update report ...`.

Déclencheurs reconnus : « met à jour le plan », « update le plan », « synchronise les plans », « reflète ça dans les plans », « actualise la doc plan », « commit les changements plan ».

### Consequences
- ✅ Un seul déclencheur suffit, pas besoin de spécifier chaque fichier
- ✅ Traçabilité complète via rapports horodatés
- ✅ Validation systématique avant écriture (sauf « GO direct »)
- ✅ Versioning cohérent (mineur/majeur distincts)
- ⚠️ Discipline de suivi obligatoire pour Claude Code
- ⚠️ Première application attendue lors du prochain « met à jour le plan » NB
- 🔁 À dupliquer dans JPS, OPearly, SQWENSY OS quand NB validera (mentionné dans protocole §10)

---

## ADR-006 — Complétude masterplan V2 via 4 fichiers couches `00-brief` + `01-strategy`

**Date** : 2026-04-21
**Status** : Accepted

### Context
L'ancien `HEAVEN-MASTERPLAN-2026.md` V1 (36 KB) mélangeait vision / business / roadmap / risques / brief en un seul fichier monolithe. La V2 fractionne mais laissait des trous (pas de BRIEF, SYNERGY, BUSINESS, RISKS dédiés).

### Decision
Création de 4 fichiers pour compléter la couche masterplan V2, **sans duplication** (chacun pointe vers les sources de vérité) :
- `00-brief/BRIEF-v1.2026-04-21.md` — pitch projet, origine, pour qui
- `00-brief/SYNERGY-v1.2026-04-21.md` — rapport écosystème SQWENSY (confidentialité + intégrations)
- `01-strategy/BUSINESS-v1.2026-04-21.md` — BP synthétique avec pointers vers BP Cowork
- `01-strategy/RISKS-v1.2026-04-21.md` — matrice risques + mitigations

### Consequences
- ✅ Masterplan V2 désormais complet (5 fichiers couches `01-strategy/` + 4 fichiers `00-brief/`)
- ✅ Pas de duplication (BP Cowork reste source vérité, ces fichiers pointent)
- ✅ Claude Code peut charger sélectivement (ex: `RISKS` seul si audit risques)
- ⚠️ Maintenance : chaque refonte du BP Cowork → mise à jour des 4 fichiers via ADR

---

## ADR-007 — Suppression définitive `plans_01/`

**Date** : 2026-04-21
**Status** : Accepted

### Context
`plans_01/` contenait la structure V1 (26 fichiers) comme archive temporaire pendant la migration V2. Après rapatriement des 17 fichiers pertinents + validation que les 5 restants étaient bien obsolètes (NOMENCLATURE V1, README V1, masterplan V1, contexte-financier legacy, README-archive), NB a autorisé la suppression définitive.

### Decision
Suppression complète de `plans_01/` avec `rm -rf`. Les fichiers vraiment actionnables sont dans la V2 + leurs CHANGELOG documentent leur origine. L'ADR-002 trace l'historique de la migration.

### Consequences
- ✅ Structure plans/ V2 propre, plus de dédoublement
- ✅ Réduction disk (~17 KB libérés)
- ✅ Scan visuel plus simple
- ⚠️ Pas de retour en arrière possible hors `git log`
- ℹ️ Pour audit historique : `git show <commit-avant-V2>:plans/` permet de consulter

---

## ADR-008 — Fusion `yumi` = admin agence + modèle IA

**Date** : 2026-04-21
**Status** : Accepted

### Context
Brief NB B3 : 3 comptes fixes (root / yumi / agence) devenus 2 après clarification B3bis (yumi = fusion agence + modèle IA). Avant Phase 1, la structure DB pouvait avoir un compte `agence` séparé et un compte `yumi` modèle distinct.

### Decision
Migration `043_agence_accounts_refonte.sql` fusionne : si compte `agence` existait standalone, ses aliases sont transférés à `yumi` et `agence` est désactivé. Le compte `yumi` conservé devient l'admin principal Heaven avec `role='root'` (compat 30+ fichiers) + alias sémantique `admin` + scopes étendus `["dmca:read", "dmca:write", "contract:view", "palier:escalate", "identity:view_legal", ...]`.

### Consequences
- ✅ Un seul admin principal visible dans l'interface
- ✅ Zéro duplication de rôle
- ✅ Scopes granulaires permettent contrôle fin (pas besoin de 10 rôles distincts)
- ⚠️ Pas de revenir en arrière sans migration inverse (accepté, pattern one-way clair)

---

## ADR-009 — Conservation `role='root'` en DB, alias sémantique `admin`

**Date** : 2026-04-21
**Status** : Accepted

### Context
Plan SECURITY V2 utilise `role='admin'` comme standard international. Mais 30+ fichiers existants dans `src/` comparent à `'root'` (`requireRoot()`, middleware, model-context, sidebar, etc.). Un rename massif serait risqué (régressions potentielles).

### Decision
Conserver `role='root'` en DB. Dans la matrice permissions et les docs, `'admin'` est l'**alias sémantique** (facile pour nouveaux devs). La fonction `isAdmin(session)` retourne `true` pour les deux valeurs (`'root' | 'admin'`).

Futur : refactor progressif vers `'admin'` uniquement (Phase future dédiée, ADR-X « Rename root → admin full » avec superseded).

### Consequences
- ✅ Zéro régression sur 30+ fichiers existants
- ✅ Compatibilité ascendante garantie
- ✅ Vocabulaire docs aligné standard (`admin`)
- ⚠️ Double terminologie temporaire (root DB, admin docs) → documenter clairement

---

## ADR-010 — Drag & drop HTML5 natif conservé (pas de `@dnd-kit`/`react-dnd`)

**Date** : 2026-04-21
**Status** : Accepted

### Context
Brief B8 mentionnait « restaurer drag & drop qui avait été cassé/supprimé ». L'investigation git history par Agent 5.A (commits `977f6ba`, `ae5c7f3`, `6078376`, `9e93428`) révèle que le DnD HTML5 natif **n'est pas cassé** dans `src/app/agence/page.tsx` (handlers `useCallback` + `dataTransfer.setData('application/json', ...)`). Le commit `9e93428` supprimait `/agence/contenu/page.tsx` après fusion dans dashboard monolithe — pas de perte fonctionnelle réelle.

### Decision
Conserver le DnD HTML5 natif. Extraction en composants réutilisables (`content-draggable-item.tsx`, `pack-drop-zone.tsx`, `pack-composer.tsx`) pour Phase 2 refactor futur. **Aucune dépendance `@dnd-kit` ou `react-dnd` ajoutée**.

### Consequences
- ✅ Cohérent avec feedback memory `extreme_cost_optimization_2026` (stack minimale)
- ✅ Moins de dépendances npm → moins de surface d'attaque + bundle plus léger
- ✅ DnD existant fonctionnel, extraction non-destructive
- ⚠️ Si besoin futur DnD mobile touch complexe, re-évaluer (actuellement commit `ae5c7f3` couvre le touch basique)

---

## ADR-011 — Backfill auto-merge fans depuis `agence_clients` legacy

**Date** : 2026-04-21
**Status** : Accepted

### Context
Défaut audit P2-1 : 18 clients legacy dans `agence_clients`, majorité orphan (pas de `fan_id` associé). Brief B7 demande fusion contacts multi-canal. Besoin de backfill initial + mécanisme continu.

### Decision
Script idempotent `supabase/scripts/backfill-fans-2026-04-21.sql` en 4 étapes (link-by-snap, link-by-insta, create-new-fans, cross-fill). Exécuté : **15 clients orphan → 0 orphan**, 15 nouveaux `agence_fans` créés avec `handles` jsonb peuplé.

Mécanisme continu auto-merge via `findMergeCandidates` (helper `fan-matcher.ts`) basé sur :
1. Match handle exact (score 1.0)
2. Fingerprint `SHA256(ip|user-agent)` dans fenêtre 7j (score 0.9)
3. Trigram similarity pseudos ≥ 0.9 (score variable)

**Auto-apply seuil ≥ 0.95** (haute confiance seulement). En-dessous : review admin via UI drawer.

### Consequences
- ✅ P2-1 résolu (0 orphan)
- ✅ Qualité data long-terme (pas de duplication par canal)
- ✅ Audit via `merge_history` jsonb (trace merges successifs)
- ⚠️ `agence_clients` n'a pas colonne IP/UA → pas de fingerprint rétroactif (seulement nouveaux hits)
- ⚠️ Risque faux positifs si seuil trop bas → gardé à 0.95 pour auto, 0.7-0.95 pour review manuel

---

## ADR-012 — Métadonnées Instagram sur `agence_feed_items.source_payload.ig`

**Date** : 2026-04-21
**Status** : Accepted

### Context
Phase 5.C (cross-post IG) et Phase 6 (agent IA) doivent stocker des métadonnées Instagram (ig_media_id, published_at, engagement stats, mirror Cloudinary status). La table `agence_posts` originale n'a pas de colonne jsonb. La table polymorphe `agence_feed_items` (migration 038) a déjà `source_payload jsonb`.

### Decision
Stocker les métadonnées IG sur `agence_feed_items.source_payload.ig` (jsonb imbriqué) :
```json
{
  "ig": {
    "ig_media_id": "17841400193217961_...",
    "creation_id": "...",
    "published_at": "2026-04-21T20:34:00Z",
    "mirror": {
      "public_id": "heaven/m1/instagram-mirror/...",
      "url": "https://res.cloudinary.com/...",
      "at": "2026-04-21T20:40:00Z"
    },
    "meta_url_original": "https://scontent-...fbcdn.net/..."
  }
}
```

Pas de nouvelle colonne SQL ajoutée. Idempotence via check `source_payload.ig.ig_media_id` (évite double publish).

### Consequences
- ✅ Pas de migration destructive
- ✅ Pattern cohérent avec le design polymorphe de `agence_feed_items` (source_type + source_payload)
- ✅ Permet extension future (autres plateformes : onlyfans, mym avec même pattern)
- ⚠️ Queries complexes si besoin d'index sur ig_media_id : jsonb path index à ajouter si scale

---

## ADR-013 — Adoption défauts D-1 / D-2 / D-3 en mode autonome (navigation)

**Date** : 2026-04-21
**Status** : Accepted (revisable)

### Context
NB a passé en mode autonome (`<<autonomous-loop-dynamic>>`) et demandé « merge et continue ». Phase 2 du plan multi-agent nécessite les décisions D-1/D-2/D-3 pour démarrer. Ces décisions étaient en attente de validation explicite NB depuis la création du plan.

### Decision
Adoption des défauts recommandés du plan (`plans/operations/ROADMAP-multiagent-execution-v1.2026-04-21.md` §Phase 0) :
- **D-1 : Option 1 — Sidebar 1:1 avec pages** (URLs dédiées par section, middleware redirect `/agence?tab=X` → `/agence/X` pour backcompat)
- **D-2 : Garder `/agence`** (pas de renaming racine URL — évite casser bookmarks externes + Vercel config)
- **D-3 : Sidebar expanded default + toggle persistant** (localStorage, meilleure discoverability)

### Consequences
- ✅ Phase 2 peut démarrer sans attendre validation manuelle
- ✅ Choix conformes aux recommandations documentées
- ✅ Backcompat préservée via middleware redirect
- ⚠️ NB peut superseder cette ADR plus tard s'il veut l'Option 2 ou autre
- ⚠️ Toggle localStorage nécessite hydration SSR correcte (à vérifier par Agent 2.A)

### Scope
S'applique uniquement aux décisions de navigation. D-4/D-5/D-6/D-7/D-8 restent en attente NB (impliquent actions externes : Business Verif, clé IA, infra cron, modèle Mode B, platform caming).

---

_ADRs append-only. Nouvelle décision → ADR-014, jamais d'édit rétroactif sauf "Superseded by ADR-N"._

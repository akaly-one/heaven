# Heaven — Roadmap mise à niveau (21 avril 2026)

> **Statut** : document maître de correction / mise à niveau post-audit 4 agents
> **Dépendances amont** :
> - **`business/bp-agence-heaven-2026-04/README.md`** — BP v1 source de vérité business (3 Modes + paliers + DMCA + caming)
> - `HEAVEN-MASTERPLAN-2026.md` — vision stratégique 2026-2027
> - `product/roadmap.md` — sprints S1-S7 d'implémentation BP
> **Horizon** : 2-4 semaines pour livrer 100% corrigé + prêt Meta App Review
> **Règle** : n'implémenter aucune phase sans GO explicite NB

---

## ⚙️ Articulation avec le BP Cowork

Ce document = **roadmap technique** (défauts, refactor, infra). Le **BP Cowork** (`business/bp-agence-heaven-2026-04/`) = **source business** (3 Modes A/B/C, paliers P1-P4, DMCA, caming).

**Ordre d'exécution global recommandé** :
1. Débloquer décisions D-1 à D-6 NB (roadmap technique)
2. Livrer Modules A-I techniques (ce doc) → infra prête
3. Puis dérouler Sprints S1-S7 du BP (`product/roadmap.md`) → features business

Les deux ne se chevauchent pas : D-1/D-2/D-3 = navigation, D-4 = Meta App Review, D-5 = clé IA, D-6 = cron infra. **Les sprints BP exigent ces 6 décisions** avant démarrage S1.

---

## 0 — Contexte

Audit complet réalisé le 21 avril 2026 via 4 agents parallèles (UI, media-stack, messagerie-unifié, scalabilité). Puis session de corrections immédiates : migrations 038/038b appliquées, 5 phases livrées + pushées sur main, 21 posts Instagram synchronisés en DB, pages légales Meta (privacy/terms/data-deletion) publiées en prod.

Cette roadmap intègre :
1. Les défauts identifiés par les agents + par NB en usage CP
2. Les décisions en suspens (navigation cockpit, Business Verification structure, clé IA)
3. Le plan de correction par priorité + par module

---

## 1 — Défauts recensés (triés par criticité)

### 1.1 P0 — bloquants usage ou publication

| # | Défaut | Module | Source audit |
|---|--------|--------|--------------|
| P0-1 | Navigation tabs `/agence?tab=...` vs pages sidebar = double système confus | Frontend nav | Audit agent UI + observation NB |
| P0-2 | Sidebar collapsed par défaut, labels invisibles — UX opaque | Frontend nav | Observation NB |
| P0-3 | Naming incohérent « Contacts » (sidebar) ≠ « Clients » (tab) | Naming | Audit agent UI |
| P0-4 | Nom `/agence` ambigu (racine CP perso Yumi) | Routing | Observation NB |
| P0-5 | Tab « Contenu » lit `agence_posts` pas `agence_feed_items` → 21 posts IG invisibles côté admin | Data binding | Audit agent media |
| P0-6 | Page `/m/yumi` feed public n'affiche pas encore les 21 posts IG (deploy Vercel décalé) | Deploy | Test curl |
| P0-7 | `agence/page.tsx` = 2 453 lignes — monolithe ingérable | Structure code | Audit agent UI |
| P0-8 | `clients-panel.tsx` = 1 351 lignes | Structure code | Audit agent UI |
| P0-9 | Composer post wall_posts uniquement, pas sync Instagram publish | Backend | Audit agent media |
| P0-10 | Header profil `/m/yumi` : bouton Login parfois manquant (condition `onReopenGate`) | Frontend | Rapport NB |
| P0-11 | Conversations legacy pseudo-fan affichent thread vide (pas de fan_id réel) | Backend inbox | Test NB |
| P0-12 | Widget IG Dashboard affiche « Sync jamais » (cron pas encore tourné) | Display | Test NB |

### 1.2 P1 — importants pour qualité

| # | Défaut | Module |
|---|--------|--------|
| P1-1 | Worker `process-ig-replies` désactivé (plan Vercel Hobby limite crons à 1/jour) | Scaling |
| P1-2 | Cache Webpack `.next` corrompu en dev récurrent (Next.js 15 bug) — workaround `rm .next` | DevX |
| P1-3 | Thread fan sans fan_id réel = conversation vide (pseudo:X) | Backend |
| P1-4 | Icônes sidebar sans labels au premier rendu | Frontend |
| P1-5 | Tab « Feed » composer poste uniquement web (pas publication IG cross-post) | Feature manquante |
| P1-6 | `/agence/architecture` contient des refs morts (nodes « /agence/clients » marqués dead) | Doc interne |
| P1-7 | Aucun indicateur visuel quand le sync IG tourne / échoue dans Dashboard | Observabilité |
| P1-8 | Messagerie : auto-link fan_id côté IdentityGate pas encore branché (patch `/api/clients` POST à faire) | Backend outreach |
| P1-9 | Outreach welcome message IG : table prête mais pas de trigger sur webhook DM entrant | Outreach |

### 1.3 P2 — qualité / scaling future

| # | Défaut |
|---|--------|
| P2-1 | 18 clients legacy → 3 fans backfillés (les autres sont duplicats/corrupted, à nettoyer) |
| P2-2 | Paloma/Ruby model_id alignés mais UI ne filtre pas systématiquement par YUMI m1 (code poreux) |
| P2-3 | Meta CDN URLs de posts IG expirent sous 24h (re-upload Cloudinary prévu en Phase 2 de sync, pas encore codé) |
| P2-4 | Backup DB Supabase : free tier = snapshots Supabase-gérés, pas de dump externe |
| P2-5 | Cloudinary 25 GB bandwidth/mois : edge cache 30j en place mais pas stress-tested |
| P2-6 | Logs d'erreur serveur : pas de Sentry / error tracker centralisé |
| P2-7 | Screenshots App Review Meta pas encore produits |
| P2-8 | Icône Yumi-AI en SVG — à convertir PNG 1024×1024 |

### 1.4 Meta / publication

| # | Défaut |
|---|--------|
| M-1 | Business Verification SQWENSY pas encore soumise (BCE NB à fournir) |
| M-2 | App Yumi-AI liée au Business Manager ID `445891253938700` — à confirmer si c'est SQWENSY ou perso |
| M-3 | App Review permissions IG (`instagram_manage_messages`, `pages_messaging`) pas encore submitted |
| M-4 | Test comptes Meta pas ajoutés (NB doit ajouter son IG perso comme tester) |
| M-5 | Domaine heaven-os.vercel.app pas encore verified côté Meta (TXT DNS ou fichier) |

### 1.5 Décisions stratégiques en suspens

| # | Décision |
|---|----------|
| D-1 | **Refactor navigation** : option 1 (sidebar 1:1 pages), option 2 (tabs only), ou option 3 (clean up actuel) |
| D-2 | **Renaming** `/agence` → `/cockpit` / `/studio` / garder `/agence` |
| D-3 | **Sidebar labels** visibles par défaut (non-collapsed) |
| D-4 | **Migrer app Meta vers Business Manager SQWENSY** (Option B architecture agence) ou garder actuel (Option A) |
| D-5 | **Clé IA** : OpenRouter / Anthropic direct / Groq / autre — NB fournira plus tard |
| D-6 | **Upgrade Vercel Pro** pour crons temps réel OU Upstash QStash externe |

---

## 2 — Plan de mise à niveau par module

### 2.1 Module A : Navigation cockpit (dépend D-1, D-2, D-3)

**Livrable cible** : CP Yumi cohérent, chaque destination = 1 URL unique, sidebar = 1:1 avec pages.

**Prérequis** : NB valide options D-1/D-2/D-3.

**Tâches** (Option 1 recommandée) :
- Séparer tabs `agence/page.tsx` en 3 pages dédiées : `/agence/contenu`, `/agence/clients`, `/agence/strategie`
- Mettre à jour sidebar (labels visibles, 1 item par page)
- Ajouter redirects backcompat `?tab=contenu` → `/agence/contenu`
- Patcher header breadcrumb pour refléter la nouvelle URL
- Dashboard `/agence` simplifié : widget IG + KPI row + recent activity (plus de tabs)
- Optionnel : rename racine `/agence` → `/cockpit` (avec redirect)

**Estimation** : 3-4h code + tests

### 2.2 Module B : Fragmentation code UI

**Livrable cible** : fichiers <500 lignes, composants réutilisables.

**Tâches** :
- `agence/page.tsx` 2453L → 5 composants (shell + 4 sous-composants Dashboard / Contenu / Clients / Stratégie)
- `clients-panel.tsx` 1351L → 4 composants (header KPI / table / fan drawer / merge modal)
- `m/[slug]/page.tsx` 1445L → extraire `header.tsx`, `composer.tsx`, `order-notifications.tsx` déjà vus
- `/agence/messagerie/page.tsx` 540L → extraire thread + list components
- Ajouter un fichier `plans/tech/component-tree.md` documentant la structure cible

**Risque** : casser sessions live. Gating : faire 1 fichier à la fois avec rollback.

**Estimation** : 6-8h (sur 2 jours)

### 2.3 Module C : Sync IG ↔ feed web (binding data)

**Livrable cible** : les 21 posts IG apparaissent dans tab Contenu + `/m/yumi` public.

**Tâches** :
- Tab Contenu `/agence/contenu` utilise `/api/feed?model=yumi` (pas `/api/posts` seul)
- `/m/yumi` `feed-section.tsx` feature flag confirmé activé (fallback désactivé si table peuplée)
- Re-run sync manuel pour peupler cron : `curl -H "Authorization: Bearer $CRON_SECRET" https://heaven-os.vercel.app/api/cron/sync-instagram`
- Widget IG Dashboard : dès que `ops_metrics.sync_instagram_run_ms` a une row, affiche « Sync il y a Xm »
- Phase 2 (plus tard) : re-upload Cloudinary pour URL pérennes

**Estimation** : 1-2h

### 2.4 Module D : Messagerie + Outreach proactif

**Livrable cible** : identity gate web crée fan + queue welcome DM.

**Tâches** :
- Patcher `/api/clients` POST : après upsert client, create/find `agence_fans` + SET `client.fan_id`
- Patcher webhook IG : si `agence_fans.welcome_queued_at` set + message entrant = 1er DM → send welcome template (lang détectée via Accept-Language au signup web)
- Seed campaign welcome déjà en DB (migration 038)
- Dashboard outreach (nouvelle carte dans `/agence/ops`) : queued / sent / failed counts

**Estimation** : 2-3h

### 2.5 Module E : Infra scaling (dépend D-6)

**Livrable cible** : worker IA reply temps réel + redondance.

**Tâches si Option Vercel Pro** ($20/mois) :
- Remettre cron `process-ig-replies` * * * * * dans `vercel.json`
- Upgrader compte Vercel côté NB

**Tâches si Option Upstash QStash** (~$0-3/mois) :
- Signup Upstash
- Créer schedule dans QStash pointant `/api/cron/process-ig-replies` avec Bearer $CRON_SECRET
- Pas de modif code Heaven

**Tâches si Option GitHub Actions** (gratuit) :
- Créer `.github/workflows/ig-worker-cron.yml` avec curl toutes les 5 min

**Estimation** : 15 min selon option

### 2.6 Module F : IA conversationnelle (dépend D-5)

**Livrable cible** : agent répond DMs en mode review, détecte langue, persona flirt Yumi.

**Tâches** :
- Ajouter `OPENROUTER_API_KEY` (ou équivalent) en env Vercel
- Worker `process-ig-replies` bascule du placeholder au vrai call IA
- Spec persona Yumi (à valider par NB avant code) :
  - Ton : naturel, sensuel, jamais robotique, jamais « je suis une IA »
  - Détection langue FR/EN/ES via Accept-Language + fallback Claude détection
  - Context window : 20 derniers messages + métadata fan + tier
  - Mode review default → Yumi/NB approve drafts visibles dans `/agence/messagerie`
  - Auto-mode activable après 50-100 drafts validés
- Prompt caching Anthropic (via OpenRouter ou direct) pour -90% coût
- Budget estimé pic pub : 15-25€/mois (cf. audit agent D scalabilité)

**Estimation** : 3-5h code + 1h spec

### 2.7 Module G : Meta publication (dépend D-4, M-1 à M-5)

**Livrable cible** : App Meta en Live mode, DMs publics débloqués, sync feed stable.

**Tâches** :
- Décider D-4 (migrer vers Business Manager SQWENSY ou garder actuel)
- NB fait Business Verification SQWENSY (BCE + docs utilitaires)
- Convertir icône SVG → PNG 1024×1024
- Upload URLs privacy/terms/data-deletion dans Meta App Dashboard (prompt extension prêt)
- Ajouter tester accounts (NB perso IG) pour tester DMs en dev mode
- Produire screencast video 2-3 min (tour CP + messagerie + IG dashboard)
- Submit App Review permissions : `instagram_manage_messages`, `instagram_manage_comments`, `pages_messaging`, `instagram_basic`
- Attendre review Meta 2-4 semaines

**Estimation** : 1h action directe NB + 2-4 semaines attente Meta

### 2.8 Module H : Observabilité + scaling soft

**Livrable cible** : visibility sur incidents + coûts sous contrôle.

**Tâches** :
- Page `/agence/ops` déjà livrée — aucune action
- Activer Sentry free tier (5k events/mois, upgrade 26$/mois au lancement pub)
- Budget alerts OpenRouter / Anthropic (cap daily 20$ via dashboard)
- Vercel Analytics déjà actif
- Stress test Cloudinary bandwidth : simuler 1k visits/h `/m/yumi` pour confirmer edge cache hit ratio >90%
- Cron `/api/cron/purge-ops-metrics` quotidien déjà actif

**Estimation** : 1h setup + 1h stress test

### 2.9 Module I : Backups + continuité

**Livrable cible** : pas de perte data en cas de panne.

**Tâches** :
- Configurer cron externe (n8n ou GitHub Actions) qui fait `pg_dump` Heaven DB vers backup offsite hebdo
- Documenter procédure restore dans `plans/ops/procedures.md`
- Test restore trimestriel

**Estimation** : 2h setup + runbook

---

## 3 — Séquencement recommandé

```
Phase I  — Décisions stratégiques (NB valide)           [30 min réflexion + chat]
  → D-1, D-2, D-3, D-4, D-5, D-6

Phase II — Corrections front prioritaires (P0 UI)       [6-8h]
  → Module A (nav refactor selon D-1/D-2/D-3)
  → P0-10 (Login button header)
  → P0-12 (widget IG display "Sync il y a Xm")

Phase III — Data binding feed                           [2h]
  → Module C (tab Contenu + /m/yumi lisent agence_feed_items)
  → Relancer cron sync-instagram manuel

Phase IV — Messagerie + outreach                        [3h]
  → Module D (auto-link fan_id + welcome trigger)

Phase V — Fragmentation code                            [8h répartis]
  → Module B (pas prio mais nécessaire avant scaling)

Phase VI — Meta publication                             [1h + 2-4 sem attente]
  → Module G (Business Verif + App Review)

Phase VII — Infra scaling (quand clé IA fournie)        [15 min + 3-5h IA]
  → Module E (choix queue) + Module F (IA agent)

Phase VIII — Observabilité + backup                     [3h]
  → Module H + Module I

Phase IX — Documentation finale + handover              [2h]
  → Mise à jour CHANGELOG, plans/, docs/
  → Runbooks ops
```

**Total sans attente Meta : ~25-30h de dev** sur 5-7 jours ouvrés.
**Chemin critique externe** : Business Verification SQWENSY (3-14 jours) + App Review Meta (2-4 semaines).

---

## 4 — Cross-refs documentation

Ce document met à jour ou remplace partiellement :

- `plans/HEAVEN-MASTERPLAN-2026.md` → ajouter section « État avril 2026 » pointant ici
- `plans/product/roadmap.md` → mettre à jour phases avec les ajouts livrés le 21/04
- `plans/tech/architecture.md` → corriger (Turborepo mergé en 1 app Next.js depuis commit d32a53f)
- `plans/MIGRATION-2026-04.md` → ajouter migrations 030, 032-038 livrées
- `plans/MAINTENANCE-PREVENTIVE.md` → ajouter règle « `rm -rf .next` avant npm run dev »
- `plans/PALOMA-COLLABORATION.md` → inchangé

Nouveaux documents créés pour appuyer cette roadmap :
- `plans/REFACTOR-NAVIGATION-SPEC.md` (détails Module A — options 1/2/3 avec diagrammes)
- `plans/META-APP-PUBLICATION-PLAN.md` (détails Module G — Business Verif + App Review)
- `plans/IA-AGENT-SPEC.md` (détails Module F — persona Yumi + prompt système + modes review/auto)

---

## 5 — Garde-fous

1. **Aucun code sans GO** : NB doit valider chaque Module avant dispatch.
2. **1 commit logique par module** : pas de commit « fourre-tout ».
3. **Type check + build** obligatoires avant push.
4. **Confidentialité Heaven** : aucun vrai prénom dans code/doc/DB/commits, slugs `yumi/paloma/ruby` uniquement.
5. **Pas de touche aux autres modèles (paloma/ruby) en dehors du scope Yumi m1** sauf migration explicitement agréée.
6. **Rollback** prévu pour chaque module (migrations .rollback.sql, feature flags, commits atomiques).

---

## 6 — Log de la session 21 avril 2026

Déjà livré :
- Migrations DB 030, 032, 033, 034, 035, 036, 037, 038, 038b
- Webhook IG async + queue `ig_reply_queue` + worker placeholder
- Sync IG posts → `agence_feed_items` (21 rows pour m1)
- Pages publiques `/privacy`, `/terms`, `/data-deletion` + endpoint `/api/meta/data-deletion`
- API `/api/feed` polymorphique public
- API `/api/agence/ops/metrics` + page `/agence/ops`
- Widget `instagram-stats-widget.tsx` monté dans Dashboard
- Icon SVG 1024×1024 `public/meta/yumi-ai-icon.svg`
- Cloudinary edge cache 30j via `next.config.ts`
- Sidebar : items Instagram + Ops ajoutés
- Error boundaries `/agence/error.tsx` + `/m/[slug]/error.tsx`
- Crons Vercel ajustés pour Hobby tier (quotidiens)
- 18 clients → 3 fans liés (backfill) + `gret1` désactivé
- 11+ commits pushés sur origin/main, 4 agents parallèles + 2 en follow-up

Pas encore fait (volontairement, attente décisions) :
- Refactor navigation cockpit (D-1/D-2/D-3 à valider)
- Migration Business Manager Meta (D-4 à valider)
- Activation clé IA agent conversationnel (D-5 à valider)
- Business Verification SQWENSY (NB fait quand prêt)
- App Review Meta submission (après Business Verif)

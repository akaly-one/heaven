# BRIEF-2026-04-24-05 — QStash cron provider + toggle UI (CP root/yumi)

> **Status** : 🟠 cadré (en attente GO NB)
> **Source** : NB message du 2026-04-24 ~17:00 ("go 1 et ajoute en parralle l'option 2 avec un toogle dans le cp root et yumi dans la nav pour swith entre le 2 options")
> **Type** : feature + infra
> **Priorité** : P2 (amélioration, non bloquante — l'Option 1 daily est suffisante en MVP)
> **Dépendance amont** : BRIEF-04 livré (env vars agent IA prod) ✅

---

## Demande NB (verbatim résumé)

1. Option 1 (cron daily) exécutée et vérifiée ✅
2. En parallèle, installer Option 2 (QStash gratuit pour cron toutes les 2 min)
3. Ajouter un **toggle dans le CP Root ET le CP Yumi** (dans la nav) pour switcher entre les 2 options

## Compréhension CDP

Objectif : avoir **2 providers cron disponibles** et pouvoir basculer entre eux depuis l'UI admin, sans redéploiement.

| Provider | Fréquence | Coût | Statut actif aujourd'hui |
|---|---|---|---|
| **Vercel Cron** (daily) | 1×/jour | Gratuit | ✅ actif (par défaut) |
| **QStash** (2 min) | toutes les 2 min | Gratuit (500 msg/jour) | ⏳ à installer |

Les 2 providers appellent la **même route** `/api/cron/process-ig-replies`, avec des secrets d'auth différents.

Le toggle UI permet de :
- Voir lequel est actif
- Basculer sans redeploy (via DB settings)
- Tester l'autre provider sans casser l'existant

## Scope

### IN

1. **DB** : table `system_cron_settings` (ou row dans `system_config` existante) avec colonne `provider TEXT CHECK IN ('vercel', 'qstash')`
2. **BE** :
   - Route `/api/cron/process-ig-replies` étendue pour accepter 2 sources :
     - `Authorization: Bearer <CRON_SECRET>` (Vercel cron existant)
     - `Upstash-Signature: <signature>` (QStash signing verification via `@upstash/qstash/nextjs`)
   - Route `GET/PUT /api/agence/cron-provider` pour lire/modifier la config (admin only)
   - Si `provider = 'qstash'` : la route vercel cron skip early (return 200 "provider=qstash")
3. **QStash setup** (actions NB + technique) :
   - Compte Upstash créé (action NB, signup gratuit sur upstash.com)
   - Topic QStash configuré pour appeler `https://heaven-os.vercel.app/api/cron/process-ig-replies`
   - Schedule `*/2 * * * *`
   - Env vars prod ajoutées : `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
   - Package `@upstash/qstash` installé (`npm i @upstash/qstash`)
4. **FE** :
   - Composant `<CronProviderToggle>` shared (dans `src/shared/components/admin/` ou `src/cp/components/admin/`)
   - Inséré dans `/agence/settings` (CP Yumi admin) + `/agence/ops` (CP Root)
   - Radio 2 choix : Vercel Daily / QStash 2-min
   - Indicateur latency runtime (dernière exécution réussie)
   - Bouton "Force sync now" pour tester
5. **Doc** :
   - Update `plans/PMO/standards/OPS.md` (à créer TICKET-S04) avec section "Cron providers"
   - Update `docs/os/CRON-PROVIDERS.md` avec runbook switch + troubleshooting

### OUT

- Création compte QStash automatique (action NB manuelle, gratuit, 2 min sur upstash.com)
- Migration data existante (pas de data cron, juste du scheduling)
- Multi-tenant cron (Paloma/Ruby auront leur propre cron séparé plus tard si besoin)
- Remplacement complet de Vercel cron (on le garde en fallback daily même si QStash actif)

## Branches concernées

- ☒ **DB** — migration 059 cron_settings
- ☒ **BE** — routes cron + provider switch + signature verification
- ☒ **FE** — composant toggle shared + insertion 2 pages admin
- ☒ **DevOps** — env vars QStash + doc setup
- ☒ **QA** — test e2e switch + signature QStash verif
- ☒ **Doc** — runbook cron providers
- ☐ AI — pas impliqué

## Dépendances

### Amont
- ✅ BRIEF-04 livré (CRON_SECRET en prod, agent IA opérationnel)
- ✅ Infra DB Heaven en place

### Aval
- Pré-requis avant migration multi-tenant cron par modèle (si un jour on a Paloma/Ruby avec cadence différente)

### Action NB requise (prérequis démarrage)
- Créer compte Upstash (https://console.upstash.com/ — signup Google/GitHub, gratuit)
- Partager les clés QStash (`TOKEN`, `SIGNING_KEY`, `NEXT_SIGNING_KEY`) via le canal sécurisé habituel (`.env.local` ou message chat — pareil qu'IG token ce matin)

## Livrables

### L1 — Backend core (~2h)

| Fichier | Nature | Effort |
|---|---|---|
| `supabase/migrations/059_cron_settings.sql` | Migration DB table 1 row | 15 min |
| `src/lib/cron/providers.ts` | Helper `getActiveCronProvider()` + constants | 30 min |
| `src/app/api/cron/process-ig-replies/route.ts` | Modif : accept Vercel OR QStash auth, skip si provider != self | 45 min |
| `src/app/api/agence/cron-provider/route.ts` | GET/PUT config, admin-only | 30 min |

### L2 — QStash integration (~45 min après NB a créé compte Upstash)

| Fichier | Nature | Effort |
|---|---|---|
| `package.json` | Add `@upstash/qstash` | 5 min |
| `src/lib/cron/qstash-verify.ts` | Wrap `Receiver.verify()` from `@upstash/qstash` | 20 min |
| Env vars Vercel prod | QSTASH_TOKEN + SIGNING_KEYS | 10 min |
| Config QStash Upstash UI | Schedule `*/2 * * * *` pointant webhook | 10 min |

### L3 — Frontend toggle (~1h30)

| Fichier | Nature | Effort |
|---|---|---|
| `src/shared/components/admin/cron-provider-toggle.tsx` | Composant shared (radio + status + sync button) | 45 min |
| `src/app/agence/settings/page.tsx` | Insérer toggle dans section "Ops" | 20 min |
| `src/app/agence/ops/page.tsx` (CP root) | Insérer toggle (existe peut-être pas encore) | 25 min |

### L4 — Tests + Doc (~45 min)

| Fichier | Nature | Effort |
|---|---|---|
| `tests/cron-provider-switch.spec.ts` (Playwright) | E2E switch + last-run indicator | 30 min |
| `docs/os/CRON-PROVIDERS.md` | Runbook + diagram + troubleshooting | 15 min |

**Total effort** : ~5h CDP + sous-agents, **étape par étape comme tu as demandé**.

## Acceptance criteria

- [ ] `/api/agence/ai/health` toujours fonctionnel
- [ ] Migration 059 appliquée, row seed `provider='vercel'`
- [ ] Toggle UI affiche le provider actif avec dernière exécution
- [ ] Switch `vercel → qstash` : après save, next IG message DB row déclenche appel QStash qui traite en < 2 min
- [ ] Switch `qstash → vercel` : QStash continue d'appeler mais route skip immédiatement
- [ ] Signature QStash vérifiée correctement (rejet si signature invalide)
- [ ] Env vars QStash en prod Vercel
- [ ] Doc `CRON-PROVIDERS.md` référencée dans CLAUDE.md

## Tickets pré-découpés

| Ticket | Titre | Branche | Dépend de | Parallélisable | Effort |
|---|---|---|---|---|---|
| `TICKET-CP01` | Migration 059 + helper providers.ts | DB + BE | — | non (base) | 45 min |
| `TICKET-CP02` | Modif route /api/cron/process-ig-replies dual auth | BE | CP01 | non | 45 min |
| `TICKET-CP03` | API /api/agence/cron-provider GET/PUT | BE | CP01 | parallèle CP02 | 30 min |
| `TICKET-CP04` | QStash package install + verify lib | BE + DevOps | CP02 + compte NB | parallèle CP03 | 30 min |
| `TICKET-CP05` | Env vars QStash Vercel prod + schedule Upstash | DevOps | CP04 + compte NB | non | 20 min |
| `TICKET-CP06` | Composant <CronProviderToggle> shared | FE | CP03 | non | 45 min |
| `TICKET-CP07` | Insertion toggle dans /agence/settings (Yumi) | FE | CP06 | parallèle CP08 | 20 min |
| `TICKET-CP08` | Insertion toggle dans /agence/ops (Root) | FE | CP06 | parallèle CP07 | 25 min |
| `TICKET-CP09` | Tests Playwright e2e switch | QA | CP07 + CP08 + CP05 | non | 30 min |
| `TICKET-CP10` | Runbook CRON-PROVIDERS.md + CLAUDE.md ref | Doc | CP09 | non | 15 min |

## Notes CDP

**Sécurité** : la route `/api/cron/process-ig-replies` accepte maintenant 2 sources d'auth. Il faut :
- Valider signature QStash AVANT d'exécuter la logique (rejeter si invalide)
- Ne JAMAIS accepter les 2 simultanément → la provider détermine quelle auth est attendue

**Pattern toggle** : c'est un pattern réutilisable. On va créer un pattern "settings app-wide" dans la DB qui pourra servir aux futurs toggles (ex: "feature flag agent multi-provider routing", "mode maintenance", etc.). ADR à rédiger pendant CP01.

**Cross-CP** : le toggle `provider` est app-wide (pas par modèle). Paloma/Ruby utiliseront le même cron provider que Yumi. Si un jour besoin de différenciation → nouveau brief.

**Skills Claude Code préférentiels** :
- CP01 : `general-purpose` + Supabase MCP
- CP02/CP03/CP04 : `senior-backend` + `vercel:vercel-functions`
- CP06/CP07/CP08 : `senior-frontend` + `vercel:shadcn`
- CP09 : `engineering:testing-strategy`
- CP10 : `engineering:documentation` + `operations:runbook`

**Conditions GO exécution** :
1. NB crée compte Upstash + partage clés QStash
2. NB valide le cadrage de ce brief
3. NB choisit le mode d'exécution (ticket par ticket ou par phase CP01-CP10)

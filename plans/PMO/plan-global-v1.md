# PLAN GLOBAL v1 — Cycle d'exécution 2026-04-24

> **Consolidation** : 3 briefs reçus orchestrés chronologiquement par le CDP selon implications techniques et dépendances.
> **Statut** : 🟠 en attente GO NB pour lancer la phase 1.
> **Horizon** : ~2-3 semaines calendaires selon disponibilité NB pour validations inter-phases.

---

## 1. Logique d'ordonnancement

Les briefs NB ont été reçus dans l'ordre 01 → 02 → 03. L'ordre **d'exécution optimal** est différent car :

1. **BRIEF-03 fournit le socle orchestrateur** (structure unifiée + CONTEXT template + roadmap trackable + auto-update)
2. **BRIEF-02 consomme ce socle** (le CONTEXT.md messenger est une instance du template BRIEF-03)
3. **BRIEF-01 est déjà livré** (hotfix DB + FK)

**Règle d'or** : on pose les rails avant de faire rouler les wagons.

**Corollaire** : BRIEF-03 n'est PAS exécuté d'un bloc. Ses livrables L1-L5 sont **découpés et entrelacés** avec BRIEF-02 pour que le rollout des CONTEXT.md commence par messenger (cas réel alimentant le standard).

---

## 2. Phases consolidées

### PHASE 0 — Baseline (déjà livré)

| Ticket | Livrable | Branche | Statut |
|---|---|---|---|
| BRIEF-01 complet | Migrations 050v2/052/053/054/058 + FK fix + commit `5b64abc` | DB, BE | ✅ livré |
| PMO bootstrap | Charte + intake + registry + 3 briefs archivés (commits `88a8689`/`92aa699`) | Doc | ✅ livré |

---

### PHASE 1 — Fondations PMO (BRIEF-03 L1+L2+L5a+L4)

> **Objectif** : le CDP dispose de TOUS les outils d'orchestration avant de toucher au code applicatif.

| # | Ticket | Titre | Branche | Dépend de | Parallélisable | Effort |
|---|---|---|---|---|---|---|
| 1.1 | `TICKET-S01` | Audit structure précis (105 fichiers classifiés + propositions actions) | Architect / Doc | — | non | 30 min |
| 1.2 | `TICKET-S07` | Résolution `docs/` racine (selon audit S01) | DevOps / Doc | S01 | parallèle 1.3 | 20 min |
| 1.3 | `TICKET-S02` | Template `MODULE-CONTEXT-TEMPLATE.md` | Architect / Doc | S01 | parallèle 1.2 | 30 min |
| 1.4 | `TICKET-S05` | Protocole AUTO-UPDATE + amendement Charte §4 DoD | Doc | — | parallèle 1.1-1.3 | 30 min |
| 1.5 | `TICKET-S04` | ROADMAP-MASTER init (agrège B1-B11 + 11 phases agent IA + S1-S7 BP + tickets PMO) | Architect / Doc | S05 | non | 1h |

**Gate Phase 1** : NB valide audit S01 + template CONTEXT S02 + protocole S05 avant Phase 2.

**Commit par ticket** (5 commits séparés). Aucune suppression destructive sans GO NB ligne par ligne sur S01.

---

### PHASE 2 — Messenger (BRIEF-02 complet + BRIEF-03 L3-partial)

> **Objectif** : livrer les standards UI messenger + appliquer le template CONTEXT au premier module.
> **Logique** : le messenger est le **cas pilote** — les standards émergent du cas réel.

| # | Ticket | Titre | Branche | Dépend de | Parallélisable | Effort |
|---|---|---|---|---|---|---|
| 2.1 | `TICKET-S03-messenger` | `modules/messagerie-contacts/CONTEXT-v1.md` | Doc / FE | S02 | non | 30 min |
| 2.2 | `TICKET-M01` | `UI-STANDARDS-v1.2026-04-24.md` (6 sections : pseudo/avatar/row/bubble/mode/matrice) | Architect / Doc | S03-messenger | non | 1h |
| 2.3 | `TICKET-M02` | Fix `getConversationPseudo` règle unique + test Vitest | BE / QA | M01 | parallèle 2.4-2.6 | 30 min |
| 2.4 | `TICKET-M03` | `<ConversationAvatar>` shared + refactor 2 sites | FE | M01 | parallèle 2.3, 2.5, 2.6 | 1h |
| 2.5 | `TICKET-M04` | `<ConversationRow>` shared + refactor 2 sites | FE | M01 | parallèle 2.3, 2.4, 2.6 | 1h |
| 2.6 | `TICKET-M05` | `<MessageBubble>` shared + refactor 2 sites | FE | M01 | parallèle 2.3, 2.4, 2.5 | 1h |
| 2.7 | `TICKET-M06` | Mode chip dans row + dropdown + câblage PUT /mode | FE | M04 | non | 45 min |
| 2.8 | `TICKET-M07` | Snapshot tests Playwright cohérence 3 vues + axe-core a11y | QA | M02-M06 | non | 1h |

**Gate Phase 2** : NB valide rendu visuel (screenshots 3 vues cohérentes) + QA snapshot + a11y axe 0 critical.

**Parallélisation possible Phase 2** : après M01 validé, M02 + M03 + M04 + M05 exécutables en multi-agent (4 sous-agents simultanés, règle `dispatching-parallel-agents`). Gain estimé : 3h → 1h.

---

### PHASE 3 — Rollout CONTEXT modules restants (BRIEF-03 L3-suite)

> **Objectif** : étendre le pattern CONTEXT.md aux 5 autres modules actifs.

| # | Ticket | Titre | Branche | Dépend de | Parallélisable | Effort |
|---|---|---|---|---|---|---|
| 3.1 | `TICKET-S03-dashboard` | `modules/dashboard/CONTEXT-v1.md` | Doc | M01 (leçons) | parallèle 3.2-3.5 | 30 min |
| 3.2 | `TICKET-S03-profil-public` | `modules/profil-public/CONTEXT-v1.md` | Doc | M01 | parallèle 3.1, 3.3-3.5 | 30 min |
| 3.3 | `TICKET-S03-contenu-packs` | `modules/contenu-packs/CONTEXT-v1.md` | Doc | M01 | parallèle 3.1-3.2, 3.4-3.5 | 30 min |
| 3.4 | `TICKET-S03-models` | `modules/models/CONTEXT-v1.md` (3 sous-modèles m1/m2/m3) | Doc | M01 | parallèle 3.1-3.3, 3.5 | 45 min |
| 3.5 | `TICKET-S03-ai-agent` | `modules/ai-conversational-agent/CONTEXT-v1.md` | Doc / AI | M01 | parallèle 3.1-3.4 | 45 min |

**Gate Phase 3** : 6 CONTEXT.md cohérents (un par module), chacun renseigne comptes + stack + env vars + owners + état.

**Parallélisation max** : 5 sous-agents Doc en parallèle → ~45 min total au lieu de 3h séquentiel.

---

### PHASE 4 — Finalisation orchestration (BRIEF-03 L5b)

> **Objectif** : dashboard final avec vue d'ensemble auto-synchronisée.

| # | Ticket | Titre | Branche | Dépend de | Parallélisable | Effort |
|---|---|---|---|---|---|---|
| 4.1 | `TICKET-S06` | `PMO/05-INDEX-MODULES.md` (table statuts + owners + dernières modifs) | Doc | Phase 3 | non | 1h |

**Gate Phase 4** : INDEX-MODULES reflète l'état réel post-livraisons, cross-ref vers chaque CONTEXT.

---

### PHASE 5 — Exécution sprints suivants (post-plan-global-v1)

> **Déclenchement** : après validation NB de Phases 1-4. Lecture de ROADMAP-MASTER (L4) pour identifier les prochaines priorités.

Briefs/tickets en attente hors cycle courant :

- **Phase 6 agent IA** (Multi-IA Router) — débloqué par fix FK (BRIEF-01)
- **Phase 8 agent IA** (Funnel Fanvue UTM attribution)
- **Sprint 1 BP** (Data Model Modes + Paliers)
- **Meta App Review submission** (blocker agent IA Instagram online)
- **Vercel Deployment Protection config** (blocker externe — action NB requise)

Ces items sont référencés dans ROADMAP-MASTER (L4) mais **non planifiés dans ce plan global v1**. Un `plan-global-v2.md` sera produit au prochain cycle d'intake après Phase 4 livrée.

---

## 3. Dépendances critiques (graphe)

```
BRIEF-01 ✅
    │
    ▼
PMO bootstrap ✅
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│ PHASE 1 — Fondations PMO                                      │
│                                                               │
│   S01 ──► S02 ──► S03-messenger ──► M01 ──► M02/M03/M04/M05 │
│    │      │                                    │           │
│    ▼      ▼                                    ▼           │
│   S07    S05 ──► S04 ──► ROADMAP-MASTER        M06         │
│                                                 │           │
│                                                 ▼           │
│                                               M07           │
│                                                 │           │
└─────────────────────────────────────────────────┼───────────┘
                                                  │
                                                  ▼
                                    PHASE 3 (5 CONTEXT en parallèle)
                                                  │
                                                  ▼
                                    PHASE 4 (INDEX-MODULES)
```

---

## 4. Distribution agents Claude Code

| Phase | Branches activées | Skills préférentiels |
|---|---|---|
| 1 | Architect, Doc, DevOps | `general-purpose` + `engineering:architecture` + `engineering:documentation` + `file-organizer` |
| 2 | FE, BE, QA, Doc, Architect | `senior-frontend` + `vercel:shadcn` + `vercel:react-best-practices` + `senior-backend` + `test-driven-development` + `engineering:code-review` + `design:accessibility-review` + `design:design-system` |
| 3 | Doc (×5 parallèles) | `engineering:documentation` + `operations:process-doc` |
| 4 | Doc | `engineering:documentation` |

**Parallélisation estimée** :
- Phase 2 : 4 sous-agents simultanés (M02/M03/M04/M05 après M01)
- Phase 3 : 5 sous-agents simultanés (un par module)

**Temps total estimé** :
- Séquentiel pur : ~15h CDP
- Avec parallélisation max : **~6-8h effectives** répartis sur 2-3 séances NB

---

## 5. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Refactor UI messenger (Phase 2) → régression visuelle | Haut | Snapshot Playwright AVANT refactor → comparaison après |
| Audit S01 → suppressions non voulues | Moyen | AUCUNE action destructive sans GO NB ligne par ligne |
| `docs/ACCESS-HEAVEN-OS.md` contient credentials | Haut | S07 audite, si sensible → migration hors repo vers `personal-nb/` |
| Vercel Deployment Protection bloque encore agent IA | Moyen | Hors scope plan global v1 — à traiter dans plan v2 avec config NB |
| Drift DB vs fichiers migrations (récurrent) | Moyen | Protocole auto-update force alignement après chaque `apply_migration` MCP |

---

## 6. Communication NB pendant exécution

**Daily snapshot** pendant exécution (nouveau rituel) :

Fichier `plans/PMO/daily/YYYY-MM-DD.md` mis à jour en fin de chaque séance :
- Tickets livrés du jour (cochés dans ROADMAP-MASTER)
- Blockers identifiés
- Next tickets
- Questions en attente NB

**Gate validations** : chaque fin de phase → NB valide en bloc avant next phase.

---

## 7. Décisions bloquantes en attente NB

Avant GO Phase 1, clarifier :

1. ☐ **Périmètre audit S01** : inclut `docs/` racine (4 fichiers) ? [Recommandé : oui]
2. ☐ **`docs/ACCESS-HEAVEN-OS.md`** : contient-il des credentials sensibles ? [Action conditionnelle : migration hors repo si oui]
3. ☐ **Livraison messenger (Phase 2)** : NB valide en 1 bloc à la fin ou après chaque M0X ? [Recommandé : bloc final avec screenshots 3 vues]
4. ☐ **Parallélisation Phase 2/3** : OK pour dispatcher 4-5 sous-agents simultanément ? [Recommandé : oui, règle `dispatching-parallel-agents`]

---

## 8. Acceptance globale plan v1

Le plan v1 est livré (clos) quand :

- [ ] Phases 1-4 livrées dans l'ordre
- [ ] ROADMAP-MASTER à jour avec toutes les tâches cochées
- [ ] 6 CONTEXT.md présents et cohérents
- [ ] Messenger : 3 vues (header, page, profil) rendent identique pour même client
- [ ] Protocole auto-update appliqué dans la charte + respecté par CDP
- [ ] INDEX-MODULES dashboard opérationnel
- [ ] Aucune régression (tsc + build passent, site prod iso)

---

## 9. GO attendu NB

**Options proposées** :

- **Option A** (recommandée) : GO Phase 1 seule → je livre fondations PMO, pause validation, puis Phase 2.
- **Option B** : GO Phases 1+2 en séquence → livrable complet messenger + standards appliqués, validation à la fin.
- **Option C** : GO tout le plan (Phases 1→4) → exécution continue, validation finale seulement.
- **Option D** : Tu ajustes/réordonnes avant GO.

**Ma recommandation CDP** : **Option A**. Raison : Phase 1 contient des actions semi-destructives (S01 → S07 résolution `docs/`) qui nécessitent des GO ligne par ligne. Mieux vaut pauser après Phase 1 pour valider le socle avant d'attaquer l'application messenger.

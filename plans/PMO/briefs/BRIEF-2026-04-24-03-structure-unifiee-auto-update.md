# BRIEF-2026-04-24-03 — Structure unifiée + CONTEXT par module + roadmap trackable + auto-update

> **Status** : 🟠 cadré (en attente GO NB sur option choisie)
> **Source** : NB message du 2026-04-24 ~14:30 ("tu va netoyer les vieux plans et anciens fichiers qui sont obsolettes et garder une seule structure qui se metra a jour...")
> **Type** : standard + directive + méta gouvernance PMO
> **Priorité** : P1 (structurant, impacte tous les futurs tickets)

---

## Demande NB (verbatim résumé)

1. Nettoyer vieux plans / fichiers obsolètes
2. Garder **une seule structure** qui se met à jour
3. **Indexer toutes les tâches** de la roadmap en changelog historique avec **cases à cocher** pour chaque phase de progression
4. Chaque **module** doit avoir son **contexte** (règles, stack, comptes, stack technique) destiné à ce module
5. PMO + standards + multi-agent doivent **orchestrer et centraliser** toutes les règles, contextes, infos
6. Objectif : **éviter de perdre le fil** + **travailler en équipe coordonnée**

## Compréhension CDP

### Audit flash — état actuel

101 fichiers .md dans `plans/`. **Aucun obsolète massif identifié** : le nettoyage V1→V2 a déjà été fait (ADR-007 a supprimé `plans_01/`, et `_archive-v1/` garde juste 1 audit).

Ce qui manque, ce n'est **pas du nettoyage** — c'est **la couche orchestratrice** :

| # | Manquant | Conséquence sans |
|---|---|---|
| 1 | `CONTEXT.md` par module | On cherche les comptes/env vars/règles à chaque fois |
| 2 | `ROADMAP-MASTER` indexée avec cases à cocher | Pas de vue unique progression cross-modules |
| 3 | Protocole auto-update obligatoire | Roadmap se désynchronise des livraisons |
| 4 | `INDEX-MODULES` (statut global) | Pas de dashboard des modules |
| 5 | Audit `docs/` racine | Possible doublons avec `plans/` |

### Interprétation CDP

NB confond "nettoyer les vieux plans" avec "structurer ce qui est dispersé". Ma job = expliquer et proposer la bonne action : **pas de nettoyage destructif**, mais **consolidation orchestratrice**.

## Scope

### IN

1. **Audit précis + rapport** : liste exhaustive fichiers, classification (actif V2 / archive / orphelin / doublon), propositions d'action
2. **Template `CONTEXT.md` module** dans `PMO/standards/MODULE-CONTEXT-TEMPLATE.md`
3. **Rollout 6 × CONTEXT.md** : un par module actif (`dashboard`, `profil-public`, `messagerie-contacts`, `contenu-packs`, `models`, `ai-conversational-agent`)
4. **`PMO/03-ROADMAP-MASTER.md`** — agrégation briefs B1-B11 + phases agent IA (0-17) + sprints BP (S1-S7) + tickets PMO, avec cases à cocher `- [ ]` / `- [x]`
5. **`PMO/04-AUTO-UPDATE-PROTOCOL.md`** — règle non négociable : chaque ticket livré → CDP MET À JOUR 5 fichiers (roadmap master, changelog module, context module, registry briefs, report horodaté)
6. **`PMO/05-INDEX-MODULES.md`** — vue "tous les modules + statut global + % livré + dépendances"
7. **Audit `docs/` racine** : si obsolète → archive, si doublon → fusion vers `plans/`, si sensible (ACCESS-HEAVEN-OS) → hors repo ou `personal-nb/`

### OUT

- Suppression destructive (règle `feedback_prevent_corruption_and_loss`)
- Modification des briefs B1-B11 existants (on les référence, on ne les dédouble pas)
- Code applicatif (ce brief = 100% docs)
- Hooks automatiques (auto-update est une **règle humaine pour le CDP**, pas un script)

## Branches concernées

- ☒ **Doc** — 9 fichiers docs à créer/mettre à jour
- ☒ **Architect** — audit + conception template CONTEXT + protocole auto-update
- ☐ FE / BE / DB / AI / QA / DevOps — pas impliqués (brief 100% méta gouvernance)

## Dépendances

- Aucune bloquante
- S'appuie sur : `plans/PMO/` (charte + intake déjà créés, commit `88a8689`)
- Cross-ref avec : `STANDARD-SUIVI-PROJET.md`, `PROTOCOLE-MISE-A-JOUR.md` (existent déjà)

## Livrables attendus

### L1 — Audit structure (fichier unique)
`plans/PMO/AUDIT-2026-04-24-structure.md`
- Tableau exhaustif des 101 fichiers plans/ + 4 fichiers docs/
- Classification : ✅ actif / 📦 archive / ⚠️ doublon / ❌ obsolète
- Propositions d'action ligne par ligne
- Question(s) GO NB pour chaque action destructive ou de migration

### L2 — Template CONTEXT module
`plans/PMO/standards/MODULE-CONTEXT-TEMPLATE.md`
- Sections : Scope / Règles spécifiques / Stack / Comptes & accès / Env vars / Dépendances / Owners / État / Confidentialité
- Fréquence de mise à jour + qui modifie
- Cross-ref vers `PMO/standards/FRONTEND.md`, `BACKEND.md`, etc. (à créer aussi plus tard)

### L3 — Rollout 6 CONTEXT.md
`plans/modules/<slug>/CONTEXT-v1.2026-04-24.md` × 6
- `dashboard/CONTEXT-v1.md`
- `profil-public/CONTEXT-v1.md`
- `messagerie-contacts/CONTEXT-v1.md`
- `contenu-packs/CONTEXT-v1.md`
- `models/CONTEXT-v1.md`
- `ai-conversational-agent/CONTEXT-v1.md`

### L4 — ROADMAP-MASTER trackable
`plans/PMO/03-ROADMAP-MASTER.md`
- Section "Sprint courant" avec cases à cocher
- Section "Par module" (aggregée)
- Section "What's next 2 weeks"
- Section "Historique livré" (cocher `[x]` lors de chaque merge)
- Format markdown pur, commit = truth source

### L5a — Protocole auto-update
`plans/PMO/04-AUTO-UPDATE-PROTOCOL.md`
- Règle : CDP DOIT mettre à jour 5 fichiers à chaque ticket livré
- Checklist de mise à jour
- Ajout à `00-CHARTE.md` §4 DoD comme critère obligatoire
- Sanction : un livrable sans update = ticket non clos

### L5b — Index modules dashboard
`plans/PMO/05-INDEX-MODULES.md`
- Tableau : nom / statut (%) / owners / dernière modif / ticket en cours / priorité next
- Cross-ref vers chaque CONTEXT.md
- Mis à jour à chaque livraison (via L5a)

## Acceptance criteria

- [ ] Audit L1 livré avec tableau exhaustif 105 fichiers classifiés
- [ ] Template CONTEXT (L2) validé par NB
- [ ] 6 CONTEXT.md créés avec comptes/env vars/stack explicites
- [ ] ROADMAP-MASTER intègre B1-B11 + 11 phases AI + S1-S7 BP + tickets PMO
- [ ] Protocole auto-update référencé dans CHARTE §4 DoD
- [ ] INDEX-MODULES reflète l'état réel à la livraison
- [ ] Aucun fichier supprimé sans GO NB explicite
- [ ] Commit atomique par livrable (L1…L5b = ≥ 5 commits séparés)

## Tickets générés (à découper en consolidation)

Pré-découpage (à valider) :

- `TICKET-S01` [Doc/Architect] — Audit structure + rapport L1
- `TICKET-S02` [Doc/Architect] — Template CONTEXT.md module
- `TICKET-S03` [Doc] — Rédaction 6 CONTEXT.md modules (peut paralléliser en 6 sous-tâches)
- `TICKET-S04` [Doc/Architect] — ROADMAP-MASTER agrégée trackable
- `TICKET-S05` [Doc] — Protocole auto-update + amendement charte
- `TICKET-S06` [Doc] — INDEX-MODULES dashboard
- `TICKET-S07` [Doc/DevOps] — Résolution docs/ racine selon audit (archive / fusion / migration hors repo)

Dépendances :
- S01 bloque S02, S03, S07
- S02 bloque S03
- S04 bloque S06
- S05 indépendant après S04
- S03 parallélisable en 6 sous-tickets (un par module)

## Notes CDP

**Obstruction majeure identifiée** : le v1.4.0 et tous les commits du matin étaient bien pushed mais personne ne COCHAIT une roadmap. Résultat : chaque nouvelle session doit réapprendre ce qui est fait. Ce brief résout le problème.

**Risque à mitiger** : NB a dit "nettoyer les vieux plans" — interprétation littérale = suppression. Interprétation correcte = "consolide, je ne m'y retrouve pas". Je **refuse la suppression sans audit** (règle `feedback_prevent_corruption_and_loss` + règle `feedback_validate_before_implement`). L'audit L1 servira de base pour que NB valide chaque action destructive individuellement.

**Pattern réutilisable** : CONTEXT.md + ROADMAP-MASTER + AUTO-UPDATE + INDEX-MODULES = **méta-structure** transposable aux autres CPs SQWENSY (JPS, OPearly, etc.). Ce brief crée le prototype pour Heaven, il sera promu en standard cross-CP si concluant.

**Question ouverte à NB** :
- `docs/ACCESS-HEAVEN-OS.md` — contient-il des credentials sensibles ? Si oui, doit sortir du repo public (vers `personal-nb/` ou gitignore).

**Skills Claude Code préférentiels** :
- S01 : `general-purpose` (Architect) + `Explore`
- S02, S04, S05, S06 : `engineering:documentation` + `operations:process-doc`
- S03 : `engineering:documentation` + `senior-frontend`/`senior-backend` selon module (pour stack info)
- S07 : `file-organizer` + `engineering:documentation`

**Estimation CDP totale** : ~4-5h CDP avec sous-agents pour S03 parallélisé.

# 01 — Protocole d'intake des demandes NB

> Comment le CDP transforme une demande NB (langage naturel, parfois compacte) en brief cadré puis en tickets atomiques.

---

## 1. Réception d'une demande NB

### 1.1 Signaux de demande
- Message avec verbe d'action : "fais", "corrige", "ajoute", "refactorise", "propose"…
- Screenshot + contexte : bug visuel, incohérence d'affichage, état UI non conforme
- Référence à une conversation précédente : "comme on avait dit", "le plan qu'on avait fait"
- Directive transverse : "à partir de maintenant…", "chaque fois que…", "toujours…"

### 1.2 Classification (par le CDP)

| Type | Destination | Action immédiate |
|---|---|---|
| **Bug critique prod** | Ticket DevOps/BE urgent | Diagnostiquer + prop. hotfix avant intake formel |
| **Feature / refactor** | Brief PMO | Intake cadré, attendre GO scope |
| **Standard / convention** | Brief PMO + fichier `standards/` | Intake + document standard à produire |
| **Directive transverse durable** | Memory + CLAUDE.md | Sauvegarder en memory NB, référencer |
| **Méta / gouvernance PMO** | Update charte ou protocole | ADR + mise à jour fichier |
| **Question / demande d'info** | Réponse directe, pas d'intake | Pas de brief |

---

## 2. Cadrage — synthèse de compréhension

**Avant** d'intégrer un brief, le CDP livre à NB :

1. **Reformulation** : "si je comprends bien, tu veux X pour Y"
2. **Scope proposé** : ce qui est IN / ce qui est OUT
3. **Impact estimé** : nombre de fichiers, risque, dépendances
4. **Branches concernées** : FE / BE / DB / AI / QA / DevOps / Doc
5. **Question GO** : options 1/2/3 avec recommandation

**Règle** : attendre GO explicite avant d'ouvrir un brief formel. Si NB répond "go" ou équivalent, alors CDP crée le brief.

---

## 3. Format brief

Fichier `plans/PMO/briefs/BRIEF-YYYY-MM-DD-##-<slug>.md`.

Template :

```markdown
# BRIEF-YYYY-MM-DD-## — <titre court>

> **Status** : received | cadré | consolidé | dispatché | livré
> **Source** : NB message du YYYY-MM-DD HH:MM
> **Type** : bug | feature | standard | directive | méta
> **Priorité** : P0 (bloquant) | P1 (important) | P2 (normal) | P3 (nice-to-have)

---

## Demande NB (verbatim résumé)

<3-5 phrases max, l'essentiel de la demande>

## Compréhension CDP

<reformulation structurée, points clés>

## Scope

### IN
- ...

### OUT (explicitement)
- ...

## Branches concernées

- ☐ FE — ...
- ☐ BE — ...
- ☐ DB — ...
- ☐ AI — ...
- ☐ QA — ...
- ☐ DevOps — ...
- ☐ Doc — ...

## Dépendances

- Autres briefs : ...
- Décisions bloquantes : ...
- Ressources externes : ...

## Livrables attendus

1. ...
2. ...

## Acceptance criteria

- [ ] ...
- [ ] ...

## Tickets générés (rempli en phase consolidation)

- `TICKET-###` — ...
- `TICKET-###` — ...

## Notes CDP

<points d'attention, arbitrages, risques>
```

---

## 4. Registry — 02-BRIEFS-REGISTRY.md

Table récapitulative append-only, colonnes : ID | Date | Titre | Type | Priorité | Branches | Statut | Fichier.

Le CDP met à jour ce registre à chaque brief accepté.

---

## 5. Consolidation (fin de cycle d'intake)

**Déclencheur** : NB signale "tous les briefs donnés" (ou équivalent : "go pour le plan global", "on passe à l'exécution").

Le CDP produit alors :

1. **`PMO/plan-global-v{N}.md`** — roadmap consolidée :
   - Ordre d'exécution (respect dépendances)
   - Parallélisation possible (tickets indépendants simultanés)
   - Jalons avec acceptance globale
   - Ressources Claude (skills activés, sous-agents)
2. **`PMO/03-TICKETS-REGISTRY.md`** mis à jour avec tickets atomiques découpés
3. **Synthèse à NB** : 1 page, quick view du plan global

**GO NB attendu sur le plan global** avant de lancer la phase multi-agent.

---

## 6. Dispatch — phase multi-agent

Pour chaque ticket prêt (DoR validée) :

1. CDP sélectionne la branche d'exécution (cf. matrice Charte §2)
2. CDP ouvre un worktree isolé (`using-git-worktrees` skill si besoin)
3. CDP donne prompt cadré à l'agent (scope + acceptance + contraintes)
4. Agent travaille en isolation
5. CDP récupère la PR, dispatch QA review (agent différent)
6. Si DoD validée → merge main → changelog + rapport horodaté
7. Si non → retour agent auteur avec feedback QA

**Parallélisation** : tickets indépendants dispatchés en multi-agent parallèle (règle `dispatching-parallel-agents`).

---

## 7. Clôture d'un brief

Un brief est clos quand :
- Tous ses tickets sont livrés (DoD validée)
- Le CHANGELOG reflète les livrables
- NB a validé explicitement (ou 48h sans retour = auto-clos si P2/P3)

Les briefs clos restent dans `briefs/` (append-only, pas de suppression).

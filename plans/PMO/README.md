# PMO — Project Management Office Heaven

> **Rôle** : orchestration multi-agent, intake des demandes NB, dispatch aux branches spécialisées, QA, merge, reporting.
> **Chef de projet unique** : Claude Opus 4.7 (main conversation).
> **Créé** : 2026-04-24 — Session de consolidation.

---

## 🎯 Raison d'être

NB décrit ses besoins en langage naturel (parfois compact, parfois étendu). Le CDP :

1. **Accueille** la demande (intake)
2. **Clarifie + cadre** le scope (synthèse compréhension + GO NB)
3. **Intègre** dans ce PMO (brief daté, pas perdu)
4. **Découpe** en tickets atomiques quand tous les briefs d'un cycle sont consolidés
5. **Distribue** aux branches d'exécution (FE / BE / DB / AI / DevOps / QA / Doc)
6. **Supervise** exécution isolée (worktrees), review croisée, merge
7. **Reporte** à NB (changelog + rapport horodaté)

Règle cardinale : **aucun code avant GO explicite NB sur un scope cadré**.

---

## 📁 Arborescence

```
plans/PMO/
├── README.md                        ← ce fichier (nav + état)
├── 00-CHARTE.md                     ← rôles équipe + rituels + DoR/DoD
├── 01-INTAKE-PROTOCOL.md            ← workflow intake demande NB → brief → ticket
├── 02-BRIEFS-REGISTRY.md            ← registre chronologique des briefs NB
├── 03-TICKETS-REGISTRY.md           ← registre tickets ouverts / en cours / livrés (créé en Phase Exec)
│
├── briefs/                          ← briefs NB horodatés, accumulation
│   └── BRIEF-YYYY-MM-DD-##-<slug>.md
│
└── standards/                       ← standards techniques transverses (créés à la demande)
    └── (vide — rempli phase 1 PMO)
```

---

## 🔗 Documents référencés (pas dupliqués ici)

| Réf | Fichier | Rôle |
|---|---|---|
| Orchestration rôles | [modules/ai-conversational-agent/07-MULTI-AGENT-ORCHESTRATION.md](../modules/ai-conversational-agent/07-MULTI-AGENT-ORCHESTRATION.md) | Définition des 7 rôles agents (CDP / Architect / FE / BE / DB / AI / QA / Ops) |
| Roadmap multi-agent | [operations/ROADMAP-multiagent-execution-v1.2026-04-21.md](../operations/ROADMAP-multiagent-execution-v1.2026-04-21.md) | Matrice briefs B1–B11 × défauts × sprints BP |
| Standards web dev | [modules/ai-conversational-agent/STANDARDS-WEB-DEV-2026.md](../modules/ai-conversational-agent/STANDARDS-WEB-DEV-2026.md) | Stack 2026 + WCAG 2.2 AA + testing |
| Protocole MAJ plans | [PROTOCOLE-MISE-A-JOUR.md](../PROTOCOLE-MISE-A-JOUR.md) | Déclencheur "met à jour le plan" → rapport horodaté |
| Standard nomenclature | [STANDARD-SUIVI-PROJET.md](../STANDARD-SUIVI-PROJET.md) | Format fichiers V2 cross-CP |

---

## 📊 État courant (mis à jour par le CDP)

- **Phase PMO** : 1 — consolidation livrée, en attente GO NB pour exécution
- **Plan global** : [plan-global-v1.md](./plan-global-v1.md) (4 phases, 14 tickets, 2 parallélisations max)
- **Briefs** : 3 reçus / 2 consolidés dans plan v1 / 1 livré (hotfix DB)
- **Tickets ouverts** : 0 (tous cadrés dans plan v1, attente dispatch)
- **Prochaine transition** : GO NB sur Option A/B/C/D (§9 plan v1) → dispatch multi-agent Phase 1.

---

## ⚠️ Règles non négociables

1. Pas de code avant GO NB sur scope cadré
2. Chaque PR mergée = 1 ticket identifié + 1 review croisée QA
3. Changelog systématique (`plans/_reports/UPDATE-REPORT-YYYY-MM-DD-HHMM-<slug>.md` — protocole existant)
4. Confidentialité Heaven absolue (aucun lien public SQWENSY ↔ Heaven)
5. Jamais de vrai prénom stocké (Yumi/Paloma/Ruby seulement)
6. Optim coûts extrême (cf. `feedback_extreme_cost_optimization_2026`)
7. Auth/DB/Design JAMAIS mixés dans un ticket (cf. `feedback_separate_design_auth`)

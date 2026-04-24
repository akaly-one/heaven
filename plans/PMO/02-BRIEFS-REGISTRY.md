# 02 — Registre des briefs NB

> Append-only. Ordre chronologique (plus récent en bas). Chaque ligne = 1 brief formellement accepté par NB.

---

## Légende statuts

- 🟡 **received** — demande reçue, pas encore cadrée
- 🟠 **cadré** — compréhension + scope validés par NB, en attente consolidation
- 🔵 **consolidé** — intégré au plan global, tickets générés
- 🟢 **dispatché** — phase multi-agent en cours
- ✅ **livré** — tous tickets DoD validés + NB signe off
- ⚪ **archivé** — clos depuis > 30 jours

---

## Tableau

| ID | Date | Titre | Type | Priorité | Branches | Statut | Fichier |
|---|---|---|---|---|---|---|---|
| BRIEF-2026-04-24-01 | 2026-04-24 | Session recovery — restaurer migrations manquantes + fix FK ai_runs | bug | P0 | DB, BE, Doc | ✅ livré (commit `5b64abc`) | [briefs/BRIEF-2026-04-24-01-session-recovery.md](./briefs/BRIEF-2026-04-24-01-session-recovery.md) |
| BRIEF-2026-04-24-02 | 2026-04-24 | Messenger UI Standards — uniformiser pseudo + avatar + bulles chat + mode agent par conversation | standard + feature | P1 | FE, BE, QA, Doc | 🟠 cadré | [briefs/BRIEF-2026-04-24-02-messenger-ui-standards.md](./briefs/BRIEF-2026-04-24-02-messenger-ui-standards.md) |

---

## Compteur

- Total reçus : 2
- En attente consolidation : 1
- En exécution : 0
- Livrés : 1

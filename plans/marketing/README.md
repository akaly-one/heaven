# Plans Marketing Heaven

> **Domaine** : Plans marketing & growth (acquisition, fidélisation, viralité, conversions)
> **Création** : 2026-04-27
> **Owner** : NB (Agence Heaven)
> **Standard** : tout plan suit le `_TEMPLATE.md` (sinon refusé en review)

---

## 🎯 Raison d'être

Ce dossier formalise **tous les plans marketing** Heaven sous un format unifié,
**adaptable au CP existant** (sans casser ou reconstruire) :
- Chaque plan décrit sa logique, ses mécaniques, ses paliers
- Chaque plan inclut une section "Intégration CP" qui mappe explicitement les
  pages, composants, DB, API, agent IA à toucher
- Chaque plan définit ses KPIs et son anti-fraude
- Chaque plan est versionnable + ADRable

---

## 📋 Index des plans actifs

| ID | Plan | Statut | Owner | Modèles |
|---|---|---|---|---|
| 01 | [Ambassadeur Program](./01-ambassadeur-program.md) | 🟡 brainstorm | NB | yumi (pilote) |
| _02_ | _Refer-and-earn link_ | 🔵 idée | — | TBD |
| _03_ | _Quest journalières_ | 🔵 idée | — | TBD |
| _04_ | _Streaks fidélité_ | 🔵 idée | — | TBD |
| _05_ | _Concours mensuel Top Ambassadeur_ | 🔵 idée | — | TBD |
| _06_ | _Wall of fame public_ | 🔵 idée | — | TBD |
| _07_ | _Insider tier (Discord/stories privées)_ | 🔵 idée | — | TBD |
| _08_ | _"Save the queen" objectifs collectifs_ | 🔵 idée | — | TBD |

---

## 🟢 Légende statuts

- 🔵 **idée** — captée, pas encore travaillée
- 🟡 **brainstorm** — concept en cours d'analyse
- 🟠 **cadré** — plan formel rédigé, en attente GO NB
- 🟢 **dispatch** — exécution dev en cours
- ✅ **livré** — déployé en prod
- ⚪ **archivé** — abandonné ou superseded

---

## 🏗️ Pattern de structure

### Pour chaque plan marketing

Copier `_TEMPLATE.md` puis nommer `NN-nom-court.md` (ex : `01-ambassadeur-program.md`).

Section **obligatoires** (refus en review si manquantes) :
1. Métadonnées
2. Vision macro
3. Mécaniques
4. Workflow
5. Anti-fraude
6. **Intégration CP** ← critique
7. Rôle Agent IA
8. KPIs
9. Phases déploiement
10. ADRs

### Pourquoi cette structure ?

- **Modulaire** : un plan = un fichier, lisible isolément
- **Adaptable CP** : la section "Intégration CP" garantit qu'on dev sans casser
- **Versionnable** : chaque plan a son propre cycle, ses propres ADRs
- **Découvrable** : index README à jour
- **Reusable** : le pattern devient le standard pour tous les plans marketing futurs

---

## 🔌 Intégration CP — règles cross-plans

Pour qu'un plan marketing soit "adaptable au CP sans casser" :

1. **Pas de modification breaking de l'archi existante** : les modifications doivent
   être additives (nouveaux composants, nouvelles tables, nouveaux endpoints)
2. **Réutilisation maximale** des composants existants :
   - `<FanDrawer>` (drawer fiche fan partagé messagerie + clients)
   - `<StoryGeneratorModal>` (canvas 1080×1920)
   - `/api/codes` (génération codes accès BRIEF-16)
   - Agent IA Groq (extension persona BRIEF-08)
3. **Page Stratégie** = hub de configuration de tous les plans marketing
4. **Module Clients** = vue centrale du suivi des fans/prospects (à recréer comme demandé NB 2026-04-27)
5. **Agent IA Marketing** = couche additive sur l'agent persona Yumi existant
6. **DB tables** : préfixe `mkt_` ou nom explicite pour éviter collisions

---

## 📊 KPIs cross-plans (vue agrégée Stratégie)

Tous les plans marketing remontent dans le dashboard `/agence/strategie` :
- Acquisition : nouveaux prospects ramenés (par source)
- Conversion : prospects devenant clients payants
- Fidélisation : taux de rétention 7j/30j/90j
- Viralité : coefficient cascade (R0 = nb prospects ramenés par ambassadeur)
- Coût par acquisition : équivalent monétaire des bonus distribués

---

## 🔗 Liens connexes

- **Standard immuable** : [`plans/STANDARD-SUIVI-PROJET.md`](../STANDARD-SUIVI-PROJET.md)
- **Charte PMO** : [`plans/PMO/00-CHARTE.md`](../PMO/00-CHARTE.md)
- **Briefs Registry** : [`plans/PMO/02-BRIEFS-REGISTRY.md`](../PMO/02-BRIEFS-REGISTRY.md)
- **Roadmap master** : [`plans/PMO/03-ROADMAP-MASTER.md`](../PMO/03-ROADMAP-MASTER.md)
- **Module Agent IA** : [`plans/modules/ai-conversational-agent/`](../modules/ai-conversational-agent/)
- **Module Profil public** : [`plans/modules/profil-public/`](../modules/profil-public/)
- **Module Messagerie** : [`plans/modules/messagerie-contacts/`](../modules/messagerie-contacts/)

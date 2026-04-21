# PROTOCOLE-MISE-A-JOUR — Heaven

> **Protocole obligatoire** — s'applique dès que NB dit « met à jour le plan », « update le plan », « ajuste le plan », « synchro les plans », ou équivalent.
> **Objectif** : aucune mise à jour plan ne se fait à la main sans suivre ces étapes.
> **Standard** : cohérent avec [`STANDARD-SUIVI-PROJET.md`](./STANDARD-SUIVI-PROJET.md).
> **Version** : V1 (2026-04-21).
> **Scope** : Heaven CP actif. Transposable autres CPs (JPS, OPearly, SQWENSY OS) plus tard.

---

## 1. Trigger — expressions déclencheuses

Le protocole s'active quand NB dit (ou équivalent) :

- « met à jour le plan »
- « update le plan »
- « synchronise les plans »
- « ajuste le plan »
- « reflète ça dans les plans »
- « actualise la doc plan »
- « commit les changements plan »

Si NB est plus spécifique (ex. « met à jour dashboard STRATEGY »), appliquer le protocole uniquement sur ce scope.

---

## 2. Étape 1 — Détection du CP

### Règles auto-détection

| Indice | CP déduit |
|---|---|
| CWD = `clients/heaven/*` ou worktree Heaven | **Heaven** |
| CWD = `sqwensy-os/*` | **SQWENSY OS** |
| CWD = `clients/jps/*` | **JPS** |
| CWD = `clients/opearly/*` | **OPearly** |
| Conversation récente parle d'un CP précis sans ambiguïté | CP concerné |
| Racine `AI-LAB/` ou ambigu | **Demander NB** : « Tu veux mettre à jour quel CP ? » |

### Règle de priorité

1. CWD / worktree explicite > conversation > mémoire
2. Si CWD Heaven + conversation SQWENSY mentionnée en passant → **Heaven** (le CWD prime)
3. Si plusieurs CPs discutés récemment → demander explicitement

---

## 3. Étape 2 — Analyse scope des changements

Avant toute écriture, **reconstituer ce qui a changé** depuis le dernier commit plan :

### Sources à analyser
- Diff git sur `src/`, `supabase/migrations/`, `public/` depuis dernier commit plan
- Messages NB de la session en cours (briefs, décisions, corrections)
- Fichiers `plans/` modifiés récemment
- ADRs ajoutés (`DECISIONS.md` global + par module)

### Mapping changement → fichier plan

| Type de changement constaté | Fichier(s) à toucher |
|---|---|
| Nouvelle feature UI / module | `modules/<nom>/STRATEGY-v<N>` + `TECH-v<N>` + `CHANGELOG.md` du module |
| Nouveau composant front pur | `modules/<nom>/TECH-v<N>` + `CHANGELOG.md` |
| Changement API / route | `modules/<nom>/TECH-v<N>` + éventuellement `03-tech/ARCHITECTURE-v<N>` |
| Migration SQL appliquée | `04-ops/MIGRATION-LOG-v<N>` + `03-tech/DATA-MODEL-v<N>` si structural |
| Changement stratégique / business | `01-strategy/STRATEGY-v<N>` + `01-strategy/BUSINESS-v<N>` (si créé) + BP Cowork si source officielle |
| Décision structurelle | `DECISIONS.md` racine ou module (ADR) |
| Cleanup / hygiène | `04-ops/MAINTENANCE-v<N>` + `CHANGELOG.md` |
| Nouvelle spec ponctuelle | `operations/SPEC-<scope>-v<N>.<date>.md` |
| Update roadmap | `01-strategy/ROADMAP-v<N>` |
| Décisions NB spécifiques (briefs en conversation) | Module concerné `STRATEGY` + `DECISIONS.md` |

### Impacts implicites à vérifier
- `plans/README.md` si nouveau fichier / module
- `plans/NOMENCLATURE.md` si nouveau TYPE de préfixe
- `CHANGELOG-PLANS.md` si refonte structurelle
- `CLAUDE.md` racine CP si change de règle de travail

---

## 4. Étape 3 — Décision versioning

### Mineur (95 % des cas)
- Éditer le fichier courant
- Entry dans `CHANGELOG.md` du module (ou racine si couche transverse)
- Pas de version bump

**Critères mineur** :
- Ajout de détail
- Correction
- Clarification
- Ajustement d'un point précis
- Nouveau bullet dans une liste existante

### Majeur (refonte)
- Créer `<TYPE>-v<N+1>.<nouvelle date>.md`
- Déplacer l'ancien vers `_archive-v1/` ou `_archive-v<N>/` avec nom d'origine
- Entry dans `_archive-*/README-archive.md`
- Entry dans `CHANGELOG.md` du module
- ADR dans `DECISIONS.md` si structural

**Critères majeur** :
- Réécriture complète
- Changement de framework / approche
- Nouveau pattern architectural
- Refonte UX / flow
- Décision qui casse la cohérence des versions précédentes

### Décision structurelle
- Ajouter ADR dans `DECISIONS.md` (global ou module)
- Format Nygard : Context / Decision / Consequences
- Référencer ADR dans les fichiers impactés

---

## 5. Étape 4 — Rapport obligatoire

Chaque application du protocole génère **un rapport horodaté** :

### Emplacement
```
plans/_reports/UPDATE-REPORT-<YYYY-MM-DD>-<HHMM>.md
```

(Créer le dossier `_reports/` la première fois)

### Contenu obligatoire

```markdown
# Update Report — <YYYY-MM-DD HH:MM>

**CP** : Heaven
**Trigger** : « <phrase NB ou contexte> »
**Opérateur** : Claude Code
**Durée session** : <approximation>

## Résumé

1-3 phrases sur ce qui a changé et pourquoi.

## Sources consultées

- Conversation session courante (briefs B<N>... décisions NB)
- Git diff `src/` depuis <commit SHA>
- ADRs ajoutés (si existants)

## Fichiers modifiés

| Fichier | Type modif | Version avant | Version après | ADR lié |
|---|---|---|---|---|
| ... | minor / major | v1 | v1 (entry CHANGELOG) | — |
| ... | major | v1 | v2 (v1 archivé) | ADR-005 |

## Fichiers créés

| Fichier | Raison |
|---|---|
| ... | ... |

## Fichiers archivés

| Fichier source | Destination archive |
|---|---|

## ADRs ajoutés

- ADR-<N> — <titre>

## Indexes mis à jour

- [x] `plans/README.md`
- [x] `plans/CHANGELOG-PLANS.md`
- [ ] `plans/NOMENCLATURE.md` (pas nécessaire)
- [ ] `CLAUDE.md` racine CP

## Impact cross-module

Liste des modules affectés indirectement (si applicable).

## Prochaines étapes suggérées

- ...
```

### Rapport = commit git (séparé du code)
- Commit dédié : `docs(plans): update report YYYY-MM-DD HH:MM`
- Contient le rapport + les fichiers plans modifiés
- **Séparé** du code source (commits distincts pour clarté)

---

## 6. Étape 5 — Validation utilisateur

Avant d'écrire quoi que ce soit, présenter à NB :

```
**Plan d'update proposé** (détection auto) :

CP : Heaven (déduit via CWD)
Scope : X modifications détectées

Fichiers à modifier :
1. modules/dashboard/STRATEGY-v1 — ajout brief B12 (minor)
2. modules/dashboard/CHANGELOG.md — entry 2026-04-21
3. DECISIONS.md modules/dashboard — ADR-004 (new)

Fichiers à archiver :
- (aucun)

Fichiers à créer :
- (aucun)

Impact cross-module :
- profil-public (dépend de dashboard pour la couronne sidebar)

Rapport : plans/_reports/UPDATE-REPORT-2026-04-21-2015.md

GO / ajuster ?
```

NB valide ou ajuste. **Si NB pressé** et protocole bien rodé, il peut dire « GO direct » pour sauter la validation.

---

## 7. Étape 6 — Application

1. Écrire les fichiers modifiés / créés
2. Déplacer les archives si versioning majeur
3. Mettre à jour les indexes impactés
4. Générer le rapport
5. Proposer commit git au NB

---

## 8. Règles P0 obligatoires

1. **Aucun vrai prénom stocké** dans plan/code/DB/comment
2. **Aucun lien public Heaven ↔ SQWENSY**
3. **Archivage avant suppression** (jamais de `rm` brut sans passage archive)
4. **ADR pour toute décision structurelle** (pas de silent breaking change)
5. **Rapport obligatoire** même pour mineur — traçabilité totale
6. **Validation NB** avant écriture, sauf « GO direct » explicite
7. **CHANGELOG anti-chronologique** (nouveau en haut)
8. **ADRs append-only** (jamais éditer "Accepted")
9. **Dates ISO** `YYYY-MM-DD` uniquement

---

## 9. Cas limites / exceptions

### Ambiguïté de scope
Si plusieurs modules pourraient être concernés → demander : « Les changements touchent dashboard ET profil-public. On met à jour les deux ou seulement l'un ? »

### Conflit avec BP Cowork (source de vérité business)
Les `plans/business/bp-agence-heaven-2026-04/` sont **intouchables**. Si les changements contredisent le BP → ADR explicite + éventuel avenant daté `business/bp-agence-heaven-YYYY-MM/` (nouveau dossier source).

### Session très longue avec plein de changements
Si session > 2 h ou > 10 modifications code → découper le rapport par thème (ex: `UPDATE-REPORT-2026-04-21-1400-messaging.md` + `UPDATE-REPORT-2026-04-21-1800-dashboard.md`).

### NB corrige mon rapport
Accepter la correction et modifier le rapport avant commit. Jamais écraser l'historique si déjà committé — créer un `UPDATE-REPORT-CORRIGE-*` dédié.

### Pas de CP déterminable (projet croisé)
Demander explicitement. Ne jamais deviner si ambiguïté.

---

## 10. Cross-CP (à activer plus tard)

Quand NB dira d'appliquer ce protocole aux autres CPs :

1. Copier `PROTOCOLE-MISE-A-JOUR.md` dans `clients/jps/plans/`, `clients/opearly/plans/`, `sqwensy-os/plans/`
2. Adapter `CLAUDE.md` de chaque CP
3. Adapter `sqwensy-os/docs/STANDARD-SUIVI-PROJET.md` avec section « Protocole MAJ »
4. Mémoire feedback universelle

---

## 11. Invariants

- Ce protocole **reste en vigueur** sauf décision explicite NB (ADR)
- Toute exception doit être documentée par un ADR dans `DECISIONS.md`
- Le protocole s'auto-met-à-jour via ADR + nouveau fichier versionné `PROTOCOLE-MISE-A-JOUR-v2.<date>.md`

---

## 12. Première application attendue

Prochaine fois que NB dit « met à jour le plan » :
1. Je détecte le CP via CWD
2. J'analyse la session et les diffs
3. Je propose le plan d'update
4. J'attends GO
5. J'applique + je génère le rapport
6. Je propose le commit git

Pas d'exception. Pas d'improvisation.

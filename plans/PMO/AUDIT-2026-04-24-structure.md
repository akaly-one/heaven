# AUDIT Structure Heaven — 2026-04-24

> **Ticket** : TICKET-S01 (Phase 1 plan-global-v1)
> **Scope** : inventaire complet + classification des 106 fichiers (101 `plans/` + 5 `docs/`)
> **Méthode** : lecture structurelle + sample contenus critiques + cross-check règles NB
> **Résultat** : **repo largement propre**, 3 actions destructives identifiées nécessitant GO NB

---

## 🎯 Verdict global

**Le repo n'est PAS sale.** Le nettoyage V1→V2 (ADR-007, avril 2026) a déjà purgé l'obsolète. Ce qui reste à faire :

1. **1 migration sécurité CRITIQUE** : `docs/ACCESS-HEAVEN-OS.md` contient des infos sensibles (IDs projet, API keys Cloudinary publique, structure DB) → migration vers `personal-nb/` hors repo.
2. **2 archivages** de fichiers `docs/` obsolètes désynchronisés.
3. **1 nettoyage mineur** (`.DS_Store`, update README `docs/`).
4. **100 autres fichiers** sont actifs V2 et à garder tels quels.

---

## 📊 Classification détaillée

### 🔴 SENSIBLE (action sécurité urgente)

| # | Fichier | Contenu détecté | Action | GO NB |
|---|---|---|---|---|
| 1 | `docs/ACCESS-HEAVEN-OS.md` | Supabase project ID `tbvojfjfgmjiwitiudbn` + URL + anon key publishable / Cloudinary Cloud Name `ddwgcu3d5` + API Key `249245334688281` / Structure DB 16 tables / IDs models m0/m1/m2/m3 / Mentions secrets en `*(dans .env.local)*` | **Migrer** → `/Users/aka/Documents/AI-LAB/personal-nb/heaven/ACCESS.md` + supprimer original du repo + commit | ⚠️ GO requis |

**Analyse risque** :
- L'**anon key** Supabase est "publishable" (destinée au front) → pas un secret critique mais expose l'instance
- La **Cloudinary API key** est publique (pas le API secret) → usage limité sans le secret
- **Aucun vrai secret** (`JWT Secret`, `Service Role`, `HEAVEN_SYNC_SECRET`) n'est commité — tous sont marqués `*(dans .env.local)*`
- **Mais** : la combinaison "project ID + structure DB + schéma tables + model registry" facilite un pentest ciblé

**Décision cohérente avec règle NB** : `feedback_credentials_never_in_repo` → tout ce qui a des accès/IDs structurants va dans `personal-nb/`.

---

### ⚠️ OBSOLÈTE (archivage proposé)

| # | Fichier | Raison obsolescence | Action proposée | GO NB |
|---|---|---|---|---|
| 2 | `docs/CHANGELOG.md` | Dernière entrée v0.4.0 (13 avril 2026). Le `CHANGELOG.md` racine est à v1.4.0 (24 avril 2026). Le README `docs/` dit lui-même "(copié à la racine, ici historique)" = divergence assumée | Archiver → `plans/_archive-v1/docs-CHANGELOG-pre-v1.md` | ⚠️ GO |
| 3 | `docs/web/VITRINE-HEAVEN.md` | 16 lignes qui décrivent une "vitrine publique" séparée + "pas encore de board OS dedie" → confusion avec vitrine SQWENSY. Heaven est CONFIDENTIEL, pas de vitrine publique prévue. Fichier décalé du contexte actuel | Archiver → `plans/_archive-v1/docs-web-vitrine-obsolete-2026-04.md` | ⚠️ GO |

---

### ✅ ACTIF — à garder / ajuster mineur

| # | Fichier | Statut | Action |
|---|---|---|---|
| 4 | `docs/README.md` | Décrit la règle `docs/` = user-only (cohérent règle NB) | **Update requis** : retirer mention `superpowers/` (dossier n'existe pas), retirer mention `ACCESS-HEAVEN-OS.md` (sera migré), retirer mention `CHANGELOG.md` (sera archivé). Garder section Fanvue Release Form |
| 5 | `docs/Fanvue Model Release Form Template.docx` | Template contrat user, conforme règle `docs/ = user only` | ✅ Keep |
| 6 | `docs/.DS_Store` | Artefact macOS commité par erreur | **Auto** : `git rm` + ajouter à `.gitignore` racine si pas déjà |

---

### ✅ ACTIF — `plans/` (101 fichiers, aucun obsolète détecté)

| Dossier | Fichiers | Statut | Notes |
|---|---|---|---|
| `plans/00-brief/` | 4 (BRIEF, OBJECTIVES, SCOPE, SYNERGY v1.2026-04-21) | ✅ actif V2 | — |
| `plans/01-strategy/` | 4 (STRATEGY, BUSINESS, ROADMAP, RISKS v1.2026-04-21) | ✅ actif V2 | — |
| `plans/02-design/` | 1 (DESIGN-SYSTEM v1.2026-04-21) | ✅ actif V2 | — |
| `plans/03-tech/` | 5 (ARCHITECTURE, ISOLATION-CP, SECURITY, STACK, TOOLS v1.2026-04-21 + SECURITY-PROGRESSIVE-2026) | ✅ actif V2 | SECURITY-PROGRESSIVE ajouté 24/04 (directive NB phases d'upgrade). Pas de suffixe v1 mais document par phases — acceptable |
| `plans/04-ops/` | 3 (MAINTENANCE, MIGRATION-LOG, PROCEDURES v1.2026-04-21) | ✅ actif V2 | — |
| `plans/PMO/` | 8 (README, 00-CHARTE, 01-INTAKE, 02-REGISTRY, plan-global-v1 + 3 briefs) | ✅ actif V2 | Créé aujourd'hui, socle orchestration |
| `plans/_archive-v1/` | 1 (AUDIT-cleanup 2026-04-18) | 📦 archive propre | ADR-007 |
| `plans/_reports/` | 12 rapports horodatés | ✅ historique append-only | Pattern respecté |
| `plans/business/` | 3 fichiers (bp-agence + paloma-collab) | ✅ actif | Sources vérité business |
| `plans/operations/` | 6 fichiers (ROADMAP × 2, SPEC × 3, CHANGELOG) | ✅ actif V2 | — |
| `plans/modules/ai-conversational-agent/` | 22 fichiers (00-README + 01-17 + CHANGELOG + DECISIONS + KICKOFF + STANDARDS) | ✅ actif V2 | Module le plus riche |
| `plans/modules/contenu-packs/` | 5 (README, STRATEGY, TECH, DECISIONS, CHANGELOG) | ✅ actif V2 | Pattern uniforme |
| `plans/modules/dashboard/` | 5 | ✅ actif V2 | Idem |
| `plans/modules/messagerie-contacts/` | 5 | ✅ actif V2 | Cible BRIEF-02 Phase 2 |
| `plans/modules/models/` | 6 (README, 3 × INFRA-<slug>, DECISIONS, CHANGELOG) | ✅ actif V2 | — |
| `plans/modules/profil-public/` | 5 | ✅ actif V2 | — |
| `plans/README.md`, `STANDARD-SUIVI-PROJET.md`, `NOMENCLATURE.md`, `DECISIONS.md`, `CHANGELOG-PLANS.md`, `PROTOCOLE-MISE-A-JOUR.md` | 6 racine plans | ✅ actif V2 | Références transverses |

**Total `plans/`** : 101 fichiers, **100% actifs V2**, aucune action requise.

---

### ✅ ROOT Heaven

| Fichier | Statut | Notes |
|---|---|---|
| `README.md` | ✅ actif dev | Pas doublon avec `docs/README.md` (celui-ci est user-facing) |
| `CHANGELOG.md` | ✅ actif dev (v1.4.0 à jour) | — |
| `CLAUDE.md` | ✅ context Claude | — |

---

## 📝 Synthèse actions proposées (par priorité)

### 🔴 Actions destructives nécessitant GO NB ligne par ligne

| # | Action | Fichier source | Destination | Commande |
|---|---|---|---|---|
| A1 | Migrer credentials hors repo | `docs/ACCESS-HEAVEN-OS.md` | `/Users/aka/Documents/AI-LAB/personal-nb/heaven/ACCESS.md` | `mv` puis `git rm` puis commit |
| A2 | Archiver CHANGELOG obsolète | `docs/CHANGELOG.md` | `plans/_archive-v1/docs-CHANGELOG-pre-v1.md` | `git mv` + header obsolescence |
| A3 | Archiver VITRINE obsolète | `docs/web/VITRINE-HEAVEN.md` | `plans/_archive-v1/docs-web-vitrine-obsolete-2026-04.md` | `git mv` + header obsolescence + `rmdir docs/web` si vide |

### 🟢 Actions automatiques (pas de risque)

| # | Action | Détails |
|---|---|---|
| B1 | Update `docs/README.md` | Retirer refs aux fichiers A1/A2/A3 et `superpowers/` inexistant |
| B2 | Gitignore `.DS_Store` | Vérifier `.gitignore` racine contient `.DS_Store` ; supprimer `docs/.DS_Store` trackés |

---

## 🚦 Prochaines étapes

**TICKET-S01 livré.** Attente GO NB sur les 3 actions destructives (A1, A2, A3).

**Si GO global** : j'exécute A1+A2+A3+B1+B2 en un seul TICKET-S07 (résolution `docs/`) avec commit atomique.

**Si GO sélectif** : tu me dis quelle action GO, et je fais ticket par ticket.

**Recommandation CDP** : **GO global** sur les 3 — elles sont cohérentes (toutes dans `docs/`, toutes des migrations non destructives du point de vue contenu — on archive ou déplace, rien n'est perdu).

Après S07, on passe à **TICKET-S02** (template `MODULE-CONTEXT-TEMPLATE.md`).

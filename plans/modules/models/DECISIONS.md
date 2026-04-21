# Decisions — Module Models

> Append-only. Format ADR (Context / Decision / Consequences).

---

## ADR-001 — IDs canoniques `m1`/`m2`/`m3` pour yumi/paloma/ruby

**Date** : 2026-04-20
**Status** : Accepted

### Context
Avant la migration `033_realign_model_ids.sql`, les IDs étaient incohérents (yumi=m2, paloma=m4). Confusion entre slug (alias front) et ID backend.

### Decision
IDs canoniques réalignés :
- `m1` = yumi (root admin, modèle IA)
- `m2` = paloma (Mode B Hub annexe)
- `m3` = ruby (Mode B Hub annexe)

Slug = alias front uniquement, pas d'usage backend.

### Consequences
- ✅ Cohérence numérique
- ✅ Yumi = m1 reflète son rôle d'admin principal (root Heaven)
- ⚠️ Migration SQL effectuée (033) + cascade sur toutes tables scopées par `model_id`

---

## ADR-002 — Skeleton uniforme cross-modèles

**Date** : 2026-04-21
**Status** : Proposed

### Context
Brief NB B4 : Paloma (m2) et Ruby (m3) doivent avoir chacune un profil dédié en DB + Cloudinary, mais skeleton CP et page profil uniformes avec Yumi.

### Decision
Même code `/m/[slug]/page.tsx` pour les 3 modèles. Même skeleton CP. Différenciation uniquement via :
- Scoping `model_id` sur les queries DB
- Dossiers Cloudinary isolés (`m1/`, `m2/`, `m3/`)
- Flags `mode_operation` (A/B), `identity_plan` (discovery/shadow), `palier_remuneration` (P1-P4) appliqués en runtime

Yumi a des accès supplémentaires (admin principal) via son rôle + scopes JWT.

### Consequences
- ✅ Un seul code à maintenir
- ✅ Ajout futur modèle = seed + config, zéro code
- ✅ Cohérence UX
- ⚠️ Tester soigneusement les RLS policies pour garantir isolation

---

## ADR-003 — Collaboration PALOMA en dossier daté `business/paloma-collaboration-2026-04/`

**Date** : 2026-04-18
**Status** : Accepted

### Context
Le plan de collaboration PALOMA (28 KB, juridique BE + ONEM + INASTI + contrat type) est un document long et spécifique à une personne physique. Question : dans `modules/models/` ou `business/` ?

### Decision
Placer dans `business/paloma-collaboration-2026-04/` comme dossier source daté (pattern cohérent avec `bp-agence-heaven-2026-04/`). Ce n'est pas une spec technique de module mais un plan business + juridique évolutif.

### Consequences
- ✅ Séparation claire business/RH vs tech/infra
- ✅ Permet ajout futur des docs contrats signés, attestations ONEM, etc.
- ⚠️ Référence croisée depuis `modules/models/INFRA-paloma-v1.md` pour que Claude Code trouve le contexte

# Update Report — 2026-04-21 23:30 — Settings sidebar + validation cloisonnement complet

**CP** : Heaven
**Trigger** : NB « separe les acces dans parametres pour les comptes stndard »
**Opérateur** : Claude Code
**Durée session** : ~15 min

---

## Fixes

### Sidebar : Settings migré NAV_MAIN (accès paloma/ruby)

Paloma/Ruby (role=model) n'avaient pas d'accès sidebar vers leurs Settings (tab Général + Finances + Agent DM) car Settings était dans `NAV_ROOT` (root-only).

**Fix** :
- `Paramètres` (icône Settings) déplacé de `NAV_ROOT` vers `NAV_MAIN` → visible à tous (paloma/ruby/yumi/root)
- `NAV_ROOT` ne contient plus que `Ops` (root + yumi uniquement)
- Mobile bottom nav aligné
- Le scoping intra-page dans `/agence/settings` filtre les tabs selon rôle :
  - Admin → Général + Comptes + Dev Center
  - Model → Général + Finances + Agent DM

---

## Tests preview heaven:3002

### Paloma login → `/agence/settings`
- Sidebar (6 items) : Dashboard / Messagerie / Instagram / Contenu / Stratégie / **Paramètres** ✅
- Pas d'Ops top-level ✅
- Pas de RootCpSelector ✅
- Tabs Settings : Général / Finances / Agent DM ✅
- Header : "Paloma / Settings"

### Ruby login → `/agence/strategie`
- Sidebar (6 items) identique Paloma ✅
- **1 seul onglet visible : Plan C — Consultance** ✅ (mode_operation=C)
- Contenu : "Services B2B indépendantes, différenciation Découverte/Shadow, Offre Type (Setup 800-2500€, Sub 150-500€/mois, Commission 5-10%)"
- Pas de leak Plan A ou Plan B

### Bonus : API `/api/agence/models/ruby`
- Return `{ mode: "C", slug: "ruby", id: "m3" }` ✅

---

## Matrice finale cloisonnement

| | Root | Yumi (admin) | Paloma (m2) | Ruby (m3) |
|---|---|---|---|---|
| **Sidebar Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Sidebar Messagerie** | ✅ | ✅ | ✅ | ✅ |
| **Sidebar Instagram** | ✅ | ✅ | ✅ | ✅ |
| **Sidebar Contenu** | ✅ | ✅ | ✅ | ✅ |
| **Sidebar Stratégie** | ✅ 3 onglets | ✅ 3 onglets | ✅ **Plan B seul** | ✅ **Plan C seul** |
| **Sidebar Paramètres** | ✅ 3 tabs admin | ✅ 3 tabs admin | ✅ 3 tabs model | ✅ 3 tabs model |
| **Sidebar Ops** | ✅ | ✅ | ❌ | ❌ |
| **RootCpSelector** | ✅ | ❌ (fixé scope m1) | ❌ | ❌ |
| **Instagram data scope** | Via selector | m1 | Empty (no config) | Empty (no config) |
| **Paramètres Comptes tab** | ✅ | ✅ | ❌ | ❌ |
| **Paramètres Dev Center** | ✅ | ✅ | ❌ | ❌ |
| **Paramètres Finances tab** | ❌ (admin voit via /agence/finances dédié) | ❌ | ✅ own only | ✅ own only |
| **Paramètres Agent DM tab** | ❌ | ❌ | ✅ (request) | ✅ (request) |

---

## Fichiers modifiés

- `src/shared/components/sidebar.tsx` : Settings migré NAV_MAIN + Ops reste NAV_ROOT

---

## Tests couverts (matrice NB)

1. ✅ Root fresh login → skeleton vide (Aucun CP)
2. ✅ Root switch Yumi → breadcrumb Yumi + IG stats Yumi
3. ✅ Root switch Paloma → breadcrumb Paloma + empty IG state
4. ✅ Root switch + click couronne Dash → pas de saut mouton
5. ✅ Root reload → selection restaurée via localStorage
6. ✅ Paloma login → sidebar 6 items (Dashboard..Paramètres) + Stratégie Plan B seul
7. ✅ Ruby login → sidebar 6 items + Stratégie **Plan C seul**
8. ✅ Paloma Settings → Général + Finances + Agent DM (3 tabs)
9. ✅ Ruby Settings → idem Paloma
10. ✅ Paloma Instagram → empty state « Instagram non configuré »
11. ✅ Root Instagram (view Yumi) → stats 4993 followers + 20 posts
12. ✅ Ordre accounts table : Root → Yumi → Paloma → Ruby

---

## Indexes mis à jour

- [x] `plans/_reports/UPDATE-REPORT-2026-04-21-2330-settings-nav-final.md` (ce fichier)
- [ ] `plans/03-tech/ISOLATION-CP-v1.2026-04-21.md` (entry Settings NAV_MAIN à ajouter)

---

## Phases multi-agent restantes

- **Phase 6** (Agent IA worker) — bloquée D-5 (clé OpenRouter)
- **Phase 8** (Agence modules templates) — dépend Phase 6
- **Phase 9** (Caming tracking) — bloquée D-7/D-8 (Mode B + platform)
- **Phase 11** (Business Verif + cron infra) — bloquée D-4/D-6 (NB actions externes)
- **Phase 12** (QA + Docs final) — à lancer après validation complète

Phases 1, 2, 3, 4, 5, 7, 10 + fixes scope/cloisonnement : **toutes livrées**. Plateforme stable pour tests NB final avant décisions externes.

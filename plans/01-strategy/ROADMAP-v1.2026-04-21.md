# 09 — Roadmap

> **Source business** : `plans/business/bp-agence-heaven-2026-04/README.md` (BP v1 + paliers + Release Form)
> **Source exécution** : `plans/ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md` (mise à niveau technique avril + décisions D-1/D-6)
> **Progress 2026-04-21** : ~78 % infrastructure livrée — bloquants business = Business Verif SQWENSY + clé IA

---

## Matrice Trimestres × Modes (BP §9)

| Trimestre | Mode A | Mode B | Mode C | Milestone chiffré |
|---|---|---|---|---|
| **T1 (M1-M3)** | 🟢 Ouvert — 1 persona IA | 🔴 Fermé | 🔴 Fermé | ≥ 500 abonnés free Fanvue + ≥ 100 € cumul |
| **T2 (M4-M6)** | 🟢 Continue | 🟢 Ouvert — 1-2 modèles | 🔴 Fermé | ≥ 2 modèles B + ≥ 400 €/mois A+B |
| **T3 (M7-M9)** | 🟢 Plein régime | 🟢 Caming live opérationnel | 🟡 Templates B2B en prep | ≥ 750 €/mois A+B + marge ≥ 150 € |
| **T4 (M10-M12)** | 🟢 | 🟢 Bascules P2→P3 | 🟢 Ouvert — 1-2 clientes pilotes | ≥ 1 150 €/mois A+B + 1 cliente C |

**Décisions go/no-go** :
- M3 avant ouverture Mode B
- M6 avant caming live
- M9 avant ouverture Mode C
- M12 scale ou pivot

---

## Sprints d'implémentation (BP §Plan full-stack)

### ✅ Sprint 0 — Fondation infra (livrée v1.0 + v1.1)
Plateforme `heaven-os.vercel.app` déployée — auth JWT, DB Supabase, Cloudinary, 9 migrations 030-038b, feed polymorphe, messagerie unifiée, IG ops, Meta App Review artifacts.

### 🔜 Sprint 1 — Data model Modes + Paliers (S1-S2)
- [ ] Migration : ajout champs `mode_operation`, `identity_plan`, `palier_remuneration`, `fiscal_voie`, `statut_initial*`, `caming_active`, `caming_platforms` sur `agence_models`
- [ ] Migration : nouvelles tables `agence_releaseform_dossier`, `agence_caming_sessions`
- [ ] Extension `agence_revenus_modele` avec `source_platform`, `source_type`, `acquisition_channel`, `caming_session_id`
- [ ] RLS policies scope admin DMCA (`dmca:read`)
- [ ] Seed 3 profils : `m1` (Mode A), `m2` (Mode B, P1, Shadow), `m3` (Mode B, P1, Découverte)

### 🔜 Sprint 2 — CP panels Plan Identité + Palier (S3-S4)
- [ ] Composant `<IdentityPlanPanel>` — radio + guidelines + impact coût prod
- [ ] Composant `<PalierRemunerationPanel>` — palier courant + simulateur revenu
- [ ] Composant `<StatutInitialCard>` — alerte si chômage + bouton « Vérifié ONEM »
- [ ] Intégration dans `/agence/models/[id]`

### 🔜 Sprint 3 — Release Form DMCA workflow (S5-S6)
- [ ] Bucket Supabase privé `dmca-dossiers` + RLS admin scope
- [ ] Composant `<ReleaseFormUploader>` — 5 uploads séquentiels
- [ ] State machine : `pending` → `documents_collected` → `submitted_dmca` → `validated`/`rejected`
- [ ] Template email pré-rempli `mailto:DMCA@fanvue.com?...`
- [ ] Blocage publication tant que `release_form_status != validated`

### 🔜 Sprint 4 — Caming tracking (S7-S8)
- [ ] Table `agence_caming_sessions` + CRUD admin
- [ ] UTM dynamique Beacon : `?utm_source=cam&utm_medium={platform}&utm_campaign=session_{uuid}`
- [ ] Attribution cron quotidienne : nouveaux abonnés Fanvue ↔ sessions cam (UTM match, fenêtre J+7)
- [ ] Dashboard `/agence/caming` — sessions actives, viewers, conversion

### 🔜 Sprint 5 — Commission + bascule palier (S9-S10)
- [ ] Vue matérialisée `agence_commission_calcul` mensuelle
- [ ] Cron fin de mois : calcul net distribuable + part modèle (70 %) + part Sqwensy (30 %)
- [ ] Génération PDF justificatif (note paiement P1/P2, état préparation facturation P3/P4)
- [ ] Cron mensuel bascule palier : 3 mois > 750 € → notif admin
- [ ] Page `/agence/finances` : vue consolidée par modèle + bascules en attente

### 🔜 Sprint 6 — Agent IA DM différencié par Mode (S11-S12)
- [ ] Scripts agent IA : Mode A (persona IA) vs Mode B (modèle réelle) × Plan Identité (Découverte/Shadow)
- [ ] Funnel cam → PPV : suivi DM post-session cam + upsell PPV scripté
- [ ] Escalade humaine sur conversations scoring > seuil
- [ ] Intégration avec `agence_ai_replies` (cf. `plans/IA-AGENT-SPEC.md`)

### 🔜 Sprint 7 — Mode C B2B (M10-M12, conditionnel)
- [ ] Démarre uniquement si milestones M9 validés
- [ ] Schéma `agence_b2b_clients` + CRM clientes B2B
- [ ] Facturation setup / subscription / commission croissance
- [ ] Instance agent IA dédiée par cliente B2B

---

## 📋 Chantiers techniques en parallèle (hors sprints BP)

Source : `plans/ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md` (décisions D-1/D-6 NB pending).

| Module | Scope | Bloquant |
|---|---|---|
| **Module A — Navigation refactor** | Spec : `REFACTOR-NAVIGATION-SPEC.md` — 3 options sidebar | D-1/D-2/D-3 |
| **Module B — Décomposition monolithe** | `/agence/page.tsx` 2 453L → shell + 4 composants | Dépend Module A |
| **Module D — Meta App Review** | Plan : `META-APP-PUBLICATION-PLAN.md` — Business Verif SQWENSY BE | D-4 NB |
| **Module G — Agent IA** | Spec : `IA-AGENT-SPEC.md` — persona + coûts + review/auto | D-5 clé IA |
| **Infra cron worker** | Vercel Hobby 1/jour max → Upstash QStash / GitHub Actions | D-6 NB |

---

## 8 fixes UX legacy (restants post v1.1)

1. ✅ Story TTL 24h
2. ✅ Bouton fermer story
3. ✅ Déconnexion pseudo
4. Galerie scroll restoration (partiel)
5. Pack tier gate — animation reveal
6. Wall reply threading
7. Dashboard filter persistance (localStorage)
8. Message read receipts

---

## Priorités immédiates 2026-Q2

1. **Débloquer D-4** (Business Verif SQWENSY) → unlock Meta App Review → IG prod live
2. **Débloquer D-5** (clé IA) → activer worker process-ig-replies en review mode
3. **Débloquer D-6** (cron infra) → worker 1/min réel
4. **Sprint 1** (data model Modes + Paliers) → prérequis pour tous sprints suivants
5. **Décisions D-1/D-2/D-3** → Module A navigation avant décomposition monolithe

---

## Décisions bloquantes NB (récapitulatif)

| Clé | Scope | Défaut recommandé |
|-----|-------|--------------------|
| D-1 | Option navigation (1/2/3) | Option 1 sidebar 1:1 pages |
| D-2 | Rename `/agence` | Garder `/agence` |
| D-3 | Sidebar par défaut | Expanded + toggle persistant |
| D-4 | BM Meta | SQWENSY via Business Manager |
| D-5 | Provider clé IA | OpenRouter Claude Sonnet 4.6 |
| D-6 | Cron worker infra | Upstash QStash (free tier) |
| **D-7** | **Ouverture Mode B (1ère modèle)** | **Attendre M3 validé Mode A** |
| **D-8** | **Caming platform prioritaire** | **Stripchat (best split 50-65 %)** |

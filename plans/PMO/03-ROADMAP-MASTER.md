# 03 — ROADMAP-MASTER Heaven

> **Source de vérité unique** pour toutes les tâches cross-briefs.
> Mis à jour **à chaque ticket livré** par le CDP (règle auto-update Charte §5).
> Créé le 2026-04-24 en rattrapage (CDP a oublié de le créer après BRIEF-03 intake).

---

## 📊 Vue d'ensemble

| Métrique | Valeur |
|---|---|
| Briefs reçus | 13 |
| Briefs livrés complets | 2 (BRIEF-01, BRIEF-04) |
| Hotfixes inline livrés | 6 |
| Briefs cadrés en attente GO | 9 |
| Tickets livrés | 15 (dont 6 hotfixes, + AG01/AG02/AG03 BRIEF-10 Phase 1) |
| Tickets estimés restants | ~127 |

---

## ✅ Livrés en prod aujourd'hui (2026-04-24)

### BRIEF-01 — Session recovery (P0) ✅
- [x] Migration 052_ai_providers (restored)
- [x] Migration 053_agent_personas (restored)
- [x] Migration 054_ai_runs_v2 (restored)
- [x] Migration 050_seed_root_m0_v2 (aligned)
- [x] Migration 058_seed_groq_direct_provider (FK fix)
- [x] Commit `5b64abc` pushed

### BRIEF-04 — Env vars prod (P0) ✅
- [x] GROQ_API_KEY en prod
- [x] CRON_SECRET généré + en prod
- [x] AUTOMATION_API_KEY en prod
- [x] OS_BEACON_URL en prod
- [x] INSTAGRAM_PAGE_ACCESS_TOKEN en prod
- [x] Fichiers tmp nettoyés post-push
- [x] Commit `edca4a6` pushed
- [x] Cron daily 0 0 * * * (Hobby-compatible) — commit `831cb83`
- [x] Deploy manual débloqué, prod sur commit récent

### Hotfixes inline (P0/P1) ✅
- [x] `b5e005e` — Migration 059 ai_run_id sur agence_messages (agent IA publie ses réponses)
- [x] `b5e005e` — Route reply accepte pseudo:<client_id> (admin peut répondre visiteurs)
- [x] `85ee934` — after() next/server (agent IA répond à TOUS les messages, pas juste le 1er)
- [x] `528bdea` — FanTimeline sort ASC (messages ordre iMessage standard)
- [x] `528bdea` — mark_read auto à l'ouverture conversation + event heaven:messages-read

### PMO Bootstrap ✅
- [x] `88a8689` — plans/PMO/ créé (README + CHARTE + INTAKE + REGISTRY + 2 briefs)
- [x] `92aa699` — BRIEF-03 intake
- [x] `ba0fdef` — plan-global-v1 consolidé
- [x] `2c61b04` — Décisions NB actées + charte enrichie
- [x] `024448e` — TICKET-S01 audit structure livré
- [x] `0afc54c` — Briefs 10/11/12 + Charte redistribution CDP
- [x] `de232cc` — BRIEF-13 unification clients & codes
- [x] `4f74eca` — Briefs 02/13 enrichis (styling iMessage + dynamic pseudo)

---

## 🟠 Cadrés — en attente GO NB

### BRIEF-02 — Messenger UI Standards (P1)
Tickets (7 total) :
- [x] M01 part (hotfix) — Ordre ASC messages + mark_read auto (livré `528bdea`)
- [x] M01 full — UI-STANDARDS-v1.2026-04-24.md (doc complet) — livré 2026-04-24 par Agent DEV #2
- [x] M02 — Fix `getConversationPseudo` règle unique + test Vitest — livré 2026-04-24 par Agent DEV #2 (31 cases)
- [x] M03 — `<ConversationAvatar>` shared + refactor 2 sites — livré Phase 2.1 (DEV #1)
- [x] M04 — `<ConversationRow>` shared + AgentModeChip intégré — livré Phase 2.1 (DEV #1)
- [x] M05 — `<MessageBubble>` shared avec styling iMessage (vert/bleu/gris) + avatar modèle + tokens CSS — livré Phase 2.1 (DEV #1)
- [ ] M06 — Mode chip dans row + dropdown + PUT /mode
- [ ] M07 — Snapshot tests Playwright cohérence 3 vues + axe-core a11y

### BRIEF-03 — Structure unifiée + CONTEXT par module (P1)
Tickets (7 total) :
- [x] S01 — Audit structure 106 fichiers (livré `024448e`)
- [ ] S02 — Template MODULE-CONTEXT-TEMPLATE.md
- [ ] S03 — Rollout 6 CONTEXT.md (1 par module actif)
- [x] S04 partial — ROADMAP-MASTER.md (ce fichier — rattrapage aujourd'hui)
- [ ] S04 full — ROADMAP-MASTER agrégée avec tous les tickets B1-B11
- [ ] S05 — Protocole auto-update (règle CDP obligatoire) + amendement charte
- [ ] S06 — INDEX-MODULES dashboard
- [ ] S07 — Résolution docs/ racine (A1 credentials + A2/A3 archives obsolètes)

### BRIEF-05 — QStash cron + toggle UI (P2)
Tickets (10 total) — tous pending, attente compte Upstash NB :
- [ ] CP01 à CP10

### BRIEF-06 — Cycle de vie visiteurs (P1)
Tickets (10 total) — tous pending :
- [ ] V01 à V10

### BRIEF-07 — Bouton Générer dans thread (P2)
Tickets (8 total) — tous pending :
- [ ] G01 à G08

### BRIEF-08 — Persona Yumi v2 + knowledge grounding (P1)
Tickets (9 total) — tous pending, **hotfix L1 exécutable immédiat** :
- [x] P01-HOTFIX — persona_v2 quick-win (migration 061 appliquée prod — commit `c6e930f`)
- [ ] P02 à P09

### BRIEF-09 — Fiche fan insights + market research (P1)
Tickets (17 total) — tous pending, 7 questions RGPD bloquantes :
- [ ] FI01 à FI17

### BRIEF-10 — Privacy + Age Gate + Accès hiérarchisé (P0 bloquant)
Tickets (13 total) — 3 livrés Phase 1 :
- [x] AG01 — Migration DB `066_age_gate_access_level.sql` + `066b_age_gate_events_log.sql` (appliquées prod, backfill validated=4, pending_upgrade=16)
- [x] AG02 — Refonte `/privacy` page (11 sections RGPD complètes FR, conforme art. 6/15-22)
- [x] AG03 — `PublicFooter` component persistant (intégré dans `/m/[slug]`, `/privacy`, `/terms`, `/data-deletion`)
- [ ] AG04 à AG13

### BRIEF-11 — Usage meters stack (P1)
Tickets (15 total) — tous pending :
- [ ] UM01 à UM15

### BRIEF-12 — Détection langue multilingue (P1)
Tickets (10 total) — tous pending :
- [ ] ML01 à ML10

### BRIEF-13 — Unification Clients & Codes + Self-verification (P1)
Tickets (20 total) — 4 livrés Phase 2.2 :
- [x] UV01 — Migration 069 + 070 tables (livré Phase 2.2)
- [x] UV02 — Trigger auto-create verification (livré Phase 2.2)
- [x] UV03 — Helper crypto + generateVerification service (livré Phase 2.2)
- [x] UV04 — Routes API /api/agence/clients/[id]/verification/* (livré Phase 2.2)
- [ ] UV05 à UV20

---

## 🎯 Chemin critique — ordre d'exécution recommandé

### Phase 1 (débloque tout) — ~3h
1. **BRIEF-08 L1-HOTFIX** — Persona v2 (30 min) — URL Fanvue OK, just push
2. **BRIEF-02 M01 full + M02** — UI-STANDARDS.md + fix getConversationPseudo helper (1h)
3. **BRIEF-10 AG01+AG02+AG03** — DB age_certified + privacy page + footer (2h)

### Phase 2 (dépend Phase 1) — ~6h
4. **BRIEF-02 M03/M04/M05** — Composants shared (Avatar/Row/Bubble) — parallélisable (2h avec 3 agents)
5. **BRIEF-13 UV01-UV04** — Migrations verification + helper generate (2h)
6. **BRIEF-10 AG04-AG11** — Age Gate UI + admin validation flow (2h avec 2 agents)

### Phase 3 (features IA) — ~8h
7. **BRIEF-06 complet** — Lifecycle visiteurs (5h)
8. **BRIEF-12 complet** — Multilingue (4h)
9. **BRIEF-09 Phase A+B** — Data model + extraction (5h)

### Phase 4 (monitoring + tools) — ~11h
10. **BRIEF-11 complet** — Usage meters (8h) — peut tourner en parallèle
11. **BRIEF-05 complet** — QStash + toggle (5h) — bloqué par compte Upstash NB
12. **BRIEF-07 complet** — Bouton Générer (3h)

### Phase 5 (analytics + finalisation) — ~6h
13. **BRIEF-09 Phase D+E+F** — UI + légal + analytics (5h)
14. **BRIEF-03 complet** — CONTEXT.md tous modules + INDEX (5h)

**Total brut** : ~34h effective avec parallélisation multi-agent max.
**Distribué sur 3-4 semaines** calendaires selon disponibilité NB pour validations.

---

## 📋 Décisions bloquantes restantes (NB)

Consolidées pour un seul scan :

### BRIEF-08 (persona) — ready to ship
- GO hotfix L1 (30 min) ? Tu as validé URLs (Fanvue/IG/Snap/Heaven), je push le prompt v2.

### BRIEF-10 (privacy + age gate) — 5 questions
- Rétention cookie age_certified (30 jours proposé) ?
- Email DPO Privacy Policy (proposé : dpo@heaven-os.vercel.app) ?
- Révocation certification : flow léger ou complet ?
- Notifications Telegram nouveau handle pending ?
- Redirect IG mineur : suffisant + audit log (reco oui) ?

### BRIEF-11 (usage meters) — 4 questions
- VERCEL_API_TOKEN : tu crées + partages ?
- SUPABASE_MANAGEMENT_TOKEN : idem ?
- Bot Telegram NB existant ?
- Auto-fallback Groq→OpenRouter actif par défaut ?

### BRIEF-12 (multilingue) — 4 questions
- V1 MVP langues (FR/EN/ES suffit ou IT/DE/PT direct) ?
- Override admin langue utile ?
- Setting fan UI : /m/[slug]?tab=preferences ou IdentityGate ?
- Style EN Yumi (lowercase darling) OK ?

### BRIEF-13 (verification) — 8 questions
- IP match strict ou loose (reco loose /24) ?
- Code 6 chiffres en plus du lien (reco oui) ?
- TTL lien 72h ?
- Device fingerprint fallback ?
- Auto-génération row verification ?
- Rate limit 5/jour par client ?
- Révocation manuelle admin ?
- Page /verify design branded ou plain ?

### BRIEF-09 (insights) — 7 questions
- Catégories tags (proposé 6) ?
- Vocabulary seed initial ?
- Seuil heat score 50 pour explicite ?
- Modalité consent fan (popup/checkbox/bannière) ?
- Conservation data (1-3 ans) ?
- Partage externe data (in-house only) ?
- Validation IA auto >0.8 ou manual ?

---

## 🔄 Auto-update (règle CDP obligatoire — Charte §5)

**À CHAQUE ticket livré, le CDP DOIT** :
1. Cocher ligne dans ROADMAP-MASTER.md (ce fichier)
2. Update module CHANGELOG.md si applicable
3. Update module CONTEXT.md (section État) si applicable
4. Update BRIEFS-REGISTRY.md (statut brief parent)
5. Créer rapport horodaté `plans/_reports/UPDATE-REPORT-*.md` si scope ≥ M

**Aujourd'hui** : le CDP a commit les livraisons mais OUBLIÉ de cocher systématiquement. Rattrapage ce fichier. Protocole à formaliser dans TICKET-S05.

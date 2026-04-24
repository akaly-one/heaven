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
| Tickets livrés | 23 (dont 6 hotfixes, + AG01/AG02/AG03 Phase 1, + AG04-AG11 BRIEF-10 Phase 2) |
| Tickets estimés restants | ~119 |

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
Tickets (13 total) — 11 livrés (Phase 1 + Phase 2) :
- [x] AG01 — Migration DB `066_age_gate_access_level.sql` + `066b_age_gate_events_log.sql` (appliquées prod, backfill validated=4, pending_upgrade=16)
- [x] AG02 — Refonte `/privacy` page (11 sections RGPD complètes FR, conforme art. 6/15-22)
- [x] AG03 — `PublicFooter` component persistant (intégré dans `/m/[slug]`, `/privacy`, `/terms`, `/data-deletion`)
- [x] AG04 — `<AgeGateModal>` shared composant bloquant (focus trap, Escape désactivé, checkbox obligatoire, WCAG 2.2 AA) — `src/shared/components/age-gate-modal.tsx`
- [x] AG05 — Persistance cookie `heaven_age_certified` (30j) + routes API `/api/age-gate/certify` + `/decline` avec IP/UA hash RGPD — `src/shared/lib/age-gate/persistence.ts`
- [x] AG06 — `<AgeCertificationSection>` badge vert/rouge + bouton révocation admin root + route `/api/agence/clients/[id]/age-gate/revoke` — `src/cp/components/cockpit/messagerie/age-certification-section.tsx`
- [x] AG07 — Helper `computeAccessLevel` (matrice 5 niveaux : anonymous/major_visitor/pending_upgrade/validated/rejected) + `canAccess` — `src/shared/lib/access/tiers.ts`
- [x] AG08 — Inject `maxAiTone` dans prompt persona runtime (`/api/messages` POST) + guard 403 `/api/packs?for=purchase` si non-validated
- [x] AG09 — `<AgeGateModal>` intégré dans `/m/[slug]` avec gated `sendMessage` (interception 1er message fan, redirect IG mineurs)
- [x] AG10 — Section validation handle dans drawer admin (Valider / Rejeter raison / Demander preuve) + routes API `/api/agence/clients/[id]/validate` + `/reject`
- [x] AG11 — Page `/agence/verification-queue` + endpoint `GET /api/agence/verification-queue` (tri ASC created_at, compteur, actions inline)
- [ ] AG12 à AG13 — audit log RLS root + tests Playwright (Phase 3)

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

### BRIEF-16 — Payment Providers modulaires (P1, 🟢 partial livré phases A-I sauf E1)

> Brief source : [briefs/BRIEF-2026-04-25-16-packs-payment-providers.md](briefs/BRIEF-2026-04-25-16-packs-payment-providers.md)
> Commits : `796d056` / `c7a797a` (V1 dispatch 6 agents) + `cdb03df` (PayPal SDK + Wise) + `1387047` (mark_read fix) + `a599f5d` (hover taglines)

Tickets (29 total — 24 initiaux + 5 Phase I, 6 agents parallèles + extension) :

#### Phase A — V1 manuel PayPal.me (P0, bloquant first)
- [x] T16-A1 — Migration DB `073_payment_providers_toggle.sql` + `agence_webhook_events` (074) + extension `agence_pending_payments` (`reference_code`, `pseudo_web`, `pack_breakdown`, `rejected_reason`) — appliquées live Supabase
- [x] T16-A2 — Provider `manual.ts` + `types.ts` + `reference.ts` (pattern `YUMI-PGLD-K3M9X2` base32 sans voyelles ambiguës) + registry stub
- [x] T16-A3 — UI fan : bouton pack dans `unlock-sheet` → POST `/api/payment/create?provider=manual` → `<PaymentReferenceModal>` (copy + CGV checkbox + redirect PayPal.me)
- [x] T16-A4 — Route `POST /api/payments/manual/confirm` (approve/reject + idempotence reference_code) + déclenchement `fulfillPayment({method:'manual'})`
- [x] T16-A5 — UI cockpit `/agence/payments` : liste pending + breakdown expand/collapse + Valider/Refuser + auto-refresh 30s + `<PaymentPendingDrawer>` messagerie

#### Phase B — Enforcement cloisonnement pack (P0, bloquant UX promise)
- [x] T16-B1 — `pack-guard.ts` : `hasPackAccess(clientId, packSlug, model)` match EXACT slug + `listClientPacks()`
- [x] T16-B2 — Audit `computeAccessLevel()` enrichi : `computePackAwareAccessLevel()` async avec cache 30s in-memory
- [x] T16-B3 — `allowedPackSlugs[]` exposé pour filter UI fan profil par pack-slug validé (lib disponible, intégration UI lib-side)

#### Phase C — Architecture modulaire V2 (P1)
- [x] T16-C1 — Interface `PaymentProvider` + types unifiés (`src/shared/payment/types.ts`)
- [x] T16-C2 — Registry + wrappers paypal/revolut (wrap routes existantes `/api/payments/{paypal,revolut}/*`)
- [x] T16-C3 — Squelette `stripe.ts` + triple-guard `ALLOW_STRIPE=true` (provider throws + registry refuse + route 403)
- [x] T16-C4 — Table `agence_webhook_events` (074) + helper `storeAndCheckWebhook()` détection 23505 unique violation

#### Phase D — Toggle UI cockpit (P1)
- [x] T16-D1 — Composant `<PaymentProvidersToggle>` cockpit (5 providers : manual, paypal, revolut, stripe, wise)
- [x] T16-D2 — Route `/api/payment/providers` GET (lecture) + POST (toggle root-only audit log) — UI mount à finir dans `/cp/root/settings/payments`
- [x] T16-D3 — Hook `usePaymentProviders()` optimistic update + revert on error

#### Phase E — QA + doc (P1)
- [ ] **T16-E1 — Tests E2E Playwright V1 manuel** (visiteur → pack → cockpit valide → code → access débloqué) — **REPORTÉ**
- [x] T16-E2 — Docs ADR (5 ADR dans `plans/modules/payments/DECISIONS.md`)
- [x] T16-E3 — CHANGELOG v1.5.0 + mise à jour masterplan + ROADMAP

#### Phase F — Custom pack pricing + shopping cart (P1)
- [x] T16-F1 — Migration `075_custom_pricing.sql` : table `agence_custom_pricing` (category × media_type × multiplier × base_price + pied_multiplier) + seed 24 rows m1/m2/m3
- [x] T16-F2 — API `POST /api/packs/custom/quote` (items + duration_min vidéo + isPied → totalCents + breakdown détaillé)
- [x] T16-F3 — UI `<CustomCartSheet>` : 8 lignes photo/video × 4 catégories + qty +/- + durée vidéo + toggle pied ×3 + description 500c + total live (debounce 500ms + fallback local)
- [x] T16-F4 — UI cockpit affichage breakdown JSON dans liste pending_payments

#### Phase G — Agent IA pack awareness (P1)
- [x] T16-G1 — Contexte agent enrichi : `buildPackHistoryContext()` + `formatPackHistoryForPrompt()` injectés dans system prompt section "HISTORIQUE ACHATS CLIENT :"
- [x] T16-G2 — Intent recognition `detectPseudoCorrection()` (pondération 0.5 keyword + 0.4 ref code + 0.1 ancien pseudo, seuil 0.5) + 8 tests unitaires
- [x] T16-G3 — Migration `076_pending_pseudo_correction.sql` — flag `agence_clients.pending_pseudo_correction` BOOLEAN + index partiel WHERE true
- [x] T16-G4 — Auto-tag client + injection alerte system prompt quand intent détecté (modèle voit la demande)

#### Phase H — CGV + docs NB (P1)
- [x] T16-H1 — Page `/cgv` publique complète (14 sections, objet / 18+ / prix / accès 30 j / paiement / responsabilité pseudo / art. VI.53 CDE BE / usage perso / révocation / juridiction Bruxelles FR)
- [ ] T16-H2 — Footer link CGV sur `/m/[slug]` et modal d'achat (links faits dans `<PaymentReferenceModal>` + `<CustomCartSheet>`, à vérifier sur tous les autres entrypoints)
- [x] T16-H3 — Docs NB `docs/architecture/PAYMENT-INTEGRATION-GUIDE-NB.md` (PayPal Business + Revolut Merchant KYB + Wise Payment Requests API concret + Stripe urgence + DAC7 BE + procédure correction pseudo + §2.6 SDK vs API hybride)
- [x] T16-H4 — Checkbox "J'accepte les CGV" obligatoire avant commande (dans `<PaymentReferenceModal>` et `<CustomCartSheet>`)

#### Phase I — PayPal SDK hybride + Wise provider (livrée 2026-04-25, commit `cdb03df`)
- [x] T16-I1 — Composant `PayPalCheckoutButton` (`src/web/components/profile/paypal-checkout-button.tsx`) utilisant `@paypal/react-paypal-js` (SDK officiel)
- [x] T16-I2 — Wire dans `unlock-sheet.tsx` à côté du bouton PayPal.me manuel — silencieux si `NEXT_PUBLIC_PAYPAL_CLIENT_ID` non défini, sinon bouton inline avec popup PayPal
- [x] T16-I3 — Provider `wise.ts` — Wise Payment Requests API v3 (`POST /v3/profiles/{id}/payment-requests`) avec `getStatus()` polling
- [x] T16-I4 — `PaymentProviderId` étendu (`+wise`) + registry inclut `wiseProvider` + `VALID_IDS` updated
- [x] T16-I5 — Env vars `WISE_API_TOKEN` + `WISE_BUSINESS_PROFILE_ID` + `WISE_API_URL` + `ALLOW_STRIPE` dans `.env.example`
- [x] T16-I6 — Guide NB §2.6 différence REST API vs JavaScript SDK + approche hybride Heaven, §4.5 Wise Payment Requests concret, §4.6 recommandation finale

#### Phase J — TODO post-merge concrets (à activer / à faire au prochain cycle)

##### J.1 Côté NB (config externe — pas de code requis)
- [ ] **T16-J1** : Activer PayPal Checkout SDK (~5 min) — Vercel env var `NEXT_PUBLIC_PAYPAL_CLIENT_ID = <même valeur que PAYPAL_CLIENT_ID>` → redeploy → bouton apparaît auto sur `/m/yumi`
- [ ] **T16-J2** : Activer Wise (~30 min) — ouvrir compte Wise Business + générer API token + `curl GET /v2/profiles` → noter `id` business → Vercel env vars `WISE_API_TOKEN` + `WISE_BUSINESS_PROFILE_ID` → toggle Wise dans `/cp/root/settings/payments`
- [ ] **T16-J3** : Activer Revolut Merchant (KYB 2-5j) — compte Revolut Business BE + KYB phrasing "creator content platform" + Merchant API key + Webhook signing secret → Vercel env vars → toggle dans `/cp/root`

##### J.2 Côté code (à programmer prochain cycle)
- [ ] **T16-J4** : T16-E1 reporté — Tests E2E Playwright V1 manuel (visiteur → pack → cockpit valide → code → access)
- [ ] **T16-J5** : Migrer routes webhook PayPal/Revolut existantes vers `storeAndCheckWebhook()` pour audit forensics + double-barrière idempotence (non bloquant V1)
- [ ] **T16-J6** : Monter `unlock-sheet` externe dans `/m/[slug]/page.tsx` — actuellement `UnlockSheet` inline L1686 coexiste, à substituer par `import { UnlockSheet } from '@/web/components/profile/unlock-sheet'`
- [ ] **T16-J7** : Cron Wise polling status si Wise devient primaire — `GET /v3/profiles/{id}/payment-requests/{id}` toutes les 5 min pour pending status (Wise n'a pas de webhook payment-requests v3)
- [ ] **T16-J8** : Wise webhook generic transfer-state-change à wire en cas de besoin (différent des payment-requests, utile pour suivre payouts entrants)
- [ ] **T16-J9** : Custom pack — affichage breakdown détaillé dans email/notif modèle post-validation pour QA visuel
- [ ] **T16-J10** : DAC7 BE — script export CSV depuis `agence_pending_payments` (status=completed) pour déclaration annuelle avant 31 janvier 2027

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

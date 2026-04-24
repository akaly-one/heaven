# BRIEF-2026-04-24-15 — Messagerie UX polish Phase 2.5 + régressions DEBUG v2 R2

> **Status** : 🟠 cadré + dispatch immédiat (CDP lance 4 agents CORRECTIF parallèles)
> **Source** : NB message du 2026-04-24 ~22:30 (retour test prod multi-bugs UX + demande sync pseudo + UI admin validation)
> **Type** : UX polish + bugs + régressions
> **Priorité** : P0 (bloquant usage admin)

---

## Demande NB (verbatim résumé)

1. **"Messagerie unifiée"** titre trop moche → changer en **"Messenger"** simple
2. **Couleur dorée** partout → changer pour quelque chose de plus sobre (NB n'a pas spécifié la cible)
3. **Fiche fan pas accessible** — dès qu'un client est enregistré DB, la fiche doit exister et être consultable, avec infos collectées progressivement via agent IA
4. **Sync pseudo upgrade KO** — ex: `aka.lii` a ajouté son alias Snap en profil fan mais en messagerie + Clients & Codes il reste "visiteur". L'agent IA reste bridé (flirt_hot max, pas explicit) car access_level pas validé
5. **Pas de code/lien à copier** dans le drawer admin quand un fan fournit Snap/Insta
6. **Validation manuelle ne fonctionne pas** depuis la messagerie admin
7. **Thread auto-scroll** doit toujours aller en bas (dernier message), pas au milieu de la discussion

## Régressions DEBUG v2 R2 (à traiter dans ce brief)

8. **Migration 019 non appliquée prod** → `/api/clients/visit` 500 "column orders_completed does not exist" sur `agence_fan_lifecycle` (DEBUG v2 R2 DR1)
9. **Verif orphelines** (DEBUG v2 R1 #1) : trigger crée row pending à chaque change handle mais ne revoke pas anciennes → accumulation
10. **Expired pending stale** (DEBUG v2 R1 #2) : rows `status=pending` avec `expires_at` passé restent pending indéfiniment (pas de cron)

## Compréhension CDP

Bugs groupés logiquement pour dispatch 4 agents parallèles :

| Agent | Scope | Bugs adressés |
|---|---|---|
| **A — FE UX messagerie** | Titre + auto-scroll + titre thread | #1, #7 |
| **B — Drawer fiche fan** | Fiche accessible + insights progressifs + section validation | #3 (partiel), #5, #6 |
| **C — Sync pseudo + UI admin** | Sync upgrade live + génération lien/code UI | #4, #5 (UI), #6 (flow) |
| **D — DB régressions** | Migration 019 + trigger revoke + état expired | #8, #9, #10 |

**Couleur gold #2** : NÉCESSITE décision NB sur la palette cible (3 options proposées ci-dessous). CORRECTIF différé après validation.

## Options palette couleur (à valider NB)

L'accent doré Heaven actuel : `#C9A84C` primary, `#E6C974` light, `#9E7C1F` dark. Options de remplacement :

| Option | Couleur | Ressenti | Impact |
|---|---|---|---|
| **A — Rouge Heaven** (déjà `--accent`) | `#E63329` | Dynamique, brand fort | Remplace gold par accent existant, cohérent Heaven |
| **B — Neutre sobre** | gris `#9CA3AF` + gradient `var(--bg3)→var(--bg2)` | Élégant, moderne, iMessage-like | Les icônes plateforme (Snap jaune, Insta rose) ressortent mieux |
| **C — Violet Heaven** | `#A78BFA` (mauve agent IA copilot existant) | Premium, moderne | Cohérent avec mode copilot existant |

**Ma reco** : **Option B (neutre)**. Raisons : gold a une connotation "VIP/premium" qui fait ambigu avec les tiers packs. Neutre = focus sur les icônes plateforme (Snap/Insta/Fanvue) qui portent déjà leur couleur brand.

## Scope

### Agent A — FE UX messagerie (P0, ~30 min)

1. `TICKET-UX01` Titre page `/agence/messagerie`
   - Changer "Messagerie unifiée" → **"Messenger"**
   - Sous-titre "Web + Instagram · X conversations" reste
   - Fichier : `src/app/agence/messagerie/page.tsx` (trouver le h1/titre)

2. `TICKET-UX02` Auto-scroll thread en bas à l'ouverture + nouveau message
   - À l'ouverture d'une conversation → scroll messages container vers le bas
   - À l'arrivée d'un nouveau message (depuis polling) → scroll si user déjà au bas (preserve position sinon)
   - Fichier : `src/app/agence/messagerie/page.tsx` zone `FanTimeline` ou ref container
   - Ajouter ref `messagesContainerRef` + useEffect sur `messages.length` + `currentFanId`

3. `TICKET-UX03` (optionnel) Titre thread header clean
   - Utiliser `getConversationPseudo(currentConversation)` + badge platform via `getConversationPlatform()` (fait en C4 DEBUG v2)

### Agent B — Drawer fiche fan + section validation visible (P0, ~1h)

4. `TICKET-FB01` Fiche fan toujours accessible dès client créé
   - Ouvrir drawer `<ContactsDrawer>` au clic sur une conversation (actuellement drawer ne s'ouvre que sur `?view=contacts` URL param)
   - Le drawer doit loader `/api/agence/fans/[id]` même pour pseudo-fans (sans fan_id UUID)
   - Si `linked_clients.length === 0` → placeholder "Ce visiteur n'a pas encore d'alias Snap/Insta. L'agent IA peut commencer à l'interroger sur ses goûts..."

5. `TICKET-FB02` Section insights live progressifs (pré-BRIEF-09)
   - Ajouter section dans le drawer qui liste les tags collectés (même si la table `agence_fan_insights` n'existe pas encore)
   - Fallback : afficher les derniers 5 messages + un bouton "Agent IA : poser des questions" pour trigger questions persona v2
   - Placeholder "Préférences / Goûts à découvrir" avec compteur messages échangés

6. `TICKET-FB03` Section "Certification majorité" visible (AG06 intégré)
   - Déjà livré en Phase 2 dans `contacts-drawer.tsx` mais peut ne pas apparaître si `linked_clients: []`
   - Refactor : afficher même avec linked_clients vide, utiliser le pseudo-fan direct si format `pseudo:<client_id>`

### Agent C — Sync pseudo upgrade + UI admin validation flow (P0, ~1h30)

7. `TICKET-SV01` Sync pseudo upgrade live (BRIEF-13 UV17 partiel)
   - Supabase Realtime channel sur `agence_clients` UPDATE
   - Quand `pseudo_snap`/`pseudo_insta` change → event `heaven:client-handle-updated`
   - La page `/agence/messagerie` et header dropdown listent déjà cet event (Phase 1) → devrait suffire
   - **Vrai bug probable** : inbox API ne fait pas re-fetch quand client est upgrade à distance (fan ajoute handle depuis son browser)
   - Fix : pousser le polling messagerie à 10s OU ajouter Realtime subscribe

8. `TICKET-SV02` UI admin section "Validation handle" dans drawer fan
   - Ajouter dans `contacts-drawer.tsx` (ou équivalent) une section :
     - Si `client.access_level='pending_upgrade'` ou `pending_verification` → afficher :
       - Bouton "Générer lien validation" (appelle `POST /api/agence/clients/[id]/verification/generate`)
       - Après génération : afficher lien + code avec boutons "Copy lien" + "Copy code"
       - Bouton "Marquer envoyé" (appelle `POST /api/agence/clients/[id]/verification/[vid]/mark-sent`)
       - Badge status : pending → sent → validated
   - Utilise les routes livrées en Phase 2.2 (BRIEF-13 UV04)

9. `TICKET-SV03` Boutons Valider/Rejeter fonctionnels depuis messagerie
   - Si `client.access_level='pending_upgrade'` → boutons "Valider" + "Rejeter"
   - Appellent `POST /api/agence/clients/[id]/validate` + `reject` (livrés Phase 2.3 AG10 + fix C3 RBAC)
   - Update UI optimistic puis refresh

### Agent D — DB régressions R2 (P0, ~45 min)

10. `TICKET-DB01` Migration 019-style : ajouter colonnes manquantes `agence_fan_lifecycle`
    - Créer `supabase/migrations/071_agence_fan_lifecycle_complete.sql`
    - Colonnes : `visit_count INT DEFAULT 0`, `wall_posts_count INT DEFAULT 0`, `orders_completed INT DEFAULT 0`, `last_visit_at TIMESTAMPTZ`
    - Idempotent `ADD COLUMN IF NOT EXISTS`
    - Appliquer via MCP Supabase
    - Vérifier `/api/clients/visit` retourne 200 après

11. `TICKET-DB02` Trigger revoke verif orphelines (bug R1 #1)
    - Créer `supabase/migrations/072_trigger_revoke_old_verifications.sql`
    - Modifier la fonction `auto_create_verification_on_handle_add()` : AVANT INSERT, faire UPDATE des anciennes rows `pending` du même `(client_id, target_platform)` à `status='revoked', revoked_reason='handle_changed'`
    - Appliquer via MCP
    - Test : UPDATE pseudo_snap 2x sur un client → 1 seule row pending (dernière), anciennes revoked

12. `TICKET-DB03` État expired pour rows passées (bug R1 #2)
    - Option A : trigger BEFORE UPDATE/SELECT qui marque expired (peu standard)
    - Option B : **cron Vercel** quotidien qui UPDATE status='expired' WHERE expires_at < NOW() AND status IN ('pending','sent')
    - Option C : **helper DB** dans la route `/verify/[token]` qui check expires_at avant de valider (application-level)
    - Ma reco : **Option B** (cron Vercel daily) + **Option C** (double check app-side dans route /verify) — robust
    - Créer `src/app/api/cron/expire-verifications/route.ts` avec CRON_SECRET check
    - Ajouter entry dans `vercel.json` `{"path":"/api/cron/expire-verifications", "schedule":"0 1 * * *"}`

## Branches concernées

- ☒ **FE** — Agent A (messagerie UX), Agent B (drawer), Agent C (UI admin validation)
- ☒ **BE** — Agent C (routes déjà livrées, juste consommation UI), Agent D (migrations + cron)
- ☒ **DB** — Agent D (migrations 071, 072, 073)
- ☒ **DevOps** — Agent D (cron vercel.json)
- ☐ AI / QA / Legal — indirect

## Contraintes

- TypeScript strict exit 0
- Pas de régression sur Phase 2 CORRECTIFS
- Commit atomique par agent, NE PAS push (CDP batch)
- Respect Charte §1.4 workflow DEV (+ DEBUG v2 après)

## Couleur gold — attente GO NB

**Tu me dis** : A (rouge) / B (neutre — ma reco) / C (violet) → je lance un 5ème agent CORRECTIF dédié couleur.

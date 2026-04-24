# Messagerie + Contacts — Changelog

## 2026-04-24 (v2 — Phase 1) — BRIEF-02 tickets M01 full + M02 livrés

> Auteur : Agent DEV #2 · Tickets : M01 full + M02 · Brief parent : [BRIEF-2026-04-24-02](../../PMO/briefs/BRIEF-2026-04-24-02-messenger-ui-standards.md)

### M01 full — UI-STANDARDS-v1.2026-04-24.md créé

Document unique source de vérité pour tout rendu conversationnel. 571 lignes, 8 sections :

1. **Règle Pseudo** — priorité stricte insta > snap(réel) > web > fanvue > fan_id, type strict `Handle`, invariant `@` pour handles externes / jamais `@` pour visiteur-NNN/guest-XXX
2. **Règle Avatar** — composant unique `<ConversationAvatar>`, tailles normalisées 24/32/40/56, a11y `role="img"` + `aria-label`, avatar modèle dans bulles outbound
3. **Règle Bulle conversation (liste)** — `<ConversationRow>` structure + source dots + tier badge + mode chip + preview 40ch + time ago, touch target ≥ 56px, roving tabindex
4. **Règle Bulle chat (thread)** — `<MessageBubble>` avec discriminator `actor` (fan / model_web / model_instagram / agent_ai / agent_draft), tokens Tailwind v4 `@theme`, cluster detection, scroll preservation + badge "N nouveaux ↓", live region `role="log"`
5. **Mode agent placement** — 3 points d'entrée cohérents (row / thread header / dropdown), sémantique unifiée AUTO/COPILOT/MANUAL/null, endpoint PUT /api/agence/messaging/mode
6. **Matrice cohérence** — header ↔ messagerie ↔ profil, snapshot Playwright test case visiteur-005, check-list PR anti-régression

Impact : tous les futurs tickets M03-M07 ont un contrat clair, toute régression visuelle sera bloquée par snapshot Playwright.

### M02 — Fix `getConversationPseudo` règle unique + test Vitest

Bug fixé dans `src/shared/lib/messaging/conversation-display.ts` :

**Avant** : Insta → `@{pseudo}`, Snap → `{pseudo}` (sans @) → même fan affiché différemment entre dropdown et page

**Après** : règle unique `@` pour handles externes (Insta/Snap réel/Fanvue), JAMAIS `@` pour visiteur-NNN/guest-XXX.

- Type strict `Handle = \`@${string}\` | \`visiteur-${string}\` | \`guest-${string}\` | "visiteur"` ajouté
- Double `@` évité par strip préalable (`replace(/^@/, "")` puis re-préfixe)
- Détection anonyme regex insensible à la casse `/^(visiteur|guest)/i`
- `getConversationPlatform` aussi corrigé (snap anon → "web" au lieu de "snap")
- `getExternalUrl` refactor : `snapchat.com/add/<x>` uniquement si non-anon + ajout branche fanvue.com
- Test unit [`conversation-display.test.ts`](../../../src/shared/lib/messaging/conversation-display.test.ts) : **31 cases Vitest** couvrant les 8 priorités + invariants de cohérence + extensions `getConversationPlatform` et `getExternalUrl`
- Validation logique : 31/31 passed (runner standalone, Vitest à installer sur GO NB pour intégration CI)
- `tsconfig.json` : exclu `**/*.test.ts` du build Next (test runner séparé)
- `npx tsc --noEmit` : passed

Impact : le dropdown header et la page messagerie affichent désormais le **MÊME pseudo** pour le **MÊME client**, conformément à l'invariant BRIEF-02.

### Fichiers touchés

- `plans/modules/messagerie-contacts/UI-STANDARDS-v1.2026-04-24.md` (+571 lignes créé)
- `plans/modules/messagerie-contacts/README.md` (ajout entry UI-STANDARDS)
- `plans/modules/messagerie-contacts/CHANGELOG.md` (cette entry v2)
- `plans/PMO/03-ROADMAP-MASTER.md` (2 cases cochées M01 full + M02)
- `src/shared/lib/messaging/conversation-display.ts` (+ type Handle, règle unique, getExternalUrl refactor)
- `src/shared/lib/messaging/conversation-display.test.ts` (+ 31 cases créé)
- `tsconfig.json` (exclu `**/*.test.ts`)

### Prochains tickets (M03-M07)

Dépendent désormais de ce doc comme contrat. Parallélisables après M01 validé :
- M03 `<ConversationAvatar>` shared + refactor 2 sites
- M04 `<ConversationRow>` shared
- M05 `<MessageBubble>` shared avec styling iMessage + tokens CSS
- M06 `<AgentModeChip>` + 3 points d'entrée
- M07 snapshot Playwright + axe-core

---

## 2026-04-24 (11:12) — Standards d'affichage unifiés header ↔ page + mode agent par conversation

> Rapport global Heaven v1.4.0 : [plans/_reports/UPDATE-REPORT-2026-04-24-1112-messagerie-copilot-per-conversation.md](../../_reports/UPDATE-REPORT-2026-04-24-1112-messagerie-copilot-per-conversation.md)

### Source unique d'affichage bulles conversation

Le dropdown messages du header et la page `/agence/messagerie` partagent maintenant la MÊME logique d'affichage via `src/shared/lib/messaging/conversation-display.ts` :
- `getConversationPseudo(c)` — priorité Snap > Insta > pseudo_web > fallback stable `visiteur-<4 last chars>`
- `getAvatarStyle(c)` — renvoie { platform, bg, color, iconKey } par plateforme
- `getExternalUrl(c)` — URL externe Snap/Insta, `null` pour visiteur web (pas de lien tant qu'ils n'ont pas upgrade)
- `conversationSortKey(c)` — timestamp numérique pour tri
- `formatConversationTime(iso)` — format commun `m`/`h`/`j`/date

Impact : ajouter un nouveau réseau social = un seul endroit à modifier, pas de divergence possible entre header et messagerie.

### Sync header ↔ inbox unifié

`header.tsx fetchMessages()` switch vers `/api/agence/messaging/inbox?source=all` (même endpoint que la page messagerie). Fin de la double source (`/api/messages` legacy vs `/api/agence/messaging/inbox`). Fallback legacy conservé si inbox 401/500.

### Pseudos `visiteur-NNN` cohérents (fix bugs)

**Avant :** header affichait `@visiteur-005`, messagerie affichait `pseudo:v` pour le même fan → divergence + collision si 2 clients avec le même nickname.

**Après :**
- Pseudo-fan key = `pseudo:<UUID>` (client_id ou ig_conversation_id), UUID stable + unique
- Thread fetch pour pseudo-fans désormais supporté : inbox tente `agence_messages` par `client_id`, fallback `instagram_messages` par `ig_conversation_id`
- Display normalization : `pseudo_web = visiteur-<last4>` si pas de handle IG/Snap

### Mode agent par conversation

Migration 057 : colonne `agent_mode` sur `agence_fans`, `agence_clients`, `instagram_conversations` (NULL = défaut persona, sinon override local). API `/api/agence/messaging/mode` GET/PUT. Chip cliquable dans le header du thread avec popover 3 choix + "Retour au défaut persona".

### Tab Agent IA dans messagerie

Nouveau switch `[Messages] [Agent IA]` top bar de `/agence/messagerie`. Tab Agent IA = config persona + playground + logs (détail dans module `ai-conversational-agent`).

### Visiteurs web — CTA upgrade

Lien "Voir tous les messages →" en bas du dropdown header pointe `/agence/messagerie` (plus via `?tab=clients` qui ouvrait le drawer contacts). Avatar visiteur web = icône Globe neutre (plus de faux tag Insta/Snap). Bandeau "Ajoute ton Insta/Snap → stories privées, promos Fanvue" dans `ChatPanel` pour les visiteurs anonymes.

---

## 2026-04-21 (20:34) — Livraison Phase 4 (briefs B7)

Phase 4 du plan multi-agent exécutée (Agents 4.A + 4.B).

### Backend (Agent 4.A)
- Migration 046 : `handles jsonb`, `fingerprint_hash`, `merge_history` sur `agence_fans`
- Extension `pg_trgm` pour fuzzy matching
- Helper `src/shared/lib/fan-matcher.ts` : fingerprint SHA-256 + bigram similarity + trigram search
- APIs étendues/nouvelles : merge (union handles + audit), search (scoring fuzzy), auto-merge (review/apply seuil 0.95)
- **Backfill 15 clients legacy** → 17 fans actifs, 0 orphan (résout P2-1)

### Frontend (Agent 4.B)
- Layout 3-colonnes : conversations + thread + drawer fan
- 3 composants : `contacts-drawer.tsx` (823L), `meta-24h-timer.tsx` (115L), `multi-channel-reply.tsx` (188L)
- Timer IG 24h visible par conversation, fallback web si expiré
- Redirect `/agence/clients` → `/agence/messagerie?view=contacts`
- Sidebar nettoyée (retrait item Contacts desktop + mobile)

### Défauts résolus
- P0-11 (threads fan vides) ✅
- P1-3 (thread sans fan_id) ✅
- P1-8 (auto-link partiel — handles en place, IdentityGate branchement pending)
- P2-1 (clients legacy) ✅

Rapport : `plans/_reports/UPDATE-REPORT-2026-04-21-2034-phase4-5.md`

---

## 2026-04-21

- Création initiale V2 fusion depuis :
  - `plans/tech/architecture.md` (vue `agence_messages_timeline`, `agence_fans`, API `/api/agence/messaging/inbox`, `/api/agence/fans/[id]/merge`, `/api/agence/fans/link-instagram`)
  - `plans/product/modules.md` (section Messagerie + CRM fans unifié)
  - `plans/REFACTOR-NAVIGATION-SPEC.md` (Option 1 naming Contacts vs Clients)
  - `plans/business/bp-agence-heaven-2026-04/README.md` (contexte agent IA + canaux)
  - Briefs NB B7 (suppression tab Clients, fusion contacts multi-canal web+Snap+IG+Fanvue, profil unifié avec goûts/envies, canal de réponse natif selon source)
  - Code existant analysé : `src/app/api/agence/messaging/inbox/route.ts`, `src/app/api/agence/fans/[id]/merge/route.ts`
- Livrables : `STRATEGIE-v1.2026-04-21.md` + `INFRA-v1.2026-04-21.md`
- Hors scope : agent IA réponses automatiques (Sprint 6 + `IA-AGENT-SPEC.md`), Message Tags Meta 24h+, API Snapchat/Fanvue (pas d'API externe)

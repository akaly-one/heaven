# Messagerie + Contacts — Changelog

## 2026-04-24 (v3 — Phase 2.2) — BRIEF-13 tickets UV01 + UV02 + UV03 + UV04 livrés

> Auteur : Agent DEV Phase 2 #2 · Tickets : UV01 + UV02 + UV03 + UV04 · Brief parent : [BRIEF-2026-04-24-13](../../PMO/briefs/) (Unification Clients & Codes + Self-verification)

### Infrastructure self-verification IP-matched

Base de données + service layer prêts pour le flow : visiteur fournit un pseudo Snap/Insta → admin génère un lien + code 6 chiffres → admin envoie manuellement via le vrai canal (Snap/IG) → fan clique depuis la même IP /24 → auto-validé.

### UV01 — Migration 069 + 070 (DB)

- **`supabase/migrations/069_agence_client_verifications.sql`** — Nouvelle table `agence_client_verifications` (24 colonnes avec `created_at/updated_at`, 4 index spécifiques + pkey + unique token, RLS service_role-safe, CHECK constraints sur `target_platform`, `sent_via_platform`, `validation_method`, `ip_match_type`, `status`).
- **`supabase/migrations/070_agence_clients_verified_fields.sql`** — Extension `agence_clients` avec 3 colonnes (`verified_handle`, `verified_platform`, `verified_via_verification_id` FK). Backfill safe : 4 clients déjà `access_level='validated'` ont reçu leur `verified_handle` depuis `pseudo_insta` (priorité) ou `pseudo_snap` non-anonyme.
- Appliquées en prod Supabase `tbvojfjfgmjiwitiudbn` via MCP `apply_migration`.

### UV02 — Trigger auto-create verification

Inclus dans migration 070 : fonction PL/pgSQL `auto_create_verification_on_handle_add()` + trigger `trg_auto_verif_handle` AFTER INSERT OR UPDATE OF pseudo_snap, pseudo_insta. Dès qu'un handle Snap (non-anon) ou Insta est ajouté sur un client `access_level != 'validated'`, une row `agence_client_verifications` pending est créée automatiquement (token hex 32 chars via `gen_random_bytes(16)`, code 6 chiffres, TTL 72h). Testé live : UPDATE `pseudo_insta` → row pending créée, token et code conformes.

### UV03 — Helper crypto + service generate

- **`src/shared/lib/verification/crypto.ts`** (73 lignes) — `hashIpSubnet()` (SHA256 subnet /24 IPv4 ou 3 premiers segments IPv6 + SALT, tronqué 16 chars), `hashUserAgent()` (browser + major version base), `compareIpLoose()`, `compareUaLoose()`, `getClientIp()` (x-forwarded-for > x-real-ip), `getUserAgent()`. RGPD : jamais stocker IP brute, seul le hash subnet est persisté.
- **`src/shared/lib/verification/generate.ts`** (58 lignes) — `generateVerification({ clientId, handle, platform, adminCode, req })` → token `randomBytes(16).toString("hex")`, code `100000-999999`, TTL `Date.now() + 72h`, INSERT dans `agence_client_verifications` avec hashs IP/UA de l'admin qui génère, retourne `{ verification_id, token, code, link, expires_at }`. Env var `VERIFICATION_SALT` (fallback `"heaven-verif-default-salt-2026"` à surcharger en prod Vercel). Env var `NEXT_PUBLIC_SITE_URL` pour composer le lien (fallback `https://heaven-os.vercel.app`).

### UV04 — Routes API

- **`src/app/api/agence/clients/[id]/verification/generate/route.ts`** — POST, auth root/model (scope check model→client.model), input `{ platform: "snap"|"insta", handle? }`, lit `pseudo_{platform}` du client si `handle` absent, refuse pseudo anon (visiteur-/guest-), rate limit **5 verifs / client / 24h** via COUNT, appelle `generateVerification()`, retourne `VerificationGenerated`.
- **`src/app/api/agence/clients/[id]/verification/[vid]/mark-sent/route.ts`** — POST, auth root/model (scope check), input `{ via: "snap"|"insta"|"manual" }`, UPDATE `agence_client_verifications` SET `status='sent', sent_by, sent_via_platform, sent_at=NOW()` WHERE `id=vid AND client_id=id AND status='pending'` (contrôle état). Retourne `{ ok, verification }`.

### Fichiers touchés

- `supabase/migrations/069_agence_client_verifications.sql` (créé, 57 lignes)
- `supabase/migrations/070_agence_clients_verified_fields.sql` (créé, 83 lignes — migration + trigger UV02)
- `src/shared/lib/verification/crypto.ts` (créé, 73 lignes)
- `src/shared/lib/verification/generate.ts` (créé, 58 lignes)
- `src/app/api/agence/clients/[id]/verification/generate/route.ts` (créé, 102 lignes)
- `src/app/api/agence/clients/[id]/verification/[vid]/mark-sent/route.ts` (créé, 82 lignes)
- `plans/PMO/03-ROADMAP-MASTER.md` (4 cases cochées UV01-UV04)
- `plans/modules/messagerie-contacts/CHANGELOG.md` (cette entry v3)

### Vérification

- `npx tsc --noEmit` → **exit 0** (strict, sans `any`)
- DB live : table `agence_client_verifications` créée (24 cols, 6 index, RLS ON policy `agence_client_verif_all`)
- `agence_clients` : 3 colonnes ajoutées, **4 rows backfillées** avec `verified_handle`
- Trigger testé en live (UPDATE `pseudo_insta` → row pending, token 32 chars, code 6 chiffres → rollback propre)

### Contraintes NB respectées

- Migrations **idempotentes** (IF NOT EXISTS / ON CONFLICT / IF NOT EXISTS partout)
- **Jamais d'IP brute** stockée — seulement SHA256(subnet /24 + SALT) tronqué 16 chars
- `VERIFICATION_SALT` jamais commité — env var avec fallback à surcharger en Vercel
- **Zero `any`** dans le code TypeScript
- Aucune régression : backfill préserve tous les `validated` existants

### Prochains tickets (UV05+)

Page `/verify/[token]`, API validate (IP match loose + UA fallback), UI admin fiche fan (bouton Générer + copier + Marquer envoyé + Révoquer), liste verifications pending, expiration cron, audit logs — à cadrer dans Phase 2.3 sur GO NB.

---

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

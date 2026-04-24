# Messagerie + Contacts — Changelog

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

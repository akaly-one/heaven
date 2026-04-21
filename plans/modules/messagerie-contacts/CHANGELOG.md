# Messagerie + Contacts — Changelog

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

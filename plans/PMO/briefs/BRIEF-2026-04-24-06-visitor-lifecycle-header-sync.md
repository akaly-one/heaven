# BRIEF-2026-04-24-06 — Cycle de vie visiteurs + sync bouton header avec pseudos messages

> **Status** : 🟠 cadré (en attente GO NB)
> **Source** : NB message du 2026-04-24 ~17:30 (bug "No web client linked" + règles métier visiteur temporaire 24h / upgrade 7j / sync header)
> **Type** : feature + règle métier + refactor
> **Priorité** : P1 (impact UX + data cleanliness)
> **Hotfix inline livré** : commit `b5e005e` (fix A + fix B — permet reply admin maintenant)

---

## Demande NB (verbatim résumé)

1. **Bug** : impossible de répondre manuellement → "No web client linked to this fan for current model" → ✅ fixé dans commit `b5e005e` (hotfix BRIEF-06)
2. **Nouvelles règles métier cycle de vie visiteurs** :
   - Tous les visiteurs génèrent un **alias visiteur temporaire**
   - Cet alias dure **1 jour** (24h)
   - Après 24h : **archivage automatique** si visiteur n'a rien fait
   - Si le visiteur ajoute **compte Insta ou Snap** → passage en **"en attente validation"**
   - Durée de l'attente validation : **7 jours**
   - Après 7 jours sans validation : **archivage automatique** aussi
3. **Sync bouton header messenger** avec pseudos :
   - Le bouton header à côté de "messenger" récolte clients + codes
   - Ce bouton doit être **synchronisé avec les pseudos générés** pour les messages
   - Cohérence cross-vue (header ↔ messagerie ↔ profil) — règle déjà partiellement en place (v1.4.0) mais à compléter

## Compréhension CDP

### État actuel (post-hotfix b5e005e)

- ✅ L'agent IA publie ses réponses (migration 059 ai_run_id)
- ✅ Admin peut répondre aux visiteurs sans handle (pseudo:* support)
- ❌ Mais le cycle de vie visiteurs n'est pas modélisé :
  - Pas de colonne `status` ou `lifecycle_stage` sur `agence_clients`
  - Pas de date d'archivage / expiration
  - Pas de job qui archive automatiquement
  - Pas de concept "en attente validation 7 jours"
- ❌ Le bouton header dropdown (codes + clients) n'utilise pas encore `getConversationPseudo` (désynchronisation résiduelle)

### Modèle de données cible

Ajouter sur `agence_clients` :
- `lifecycle_stage TEXT` : `temporary` (visiteur < 24h, aucun handle) / `pending_verification` (handle fourni, en attente admin) / `verified` (upgrade validé) / `archived` (expiré/manuel)
- `lifecycle_expires_at TIMESTAMPTZ` : date limite de la stage courante (24h pour temporary, 7j pour pending_verification, NULL pour verified/archived)
- `verified_at TIMESTAMPTZ` : set à NOW() quand admin valide
- `archived_at TIMESTAMPTZ` : set à NOW() quand archivé
- `archive_reason TEXT` : `auto_expired_temporary` / `auto_expired_pending` / `manual_admin` / etc.

Déjà présents : `pseudo_snap`, `pseudo_insta`, `nickname`, `firstname`, `tier`, `verified_status`, `verified_at`, `verified_by` (partiellement, mais logique différente)

→ **Réconciliation** : `verified_status` existant peut être remis à plat (valeurs `pending` / `verified` / `rejected`) ou fusionné dans `lifecycle_stage`. ADR à trancher dans CP01.

## Scope

### IN

1. **DB** :
   - Migration 060 : ajout colonnes lifecycle sur `agence_clients`
   - Backfill : tous les clients existants → `lifecycle_stage='verified'` (rétrocompat, pas de purge)
   - Nouveau clients créés (auto via API) → `temporary` par défaut, `expires_at = NOW() + 24h`
   - Quand client ajoute pseudo_snap/insta → auto-trigger stage `pending_verification`, `expires_at = NOW() + 7j`
   - Quand admin valide → stage `verified`, clear `expires_at`
2. **BE** :
   - Modif `/api/clients POST` : crée avec `lifecycle_stage='temporary'` + expires_at
   - Modif `/api/clients PATCH` : si update ajoute handle → stage `pending_verification` + nouvel expires_at
   - Nouvelle route `/api/agence/clients/[id]/verify` : admin valide (passe en `verified`)
   - Nouvelle route `/api/agence/clients/[id]/archive` : admin archive manuellement
   - Nouveau cron `/api/cron/archive-expired-clients` : scanne expires_at < NOW() AND stage IN (temporary, pending_verification) → archive
3. **FE** :
   - Badge "temporary" / "pending verif" / "archived" sur chaque conversation row
   - Filtre inbox : default = non archivé, toggle "inclure archivés"
   - Drawer fan : bouton "Verify" (si pending) / "Archive" (si actif) / "Restore" (si archivé)
   - Compteur expiration ("expire dans X jours/heures") visible sur row
4. **Bouton header sync** :
   - Le bouton header dropdown doit consommer `getConversationPseudo` depuis `conversation-display.ts`
   - Même traitement pour codes / clients / conversations
   - Couplage avec BRIEF-02 Messenger UI Standards (ils partagent les mêmes composants shared `<ConversationAvatar>` + `<ConversationRow>`)
5. **Doc** :
   - ADR dans `plans/modules/messagerie-contacts/DECISIONS.md` sur le modèle lifecycle
   - Runbook admin "Validation / archivage visiteur" dans `plans/PMO/standards/OPS.md`

### OUT

- Multi-tenant (Paloma/Ruby) : scope étendu plus tard, le lifecycle est app-wide
- Notification fan à l'archivage (email/SMS) : pas de canal en MVP
- Dashboard analytics rétention/conversion : brief futur
- Refonte complète `agence_fans` ↔ `agence_clients` (trop risqué — on ajoute à `agence_clients` sans casser l'existant)

## Branches concernées

- ☒ **DB** — migration 060 lifecycle + cron archive
- ☒ **BE** — 3 routes API + cron worker
- ☒ **FE** — badges + filtres + drawer boutons + header sync
- ☒ **QA** — tests e2e lifecycle + snapshot cohérence header/messagerie
- ☒ **Doc** — ADR + runbook + module CONTEXT.md messagerie mise à jour
- ☐ AI / DevOps — pas directement

## Dépendances

### Amont
- ✅ Hotfix b5e005e (ai_run_id + pseudo-fan reply) — pré-requis livré
- 🟠 BRIEF-02 Messenger UI Standards — **synergique** : les composants shared (ConversationRow, ConversationAvatar) créés pour BRIEF-02 hébergeront les badges lifecycle de BRIEF-06

### Aval
- Permettra BRIEF futur "Analytics retention funnel" (conversion temporary → verified)
- Pattern réutilisable pour cycle de vie des codes admin, messages, etc.

## Livrables

### L1 — Data model + backend (~2h)

| Ticket | Titre | Effort |
|---|---|---|
| `TICKET-V01` | Migration 060 : colonnes lifecycle + backfill verified | 30 min |
| `TICKET-V02` | Modif `/api/clients` POST+PATCH : gestion auto stage + expires_at | 30 min |
| `TICKET-V03` | Route `/api/agence/clients/[id]/verify` + `/archive` | 30 min |
| `TICKET-V04` | Cron `/api/cron/archive-expired-clients` + entry vercel.json | 30 min |

### L2 — Frontend lifecycle UI (~2h)

| Ticket | Titre | Effort |
|---|---|---|
| `TICKET-V05` | Badge lifecycle + compteur expiration sur `<ConversationRow>` shared | 30 min |
| `TICKET-V06` | Drawer fan : boutons Verify/Archive/Restore | 45 min |
| `TICKET-V07` | Filtre inbox : toggle "inclure archivés" | 30 min |
| `TICKET-V08` | Header dropdown sync : utiliser `getConversationPseudo` partout | 15 min |

### L3 — Tests + Doc (~1h)

| Ticket | Titre | Effort |
|---|---|---|
| `TICKET-V09` | Tests Playwright e2e lifecycle (create→expires→archive) | 30 min |
| `TICKET-V10` | ADR + runbook + update module CONTEXT messagerie | 30 min |

**Total effort** : ~5h CDP + sous-agents, étape par étape.

## Acceptance criteria

- [ ] Nouveau visiteur web créé → stage `temporary`, expires_at = +24h
- [ ] Visiteur ajoute pseudo_insta → stage `pending_verification`, expires_at = +7j
- [ ] Admin clique "Verify" → stage `verified`, expires_at NULL, verified_at set
- [ ] Cron quotidien archive les clients expirés
- [ ] Inbox affiche badge lifecycle cohérent sur chaque row
- [ ] Header dropdown et page messagerie rendent le MÊME pseudo pour le même client
- [ ] Tous les tests Playwright lifecycle passent
- [ ] ADR documenté + runbook admin publié
- [ ] Aucune régression : conversations existantes (stage='verified' backfill) restent visibles normalement

## Notes CDP

**Synergie avec BRIEF-02** : TICKET-V05 et V08 dépendent des composants shared créés dans BRIEF-02 (ConversationRow, ConversationAvatar, getConversationPseudo unifié). Ordre logique : **exécuter BRIEF-02 AVANT BRIEF-06** pour éviter double refactor.

**Risque DB** : migration 060 ajoute 5 colonnes + backfill massif. Sur agence_clients qui peut avoir 1000+ rows, le backfill doit être rapide (index + no-op `verified` par défaut). Tester sur branche Supabase puis apply prod.

**Cron archive** : 1x/jour suffit (compatible Hobby). Horaire : `0 3 * * *` (3h UTC = 4h local Paris, trafic minimal). Hérite de CRON_SECRET existant.

**Skills Claude Code préférentiels** :
- V01 : Supabase MCP + `general-purpose`
- V02/V03/V04 : `senior-backend` + `vercel:vercel-functions`
- V05/V06/V07/V08 : `senior-frontend` + composants shared BRIEF-02
- V09 : `engineering:testing-strategy`
- V10 : `engineering:documentation` + `operations:runbook`

**Conditions GO exécution** :
1. NB valide le cadrage (modèle lifecycle + durées 24h/7j confirmées)
2. BRIEF-02 livré OU décision de paralléliser (risque double refactor UI)
3. NB valide l'ordre dans le plan global v1.1 (ajouter BRIEF-06 après BRIEF-02)

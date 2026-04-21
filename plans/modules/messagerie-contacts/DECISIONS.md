# Decisions — Module Messagerie + Contacts

> Append-only. Format ADR (Context / Decision / Consequences).

---

## ADR-001 — Suppression tab « Clients » séparée

**Date** : 2026-04-21
**Status** : Proposed

### Context
Brief B7 NB : la tab Clients actuelle (`/agence/clients`) est redondante avec l'idée de Contacts. Chaque fan doit être visible depuis la Messagerie.

### Decision
Supprimer la tab sidebar « Clients ». Redirection `/agence/clients` → `/agence/messagerie?view=contacts`. Panneau Contacts intégré à la Messagerie.

### Consequences
- ✅ Un seul point d'entrée pour gestion fans
- ✅ Réduction items sidebar (cohérent avec décisions D-1/D-2/D-3 navigation)
- ⚠️ Migration URL bookmarks existants via redirect (pas de 404)

---

## ADR-002 — Fusion contact multi-canal (web + IG + Snap + Fanvue)

**Date** : 2026-04-21
**Status** : Proposed

### Context
Brief B7 NB : un seul fan a potentiellement plusieurs handles (pseudo web, pseudo Snap, compte IG, compte Fanvue). Actuellement, chaque canal crée son propre contact séparé.

### Decision
Un fan = une entrée `agence_fans` avec handles multiples en JSONB :
```sql
handles jsonb  -- ex: {"web": "pseudo_X", "insta": "@user", "snap": "snapX", "fanvue": "fanvueY"}
```

Fusion automatique via :
1. Fingerprint (IP + user-agent, fenêtre 7j)
2. Handles identiques cross-canal (trigramme trgm similarity > 0.9)
3. Merge manuel depuis drawer fan (admin)

Tous les messages dirigés vers ce fan, peu importe le canal, remontent dans une timeline unique.

### Consequences
- ✅ Vision 360° du fan
- ✅ Historique consolidé des envies/goûts cross-canal
- ⚠️ Complexité logique merge (éviter faux positifs)
- ⚠️ Migration des contacts existants (backfill 18 clients legacy)

---

## ADR-003 — Reply cross-canal avec timer Meta 24h

**Date** : 2026-04-21
**Status** : Proposed

### Context
Meta impose une fenêtre de 24h après le dernier message reçu pour pouvoir répondre en DM Instagram. Au-delà, seul un message de type "message tag" (HUMAN_AGENT, etc.) est autorisé.

### Decision
Dans la messagerie, afficher un timer visible sur chaque conversation IG indiquant :
- Temps restant avant expiration 24h window
- Désactiver bouton "Reply via IG" si fenêtre expirée
- Proposer fallback "Reply via web" (si le fan a aussi un pseudo web)

### Consequences
- ✅ Conformité Meta stricte (évite ban)
- ✅ Transparence UX (admin sait ce qui est possible)
- ⚠️ Nécessite tracking `last_received_at` par conversation IG

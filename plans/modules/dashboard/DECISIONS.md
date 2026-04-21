# Decisions — Module Dashboard

> Append-only. Format ADR (Context / Decision / Consequences).

---

## ADR-001 — Renommage lien sidebar « agence » → « Dashboard »

**Date** : 2026-04-21
**Status** : Proposed

### Context
Le lien sidebar actuel est libellé « agence » mais pointe vers l'index du CP (`/agence`), ce qui crée une confusion avec la section « Agence » (modules génériques Finance/Ops/Agent DM template). L'intention NB est que ce lien soit le Dashboard principal du CP.

### Decision
Renommer le libellé sidebar « agence » → « Dashboard ». La route `/agence` reste inchangée (pas de breaking change URL).

### Consequences
- ✅ Libellé plus clair, cohérent avec le concept d'index/home CP
- ✅ Évite confusion avec section Agence (modules standardisés réplicables)
- ⚠️ Implémentation côté `src/shared/components/sidebar.tsx`

---

## ADR-002 — Icône couronne Heaven = raccourci dashboard

**Date** : 2026-04-21
**Status** : Proposed

### Context
Actuellement le bouton « Dashboard » dans la sidebar et l'icône couronne Heaven sont deux éléments distincts, créant une redondance.

### Decision
L'icône couronne Heaven devient le raccourci unique vers `/agence`. Suppression du bouton « Dashboard » redondant dans la sidebar.

### Consequences
- ✅ UX allégée, moins de duplication visuelle
- ✅ Logo = home (pattern web courant)
- ⚠️ À communiquer visuellement (tooltip "Dashboard" sur couronne)

---

## ADR-003 — Sync automatique avatar CP ↔ photo profil Instagram

**Date** : 2026-04-21
**Status** : Proposed

### Context
Actuellement l'avatar modèle dans le header CP n'est pas synchronisé avec la photo de profil Instagram du compte lié. NB veut que la photo suive automatiquement celle de l'Insta.

### Decision
Priorité de chargement avatar : `Meta Graph API live` > `avatar_ig_url` en DB (TTL 24h Cloudinary mirror) > fallback initial lettre.

Sync quotidien via cron `sync-instagram` (déjà actif 6h).

### Consequences
- ✅ Avatar CP toujours cohérent avec Insta
- ✅ Pas de charge supplémentaire (piggyback sur cron existant)
- ⚠️ Dépend de permissions Meta (`instagram_basic` déjà demandé)
- ⚠️ Fallback Cloudinary si API down

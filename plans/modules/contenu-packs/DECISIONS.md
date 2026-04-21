# Decisions — Module Contenu + Packs

> Append-only. Format ADR (Context / Decision / Consequences).

---

## ADR-001 — Restauration drag & drop supprimé par erreur

**Date** : 2026-04-21
**Status** : Proposed

### Context
Brief B8 NB : le drag & drop dans l'éditeur de packs avait été développé puis supprimé/cassé dans le code. L'historique git montre commit `9e93428` (2026-04-10) comme suppression.

### Decision
Récupérer la logique drag&drop depuis commits antérieurs (`6078376`, `977f6ba`, `ae5c7f3`) et la réintégrer dans le composant actuel. Pas de re-développement from scratch.

### Consequences
- ✅ Gain de temps (code déjà testé existait)
- ⚠️ Vérifier compatibilité avec composants actuels post-merge Turborepo (d32a53f)

---

## ADR-002 — Extension `agence_packs` avec règles de visibilité

**Date** : 2026-04-21
**Status** : Proposed

### Context
Brief B8 NB : chaque pack doit avoir des règles affinables (visibilité, flou, nombre de previews).

### Decision
Nouvelle migration `041_pack_visibility_rules.sql` :
```sql
ALTER TABLE agence_packs ADD COLUMN visibility_rule enum ('public','if_purchased','preview_blur') DEFAULT 'if_purchased';
ALTER TABLE agence_packs ADD COLUMN blur_intensity int DEFAULT 10;   -- niveau flou 0-20
ALTER TABLE agence_packs ADD COLUMN preview_count int DEFAULT 0;     -- nb items visibles gratuit avant paywall
```

Le feed public applique ces règles au rendu selon `(fan.purchases.includes(pack_id), visibility_rule)`.

### Consequences
- ✅ Contrôle fin par pack
- ✅ Stratégie freemium possible (preview + flou)
- ⚠️ Migration DB à appliquer via Supabase MCP
- ⚠️ UI CP pour configurer les règles à concevoir

---

## ADR-003 — Upload Cloudinary direct (signed URL)

**Date** : 2026-04-21
**Status** : Proposed

### Context
Actuellement les uploads passent par l'API backend (chemin plus long, charge serveur). Cloudinary supporte l'upload direct depuis le navigateur avec URL signée.

### Decision
Passer à upload direct client → Cloudinary via signed URL généré côté API.

### Consequences
- ✅ Réduction charge serveur Vercel
- ✅ Upload plus rapide (pas de double transit)
- ⚠️ Sécurité : signed URL TTL court (5 min)
- ⚠️ Dossiers isolés `m1/`, `m2/`, `m3/` maintenus via signature paramétrée

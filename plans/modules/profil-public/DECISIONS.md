# Decisions — Module Profil public

> Append-only. Format ADR (Context / Decision / Consequences).

---

## ADR-001 — Skeleton uniforme pour les 3 modèles

**Date** : 2026-04-21
**Status** : Proposed

### Context
Yumi (m1) a un profil public configuré ; Paloma (m2) et Ruby (m3) pas encore. Tentation de créer des layouts différenciés par modèle, qui fragmenterait le code.

### Decision
Même skeleton `/m/[slug]/page.tsx` pour les 3 modèles. Seul le contenu varie (DB scoping `model_id`). Accès supplémentaires Yumi (admin principal) passent par le CP, pas par le profil public.

### Consequences
- ✅ Un seul code à maintenir
- ✅ Ajout futur modèle = seed + config, pas code
- ✅ Plans Identité Découverte/Shadow appliqués via flags profile, pas duplication

---

## ADR-002 — Posts Instagram présents dans le feed public

**Date** : 2026-04-21
**Status** : Proposed

### Context
Brief B10 NB : les posts IG doivent apparaître sur le profil public. Click = redirection native vers le compte Insta (pour commenter/DM).

### Decision
Le feed polymorphe `agence_feed_items` (source_type: manual/instagram/wall) inclut déjà les 3 sources. Badge distinctif :
- Post IG → badge gradient Instagram
- Post exclu web → badge couronne Yumi
- Post wall client → badge pseudo utilisateur

Click sur carte IG → ouvre `permalink_url` IG natif (nouvel onglet), PAS de modal interne.

### Consequences
- ✅ Conversion trafic profil → engagement IG
- ✅ Feed public riche (mix IG + exclu web)
- ⚠️ Dépend sync cron IG (daily 6h) — latence acceptable
- ⚠️ Meta CDN URLs expirent 24h → re-upload Cloudinary (déjà prévu Phase 2 sync)

---

## ADR-003 — Boutons CTA natifs Instagram (Follow / DM)

**Date** : 2026-04-21
**Status** : Proposed

### Context
Brief B9 NB : bouton « Suivre sur Insta » et « Message sur Insta » dans le header profil public.

### Decision
Liens natifs ouverts en nouvel onglet :
- Follow : `https://instagram.com/<username>`
- DM : `https://ig.me/m/<username>`

Pas d'OAuth, pas de redirection propriétaire.

### Consequences
- ✅ Simplicité, aucune dépendance API
- ✅ Respecte les règles Meta (links external autorisés)
- ⚠️ DM link nécessite que l'utilisateur soit déjà logué Insta

# Module — Contenu + Packs

> Dossier : `plans/modules/contenu-packs/`
> Version courante : `STRATEGY-v1.2026-04-21.md` + `TECH-v1.2026-04-21.md`
> Dernière mise à jour : 2026-04-21

## Scope

Tab Contenu du CP : gestion packs + contenu avec **drag & drop restauré** (avait été cassé). Règles fines par pack (visibilité, flou, prévisualisation). Upload Cloudinary direct. Sync feed selon règles pack (public / if_purchased / preview_blur).

## Fichiers

- [STRATEGY-v1.2026-04-21.md](./STRATEGY-v1.2026-04-21.md) — briefs B8 + règles visibilité
- [TECH-v1.2026-04-21.md](./TECH-v1.2026-04-21.md) — drag&drop, extension `agence_packs`, upload Cloudinary
- [DECISIONS.md](./DECISIONS.md) — ADRs module
- [CHANGELOG.md](./CHANGELOG.md) — append-only

## Dépendances

- `modules/profil-public/` (feed visible selon règles pack)
- `03-tech/DATA-MODEL-` (tables `agence_packs`, `agence_feed_items`, `agence_purchases`)
- Cloudinary (storage tier-locked par `model_id`)

## Statut

- [x] STRATEGY v1 livrée
- [x] TECH v1 livrée (avec recherche git history drag&drop)
- [ ] Restauration effective drag&drop (commit `9e93428` à reverser ciblé)
- [ ] Migration `041_pack_visibility_rules.sql` (en attente GO NB)

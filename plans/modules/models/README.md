# Module — Models (profils)

> Dossier : `plans/modules/models/`
> Fichiers INFRA individuels par modèle (yumi, paloma, ruby)
> Dernière mise à jour : 2026-04-21

## Scope

Configuration et spécifications individuelles de chaque profil modèle géré par Heaven. Un fichier `INFRA-<slug>-v<N>.<date>.md` par modèle. Pas de STRATEGY globale (la stratégie modèle vit dans `01-strategy/` et dans `business/bp-agence-heaven-2026-04/`).

## Fichiers

- [INFRA-yumi-v1.2026-04-21.md](./INFRA-yumi-v1.2026-04-21.md) — Yumi (m1), modèle IA, admin principal
- [INFRA-paloma-v1.2026-04-21.md](./INFRA-paloma-v1.2026-04-21.md) — Paloma (m2), Mode B Hub annexe
- [INFRA-ruby-v1.2026-04-21.md](./INFRA-ruby-v1.2026-04-21.md) — Ruby (m3), Mode B Hub annexe
- [DECISIONS.md](./DECISIONS.md) — ADRs module
- [CHANGELOG.md](./CHANGELOG.md) — append-only

## Dépendances

- `business/bp-agence-heaven-2026-04/` (3 Modes A/B/C + Plans Identité + Paliers)
- `business/paloma-collaboration-2026-04/` (collaboration PALOMA spécifique)
- `modules/comptes-acces/` (4 modes d'accès, à créer)
- `03-tech/DATA-MODEL-` (scoping `model_id` m1/m2/m3)

## Règles P0

- Aucun vrai prénom stocké — aliases `yumi` (m1), `paloma` (m2), `ruby` (m3) uniquement
- IDs canoniques `m1`/`m2`/`m3` (slug = alias front seul)
- Chaque modèle = profil dédié DB + dossier Cloudinary isolé

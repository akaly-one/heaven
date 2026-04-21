# Module — Dashboard (index CP)

> Dossier : `plans/modules/dashboard/`
> Version courante : `STRATEGY-v1.2026-04-21.md` + `TECH-v1.2026-04-21.md`
> Dernière mise à jour : 2026-04-21

## Scope

Index du CP Heaven (anciennement `/agence`, renommé « Dashboard »). Header rempli par infos Instagram du modèle + KPI. Icône couronne Heaven dans sidebar = raccourci vers ce dashboard. Sync avatar Cloudinary ↔ photo profil IG automatique.

## Fichiers

- [STRATEGY-v1.2026-04-21.md](./STRATEGY-v1.2026-04-21.md) — briefs NB B9 + objectifs + success criteria
- [TECH-v1.2026-04-21.md](./TECH-v1.2026-04-21.md) — routes `/agence`, composants, sync IG header, API
- [DECISIONS.md](./DECISIONS.md) — ADRs module
- [CHANGELOG.md](./CHANGELOG.md) — journal append-only

## Dépendances

- `modules/instagram/` (source IG data + config agent)
- `modules/settings-dev-center/` (architecture map déplacée hors sidebar)
- `03-tech/SECURITY-` (scope admin vs modèle)

## Statut

- [x] STRATEGY v1 livrée (fusion briefs B9 + REFACTOR-NAVIGATION-SPEC + product/modules.md)
- [x] TECH v1 livrée (routes + composants + data)
- [ ] DESIGN v1 (à créer si besoin refonte UI)
- [ ] Implémentation code (en attente décisions NB D-1/D-2/D-3)

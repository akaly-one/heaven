# Module — Profil public `/m/{slug}`

> Dossier : `plans/modules/profil-public/`
> Version courante : `STRATEGY-v1.2026-04-21.md` + `TECH-v1.2026-04-21.md`
> Dernière mise à jour : 2026-04-21

## Scope

Page publique d'un profil modèle (`/m/yumi`, `/m/paloma`, `/m/ruby`). Skeleton uniforme cross-modèles. Contenu Instagram intégré au feed avec badges distinctifs. Boutons CTA natifs IG (Follow, DM).

## Fichiers

- [STRATEGY-v1.2026-04-21.md](./STRATEGY-v1.2026-04-21.md) — briefs B9/B10 + identity gate + tier + badges
- [TECH-v1.2026-04-21.md](./TECH-v1.2026-04-21.md) — route `/m/[slug]`, feed polymorphe, permalinks IG
- [DECISIONS.md](./DECISIONS.md) — ADRs module
- [CHANGELOG.md](./CHANGELOG.md) — append-only

## Dépendances

- `modules/contenu-packs/` (règles visibilité feed)
- `modules/instagram/` (source posts IG)
- `03-tech/DATA-MODEL-` (table `agence_feed_items` polymorphe)

## Statut

- [x] STRATEGY v1 livrée
- [x] TECH v1 livrée
- [ ] Implémentation badges distinctifs + CTA IG natifs

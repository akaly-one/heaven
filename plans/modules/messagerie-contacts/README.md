# Module — Messagerie + Contacts

> Dossier : `plans/modules/messagerie-contacts/`
> Version courante : `STRATEGY-v1.2026-04-21.md` + `TECH-v1.2026-04-21.md`
> Dernière mise à jour : 2026-04-21

## Scope

Fusion inbox (web + Instagram) + panneau Contacts intégré (plus de tab Clients séparée). Fusion contacts multi-canal (web + Snap + Instagram + Fanvue = 1 profil fan unifié). Historique goûts/critères/envies par fan.

## Fichiers

- [STRATEGY-v1.2026-04-21.md](./STRATEGY-v1.2026-04-21.md) — briefs B7 + flows fusion
- [TECH-v1.2026-04-21.md](./TECH-v1.2026-04-21.md) — vue `agence_messages_timeline`, table `agence_fans`, API merge/link
- [UI-STANDARDS-v1.2026-04-24.md](./UI-STANDARDS-v1.2026-04-24.md) — règles pseudo + avatar + bulles row/thread + mode agent + matrice cohérence (source unique header ↔ messagerie ↔ profil)
- [DECISIONS.md](./DECISIONS.md) — ADRs module
- [CHANGELOG.md](./CHANGELOG.md) — append-only

## Dépendances

- `modules/instagram/` (webhook IG, conversations)
- `03-tech/DATA-MODEL-` (tables `agence_messages`, `instagram_messages`, `agence_fans`)
- `03-tech/SECURITY-` (scope model_id RLS)

## Statut

- [x] STRATEGY v1 livrée (briefs B7 intégrés)
- [x] TECH v1 livrée
- [ ] Implémentation drawer fan + merge auto (en attente GO NB)

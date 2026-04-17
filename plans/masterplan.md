# Heaven — Masterplan

Plateforme de gestion de profils + abonnements. Stack Next.js 15 / Supabase / Cloudinary / Vercel.

## Index

Voir [`README.md`](./README.md) pour l'index ergonomique complet. Pointeurs rapides :

| Domaine | Doc | Rôle |
|---------|-----|------|
| Tech | [`tech/architecture.md`](./tech/architecture.md) | Turborepo, DB, API, flux |
| Tech | [`tech/stack-config.md`](./tech/stack-config.md) | Comptes, env vars, secrets |
| Tech | [`tech/outils.md`](./tech/outils.md) | OpenRouter, Meta, Cloudinary, Supabase |
| Design | [`design/design-system.md`](./design/design-system.md) | Tier system, branding poker, tokens |
| Security | [`security/roles-entities.md`](./security/roles-entities.md) | Entités, rôles, permissions |
| Product | [`product/objectifs.md`](./product/objectifs.md) | KPIs, cibles, break-even |
| Product | [`product/modules.md`](./product/modules.md) | Catalogue modules + Instagram Agent |
| Product | [`product/roadmap.md`](./product/roadmap.md) | Phases + tâches |
| Ops | [`ops/procedures.md`](./ops/procedures.md) | Safe-update, audit, release |
| Business | [`business/contexte-financier.md`](./business/contexte-financier.md) | Business model, commissions, projections |

## Profils

- `plans/models/YUMI.md` — profil actif
- `plans/models/RUBY.md` — profil actif
- `plans/models/PALOMA.md` — profil à activer

## Vocabulaire

Tous les profils sont désignés par leur alias public uniquement. Aucun vrai prénom n'apparaît dans le code, la DB, les docs ou les commentaires. Model IDs internes = `m1`, `m2`, `m4` (positionnels, non sémantiques).

## Statut (2026-04-17)

- Plateforme déployée (heaven-os.vercel.app)
- Auth JWT + dashboard CP complet + CRM + galerie tier-locked
- Chantiers ouverts : paiements live, multi-modèle opérationnel, 8 fixes UX
- Restructure Turborepo : 2026-04-17 ✅

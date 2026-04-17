# Heaven — Masterplan

Plateforme de gestion de profils + abonnements. Stack Next.js 15 / Supabase / Cloudinary / Vercel.

## Index

| # | Doc | Rôle |
|---|-----|------|
| 01 | [ARCHITECTURE](./01-ARCHITECTURE.md) | Turborepo, DB, API, flux |
| 02 | [DESIGN](./02-DESIGN.md) | Tier system, branding poker, tokens |
| 03 | [OBJECTIFS](./03-OBJECTIFS.md) | KPIs, cibles, break-even |
| 04 | [ROLES-ENTITIES](./04-ROLES-ENTITIES.md) | Profils, rôles, permissions |
| 05 | [PROCEDURES](./05-PROCEDURES.md) | Safe-update, audit, release |
| 06 | [MODULES](./06-MODULES.md) | Catalogue modules + Instagram Agent |
| 07 | [STACK-CONFIG](./07-STACK-CONFIG.md) | Comptes, env vars, secrets |
| 08 | [OUTILS](./08-OUTILS.md) | OpenRouter, Meta, Cloudinary, Supabase |
| 09 | [ROADMAP](./09-ROADMAP.md) | Phases + tâches (77 tâches) |
| 10 | [CONTEXTE-FINANCIER](./10-CONTEXTE-FINANCIER.md) | Business model, commissions, projections |

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

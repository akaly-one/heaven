# Heaven

Plateforme de gestion de profils + abonnements.
Stack : Next.js 15 + Supabase + Vercel.

## Dev

```bash
npm install
npm run dev:web    # landing + profils publics (port 3000)
npm run dev:cp     # admin + APIs (port 3001)
```

## Build

```bash
npm run build      # full turbo build
npm run build:cp   # admin only
npm run build:web  # public only
```

## Docs

- `plans/00-MASTERPLAN.md` — index
- `plans/01-ARCHITECTURE.md` → `10-CONTEXTE-FINANCIER.md`
- `plans/models/` — par profil
- `CHANGELOG.md` — historique versions

# 05 — Procedures

## Safe update process

Source originale : `docs/os/SAFE-UPDATE-PROCESS.md` (maintenant USER-only).

### Branching
1. Depuis `main` → `feat/<nom>` ou `fix/<nom>`
2. Un sujet par branche
3. Commits atomiques (security/refactor/feat/docs)

### Checklist pré-merge
- [ ] `npx tsc --noEmit` → 0 erreurs
- [ ] `npx turbo build` → build réussi (cp + web)
- [ ] Page profil `/m/yumi` charge correctement
- [ ] Codes d'accès fonctionnent (login test)
- [ ] APIs `/api/packs`, `/api/uploads`, `/api/codes` répondent
- [ ] Pas de `console.error` navigateur
- [ ] Grep `Greta|Oceane|greta|oceane|\bgret\b` → vide

### Merge + deploy
1. PR review obligatoire (même solo — checklist self)
2. Merge → Vercel déploie auto depuis `main`
3. Smoke test prod (/m/yumi + /agence login)

## Audit sécurité

### Post-patch mandatoire
Après CHAQUE patch touchant auth / DB / env :
- [ ] Grep secrets leaked dans bundle client
- [ ] Grep `NEXT_PUBLIC_*` sur URLs OS/API sensibles
- [ ] Vérifier RLS Supabase non contournable
- [ ] Test middleware JWT sur route protégée
- [ ] Test route publique accessible sans token

### Audit confidentialité (Heaven-specific)
- [ ] Aucun vrai prénom (civil) dans src/ + plans/ + docs/
- [ ] Aucune référence SQWENSY dans bundle client `/m/[slug]`
- [ ] Header `/m/[slug]` ne mentionne ni Heaven ni SQWENSY à un fan non-logué
- [ ] Emails sortants (Resend) ne trahissent pas l'infra

## Release

### Versioning
- `v0.x.y` durant alpha (actuel)
- `v1.0.0` au premier paiement live réel
- CHANGELOG.md racine mis à jour à chaque release

### Branche restructure
- `restructure/standard-2026-04` active
- HEAD pre : `9cb065f`
- Rollback : `git reset --hard 9cb065f`

## Migration DB

- Tous les scripts dans `supabase/migrations/0NN_description.sql`
- Numérotation monotone (030 Instagram, 031 story TTL si appliquée)
- JAMAIS toucher une migration déjà appliquée ; en créer une nouvelle

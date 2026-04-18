# Maintenance préventive — Heaven

> Cadence standardisée pour éviter corruption, duplicats, perte de données.
> Référence : `sqwensy-os/docs/STANDARDS-REPO-HYGIENE.md` (source de vérité cross-CP)

---

## 🔵 Hebdo (lundi matin, 10 min)

| Action | Commande |
|--------|----------|
| Hygiene check + fix auto | `bash scripts/check-repo-hygiene.sh --fix` |
| Worktree prune | `git worktree prune` |
| npm audit | `npm audit` |

## 🟠 Mensuel (30 min)

- Audit redondances code (grep `format*/human*/compute*`)
- Update CHANGELOG Heaven avec entrées du mois
- Test build from scratch
- Audit RLS Supabase Heaven (policies `/supabase/policies/*.sql`)

## 🔴 Trimestriel (2h)

- Audit DB schema vs code (schema Heaven isolé)
- Migration cleanup
- Deps update : Midjourney API / ElevenLabs / Suno / HeyGen / Runway stack
- Audit conformité AI Act EU (enforcement 2 août 2026 — labels AI obligatoires)

## 🚨 Spécifique Heaven

- **Confidentialité** : jamais de référence publique Heaven ↔ SQWENSY. Check que `docs/`, README, OG tags n'exposent pas.
- **Paloma status juridique** : review mensuel (chômage BE → activité accessoire → indépendant). Voir `plans/PALOMA-COLLABORATION.md`.
- **AI label compliance** : avant chaque publication YUMI → vérifier `#AI #Virtual` bio + tag post.

## Historique incidents

| Date | Incident | Résolution |
|------|----------|------------|
| 2026-04-18 | 27 duplicats macOS " 2" + PR Vercel Analytics en conflit PostHog | Archive cross-CP + Vercel Analytics implémenté directement sur main |

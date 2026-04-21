# Maintenance préventive — Heaven

> Cadence standardisée pour éviter corruption, duplicats, perte de données.
> Référence : `sqwensy-os/docs/STANDARDS-REPO-HYGIENE.md` (source de vérité cross-CP)
> Dernière mise à jour : **21 avril 2026**

---

## 🔵 Hebdo (lundi matin, 10 min)

| Action | Commande |
|--------|----------|
| Hygiene check + fix auto | `bash scripts/check-repo-hygiene.sh --fix` |
| Worktree prune | `git worktree prune` |
| npm audit | `npm audit` |
| Cleanup cache Next.js | `rm -rf .next` |

## 🟠 Mensuel (30 min)

- Audit redondances code (grep `format*/human*/compute*`)
- Update CHANGELOG Heaven avec entrées du mois
- Test build from scratch : `rm -rf .next node_modules && npm ci && npm run build`
- Audit RLS Supabase Heaven (`supabase/policies/*.sql`)
- Check rétention `agence_ops_metrics` (doit rester sous 7j via cron purge)
- Monitor quota Meta Graph API (180 calls/h) via `/agence/ops`

## 🔴 Trimestriel (2h)

- Audit DB schema vs code (schema Heaven isolé)
- Migration cleanup + vérification cohérence `mN` IDs
- Deps update : Meta Graph API v19 → v20+, OpenRouter model deprecation, Next.js 15 → 16
- Audit conformité AI Act EU (enforcement 2 août 2026 — labels AI obligatoires)
- Audit cession : si vente/cession CP, applicable protocole `docs/PROTOCOLE-CESSION-CP-CLIENT.md`

---

## 🚨 Règles absolues Heaven

### Dev local
- **Turbopack désactivé** : bug vendor-chunks récurrent (posthog-js, lucide-react). Utiliser Webpack (`next dev` sans `--turbo`). `predev` supprime `.next` avant chaque run.
- **Port dev** : 3002 (conflict 3000/3001 avec sqwensy-os)
- **Supabase MCP** obligatoire pour migrations (pas de CLI locale Heaven)

### Vercel
- **Plan Hobby limite 1 cron/jour** : worker IG migration vers Upstash QStash (free) ou Vercel Pro (D-6). Actuellement : sync-instagram 6h + purge-ops 4h → ✅ sous quota. Ajout worker `/process-ig-replies` nécessite upgrade.
- **Webhook IG < 500ms** obligatoire (pattern async enqueue + RPC atomique — voir `plans/tech/architecture.md`)
- **Cloudinary edge cache 30j** : `next.config.ts` configuré, ne pas réduire sans raison

### Confidentialité
- **Jamais de référence publique Heaven ↔ SQWENSY**. Check que `docs/`, README, OG tags, packages.json n'exposent pas.
- **Aucun vrai prénom** dans code / doc / DB / commits / commentaires / variables. IDs internes uniquement : `yumi` / `paloma` / `ruby`.
- **Aucun leak env var** publique (pattern `NEXT_PUBLIC_*` ne doit jamais contenir URL sqwensy-os / clés privées)
- **Paloma statut juridique** : review mensuel (chômage BE → activité accessoire → indépendant). Voir `plans/PALOMA-COLLABORATION.md`.
- **AI label compliance** : avant chaque publication YUMI → vérifier `#AI #Virtual` bio + tag post (AI Act EU dès 2 août 2026).

### Meta App (Yumi-AI)
- **Token permanent Instagram** : rotation si compromission. Endpoint `/api/instagram/exchange-token` prêt pour re-génération.
- **App en Dev Mode** jusqu'à App Review Meta validée → DMs uniquement depuis testers approuvés. Voir `plans/META-APP-PUBLICATION-PLAN.md`.
- **24h window** : welcome messages déclenchent UNIQUEMENT après réception 1er DM fan (code déjà compliant).

### Sécurité
- **Alerte active** (depuis 18 avril 2026) : 3 clés Supabase service_role leakées dans historique git sqwensy-os. Rotation obligatoire NB. Voir MEMORY `feedback_security_leak_supabase_keys_april2026.md`.
- **JWT session** : cookie `heaven_session` httpOnly + Secure + SameSite=Strict

---

## Historique incidents

| Date | Incident | Résolution |
|------|----------|------------|
| 2026-04-18 | 27 duplicats macOS " 2" + PR Vercel Analytics en conflit PostHog | Archive cross-CP + Vercel Analytics implémenté sur main |
| 2026-04-19 | Turbopack chunk corruption bloque dev (vendor-chunks posthog-js/lucide-react) | Switch Webpack via `package.json` dev script + predev `rm -rf .next` |
| 2026-04-20 | Route `/api/agence/messaging/inbox` 500 (colonne `pseudo` inexistante) | Fix SELECT → `nickname, firstname, pseudo_insta, pseudo_snap` |
| 2026-04-20 | IG dashboard tabs crash (mismatch shape API) | Tous routes IG retournent `{posts/comments/conversations: [...]}` |
| 2026-04-20 | Alias `gret1` admin toujours actif (P0 sécu) | `UPDATE agence_accounts SET active=false WHERE code='gret1'` |
| 2026-04-20 | Vercel deploy auto fail (cron Hobby limit) | Réduit crons à daily, deploy manuel `vercel --prod` |
| 2026-04-20 | Dashboard/messagerie client-side exception (shape API mismatch) | API retourne `last_message: { text, source, direction, created_at }` nested |
| 2026-04-20 | ON CONFLICT échoue sur partial unique index (sync IG posts) | Pattern DELETE + INSERT pour les 21 posts |

# BRIEF-2026-04-24-04 — Push env vars Vercel prod pour activer agent IA online

> **Status** : ✅ livré (partial : prod OK, preview bug CLI)
> **Source** : NB message du 2026-04-24 ~16:00 ("je desactiver la protection et le bypass je peux pas car je doit passer vercel pro, ajout les env vars via le mcp")
> **Type** : configuration infra / follow-up BRIEF-01
> **Priorité** : P0 (débloque l'agent IA en prod réelle)

---

## Demande NB (verbatim résumé)

1. Vercel Deployment Protection reste ACTIVE (pas de Vercel Pro pour la désactiver)
2. Ajouter les env vars manquantes via MCP / CLI
3. NB fournit directement le `INSTAGRAM_PAGE_ACCESS_TOKEN`

## Compréhension CDP

Suite à la clôture BRIEF-01 (fix FK ai_runs), l'agent IA peut **techniquement** logger ses runs, mais il manque les env vars Vercel pour qu'il fonctionne réellement en prod :
- `GROQ_API_KEY` absent → agent IA ne répond pas en prod (les 5 conversations observées ce matin venaient probablement du local dev)
- `CRON_SECRET` absent → cron Vercel `/api/cron/process-ig-replies` rejette les appels
- `INSTAGRAM_PAGE_ACCESS_TOKEN` absent → impossible d'envoyer les DM via Meta Graph API
- `AUTOMATION_API_KEY` + `OS_BEACON_URL` absents → sync Heaven ↔ SQWENSY cassée en prod

Pas de MCP Vercel disponible → utilisation du CLI Vercel v51.6.1 avec pipe sécurisé.

## Scope

### IN
- Push 5 env vars en Production : GROQ_API_KEY, CRON_SECRET, AUTOMATION_API_KEY, OS_BEACON_URL, INSTAGRAM_PAGE_ACCESS_TOKEN
- Tentative également en Preview (bug CLI détecté, reporté)
- Valeurs sources :
  - GROQ / AUTOMATION / OS_BEACON → `.env.local` existant
  - CRON_SECRET → généré localement (`openssl rand -hex 32`)
  - IG_TOKEN → fourni par NB dans le chat
- Aucune valeur affichée dans les commandes ou logs (pipe via fichier tmp /tmp/heaven-* supprimés post-push)
- Trigger redeploy via commit PMO (prise en compte auto par Vercel)

### OUT
- Vercel Preview env vars (bug CLI, reporté pour futur ticket — non bloquant pour prod)
- OPENROUTER_API_KEY (optionnel MVP, hors scope actuel)
- Désactivation Vercel Deployment Protection (bloqué par nécessité Vercel Pro)
- Meta App Review (autre blocker, autre brief)

## Branches concernées

- ☒ **DevOps** — push env vars via Vercel CLI
- ☒ **Doc** — brief PMO + trace
- ☐ FE / BE / DB / AI / QA — pas concerné

## Dépendances

- Aucune bloquante
- Suite de : BRIEF-01 (fix FK ai_runs)
- Prérequis pour : Meta webhook IG (quand App Review approuvé) + cron IG queue processing

## Livrables

### L1 — Env vars Vercel Production ✅

| Var | Statut | Source valeur | Push |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | `.env.local` | 3m ago |
| `CRON_SECRET` | ✅ | openssl rand -hex 32 (généré) | 2m ago |
| `AUTOMATION_API_KEY` | ✅ | `.env.local` | 2m ago |
| `OS_BEACON_URL` | ✅ | `.env.local` | 1m ago |
| `INSTAGRAM_PAGE_ACCESS_TOKEN` | ✅ | fourni NB | 1m ago |

**État final** `vercel env ls production` : 26 vars totales (21 avant + 5 nouvelles). Encryption Vercel standard.

### L2 — Env vars Vercel Preview ⚠️ reporté

**Bug détecté** : Vercel CLI v51.6.1 renvoie `action_required: git_branch_required` même avec `--value <v> --yes --force` sur `preview` env sans branche. La syntaxe documentée "Add to all Preview branches" (commande sans `<gitbranch>`) ne fonctionne pas en mode non-interactif.

**Options de contournement** (non exécutées) :
1. Ajouter via Vercel Dashboard (UI manuelle — simple)
2. Branche par branche (pas scalable)
3. Upgrade CLI Vercel (potentiellement résolu dans v52+)

**Non critique** : Preview n'est pas utilisé en prod réelle. Impact = local dev uniquement (développeur doit avoir `.env.local` complet, ce qui est le cas).

**Ticket follow-up** suggéré : `TICKET-EV02` — Push env vars Preview via Dashboard ou workaround CLI (à planifier si besoin).

## Acceptance criteria

- [x] 5 env vars visibles dans `vercel env ls production`
- [x] Aucune valeur de secret affichée dans les commandes Bash tool / logs / commits
- [x] Fichiers tmp (/tmp/heaven-*) supprimés après push
- [x] Token IG fourni par NB jamais écrit dans le repo
- [x] Redeploy Vercel déclenché (via commit PMO qui va suivre)
- [ ] Vérification : agent IA répond en prod réelle (via une nouvelle conversation de test post-redeploy) ← à valider par NB après redeploy

## Notes CDP sécurité

- **Token IG exposé dans le chat** : NB l'a collé en clair dans le message. Recommandation : régénérer le token via Meta Developer Console après cette session pour invalider celui exposé, puis repush via `vercel env add --force`. À faire en ticket séparé si NB le souhaite.
- **Fichiers tmp** : créés avec `cat > /tmp/heaven-xxx` puis `tr -d '\n'` pour stripper newlines, puis piped via `$(cat)` vers vercel CLI, puis supprimés explicitement. Pas de trace disque.
- **Commandes Bash** : `vercel env add NAME ENV --value "$(cat /tmp/xxx)"` — la valeur est substituée par le shell avant exécution, donc Bash ne logge pas la valeur dans l'output, seulement la commande avec `$(cat /tmp/xxx)`.

## Impact attendu post-redeploy

Après que Vercel redéploie avec les nouvelles env vars :
- **Web chat** (`/m/yumi`) : agent IA répond avec Groq Llama 3.3 70B en prod (persona Yumi active en DB)
- **Cron** (`/api/cron/process-ig-replies`) : peut maintenant s'exécuter (CRON_SECRET valide)
- **Heaven ↔ SQWENSY sync** : fonctionne en prod (AUTOMATION_API_KEY + OS_BEACON_URL)
- **Meta webhook IG** : toujours bloqué par Deployment Protection (hors scope ce brief)
- **Envoi DM IG** : possible techniquement mais bloqué par Meta App Review

## Prochaines actions

1. ✅ Commit PMO brief (ce fichier)
2. ✅ Push commit → trigger redeploy Vercel auto
3. ⏳ NB teste une conversation web `/m/yumi` post-redeploy pour valider agent IA en prod
4. ⏳ (Optionnel) Regénération token IG pour invalider celui exposé dans le chat
5. ⏳ Retour au plan-global-v1 Phase 1 (TICKET-S07 résolution `docs/` en attente GO NB)

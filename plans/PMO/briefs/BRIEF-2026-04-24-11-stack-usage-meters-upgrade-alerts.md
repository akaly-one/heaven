# BRIEF-2026-04-24-11 — Usage meters stack + alertes upgrade (Groq / Vercel / Cloudinary / Supabase)

> **Status** : 🟠 cadré (en attente GO NB)
> **Source** : NB message du 2026-04-24 ~19:00 ("faudra ajouter au cp une barre de progression et passage à un upgrade si on dépasse les limites des stacks gratuites, exemple pour les réponses IA, faut un compteur pour savoir quand j'ai vraiment progresser pour passer l'upgrade pareil pour les autres stack vercel, cloudinary, ou supabase")
> **Type** : feature + DevOps + monitoring
> **Priorité** : P1 (cost management + scalability visibility)

---

## Demande NB (verbatim résumé)

1. Barre de progression dans le CP par stack tier
2. Compteur d'utilisation des limites gratuites (Groq, Vercel, Cloudinary, Supabase)
3. Alerte / passage à upgrade quand on approche les limites
4. Visibilité : "quand j'ai vraiment progressé pour passer l'upgrade"

## Compréhension CDP

### Stacks tier actuelles + limites gratuites

| Service | Plan actuel | Limite gratuite | Métrique clé |
|---|---|---|---|
| **Groq** (agent IA) | Free | 14 400 req/jour | Nb appels LLM/jour |
| **Vercel** | Hobby | 100GB bandwidth/mois, 100h build/mois, crons daily max | Bandwidth + build hours + cron freq |
| **Cloudinary** | Free | 25 credits/mois (bandwidth + storage + transformations) | Credits consumed |
| **Supabase** | Free | 500 MB DB, 1GB storage, 2GB bandwidth | DB size + storage + egress |
| **OpenRouter** (fallback) | Pay-as-go | $0 credits sauf top-up | $ spent |
| **QStash Upstash** (futur BRIEF-05) | Free | 500 messages/jour | Messages/jour |

### Seuils alerte recommandés

- 🟢 Vert : <60% usage
- 🟡 Jaune : 60-80%
- 🟠 Orange : 80-95% (alerte Telegram)
- 🔴 Rouge : >95% (force upgrade prompt)

### Philosophie cost

Rappel règle NB (`feedback_extreme_cost_optimization_2026`) : stack cible 70-100€/mois total. Le dashboard doit :
- Anticiper les upgrades AVANT hit 100%
- Proposer les options upgrade avec coût
- Permettre toggle feature flag "auto-fallback provider" si limite hit

## Scope

### IN

#### Volet A — DB infrastructure (~1h)

1. `TICKET-UM01` Migration 067 : table `agence_stack_usage_snapshots`
   - Colonnes : id, stack (groq|vercel|cloudinary|supabase|openrouter|qstash), metric (requests|bandwidth|storage|credits), period_type (day|month), period_start, value_current, value_limit, percentage, measured_at, metadata JSONB
   - Index (stack, period_type, period_start)
   - RLS root only
2. `TICKET-UM02` Table `agence_stack_alerts` (append-only) :
   - Trigger quand passage de seuil (60/80/95)
   - Colonnes : id, stack, level (yellow|orange|red), message, notified_at, acknowledged_at

#### Volet B — Collectors backend (~3h)

3. `TICKET-UM03` Collector Groq :
   - Service `collectGroqUsage()` compte `ai_runs` WHERE created_at > start_of_day via COUNT SQL
   - Cron horaire (ou à chaque `ai_run` insert → trigger DB + increment counter cache)
4. `TICKET-UM04` Collector Vercel :
   - Appel Vercel API `/v1/projects/{id}/usage` avec bearer token
   - Env var `VERCEL_API_TOKEN` (token NB à créer, scope: usage:read)
   - Cron quotidien minuit UTC
5. `TICKET-UM05` Collector Cloudinary :
   - Appel Admin API `GET /usage` basic auth (API_KEY:API_SECRET déjà en env)
   - Cron quotidien
6. `TICKET-UM06` Collector Supabase :
   - DB size : query `pg_database_size(current_database())`
   - Storage : query `storage.buckets` + `storage.objects` aggregate
   - Egress : Supabase API `/v1/projects/{ref}/usage` (nécessite `SUPABASE_MANAGEMENT_TOKEN`)
   - Cron quotidien
7. `TICKET-UM07` Route `GET /api/agence/stack-usage` :
   - Output : `[{stack, metric, value, limit, percentage, level, trend_7d}]`
   - Admin only
8. `TICKET-UM08` Trigger alertes : cron hourly compare last snapshot vs seuils → INSERT alerts + push Telegram (Yumi + root)

#### Volet C — UI Dashboard (~2h)

9. `TICKET-UM09` Page `/agence/ops/usage` (nouvelle section Dev Center) :
   - 6 cards (une par stack) avec gauge progressif + trend arrow 7j
   - Couleur card selon level (vert/jaune/orange/rouge)
   - Clic card → détail historique 30j + recommandation upgrade
10. `TICKET-UM10` Widget sidebar "Usage" (badge color) :
    - Si stack rouge → badge rouge pulsant avec compteur
    - Hover → tooltip 3 plus chargés
11. `TICKET-UM11` Banner top admin pages si usage rouge :
    - "⚠️ Groq 97% utilisé — configure QStash fallback ou upgrade"
    - Bouton "Voir options upgrade"
12. `TICKET-UM12` Page `/agence/ops/upgrade-recommendations` :
    - Liste stacks approchant limites
    - Coût upgrade (Groq Pro $$/mois, Vercel Pro 20$/mois, etc.)
    - Alternatives (QStash vs Vercel Pro, etc.)
    - Bouton "Initier upgrade" → checklist

#### Volet D — Auto-fallback logic (~1h30)

13. `TICKET-UM13` Feature flag `stack_auto_fallback` dans `system_config` :
    - Si Groq >95% quota jour → bascule vers OpenRouter automatique (si OPENROUTER_API_KEY set)
    - Si Cloudinary bandwidth >95% → désactiver transformations dynamiques (servir originales)
    - Logs + alertes fan si impacté
14. `TICKET-UM14` Toggle UI admin pour activer/désactiver auto-fallback par stack

#### Volet E — Doc + runbook (~30 min)

15. `TICKET-UM15` Runbook `plans/PMO/standards/OPS.md` section "Usage Monitoring" :
    - Comment interpréter les métriques
    - Seuils + actions
    - Procédure upgrade par stack (liens docs officiels)
    - Rollback upgrade si erreur

### OUT

- Metrics fan-facing (pas besoin que fans voient notre usage)
- Facturation automatique upgrades (admin manuel)
- Multi-project (un seul projet Heaven pour l'instant)
- Predictive analytics ML (overkill MVP, moyenne mobile suffit)

### Questions à NB

- [ ] **VERCEL_API_TOKEN** : tu veux que je te guide pour le créer, ou tu le gères toi-même ?
- [ ] **SUPABASE_MANAGEMENT_TOKEN** : idem
- [ ] **Notifications Telegram** : tu as un bot Telegram configuré ? Je vois `feedback_root_master_authority` mentionne Telegram — quelle config existante ?
- [ ] **Auto-fallback activé par défaut** OU manuel ? Ma reco : activé sur Groq (non critique si fallback OpenRouter), manuel sur Cloudinary (impact UX)
- [ ] **Fréquence collecte** : quotidienne suffisante OU temps réel nécessaire ? Daily = Hobby-compatible, real-time = payment Vercel Pro

## Branches concernées

- ☒ **DB** — migrations 067 + RLS + trigger alertes
- ☒ **BE** — 4 collectors + routes + cron + auto-fallback logic
- ☒ **FE** — dashboard + widget sidebar + banner + upgrade recommendations page
- ☒ **DevOps** — tokens API + monitoring cron + alerting Telegram
- ☒ **Doc** — runbook ops + update charte OPS standards
- ☐ AI / QA / Legal — pas concernés

## Dépendances

### Amont
- ✅ Infra DB Heaven
- ✅ Env vars prod configurées (nécessite ajout 2 tokens API : Vercel + Supabase Management)

### Aval
- Débloque décision passage Vercel Pro (data-driven)
- Alimente décision BRIEF-05 (QStash vs Vercel Pro)
- Permet forecast BP réaliste (growth → costs trajectoire)

## Acceptance criteria

- [ ] Dashboard `/agence/ops/usage` affiche 6 cards avec gauge live
- [ ] Groq compteur aligné avec `COUNT(*) FROM ai_runs today`
- [ ] Vercel/Cloudinary/Supabase values matchent leurs dashboards officiels (tolérance 5%)
- [ ] Seuil rouge 95% → banner admin s'affiche + alerte Telegram
- [ ] Auto-fallback Groq > OpenRouter fonctionne (test avec quota simulé)
- [ ] Runbook OPS à jour
- [ ] Tests : simulation dépassement seuil → alerte émise

## Notes CDP

### Risque #1 — API rate limits sur les collectors
Appeler Vercel/Cloudinary/Supabase API trop souvent → risk de se faire rate-limiter par les APIs qu'on surveille. Mitigation :
- Cron daily suffit pour bandwidth/storage (lente évolution)
- Cron hourly pour Groq (compteur local DB, pas d'appel externe)
- Cache 4h sur response API externe

### Risque #2 — Tokens API perdus
Si `VERCEL_API_TOKEN` invalide → collectors plantent silencieusement. Mitigation :
- Health check chaque collector dans `/api/agence/ai/health` étendu
- Alerte si collector fail 2x consecutive

### Risque #3 — Over-alert fatigue
Trop de notifications Telegram → NB ignore. Mitigation :
- Seuils progressifs (pas alert par percentage point, juste 60/80/95)
- 1 alerte par seuil par jour max (déduplication)
- Résumé hebdo "toutes stacks OK" si aucun rouge

### Skills Claude Code préférentiels

- UM01-UM02 : Supabase MCP
- UM03-UM08 : `senior-backend` + `vercel:vercel-cli` + `vercel:vercel-functions`
- UM09-UM12 : `senior-frontend` + `vercel:shadcn` + `data:build-dashboard` + `data:data-visualization`
- UM13-UM14 : `senior-backend`
- UM15 : `operations:runbook` + `engineering:documentation`

# 04 — Ops (Déploiement, Monitoring, Coûts)

> **Phase 11** : mise en prod progressive, dashboards, alertes, runbooks.

---

## 1. Stratégie de déploiement

### 1.1 Feature flags progressive rollout

| Flag | Phase cible | Default | Promotion |
|------|-------------|---------|-----------|
| `AI_AGENT_YUMI_ENABLED` | 5 | `false` | Yumi uniquement dès tests manuels OK (Phase 10) |
| `AI_MULTI_PROVIDER_ROUTING` | 6 | `false` | Activation après 1 semaine stable Phase 5 |
| `AI_TRAINING_UI` | 7 | `false` | Activation après Phase 6 |
| `AI_CONVERSION_TRACKING` | 8 | `false` | Dès que UTM capture fonctionne |
| `AI_AGENT_PALOMA_ENABLED` | 9 | `false` | Après accord Paloma + test duplication |
| `AI_AGENT_RUBY_ENABLED` | 9 | `false` | Idem Paloma |
| `AI_GROK_PROVIDER` | 6 | `false` | Uniquement si NB valide provider NSFW |

### 1.2 Environnements

| Env | Branche | URL | Rôle |
|-----|---------|-----|------|
| Local dev | `main` via worktree | `localhost:3002` | Dev NB |
| Preview Vercel | PR branches | `heaven-os-git-*.vercel.app` | Review avant merge |
| Production | `main` | `heaven-os.vercel.app` | Live Yumi opère ici |

**Règle** : aucun déploiement prod direct. Toute phase = PR + review NB + merge.

### 1.3 Migrations DB

- Ordonnancement strict numérique (040, 041, 042, ...) via Supabase MCP
- Tester sur preview avant prod
- Rollback script par migration (DOWN)
- Backup automatique pré-migration critique

---

## 2. Monitoring

### 2.1 KPIs observés

| KPI | Source | Seuil alerte |
|-----|--------|--------------|
| Cost IA daily / model | `ai_runs` aggrégé | > 2 USD |
| Cost IA monthly total | idem | > 50 USD |
| Latency p95 agent | `ai_runs.latency_ms` | > 10s |
| Error rate worker | `ig_reply_queue.status='failed'` | > 5% / jour |
| Safety blocks / hour | `ai_runs.safety_blocked=true` | > 10 |
| Meta rate limit hits | `ops_metrics.meta_rate_limit_hit` | > 5 / h |
| AI leak flags (high sev) | `ai_runs.safety_flags` | > 1 (zéro tolérance) |
| Conversion rate 7j | `conversion_attribution` | chute >30% vs baseline |

### 2.2 Dashboards

- **`/agence/ops` (root only)** — tableau tech : coûts, latence, erreurs, top intents, safety
- **`/agence` dashboard Yumi** — tableau business : funnel conversion, revenu attribué, top convs
- **Telegram NB** — notifications critiques (cost cap, AI leak, Meta ban risk)

### 2.3 Logs centralisés

- Supabase logs pour API + worker (rétention 7j)
- Structured JSON (voir 03-TECH §8.1)
- Pas d'APM externe (Sentry / Datadog) en V1 — budget 0€ priorité

---

## 3. Coûts prévisionnels

### 3.1 Modèle de coût IA

**Hypothèses baseline** :
- Volume DM IG : 500 msg/jour entrants (pic Yumi)
- Ratio réponse agent : 90% → 450 réponses agent/jour
- Tokens moyens : 400 in + 50 out par réponse
- Provider : Claude Haiku 4.5 (1$/1M in, 5$/1M out)

**Coût/jour** :
- Input : 450 × 400 = 180K tokens × 1$/1M = **0.18 USD**
- Output : 450 × 50 = 22.5K tokens × 5$/1M = **0.11 USD**
- Total Haiku : **~0.29 USD/jour** = **8.70 USD/mois** (Yumi m1 seule)

**Si multi-modèle (m1+m2+m3 Phase 9)** :
- Assume ratio 60/20/20 (Yumi dominant) → ~15 USD/mois total
- Avec Sonnet sur 10% complex (Phase 6) : +5 USD/mois
- **Total cible : ~20 USD/mois (~18 EUR/mois)** ✅ largement sous budget 50€

### 3.2 Budgets flags cost cap

```ts
// Config budget cap par model et global
COST_CAP_USD_PER_DAY = { yumi: 2.0, paloma: 1.0, ruby: 1.0 }
COST_CAP_USD_PER_MONTH_GLOBAL = 50.0

// Actions si dépassement
onDailyCapReached(model): switch_provider_to_cheapest + alert NB
onMonthlyCapReached(): disable_all_agents + telegram + email NB
```

### 3.3 Infra ops (hors IA)

- Supabase : plan existant (0€ si Free tier suffit, sinon 25€/mois Pro)
- Vercel : Hobby (0€) — cron jobs limités daily, workaround existant
- Cloudinary : plan existant
- Telegram bot : 0€ (self-hosted via Bot API)

**Total ops fixes** : 0-25€/mois + 20€/mois IA = **20-45€/mois** = conforme règle `feedback_extreme_cost_optimization_2026`.

---

## 4. Runbooks

### 4.1 Agent IA répond n'importe quoi (qualité dégradée)

1. Check `/agence/ops` → latence normale ?
2. Check `ai_runs.safety_flags` dernières heures → AI leaks ?
3. Check `agent_personas.is_active` → bon prompt actif ?
4. Check `prompt_examples` → corruption / example mal formé ?
5. Si oui : rollback version précédente via UI Training
6. Si non : sandbox test du prompt actif → si fail, escalate NB

### 4.2 Coût IA dépasse cap

1. Telegram alert reçue → ouvrir `/agence/ops`
2. Identifier model concerné + provider
3. Vérifier pattern : pic trafic légitime ou spam attack ?
4. Si spam : activer rate-limit per-fan strict
5. Si légitime : vérifier switch provider fallback actif
6. En dernier recours : disable agent temporairement + investigate prompt (peut-être trop verbeux)

### 4.3 Worker IG offline

1. Check Vercel cron dashboard → dernière exécution ?
2. Check logs `/api/cron/process-ig-replies` → erreur ?
3. Check Meta token → expiré ?
4. Check Supabase → queue `ig_reply_queue.status='started'` stuck ?
5. Manual unstick : `UPDATE ig_reply_queue SET status='pending' WHERE status='started' AND started_at < NOW() - INTERVAL '10 min'`
6. Redeploy Vercel si besoin

### 4.4 Meta ban risque (bot detection)

**Signaux** :
- Erreurs 429 Meta > seuil
- Patterns réponses trop réguliers (détecté par Meta IA)

**Actions** :
1. Immédiat : désactiver agent Yumi `is_active=false`
2. Review derniers 100 messages sortants — trop similaires ?
3. Vérifier humanizer delay actif (2-8s random)
4. Augmenter variabilité prompt (temperature +0.1)
5. Reprendre prudemment, Yumi mode human 48h, puis agent ON par conv

### 4.5 AI leak détecté (fan a reçu "je suis une IA")

**🚨 CRITICAL** — zéro tolérance.

1. Immédiat : disable agent ce model_slug
2. Identifier `ai_run_id` impliqué
3. Récupérer conversation complète
4. Examiner prompt + provider + safety filter config
5. Renforcer guardrails
6. Compensation Yumi : message personnel fan ("désolé, problème technique")
7. Post-mortem : documenter dans `DECISIONS.md`
8. Réactiver uniquement après fix + tests

---

## 5. Checklist Go-Live (Phase 11)

### Pré-requis

- [ ] Toutes phases 1-10 terminées
- [ ] 50 scénarios QA validés NB
- [ ] Coûts estimés < budget confirmés
- [ ] Safety filters 100% green sur tests
- [ ] Rollback plan documenté
- [ ] Alertes Telegram actives
- [ ] Yumi briefed sur comment "prendre la main"

### Jour J

1. **T-1h** : dernier backup DB
2. **T-0** : feature flag `AI_AGENT_YUMI_ENABLED = true` via DB
3. **T+15min** : vérifier 1er message reçu → réponse agent OK
4. **T+1h** : check dashboards (aucune alerte, latence OK)
5. **T+24h** : review nuit, ~30 conversations attendues
6. **T+7j** : revue complète NB → Go/No-Go Phase 9 (Paloma/Ruby)

### Post-launch

- Semaine 1 : monitoring rapproché, Yumi override fréquent normal
- Semaine 2 : ajuster prompts basé sur feedback Yumi
- Semaine 4 : revue métrics business, décision Phase 9

---

## 6. Plan de rollback

Chaque phase a son rollback :

| Phase | Rollback | Temps |
|-------|----------|-------|
| 4 DB | `DOWN` migrations script + revert | 10 min |
| 5 Agent v1 | Feature flag OFF + redeploy canned responses | 5 min |
| 6 Multi-IA | Feature flag OFF (Haiku uniquement) | 5 min |
| 7 Training UI | Route hidden + prompt version rollback | 10 min |
| 8 Conversion | UTM capture peut rester, tracking OFF côté UI | 5 min |
| 9 Paloma/Ruby | Feature flag OFF par model | 5 min |

---

## 7. Documentation runtime

Documents à maintenir à jour :

- `CHANGELOG.md` module (ce dossier)
- `plans/CHANGELOG-PLANS.md` global
- `plans/_reports/UPDATE-REPORT-YYYY-MM-DD-HHMM.md` par deploy majeur
- `DECISIONS.md` ADRs
- `/agence/architecture` (root only) — visualisation live du schéma

---

## 8. Maintenance long terme

### 8.1 Revues régulières

- **Hebdo** : NB check ops dashboard, coûts, qualité échantillon
- **Mensuel** : Yumi feedback sur réponses, ajustements prompts
- **Trimestriel** : bilan KPIs business, décision scaling (caming, autres modèles, autres canaux)

### 8.2 Évolutions prévues (backlog)

- **V2** : voice messages IA (TTS)
- **V2** : support Snapchat + MYM + TikTok DMs
- **V2** : agent pro-actif (envoie follow-up après X jours silence)
- **V3** : génération contenu IA (images teasers)
- **V3** : intégration Fanvue API native (si Fanvue ouvre API)

---

## 9. Prochain fichier

→ [DECISIONS.md](./DECISIONS.md) — ADRs architecturales
→ [CHANGELOG.md](./CHANGELOG.md) — historique module

# 05 — Scaling & Stack Providers (réactualisé après research)

> **Phase 0 research** : ManyChat patterns + IA providers 2026 + lead scoring intégrés.
> **Changements majeurs vs doc initiale** : stack IA recommandée = **Groq Llama 3.3 70B default + Grok 4.1 Fast NSFW-tolerant + Claude Haiku long context** au lieu de "Haiku seul".

---

## 1. Stack IA V1 recommandée (MVP Phase 5)

### 1.1 Matrice décision providers

| Rôle | Provider | Modèle | Coût 1M in/out | Latence | Raison |
|------|----------|--------|----------------|---------|--------|
| **Default (80%)** | Groq | Llama 3.3 70B | $0.59 / $0.99 | ~400ms + 1665 t/s | Ultra-rapide, flirt naturel, Meta-origin model, free tier généreux |
| **NSFW edge (10%)** | xAI | Grok 4.1 Fast | $0.20 / $0.50 | ~700ms | Seul frontier qui tolère flirt suggestif, le moins cher |
| **Complex/long ctx (5%)** | Anthropic | Claude Haiku 4.5 | $1.00 / $5.00 | ~600ms | 200K ctx, intelligence complex intents, via OpenRouter |
| **FR premium fallback (5%)** | Mistral | Large 3 | $2.00 / $6.00 | <1s | FR natif nuancé, free tier 1B tokens/mois (limitant prod) |

**Fallback chain** : `Groq → Grok → Haiku → Mistral` (si erreur/rate limit/safety bloc cascade).

**Provider d'accès** : **OpenRouter** (déjà intégré via `lib/openrouter.ts`) OU client direct par provider pour éviter +5.5% markup. Décision ADR-013 → OpenRouter d'abord (simplicité), migration direct V2 si coût significatif.

### 1.2 ❌ Abandonner (raison entre parenthèses)

- **DeepSeek V3** : censure chinoise pre-trained trop stricte même pour flirt léger
- **Qwen 3** : idem + 70% coût caché (verbosité reasoning)
- **OpenAI GPT-5** : trop cher sur flirt simple, modération stricte sans gain vs Claude
- **Gemini 2.5** : modération stricte Google, pas de free tier viable avril 2026

### 1.3 ⚠️ Grok free tier — précision

- Pas de tier gratuit production (contrairement à ce que suppose NB)
- $25 crédits promo signup → ~50M tokens Grok 4.1 Fast = **1-2 mois runway** à 15k msg/mois
- **Programme data-sharing $150/mois crédits en échange prompts → REFUSÉ** (confidentialité Heaven absolue)
- Prix réel Grok = **2.5× moins cher que Haiku**, recommandé comme fallback NSFW

---

## 2. Coûts scaling — 3 volumes cibles

### 2.1 Phase MVP — 500 msg/jour (15k msg/mois — actuel Yumi)

| Stack | Input | Output | Total/mois |
|-------|-------|--------|-----------|
| 100% Groq Llama 3.3 | 12M × $0.59 | 3M × $0.99 | **~9€/mois** |
| Stack mixte recommandée | — | — | **~12€/mois** |
| 100% Claude Haiku (old plan) | 12M × $1 | 3M × $5 | ~25€/mois |

✅ Budget 50€/mois **largement tenu**. Marge ×4 pour expérimentations.

### 2.2 Phase Growth — 5k msg/jour (150k msg/mois — cible 50k fans)

| Stack | Total/mois |
|-------|-----------|
| 100% Groq Llama 3.3 | ~93€/mois |
| Stack mixte recommandée | ~121€/mois |
| 100% Claude Haiku | ~250€/mois |

⚠️ Budget 50€ **dépassé dès 8k msg/jour** même sur stack la moins chère. Décisions à prendre :
- Augmenter cap budget (100€/mois acceptable ?)
- Optimiser prompt (réduire input avec rolling summary + RAG)
- Point bascule self-host (voir §3)

### 2.3 Phase Viral — 50k msg/jour (1.5M msg/mois — pic post-viral IG)

- API only : **~1200-2500€/mois** prohibitif
- **Self-host obligatoire** ou rate-limit strict par fan

---

## 3. Self-host — point de bascule

### 3.1 Break-even

D'après benchmarks 2026 :
- API → self-host rentable **>300-500M tokens/mois**
- À 150k msg/mois × 1k tokens = 150M tokens/mois → **pas encore rentable** (marge ingénieur non compensée)
- À 500k msg/mois = 500M tokens/mois → self-host **rentable**

### 3.2 Options self-host (quand on y arrivera, V2+)

| Option | Coût/mois | Complexité |
|--------|-----------|------------|
| **Hetzner GPU (RTX 4090 dédié)** | ~300€/mois | Moyenne (Docker + vLLM) |
| **RunPod Serverless GPU** | ~200-500€/mois selon trafic | Faible (API compatible) |
| **Together.ai hosted Llama 3.3** | $0.59/$0.79 × volume | Nulle (API déjà) |
| **AWS Bedrock Llama** | ~$0.78/$0.80 × volume | Moyenne (infra AWS) |

**Recommandation** : attendre **seuil 300k msg/mois confirmé 2 mois d'affilée** avant self-host.

---

## 4. Stack infra scaling (DB + cache + workers)

### 4.1 Niveau actuel (Yumi 500-1000 msg/jour)

- Supabase **Free** tier (500MB DB, 2GB bandwidth) — suffisant
- Vercel **Hobby** (limite crons daily, workaround cron agrégé)
- Cloudinary plan existing
- **Total infra** : 0€/mois

### 4.2 Niveau Growth (5k msg/jour, 5k fans actifs)

- Supabase **Pro** 25€/mois (8GB DB, 250GB bandwidth, pgvector, read replicas)
- Vercel **Hobby** encore OK (cron-agg pattern)
- **Upstash Redis Free** 10k commandes/jour (cache context + rate limit per fan) — 0€
- **Total infra** : 25€/mois

### 4.3 Niveau Scale (50k msg/jour, 50k+ fans)

- Supabase **Pro** ou **Team** 60€/mois (point-in-time recovery, 100GB DB)
- Vercel **Pro** 20€/mois (cron minutes, edge functions plus rapides)
- Upstash Redis **Pay-as-you-go** ~10€/mois
- **Queue dédiée** : Inngest (free 50k/mois) ou BullMQ self-host
- Monitoring : Supabase logs + Telegram alertes (0€)
- **Total infra** : ~90€/mois

### 4.4 Niveau Viral (100k+ msg/jour)

- Managed Postgres avec read replicas (Supabase Team 600€/mois ou Neon Scale 150€/mois)
- Self-host agent IA sur Hetzner dédié 300€/mois
- CDN + edge (déjà Vercel)
- APM (Sentry ou équivalent) 50€/mois
- **Total infra + IA** : ~600-900€/mois — seulement si viable business

---

## 5. Rate limits & backpressure

### 5.1 Meta Graph API (hard limits)

- **200 DMs/heure/compte** (cap rigide depuis oct 2025)
- **1 message auto/user/24h** via triggers comment/story
- **Fenêtre 24h** : plus de DM si fan pas interagi depuis 24h
- **Token long-lived** : refresh tous les 60j (cron existing)

### 5.2 Stratégie backpressure

```
flux entrant > capacité traitement
  ↓
[Queue Supabase ig_reply_queue]
  ↓
claim_ig_reply_jobs (FOR UPDATE SKIP LOCKED) → worker
  ↓
si > 150/h Meta calls atteints → requeue_rate_limit + backoff
si > 180/h → ALERT + pause worker 30min
si budget IA/jour > cap → switch provider cheapest OU canned fallback
```

### 5.3 Rate limit per fan

Nouvelle table `fan_rate_limits` :
```sql
CREATE TABLE fan_rate_limits (
  fan_id UUID PRIMARY KEY,
  msg_count_1h INT DEFAULT 0,
  msg_count_24h INT DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  last_reset TIMESTAMPTZ DEFAULT NOW()
);
```

Règles :
- Max **10 msg/h/fan** côté inbound traitement (ignore au-delà)
- Max **20 réponses agent/jour/fan** (pour éviter spam perçu)
- **Mode conservation** (fan score troll) : 1 réponse canned /24h

---

## 6. Decision matrix — quel provider quand ?

Workflow routing au runtime (code `src/shared/lib/ai-agent/provider-router.ts`) :

```
[1] Intent classifier → {intent, confidence, nsfw_edge}

[2] Si confidence < 0.6 → fallback humain (pas agent)

[3] Si nsfw_edge = true → Grok 4.1 Fast
    (sinon Grok serait gaspillage = flirt soft suffit pour default)

[4] Si intent = "complex_commercial" OU history_tokens > 4000 → Claude Haiku 4.5

[5] Si langue = "fr" ET premium_customer → Mistral Large 3

[6] DEFAULT → Groq Llama 3.3 70B

[7] Si budget_today > cap → downshift (Groq → Grok cheap → canned)
```

### 6.1 Intent detection — rules puis LLM

Rules d'abord (regex FR + EN) — 80% cas couverts gratuits :

```ts
const INTENT_RULES = {
  greeting: /\b(hey|salut|bonjour|hi|hello|coucou|yo)\b/i,
  price_question: /\b(prix|combien|cost|cher|abo|subscribe|subscription)\b/i,
  explicit_request: /\b(nude|photo explicite|montre|send nudes|cul|bite|sexe)\b/i,
  fanvue_curious: /\b(fanvue|exclusif|VIP|content)\b/i,
  harassment: /\b(insulte|bitch|whore|connard|pute)\b/i,
  troll_leech: /\b(gratuit|free|crack|leak|telegram)\b/i,
};
```

Si aucun match rule → LLM classifier (Haiku cheap, 200 tokens max) returns JSON :
```json
{
  "intent": "small_talk_entry",
  "confidence": 0.92,
  "nsfw_inbound": false,
  "language": "fr"
}
```

---

## 7. Lead scoring — impact scaling

Voir [06-LEAD-SCORING.md](./06-LEAD-SCORING.md) pour détail complet.

Points clés scaling :
- **Scoring chaque message** = cheap si rules-based (80% cas) + LLM classifier cheap pour le reste
- **Decay quotidien** cron Supabase (zero coût)
- **Re-bucketing** auto à chaque update score
- **Priorité worker** : traiter HOT en premier (priority queue), WARM ensuite, COLD en batch, TROLL ignorer

Impact scaling :
- À 50k fans → 50k rows `fan_scores` → RIEN (Postgres gère millions de rows)
- Query par bucket + score ordonné = index dédié
- Dashboard funnel = vue matérialisée rafraîchie 5min

---

## 8. Phases scaling chronologiques

### 8.1 Phase α (Yumi seule, 0-5k fans) — 1-3 mois post-launch

- Stack MVP : Groq + Grok + Haiku fallback
- Infra : Supabase Free + Vercel Hobby
- Coût total : ~12€/mois IA + 0€ infra = **12€/mois**

### 8.2 Phase β (Yumi validée + Paloma/Ruby activés, 5-20k fans) — 3-6 mois

- Stack identique + optimisations prompts (rolling summary, context cache)
- Infra : Supabase Pro + Upstash Redis free
- Coût : ~30-40€/mois IA + 25€ infra = **55-65€/mois**

### 8.3 Phase γ (pub IG viral, 20-50k fans, 5k msg/jour) — 6-12 mois

- Stack + Agrégat Mistral pour FR premium
- Rate limiting strict per fan
- Infra : Supabase Pro + Vercel Pro + queue dédiée Inngest
- Coût : ~120€/mois IA + 45€ infra = **165€/mois**
- **Review ROI** : >200€ revenus attribués/mois sinon down-size

### 8.4 Phase δ (scale viral, 100k+ fans, auto-host GPU) — 12-24 mois

- Self-host Llama 3.3 70B sur Hetzner GPU
- Claude Haiku conservé pour complex only
- Grok conservé pour NSFW edge
- Infra enterprise-grade (replicas, APM, alerting)
- Coût : ~600-900€/mois
- **Review quarterly** : seulement si business le justifie (>5k€/mois revenus)

---

## 9. Monitoring coûts temps réel

### 9.1 Dashboard root-only `/agence/ops/ai-cost`

- Coût agrégé par provider (jour / semaine / mois)
- Coût par model_slug (yumi / paloma / ruby)
- Tokens in/out distribution
- Top 10 conversations les plus chères (alerter si anomalies)
- Projection budget fin mois

### 9.2 Alertes Telegram NB

- Coût/jour > 2€ par model → alerte info
- Coût/jour > 5€ par model → alerte critique + switch provider cheapest
- Coût/mois > 80% budget → alerte critique
- Erreur rate > 5% worker → alerte
- Safety leak detected (high sev) → alerte critique immédiate

---

## 10. Prochaine phase

Une fois validé scaling → **Phase 1 cadrage Phase-specific**.

Voir aussi :
- [06-LEAD-SCORING.md](./06-LEAD-SCORING.md) — scoring leads détaillé
- [07-MULTI-AGENT-ORCHESTRATION.md](./07-MULTI-AGENT-ORCHESTRATION.md) — workflow dev multi-agents
- [08-CONTEXT-PERSISTENCE.md](./08-CONTEXT-PERSISTENCE.md) — context commun cross-provider

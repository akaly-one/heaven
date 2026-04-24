# 06 — Lead Scoring & Qualification (inspiré ManyChat + Substy + adapté Fanvue)

> Système de scoring temps réel par fan, 5 buckets, actions différenciées par ton agent. Basé sur research ManyChat / Substy / FAINT+BANT hybride (frameworks B2B adaptés B2C créateur).

---

## 1. Pourquoi scorer ?

Objectif : **focaliser énergie + budget IA sur les leads convertissables**. Plutôt que répondre uniformément à 500 msg/jour, l'agent :

- ⚡ **HOT leads** → réponse rapide + CTA direct Fanvue + priorité humain si >1h sans conversion
- 💬 **WARM leads** → nurturing soft, teasing, qualification douce
- 👂 **COLD leads** → small talk découverte, pas de push
- 🚫 **TROLL/SPAM** → canned response ou silence (économise coût IA)
- 💎 **EXISTING subs** → upsell PPV, anti-churn

Impact business : +30-40% conversion en focalisant efforts (benchmark ManyChat + Substy).

---

## 2. Framework adopté : FAINT + signaux sociaux

### 2.1 Frameworks classiques évalués

| Framework | Appliqué à fan DM ? |
|-----------|---------------------|
| BANT | ⚠️ Partiel (Budget + Timing OK, Authority inutile, Need OK) |
| MEDDIC | ❌ Trop enterprise, cycle décision long |
| CHAMP | ❌ Conçu B2B comité d'achat |
| **FAINT** | ✅ **Meilleur fit** — Funds + Interest + Need + Timing adaptés |

### 2.2 Adaptation FAINT → Fan DM

- **F**unds → capacité payer (déduite pays, bio, pattern écriture)
- **A**uthority → le fan est seul décideur ✅
- **I**nterest → mesurable via engagement + intent keywords
- **N**eed → signaux d'envie ("montre-moi plus", "j'adore")
- **T**iming → récence + urgence perçue (mots "maintenant", "ce soir")

---

## 3. Algorithme scoring composite

### 3.1 Formule finale

```
score = min(100, max(0,
  engagement_score * 0.40  +
  intent_score * 0.35      +
  value_score * 0.15       +
  rfm_score * 0.10
))
```

### 3.2 Sous-scores détaillés

#### A. Engagement (40%, max 40 pts)
| Signal | Pts |
|--------|-----|
| 1er message | +3 |
| Conversation >5 messages | +10 |
| Conversation >10 messages | +15 |
| Temps cumulé >10 min (first→last msg) | +5 |
| Réponse <5min au dernier msg agent | +5 |
| Réponse <1h | +2 |
| Reciprocity ratio (bot:fan ≈ 1:1) | +5 |
| Like IG posts récents | +3 par post |
| Story viewer répété | +2 |

#### B. Intent direct (35%, max 35 pts)
Rules regex FR + EN (pondérées) :

```ts
const INTENT_KEYWORDS = {
  // STRONG BUY — +15 pts
  strong_buy: /\b(prix|combien|cost|abo|subscribe|subscription|fanvue|exclusif|VIP|PPV|trial|discount|custom|how much)\b/i,
  // BUY CURIOUS — +8 pts
  buy_curious: /\b(plus|more|privé|private|montrer|send|photos? cachées?|exclusive content)\b/i,
  // PASSIVE FLIRT — +3 pts
  passive_flirt: /\b(belle|beautiful|hot|sexy|amour|love you|😍|❤️|🔥)/i,
  // RED FLAG — -15 pts
  red_flag: /\b(gratuit|free|crack|leaked|telegram|wickr|send nudes|sans payer)\b/i,
  // TROLL — -25 pts (si 3x → lock bucket troll)
  troll: /\b(pute|whore|bitch|connard|fuck you|catfish|bot\??|es-tu réelle\??|are you real)\b/i,
};
```

Chaque match contribue au score (max 35 cumulé, cap).

#### C. Valeur perçue / Funds (15%, max 15 pts)
| Signal | Pts |
|--------|-----|
| Pays tier 1 (US/UK/CA/AU/DE/FR/CH) | +10 |
| Pays tier 2 (UE/JP/KR) | +5 |
| Bio IG non-vide + cohérente | +3 |
| Compte IG >6 mois | +2 |
| Followers réels >50 | +2 |
| Handle pas "spam_pattern" | +3 |
| Indice job/profession bio | +5 |

#### D. RFM (Recency/Frequency/Monetary) (10%, max 10 pts)
| Signal | Pts |
|--------|-----|
| Dernière interaction <24h | +3 |
| Dernière interaction 1-7j | +2 |
| >3 conversations/semaine | +2 |
| A déjà acheté PPV passé | +5 |
| Total spent >50€ | +10 (cap) |
| Total spent >200€ | +15 (override → auto-EXISTING) |

### 3.3 Décroissance (Decay)

Cron quotidien Supabase :

```sql
UPDATE fan_scores
SET score = GREATEST(0, score - CASE
  WHEN last_message_at < NOW() - INTERVAL '30 days' THEN 15
  WHEN last_message_at < NOW() - INTERVAL '14 days' THEN 8
  WHEN last_message_at < NOW() - INTERVAL '7 days' THEN 3
  ELSE 0
END)
WHERE bucket NOT IN ('existing', 'troll');
```

### 3.4 Bucketing automatique

```sql
UPDATE fan_scores
SET bucket = CASE
  WHEN red_flag_count >= 3 OR troll_triggered THEN 'troll'
  WHEN rfm_monetary > 200 OR is_active_subscriber THEN 'existing'
  WHEN score >= 80 THEN 'hot'
  WHEN score >= 50 THEN 'warm'
  WHEN score >= 20 THEN 'cold'
  ELSE 'junk'
END;
```

### 3.5 Transitions particulières

- **HOT → WARM** : si 48h sans conversion Fanvue (urgence expirée)
- **WARM → HOT** : si intent keyword strong détecté
- **COLD → WARM** : si 3 messages consécutifs engagement positif
- **TROLL** : lock 30j, puis re-évaluation possible
- **EXISTING** : flag persistant tant que fan abonné Fanvue actif
- **EXISTING → CHURN_RISK** : si Recency > 30j ET was_active_previous_month

---

## 4. Schéma DB

### 4.1 Table `fan_scores`

```sql
CREATE TABLE fan_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id                UUID NOT NULL REFERENCES agence_fans(id) ON DELETE CASCADE,
  model_slug            TEXT NOT NULL,
  score                 SMALLINT DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  bucket                TEXT NOT NULL CHECK (bucket IN ('hot','warm','cold','junk','troll','existing','churn_risk')),

  -- Sous-scores composants
  engagement_score      SMALLINT DEFAULT 0,
  intent_score          SMALLINT DEFAULT 0,
  value_score           SMALLINT DEFAULT 0,
  rfm_score             SMALLINT DEFAULT 0,

  -- RFM raw
  rfm_recency_days      INT,
  rfm_frequency_7d      INT DEFAULT 0,
  rfm_monetary_total    NUMERIC(10,2) DEFAULT 0,

  -- Flags
  red_flag_count        INT DEFAULT 0,
  troll_triggered       BOOLEAN DEFAULT FALSE,
  is_active_subscriber  BOOLEAN DEFAULT FALSE,
  churn_risk_flagged_at TIMESTAMPTZ,

  -- Signaux extraits
  extracted_signals     JSONB DEFAULT '{}'::jsonb,   -- {country, language, job_hint, age_hint}
  intent_tags           TEXT[] DEFAULT '{}',

  -- Meta
  first_seen_at         TIMESTAMPTZ DEFAULT NOW(),
  last_message_at       TIMESTAMPTZ,
  last_scored_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fan_id, model_slug)
);

CREATE INDEX idx_fan_scores_bucket ON fan_scores(model_slug, bucket, score DESC);
CREATE INDEX idx_fan_scores_hot ON fan_scores(model_slug, score DESC) WHERE bucket = 'hot';
CREATE INDEX idx_fan_scores_churn ON fan_scores(model_slug) WHERE bucket = 'churn_risk';
```

### 4.2 Table audit `fan_score_events`

```sql
CREATE TABLE fan_score_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id          UUID NOT NULL,
  model_slug      TEXT NOT NULL,
  delta           SMALLINT,                     -- ±points
  trigger         TEXT,                         -- 'inbound_msg', 'intent_keyword', 'conversion', 'decay'
  intent_matched  TEXT,                         -- 'strong_buy', 'red_flag'
  old_bucket      TEXT,
  new_bucket      TEXT,
  details         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fan_score_events_fan ON fan_score_events(fan_id, created_at DESC);
```

### 4.3 RLS

- Read scope model (yumi voit m1 seulement, etc.)
- Write système (service role via worker)

---

## 5. Classifier LLM (intent + extracted signals)

### 5.1 Fallback si rules ne matchent pas

Appel Haiku cheap (max 200 tokens output) :

```
System:
Tu es un classifier de messages fan pour créatrice de contenu adulte.
Analyse le message et historique, retourne JSON strict.

User:
Message courant: "{{input_text}}"
Historique 3 derniers: {{history}}
Bio fan (si connue): {{fan_bio}}

Réponds JSON:
{
  "intent": "greeting|small_talk|price_question|explicit_request|compliment|complaint|goodbye|unclear",
  "confidence": 0.0-1.0,
  "nsfw_inbound": true|false,
  "harassment": true|false,
  "engagement_delta": -10 to +10,
  "language": "fr|en|es|...",
  "extracted_signals": {
    "country_hint": null | "US" | etc,
    "job_hint": null | string,
    "age_hint": null | "18-25" | "25-35" | "35+",
    "buying_signals": []
  }
}
```

Coût estimé : ~0.0003€ par classification → 500/jour = 0.15€/jour → 4.50€/mois. Négligeable.

### 5.2 Intégration worker

```ts
// src/shared/lib/ai-agent/classifier.ts
export async function classifyMessage(input: string, history: Message[], fanBio?: string) {
  // 1. Rules regex (80% cas)
  const ruleMatch = matchIntentRules(input);
  if (ruleMatch.confidence > 0.85) return ruleMatch;

  // 2. LLM fallback Haiku
  const llmResult = await callHaiku({
    system: CLASSIFIER_PROMPT,
    user: buildClassifierInput(input, history, fanBio),
    maxTokens: 200,
    temperature: 0.1,
    responseFormat: 'json'
  });

  return parseClassification(llmResult);
}
```

---

## 6. Actions par bucket (injection dans prompt agent)

### 6.1 System prompt augmenté

Pour chaque génération de réponse agent, inject contexte scoring :

```
[System prompt Yumi existant]
...

== CONTEXTE FAN COURANT ==
- Bucket: {{bucket}}
- Score: {{score}}/100
- Temps depuis 1er contact: {{days_since_first_contact}}j
- Total messages échangés: {{message_count}}
- Intent tags: {{intent_tags}}
- Signaux extraits: {{extracted_signals}}
- Déjà abonné Fanvue: {{is_active_subscriber}}
- Historique dépense: {{rfm_monetary_total}}€

== STRATÉGIE POUR CE FAN ==
{{#if bucket == 'hot'}}
  Ce fan est HOT — prêt à convertir. Confiance, intimité, propose lien Fanvue naturellement.
  Évite "tu veux t'abonner?" direct. Préfère "Tu veux voir mes derniers contenus exclus? Viens par là 💜"
{{/if}}
{{#if bucket == 'warm'}}
  Ce fan est WARM — intérêt confirmé, besoin nurturing. Tease, qualifie, fais-lui sentir l'exclusivité.
  Pose question ouverte pour l'impliquer ("qu'est-ce qui t'attire le plus dans ce que tu vois?")
{{/if}}
{{#if bucket == 'cold'}}
  Ce fan est COLD — curieux, low intent. Small talk, découverte.
  "D'où tu me suis?" "Tu viens d'où?" Crée connexion douce avant push commercial.
{{/if}}
{{#if bucket == 'troll'}}
  Ce fan est TROLL — réponse minimale canned, ne pas engager.
  Exemple: "Merci pour ton message 💜" puis stop.
{{/if}}
{{#if bucket == 'existing'}}
  Ce fan est ABONNÉ ACTIF — upsell PPV, fidélité, check-in émotionnel.
  "Tu as vu mon dernier PPV ? J'ai pensé à toi 😘"
{{/if}}
{{#if bucket == 'churn_risk'}}
  Ce fan était abonné mais silence récent — reconnaissance + offre retour.
  "Hey ça faisait longtemps! Tu m'as manqué 💔 J'ai du nouveau content à te montrer..."
{{/if}}
```

### 6.2 Suggestions quick replies UI

Dans UI cockpit Yumi, pour chaque conversation :
- Affiche bucket + score
- 3-4 quick reply templates adaptés au bucket
- Yumi peut cliquer pour envoyer rapidement ou éditer

Exemple quick replies bucket=HOT :
- "Viens voir mes derniers contenus exclus 💜 [Fanvue link]"
- "J'ai une offre limitée pour toi ce soir 🔥"
- "Tu mérites une attention particulière 💋"

---

## 7. Tri & priorisation worker

### 7.1 Queue priorité

Worker `process-ig-replies` claim jobs par priorité :

```sql
-- Modif RPC claim_ig_reply_jobs(p_limit)
-- Join fan_scores + order by bucket priority + score DESC
SELECT * FROM ig_reply_queue q
JOIN fan_scores s ON s.fan_id = q.fan_id
WHERE q.status = 'pending'
ORDER BY
  CASE s.bucket
    WHEN 'hot' THEN 1
    WHEN 'existing' THEN 2
    WHEN 'warm' THEN 3
    WHEN 'cold' THEN 4
    WHEN 'troll' THEN 5
  END,
  s.score DESC,
  q.created_at ASC
LIMIT p_limit
FOR UPDATE SKIP LOCKED;
```

### 7.2 Résultat

- HOT leads traités en premier (latence <5s)
- EXISTING en priorité haute (anti-churn)
- TROLL traités en dernier (ou ignorés)
- Réduction coût IA global (TROLL = réponse canned, pas d'appel IA)

---

## 8. Dashboard funnel (`/agence/ops/funnel` + `/agence/messagerie`)

### 8.1 KPIs

- Distribution fans par bucket (tarte)
- Évolution buckets 7j/30j (trend)
- Taux conversion par bucket (HOT→conv %, WARM→HOT %)
- Revenus attribués par bucket
- Top 10 HOT leads (list avec last msg + CTA "répondre maintenant")

### 8.2 Alertes Yumi

- "5 HOT leads sans conversion depuis >1h" → push notification
- "Churn risk détecté : @fan123 (abonné 3 mois, silencieux 20j)" → suggest message
- "Troll attack détecté : 12 msg spam en 1h d'IPs similaires" → auto-blacklist

---

## 9. Fairness & éthique

Règles absolues :
- ❌ Jamais catégoriser sur race, religion, orientation sexuelle
- ❌ Jamais scoring explicite basé "apparence physique" fan
- ✅ Scoring uniquement comportemental + intent déclaré
- ✅ Bucket visible côté admin (Yumi), invisible côté fan
- ✅ Droit oubli RGPD : delete fan_scores + events via endpoint existant

---

## 10. Évolutions V2+ (backlog)

- ML-based scoring quand >500 fans + 3 mois data (Supabase pg_ml ou export SciKit)
- Prédiction LTV par fan (Lifetime Value)
- Clustering fans similaires (K-means sur engagement patterns)
- Auto-adjust weights via A/B test
- Cross-model scoring (un fan qui suit Yumi + Paloma = signal différent)

---

## 11. Prochaine phase

Implémentation côté code dans **Phase 5 (Agent IA v1)** — scoring intégré au worker dès V1.
Voir [05-SCALING.md](./05-SCALING.md) pour priorisation queue scaling.
Voir [07-MULTI-AGENT-ORCHESTRATION.md](./07-MULTI-AGENT-ORCHESTRATION.md) pour dispatch dev.

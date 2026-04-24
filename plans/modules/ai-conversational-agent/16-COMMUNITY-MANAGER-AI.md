# 16 — Community Manager IA (Phase V3 backlog)

> **Statut** : plan V3 long terme.
> **Objectif** : un agent IA community manager qui détecte trends en temps réel, propose idées contenu, optimise le calendrier éditorial, tracke performance. Nourrit le pipeline de génération (doc 15).

---

## 1. Vision

Un community manager (CM) IA qui pense 24/7 :
- *"Quel est le trend TikTok qui monte cette semaine ?"*
- *"Quel sound est en train d'exploser dans la niche creator ?"*
- *"Yumi devrait-elle poster tôt matin ou soir cette semaine ?"*
- *"Ce scénario a moins performé que prévu — pourquoi ?"*
- *"Les concurrentes top-creator font X — on peut s'en inspirer ?"*

→ Réduit charge mentale Yumi, maximise ROI temps investi.

---

## 2. Composants

### 2.1 Trends Detection Engine

**Sources surveillées** :
- **TikTok Creative Center** (API non officielle, scraping légal)
- **IG Creator Insights** (via Graph API compte business)
- **X/Twitter trending hashtags**
- **Google Trends** (terms, régions)
- **Exploding Topics** (trending niches)
- **Reddit niches** (r/OnlyFansAdvice, r/Fanvue communities)
- **Competitor tracking** : monitoring 20 top-creators de même niche

**Signaux extraits** :
- Hashtags émergents (vélocité)
- Sounds TikTok viral (usage rate)
- Challenges (participation rate)
- Topics conversation Reddit (upvotes)
- Patterns concurrents (timing posts, formats)

### 2.2 Content Idea Generator

À partir des trends + identity Yumi + storyline, génère idées :

```
Trend détecté : "soft launch" sound TikTok (+340% cette semaine)
Identity Yumi : lifestyle sexy motivant, style parisien chic
Storyline current : Yumi à Paris, planifie weekend Ibiza J+7

→ Idées générées :
1. 🎥 "Soft launch of my Paris apartment" → tour appartement sexy casual
2. 🎥 "Soft launch my summer body prep" → workout montage
3. 🎥 "Soft launch getaway" → teaser Ibiza avant départ
```

Chaque idée → genere :
- Scénario draft (doc 15)
- Caption suggérée + hashtags
- Timing optimal publication
- Estimated performance (basé historique Yumi)

### 2.3 Editorial Calendar

Dashboard Notion-like intégré `/agence/agent-cm/calendar` :

```
┌─ Semaine 17 oct - 23 oct 2026 ─────────────────────────────────┐
│                                                                 │
│  Lun 17   Mar 18   Mer 19   Jeu 20   Ven 21   Sam 22   Dim 23  │
│                                                                 │
│  🎥 Reel  📸 Post  🎥 Reel  📸 Post  🎥 Reel  📸 PPV   💤 Rest │
│  Morning  Lingerie Fitness  Travel  TikTok   Fanvue           │
│  cozy     red      workout  Ibiza   sound    photoset         │
│  9:00 AM  12:00    18:00    19:00   20:30    20:00            │
│  LIVE     LIVE     PLANNED  PLANNED DRAFT    READY            │
│                                                                 │
│  [+ Ajouter] [Auto-suggest next week] [Timing analysis]       │
└─────────────────────────────────────────────────────────────────┘
```

**Features** :
- Drag & drop contenus
- Auto-suggest (propose emplacements vides)
- Timing optimal par plateforme (analyse heures engagement fan Yumi)
- Conflicts detection (trop de contenu même jour, pas de variety)
- Balance : IG 60% / TikTok 20% / Fanvue 20% (configurable)

### 2.4 Competitor Benchmarking

```
Cockpit YumiCM → onglet Concurrents

Top 10 créatrices même niche suivies :
- @lucy.mod (850k) : 12 posts/semaine, best = 14:00 + 20:00
- @sarah.creator (420k) : 8 posts/semaine, best = 10:00 + 19:00
- ...

Pour chaque concurrente :
- Stats moyennes engagement
- Top 3 posts mois dernier
- Formats qui performent pour elle
- Opportunités (formats elle fait pas)
```

Yumi peut "étudier" mais JAMAIS copier — CM propose patterns abstraits.

### 2.5 Performance Analyzer

Post-publication, CM tracke :
- Reach / impressions
- Engagement rate
- Click-through vers Fanvue (via UTM)
- Conversion attribuée
- Watch time (Reels / TikTok)

Compare predicted vs actual → ajuste modèle pour futurs posts.

---

## 3. Architecture technique

### 3.1 Workers

```
[1] Trend Scraper Worker (toutes les 2h)
    → Fetch TikTok Creative Center + IG trending + Reddit + Google Trends
    → Normaliser en "trend events"
    → Insert trends table

[2] Competitor Monitor (daily)
    → Scrape (via Apify ou SocialBlade API) comptes concurrents
    → Track new posts, engagement
    → Alert si post viral (>10x baseline)

[3] Idea Generator (on-demand ou daily batch)
    → LLM (Claude Sonnet) reçoit : trends + identity Yumi + storyline + calendar gaps
    → Génère 5-10 idées structurées
    → Insert dans idea_backlog

[4] Performance Tracker (hourly pour recent posts, daily older)
    → Fetch IG Insights + TikTok Insights
    → Update performance_metrics

[5] Calendar Optimizer (weekly + on demand)
    → Analyse gaps calendar
    → Suggère emplacements + contenus
    → Validate storyline + identity cohérence
```

### 3.2 Nouvelles tables

```sql
-- Trends détectés
CREATE TABLE trend_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT,                      -- 'tiktok','instagram','google','reddit','x'
  trend_type TEXT,                    -- 'hashtag','sound','challenge','topic','format'
  label TEXT,                         -- "soft launch aesthetic"
  velocity NUMERIC(5,2),              -- % croissance 7j
  volume INT,                         -- posts ou occurrences
  niche_relevance NUMERIC(3,2),       -- 0-1 score pertinence niche Yumi
  demographics JSONB,                 -- audience data si disponible
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  source_data JSONB
);

-- Idées de contenu
CREATE TABLE content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  title TEXT,
  description TEXT,
  platform_target TEXT,
  idea_source TEXT,                   -- 'trend_driven','storyline_gap','competitor_inspired','fan_request'
  trigger_trend_id UUID REFERENCES trend_signals(id),
  storyline_event_id UUID,
  suggested_publish_at TIMESTAMPTZ,
  estimated_performance JSONB,        -- {views: 40000, engagement_rate: 6.5, conv_rate: 12}
  status TEXT CHECK (status IN ('pending','approved','rejected','in_production','published','archived')),
  scenario_id UUID REFERENCES content_scenarios(id),  -- link vers doc 15 si promu en scenario
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

-- Competitors tracking
CREATE TABLE tracked_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  handle TEXT NOT NULL,
  platform TEXT,
  niche TEXT,
  follower_count INT,
  avg_engagement_rate NUMERIC(4,2),
  posting_frequency INT,              -- posts/semaine
  best_timing JSONB,                  -- {mon: ["14:00","20:00"], ...}
  top_formats TEXT[],                 -- ['reels_lifestyle','photoset_lingerie']
  last_analyzed_at TIMESTAMPTZ,
  UNIQUE (handle, platform)
);

-- Competitor posts tracking
CREATE TABLE competitor_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES tracked_competitors(id),
  platform_post_id TEXT,
  post_url TEXT,
  content_type TEXT,                  -- 'reel','photoset','story','post'
  posted_at TIMESTAMPTZ,
  caption TEXT,
  hashtags TEXT[],
  metrics JSONB,                      -- {views, likes, comments, shares}
  is_viral BOOLEAN DEFAULT FALSE,
  last_refreshed_at TIMESTAMPTZ,
  UNIQUE (competitor_id, platform_post_id)
);

-- Performance attendue vs actuelle
CREATE TABLE content_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES content_scenarios(id),
  platform TEXT,
  published_at TIMESTAMPTZ,
  predicted_views INT,
  actual_views INT,
  predicted_engagement_rate NUMERIC(4,2),
  actual_engagement_rate NUMERIC(4,2),
  clicks_fanvue INT DEFAULT 0,
  conversions_attributed INT DEFAULT 0,
  revenue_attributed NUMERIC(10,2) DEFAULT 0,
  delta_performance NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Idea Generator — prompt engineering

```
System prompt (Claude Sonnet):

Tu es un Community Manager IA expert en niche lifestyle/fitness/sensuel.
Tu génères des idées de contenu pour {{model_slug}} basées sur :

1. Identity du modèle :
{{identity_summary}}

2. Storyline actuelle :
{{storyline_current}}

3. Trends détectés ces 7 derniers jours :
{{top_10_trends}}

4. Calendar gaps prochains 14 jours :
{{calendar_gaps}}

5. Posts concurrentes qui performent :
{{top_competitor_posts}}

Contraintes :
- Jamais contenu explicite agent-facing (Meta compliance)
- Toujours cohérent avec storyline (décor + événements)
- Diversifier formats (Reel, Photoset, Story, Live)
- Balance plateformes selon ratio préféré {{platform_ratios}}

Génère 10 idées en JSON :
{
  "ideas": [
    {
      "title": "...",
      "platform": "ig_reel",
      "format": "...",
      "description": "...",
      "trend_link": "trend_id ou null",
      "storyline_link": "event_id ou null",
      "suggested_timing": "2026-10-18T14:00:00Z",
      "estimated_views": 42000,
      "estimated_conv_rate": 12.5,
      "rationale": "pourquoi ça marche"
    },
    ...
  ]
}
```

Yumi review → accept / edit / reject → approved ideas passent en scenarios (doc 15).

---

## 5. Dashboard CM

### 5.1 Page `/agence/agent-cm/dashboard`

```
┌─ Community Manager — Yumi ────────────────────────────────────────┐
│                                                                   │
│ 📈 Top trends semaine (7 in niche)                                │
│   🔥 "soft launch" +340% · [Voir idées générées (5)]              │
│   🔥 "get ready with me" +180% · [3 idées]                        │
│   🔥 "morning routine aesthetic" +90% · [2 idées]                 │
│                                                                   │
│ 💡 Idées en attente review (12)                                   │
│   • Soft launch Paris apartment · IG Reel · ~45k views           │
│   • GRWM Ibiza pré-voyage · Reel · ~38k views                    │
│   [Voir toutes]                                                   │
│                                                                   │
│ 📅 Prochain post suggéré : demain 14h IG Reel                    │
│   "Matin cozy" · estimated 42k views, 12% conv Fanvue            │
│   [Approuver] [Ajuster timing] [Proposer autre]                  │
│                                                                   │
│ 📊 Performance 7 derniers jours                                   │
│   Reach : 287k  · Engagement : 8.2%  · Conv Fanvue : 187         │
│   Top post : "Lingerie rouge" (62k views, 21% conv)              │
│                                                                   │
│ ⚠ Alertes                                                         │
│   • Lundi 14:00 heure optimale non utilisée cette semaine        │
│   • Gap "fitness" dans calendar — recommande post fitness J+3    │
└───────────────────────────────────────────────────────────────────┘
```

### 5.2 Pages dédiées

- `/agence/agent-cm/trends` — liste trends + historique + pertinence par niche
- `/agence/agent-cm/ideas` — backlog idées (Kanban : pending / approved / in production / published / archived)
- `/agence/agent-cm/calendar` — calendrier éditorial (§2.3)
- `/agence/agent-cm/competitors` — tracking concurrentes
- `/agence/agent-cm/analytics` — performance + ROI

---

## 6. Intégration agent conversationnel

### 6.1 CM informe agent DM

Agent sait quoi promouvoir :

```
System prompt agent addendum :
== CURRENT PUSH ==
Post récent (il y a 6h): "Matin cozy au lit" sur IG Reel
Scenario link : fanvue.com/yumi/posts/abc123
Performance : 42k views, tendance virale

Si fan mentionne avoir vu cette vidéo, engage là-dessus :
"Tu as vu mon dernier reel? J'étais trop feignasse ce matin 😘 
 viens voir ce qui s'est passé après 💜"
```

### 6.2 Fan demandes influencent CM

Si 10+ fans demandent "tu fais plus de fitness?" → CM remonte signal → suggère + scenarios fitness.

Pipeline :
```
Agent classifier détecte "content_request" avec tag "fitness" × 10 fans
  ↓
Event `fan_content_demand` insert
  ↓
CM dashboard alerte Yumi : "10 fans demandent contenu fitness cette semaine"
  ↓
Suggest scenario fitness next week
```

---

## 7. Providers externes pour data scraping

| Provider | Usage | Coût |
|----------|-------|------|
| **Apify** | Scraping IG/TikTok/Reddit | $49-99/mois |
| **Bright Data** | Proxy scraping anti-ban | $500+/mois (trop cher V3) |
| **RapidAPI Social APIs** | IG/TikTok insights via API | $10-50/mois |
| **ExplodingTopics API** | Trends emerging | $39/mois |
| **Google Trends unofficial API** | `serpapi` | $50/mois |

**Recommandation V3** : Apify (start) + ExplodingTopics → ~$90-120/mois.

Alternative self-host : Playwright scripts sur Hetzner box $5-10/mois, risqué (ban sans rotation proxies).

---

## 8. Compliance & éthique

### 8.1 Scraping légal

- Respect robots.txt / ToS plateformes
- Rate limiting strict (pas de flood)
- Uniquement data publique (comptes publics)
- Pas de harcèlement concurrents (alertes anti-spam si detecté)

### 8.2 Pas de copie pure

CM extrait **patterns abstraits**, jamais copies verbatim :
- ✅ "Format GRWM très performant cette semaine"
- ❌ "Copier exactement la vidéo de @sarah.creator"

Guardrail prompt :
```
RÈGLE ABSOLUE : ne jamais copier un post concurrent verbatim. Extrait seulement 
patterns (format, timing, angles) pour proposer idées originales Yumi-specific.
```

### 8.3 Données fan

Analyse demandes fans = aggregated + anonymized. Pas de tracking individual pour CM.

---

## 9. Coûts Phase V3

### 9.1 Infrastructure

- Apify : ~$50/mois scraping
- ExplodingTopics : $39/mois
- Google Trends (serpapi) : $50/mois
- **Total scraping** : ~140€/mois

### 9.2 IA

- Idea generation : Claude Sonnet ~5k tokens × 50/mois = ~$15/mois
- Competitor analysis : Haiku ~10k tokens/jour × 30 = ~$10/mois
- **Total IA CM** : ~25€/mois

### 9.3 Total V3 CM

**~165€/mois** ajouté à stack V1+V2 (~200€/mois ajoutés au total).

**ROI attendu** : si CM génère 20% conversions en plus via optimisation contenu → +500€/mois revenus attribués.

---

## 10. KPIs CM

- **Trend detection rate** : % trends majeurs détectés avant concurrents (lead time)
- **Idea acceptance rate** : % idées validées par Yumi (cible >50%)
- **Prediction accuracy** : delta predicted vs actual performance (cible <20% erreur)
- **Publication consistency** : % emplacements calendar utilisés (cible >85%)
- **Revenue influence** : conversion attribuée aux posts auto-suggérés

---

## 11. Évolution V4+

- **Auto-publishing** (avec Yumi approval 1-click) : CM publie directement IG/TikTok
- **Live trend riding** : détection trend hot (<24h) → génération + publication automatisée
- **Multi-model CM** : 1 CM gère Yumi + Paloma + Ruby
- **Audience insights avancées** : prédiction fan acquisition par trend ridé
- **Collaboration detection** : CM suggère créatrices compatibles pour collabs

---

## 12. Dependencies

- **Phase V3 scenarios** (doc 15) activée
- **Phase V3 storyline** (doc 17) activée
- **Identity profile** Yumi stable
- **Agent conversationnel V1** stable
- **Analytics IG/TikTok** connectées (API Graph Meta + TikTok Business)

---

## 13. Prochaine référence

Voir [17-STORYLINE-LIFE-CONSISTENCY.md](./17-STORYLINE-LIFE-CONSISTENCY.md) pour univers cohérent qui nourrit CM ideas.
Voir [15-CONTENT-SCENARIOS-GENERATION.md](./15-CONTENT-SCENARIOS-GENERATION.md) pour production effective.

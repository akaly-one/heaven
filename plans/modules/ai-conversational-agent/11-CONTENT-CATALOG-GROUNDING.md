# 11 — Content Catalog & Grounding (anti-hallucination Fanvue)

> **Problème critique** : l'agent ne doit JAMAIS inventer du contenu Yumi qui n'existe pas sur Fanvue. Si agent promet "shoot lingerie à 10€" qui n'existe pas → crédibilité Yumi détruite + plainte fan.
> **Solution** : catalog structuré des contenus réels, grounding RAG avant génération, validation outbound.

---

## 1. Concept

L'agent a accès à un **catalog en base** qui reflète EXACTEMENT ce que Yumi propose sur Fanvue à un instant T. Avant de mentionner un contenu spécifique dans une réponse, l'agent DOIT :
1. Consulter le catalog
2. Référencer uniquement ce qui existe
3. Sinon rester générique ("J'ai plein de contenus exclusifs 💜")

---

## 2. Structure catalog

### 2.1 Table `content_catalog`

```sql
CREATE TABLE content_catalog (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug       TEXT NOT NULL,
  content_type     TEXT CHECK (content_type IN (
    'subscription_tier',    -- monthly sub (ex: "VIP accès complet 25€/mois")
    'ppv_photo_set',        -- photoset individuel à prix fixe
    'ppv_video',            -- vidéo premium PPV
    'bundle',               -- bundle plusieurs contenus
    'custom',               -- contenu custom sur demande
    'live_show',            -- session live prévue
    'free_preview'          -- teaser gratuit
  )),
  title            TEXT NOT NULL,                      -- "Shoot lingerie rouge — octobre 2026"
  description      TEXT,                               -- contenu descriptif pour agent
  tags             TEXT[] DEFAULT '{}',                -- ['lingerie','red','photoset','sexy']
  price_usd        NUMERIC(10,2),
  price_eur        NUMERIC(10,2),
  currency_default TEXT DEFAULT 'EUR',
  cover_url        TEXT,                               -- thumbnail Cloudinary
  fanvue_url       TEXT NOT NULL,                      -- lien direct achat/accès
  is_active        BOOLEAN DEFAULT TRUE,
  is_featured      BOOLEAN DEFAULT FALSE,              -- mis en avant
  starts_at        TIMESTAMPTZ,                        -- si offre limitée
  ends_at          TIMESTAMPTZ,
  embedding        vector(1536),                       -- pour RAG
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_catalog_active ON content_catalog(model_slug, is_active);
CREATE INDEX idx_content_catalog_tags ON content_catalog USING GIN(tags);
CREATE INDEX idx_content_catalog_embedding ON content_catalog
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

### 2.2 Exemples de rows

```sql
INSERT INTO content_catalog (model_slug, content_type, title, description, tags, price_eur, fanvue_url) VALUES
  ('yumi', 'subscription_tier', 'Abonnement Premium VIP', 'Accès à tous les PPV + chat prioritaire + photos exclu hebdo', ARRAY['vip','monthly','full'], 25.00, 'https://fanvue.com/yumi'),
  ('yumi', 'ppv_photo_set', 'Lingerie Rouge Passion — Octobre 2026', 'Set 45 photos lingerie rouge dentelle, prises en studio professionnel', ARRAY['lingerie','red','sexy','photoset','studio'], 12.00, 'https://fanvue.com/yumi/posts/abc123'),
  ('yumi', 'ppv_video', 'Sport & Sensualité', 'Vidéo 8 min yoga-sensuel en bodysuit noir', ARRAY['sport','yoga','bodysuit','video','athletic'], 18.00, 'https://fanvue.com/yumi/posts/def456'),
  ('yumi', 'bundle', 'Pack Plage Été 2026', 'Bundle : 3 photosets bikini + 1 vidéo pool', ARRAY['summer','bikini','pool','beach','bundle'], 35.00, 'https://fanvue.com/yumi/posts/ghi789'),
  ('yumi', 'custom', 'Custom Photo personnalisée', 'Photo sur demande selon brief fan (safe for IG)', ARRAY['custom','personal'], 25.00, 'https://fanvue.com/yumi/custom');
```

---

## 3. Ingestion du catalog

### 3.1 Source = Yumi upload manuel (V1)

Pas d'API Fanvue publique mature en 2026. Yumi gère catalog via UI cockpit :

**Page** `/agence/contenu/catalog` (module existant à enrichir)

- Form ajout contenu (toutes colonnes ci-dessus)
- Upload cover Cloudinary (automatique via module existant `packs-editor`)
- Tags autocomplete (suggestions basées sur catalog existant)
- Toggle `is_active` pour activer/désactiver sans supprimer
- Vue table avec filtres + edit inline

### 3.2 Embedding auto

À chaque insert/update row :
- Trigger Supabase appelle edge function `generate_embedding`
- Edge function = appel OpenAI text-embedding-3-small sur `title + description + tags.join(' ')`
- Stocke vector dans colonne `embedding`

Coût : ~0.00002€ par contenu. Négligeable.

### 3.3 Webhook Fanvue (V2+ si API disponible)

Si Fanvue ouvre API publique → sync automatique :
- Cron horaire fetch `/api/fanvue/content/{creator_id}`
- Diff avec `content_catalog` → insert/update/soft-delete
- Yumi approuve changements importants (prix modification)

---

## 4. Grounding RAG à la génération

### 4.1 Pipeline

```
[Fan message] → runAgent() démarre
  ↓
[1] Classifier détecte intent
    Si intent ∈ {price_question, content_request, subscription_curious} →
    → ACTIVE RAG MODE
  ↓
[2] Extract query from message + history
    Ex: "Tu as des photos sport?" → query = "sport photos athletic"
  ↓
[3] Embed query + search top-3 content_catalog (similarité cosine)
    WHERE is_active=TRUE AND (ends_at IS NULL OR ends_at > NOW())
  ↓
[4] Inject dans system prompt :
    "Contenus disponibles actuels pertinents :
     - [Sport & Sensualité] Vidéo yoga sensual 8min · 18€ · https://...
     - [Pack Plage] Bundle bikini · 35€ · https://..."
  ↓
[5] Agent génère réponse, peut citer CES contenus précis
  ↓
[6] Safety filter : check URLs mentionnées correspondent catalog
    Si URL hallucinée détectée → block + rephrase générique
```

### 4.2 System prompt addendum

```
== CONTENUS DISPONIBLES POUR CE FAN (RAG) ==
{{#if rag_contents}}
Tu peux citer uniquement ces contenus réels :
{{#each rag_contents}}
- **{{title}}** ({{content_type}}) : {{description}} — {{price_eur}}€ — {{fanvue_url}}
{{/each}}
{{else}}
Aucun contenu spécifique pertinent trouvé. Reste générique ("J'ai plein d'exclu sur Fanvue 💜") et envoie lien général https://fanvue.com/yumi.
{{/if}}

RÈGLE ABSOLUE : ne JAMAIS inventer un contenu, prix ou lien qui n'est PAS dans cette liste.
```

### 4.3 Outbound validation

Post-génération, avant envoi Meta :

```ts
function validateContentMentions(response: string, allowedUrls: string[]): {ok: boolean, issues: string[]} {
  const issues = [];

  // 1. Extract URLs mentionnées
  const urls = response.match(/https?:\/\/[^\s]+/g) || [];

  // 2. Check each URL is allowed (either in catalog OR https://fanvue.com/yumi générique)
  for (const url of urls) {
    if (!allowedUrls.includes(url) && url !== 'https://fanvue.com/yumi') {
      issues.push(`Hallucinated URL: ${url}`);
    }
  }

  // 3. Extract prix mentionnés (ex: "12€", "25 USD")
  const prices = response.match(/\d+\s*[€$]/g) || [];
  for (const price of prices) {
    const normalized = parseFloat(price);
    const catalogPrices = allowedContents.map(c => c.price_eur);
    if (!catalogPrices.includes(normalized)) {
      issues.push(`Price mentioned (${price}) not in catalog`);
    }
  }

  return { ok: issues.length === 0, issues };
}
```

Si validation fail → rephrase via Haiku stricter OR fallback canned "Viens voir sur Fanvue mon chou 💋 https://fanvue.com/yumi".

---

## 5. Matching contenu ↔ fan profile

### 5.1 Intégration lead scoring + content tags

Table `fan_interests` :

```sql
CREATE TABLE fan_interests (
  fan_id UUID REFERENCES agence_fans(id) ON DELETE CASCADE,
  interest_tag TEXT,
  weight NUMERIC(3,2) DEFAULT 1.0,         -- 0.0-1.0, accumule via mentions
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,                              -- 'message_mentioned', 'click_content', 'purchase'
  PRIMARY KEY (fan_id, interest_tag)
);
```

### 5.2 Détection

Classifier Haiku lors de chaque message détecte mentions d'intérêts :

```
Input: "Tu as des photos de sport? J'adore le yoga"
LLM output: {
  "detected_interests": ["sport", "yoga", "athletic"],
  "confidence": 0.92
}
```

Insert/upsert dans `fan_interests` avec weight +0.1 par mention, jusqu'à 1.0.

### 5.3 Matching RAG bonus

Quand RAG cherche contenus, boost similarité si tags matchent `fan_interests` :

```sql
SELECT c.*,
  (1 - (c.embedding <=> $1)) * 0.7
  + (array_length(c.tags & fan_interest_tags, 1) * 0.1)
  AS match_score
FROM content_catalog c, (
  SELECT array_agg(interest_tag) AS fan_interest_tags
  FROM fan_interests WHERE fan_id = $2 AND weight > 0.3
) f
WHERE c.model_slug = $3 AND c.is_active = TRUE
ORDER BY match_score DESC
LIMIT 3;
```

### 5.4 Exemple

Fan Julien a interests : `sport`, `yoga`, `athletic` (weight >0.5 chacun)

Fan demande "envoie moi tes meilleures photos"

RAG sans matching : retourne les 3 plus populaires (généralistes)

RAG avec matching : retourne "Sport & Sensualité" (vidéo yoga) en premier car tags match + "Athletic Photoset" si existe

Agent répond : *"Je sais que tu kiffes le sport, j'ai ma vidéo Sport & Sensualité en yoga 🧘‍♀️ tu vas l'adorer 💜 [link]"*

---

## 6. Promotions et offres limitées

### 6.1 Offres time-boxed

```sql
-- Column ends_at déjà sur content_catalog
UPDATE content_catalog 
SET price_eur = 8.00, ends_at = NOW() + INTERVAL '24 hours', is_featured = true
WHERE id = 'uuid-photoset-lingerie';
```

### 6.2 Injection prompt

Si `is_featured = true` OR `ends_at < NOW() + INTERVAL '48h'` → flag dans RAG result :
```
- **Lingerie Rouge** *(OFFRE LIMITÉE -50% jusqu'à demain 20h)* — 8€ au lieu de 12€
```

Agent adapte ton : urgence douce pour HOT/WARM, pas de mention agressive pour COLD.

### 6.3 Offres par bucket

Optionnel : prix dynamiques selon bucket fan :
- HOT → prix catalog normal (converti quand même)
- WARM → offre -10% (incentive)
- COLD → pas de push prix (trop tôt)
- EXISTING → upsell bundles + customs

Gestion via règles dans persona prompt (pas prix différenciés DB — complexité pas justifiée V1).

---

## 7. Yumi UI — gestion catalog

### 7.1 Page `/agence/contenu/catalog`

```
┌─ Catalog (24 contenus actifs) ────────────────────────────────┐
│                                                               │
│  [+ Ajouter un contenu]  [Import CSV] [Sync Fanvue (V2)]     │
│                                                               │
│ Filtres: Type [Tous ▾] Tag [Tous ▾] Statut [Actif ▾]         │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐    │
│ │ [cover] Lingerie Rouge Passion                         │    │
│ │ 🏷 lingerie,red,sexy    📸 PPV Photoset    12€ EUR    │    │
│ │ 📅 depuis 15 oct · 📊 47 ventes · actif ✅             │    │
│ │ [✏️ Éditer] [🔗 Voir Fanvue] [⏸ Désactiver]          │    │
│ └───────────────────────────────────────────────────────┘    │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐    │
│ │ ... autre contenu                                      │    │
│ └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### 7.2 Page ajout

- Title (obligatoire)
- Description (markdown supporté)
- Type (select)
- Tags (autocomplete from existing)
- Prix EUR + USD auto-conversion taux du jour
- Cover upload (Cloudinary module existant)
- URL Fanvue (validation regex)
- Actif toggle
- Dates start/end (optional)

Soumission → embedding auto-généré en background.

### 7.3 Analytics par contenu

- Nombre fois mentionné par agent (7j/30j)
- Nombre clics (via UTM attribution)
- Nombre conversions (linked purchase)
- ROI (revenu attribué)

Yumi voit quels contenus l'agent promeut le plus + efficacité.

---

## 8. Anti-patterns à éviter

### 8.1 ❌ Hallucination prix

```
Agent: "J'ai un PPV à 8€ si tu veux"
Fan: clique, prix affiché 12€ sur Fanvue
→ Fan déçu, possible ban Yumi
```

**Solution** : validation prix post-gen (§4.3).

### 8.2 ❌ Promotion contenu inexistant

```
Agent: "J'ai un shoot policière sexy cette semaine"
Fan: "où?"
Agent: "euh sur Fanvue"
Fan visite → n'existe pas
```

**Solution** : RAG obligatoire pour mentions spécifiques + prompt "jamais inventer".

### 8.3 ❌ Promesse future

```
Agent: "J'aurai un nouveau shoot lingerie la semaine prochaine"
(Yumi n'a rien planifié)
```

**Solution** : prompt interdit "je vais faire" / "je prépare" sauf si catalog a `scheduled_release_at` column (pas V1).

### 8.4 ❌ Contenu expiré

```
Offre "Pack Plage" ends_at passée
Agent promeut encore
```

**Solution** : filter RAG `WHERE ends_at IS NULL OR ends_at > NOW()`.

---

## 9. Monitoring hallucinations

### 9.1 Logs

Toute URL / prix mentionné dans réponse agent → log dans `ai_runs.content_mentions JSONB` :
```json
{
  "urls": ["https://fanvue.com/yumi/posts/abc123"],
  "prices": ["12€"],
  "validated": true,
  "catalog_match_ids": ["uuid-..."]
}
```

### 9.2 Dashboard

`/agence/ops/content-grounding` (admin only) :
- Taux hallucination détecté pre-filter (sur 1000 réponses)
- Top 10 contenus les plus mentionnés
- Top 10 hallucinations tentées (cas où filter a rephrasé)
- Content coverage (combien de contenus catalog jamais mentionnés = pas indexés bien)

### 9.3 Alertes

- Hallucination haute sévérité (URL externe non whitelistée) → alert
- Contenu mentionné avec prix incorrect → alert
- Pattern suspect (agent promet "custom" sans catalog entry) → alert

---

## 10. Coût et performance

- Embedding 1 row catalog : ~0.00002€ (one-shot à creation)
- Query RAG par génération : négligeable (<5ms local DB)
- Appel OpenAI embedding par message user (pour query) : ~0.00001€
- **Total overhead catalog + RAG** : <0.01€/jour à 500 msg/jour

---

## 11. Extensions V2+

- Auto-sync Fanvue API (si Fanvue l'ouvre)
- Génération cover Cloudinary auto via `nanobanana` MCP (si on l'intègre)
- Recommandation contenus à ajouter (gap detection : fans demandent souvent X mais pas dans catalog)
- A/B test contenus (rotate featured, mesure conversion)

---

## 12. Prochaine phase

Migration + seed dans **Phase 4 T-DB-10** (content_catalog table + fan_interests).
UI catalog dans **Phase 3** (intégré refonte contenu modules).
RAG integration dans **Phase 5 T-BE-12**.
Grounding validation dans **Phase 5 T-SAFE-05**.

Voir [06-LEAD-SCORING.md](./06-LEAD-SCORING.md) pour lien avec `fan_interests`.
Voir [08-CONTEXT-PERSISTENCE.md](./08-CONTEXT-PERSISTENCE.md) pour intégration RAG globale.

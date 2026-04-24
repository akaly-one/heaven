# 13 — Cross-Channel Unified Context (web + IG DM + IG story replies)

> L'agent traite TOUS les canaux d'entrée du même fan de manière unifiée. Même fan qui te parle sur IG + web + répond à tes stories IG = **UN SEUL contexte**, un seul score, une seule histoire.

---

## 1. Problème

Fan `@julien_paris` (IG) :
- Jour 1 : répond à une story IG → "Wow belle photo"
- Jour 3 : DM IG → "Hey tu vends tes contenus?"
- Jour 5 : visite `/m/yumi` web, envoie message depuis profil → "Où je peux voir plus?"

Actuellement (code existant Heaven) :
- Channel web (agence_messages) et IG (instagram_messages) = tables SÉPARÉES
- Agent perçoit 3 interactions distinctes, ignore qu'il parle au même fan
- Score fragmenté, réponse incohérente, mémoire leak

**Solution** : linking cross-canal via `agence_fans.id` unique + timeline unifiée + agent contextualisé multi-source.

---

## 2. Canaux supportés V1

| Canal | Source | Status |
|-------|--------|--------|
| **IG DM** | Meta webhook | Existant (instagram_messages + instagram_conversations) |
| **IG Story Reply** | Meta webhook (même endpoint que DM) | À clarifier : Meta route story replies dans même inbox IG |
| **IG Comment → DM** | ManyChat-like pattern via Meta triggers | V2 (si NB active comments trigger) |
| **Web profile** | `/m/yumi` message form | Existant (agence_messages) |

**V2+** : Snapchat, MYM, TikTok DMs (quand Yumi ouvre ces canaux).

---

## 3. Architecture canonical fan

### 3.1 `agence_fans` = table canonique

Schéma existant (extrait) :
```sql
-- agence_fans existe déjà
id UUID PK
pseudo_web TEXT
pseudo_insta TEXT
pseudo_snap TEXT
fanvue_handle TEXT
email TEXT
phone TEXT
-- + notes, merged_into_id, etc.
```

Cette table est le **hub d'identité** fan. Toutes les convs s'y rattachent.

### 3.2 Extensions nécessaires

```sql
ALTER TABLE agence_fans ADD COLUMN
  instagram_ig_user_id TEXT,           -- Meta user ID (stable)
  web_session_ids TEXT[],              -- sessions web historiques
  
  -- Agrégats cross-channel
  total_messages INT DEFAULT 0,
  first_channel TEXT,                  -- 'web' | 'instagram' | 'story_reply'
  channels_active TEXT[] DEFAULT '{}', -- liste canaux où fan a interagi
  last_active_channel TEXT,
  last_active_at TIMESTAMPTZ;
```

### 3.3 Linking automatique

Détection que 2 conversations sont le même fan :

**Critères forts (merge auto)** :
- Même `instagram_ig_user_id` sur 2 conversations
- Même email vérifié
- Même phone

**Critères moyens (suggest merge à Yumi)** :
- Pattern écriture similaire + même timezone
- Fan mentionne son handle IG dans message web

**Critères faibles (ne pas auto-merge)** :
- Noms similaires seulement

**UI Yumi** : modal "Ce fan ressemble à @julien_paris (85% match). Fusionner?" → click = merge, mise à jour DB.

### 3.4 Fan merge workflow

```sql
-- Procedure merge_fans(source_id, target_id)
-- Transfère toutes les conversations + messages + scores + events vers target
-- Marque source.merged_into_id = target_id
-- Préserve history pour audit

SELECT merge_fans('fan-uuid-web', 'fan-uuid-ig-primary');
```

---

## 4. Timeline unifiée

### 4.1 Vue `agence_messages_timeline`

Cette vue existe déjà (migration 032). Extension pour inclure story replies :

```sql
CREATE OR REPLACE VIEW agence_messages_timeline AS
SELECT
  'web'::text AS source,
  m.id::text AS id,
  m.model_id AS model,
  m.client_id::text AS fan_id,    -- agence_fans.id
  m.client_id::text AS client_id,
  m.content AS text,
  m.direction,
  m.read AS read_flag,
  m.created_at
FROM agence_messages m

UNION ALL

SELECT
  CASE WHEN im.is_story_reply THEN 'instagram_story' ELSE 'instagram' END AS source,
  im.id::text,
  c.model_id AS model,
  f.id::text AS fan_id,              -- agence_fans.id (via IG user link)
  im.ig_message_id AS client_id,
  im.content AS text,
  im.role AS direction,
  im.read_flag,
  im.created_at
FROM instagram_messages im
JOIN instagram_conversations c ON c.id = im.conversation_id
LEFT JOIN agence_fans f ON f.instagram_ig_user_id = c.ig_user_id;
```

Ajout colonne `is_story_reply` sur `instagram_messages` :

```sql
ALTER TABLE instagram_messages ADD COLUMN
  is_story_reply BOOLEAN DEFAULT FALSE,
  replied_to_story_id TEXT,          -- Meta story ID si story reply
  replied_to_story_url TEXT;         -- URL preview (optional)
```

### 4.2 Meta webhook distinction DM vs story reply

Meta Graph API envoie `attachments` avec type `story_mention` ou `story_reply` dans payload :

```ts
// /api/instagram/webhook
if (message.attachments?.some(a => a.type === 'story_mention' || a.type === 'story_reply')) {
  isStoryReply = true;
  replied_to_story_id = message.attachments[0].payload.id;
}
```

### 4.3 UI distinguée dans inbox

Badges visuels pour Yumi :
- `💬 DM` : DM direct
- `📸 Story reply` : réponse story (icône story)
- `🌐 Web` : message depuis profil web

Hover story reply → thumbnail de la story concernée (si pas expirée, Meta garde 24h).

---

## 5. Agent context unifié

### 5.1 Fetch history cross-channel

Quand worker génère réponse pour un message fan, fetch conversation history **tous canaux** :

```sql
-- Dans context-builder
SELECT source, text, direction, created_at
FROM agence_messages_timeline
WHERE fan_id = $1
  AND model = $2
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 10;
```

Agent voit : *"il y a 5 jours sur IG story il a dit X, puis avant-hier sur web il a dit Y"*.

### 5.2 System prompt addendum cross-channel

```
== HISTORIQUE CROSS-CHANNEL DE CE FAN ==
Ce fan interagit avec toi via plusieurs canaux. Voici le contexte unifié :

- Premier contact : il y a 12 jours via {{first_channel}}
- Canaux actifs : {{channels_active}}
- Dernier msg : {{last_active_channel}} il y a {{time_since_last}}

Historique récent (tous canaux) :
{{#each history}}
- [{{source}}] {{direction}}: {{text}} ({{relative_time}})
{{/each}}

IMPORTANT: Ne commence pas par demander "tu viens d'où?" si le fan t'a déjà
parlé sur un autre canal. Montre que tu te souviens (naturellement).
```

### 5.3 Exemple cohérence

**Scénario** :
- Jour 1 IG story reply : "Wow belle photo"
- Jour 3 IG DM : "Hey"

**Sans contexte unifié (ancien comportement)** :
Agent : "Hey, comment tu m'as trouvée?" (ignore l'historique story)

**Avec contexte unifié** :
Agent : "Hey bb! Tu reviens 💜 j'ai vu que t'avais kiffé ma dernière story 😘 ça va?"

---

## 6. Channel-specific adaptations

### 6.1 Limites par canal

| Canal | Max chars | Médias supportés | Urgence réponse |
|-------|-----------|------------------|-----------------|
| IG DM | 1000 (pratique: 250 max) | Text, emoji, 1 média | Fenêtre 24h Meta |
| IG Story reply | 1000 | Text, emoji | Généralement rapide |
| Web | 2000+ | Text, emoji, future: médias | Pas de fenêtre stricte |

### 6.2 Adapter longueur réponse

```ts
function adaptResponseLength(response: string, channel: Channel): string {
  const maxLen = {
    instagram: 250,
    instagram_story: 200,  // IG truncate story replies
    web: 600,
  }[channel];

  if (response.length <= maxLen) return response;

  // Truncate proprement à fin de phrase
  const truncated = response.substring(0, maxLen);
  const lastPeriod = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  return truncated.substring(0, lastPeriod + 1) + ' 💜';
}
```

### 6.3 Style par canal

- **IG DM** : court, emojis, familier, pas d'URL complète (raccourcie)
- **IG Story reply** : encore plus court, réfère à la story (ex: "Merci mon chou 💜 tu as vu la suite sur Fanvue?")
- **Web** : peut être plus long, plus descriptif, URL full OK

Inject hint dans prompt :
```
Canal de réponse: {{channel}}
Contraintes : max {{max_length}} chars, {{style_hint}}
```

---

## 7. Routing dispatch par canal

### 7.1 Worker principal pour chaque canal

| Canal | Worker | Fréquence | Source |
|-------|--------|-----------|--------|
| IG DM/Story | `/api/cron/process-ig-replies` existant | 1/min | `ig_reply_queue` |
| Web | Nouveau : `/api/cron/process-web-replies` | 1/min | Nouvelle table `web_reply_queue` |

**Note** : unifier dans **1 worker** unique serait plus propre (voir alternative §7.3).

### 7.2 Queue web — nouvelle table

```sql
CREATE TABLE web_reply_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES agence_messages(id),
  fan_id UUID REFERENCES agence_fans(id),
  model_slug TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending','started','done','failed','requeued_rate_limit')),
  retry_count INT DEFAULT 0,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_web_reply_queue_pending ON web_reply_queue(status, created_at) WHERE status = 'pending';
```

RPC similaire à IG :
```sql
CREATE FUNCTION claim_web_reply_jobs(p_limit INT) RETURNS SETOF web_reply_queue...
```

### 7.3 Alternative : worker unifié

```sql
-- Table unique
CREATE TABLE agent_reply_queue (
  id UUID PRIMARY KEY,
  channel TEXT CHECK (channel IN ('instagram','web','snapchat')),
  source_message_id TEXT,          -- polymorphe
  fan_id UUID REFERENCES agence_fans(id),
  model_slug TEXT NOT NULL,
  status TEXT,
  -- ...
);
```

1 worker `/api/cron/process-agent-replies` claim all → dispatch selon channel → envoie via client adapté (Meta / web emit / ...).

**Recommandation** : **unifier** (alternative §7.3). Moins de code duplication, logs centralisés, observabilité uniforme.

---

## 8. Response routing sortant

Agent a généré réponse → envoyée par canal approprié :

```ts
async function sendResponse(channel: Channel, fanId: string, response: string) {
  const fan = await getFan(fanId);

  switch (channel) {
    case 'instagram':
    case 'instagram_story':
      return await sendViaMetaGraph(fan.instagram_ig_user_id, response);
    case 'web':
      return await insertAgenceMessage({
        client_id: fanId,
        content: response,
        direction: 'outbound',
        model_id: currentModelId,
      });
  }
}
```

### 8.1 Story reply spécifique

Meta Graph envoie story replies → inbox IG standard. Réponse = envoyée comme DM classique (pas de "story reply" dans l'autre sens).

Donc agent répond en DM, mais préserve référence story dans son message :

> "Oh tu as aimé ma story d'hier 💜 tant mieux, j'ai plus encore sur Fanvue 😘"

---

## 9. Fan identity linking — UX Yumi

### 9.1 Quand Yumi voit 2 fans potentiellement identiques

Page `/agence/messagerie` → sidebar fans → badge "Fusion possible?"

```
┌─ @julien_paris (IG) ──────────┐
│ 12 msgs · score 67           │
│ ⚠️ Similaire à: julien77 (web) │
│ [Vérifier matching →]         │
└───────────────────────────────┘
```

Click → modal comparatif :
```
IG @julien_paris                    Web julien77
12 msgs depuis 3j                   4 msgs depuis 1j
Langue: fr                          Langue: fr
Heure active: 19-23h                Heure active: 19-22h
Écrit: court, ponctuation ?        Écrit: court, ponctuation ?
Email: (vide)                       Email: julien77@... ⚠️ unique

[Fusionner comme même fan]  [Ce sont des fans différents]
```

### 9.2 Merge côté DB

Procédure SQL `merge_fans(source_uuid, target_uuid)` :
- Update all references source_id → target_id (messages, conversations, scores, events)
- Merge arrays (channels_active, interests, etc.)
- Set source.merged_into_id = target_id
- Prefer target's non-null fields, fallback source values
- Emit event `fan_merged` pour audit

---

## 10. Cross-channel lead scoring impact

Score unifié accélère quand signaux cross-channel convergent :

```
Julien score actuel : 45 (WARM)

Events :
+10 pts → IG DM price_question
+15 pts → Web form visit + message
+5 pts → Story reply récurrent

Nouveau score : 75 (HOT)
```

Multi-channel engagement = signal fort = boost bucket.

---

## 11. Dashboard cross-channel

`/agence/messagerie` top bar :

```
🌐 Inbox — tous canaux
├ 💬 IG DM (12 pending)
├ 📸 Story replies (3 new)
└ 🌍 Web (5 pending)

Filtre: [Tous canaux ▾] Fan: [Tous ▾]
```

Par conversation, timeline avec marqueurs canal :
```
┌────────────────────────────────────────┐
│ Julien — fan unifié (IG + web)        │
├────────────────────────────────────────┤
│ 📸 [Story reply] "Wow belle!" · J-12  │
│ 💬 [IG DM] "Hey tu vends..."  · J-5   │
│ 💬 [IG DM] "C'est combien?"    · J-3  │
│ 🌍 [Web]   "Où voir plus?"     · J-1  │
│ 🌍 [Web]   "Répondre..."       · 2h   │
└────────────────────────────────────────┘
```

---

## 12. Attribution conversion cross-channel

Si fan clique Fanvue link depuis :
- IG DM → attribution `source=ig_dm`
- Web → attribution `source=web`
- Story → attribution `source=ig_story`

Mais si fan a interagi sur 3 canaux avant conversion → **multi-touch attribution** :
- First touch : quel canal a initié (`first_channel`)
- Last touch : quel canal a converti (last click avant subscription)
- Assisted touches : canaux en milieu de funnel

V1 simple : last-touch attribution.
V2 : multi-touch avec weights.

---

## 13. Prochaine phase

Schéma DB cross-channel dans **Phase 4 T-DB-12** (extensions fans + queue unifiée).
Merge UI dans **Phase 7** (admin fan management).
Worker unifié (alternative §7.3) dans **Phase 5 T-BE-14**.

Voir [03-TECH.md](./03-TECH.md) pour architecture backend générale.
Voir [06-LEAD-SCORING.md](./06-LEAD-SCORING.md) pour impact multi-channel sur score.
Voir [08-CONTEXT-PERSISTENCE.md](./08-CONTEXT-PERSISTENCE.md) pour persistence cross-provider combiné cross-channel.

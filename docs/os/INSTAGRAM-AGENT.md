# INSTAGRAM AI AGENT — Architecture & Implementation

> Module : Social Responder Instagram
> Profile : YUMI (@yumiiiclub)
> Date : 13 avril 2026
> Status : En construction (credentials en attente)

---

## VISION

Agent IA conversationnel connecte a Instagram DMs via Meta Webhook.
Deux modes operationnels :
- **Agent Mode** : reponses automatiques via OpenRouter (Claude/GPT/Gemini)
- **Human Mode** : messages stockes, notification dashboard, reponse manuelle

L'agent represente YUMI (personnalite configuree) et gere les conversations
Instagram automatiquement ou assiste l'equipe en mode semi-autonome.

---

## ARCHITECTURE — System Flow

```
User (Instagram DM)
  │ ① Message
  ▼
Meta / Instagram ──② Forward (webhook)──► Next.js API
                                          POST /api/instagram/webhook
                                            │ ③ Verify + Parse
                                            ▼
                                         Supabase DB
                                         instagram_conversations
                                         instagram_messages
                                            │ ④ Store
                                            ▼
                                         ┌─── Mode Check ───┐
                                         │                    │
                                    Agent Mode           Human Mode
                                         │                    │
                                         ▼                    ▼
                                    OpenRouter AI        Dashboard notification
                                    (Claude/GPT/         (manual reply)
                                     Gemini/Perplexity)
                                         │
                                         ▼ ⑤ AI Reply
                                    Meta Graph API
                                    POST send message
                                         │
                                         ▼ ⑥ Reply sent
                                       User
```

---

## STACK TECHNIQUE

| Composant | Technologie | Role |
|-----------|-------------|------|
| Webhook receiver | Next.js API Route | Recoit les events Meta |
| Message store | Supabase (PostgreSQL) | Historique conversations |
| AI Engine | OpenRouter API | Multi-modele (Claude, GPT, Gemini, Perplexity) |
| Reply sender | Meta Graph API v21.0 | Envoie les reponses Instagram |
| Dashboard | React (agence/instagram) | Monitoring + mode toggle + reponse manuelle |
| Realtime | Supabase Realtime | Updates live dans le dashboard |

---

## ENVIRONNEMENT REQUIS

```env
# Meta / Instagram (a obtenir)
META_APP_ID=
META_APP_SECRET=
META_PAGE_ACCESS_TOKEN=
META_VERIFY_TOKEN=heaven_ig_verify_2026
INSTAGRAM_BUSINESS_ACCOUNT_ID=

# OpenRouter
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-sonnet-4-20250514

# Feature flags
INSTAGRAM_AGENT_ENABLED=false
INSTAGRAM_DEFAULT_MODE=human
```

---

## DATABASE — Migration 030

### Table : instagram_config

```sql
CREATE TABLE instagram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL REFERENCES agence_models(slug),
  ig_handle TEXT NOT NULL,           -- @yumiiiclub
  ig_business_id TEXT,               -- Instagram Business Account ID
  page_access_token TEXT,            -- encrypted Meta token
  default_mode TEXT DEFAULT 'human' CHECK (default_mode IN ('agent', 'human')),
  ai_model TEXT DEFAULT 'anthropic/claude-sonnet-4-20250514',
  system_prompt TEXT,                -- personnalite agent
  max_history INT DEFAULT 10,        -- messages de contexte
  auto_reply_delay_ms INT DEFAULT 2000,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table : instagram_conversations

```sql
CREATE TABLE instagram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  ig_user_id TEXT NOT NULL,          -- Instagram user ID (sender)
  ig_username TEXT,                   -- @username si disponible
  mode TEXT DEFAULT 'agent' CHECK (mode IN ('agent', 'human')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',       -- extra data (profile pic, name)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_slug, ig_user_id)
);
```

### Table : instagram_messages

```sql
CREATE TABLE instagram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'human')),
  content TEXT NOT NULL,
  ig_message_id TEXT,                -- Meta message ID pour dedup
  ai_model_used TEXT,                -- quel modele a repondu
  response_time_ms INT,              -- latence de reponse
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ig_msg_conv ON instagram_messages(conversation_id, created_at);
CREATE INDEX idx_ig_msg_dedup ON instagram_messages(ig_message_id) WHERE ig_message_id IS NOT NULL;
```

---

## API ROUTES

### POST /api/instagram/webhook (public)

```
GET  → Verification Meta (hub.verify_token + hub.challenge)
POST → Receive message events
  1. Verify signature (X-Hub-Signature-256)
  2. Parse messaging events
  3. Upsert conversation
  4. Store message (role: user)
  5. If mode=agent → call OpenRouter → store reply → send via Graph API
  6. If mode=human → store only, notify dashboard via Supabase insert
```

### POST /api/instagram/send (auth: root/model)

```
Body: { conversation_id, content }
  1. Auth check (root or model owner)
  2. Load conversation → ig_user_id
  3. Send via Meta Graph API
  4. Store message (role: human)
  5. Return success
```

### GET /api/instagram/conversations (auth: root/model)

```
Query: ?model_slug=yumi&status=active&limit=20
  1. Auth check
  2. Query conversations with last message
  3. Return paginated list
```

### PATCH /api/instagram/conversations/[id] (auth: root/model)

```
Body: { mode?, status? }
  1. Toggle agent/human mode per conversation
  2. Archive/block conversation
```

---

## OPENROUTER INTEGRATION

### lib/openrouter.ts

```typescript
interface OpenRouterConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

// Format compatible OpenAI Chat Completions API
// Endpoint: https://openrouter.ai/api/v1/chat/completions
// Headers: Authorization: Bearer ${apiKey}
//          HTTP-Referer: https://heaven-os.vercel.app
//          X-Title: Heaven Instagram Agent
```

### System Prompt Template (YUMI)

```
Tu es YUMI, creatrice de contenu exclusive.
Tu reponds aux messages Instagram de facon naturelle, chaleureuse et engageante.
Tu ne reveles JAMAIS que tu es une IA.
Tu guides subtilement vers le profil Heaven pour du contenu exclusif.
Tu restes professionnelle mais accessible.
Langue: francais par defaut, anglais si le message est en anglais.
Tu ne donnes JAMAIS de contenu gratuit ni de liens externes.
Reponses courtes (1-3 phrases max).
```

---

## UX DASHBOARD — /agence/instagram

### Layout

```
┌─────────────────────────────────────────────────┐
│  Instagram Agent — @yumiiiclub                  │
│  [● Agent Mode] [○ Human Mode]   [⚙ Config]   │
├─────────────────────┬───────────────────────────┤
│  Conversations      │  Chat View                │
│  ┌───────────────┐  │  ┌─────────────────────┐  │
│  │ @user1     2m │  │  │ User: Hey YUMI!     │  │
│  │ @user2    15m │  │  │ Agent: Heyy 💕...   │  │
│  │ @user3     1h │  │  │ User: How much...   │  │
│  │ @user4     3h │  │  │                     │  │
│  └───────────────┘  │  ├─────────────────────┤  │
│                     │  │ [Type reply...]  [→] │  │
│  Stats:             │  └─────────────────────┘  │
│  24 convos today    │                           │
│  89% auto-replied   │  Mode: [Agent ▼]          │
│  Avg 1.2s response  │  Model: claude-sonnet     │
└─────────────────────┴───────────────────────────┘
```

### Composants

| Composant | Fichier | Role |
|-----------|---------|------|
| InstagramDashboard | `instagram-dashboard.tsx` | Page principale, layout split |
| ConversationList | `ig-conversation-list.tsx` | Liste conversations + recherche |
| ChatView | `ig-chat-view.tsx` | Messages + input reponse |
| ModeToggle | `ig-mode-toggle.tsx` | Switch Agent/Human global ou par conv |
| AgentConfig | `ig-agent-config.tsx` | System prompt, modele, delai |
| StatsBar | `ig-stats-bar.tsx` | KPIs temps reel |

---

## SECURITE

- **Signature verification** : chaque webhook verifie `X-Hub-Signature-256` avec `META_APP_SECRET`
- **Token encryption** : `page_access_token` chiffre en DB (AES-256)
- **Rate limiting** : max 200 calls/hour vers Graph API (limite Meta)
- **Auth dashboard** : root ou model owner uniquement
- **Mode fallback** : si OpenRouter fail → bascule auto en human mode + notification
- **Dedup** : `ig_message_id` unique pour eviter double traitement webhook

---

## PHASES D'IMPLEMENTATION

| Phase | Contenu | Effort |
|-------|---------|--------|
| **1. Foundation** | Migration SQL, lib/openrouter.ts, lib/instagram.ts | 2h |
| **2. Webhook** | /api/instagram/webhook (verify + receive + store) | 2h |
| **3. AI Reply** | OpenRouter integration, system prompt YUMI, auto-reply | 2h |
| **4. Dashboard UX** | Conversation list + chat view + mode toggle | 3h |
| **5. Send API** | /api/instagram/send + manual reply from dashboard | 1h |
| **6. Config** | Agent config panel, prompt editor, model selector | 1h |
| **7. Stats** | KPIs, response time, auto-reply rate, conversion | 1h |
| **8. Polish** | Realtime updates, notifications, error handling | 1h |

**Total : ~13h**

---

## DEPENDANCES EXTERNES

| Service | Requis | Status |
|---------|--------|--------|
| Meta Developer App | App ID + App Secret | En attente |
| Instagram Business Account | @yumiiiclub lié a une Page Facebook | En attente |
| Page Access Token (long-lived) | Via Graph API Explorer | En attente |
| Webhook URL verified by Meta | heaven-os.vercel.app/api/instagram/webhook | A configurer |
| OpenRouter API Key | openrouter.ai/keys | En attente |
| Permissions Meta | instagram_manage_messages, pages_messaging | App Review requis |

---

## REFERENCES

- Meta Messaging API : developers.facebook.com/docs/messenger-platform
- Instagram Messaging : developers.facebook.com/docs/instagram-messaging
- OpenRouter API : openrouter.ai/docs
- Supabase Realtime : supabase.com/docs/guides/realtime

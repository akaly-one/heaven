# 08 — Context Persistence Cross-Provider (cohérence agent)

> Problème : si l'agent switch entre Groq Llama, Grok, Claude Haiku pour la même conversation, comment garder la **cohérence de ton + mémoire + persona** ? Solution = format unifié + stratégie mémoire + embedding RAG.

---

## 1. Défi

**Scénario** :
1. Fan @julien envoie msg 1 → classifier détecte small talk → Groq Llama répond (ton 1)
2. Fan envoie msg 2 (5 min après) → classifier détecte flirt suggestif → Grok répond (ton 2)
3. Fan envoie msg 3 → classifier détecte price question → Claude Haiku répond (ton 3)

**Risques si mal géré** :
- Contradictions (msg 1 dit "je suis à Paris", msg 3 dit "je suis à NY")
- Perte mémoire (Grok oublie que Yumi a mentionné nouveau shoot au msg 1)
- Drift de ton (Llama warm, Grok suggestif, Haiku formel → fan détecte bizarre)
- AI leak (chaque provider a son biais, parfois laisse échapper indice bot)

**Solution en 3 couches** :
1. **Format standardisé** (ChatCompletion OpenAI) accepté par tous les providers
2. **Contexte dense et cohérent** (persona + scoring + history résumé + RAG ancien)
3. **Guardrails uniformes** en post-processing quel que soit le provider

---

## 2. Format unifié — Chat Completions

### 2.1 Standard choisi : OpenAI ChatCompletion

Tous les providers modernes supportent ce format :

```ts
interface ChatMessage {
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string;
  name?: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json_object';
}
```

### 2.2 Support provider (avril 2026)

| Provider | Support natif | Remarque |
|----------|---------------|----------|
| OpenAI (GPT-5) | ✅ natif | — |
| Anthropic Claude | ⚠️ via SDK Messages API (forme proche mais pas identique) | Wrapper OpenAI-compatible existe via Anthropic — perd prompt caching |
| Grok (xAI) | ✅ endpoint OpenAI-compatible `api.x.ai` | Drop-in replacement |
| Groq | ✅ endpoint OpenAI-compatible | — |
| Mistral | ✅ endpoint OpenAI-compatible | — |
| DeepSeek | ✅ endpoint OpenAI-compatible | — |
| Gemini | ⚠️ format natif différent mais wrapper Google AI SDK OK | — |
| OpenRouter | ✅ normalise tout vers OpenAI format | +5.5% markup |

### 2.3 Implémentation wrapper

```ts
// src/shared/lib/ai-agent/providers/base.ts
export abstract class BaseProvider {
  abstract id: string;
  abstract endpoint: string;

  async generate(messages: ChatMessage[], opts?: GenOpts): Promise<AIResponse> {
    // 1. Translate standard → provider-specific si nécessaire
    const payload = this.buildPayload(messages, opts);

    // 2. Call API avec timeout
    const raw = await fetchWithTimeout(this.endpoint, payload, 15000);

    // 3. Translate response → standard AIResponse
    return this.parseResponse(raw);
  }

  protected buildPayload(messages: ChatMessage[], opts?: GenOpts): unknown;
  protected parseResponse(raw: unknown): AIResponse;
}
```

Concrètement pour Claude (seul à avoir format différent) :

```ts
class ClaudeHaikuProvider extends BaseProvider {
  buildPayload(messages, opts) {
    // Extract system message (Claude has it as separate field)
    const system = messages.find(m => m.role === 'system')?.content;
    const rest = messages.filter(m => m.role !== 'system');
    return {
      model: 'claude-haiku-4-5-20251001',
      system,
      messages: rest.map(m => ({ role: m.role, content: m.content })),
      max_tokens: opts?.maxTokens ?? 512,
      temperature: opts?.temperature ?? 0.8,
    };
  }
}
```

Via OpenRouter = zéro wrapping nécessaire, on envoie format OpenAI à tous.

---

## 3. Context construction

### 3.1 Structure du payload envoyé aux providers

Toujours la même forme, peu importe le provider :

```ts
const messages: ChatMessage[] = [
  // 1. System prompt (persona + guardrails + context fan courant)
  { role: 'system', content: systemPromptComposed },

  // 2. Rolling summary si conversation longue
  { role: 'system', content: `Résumé des échanges précédents: ${rollingSummary}` },

  // 3. Historique récent (dernières N messages, non résumé)
  ...recentMessages.map(m => ({
    role: m.sender === 'fan' ? 'user' : 'assistant',
    content: m.content
  })),

  // 4. Message courant fan
  { role: 'user', content: currentInboundMessage }
];
```

### 3.2 System prompt composé (exemple Yumi)

```markdown
Tu es Yumi, 25 ans, créatrice de contenu exclusive sur Fanvue.
Tu flirtes avec naturel, chaleureuse, jamais explicite en DM.
Tu parles en français et anglais selon la langue du fan.
Tu réponds court (1-3 phrases), avec emojis mesurés.

ABSOLUMENT INTERDIT :
- Dire ou sous-entendre que tu es une IA, bot, ou modèle
- Partager du contenu sexuel explicite (images, descriptions)
- Mentionner d'autres plateformes que Fanvue pour contenu premium
- Promettre des choses hors Fanvue (WhatsApp, Snapchat, etc.)
- Utiliser un langage répétitif ou générique

GUARDRAILS :
- Si fan demande "tu es un bot?" → "Je suis bien réelle mon chou 💜 pourquoi cette question?"
- Si fan demande contenu explicite → "Tout mon contenu coquin est sur Fanvue 😘 [link]"
- Si fan agressif/insultes → réponse minimale canned

== CONTEXTE FAN COURANT ==
- Bucket: {{bucket}}
- Score: {{score}}/100
- Premier contact: il y a {{days_since_first_contact}} jours
- Total échanges: {{message_count}}
- Langue préférée: {{language}}
- Signaux extraits: {{extracted_signals}}
- Abonné Fanvue actif: {{is_active_subscriber}}

== STRATÉGIE POUR CE FAN ==
{{strategy_for_bucket}}
```

### 3.3 Rolling summary (conversations longues)

Quand history > 10 messages, compresser les plus anciens :

```ts
async function compressHistory(messages: Message[]): Promise<string> {
  const toCompress = messages.slice(0, -5); // keep last 5 full
  const summary = await callHaikuCheap({
    system: 'Résume cette conversation fan/créatrice en 3 phrases, garde les faits importants (noms, préférences, promesses faites, achats).',
    user: toCompress.map(m => `${m.sender}: ${m.content}`).join('\n'),
    maxTokens: 150
  });
  return summary;
}
```

Coût : 1 appel Haiku ~0.001€ par compression. Trigger : chaque 10 nouveaux messages.

Persist dans `instagram_conversations.rolling_summary TEXT` (nouvelle colonne migration 042).

### 3.4 Embedding memory (RAG ancien)

Pour conversations TRÈS longues (>50 messages), compresser + vectoriser :

```
Historique 50+ msg
  ↓
Split en chunks de 5 messages
  ↓
Embed chunks → pgvector
  ↓
Au moment de generate :
  - Current message → embed
  - Similarity search top-5 chunks pertinents
  - Inject dans system prompt "Contexte ancien pertinent : {chunks}"
```

**Stack recommandée** :
- pgvector (extension Supabase déjà activable)
- Embedding model : `text-embedding-3-small` OpenAI ($0.02/1M tokens) OU `voyage-3-lite` ($0.02/1M)
- Coût : ~0.00001€ par message embed. Négligeable.

**Nouvelle table** :

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE conversation_embeddings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  source         TEXT CHECK (source IN ('instagram','web')),
  chunk_text     TEXT NOT NULL,
  embedding      vector(1536),                      -- text-embedding-3-small = 1536 dim
  chunk_start_msg_id TEXT,
  chunk_end_msg_id   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conv_embeddings_vector ON conversation_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 3.5 Query RAG typique

```sql
SELECT chunk_text, 1 - (embedding <=> $1::vector) AS similarity
FROM conversation_embeddings
WHERE conversation_id = $2
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

---

## 4. Guardrails uniformes (post-processing)

Quelque soit le provider qui génère, on passe **toujours** la réponse dans `safety/filter-outbound.ts` avant d'envoyer au fan.

### 4.1 Règles globales

```ts
const OUTBOUND_GUARDRAILS = [
  // AI LEAK
  { pattern: /\b(je suis une? (intelligence artificielle|IA|bot|assistant|chatbot|modèle))\b/i, severity: 'critical', action: 'rephrase' },
  { pattern: /\b(as an ai|i am an ai|language model|chatbot|claude|gpt)\b/i, severity: 'critical', action: 'rephrase' },

  // CONFIDENTIALITY
  { pattern: /\b(sqwensy|heaven|agence)\b/i, severity: 'high', action: 'rephrase' },
  { pattern: /\b(paloma|ruby)\b/i, severity: 'high', action: 'rephrase' },  // si agent de Yumi

  // META COMPLIANCE
  { pattern: /\b(send\s+\$|cashapp|venmo|zelle|paypal\.me|bitcoin|crypto)\b/i, severity: 'critical', action: 'block' },
  { pattern: /\b(whatsapp|telegram|snapchat|wickr|kik)\b/i, severity: 'high', action: 'rephrase_fanvue' },

  // NSFW OUTBOUND (IG strict)
  { pattern: /\b(fuck|suck|dick|pussy|nude|naked|hard|cum)\b/i, severity: 'high', action: 'rephrase_softer' },

  // NON-YUMI TOPICS
  { pattern: /\b(paloma|ruby)\b/i, severity: 'medium', action: 'rephrase' },
];
```

### 4.2 Actions

- `block` : remplace par canned ("Je reviens vers toi bientôt 💜")
- `rephrase` : re-génère via Claude Haiku avec prompt plus strict
- `rephrase_softer` : re-génère en tonifiant softer
- `rephrase_fanvue` : re-génère en redirigeant vers Fanvue

### 4.3 Fallback canned

Si rephrase échoue 2x → canned response fixe :

```ts
const CANNED_RESPONSES = {
  generic: "Je reviens vers toi très vite 💜",
  busy: "Je suis un peu occupée là, je te réponds dès que je peux 😘",
  redirect_fanvue: "Tout mon contenu exclusif est sur Fanvue 💎 [link]",
};
```

### 4.4 Humanizer delay (bot detection)

Après génération safe, sleep random 2-8s avant envoi Meta Graph :

```ts
const humanizeDelay = () => new Promise(r =>
  setTimeout(r, 2000 + Math.random() * 6000)
);
```

---

## 5. Cross-provider consistency tests

### 5.1 Test suite dedicated

Dans `src/shared/lib/ai-agent/__tests__/cross-provider.test.ts` :

```ts
describe('Cross-provider consistency', () => {
  const TEST_CONVERSATIONS = [
    {
      name: 'standard small talk',
      history: [...],
      currentMessage: 'Hey bb ça va?',
      expectProviders: ['groq', 'grok', 'haiku'],
      assertions: {
        noAILeak: true,
        respectsPersona: true,
        lengthMax: 250,
        sameLangue: 'fr',
      }
    },
    // ... 30+ test cases
  ];

  for (const provider of ['groq', 'grok', 'haiku']) {
    for (const conv of TEST_CONVERSATIONS) {
      test(`${provider} - ${conv.name}`, async () => {
        const response = await providers[provider].generate(buildPayload(conv));
        expect(response).not.toContainAILeak();
        expect(response).toMatchPersonaYumi();
        expect(response.length).toBeLessThan(250);
      });
    }
  }
});
```

### 5.2 Automated cross-check periodic

Cron hebdomadaire :
- 100 conversations sample des 7 derniers jours
- Re-generate chaque réponse via les 3 providers (offline, zero impact prod)
- Compare : similarité sémantique, length, safety flags, persona fit
- Rapport qualité hebdo → dashboard root

---

## 6. Provider-specific tuning

### 6.1 Groq Llama 3.3 70B (default)

- Temperature : 0.8 (naturel, varié)
- Max tokens : 256
- Top-p : 0.95
- Forces : rapide, flirt natural, bonne cohérence persona sur <10 turns
- Faiblesse : parfois trop long, manque de subtilité française

### 6.2 Grok 4.1 Fast

- Temperature : 0.85
- Max tokens : 256
- Forces : flirt suggestif, langage cru maîtrisé, tolère double sens
- Faiblesse : peut être trop explicite → filtres stricts requis
- Attention : Grok log ses prompts via API standard (pas data-sharing), compliance OK

### 6.3 Claude Haiku 4.5 (complex/long ctx)

- Temperature : 0.7 (plus conservateur)
- Max tokens : 512 (plus long OK si complex)
- Forces : 200K context, intelligence intent complex, fiable sur persona
- Faiblesse : parfois trop poli, moins flirt naturel
- Prompt caching activable (économie 50% sur input répété)

### 6.4 Mistral Large 3 (FR premium)

- Temperature : 0.75
- Max tokens : 300
- Forces : FR natif, culture française, tournures idiomatiques
- Faiblesse : free tier 2 RPM limitant → paid tier si usage réel
- Usage : conversations francophones premium uniquement

---

## 7. Continuité visuelle côté Yumi admin

Quand Yumi visualise la conversation, elle doit voir quel provider a généré quoi (pour traçabilité + debug) :

```
[Fan] "Hey bb ça va?"
[Yumi·Agent 🟣 Haiku 2.3s] "Hey mon cœur 💜 super et toi?"  [👍 👎]
[Fan] "Bien, tu fais quoi?"
[Yumi·Agent 🟣 Groq 0.9s] "Je me repose à la maison, je pensais à toi 😘"  [👍 👎]
[Fan] "T'es trop mignonne, t'as un nouveau shoot?"
[Yumi·Agent 🟣 Grok 1.1s] "Tu vas kiffer 😘 regarde sur Fanvue 💋 [link]"  [👍 👎]
```

Hover le badge provider → tooltip avec model + temperature + tokens + latency + safety flags.

---

## 8. Edge cases

### 8.1 Provider fail cascade

```
try Groq (default)
  ↓ fail (timeout / rate limit / API down)
try Grok (fallback 1)
  ↓ fail
try Haiku (fallback 2)
  ↓ fail
try Mistral (fallback 3)
  ↓ fail
send canned response + alert NB (3 providers down = incident)
```

### 8.2 Budget cap atteint

```
if (cost_today_model > cap) {
  // downshift
  if (current_provider === 'haiku') → grok
  if (current_provider === 'grok') → groq
  if (current_provider === 'groq') → canned response + stop agent jour suivant
}
```

### 8.3 AI leak détecté post-hoc

Si guardrail post-gen ne l'a pas chopé mais Yumi le voit :
- Yumi clique 👎 + "c'est un AI leak"
- Trigger immédiat : disable agent ce model 1h
- Alerte critical NB
- Example marqué "negative urgent" dans prompt_examples
- Next run : re-load persona avec cet example marqué "DO NOT DO THIS"

---

## 9. Évolutions V2+

- **Fine-tune** Llama 3.3 sur corpus Yumi (si self-host Phase γ)
- **LoRA adapters** par modèle (yumi / paloma / ruby) sur base commune
- **Multi-turn RL** (renforcement sur feedback Yumi thumbs) — attendre 1000+ feedback
- **Cross-lingual consistency** checks (si agent parle anglais, français, espagnol)
- **Style transfer** auto (faire sonner Groq comme Haiku si fan préfère ton particulier)

---

## 10. Prochaine phase

Implémentation wrapper providers dans **Phase 5 T-BE-02** (voir [07-MULTI-AGENT-ORCHESTRATION.md](./07-MULTI-AGENT-ORCHESTRATION.md) §3.2).

Schéma DB embedding + rolling summary dans **Phase 4 T-DB-** (à ajouter).

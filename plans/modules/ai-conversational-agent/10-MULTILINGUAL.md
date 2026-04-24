# 10 — Multilingual (FR / EN / ES / DE / IT / PT)

> L'agent détecte automatiquement la langue du fan et répond dans la même langue, avec adaptation culturelle. Défaut FR, fallback EN.

---

## 1. Langues cibles V1

| Langue | Code ISO | Volume attendu | Priorité |
|--------|----------|----------------|----------|
| Français | `fr` | 40% (langue native Yumi) | P0 |
| Anglais | `en` | 35% (international) | P0 |
| Espagnol | `es` | 10% (Espagne + LatAm) | P1 |
| Allemand | `de` | 5% | P1 |
| Italien | `it` | 5% | P1 |
| Portugais | `pt` | 5% (Brésil surtout) | P1 |

**V2+** : Néerlandais (BE), Russe, Arabe, Chinois simplifié (sur demande).

---

## 2. Auto-détection langue

### 2.1 Pipeline

```
Message fan entre
  ↓
[1] Libraire `franc` (légère, offline, 86+ langues) détecte langue
  ↓
[2] Si confidence > 0.8 → accepte
    Si confidence < 0.8 → fallback LLM classifier (Haiku cheap)
  ↓
[3] Stocker fan.language dans agence_fans (ou update si changé)
  ↓
[4] Pour générer réponse, utiliser prompt/provider adapté à langue
```

### 2.2 Edge cases

- **Message courts** (<5 mots) : pas fiable → look at conversation history pour persist dernière langue détectée
- **Code-switching** (FR + anglais mélangé, courant en BE) : détecter langue dominante, autorise mélange
- **Emojis seuls** : pas de langue → réponse dans langue préférée du fan (historique)

### 2.3 Library recommandée

`franc-min` (10KB) détecte top 50 langues offline. Gratuit, pas d'API call.

```ts
import { franc } from 'franc-min';
const lang = franc(text);  // ISO 639-3 → map vers ISO 639-1
```

Alternative : appel LLM Haiku pour détection + confidence en JSON.

---

## 3. System prompts par langue

### 3.1 Structure

Un seul **persona global** (Yumi), **6 variantes linguistiques** du system prompt qui préservent traits mais adaptent registre/idioms/emojis.

**Fichiers** :
```
prompts/
├── persona-yumi-base.md         — persona unique cross-language
├── persona-yumi-fr.md           — adaptation FR (idiomes, familier français)
├── persona-yumi-en.md           — adaptation EN (casual American English)
├── persona-yumi-es.md           — adaptation ES (Spain + flexibilité LatAm)
├── persona-yumi-de.md           — adaptation DE (ton direct allemand)
├── persona-yumi-it.md           — adaptation IT (effusif italien)
└── persona-yumi-pt.md           — adaptation PT (Brésil surtout, intimité pt-BR)
```

### 3.2 Exemple FR vs EN

**Base (invariant)** :
- Persona Yumi, créatrice contenu exclusive Fanvue
- 25 ans, chaleureuse, flirt naturel
- Pas d'IA leak, pas de NSFW explicite en DM
- Redirige contenu premium vers Fanvue

**FR-specific** :
- Tutoiement par défaut
- "mon cœur", "bb", "mon chou", "coucou"
- Emojis : 💜🥰😘🔥💋
- Phrases courtes, un peu familières

**EN-specific** :
- Casual American English
- "babe", "hun", "sweetheart"
- Emojis : 💕🔥😘💋🥺
- Slight coquette tone

**ES-specific** :
- Tutoiement (tú, pas usted)
- "mi amor", "corazón", "cariño", "guapo"
- Emojis : ❤️🔥💋😘🥰
- Passionate warmth

**DE-specific** :
- "Hey Schatz", "Süßer"
- Plus direct, moins fleur bleue
- Emojis sobres : 💋🔥😉

**IT-specific** :
- "amore", "tesoro", "bello"
- Très expressif, beaucoup d'emojis
- Phrases plus longues ok

**PT-BR** :
- "amor", "gato", "bebê"
- Très intime, emojis nombreux
- Casual Brésilien (pas portugais strict PT-PT)

### 3.3 Insertion dans système prompt runtime

```ts
function buildSystemPrompt(persona: AgentPersona, fan: Fan): string {
  const base = persona.base_prompt;                          // invariant
  const langSpecific = loadLangAdaptation(fan.language);     // fr/en/es/...
  const context = buildFanContext(fan);                      // bucket, score, history
  return `${base}\n\n${langSpecific}\n\n${context}`;
}
```

---

## 4. Provider selection par langue

| Langue | Provider Primary | Provider Fallback | Raison |
|--------|------------------|-------------------|--------|
| FR | Mistral Large 3 OU Groq Llama | Grok 4.1 Fast | Mistral FR natif, Llama bien, Grok OK |
| EN | Groq Llama 3.3 | Grok 4.1 Fast | Default stack, tous excellents |
| ES | Groq Llama 3.3 | Grok 4.1 Fast | Llama 3.3 bon ES, Grok OK |
| DE | Groq Llama 3.3 | Mistral Large 3 | Llama couvre bien, Mistral alternative |
| IT | Groq Llama 3.3 | Mistral Large 3 | Llama OK, Mistral culture latine |
| PT | Groq Llama 3.3 | Grok 4.1 Fast | Llama couvre PT-BR, sans spécialiste |
| Autres | Groq Llama 3.3 | Claude Haiku | Fallback vers plus polyvalent |

**Règle** : si budget Mistral (free tier limité 2 RPM en prod), Mistral FR uniquement pour conversations HOT/EXISTING (haute valeur).

---

## 5. Adaptation culturelle au-delà de la langue

### 5.1 Signaux culturels à détecter

- **Pays** via IP / bio IG / timezone fan
- **Usage timezone** : saluer "bonjour" le matin, "bonsoir" le soir (heure fan, pas Yumi)
- **Références culturelles** : éviter citer trucs uniquement FR pour fan EN
- **Taboos** : certains pays = flirt direct mal perçu (Allemagne pudique, Japon réservé)

### 5.2 Matrice tonalité par pays

| Pays | Directness | Flirt intensity | Ton préféré |
|------|:-:|:-:|---|
| FR / BE / CH | 7 | 7 | Playful, charmeur |
| US / UK / CA | 6 | 6 | Casual, friendly |
| ES / MX / AR | 8 | 8 | Passionate, warm |
| DE / AT | 6 | 4 | Direct, pas trop fleur bleue |
| IT | 9 | 8 | Effusif, romantique |
| BR | 8 | 8 | Intime, chaleureux |
| JP / KR | 4 | 3 | Réservé, poli |
| MENA | 5 | 3 | Prudent (flirt léger, ne pas risquer) |

Ces paramètres injectés dans system prompt :
```
Fan country: BR
Culture adjustment: warmth 8/10, flirt 8/10, physical emojis ok
```

---

## 6. Tests cross-lingual cohérence

### 6.1 Test suite

30 scénarios × 6 langues = 180 tests automatisés :

```ts
describe('Cross-lingual persona consistency', () => {
  const SCENARIOS = [
    { input: { fr: 'Hey bb tu fais quoi?', en: 'Hey babe what are you doing?', es: 'Hola cariño, ¿qué haces?', ... } },
    // ...
  ];

  for (const scenario of SCENARIOS) {
    for (const lang of ['fr','en','es','de','it','pt']) {
      test(`persona consistent - ${lang} - ${scenario.name}`, async () => {
        const resp = await agent.reply({ input: scenario.input[lang], fanLang: lang });

        expect(resp.language).toBe(lang);
        expect(resp).not.toContainAILeak();
        expect(resp).toMatchPersonaTraits(PERSONA_YUMI);
        expect(resp.length).toBeLessThan(250);
      });
    }
  }
});
```

### 6.2 Review manuelle native speakers

**Phase 10 QA** : NB recrute 1 native speaker par langue (ES/DE/IT/PT) pour valider 10 exemples chacun. Budget : ~50€/langue via Upwork ou connaissances.

---

## 7. Switching de langue mid-conversation

### 7.1 Cas

Fan parle anglais pendant 5 messages, puis passe en français (découvre Yumi FR).

**Comportement agent** : détecte switch, s'adapte au nouveau message, garde le contexte.

### 7.2 Implémentation

```ts
// Dans runAgent()
const lastLang = fan.language;                              // persist
const currentLang = detectLanguage(currentMessage);
if (currentLang !== lastLang) {
  // Log event
  await logLanguageSwitch(fan.id, lastLang, currentLang);
  fan.language = currentLang;
  await db.update(fan);
}
// Use currentLang in prompt
```

### 7.3 Message de transition

Si switch détecté, agent peut acknowledger implicite :
- `fan` : "You speak French?"
- `agent` (switching à FR) : "Mais oui mon chou, je parle plusieurs langues 💜 tu préfères qu'on continue en français?"

---

## 8. Emoji & ponctuation par culture

### 8.1 Database d'emojis par langue

```sql
CREATE TABLE lang_emoji_preferences (
  language TEXT PRIMARY KEY,
  heart_emojis TEXT[],     -- ['💜','❤️','💕']
  flirt_emojis TEXT[],     -- ['😘','😉','🥰']
  fire_emojis TEXT[],      -- ['🔥','💯']
  typical_rate NUMERIC     -- 0.7 = 70% chance emoji par réponse
);
```

Variations :
- FR : 1-2 emojis par message, plutôt cœurs
- EN : rate plus élevé, mix diverse
- ES/IT : beaucoup d'emojis, rouges/coeurs/feu
- DE : sobres, 1 emoji max
- JP : stickers mais pas d'emojis adultes

### 8.2 Injection dans prompt

```
Your emoji preferences for this fan's language ({lang}):
- Hearts: {heart_emojis}
- Flirt: {flirt_emojis}
- Use emojis at ~{typical_rate*100}% of messages
```

---

## 9. Fallback langue inconnue

Si `franc` retourne une langue non supportée (p.ex. coréen, arabe, russe) :

**Option A (recommandé V1)** : répondre en anglais avec phrase d'excuse
```
"Hey! I speak mainly French, English, Spanish, German, Italian and Portuguese. 
 Can we chat in one of those? 💜"
```

**Option B (V2+)** : ajouter support dynamique via prompt traduction Haiku

---

## 10. DB schema extension

```sql
ALTER TABLE agence_fans ADD COLUMN
  language TEXT DEFAULT 'fr',
  language_confidence NUMERIC(3,2),
  country_code TEXT,                        -- ISO 3166-1 alpha-2
  timezone_hint TEXT,                       -- 'Europe/Paris', extracted hint
  cultural_adjustments JSONB DEFAULT '{}';  -- {directness: 7, flirt: 8, ...}

-- Events log
CREATE TABLE fan_language_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID REFERENCES agence_fans(id),
  old_lang TEXT,
  new_lang TEXT,
  confidence NUMERIC(3,2),
  triggered_by TEXT,                        -- 'franc' | 'llm_classifier' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. Coût impact

Multilingue n'augmente pas le coût IA significativement :
- Token count similaire cross-language (sauf DE/FI qui ont +15% tokens en moyenne)
- Providers multilingues de base (Llama 3.3, Grok, Haiku) — pas de surcoût
- Seul coût additionnel : embedding lang detection LLM fallback (~1% des cas) = négligeable

---

## 12. Prochaine phase

Implémentation dans **Phase 5 T-BE-11** (lang detection + prompt adaptation).
Prompt files FR/EN dans **Phase 1 T-AI-05** (prioritaires).
Prompts ES/DE/IT/PT dans **Phase 9** (avec duplication Paloma/Ruby qui auront aussi multilingue).

Voir [07-MULTI-AGENT-ORCHESTRATION.md](./07-MULTI-AGENT-ORCHESTRATION.md) pour dispatch tickets AI/Prompts agent.

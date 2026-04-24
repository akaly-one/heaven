# 12 — Persona Tuning (profil IA ajustable par modèle)

> Yumi (puis Paloma/Ruby) peuvent tuner finement leur persona agent en temps réel via UI : humeur du jour, intensité flirt, niveau familiarité, préset moods. L'agent reflète l'humeur de la modèle réelle.

---

## 1. Concept

Chaque modèle a **sa voix**. Yumi est chaleureuse-playful, Paloma pourrait être timide-mystérieuse, Ruby dominante-assumée.

Mais une même personne varie selon son humeur : aujourd'hui fatiguée (ton plus doux), demain confiante (plus flirt), en promo (plus pushy).

**Solution** : config persona en deux niveaux :
- **Base (persistent)** : traits fondamentaux du personnage (changeent rarement)
- **Mood/Mode (journalier)** : humeur du jour, modifiable en 1 clic

---

## 2. Modèle de données persona

### 2.1 Extension `agent_personas`

```sql
ALTER TABLE agent_personas ADD COLUMN
  -- Base traits (0-10 scales)
  trait_warmth         SMALLINT DEFAULT 7,   -- chaleur humaine
  trait_flirt          SMALLINT DEFAULT 6,   -- intensité flirt
  trait_dominance      SMALLINT DEFAULT 4,   -- dominance/soumission
  trait_humor          SMALLINT DEFAULT 7,   -- humour/jokes
  trait_mystery        SMALLINT DEFAULT 3,   -- mystère/distance
  trait_intellectual   SMALLINT DEFAULT 5,   -- profondeur conversation
  trait_vulgarity      SMALLINT DEFAULT 2,   -- langage cru (0=pudique 10=trash)
  trait_empathy        SMALLINT DEFAULT 8,   -- attention émotionnelle
  trait_directness     SMALLINT DEFAULT 6,   -- direct vs évasive
  trait_energy         SMALLINT DEFAULT 7,   -- énergie/enthousiasme

  -- Default mood / mode
  default_mood         TEXT DEFAULT 'playful',

  -- Signature markers (style Yumi)
  favorite_endings     TEXT[] DEFAULT '{}',   -- ['mon cœur','bb','mon chou']
  favorite_emojis      TEXT[] DEFAULT '{}',   -- ['💜','🥰','😘','🔥']
  avg_message_length   SMALLINT DEFAULT 42,   -- chars
  emoji_rate           NUMERIC(3,2) DEFAULT 0.7;
```

### 2.2 Table `persona_moods` (états journaliers)

```sql
CREATE TABLE persona_moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  mood_label TEXT NOT NULL,                  -- 'playful','sensual','mysterious','caring','dominant','submissive','tired','euphoric','promo'
  description TEXT,                          -- "Yumi se sent chill aujourd'hui, plus douce"
  
  -- Deltas appliqués aux traits de base (signed)
  trait_warmth_delta     SMALLINT DEFAULT 0,
  trait_flirt_delta      SMALLINT DEFAULT 0,
  trait_dominance_delta  SMALLINT DEFAULT 0,
  trait_humor_delta      SMALLINT DEFAULT 0,
  trait_mystery_delta    SMALLINT DEFAULT 0,
  trait_energy_delta     SMALLINT DEFAULT 0,
  
  -- Activation
  is_active_until TIMESTAMPTZ,              -- null = permanent, else expire
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_by TEXT,                         -- 'yumi','root','auto-schedule'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_persona_moods_active ON persona_moods(model_slug, is_active_until) 
  WHERE is_active_until IS NULL OR is_active_until > NOW();
```

### 2.3 Presets moods (seed)

```sql
INSERT INTO persona_moods (model_slug, mood_label, description, trait_warmth_delta, trait_flirt_delta, trait_mystery_delta, trait_energy_delta) VALUES
  ('yumi', 'playful',     'Yumi playful par défaut, joueuse et légère',          0, 0,  0, 0),
  ('yumi', 'sensual',     'Yumi sensuelle, intensité flirt x1.5',                0, +2, 0, 0),
  ('yumi', 'mysterious',  'Yumi mystérieuse, distance, plus rare dans messages', -1, 0, +3, -1),
  ('yumi', 'caring',      'Yumi attentive, mode après-midi douce',               +2, -1, 0, 0),
  ('yumi', 'dominant',    'Yumi affirmée, direct, assume',                       0, +1, 0, +1),
  ('yumi', 'euphoric',    'Yumi après un bon shoot, pleine d''énergie',          +1, +2, 0, +3),
  ('yumi', 'tired',       'Yumi fatiguée, réponses plus courtes et douces',      +1, -2, 0, -3),
  ('yumi', 'promo',       'Yumi en mode promo Fanvue, pusher ++',                0, +1, 0, +2);
```

---

## 3. UI — Dashboard persona tuning

### 3.1 Page `/agence/agent-training` — onglet Persona

**Section 1 : Base traits (ajustables rarement)**
```
┌─ Traits de base Yumi ──────────────────────────────────────┐
│                                                             │
│ Warmth (chaleur humaine)                                    │
│ [░░░░░░░▓▓▓░] 7/10    [?]                                  │
│                                                             │
│ Flirt intensity                                             │
│ [░░░░░░▓▓▓▓░] 6/10                                          │
│                                                             │
│ Dominance                                                   │
│ [░░░░▓▓▓░░░░] 4/10                                          │
│                                                             │
│ Humor                                                       │
│ [░░░░░░░▓▓▓░] 7/10                                          │
│                                                             │
│ Mystery                                                     │
│ [░░░▓░░░░░░░] 3/10                                          │
│                                                             │
│ Intellectual depth                                          │
│ [░░░░░▓░░░░░] 5/10                                          │
│                                                             │
│ Vulgarity                                                   │
│ [░░▓░░░░░░░░] 2/10                                          │
│                                                             │
│ Empathy                                                     │
│ [░░░░░░░░▓▓░] 8/10                                          │
│                                                             │
│ Directness                                                  │
│ [░░░░░░▓▓▓▓░] 6/10                                          │
│                                                             │
│ Energy                                                      │
│ [░░░░░░░▓▓▓░] 7/10                                          │
│                                                             │
│ [Preview réponse avec ces traits] [Sauvegarder base]       │
└─────────────────────────────────────────────────────────────┘
```

**Section 2 : Mood du moment (changeable en 1 clic)**
```
┌─ Mood actuel : 😊 Playful ─────────────────────────────────┐
│                                                             │
│ Presets (1 clic pour switch) :                             │
│ [😊 Playful *] [🔥 Sensual] [🌙 Mysterious] [🥰 Caring]    │
│ [👑 Dominant] [😋 Euphoric] [😴 Tired] [💎 Promo]          │
│                                                             │
│ [+ Créer mood custom]                                       │
│                                                             │
│ Expire dans : [● Permanent] [○ 1h] [○ 24h] [○ jusqu'à X]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Section 3 : Auto-schedule moods**
```
┌─ Horaires auto (optionnel) ────────────────────────────────┐
│                                                             │
│ Lun-Ven  08:00-12:00 → 😊 Playful                          │
│ Lun-Ven  12:00-18:00 → 💎 Promo                            │
│ Lun-Ven  18:00-23:00 → 🔥 Sensual                          │
│ Sam-Dim  00:00-23:59 → 😋 Euphoric                         │
│                                                             │
│ [+ Ajouter créneau] [Reset]                                │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Widget "Mood actuel" dans header messagerie

Petite pastille colorée + emoji visible toujours :
- `😊 Playful · jusqu'à minuit` · [▾ changer]

Clic → dropdown mini presets → change en 1 sec.

---

## 4. Adaptation prompt system runtime

### 4.1 Composition finale

```ts
function buildSystemPrompt(persona: AgentPersona, fan: Fan): string {
  const activeMood = getActiveMood(persona.model_slug);   // DB query active mood

  const effectiveTraits = {
    warmth:      clamp(persona.trait_warmth + (activeMood?.trait_warmth_delta ?? 0), 0, 10),
    flirt:       clamp(persona.trait_flirt + (activeMood?.trait_flirt_delta ?? 0), 0, 10),
    // ...
  };

  return `${persona.base_prompt}

== TRAITS DE PERSONNALITÉ (0-10) ==
- Chaleur humaine: ${effectiveTraits.warmth}/10
- Flirt intensity: ${effectiveTraits.flirt}/10
- Dominance: ${effectiveTraits.dominance}/10
- Humor: ${effectiveTraits.humor}/10
- Mystery: ${effectiveTraits.mystery}/10
- Empathy: ${effectiveTraits.empathy}/10
- Directness: ${effectiveTraits.directness}/10
- Energy: ${effectiveTraits.energy}/10
- Vulgarity: ${effectiveTraits.vulgarity}/10 (NEVER exceed 3 for IG, 5 for Fanvue)

== MOOD ACTUEL ==
${activeMood?.mood_label ?? 'playful'}: ${activeMood?.description ?? ''}

== STYLE SIGNATURE ==
- Expressions favorites en fin de phrase: ${persona.favorite_endings.join(', ')}
- Emojis préférés: ${persona.favorite_emojis.join(' ')}
- Longueur moyenne: ~${persona.avg_message_length} chars
- Rate emojis: ~${persona.emoji_rate * 100}% des messages

Adapte ton style aux traits ci-dessus. Si trait élevé = amplifier ce côté. Si faible = atténuer.

${existingContextBuildPrompt(fan)}
`;
}
```

### 4.2 Interprétation runtime par le provider

LLM reçoit traits numériques + exemples. Il fait la synthèse.

Exemple : `warmth=9, flirt=8, mystery=1, mood=sensual`
→ LLM comprendra "très chaleureuse, très flirt, pas mystérieuse, mood sensuel"
→ Réponse : *"Mon chou 💋 je pense à toi là... tu fais quoi?"*

Exemple : `warmth=4, flirt=3, mystery=8, mood=mysterious`
→ LLM : "distante, peu flirt, très mystérieuse"
→ Réponse : *"On verra bien... 😏"*

### 4.3 Tests calibration

Phase 10 QA : 20 combos traits × 5 messages → reviewer humain valide que le ton matche la config.

---

## 5. Mood automatique basé sur contexte fan

### 5.1 Mood adapté au bucket

Override mood global par mood contextuel selon bucket fan :

| Bucket fan | Mood contextuel overlay | Raison |
|------------|-------------------------|--------|
| HOT | Boost directness + flirt + promo +1 | Conversion ready |
| WARM | Preserve mood global | Nurturing balance |
| COLD | Boost warmth + mystery + empathy +1 | Discovery phase |
| TROLL | Override vers "minimal caring" | Canned responses, pas engage |
| EXISTING | Boost warmth + familiarity | Intimité fidélité |
| CHURN_RISK | Override vers "caring + vulnerable" | Reconquête émotionnelle |

### 5.2 Implémentation

```ts
function applyBucketMoodOverlay(baseTraits, bucket) {
  switch (bucket) {
    case 'hot':
      return { ...baseTraits, directness: min(10, baseTraits.directness + 2), flirt: min(10, baseTraits.flirt + 1) };
    case 'cold':
      return { ...baseTraits, warmth: min(10, baseTraits.warmth + 1), mystery: min(10, baseTraits.mystery + 1) };
    case 'churn_risk':
      return { ...baseTraits, warmth: 10, empathy: 10, flirt: max(0, baseTraits.flirt - 2) };
    // ...
  }
}
```

---

## 6. Presets moods — définitions

### 6.1 😊 Playful (default Yumi)
```
Description : Yumi joueuse, légère, taquine
Deltas : aucun (base traits)
Exemple : "Hey bb 💜 tu fais quoi de beau?"
```

### 6.2 🔥 Sensual
```
Description : Yumi sensuelle, plus intense, suggérant plus
Deltas : flirt +2, warmth 0, energy 0
Exemple : "Mmh mon chou 🔥 je pensais à toi là..."
```

### 6.3 🌙 Mysterious
```
Description : Yumi distante, énigmatique, rare dans ses réponses
Deltas : warmth -1, mystery +3, energy -1
Exemple : "On verra... 😏"
```

### 6.4 🥰 Caring
```
Description : Yumi attentive, douce, à l'écoute
Deltas : warmth +2, flirt -1, empathy +2
Exemple : "Ça va bb? Comment tu te sens aujourd'hui 💜"
```

### 6.5 👑 Dominant
```
Description : Yumi assumée, directive, sûre d'elle
Deltas : dominance +3, directness +2
Exemple : "Je sais ce que tu veux 😏 viens sur Fanvue 💋"
```

### 6.6 😋 Euphoric
```
Description : Yumi pleine d'énergie (post-shoot, bonne journée)
Deltas : energy +3, flirt +2, warmth +1
Exemple : "OMG j'ai fait le shoot le plus ouf aujourd'hui 🔥🔥 tu vas adorer!"
```

### 6.7 😴 Tired
```
Description : Yumi fatiguée, réponses courtes et douces
Deltas : energy -3, flirt -2, warmth +1
Exemple : "Hey 🥱 journée intense là... tu me racontes?"
```

### 6.8 💎 Promo
```
Description : Yumi en mode promo Fanvue, pushy mais naturelle
Deltas : directness +2, energy +2, flirt +1
Exemple : "J'ai une offre spéciale 48h 🔥 viens sur Fanvue mon chou [link]"
```

---

## 7. Custom moods

Yumi peut créer ses propres moods custom :

```
┌─ Nouveau mood custom ──────────────────────────────────────┐
│ Label: [Je Kiffe Paris]                                    │
│ Description: [Yumi en weekend Paris, exaltée, joyeuse]    │
│                                                             │
│ Deltas (relative to base):                                 │
│ Warmth:      [−2 ] [■ 0] [+2]  → +1                        │
│ Flirt:       [−2 ] [■ 0] [+2]  → +1                        │
│ Energy:      [−2 ] [■ 0] [+2]  → +2                        │
│ ...                                                         │
│                                                             │
│ [Aperçu réponse sandbox] [Sauvegarder mood]               │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Audit trail moods

Table `mood_activation_log` :

```sql
CREATE TABLE mood_activation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  mood_id UUID REFERENCES persona_moods(id),
  activated_by TEXT,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  msgs_sent_during INT DEFAULT 0,        -- how many responses with this mood
  avg_response_time_ms INT,
  conversion_count INT DEFAULT 0        -- conversions attributed during this mood
);
```

Dashboard : quelle mood convertit le plus / est préférée par Yumi ?

---

## 9. Multi-modèle : personas indépendants

Chaque model_slug (yumi, paloma, ruby) = persona complet indépendant.

Dispatch : au dispatch Phase 9 duplication, seed defaults different :

**Paloma (m2)** :
- warmth 6, flirt 5, dominance 2, mystery 7, vulnerability 8
- mood default : "shy"
- signature : "mon ange", emojis 🥺💕

**Ruby (m3)** :
- warmth 5, flirt 8, dominance 8, energy 9
- mood default : "dominant"
- signature : "bb", emojis 🔥💋👑

Configurable par chaque modèle/NB.

---

## 10. Évolutions V2+

- **Mood suggestions auto** basées sur :
  - Heure de la journée (morning = playful, late night = sensual)
  - Jour de la semaine
  - Événements (après pub IG = energy boost)
  - Saison (summer = tan/beach vibes, winter = cozy)

- **Mood A/B testing** : rotate 2 moods sur 2 cohortes fans même bucket, mesure conversion

- **Mood-responsive emojis** : base emoji set + mood-specific additions

- **Persona versioning** (comme prompt) : rollback traits si dégrade conversion

---

## 11. Prochaine phase

Schéma persona traits + moods dans **Phase 4 T-DB-11**.
UI persona tuning dans **Phase 7** (page agent-training étendue).
Logic runtime dans **Phase 5 T-BE-13** (buildSystemPrompt avec mood overlay).

Voir [02-DESIGN.md](./02-DESIGN.md) pour wireframes UI.
Voir [06-LEAD-SCORING.md](./06-LEAD-SCORING.md) pour lien bucket × mood overlay.

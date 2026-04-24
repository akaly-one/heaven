# 14 — Voice / Audio Generation (Phase V2 backlog)

> **Statut** : plan V2 post-launch — implémentation après V1 DM texte stabilisée et rentable.
> **Objectif** : agent envoie messages AUDIO dans la voix de Yumi (voice clone) pour fidélisation forte.

---

## 1. Vision & valeur business

### 1.1 Pourquoi audio

- **Engagement ×3-5** (études Fanvue / OF 2025-2026) : fans considèrent audio comme "preuve d'authenticité" = conversion Fanvue ++
- **Différenciation** : 95% créatrices n'ont pas voix IA → avantage compétitif Yumi
- **Intimité** : message audio perçu plus personnel qu'écrit
- **Scaling** : Yumi ne peut pas enregistrer 500 audios/jour — IA devient le seul moyen

### 1.2 Risques

- **Détection bot** : si audio trop parfait → suspicion (TTS 2026 passe Turing, mais bruits de fond + hésitations humaines importantes)
- **Meta compliance** : même règles NSFW que texte (aucun explicite IG)
- **Voice clone éthique** : Yumi doit consentir, audio source privé
- **Coût** : TTS cloning ~10-50x plus cher que texte → budget +100€/mois à volume

---

## 2. Options providers TTS voice cloning 2026

| Provider | Qualité | Voice cloning | Coût /1M chars | Latence | API |
|----------|---------|---------------|----------------|---------|-----|
| **ElevenLabs** | 🏆 Meilleure | ✅ Instant Clone (30s audio) + Professional (1h audio) | $30-99/mois Creator → Pro | <500ms | Stable |
| **PlayHT** | Excellente | ✅ Instant + Pro voice cloning | $31-99/mois | <700ms | Stable |
| **Cartesia Sonic** | Très bonne | ✅ Cloning | $5-50/mois | **<100ms** (low latency) | Stable |
| **Resemble AI** | Excellente | ✅ Avancé (emotions + multi-lang) | $29-99/mois | ~800ms | Stable |
| **OpenAI TTS-1-HD** | Très bonne | ❌ Voix fixes seulement | $30/1M chars | ~500ms | Stable |
| **Coqui TTS (open-source)** | Bonne | ✅ XTTS v2 cloning | Self-host GPU $20-50/mois | Variable | Self-hosted |
| **Bark (Suno)** | Expressive | ✅ (limité) | Self-host | Lent (~3s/1s audio) | Self-hosted |

**Recommandation V2** :
- **ElevenLabs** pour qualité max (~30€/mois Creator plan) — voice clone Yumi ~30s audio source
- **Cartesia Sonic** si budget serré + latence critique
- **Coqui TTS self-host** si volume explose (Phase γ/δ scaling)

---

## 3. Voice cloning Yumi — process

### 3.1 Source audio

Yumi enregistre **30 secondes à 10 minutes** de sa voix dans des conditions variées :
- Voix neutre (lecture texte)
- Voix whisper/sensuel
- Voix énergique/joyeuse
- Voix fatiguée/douce
- Multi-langue si Yumi parle FR/EN/ES (pour support multilingue agent — doc 10)

### 3.2 Upload provider

ElevenLabs Instant Voice Clone :
- Upload MP3/WAV via API ou UI
- Génère voice_id unique
- Utilisable immédiatement

ElevenLabs Professional Clone (pour V3+ qualité premium) :
- Upload 1h+ audio haute qualité
- Process 48h (fine-tune propriétaire)
- Qualité supérieure, emotions nuancées

### 3.3 Stockage voice_id

```sql
CREATE TABLE voice_samples (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug        TEXT NOT NULL,                    -- yumi / paloma / ruby
  provider          TEXT NOT NULL,                    -- 'elevenlabs' | 'cartesia' | 'coqui'
  provider_voice_id TEXT NOT NULL,                    -- voice_id retourné par provider
  language          TEXT,                             -- 'fr', 'en', 'multi'
  style             TEXT,                             -- 'neutral', 'sensual', 'energetic', 'whisper'
  is_active         BOOLEAN DEFAULT TRUE,
  is_default        BOOLEAN DEFAULT FALSE,
  source_audio_url  TEXT,                             -- Cloudinary URL source (backup)
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 1 voice par style + langue
CREATE UNIQUE INDEX idx_voice_samples_default ON voice_samples(model_slug, language, style) WHERE is_active = TRUE;
```

---

## 4. Architecture backend audio

### 4.1 Pipeline génération audio

```
Agent decide : send audio ?
  ↓
[1] Check trigger (voir §5 décision quand envoyer audio)
  ↓
[2] Generate texte response normalement via runAgent()
  ↓
[3] Adapter texte pour TTS :
    - Remove URLs (ne pas "dire" l'URL complète)
    - Remove émojis textuels (ou remplacer par pause/intonation)
    - Add SSML tags si supporté (pauses, emphase)
    - Adapter mood → choose voice_id style (sensuel/energetic/etc.)
  ↓
[4] Call TTS provider (ElevenLabs) avec :
    - voice_id (Yumi correspondant langue+style)
    - text adapted
    - model : eleven_multilingual_v2 (supporte FR/EN/ES/DE/IT/PT)
    - voice_settings : stability 0.4, similarity 0.8
  ↓
[5] Reçoit MP3 stream
  ↓
[6] Upload Cloudinary → URL persistante
  ↓
[7] Send via Meta Graph API (attachment type=audio)
  OR via web inbox (audio player inline)
  ↓
[8] Persist ai_runs.audio_url + log cost
```

### 4.2 Nouvelles tables

```sql
ALTER TABLE ai_runs ADD COLUMN
  audio_url TEXT,                          -- Cloudinary URL si audio généré
  audio_duration_ms INT,
  audio_cost_usd NUMERIC(10,6);

CREATE TABLE voice_generation_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_run_id          UUID REFERENCES ai_runs(id),
  voice_sample_id    UUID REFERENCES voice_samples(id),
  text_input         TEXT,
  char_count         INT,
  cost_usd           NUMERIC(10,6),
  latency_ms         INT,
  audio_url          TEXT,
  audio_duration_ms  INT,
  safety_flags       JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Safety adapté

- **Listening pass** : avant envoyer, ré-écouter via STT (Whisper cheap) pour vérifier l'IA n'a pas déviée (rare mais possible avec TTS)
- **URL removal check** : pas d'URL dans audio (Meta flag si détectée lecture)
- **Emotion check** : detection ton incohérent (ex: dit "je suis triste" mais voix joyeuse)

---

## 5. Décision : quand envoyer audio vs texte ?

### 5.1 Triggers recommandés

Audio déclenché seulement dans certains cas :

| Trigger | Raison |
|---------|--------|
| Fan bucket = HOT ou EXISTING | ROI max (fans engagés) |
| Message agent > 15 mots | Audio pertinent pour longer messages |
| Yumi mood = sensual / caring | Voix porte l'émotion |
| Fan demande explicitement "envoie moi un audio" | User opt-in |
| 10-20% random base rate | Surprise/delight (pas trop souvent) |

### 5.2 Triggers à éviter

- Fan bucket = TROLL / JUNK → waste budget
- Message très court (<5 mots) → texte OK
- Messages administratifs (confirmation, link only)
- Fan a explicitement dit "pas d'audio"
- Budget audio mensuel > cap

### 5.3 Implementation

```ts
function shouldSendAudio(fanBucket, moodLabel, responseLength, fanPrefs): boolean {
  if (fanPrefs.no_audio) return false;
  if (fanBucket === 'troll' || fanBucket === 'junk') return false;
  if (responseLength < 5) return false;
  if (!budgetAudioAvailable()) return false;

  // Explicit request
  if (lastFanMsg.mentions(['envoie audio', 'vocal', 'voice note'])) return true;

  // HOT bucket more frequent
  if (fanBucket === 'hot') return Math.random() < 0.4;     // 40%
  if (fanBucket === 'existing') return Math.random() < 0.3; // 30%
  if (fanBucket === 'warm') return Math.random() < 0.15;    // 15%

  return Math.random() < 0.05;  // 5% base rate cold
}
```

---

## 6. Multi-langue voice cloning

Yumi doit pouvoir envoyer audio en FR, EN, ES, DE, IT, PT.

**Options** :
- **ElevenLabs `eleven_multilingual_v2`** : 1 seul voice_id supporte 29 langues (recommandé)
- **Cartesia multilingual** : même approche
- **Variante** : enregistrer Yumi dans chaque langue → voice_id par langue (qualité max mais coûteux)

**Recommandation V2** : 1 voice_id multilingue ElevenLabs + tests qualité par langue. Si qualité insuffisante dans certaines langues → upgrade vers voice_id dédié plus tard.

---

## 7. Coûts estimés

### 7.1 Tarification ElevenLabs (Creator 2026)

- **Creator** $30/mois : 250K chars (env. 30 min audio) + custom voice
- **Pro** $99/mois : 500K chars + 160 voices

### 7.2 Estimation volumes

**Hypothèses V2** :
- 15k msg/mois total actuel
- ~20% trigger audio = 3000 audios/mois
- Audio moyen 100 chars = 300K chars/mois

**Coût** :
- Creator plan = $30 pour 250K chars (dépassement $0.00024/char = ~$12 add)
- **Total : ~42 USD/mois = ~38 EUR/mois**

### 7.3 Alternative low-cost

Cartesia Sonic : $5/mois base + pay-per-use → ~$15-20/mois total à volume équivalent.

### 7.4 Budget adjusted

V2 budget IA : **~50€/mois** (texte) + **~40€/mois** (audio) = **~90€/mois**

Sous cap Heaven 100€/mois. Si explose → cap sur triggers (réduire % audio par bucket).

---

## 8. UI Yumi — gestion voice

### 8.1 Page `/agence/agent-training` → onglet **Voice**

```
┌─ Voice configuration — Yumi ─────────────────────────────────┐
│                                                               │
│ Voice samples actives :                                      │
│                                                               │
│ 🎙 Yumi Neutral · ElevenLabs · multilingual                  │
│    [▶ Test: "Hey mon cœur comment tu vas"]                   │
│    [🗑 Désactiver]                                           │
│                                                               │
│ 🎙 Yumi Sensual · ElevenLabs · multilingual                  │
│    [▶ Test]                                                  │
│                                                               │
│ [+ Upload nouvelle voix] [Configurer trigger logic]          │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ Budget audio ce mois : 23€ / 50€ (47%)                       │
│ Audios envoyés : 1847 / 3000 estimé                          │
│ Conversion rate audio vs texte : 22% vs 14% (+56%)           │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 Upload nouvelle voix

- Upload MP3/WAV 30s-10min
- Label (Neutral/Sensual/Energetic/etc.)
- Langue cible (ou multi)
- API call ElevenLabs → voice_id
- Stocker dans `voice_samples`
- Test sample auto-généré + Yumi valide

### 8.3 Trigger config

Yumi peut ajuster les % par bucket :
- HOT : 40% → slider 0-100
- WARM : 15% → slider
- etc.

---

## 9. Intégration cross-channel

### 9.1 Instagram DM

Meta Graph API supporte envoi audio en attachment :
```json
{
  "recipient": { "id": "..." },
  "message": {
    "attachment": {
      "type": "audio",
      "payload": {
        "url": "https://cloudinary.heaven/yumi/audio/xxx.mp3",
        "is_reusable": false
      }
    }
  }
}
```

Limites Meta :
- Audio max 25MB (largement suffisant pour 1-2 min)
- Format MP3, M4A supportés
- Même fenêtre 24h applicable

### 9.2 IG Story replies

Impossible d'envoyer audio en réponse à story reply via API standard (limitations Meta 2026).
→ Audio uniquement en DM standard.

### 9.3 Web profile

`/m/yumi` messagerie → rendu audio player HTML5 inline :
```html
<audio controls>
  <source src="https://cloudinary.heaven/yumi/audio/xxx.mp3" type="audio/mpeg">
</audio>
```

Style Fanvue-like : waveform animé + play/pause + durée.

---

## 10. Anti-patterns

### 10.1 ❌ Audio trop parfait

TTS 2026 passe souvent Turing mais :
- **Ajouter bruits de fond légers** (ambiance café, chambre) via Cloudinary post-processing
- **Hésitations humaines** : ajouter "euh", "hmm" aléatoires (SSML `<break>`)
- **Variations vitesse** : pas toujours même cadence
- **Souffles** : légère respiration en début/fin

### 10.2 ❌ Audio trop long

Fans skippent audios > 30s. Cible **15-25s** max par audio.

### 10.3 ❌ Transcription évidente

Ne jamais lire mot-à-mot le texte. Adapter :
- "Hey mon cœur 💜" (texte) → *"Hey mon cœur..."* (voix, pause douce, pas de "cœur emoji")

### 10.4 ❌ Mentionner URLs en audio

Jamais dire "fanvue.com/yumi" à voix haute → dire "viens sur Fanvue bb, je t'envoie le lien juste après" + send text avec URL.

---

## 11. Éthique & consentement

- **Yumi consent écrit** à voice cloning (contrat agence)
- **Fan opt-out** : si fan demande "ne m'envoie plus d'audio" → flag `no_audio=true` sur fan_preferences
- **Watermark inaudible** (stéganographie) optionnel : preuve que c'est bien Yumi si contesté
- **Destruction voice_id** à tout moment sur demande Yumi (off-boarding protocol)

---

## 12. Évolution V3+

- **Voice cloning premium** ElevenLabs Pro ($99/mois) si Yumi mérite qualité max
- **Emotion transfer** : analyse sentiment texte → injecter emotion dans TTS
- **Voice-to-voice** : Yumi envoie voice note → TTS régénère style différent
- **Singing clone** : voice IA chante (fun teaser Fanvue)
- **Real-time voice calls** (très avancé, Phase δ+) : appels IA live ?

---

## 13. Dependencies

- **Phase 5 V1** (Agent texte stable) : prérequis
- **Phase 12 Persona tuning** : moods pilotent voice style selection
- **Phase 15 Content scenarios** (doc suivant) : audio peut référencer contenus spécifiques

Cette Phase V2 **démarrable après 2 mois V1 stable** (Phases 11 complètes).

---

## 14. DB migrations Phase V2

- `050_voice_samples.sql`
- `051_voice_generation_events.sql`
- `052_ai_runs_add_audio.sql`
- `053_fan_preferences_add_no_audio.sql`

---

## 15. Prochaine référence

Voir [15-CONTENT-SCENARIOS-GENERATION.md](./15-CONTENT-SCENARIOS-GENERATION.md) pour génération scénarios shoots photo/vidéo avec cohérence traits.
Voir [12-PERSONA-TUNING.md](./12-PERSONA-TUNING.md) pour intégration mood → voice style.

# 15 — Content Scenarios & Generation (Phase V3 backlog)

> **Statut** : plan V3 long terme (6-12 mois post-V1).
> **Objectif** : générer scénarios détaillés + prompts images/vidéos IA avec **cohérence parfaite** des traits physiques et personnalité Yumi, matchant storyline + trends.

---

## 1. Vision

Yumi (IA) = persona persistent. Chaque photo, vidéo, audio doit sembler venir de la **même personne** — jamais de glissement entre shoots.

**Défis** :
- Cohérence visuelle (même visage, corps, traits)
- Cohérence univers (décors récurrents, objets, atmosphère)
- Cohérence personnalité (poses, expressions typiques)
- Volume : générer 5-10 contenus/semaine sans faiblir qualité
- Adaptation cross-platform (IG reel, Fanvue photoset, TikTok)

---

## 2. Architecture — Trois couches

### 2.1 Layer 1 : **Identity profile** (trait anchors)

Source of truth immuable pour apparence Yumi.

```sql
CREATE TABLE model_identity_profile (
  model_slug TEXT PRIMARY KEY,

  -- Traits physiques core (immutables, describes "visage" constant)
  physical_core JSONB,
  /* Example:
  {
    "age_apparent": "24-26",
    "ethnicity": "mixed latin-european",
    "skin_tone": "light olive",
    "hair_color": "dark brown",
    "hair_length": "long straight",
    "hair_style_variants": ["loose", "ponytail", "bun"],
    "eye_color": "brown",
    "eye_shape": "almond",
    "face_shape": "oval",
    "body_type": "slim athletic",
    "height_apparent": "5'7\" / 170cm",
    "signature_features": ["small beauty mark left cheek", "subtle collarbones"],
    "makeup_style": "natural glow with soft smoky eye",
    "tattoos": [],
    "piercings": ["ear lobes"]
  }
  */

  -- Wardrobe signature (evolving but anchored)
  wardrobe_preferences JSONB,
  /* Example:
  {
    "lingerie_colors": ["black","red","cream","pastel pink"],
    "casual_style": "athleisure / parisienne chic",
    "sport_outfits": ["yoga set", "gym crop"],
    "accessories_signature": ["thin gold necklace", "hoop earrings"]
  }
  */

  -- Pose style
  pose_style JSONB,
  /* Example:
  {
    "typical_poses": ["over-shoulder", "looking back", "laying belly down"],
    "mood_typical": "playful sensual",
    "smile_type": "half-smile soft",
    "camera_eye_contact": "80% of shots"
  }
  */

  -- Reference materials (private, source of truth)
  reference_images_urls TEXT[],        -- 10-30 photos canoniques
  reference_video_urls  TEXT[],        -- 5-10 vidéos avec micro-expressions
  lora_model_id         TEXT,           -- LoRA fine-tuned sur Yumi (Flux/SD3.5)
  seed_lock_values      JSONB,          -- seeds tests qui donnent Yumi reconnaissable

  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Layer 2 : **Scenario library** (storyline-aware)

Bibliothèque de scénarios = blueprints pour shoots.

```sql
CREATE TABLE content_scenarios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug        TEXT NOT NULL,
  title             TEXT,                         -- "Matin paresseux au lit"
  category          TEXT,                         -- 'bedroom','lingerie','sport','outdoor','fitness','travel'
  tags              TEXT[],                       -- ['morning','cozy','bed','soft']
  platform_targets  TEXT[] DEFAULT '{}',          -- ['ig_reel','fanvue_photoset','tiktok']

  -- Context (décor + storyline anchor)
  location_id       UUID REFERENCES locations(id),
  storyline_event_id UUID REFERENCES life_events(id),   -- link vers storyline

  -- Scenario narrative
  mood              TEXT,                         -- 'sensual','playful','vulnerable','dominant'
  narrative_arc     TEXT,                         -- "Yumi se réveille, s'étire, petit déjeuner"
  shots_planned     JSONB,                        -- array de shots détaillés
  /* Example shots_planned:
  [
    {
      "shot_id": 1,
      "type": "wide",
      "description": "Yumi allongée sur lit défait, draps blancs, soleil matinal",
      "pose": "belly down, legs crossed up, looking at camera over shoulder",
      "outfit": "oversized white shirt, nude underwear",
      "mood": "playful languid",
      "prompt_image": "...",                   -- généré par §3
      "prompt_video": "..."                    -- si vidéo
    },
    ...
  ]
  */

  -- Output platforms
  deliverables JSONB,
  /* Example:
  {
    "ig_reel": { "duration_s": 15, "aspect": "9:16", "captions": true },
    "fanvue_photoset": { "photos": 25, "quality": "4k" },
    "tiktok": { "duration_s": 10, "trending_sound": null }
  }
  */

  -- Status
  status TEXT CHECK (status IN ('draft','approved','in_generation','published','archived')),
  created_by TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Layer 3 : **Prompt templates** (generation factory)

Templates structurés pour générer prompts images/vidéos cohérents :

```ts
// Fichier template : prompts/image-templates/bedroom-morning.md

# Template: Bedroom Morning (cozy / languid / sensual)

## Base (injection identity)
{{identity.physical_core.description}} — {{identity.wardrobe_preferences.style_desc}}

## Scene-specific
Location: {{scenario.location.description}}
Lighting: soft morning light from {{location.window_direction}} window, golden hour
Camera: {{shot.type}} ({{shot.angle}}), shallow depth of field, 35mm lens feel
Pose: {{shot.pose}}
Outfit: {{shot.outfit}}
Mood: {{shot.mood}}
Expression: {{scenario.mood_typical_expression}}

## Style cohérence (LoRA + markers)
[LORA:yumi-v3:0.85] [CONSISTENT_FACE] [CONSISTENT_BODY]

## Negative prompt
bad anatomy, inconsistent face, different person, low quality, blurry, distorted, 
extra limbs, malformed hands, watermark, text
```

Le template est rempli dynamiquement par un composer (§3).

---

## 3. Generation pipeline

### 3.1 Workflow high-level

```
[Scenario créé/validé par Yumi] (admin UI)
  ↓
Pour chaque shot planifié :
  ↓
[1] Prompt composer : merge identity + scenario + shot → prompt final
  ↓
[2] Router générateur :
    - Image statique → Flux 1.1 Pro + LoRA Yumi OU Midjourney v8
    - Vidéo courte (3-8s) → Kling AI / Runway Gen-4 / Hedra
    - Vidéo talking head → HeyGen avatar + voice clone (doc 14)
  ↓
[3] Génération async (peut prendre minutes)
  ↓
[4] Stockage outputs → Cloudinary + preview
  ↓
[5] Review Yumi (admin UI) :
    - Approve → publish
    - Reject → regenerate with adjustments
    - Select best of N
  ↓
[6] Publication :
    - IG : via API Meta (Reels, Photos)
    - TikTok : manuel ou API si supporté
    - Fanvue : manuel upload (pas d'API publique)
  ↓
[7] Track performance → feedback loop pour futurs prompts
```

### 3.2 Providers recommandés 2026

| Provider | Usage | Coût | Qualité |
|----------|-------|------|---------|
| **Flux 1.1 Pro** (via fal.ai / Replicate) | Images photoréalistes + LoRA custom | $0.05/image | 🏆 top photo |
| **Midjourney v8** | Images esthétiques premium | $30/mois + prompts | 🏆 beauty |
| **Stable Diffusion 3.5** + LoRA self-host | Alternative open-source | $20-50/mois GPU | 👍 bon |
| **Nano Banana** (Gemini 2.5 Flash Image) | Édition + cohérence basique | Via Google API | 👍 bon édition |
| **Kling AI** | Vidéo génératives | $10-50/mois | 🏆 video motion |
| **Runway Gen-4** | Vidéo cinéma | $12-95/mois | 🏆 quality cinema |
| **HeyGen / Synthesia** | Avatar talking head | $24-99/mois | 👍 lip-sync |
| **Hedra** | Avatar animation | TBD | 🏆 émotions |
| **Luma Dream Machine** | Video text-to-video | $10-50/mois | 👍 créatif |

### 3.3 Recommandation stack V3

| Layer | Provider primary | Fallback | Raison |
|-------|------------------|----------|--------|
| Image statique | **Flux 1.1 Pro + LoRA Yumi** (via fal.ai) | Midjourney v8 | LoRA = cohérence maximum |
| Video courte | **Kling AI** | Runway Gen-4 | Rapport qualité/prix |
| Avatar talking | **Hedra** ou HeyGen | — | Video DM teaser |
| Refinement edit | **Nano Banana** | Photoshop IA | Retouches finales |

### 3.4 LoRA fine-tuning Yumi

Pour cohérence 100%, fine-tune LoRA (Low-Rank Adaptation) sur dataset Yumi :
- 20-30 photos hautes qualité Yumi (profil multiple angles)
- Fine-tune sur Flux 1.1 dev via **fal.ai** ou **Replicate** — $30-100 one-shot
- Résultat : LoRA token `[LORA:yumi-v3]` utilisable dans tous les prompts
- Re-train tous les 3-6 mois avec nouvelles photos (si Yumi évolue look)

Alternative **Textual Inversion** : plus rapide (<$10) mais moins précis. Bon pour V3 prototype.

---

## 4. Prompt composer — architecture

### 4.1 Composition

```ts
async function composeImagePrompt(scenario: Scenario, shot: Shot): Promise<string> {
  const identity = await loadIdentityProfile(scenario.model_slug);
  const location = await loadLocation(scenario.location_id);
  const style = await loadStylePreset(scenario.mood);

  // Base template
  let prompt = `
    ${identity.physical_core.as_prompt_string()}
    ${identity.wardrobe_preferences.as_prompt_string()}

    Scene: ${location.description}
    Lighting: ${style.lighting}
    Camera: ${shot.type}, ${shot.angle}, ${style.lens_feel}
    Pose: ${shot.pose}
    Outfit: ${shot.outfit}
    Mood: ${shot.mood}
    Expression: ${style.expression_typical}

    Style markers: [LORA:${identity.lora_model_id}:0.85]
                   high detail, photorealistic, editorial photography
  `;

  // Apply negative prompt
  const negativePrompt = `
    inconsistent face, different person, bad anatomy, low quality,
    blurry, distorted, extra limbs, malformed hands, watermark, text,
    amateur photography, 3D render, illustration, cartoon
  `;

  return { prompt, negative: negativePrompt };
}
```

### 4.2 Variables injectables

Tous les prompts partagent base identity + scenario-specific :
- Identity : visage, corps, cheveux, style
- Location : décor, lumière, ambiance
- Shot : pose, outfit, angle camera
- Style : mood, expression, rendu

### 4.3 Consistency markers

Cross-image :
- Même LoRA token + weight
- Même seed (ou range de seeds) validé comme "donnant Yumi"
- Négative prompt identique
- Style suffix constant

---

## 5. Integration agent conversationnel

### 5.1 L'agent peut référencer scénarios

Si fan demande "tu as quoi de nouveau?" :
- Agent fetch `content_scenarios` WHERE status='published' ORDER BY published_at DESC LIMIT 3
- Inject dans RAG (comme content_catalog)
- Agent cite : *"J'ai fait un shoot matin cozy hier 💜 tu vas kiffer l'ambiance"*

### 5.2 L'agent peut teaser contenus planifiés (status='approved')

Si fan très HOT :
- Agent peut hint "j'ai un shoot plage en prévision la semaine prochaine" (si scenario status=approved + planned_publish_date set)
- Créé anticipation → conversion

### 5.3 Anti-contradiction cross-content

Si agent dit "je suis à Paris aujourd'hui" (storyline — doc 17) + scénario shoot Ibiza publié aujourd'hui → conflit.

Solution : agent consulte `life_events.current_location` avant répondre questions location. Si contradiction détectée → retourne réponse prudente.

---

## 6. Coûts estimés Phase V3

### 6.1 Volumes cibles

- 3 scénarios/semaine validés
- ~30 images générées par scénario (20 finalement sélectionnées)
- 1-2 vidéos par scénario

### 6.2 Calcul

- Images : 3 × 30 × 4 semaines = 360 images/mois × $0.05 = **$18/mois**
- Videos : 3 × 1.5 × 4 = 18 vidéos/mois × $2 = **$36/mois** (Kling)
- Midjourney ou backup : **$30/mois** fixe
- Avatar videos (Hedra ~$30/mois) si activé
- LoRA re-train tous les 6 mois : **$100 one-shot**

**Total : ~$110-120/mois** pour content generation seule.

**Budget V3 total** (agent + voice + content) : **~200€/mois**.

À valider si business justifie — ROI attendu : ×10 sur content Fanvue payant.

---

## 7. UI Yumi — gestion scenarios

### 7.1 Page `/agence/contenu/scenarios`

```
┌─ Scenarios library — 47 scenarios ────────────────────────────┐
│                                                               │
│ [+ Nouveau scenario] [Import template] [Calendrier éditorial] │
│                                                               │
│ Filtres: Status [Tous] Plateforme [Tous] Catégorie [Tous]   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐    │
│ │ 🌅 Matin paresseux au lit                              │    │
│ │ bedroom · cozy · morning                               │    │
│ │ IG Reel + Fanvue photoset · status: Published          │    │
│ │ Performance: 48k views · 12% conv Fanvue              │    │
│ │ [Voir détails] [Dupliquer] [Voir métriques]          │    │
│ └───────────────────────────────────────────────────────┘    │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐    │
│ │ 🏖 Plage d'Ibiza — sunset                              │    │
│ │ travel · sensual · outdoor                             │    │
│ │ TikTok + Fanvue · status: Draft (en review)           │    │
│ │ 30 shots prévus · 0 générés                            │    │
│ │ [Generate prompts] [Éditer] [Approuver]               │    │
│ └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### 7.2 Édit scenario

Form avec sections :
- **Context** : location (select existing ou créer), storyline event link, mood
- **Narrative** : descriptif global
- **Shots** : add/edit/reorder shots (chaque shot = formulaire détaillé)
- **Platforms** : IG Reel + Fanvue + TikTok toggles
- **Generate prompts** : bouton → composer pipeline

### 7.3 Review generation

Pour chaque shot, grid 9 outputs générés. Yumi clique :
- ✅ Keep (passe en "selected pour publication")
- ✏️ Edit variant (modifie prompt + regen)
- 🗑 Reject

---

## 8. Cohérence quality checks

### 8.1 Face consistency score

Outils :
- **DeepFace** API : compare face embedding entre images → score cosine
- Target : >0.85 entre toutes images d'un scenario (Yumi reconnaissable)
- Si <0.75 → regenerate avec seed ajusté

### 8.2 Body consistency

Similar approach : body segmentation + features extraction + similarity.

### 8.3 Style consistency

- Couleurs dominantes (palette extraction) vs identity.wardrobe_preferences
- Composition (framing, lighting direction) consistent cross-scenario

### 8.4 Quality gates Yumi

Avant publish : Yumi valide chaque contenu. Stats :
- Approval rate shots générés : cible >70%
- Regeneration rate : cible <30%
- Time per scenario : cible <1h Yumi review

---

## 9. Backlog images/vidéos avant publication

```sql
CREATE TABLE content_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES content_scenarios(id),
  shot_id INT,
  output_type TEXT CHECK (output_type IN ('image','video','audio')),
  provider TEXT,
  prompt_used TEXT,
  seed BIGINT,
  cloudinary_url TEXT,
  face_similarity_score NUMERIC(3,2),
  body_similarity_score NUMERIC(3,2),
  yumi_approval TEXT CHECK (yumi_approval IN ('pending','approved','rejected','regenerate')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  publication_platforms TEXT[]
);
```

---

## 10. Connect to storyline (doc 17)

Scenarios DOIVENT respecter storyline :
- Location scenario = location planifiée dans life_events
- Temporalité : pas de shot "Yumi à Ibiza" si storyline dit "Paris cette semaine"
- Évolution cohérente (cheveux longs → long cut → court n'apparaît pas du jour au lendemain)

Validation pre-generation :
```ts
function validateScenarioVsStoryline(scenario): ValidationResult {
  const storylineAtDate = getStorylineAt(scenario.planned_publish_date);
  const checks = {
    location_consistent: scenario.location === storylineAtDate.current_location,
    outfit_evolution_valid: true, // checks wardrobe evolution smooth
    events_timeline_valid: true,   // pas de bond temporel incohérent
  };
  return checks;
}
```

---

## 11. Ethical guidelines (creation Yumi = création SQWENSY)

- Yumi est persona fictive IA → aucun droit d'image individu réel à gérer
- Attention : LoRA fine-tune NE DOIT PAS utiliser photos personnes réelles sans consent (risques légaux deepfake)
- Si Yumi inspirée morpho d'actrice → noms/traits uniques, pas reproduction
- Watermarks digitals invisibles pour prouver origin IA si contesté
- Metadata Exif nettoyée avant publication (pas de traces tools génératifs)

---

## 12. Performance tracking

### 12.1 KPIs

- Views / reach per scenario
- Engagement rate (likes, comments, shares)
- Conversion Fanvue attribuée
- Revenue per scenario
- ROI (cost generation / revenue attribué)

### 12.2 Learning loop

Scenarios successful (high conv) :
- Tags enregistrés
- Style markers extraits
- Injectés comme "patterns successful" pour futurs scenarios auto-suggérés

→ nourrit Community Manager IA (doc 16).

---

## 13. Dependencies & prerequisites

- **Yumi identity profile** saisi (Phase V3 T-1)
- **LoRA fine-tune** Yumi (Phase V3 T-2)
- **Stack providers** configurée (fal.ai ou Replicate + Kling + HeyGen) — Phase V3 T-3
- **Storyline** module activé (doc 17)

---

## 14. Prochaine référence

Voir [16-COMMUNITY-MANAGER-AI.md](./16-COMMUNITY-MANAGER-AI.md) pour orchestration calendrier éditorial + trends detection.
Voir [17-STORYLINE-LIFE-CONSISTENCY.md](./17-STORYLINE-LIFE-CONSISTENCY.md) pour univers Yumi cohérent.

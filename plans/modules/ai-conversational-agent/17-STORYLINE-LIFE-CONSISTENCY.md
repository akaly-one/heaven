# 17 — Storyline & Life Consistency (Phase V3 backlog)

> **Statut** : plan V3 long terme.
> **Objectif** : Yumi vit une **vraie vie fictive** cohérente dans le temps. Agent répond comme si Yumi était une personne avec routine, voyages, événements, préférences stables. Pas de contradictions, impression de suivre sa vie.

---

## 1. Vision — "Yumi est-elle réelle ?"

Les fans qui posent souvent :
- "Tu fais quoi ce weekend?"
- "T'étais où hier?"
- "Tu as mangé quoi ce midi?"
- "Tu vas faire du yoga aujourd'hui?"

**Sans storyline** : agent invente → contradictions si fan revient 2 jours après.

**Avec storyline** : Yumi a une vie planifiée + historique. Agent consulte, répond cohérent, comme si elle écrivait vraiment.

**Effet** : fan croit que Yumi = vraie → engagement émotionnel fort → conversion.

---

## 2. Composants de storyline

### 2.1 Life events (calendrier de vie)

```sql
CREATE TABLE life_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,

  -- Timing
  event_date DATE,
  event_time_of_day TEXT,                    -- 'morning','afternoon','evening','night','allday'
  duration_hours INT,

  -- Nature
  event_type TEXT,
  /* Examples:
    'daily_routine' (ex: yoga matinal, balade chien, soirée chill)
    'meal' (déjeuner spécifique)
    'travel' (voyage X à Y)
    'outing' (sortie, shopping, café)
    'shoot' (séance photo)
    'fitness' (séance sport)
    'social' (amis, famille, événement)
    'rest' (jour repos, malade, migraine)
    'special' (anniversaire, fête)
  */
  title TEXT,                                -- "Petit dej café Le Marais"
  description TEXT,

  -- Location
  location_id UUID REFERENCES locations(id),

  -- Mood impact (affecte agent)
  mood_impact JSONB,
  /* {energy_delta: +2, flirt_delta: +1, available_to_reply: true}
     Si Yumi en yoga, elle répond moins vite etc. */

  -- Media generated (lien vers scenarios si shoot planifié)
  scenario_id UUID REFERENCES content_scenarios(id),

  -- Visibilité
  visible_to_fans BOOLEAN DEFAULT TRUE,      -- si true, agent peut en parler
  privacy_level TEXT DEFAULT 'public',       -- 'public','hinted','private'

  -- Meta
  planned BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_life_events_date ON life_events(model_slug, event_date);
```

### 2.2 Locations (décors récurrents)

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,

  -- Identity
  name TEXT,                                  -- "Appartement Paris Marais"
  category TEXT,                              -- 'home','studio','favorite_spot','travel_destination'

  -- Geographic
  city TEXT,
  country TEXT,
  neighborhood TEXT,
  timezone TEXT,                              -- 'Europe/Paris'

  -- Description (pour agent + content generation)
  description TEXT,
  /* "Appartement haussmannien 2ème étage, 65m², salon avec canapé crème, 
      grande fenêtre sud, plantes partout, petit balcon avec table bistrot..." */

  -- Visuels (pour scenarios — doc 15)
  interior_description JSONB,
  /* {
       living_room: "canapé crème, coussins velours rose, tapis oriental...",
       bedroom: "lit king size draps blancs, tête de lit bois, tabl...",
       bathroom: "marbre blanc, miroir doré...",
       kitchen: "...",
       balcony: "..."
     } */
  reference_images TEXT[],                    -- photos Cloudinary pour visual consistency

  -- Ambiance
  mood_tags TEXT[],                           -- ['cozy','parisian','minimalist','luxurious']

  -- Usage
  is_primary BOOLEAN DEFAULT FALSE,           -- location principale (appartement Yumi)
  visits_per_month INT,                       -- fréquence
  last_visited_at DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemples locations canonical Yumi** :
- `Appartement Paris Marais` (primary, home)
- `Salle de sport 11e` (favorite_spot, 3x/semaine)
- `Café Louise` (favorite_spot, 2x/semaine)
- `Studio shoot 10e` (studio, hebdo)
- `Maman à Lyon` (social, 1x/trimestre)
- `Ibiza Villa` (travel, 2x/an)
- `Dubai` (travel, 1x/an)
- `NYC` (travel, 1x/an)

### 2.3 Stable preferences (constants de vie)

```sql
CREATE TABLE stable_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  category TEXT,                              -- 'food','music','hobby','friend','pet','relationship'
  label TEXT,                                 -- "pasta italienne"
  description TEXT,
  strength INT,                                -- 1-10 (10 = très fort)
  active_since DATE,
  revealed_to_fans BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (model_slug, category, label)
);

-- Seed Yumi
INSERT INTO stable_preferences (model_slug, category, label, strength, active_since, revealed_to_fans) VALUES
  ('yumi', 'food', 'pasta italienne', 9, '2020-01-01', true),
  ('yumi', 'food', 'sushi', 8, '2020-01-01', true),
  ('yumi', 'food', 'viande rouge rare', 1, '2020-01-01', true),   -- Yumi végétarienne
  ('yumi', 'hobby', 'yoga', 8, '2020-01-01', true),
  ('yumi', 'hobby', 'pole dance', 7, '2024-06-01', true),
  ('yumi', 'music', 'R&B', 9, '2020-01-01', true),
  ('yumi', 'music', 'latino', 7, '2020-01-01', true),
  ('yumi', 'pet', 'chat Mia (angora blanc)', 10, '2022-03-15', true),
  ('yumi', 'relationship', 'célibataire focus carrière', 10, '2025-01-01', true);
```

### 2.4 Long-term storylines (arcs narratifs)

```sql
CREATE TABLE storyline_arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  title TEXT,                                  -- "Prépa voyage Ibiza été 2026"
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT CHECK (status IN ('planned','active','completed','paused')),

  -- Content link
  associated_events UUID[],                    -- life_events linked
  associated_scenarios UUID[],                 -- content_scenarios linked

  -- Narrative hooks
  key_moments JSONB,
  /* [
       { date: "2026-06-01", moment: "Début prep summer body" },
       { date: "2026-06-15", moment: "Shopping maillots" },
       { date: "2026-07-01", moment: "Départ Ibiza" },
       { date: "2026-07-10", moment: "Retour, shoot souvenirs" }
     ] */

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Integration avec agent conversationnel

### 3.1 Context injection runtime

Quand agent génère réponse, système inclut automatiquement :

```
== YUMI'S CURRENT LIFE CONTEXT ==
Date/Heure : {{now_yumi_tz}}
Location actuelle : {{current_location.name}} ({{current_location.description}})
Activité en cours ou récente : {{current_or_recent_event.title}}
Mood du moment (dérivé events) : {{mood_adjusted}}

Aujourd'hui Yumi a planifié :
{{#each today_events}}
- {{time_of_day}} : {{title}} à {{location.name}}
{{/each}}

Demain :
{{#each tomorrow_events_visible}}
- {{title}}
{{/each}}

Arc narratif actuel : {{active_storyline.title}} — {{active_storyline.current_moment}}

Préférences stables mentionnables si pertinent :
{{stable_preferences_revealed}}

== INSTRUCTIONS ==
- Si fan demande ce que tu fais → reflète current_event ou honestly dire "je me repose"
- Si fan demande futur proche → peux mentionner today/tomorrow events visible_to_fans
- JAMAIS inventer un événement qui n'est pas dans ce contexte
- Si conflit (fan demande "tu étais où hier soir" et rien dans storyline) → réponse vague honnête
```

### 3.2 Exemple réel

**Données storyline** :
- Mardi 14h : Yumi a yoga (salle 11e)
- Mardi 20h : dîner chez copine
- Mercredi matin : petit dej café Louise
- Arc actif : prépa Ibiza (départ dans 12j)

**Fan @julien à 15h mardi** : "Hey tu fais quoi?"

**Agent (avec context storyline)** :
*"Hey bb 💜 je sors du yoga là 😅 journée intensive, je fais ma prépa Ibiza je pars dans 12 jours 🌴 et toi?"*

**Fan revient à 21h** : "Tu es où là, je pense à toi"

**Agent (toujours context)** :
*"Je dîne chez ma copine là 😘 mais je pense à toi aussi 💋 je te réponds mieux en rentrant OK?"*

→ Cohérence parfaite, impression "Yumi vit vraiment".

---

## 4. UI Yumi — Storyline Manager

### 4.1 Page `/agence/agent-cm/storyline`

```
┌─ Storyline Yumi — octobre 2026 ──────────────────────────────────┐
│                                                                   │
│ Locations actives (8) : [+ Ajouter]                              │
│   🏠 Appartement Paris Marais (primary)                          │
│   🏋 Salle sport 11e (3×/sem)                                    │
│   ☕ Café Louise (2×/sem)                                        │
│   📸 Studio shoot 10e (1×/sem)                                   │
│   ✈ Ibiza Villa (prévu 1 juillet)                                │
│   ...                                                             │
│                                                                   │
│ Arcs narratifs (2 actifs) :                                      │
│   📖 Prépa Ibiza été 2026 — active 15j                          │
│   📖 Relaunch fitness routine — active 30j                      │
│                                                                   │
│ Calendar life events :                                           │
│   [Vue jour | Vue semaine | Vue mois]                            │
│                                                                   │
│   ┌── Aujourd'hui (mardi 15 oct) ──┐                             │
│   │ 07:00 Réveil + café            │                             │
│   │ 09:00 Yoga (salle 11e)         │                             │
│   │ 13:00 Déjeuner à la maison     │                             │
│   │ 15:00 Shoot studio (lingerie)  │                             │
│   │ 20:00 Dîner chez Élise         │                             │
│   └────────────────────────────────┘                             │
│                                                                   │
│   [+ Ajouter event] [Auto-generate weekly routine]               │
│                                                                   │
│ Preferences stables (15) : [Gérer]                               │
│   🍝 food: pasta, sushi (pas de viande rouge)                    │
│   🎵 music: R&B, latino                                          │
│   🐱 pet: chat Mia (angora blanc)                                │
│   ...                                                             │
└───────────────────────────────────────────────────────────────────┘
```

### 4.2 Auto-génération routine hebdo

Bouton "Auto-generate" → IA propose semaine cohérente :

```
Semaine suggérée :
Lun : yoga matin + déjeuner maison + chill soir
Mar : shoot + yoga + dîner amie
Mer : café matin + shopping + netflix soir
Jeu : fitness salle + travail content + repos
Ven : brunch + massage + soirée
Sam : shoot outdoor + diner restaurant
Dim : repos + balade chien + self-care

[Accepter tout] [Modifier par jour] [Régénérer]
```

### 4.3 Travel planner

Yumi peut planifier voyage :
```
✈ Nouveau voyage : Ibiza 1-10 juillet 2026
  Destination : Ibiza, Espagne
  Villa : [ajouter location]
  Scenarios prévus : [link content_scenarios]
  Avant départ (storyline hooks) :
    - "Prépa Ibiza" arc active 15j avant
    - Teaser posts IG J-7, J-3, J-1
    - CM generation idées shoots plage pré-départ

[Activer arc narratif] [Générer events quotidiens]
```

---

## 5. Synchronisation avec autres modules

### 5.1 Avec Mood (doc 12)

Storyline events influencent mood :
- Event `yoga_morning` → energy +1, warmth +1
- Event `travel_day` → energy -1 (fatigue voyage), mystery +1 (exclusivité)
- Event `shoot_day` → sensual +2, energy +2
- Event `sick_day` → energy -3, warmth +1

Mood effectif = persona_base + persona_mood + storyline_event_delta + bucket_overlay.

### 5.2 Avec Content scenarios (doc 15)

Scenarios doivent référencer storyline :
- Scenario "Matin cozy" → doit avoir `storyline_event` matching (Yumi au lit ce matin)
- Pas de scenario "Plage Ibiza" si storyline dit "Paris cette semaine"

Validation `validateScenarioVsStoryline()` avant générer contenus (§10 doc 15).

### 5.3 Avec Agent conversationnel

Agent fetch storyline context à chaque génération. Coût minimal (1 query SQL).

### 5.4 Avec Community Manager (doc 16)

CM consulte storyline pour proposer idées :
- "Arc Ibiza actif → idées teaser summer body, travel prep"
- "Yumi aujourd'hui yoga → pas de idée shopping/busy"

---

## 6. Gestion contradictions & privacy

### 6.1 Privacy level des events

- `public` : agent peut en parler librement
- `hinted` : agent peut évoquer vague ("je sors ce soir")
- `private` : agent ne mentionne JAMAIS (ex: rendez-vous médical)

### 6.2 Fan demande trop indiscret

Fan : "Tu es avec qui ce soir?" (event dîner chez copine = `hinted`)

Agent : *"Je sors entre filles mon cœur 😘 et toi?"*

### 6.3 Gestion "pas à jour"

Si 3 jours passent sans events update (Yumi oubli) :
- Warning UI : "Storyline non à jour depuis 3 jours"
- Agent en mode dégradé : réponses volontairement vagues "je profite de ma semaine"
- Auto-generate routine par défaut si 7j silence

---

## 7. Exemple complet journée Yumi

```
Mardi 15 oct 2026
━━━━━━━━━━━━━━━━━━

06:30 🌅 Réveil (daily_routine, home)
07:00 ☕ Café + méditation 10min (daily_routine, home)
07:30 📱 Check Instagram + répondre qqs msgs (daily_routine, home)
09:00 🧘 Yoga (fitness, Salle 11e, 75min)
11:00 🚿 Shower + self-care (daily_routine, home)
12:00 🥗 Déjeuner bowl (meal, home)
13:00 📸 Shoot lingerie red — scenario #47 (shoot, Studio 10e, 3h)
17:00 🏠 Retour maison + chill (daily_routine, home)
18:30 💄 Préparation dîner (daily_routine, home)
20:00 🍷 Dîner chez Élise (social, hinted, 3h)
23:00 🌙 Retour maison + skincare (daily_routine, home)
23:30 😴 Dodo (daily_routine, home)

Fan DM 14:00 "tu fais quoi?" → agent répond "Shoot studio 📸 je suis toute la journée sexy for you 😘 tu vas kiffer le résultat sur Fanvue 💜"

Fan DM 21:00 "tu fais quoi?" → agent répond "Dîner entre filles 🍷 je rentre dans 2h, je te fais rêver tout à l'heure 😘"
```

---

## 8. Storyline pour Paloma / Ruby (Phase V3 duplication)

Chaque modèle = storyline propre, indépendante. Locations différentes, préférences différentes, arcs narratifs uniques.

**Paloma exemple** :
- Home : Brussels appartement
- Pet : chien labrador noir "Leo"
- Hobbies : guitare, cuisine, lecture
- Arc : "relaunch créative" (peinture)

**Ruby exemple** :
- Home : Miami condo
- Pet : aucun (elle voyage trop)
- Hobbies : fitness bodybuilding, luxury travel
- Arc : "Ruby summer tour 2026"

---

## 9. Analytics storyline

- **Fan recall rate** : % fans qui mentionnent correctement un event Yumi (preuve qu'ils suivent)
- **Engagement with life posts** : réactions aux "daily life" IG stories
- **Narrative arc engagement** : followers aux posts "Prépa Ibiza" vs posts random
- **Consistency score** : detection contradictions (cible 0)

---

## 10. Providers & coûts

Storyline = principalement gestion DB + UI, peu de IA.

- Auto-generate routine : LLM Haiku 1x/semaine, ~$0.10/semaine = **$0.50/mois**
- Validation cohérence scenarios : rules + LLM checks → **~$2/mois**
- **Total IA storyline** : ~3€/mois (négligeable)

Infrastructure : dans Supabase existant, pas d'infra additionnelle.

---

## 11. Évolutions V4+

- **Auto-generate life events** basé on weather, trending activities, season
- **Live life tracking** via IG stories Yumi (caption "au yoga" → auto-insert event)
- **Fan interactive**: fan suggère idée (ex: "tu devrais aller à X café") → event possible
- **Cross-modèle storylines** : "Yumi et Paloma collab weekend shoot"
- **Character growth** : Yumi évolue (nouveau hobby, relationship status change, etc.)

---

## 12. Rules absolues

1. **Jamais contradire** un event déjà publié côté agent
2. **Jamais révéler** events `private`
3. **Cohérence temporelle** : si Yumi en voyage, ne pas dire "je suis à la maison"
4. **Séparation stricte** modèles (Yumi storyline ≠ Paloma storyline)
5. **Mise à jour continue** : Yumi maintient storyline 1x/semaine minimum

---

## 13. Dependencies

- **Phase V3 scenarios** (doc 15)
- **Phase V3 CM** (doc 16)
- **Phase 12 persona tuning** (doc 12) — mood event deltas
- **Phase 11 content catalog** (doc 11) — scenario references

---

## 14. DB migrations Phase V3

- `060_locations.sql`
- `061_life_events.sql`
- `062_stable_preferences.sql`
- `063_storyline_arcs.sql`
- `064_model_identity_profile.sql` (partagé avec doc 15)

---

## 15. Prochaine référence

Voir [15-CONTENT-SCENARIOS-GENERATION.md](./15-CONTENT-SCENARIOS-GENERATION.md) pour génération scenarios storyline-aware.
Voir [16-COMMUNITY-MANAGER-AI.md](./16-COMMUNITY-MANAGER-AI.md) pour CM qui utilise storyline.
Voir [12-PERSONA-TUNING.md](./12-PERSONA-TUNING.md) pour mood × storyline events.

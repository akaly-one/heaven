# 09 — Shadow Mode & Apprentissage Contextuel

> **Objectif** : l'agent apprend en continu du style de Yumi (ou Paloma/Ruby) via analyse passive des conversations qu'elle mène elle-même. Pas de fine-tune — apprentissage par capture d'exemples + ajustement prompt.

---

## 1. 3 modes de conversation par canal

| Mode | Agent répond ? | Yumi répond ? | Agent observe ? | Usage |
|------|:-:|:-:|:-:|---|
| **auto** | ✅ | ❌ | ✅ (logs complets) | Volume élevé, confiance agent établie |
| **shadow** | ❌ (drafts silencieux) | ✅ | ✅ (compare drafts vs Yumi) | **Apprentissage actif** — Yumi répond, agent génère en arrière-plan, compare |
| **human** | ❌ | ✅ | ❌ | Yumi veut gérer seule (VIP, crise, edge case) |

**Granularité** : par conversation (pas seulement global). Une conv peut être `shadow` pendant que 100 autres sont `auto`.

### 1.1 Transitions d'état

```
Création conv → mode = default_mode de persona (configurable, usuel = auto)

Yumi clique "Prendre la main" sur une conv → mode = human (24h par défaut, configurable)

Yumi active "Shadow" sur une conv → mode = shadow
  → agent génère en background à chaque msg fan, stocke draft, ne envoie pas
  → Yumi voit ses propres réponses + "Ce que l'agent aurait dit" (collapsible)
  → Yumi peut 👍 promouvoir au dataset examples si drafts = ce qu'elle voulait

Yumi clique "Rendre à l'agent" → mode = auto
```

---

## 2. Shadow Mode — fonctionnement détaillé

### 2.1 Qu'est-ce qui se passe

```
Fan envoie msg → webhook Heaven
  ↓
Worker détecte conversation en mode shadow
  ↓
Branche 1 (primary) : message queued pour notification Yumi (elle répondra elle-même)
  ↓
Branche 2 (shadow) : agent runAgent() exécuté en parallèle
  ↓ résultat stocké dans ai_runs avec flag shadow=true, PAS envoyé Meta
  ↓
Yumi voit :
  - Le msg fan dans son inbox
  - Un badge discret "Agent a préparé un draft" (👁)
  - Au hover, draft visible
  - Elle rédige sa réponse (ou pique celle de l'agent)
  - Envoi
  ↓
Comparaison shadow :
  - Draft agent vs réponse Yumi
  - Similarité sémantique calculée (embedding cosine)
  - Si > 0.85 → agent validé (Yumi dirait à peu près pareil)
  - Si < 0.5 → gap à apprendre (mood / ton / info différente)
  - Yumi peut 👍 son propre réponse pour ajouter au dataset examples
```

### 2.2 UI cockpit Yumi — conv en shadow

```
┌──────────────────────────────────────────────────────────────┐
│ @julien_paris · IG · conv #1234 · mode: SHADOW 👁             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Fan: "Hey bb t'as quoi de nouveau cette semaine?"            │
│ il y a 3 min                                                 │
│                                                              │
│ 👁 Agent aurait dit (Groq · 1.1s):                           │
│ "Hey mon cœur 💜 j'ai fait un shoot lingerie hier, tu vas     │
│  adorer sur Fanvue 😘"                                       │
│ [👍 Utiliser ce draft] [✏️ Modifier] [↻ Regénérer]          │
│                                                              │
│ ▼ Ton tour                                                   │
│ ┌────────────────────────────────┐                           │
│ │ Ta réponse ici...              │  [Envoyer]               │
│ └────────────────────────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 Dashboard shadow analytics

`/agence/agent-training` → onglet **Shadow Analytics** :

- Nombre conv shadow actives
- Similarité moyenne drafts vs Yumi (trend 7j/30j)
- Top 10 gaps (réponses où agent ≠ Yumi le plus)
- Auto-suggestions d'ajouts d'examples à partir des gaps

---

## 3. Apprentissage contextuel — captures automatiques

### 3.1 Sources d'apprentissage

| Source | Contribution |
|--------|--------------|
| **Drafts shadow validés** (Yumi 👍) | Examples haute qualité |
| **Réponses Yumi elle-même en mode human** | Examples ground truth (style Yumi authentique) |
| **Corrections post-hoc** (agent répond, Yumi 👎 + suggère mieux) | Examples négatifs + positifs paire |
| **Conversations réussies** (agent réponse → fan click Fanvue <5min) | Examples "conversion-triggering" |
| **Conversations ratées** (agent réponse → fan ghost) | Examples "to-avoid" |

### 3.2 Dataset structuré

Extension `prompt_examples` (table déjà prévue 03-TECH) :

```sql
ALTER TABLE prompt_examples ADD COLUMN
  source_type TEXT CHECK (source_type IN (
    'manual',
    'shadow_validated',
    'yumi_ground_truth',
    'correction_positive',
    'correction_negative',
    'conversion_success',
    'conversion_fail',
    'seed'
  )),
  source_ai_run_id UUID REFERENCES ai_runs(id),
  fan_bucket_at_time TEXT,
  language TEXT DEFAULT 'fr',
  mood_tag TEXT;
```

### 3.3 Pipeline capture auto

```
[Trigger 1] Shadow 👍 by Yumi
  → ai_run_id → extract conversation context + draft → INSERT prompt_examples
  → thumbs=1, source_type='shadow_validated'

[Trigger 2] Yumi répond elle-même (mode human ou shadow fallback)
  → her response captured → embed → compare similarité avec drafts historiques
  → si nouveau style détecté → INSERT prompt_examples source='yumi_ground_truth'

[Trigger 3] Conversion success (fan clique Fanvue <5min après réponse agent)
  → UPDATE ai_runs SET conversion_triggered=true
  → INSERT prompt_examples source='conversion_success' (high weight)

[Trigger 4] Conversion fail (fan ghost 7j après réponse agent)
  → UPDATE ai_runs SET ghosted=true
  → INSERT prompt_examples source='conversion_fail' (inverse learning)
```

### 3.4 Curation

Tous les examples auto-captured arrivent en **DRAFT**. Yumi les valide en UI Training :

```
┌─ Examples en attente curation (12) ────────────────────────────┐
│                                                                │
│ 📌 shadow_validated · il y a 2h · bucket=HOT                   │
│ Input: "Tu fais quoi ce soir bb?"                              │
│ Output: "Je prépare du contenu exclusif pour toi 😘 viens..."  │
│ [✅ Accepter] [✏️ Éditer] [❌ Rejeter]                         │
│                                                                │
│ 📌 conversion_success · il y a 1h · bucket=WARM                │
│ Input: "Envoie moi une photo"                                  │
│ Output: "Viens voir mes dernières photos exclusives 💋 [link]" │
│ [✅ Accepter] [✏️ Éditer] [❌ Rejeter]                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Yumi accepte → `UPDATE prompt_examples SET is_active=true`.

---

## 4. Calibration continue du prompt

### 4.1 Re-génération prompt system

Chaque X validations (p.ex. 20 nouveaux examples validés), le système propose à Yumi une nouvelle version du prompt :

```
Prompt v12 → propose v13 (diff sidebar-by-sidebar)

Changements :
  + Intégration 5 nouveaux examples flirt en FR
  + Ajustement "ton plus direct" (dérivé des corrections Yumi)
  - Retrait 2 examples anciens non-conversion
  = Guardrails identiques

[Preview response simulée] [Test sandbox] [Promote v13] [Cancel]
```

### 4.2 Dérivation automatique d'attributs

À partir des examples acceptés, un classifier cheap (Haiku) extrait tendances :

```json
{
  "avg_length_yumi": 42,     // chars
  "emoji_rate": 0.78,         // emojis per message
  "favorite_emojis": ["💜", "🥰", "😘", "🔥"],
  "favorite_endings": ["mon cœur", "bb", "mon chou"],
  "directness_score": 6.5,    // 0=very indirect 10=very direct
  "flirt_intensity": 7.2,
  "french_slang": ["coucou", "kiffer", "tipo", "ouf"],
  "average_questions_asked": 0.8  // par réponse
}
```

Ces attributs nourrissent le prompt system de Yumi (voir 12-PERSONA-TUNING).

### 4.3 Audit : éviter drift négatif

Risque : examples "conversion_success" biaisés vers style trop pushy.

Garde-fou :
- **Ratio** examples par source : 40% ground_truth + 30% shadow_validated + 20% conversion_success + 10% conversion_fail (negative)
- **Humain-in-the-loop** : Yumi valide TOUTES les additions (pas automatique)
- **Rollback** : si V13 prompt dégrade metrics (conversion rate chute), rollback V12 en 1 clic

---

## 5. Apprentissage multi-provider

Chaque provider a son style. Si on switch Groq → Grok mid-conv, l'apprentissage doit rester cohérent.

**Solution** : dataset examples unique, partagé entre providers. System prompt = identique, only provider change.

Test hebdo : re-run 50 examples via chaque provider, mesure fidélité au style Yumi (embedding similarité vs ground_truth).

Si un provider dérive significativement (similarité < 0.6) → blacklist ce provider pour Yumi, n'active plus.

---

## 6. Confidentialité & éthique apprentissage

### 6.1 Scope

- Seulement conversations du **model_slug propriétaire** (m1 apprend sur Yumi, pas sur Paloma)
- Pas de fuite cross-model (isolation CP stricte 03-tech)
- Fan data pseudo-anonymisée dans examples stockés (pas de PII)

### 6.2 Opt-out fan

Si fan demande explicitement "j'accepte pas que mes messages servent entraînement" → flag `no_training=true` sur fan_id → exclus de dataset.

### 6.3 RGPD

- Export : inclure prompt_examples dérivés de conversations fan
- Delete : cascade delete examples référençant ce fan

---

## 7. Évolution vers fine-tune (V3+, si justifié)

Si le dataset atteint **1000+ examples validés haute qualité**, possibilité fine-tune :

- Candidat : Llama 3.3 70B via Together.ai fine-tuning
- Coût : ~50$ one-shot + hosting custom model
- Décision : uniquement si prompt engineering atteint plafond qualité mesurable
- Attention : fine-tune = lock-in provider, perte flexibilité multi-IA

**Alternative intermédiaire** : **LoRA adapters** (Low-Rank Adaptation) — patches légers du modèle, moins cher, réversible.

---

## 8. Métriques de succès shadow/learning

- **Similarité draft vs Yumi réponse** : trend cible >0.75 en 3 mois
- **Taux acceptation examples** par Yumi : cible >60% (si <40% = prompt pas bon)
- **Conversion rate agent-only vs shadow-validated** : cible +20% après intégration
- **Drift detection** : alerte si similarité chute >10% en 1 semaine

---

## 9. DB — colonnes additionnelles

Extension `instagram_conversations` + `agence_fans` + `ai_runs` :

```sql
ALTER TABLE instagram_conversations ADD COLUMN
  mode TEXT DEFAULT 'auto' CHECK (mode IN ('auto','shadow','human'));

-- idem table web conversations (à créer Phase 5 si pas déjà)

ALTER TABLE ai_runs ADD COLUMN
  shadow BOOLEAN DEFAULT FALSE,
  draft_only BOOLEAN DEFAULT FALSE,
  comparison_similarity NUMERIC(4,3),    -- cosine sim avec réponse Yumi si shadow
  conversion_triggered BOOLEAN,
  ghosted_after_response BOOLEAN;

-- Vue pour analytics shadow
CREATE VIEW v_shadow_analytics AS
SELECT
  model_slug,
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS drafts,
  AVG(comparison_similarity) AS avg_similarity,
  SUM(CASE WHEN comparison_similarity > 0.85 THEN 1 ELSE 0 END) AS drafts_matched,
  SUM(CASE WHEN comparison_similarity < 0.5 THEN 1 ELSE 0 END) AS drafts_gap
FROM ai_runs
WHERE shadow = TRUE
GROUP BY 1, 2;
```

---

## 10. Prochaine phase

Implémentation shadow mode dans **Phase 5 T-BE-10** (worker modif, runAgent en background si mode=shadow).
UI shadow dans **Phase 2 T-FE-08** (badge + hover draft).
Pipeline apprentissage dans **Phase 7** (training UI).

Voir [07-MULTI-AGENT-ORCHESTRATION.md](./07-MULTI-AGENT-ORCHESTRATION.md) pour dispatch tickets.

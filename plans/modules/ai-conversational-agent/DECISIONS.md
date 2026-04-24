# DECISIONS — Architecture Decision Records (ADR)

> Format léger Y-Statements (Context · Decision · Consequences).

---

## ADR-001 — Greffer l'agent sur le worker IG existant plutôt que réécrire

- **Date** : 2026-04-24
- **Status** : Proposed — en attente validation NB
- **Context** : Un worker cron `/api/cron/process-ig-replies` existe déjà avec pattern queue (`ig_reply_queue` + RPC `claim_ig_reply_jobs`), retry logic, Meta rate limit, HMAC verify webhook. Placeholder IA est à la ligne 104-106.
- **Decision** : Étendre ce worker existant pour appeler notre nouveau `runAgent()` au lieu du placeholder. Pas de nouveau worker.
- **Consequences**
  - ✅ Réutilise queue + retry + dedup matures
  - ✅ Zéro duplication code
  - ✅ Déploiement rapide Phase 5
  - ⚠️ Le worker devient critique (single point) — acceptable car non-bloquant (dead letter si fail)

## ADR-002 — Multi-IA via OpenRouter, pas SDK direct par provider

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : On veut supporter Claude Haiku, Sonnet, possiblement Grok/Mistral. OpenRouter déjà intégré (`lib/openrouter.ts`).
- **Decision** : Tous les appels IA via OpenRouter (une seule lib, une seule clé). Chaque provider = config dans `ai_providers` avec endpoint OpenRouter.
- **Consequences**
  - ✅ Switch provider = changement de string, zéro refactor
  - ✅ Facturation centralisée
  - ✅ Fallback cross-provider natif
  - ⚠️ Dépendance OpenRouter (+~5% markup, mais négligeable à notre volume)
  - ⚠️ Si OpenRouter down → agent down (mitigé par fallback canned)

## ADR-003 — Intent classifier = rules + LLM cheap fallback

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Besoin de détecter intents (small_talk, explicit_request, price_question, harassment). Full-LLM classifier = coût double (1 call pour classify + 1 pour reply).
- **Decision** : Essai rules-based regex d'abord (keywords patterns EN/FR), fallback Haiku (1 call cheap) si ambiguous. Pas de modèle ML custom en V1.
- **Consequences**
  - ✅ 80% cas = rules (gratuit, <5ms)
  - ✅ 20% cas = Haiku (+10% cost, acceptable)
  - ⚠️ Rules à maintenir — investir 2h pour 30 patterns solides FR/EN

## ADR-004 — Prompt versioning en DB, pas en fichiers

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Prompts doivent être éditables par Yumi via UI. Besoin versioning + rollback + active flag.
- **Decision** : Table `agent_personas` avec `version INT` + `is_active BOOLEAN`. Prompt stocké en `TEXT`. Examples liés via `prompt_examples`.
- **Consequences**
  - ✅ UI Training peut éditer sans deploy code
  - ✅ Rollback = `UPDATE ... SET is_active = TRUE WHERE version = X`
  - ✅ Audit trail natif
  - ⚠️ Prompt pas en git — perte si DB corruption (mitigé : backup Supabase quotidien)

## ADR-005 — Pas de modèle ML custom, tout via prompts

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : On pourrait entraîner un modèle fine-tuned sur les conversations Yumi. Coût + complexité énormes pour V1.
- **Decision** : Full prompt engineering + few-shot examples. Aucun fine-tune en V1.
- **Consequences**
  - ✅ Itération en minutes vs jours
  - ✅ Zéro coût infra ML
  - ✅ Portable entre providers
  - ⚠️ Quality ceiling — acceptable Phase 1-5, à reviewer V2

## ADR-006 — Pseudo-anonymisation inputs avant envoi provider

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : RGPD + confidentialité Heaven. Envoyer un email fan réel à Claude = data leak.
- **Decision** : PIIScrubber remplace emails, phones, URLs (hors fanvue/instagram) par tokens `[REDACTED_EMAIL_1]` avant call provider. Réponse agent normale (providers voient token).
- **Consequences**
  - ✅ Compliance RGPD
  - ✅ Zéro PII chez Anthropic/OpenRouter
  - ⚠️ Si agent doit référencer l'email (rare), il ne peut plus — acceptable (agent ne devrait jamais écrire PII)

## ADR-007 — Zéro provider NSFW hard par défaut

- **Date** : 2026-04-24
- **Status** : Proposed — à valider NB
- **Context** : Claude est très conservative sur contenu explicite. Grok/xAI plus tolérant. Question : inclure Grok en V1 ?
- **Decision proposed** : **NON en V1**. Tous providers Claude (conservative). Compliance Meta stricte = pas besoin de contenu explicite agent→fan. Redirection Fanvue suffit.
- **Alternative** : **OUI V2** si NB décide d'ajouter Grok pour edge cases — nécessite ajout `ai_providers.nsfw_ok=true` + guardrails spécifiques.
- **Consequences si NON V1**
  - ✅ Aucun risque ban Meta contenu explicite
  - ✅ Marque Yumi "classe" préservée
  - ⚠️ Agent peut parfois refuser flirt que Yumi ferait elle — Yumi override dispo

## ADR-008 — Humanizer delay 2-8s random

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Meta détecte patterns réponses instantanées = bot flag. Besoin simuler humain.
- **Decision** : Après `runAgent`, sleep random 2000-8000ms avant `sendViaMetaGraph`. Skewed vers 3-5s (typing réaliste).
- **Consequences**
  - ✅ Réduit détection bot Meta
  - ✅ UX plus naturelle côté fan
  - ⚠️ Latence perçue +5s moyen — acceptable vs réponse instant suspect

## ADR-009 — YUMI admin cross-model via pages modèles dédiées (option 2)

- **Date** : 2026-04-24 (validé NB)
- **Status** : Accepted
- **Context** : Yumi est l'agence admin qui gère contrats/DMCA/identité des autres modèles (paloma/ruby). Son CP principal affiche uniquement m1.
- **Decision** : Yumi accède `/agence/models/[m2|m3]/{profile,contract,dmca,agent-config}` en admin. Son Dashboard/Messagerie/Contenu/Stratégie restent strictement m1.
- **Consequences**
  - ✅ Yumi peut configurer agent Paloma/Ruby depuis UI
  - ✅ Cloisonnement data opérationnelle respecté (pas mix inbox m1/m2)
  - ⚠️ Guard spécifique `MODEL_ADMIN_ROUTES` à implémenter (Phase 3)

## ADR-010 — ROOT = mode présentation (skeleton vide avec cartes descriptives)

- **Date** : 2026-04-24 (validé NB 2026-04-23 soir)
- **Status** : Accepted
- **Context** : Règle NB : "ROOT na pas d'infos il affiche uniquement le skeleton vide, mais qui montre tous les modules... ca liste au lieu des infos sur une modèle les fonctions de chaque module, en infos, comme un mode developpeur et présentation".
- **Decision** : Panels détectent `isRootDev` (role=root && model_slug=null && currentModel=null). Si true, remplacent data par `<ModulePresentationCard>` avec : nom, fonction, APIs, rôles, sources.
- **Consequences**
  - ✅ ROOT utilisable comme doc dev vivante
  - ✅ Zéro fuite data
  - ✅ Utile pour onboarding futurs devs ou démo
  - ⚠️ Chaque panel doit gérer ce fallback — coût dev +20% par composant

## ADR-011 — Pas de WebSocket, garder polling 15s

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : UX "vrai temps réel" attractive mais infra cost + complexité + Vercel Hobby pas compatible (no persistent connections).
- **Decision** : Garder polling 15s (actuel). Upgrade SSE envisageable V2 si volume justifie.
- **Consequences**
  - ✅ Zéro nouvelle infra
  - ✅ Compatible Vercel Hobby
  - ⚠️ Lag visuel 0-15s sur nouveaux messages — acceptable pour usage actuel

## ADR-012 — Feature flags en DB (pas en code)

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Besoin toggle flags par model sans redeploy.
- **Decision** : Table `feature_flags(key, scope_model_slug, enabled, updated_at)` + API admin `/api/root/feature-flags`. Hook `useFeatureFlag(key, model_slug)`.
- **Consequences**
  - ✅ Changements instantanés
  - ✅ Scoping par model natif
  - ⚠️ Query extra par flag (mitigé via cache 60s)

---

## ADR-007 RÉVISÉ — Provider NSFW-tolerant = Grok 4.1 Fast inclus V1

- **Date** : 2026-04-24 (révision post-research)
- **Status** : Proposed — REMPLACE version initiale
- **Context** : Recherche a confirmé que Grok 4.1 Fast (xAI) est le seul frontier model tolérant flirt suggestif sans bloquer systématiquement. Claude/GPT refusent flirt appuyé même SFW. À ~$0.20/$0.50 par 1M tokens, c'est aussi le moins cher.
- **Decision** : **Inclure Grok 4.1 Fast dès V1** comme provider pour 10% cas NSFW edge (flirt suggestif validé safety filters). Pas via programme data-sharing (confidentialité Heaven).
- **Consequences**
  - ✅ Meilleure qualité flirt naturel que Claude-only
  - ✅ Le moins cher du stack
  - ⚠️ Grok modère progressivement (évolution 2025-2026) — monitoring nécessaire
  - ⚠️ $25 crédits promo signup = ~2 mois runway initial

---

## ADR-013 — Stack IA V1 = Groq Llama 3.3 70B default + Grok + Haiku + Mistral

- **Date** : 2026-04-24 (post-research)
- **Status** : Proposed
- **Context** : Research avril 2026 montre Groq (Llama 3.3 70B) = meilleur rapport qualité/coût/latence (1665 t/s, $0.59/$0.99, flirt naturel). Grok = meilleur NSFW-tolerant pas cher. Haiku = long context + complex. Mistral = FR natif premium.
- **Decision** : Stack 4 providers via OpenRouter, routing automatique selon intent + bucket + budget.
  - **Default 80%** : Groq Llama 3.3 70B
  - **NSFW edge 10%** : Grok 4.1 Fast
  - **Complex/long ctx 5%** : Claude Haiku 4.5
  - **FR premium 5%** : Mistral Large 3
- **Consequences**
  - ✅ Coût ~12€/mois à 15k msg/mois (1/3 du plan initial Haiku-only)
  - ✅ Latence meilleure (Groq 1665 t/s vs Haiku 600ms TTFT)
  - ✅ Flirt plus naturel (Llama base non-aligned + Grok tolérant)
  - ⚠️ Complexité router +20% vs single provider — acceptable

---

## ADR-014 — Lead scoring 5 buckets FAINT-hybride (Phase 1 rules+LLM)

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Research a montré que BANT/MEDDIC trop B2B pour fans DM. FAINT + signaux sociaux = meilleur fit B2C créateur. ManyChat/Substy scorent sur engagement + intent + valeur perçue.
- **Decision** : Buckets `hot` / `warm` / `cold` / `troll` / `existing` + flag `churn_risk`. Scoring composite : Engagement 40% + Intent 35% + Valeur 15% + RFM 10%. Phase 1 = rules regex + LLM classifier Haiku cheap (pas ML avant 500+ fans + 3 mois data).
- **Consequences**
  - ✅ Focus énergie agent sur leads convertissables (+30-40% conversion estimé)
  - ✅ Worker priority queue traite HOT en premier
  - ✅ Canned responses pour TROLL → économie coût IA
  - ⚠️ Risque over-fitting rules FR/EN spécifiques — monitoring drift recommandé

---

## ADR-015 — Context persistence cross-provider via format ChatCompletion + rolling summary + RAG pgvector

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Si agent switch entre Groq, Grok, Haiku sur même conversation, risque de contradictions, perte mémoire, drift de ton, AI leak. Besoin de format standardisé + stratégie mémoire + guardrails post-processing.
- **Decision** :
  - Format interne unifié : OpenAI ChatCompletion (supporté par 95% providers natif, wrapper pour Claude)
  - Rolling summary des conv >10 msgs (1 appel Haiku cheap par compression)
  - Embedding memory via pgvector Supabase (déjà stack, gratuit) pour conv >50 msgs
  - Guardrails post-processing uniformes quel que soit le provider
- **Consequences**
  - ✅ Switch provider transparent du point de vue agent
  - ✅ Mémoire long terme scalable
  - ✅ Zero coût infra additionnel (pgvector natif Supabase)
  - ⚠️ Claude perd prompt caching via format unifié — trade-off acceptable

---

## ADR-016 — Multi-agent dev workflow avec chef de projet + 8 agents spécialisés

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : NB veut éviter bugs/erreurs en exécutant plan comme vraie agence dev. Un agent unique Claude Code qui code tout = risque qualité. Division + review croisée = production-grade.
- **Decision** : Chef de projet (Opus) orchestre 8 agents spécialisés : Architect, Frontend, Backend, Database, AI/Prompts, Safety/QA, Ops, Documentation. Tickets atomiques <200 lignes, worktrees isolés, review obligatoire, merge séquentiel.
- **Consequences**
  - ✅ Qualité production-grade
  - ✅ Parallélisation où possible (réduction temps total)
  - ✅ Traçabilité complète (CHANGELOG par ticket)
  - ⚠️ Overhead coordination +15% temps — mais réduction bugs >30% = net positif

---

## ADR-017 — Scaling progressif par phase α/β/γ/δ (self-host >300k msg/mois)

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Break-even self-host LLM = ~300-500M tokens/mois. À 5k fans actuels, API only rentable. À 50k+ fans + pub virale IG, re-évaluer.
- **Decision** :
  - Phase α (0-5k fans) : stack API, ~12€/mois
  - Phase β (5-20k) : stack API + Supabase Pro, ~60€/mois
  - Phase γ (20-50k) : stack API + Vercel Pro + queue dédiée, ~165€/mois
  - Phase δ (50k+) : self-host Llama 3.3 sur Hetzner GPU + Claude/Grok conservés, ~600-900€/mois
- **Consequences**
  - ✅ Progression organique, pas d'over-engineering
  - ✅ ROI review à chaque transition
  - ⚠️ Migration self-host = 2-3 semaines dev → à planifier 1 mois avant seuil

---

## ADR-018 — Rate limit per fan (anti-spam + anti-burnout agent)

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Fan peut envoyer 50 msg/min (flood/troll). Sans rate limit → coût IA explose + spam perçu.
- **Decision** : Table `fan_rate_limits` + règles :
  - Max 10 msg/h/fan côté traitement inbound
  - Max 20 réponses agent/jour/fan
  - Mode conservation TROLL : 1 canned response /24h
- **Consequences**
  - ✅ Budget IA protégé des spammers
  - ✅ UX fan préservée (pas de spam agent répété)
  - ⚠️ Faux positifs possibles si fan très engagé légitime — override manuel Yumi possible

---

## ADR-019 — Embedding model = text-embedding-3-small OpenAI

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Besoin embeddings pour RAG pgvector. Options : OpenAI text-embedding-3-small ($0.02/1M), voyage-3-lite ($0.02/1M), Cohere, etc.
- **Decision** : **OpenAI text-embedding-3-small** via OpenRouter. 1536 dimensions, cheap, qualité éprouvée, standard industrie.
- **Consequences**
  - ✅ Zéro infra custom
  - ✅ Coût négligeable (~0.00001€/message)
  - ⚠️ Dépendance OpenAI — alternative voyage-3-lite dispo si changement

---

## ADR-020 — Pas de data-sharing avec providers (confidentialité Heaven)

- **Date** : 2026-04-24
- **Status** : Accepted
- **Context** : Grok propose $150/mois crédits en échange partage prompts pour training. Claude a ses propres conditions. Heaven = projet confidentiel absolu.
- **Decision** : **JAMAIS** de programme data-sharing. Seulement tier API standard payante. Toutes les politiques Zero-retention si disponibles (Claude 30j, Grok similaire).
- **Consequences**
  - ✅ Confidentialité Heaven préservée
  - ✅ Compliance RGPD
  - ⚠️ Perte $150/mois crédits Grok — acceptable

---

---

## ADR-021 — 3 modes de conversation (auto / shadow / human) par conversation

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : NB veut que l'agent apprenne du style Yumi. Shadow mode = Yumi répond elle-même, agent génère silencieusement, comparaison draft vs ground truth.
- **Decision** : 3 modes par conv : `auto` (agent répond), `shadow` (agent draft silencieux + Yumi répond, compare), `human` (Yumi seule). Modes persistent par conv, activables via UI.
- **Consequences**
  - ✅ Apprentissage actif sans fine-tune
  - ✅ Yumi garde contrôle total si veut
  - ✅ Dataset examples croît organiquement
  - ⚠️ Coût shadow = appel IA même si pas envoyé (acceptable, ~0.0003€/draft)

---

## ADR-022 — Apprentissage via capture examples + curation humaine (pas fine-tune V1)

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Comment améliorer agent sans fine-tune coûteux ? Capture automatique examples depuis : shadow drafts validés + réponses Yumi + conversions success/fail.
- **Decision** : Pipeline capture → status DRAFT → curation humaine Yumi (UI Training) → promote to active si acceptée. Re-génère prompt automatique quand N nouveaux examples ajoutés.
- **Consequences**
  - ✅ Amélioration continue avec 0 coût compute (vs fine-tune)
  - ✅ Yumi garde contrôle qualité
  - ✅ Rollback facile (prompt versioning)
  - ⚠️ Plafond qualité prompt engineering — fine-tune envisageable V3 si dataset >1000 examples qualité

---

## ADR-023 — Multilingue auto FR/EN/ES/DE/IT/PT via franc + prompt adaptations

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : NB demande support FR/EN/ES/DE/IT/PT. Détection auto langue fan + adaptation persona.
- **Decision** : Librairie `franc-min` (offline, 10KB) pour détection. 1 persona base + 6 adaptations linguistiques (idiomes, emojis, ton culturel). Mistral Large 3 prioritaire FR premium, Groq Llama default reste.
- **Consequences**
  - ✅ Auto-détection gratuite (no API call)
  - ✅ Persona cohérente cross-language
  - ✅ Culturalement adapté (DE direct, IT effusif, etc.)
  - ⚠️ 6 fichiers prompt à maintenir — acceptable

---

## ADR-024 — Content catalog Fanvue + RAG obligatoire anti-hallucination

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : NB règle absolue : agent ne doit JAMAIS inventer contenu/prix/URL Fanvue. Solution = catalog DB + RAG + validation outbound URLs/prix.
- **Decision** : Table `content_catalog` avec contenus réels (saisis par Yumi manuel V1, auto-sync V2 si API Fanvue). RAG systématique si intent commercial détecté. Validation post-gen regex URLs + prix.
- **Consequences**
  - ✅ Zéro risque crédibilité (promesses fausses)
  - ✅ Yumi peut matcher contenu avec interests fan
  - ✅ Analytics : quels contenus convertissent le mieux
  - ⚠️ Yumi doit maintenir catalog (+ 10 min/semaine) — nécessaire

---

## ADR-025 — Fan interests tracking (tags pondérés via LLM classifier)

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Matcher contenu Fanvue aux préférences fan nécessite tracker les interests de chaque fan.
- **Decision** : Table `fan_interests(fan_id, interest_tag, weight)` peuplée par LLM classifier Haiku qui extrait tags depuis chaque msg fan.
- **Consequences**
  - ✅ RAG boosté par interests matching (tags content × tags fan)
  - ✅ Coût négligeable (LLM classifier déjà appelé pour intent)
  - ⚠️ Risque faux positifs sur interests ambigus — monitoring

---

## ADR-026 — Persona tuning traits (0-10) + moods avec deltas

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : NB veut Yumi ajustable (humeur / flirt / dominance). Chaque modèle doit avoir profil indépendant.
- **Decision** : Base persona = 10 traits scalaires (warmth, flirt, dominance, etc. 0-10). Moods = deltas transitoires appliqués par-dessus (ex: "sensual" = flirt +2). Auto-scheduling possible (horaires moods). Custom moods créables.
- **Consequences**
  - ✅ Yumi reflète son humeur réelle → agent cohérent
  - ✅ Configurable finement sans toucher code
  - ✅ Multi-modèle : chaque persona indépendant
  - ⚠️ Complexité UI — mitigé via presets simples

---

## ADR-027 — Mood overlay automatique par bucket fan

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Optimiser conversion via adaptation mood au bucket fan (HOT = plus direct, COLD = plus doux, CHURN_RISK = empathique).
- **Decision** : Automatic mood overlay applique deltas supplémentaires selon bucket. Ex: bucket=hot → directness +2, flirt +1. Transparent pour Yumi (voit uniquement son mood global), overlay appliqué runtime.
- **Consequences**
  - ✅ Conversion optimisée par contexte
  - ✅ Yumi ne gère que 1 dimension (mood global)
  - ⚠️ Moins de contrôle fin — acceptable pour V1

---

## ADR-028 — Cross-channel unified context (fan identity + timeline fusionnée)

- **Date** : 2026-04-24
- **Status** : Proposed
- **Context** : Fan peut interagir via IG DM + IG story + web profile. Sans unification = contexte fragmenté, agent incohérent.
- **Decision** : `agence_fans` = identity canonique. Linking automatique (ig_user_id, email, phone) + suggestion merge UI Yumi pour cas ambigus. Timeline unifiée via vue `agence_messages_timeline` étendue. Agent fetch history cross-channel.
- **Consequences**
  - ✅ Agent cohérent "tu me reparles!" au lieu de "tu viens d'où?"
  - ✅ Lead scoring unifié (signaux cross-channel = boost)
  - ✅ Attribution conversion précise
  - ⚠️ Merge logic complexe — tests critiques Phase 10

---

## ADR-029 — Worker unifié toutes canaux (vs workers séparés)

- **Date** : 2026-04-24
- **Status** : Proposed — alternative à doc 13 §7.3
- **Context** : Actuellement worker IG séparé. Pour web + IG story unifiés, option : worker unique poly-canal ou workers séparés par canal.
- **Decision** : **Worker unifié** `/api/cron/process-agent-replies` + queue unique `agent_reply_queue` (polymorphique par channel).
- **Consequences**
  - ✅ Moins de duplication code
  - ✅ Logs centralisés
  - ✅ Rate limit logique global
  - ⚠️ Coupling canaux — acceptable vu architecture

---

## Décisions en attente validation NB

- [ ] ADR-001 — Greffer sur worker existant
- [ ] ADR-002 — Multi-IA via OpenRouter (+5.5% markup acceptable ?)
- [ ] ADR-003 — Intent classifier rules+LLM
- [ ] ADR-004 — Prompt versioning DB
- [ ] ADR-005 — Zéro fine-tune V1
- [ ] ADR-006 — PII scrubber avant provider
- [x] ADR-007 RÉVISÉ — Grok 4.1 Fast INCLUS V1 (au lieu de zéro) — **révision post-research**
- [ ] ADR-008 — Humanizer delay 2-8s
- [x] ADR-009 — Yumi admin cross-model (option 2) ✅ validé NB 2026-04-24
- [x] ADR-010 — ROOT mode présentation ✅ validé NB 2026-04-23
- [ ] ADR-011 — Polling 15s (pas WebSocket)
- [ ] ADR-012 — Feature flags DB
- [ ] **ADR-013 — Stack IA V1 Groq+Grok+Haiku+Mistral** ⭐ nouveau
- [ ] **ADR-014 — Lead scoring 5 buckets FAINT-hybride** ⭐ nouveau
- [ ] **ADR-015 — Context persistence ChatCompletion + rolling + RAG** ⭐ nouveau
- [ ] **ADR-016 — Multi-agent dev workflow 8 specialists** ⭐ nouveau
- [ ] **ADR-017 — Scaling progressif α/β/γ/δ** ⭐ nouveau
- [ ] **ADR-018 — Rate limit per fan** ⭐ nouveau
- [ ] **ADR-019 — Embedding OpenAI text-3-small** ⭐ nouveau
- [x] **ADR-020 — Zéro data-sharing providers** ⭐ nouveau (règle Heaven)
- [ ] **ADR-021 — 3 modes conv auto/shadow/human** ⭐⭐ v0.3.0
- [ ] **ADR-022 — Apprentissage capture + curation (pas fine-tune V1)** ⭐⭐ v0.3.0
- [ ] **ADR-023 — Multilingue FR/EN/ES/DE/IT/PT via franc** ⭐⭐ v0.3.0
- [ ] **ADR-024 — Content catalog Fanvue + RAG obligatoire** ⭐⭐ v0.3.0
- [ ] **ADR-025 — Fan interests tracking auto LLM** ⭐⭐ v0.3.0
- [ ] **ADR-026 — Persona tuning traits + moods** ⭐⭐ v0.3.0
- [ ] **ADR-027 — Mood overlay auto par bucket** ⭐⭐ v0.3.0
- [ ] **ADR-028 — Cross-channel unified context** ⭐⭐ v0.3.0
- [ ] **ADR-029 — Worker unifié toutes canaux** ⭐⭐ v0.3.0
- [ ] **ADR-030 — Voice clone ElevenLabs V2 (doc 14)** ⭐⭐⭐ v0.4.0
- [ ] **ADR-031 — Audio triggers par bucket + mood (pas systématique)** ⭐⭐⭐ v0.4.0
- [ ] **ADR-032 — LoRA fine-tune Yumi via Flux 1.1 Pro (doc 15)** ⭐⭐⭐ v0.4.0
- [ ] **ADR-033 — Video gen stack Kling AI + Runway Gen-4 + Hedra (doc 15)** ⭐⭐⭐ v0.4.0
- [ ] **ADR-034 — Identity profile + scenario library + 3-layer prompt composer** ⭐⭐⭐ v0.4.0
- [ ] **ADR-035 — CM IA trends scraping Apify + ExplodingTopics (doc 16)** ⭐⭐⭐ v0.4.0
- [ ] **ADR-036 — Storyline life_events + locations + preferences stables (doc 17)** ⭐⭐⭐ v0.4.0
- [ ] **ADR-037 — Storyline validate scenario before generation (anti-contradiction)** ⭐⭐⭐ v0.4.0

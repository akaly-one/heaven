# CHANGELOG — Module AI Conversational Agent

## [v0.5.0-plan] — 2026-04-24 soir — Ajustement phases après livraison Phase 3 partielle + sécurité

> Lien avec livraison globale Heaven v1.3.0 : [plans/_reports/UPDATE-REPORT-2026-04-24-0707-root-cp-m0-security-phase1.md](../../_reports/UPDATE-REPORT-2026-04-24-0707-root-cp-m0-security-phase1.md)

### Phase 3 (Refonte 3-CP) — 60% livré
- ✅ **ROOT = m0 CP maître** créé (agence_models row, entity config, mode spécimen `/agence`)
- ✅ **YUMI m1** scopé (display YumiClub, login yumi, data m1 uniquement)
- ✅ **PALOMA/RUBY** standardisés (1 username, password Mod{3lettres}2026)
- ✅ **Hiérarchie Root > Yumi > modèles** enforced backend (PATCH + reset-code)
- ✅ **Matrice accès** partielle via scopes + `canEditTarget()`
- ⏸ Auth-guard frontend : `/agence/models/*` pas encore protégé côté client
- ⏸ `config/modules.ts` centralisé non créé — scope via scopes DB pour l'instant

### Migrations DB (renumérotation forcée)

**Avant** : migrations IA agent planifiées 040-047

**Maintenant** : migrations 050 et 051 prises par livraison Heaven v1.3.0 (ROOT + sécurité).

**Nouvelle numérotation Phase 4 IA agent** :
| Ancien | Nouveau | Sujet |
|--------|---------|-------|
| 040 | 052 | ai_providers |
| 041 | 053 | agent_personas |
| 042 | 054 | prompt_examples |
| 043 | 055 | ai_runs + indexes |
| 044 | 056 | conversion_attribution |
| 045 | 057 | fan_scores + indexes |
| 046 | 058 | fan_score_events |
| 047 | 059 | feature_flags |
| — | 060 | agent_reply_queue unifié |
| — | 061 | persona_moods (seed 8 presets) |
| — | 062 | content_catalog + pgvector |
| — | 063 | fan_interests |
| — | 064 | agence_fans UTM + language + country |
| — | 065 | RLS policies IA tables |
| — | 066 | RPC claim_priority jobs |

**À répercuter dans 03-TECH.md** et 07-MULTI-AGENT-ORCHESTRATION.md (tickets T-DB-01..16).

### Sécurité infrastructure partagée
- Migration 051 ajoute `auth_events`, `failed_attempts`, `locked_until`, `code_hash`, `auth_rate_limits`, RPCs lock/reset
- Agent IA pourra réutiliser `agence_auth_events` pour log accès critiques (override mode, feedback)
- `code_hash` (bcrypt futur Phase 1.4) impactera l'auth sans rompre l'agent

### Impact doc SECURITY-PROGRESSIVE-2026.md
- Plan 5 phases de durcissement progressif établi côté plateforme
- L'agent IA devra respecter ce niveau (Phase 2 → disclosure AI Act obligation à revoir)
- ADR-020 (zéro data-sharing providers) reste en vigueur et renforcée

### Prochains tickets prêts à dispatcher

| Ticket | Scope | Dépend |
|--------|-------|--------|
| T-FE-AG1 | Auth-guard ajoute `/agence/models/*` aux routes admin-only | Phase 3 |
| T-FE-AG2 | Composant `<ModulePresentationCard />` réutilisable (actuellement inline) | Phase 3 |
| T-BE-AG3 | Config `src/shared/config/modules.ts` (mapping module → roles/scopes/routes) | Phase 3 |
| T-SEC-1.3 | Mask code in `/api/agence/accounts` (retourner `has_password: true`) | Phase 1 sec |
| T-SEC-1.5 | Rate limit migration in-memory → table `auth_rate_limits` | Phase 1 sec |
| T-DB-AG01..16 | Migrations IA agent 052-066 (renumérotation) | Phase 4 |

---

## [v0.4.0-plan] — 2026-04-24 — Roadmap V2/V3 complète (voice + content gen + CM IA + storyline)

### Nouveau (4 docs backlog V2/V3)

**V2 (Phase post-launch V1 — 2-3 mois après stabilisation V1)** :
- `14-VOICE-AUDIO-GENERATION.md` — TTS voice cloning Yumi (ElevenLabs Creator $30/mois), triggers audio intelligents par bucket+mood, multi-language via eleven_multilingual_v2, coût ~40€/mois ajouté

**V3 (Phase expansion — 6-12 mois post-V1)** :
- `15-CONTENT-SCENARIOS-GENERATION.md` — architecture 3 couches (Identity profile + Scenario library + Prompt composer), LoRA fine-tune Yumi, stack Flux 1.1 Pro + Kling AI + Hedra, validation cohérence face/body, ~120€/mois
- `16-COMMUNITY-MANAGER-AI.md` — trends detection (Apify + ExplodingTopics), competitor benchmarking, editorial calendar auto, idea generator LLM Sonnet, ~165€/mois
- `17-STORYLINE-LIFE-CONSISTENCY.md` — life_events + locations + stable_preferences + storyline_arcs, agent context runtime, validation anti-contradiction, ~3€/mois

### Capacités complètes ajoutées v0.4.0

- **🎤 Messages audio** : Yumi envoie voice notes clonées dans sa vraie voix, 15-40% des réponses HOT/WARM
- **📸 Génération contenu cohérent** : scenarios structurés → prompts images/vidéos avec LoRA Yumi → face/body consistency cross-content
- **🎬 Support multi-format** : IG Reel, IG Post, TikTok, Fanvue photoset/video, avatar talking head (Hedra)
- **🔮 Community Manager IA** : trends detection 24/7, calendrier éditorial auto-optimisé, benchmarking concurrentes, prédiction performance
- **🌍 Storyline persistante** : Yumi vit une vraie vie fictive (appartement Paris, yoga 3x/sem, voyages Ibiza/Dubai/NYC, pet chat Mia), agent répond cohérent dans le temps
- **🎭 Life events runtime** : agent sait ce que Yumi "fait" maintenant → répond "je sors du yoga" si event yoga en cours
- **✅ Anti-contradiction** : scenarios validés vs storyline, CM propose idées cohérentes univers

### Stack coût complet (V1+V2+V3)

- V1 texte : ~12€/mois (15k msg/mois) ou ~120€/mois (150k msg/mois)
- V2 audio : +~40€/mois
- V3 content generation : +~120€/mois
- V3 CM + scraping : +~165€/mois
- V3 storyline : +~3€/mois

**Total full stack V3** : ~350€/mois à volume actuel Yumi, ~500€/mois à 50k fans.

Si business justifie (revenus Fanvue >2k€/mois) → ROI net largement positif.

### Nouveaux ADRs (030 à 037, 8 ajouts)

Voir `DECISIONS.md`.

### Progressive rollout recommandé

```
Phase 1-11 (V1 — texte + scoring + multilingue + shadow + storyline basique) : SEMAINES 1-6
   ↓ 2 mois stabilisation + business validation
V2 Phase 12-14 (Voice audio) : SEMAINES 10-13
   ↓ 2 mois stabilisation
V3 Phase 15-20 (Content gen + CM + storyline complète) : SEMAINES 20-30
```

Soit **6-8 mois du plan complet**. Mais chaque phase est **profitable standalone** — pas besoin d'aller jusqu'à V3 pour voir ROI.

---

## [v0.3.0-plan] — 2026-04-24 — Plan enrichi (shadow mode + multilingue + catalog + persona tuning + cross-channel)

### Nouveau (5 docs)
- `09-SHADOW-MODE-LEARNING.md` — 3 modes conv (auto/shadow/human) + apprentissage contextuel + pipeline capture examples + curation Yumi + calibration continue prompt
- `10-MULTILINGUAL.md` — auto-détection FR/EN/ES/DE/IT/PT via `franc` + 6 adaptations culturelles + provider routing par langue + tests cross-lingual
- `11-CONTENT-CATALOG-GROUNDING.md` — table `content_catalog` + RAG anti-hallucination + validation URLs/prix post-gen + fan_interests matching
- `12-PERSONA-TUNING.md` — 10 traits scalaires (warmth/flirt/dominance/etc.) + moods transitoires + auto-scheduling + mood overlay par bucket fan
- `13-CROSS-CHANNEL-CONTEXT.md` — unification web + IG DM + IG story replies par `agence_fans.id` + timeline fusionnée + merge UI + worker unifié

### Modifié
- `00-README.md` — arborescence 14 docs total
- `DECISIONS.md` — ADR-021 à ADR-029 ajoutés (9 nouveaux ADRs)

### Capacités ajoutées
- **Shadow mode** : agent observe NB/Yumi en arrière-plan, génère drafts silencieux, compare, apprend
- **Apprentissage continu** : capture automatique examples depuis conversations réussies, curation humaine, re-génération prompt versionné
- **Multilingue** : 6 langues Yumi natives + adaptation culturelle (tutoyer FR, direct DE, passionné IT/ES, intime PT-BR)
- **Anti-hallucination** : catalog Fanvue réel consulté avant mentionner contenu, validation outbound URLs/prix
- **Persona tuning** : Yumi ajuste mood en 1 clic (Playful / Sensual / Mysterious / Caring / Dominant / Euphoric / Tired / Promo + custom)
- **Cross-channel** : même fan IG + web + story = 1 seul contexte, 1 seul score, agent cohérent

### Changements clés vs v0.2.0
- Ajout apprentissage par observation (shadow) = clef pour calibration naturelle
- Content catalog → prévient hallucinations critiques (promesses fausses de contenus)
- Persona ajustable = Yumi peut refléter son humeur réelle → agent authentique
- Cross-channel = fan unique = cohérence relationnelle conservée

### Impact scope Phase 5 (Agent IA v1)
- +3 tickets backend (shadow mode, persona runtime, cross-channel router)
- +2 tickets DB (persona_moods, content_catalog, fan_interests)
- +2 tickets AI/Prompts (6 adaptations linguistiques, persona traits injection)
- +1 ticket FE (mood selector UI + shadow mode UI)
- Estimation révisée Phase 5 : 6-7 jours au lieu de 4

---

## [v0.2.0-plan] — 2026-04-24 — Plan enrichi post-research (ManyChat + providers 2026 + lead scoring)

### Nouveau
- `05-SCALING.md` — stack providers 2026 (Groq Llama 3.3 default + Grok NSFW + Haiku complex + Mistral FR) + coûts 3 volumes (15k/150k/1.5M msg/mois) + self-host break-even
- `06-LEAD-SCORING.md` — scoring FAINT-hybride, 5 buckets (HOT/WARM/COLD/TROLL/EXISTING), DB schema `fan_scores`, classifier LLM rubric, decay cron
- `07-MULTI-AGENT-ORCHESTRATION.md` — workflow 8 agents spécialisés (Architect/FE/BE/DB/AI/QA/Ops/Docs) + chef de projet Opus + worktrees isolation
- `08-CONTEXT-PERSISTENCE.md` — format unifié ChatCompletion, rolling summary, RAG pgvector, guardrails post-processing uniformes

### Modifié
- `00-README.md` — arborescence mise à jour (+ 4 docs)
- `03-TECH.md` — seed `ai_providers` actualisé (Groq Llama default + Grok + Haiku + Mistral)
- `DECISIONS.md` — ADR-007 révisé (Grok inclus) + ADR-013 à ADR-020 ajoutés

### Research intégré
- **ManyChat patterns** : flow builder, tags, custom fields, sequences, 24h window, 200 DM/h, A/B testing
- **Alternatives créateurs** : Substy.ai (mode hybride seuil $), Supercreator (Izzy), Infloww CRM → patterns à intégrer en propre (pas dépendance SaaS)
- **IA Providers 2026** : Groq Llama 3.3 70B ($0.59/0.99, 1665 t/s) = meilleur, Grok 4.1 Fast ($0.20/0.50, NSFW-tolerant) = fallback, Haiku pour complex, Mistral FR premium
- **Grok clarification** : pas de tier gratuit prod, $25 crédits signup seulement, data-sharing refusé
- **Lead scoring** : FAINT + signaux sociaux, Rules + LLM classifier Phase 1, ML possible Phase 2+

### Changements clés vs v0.1.0
- Stack IA : passage de "Claude Haiku default" → "Groq Llama 3.3 default + Grok NSFW + Haiku complex" (coût divisé par 2-3)
- Ajout lead scoring complet (non prévu initialement)
- Ajout workflow multi-agent (exécution style agence)
- Coûts revalidés : ~12€/mois à 15k msg/mois (vs 25€ estimé initialement)

---

## [v0.1.0-plan] — 2026-04-24 — Plan initial

### Créé
- `00-README.md` — vue d'ensemble + 11 phases
- `01-STRATEGY.md` — business, personas, KPIs, contraintes
- `02-DESIGN.md` — UX flows, wireframes desktop+mobile, design system, responsive
- `03-TECH.md` — architecture backend, DB schema, multi-IA router, safety rails
- `04-OPS.md` — déploiement, monitoring, coûts, runbooks
- `DECISIONS.md` — 12 ADRs (2 validés NB, 10 en attente)
- `CHANGELOG.md` — ce fichier

### Décisions figées (audit préalable + confirmé NB)
- YUMI admin cross-model via `/agence/models/[id]/*` pages (option 2)
- ROOT = mode présentation skeleton vide + cartes descriptives modules
- Scope MVP : Phases 1-5 (Yumi IG only, provider Claude Haiku default)
- Budget IA cible : ~20€/mois (cap 50€/mois)

### En attente validation NB
- Stack multi-IA (Haiku only V1 ou Haiku+Sonnet dès V1 ?)
- Provider NSFW-tolerant (Grok/xAI) en V2 ?
- Scope canaux V1 (IG+web ensemble ou IG only ?)
- 10 ADRs proposés non encore validés

### Next actions
- NB valide 00-README.md + stack IA + scope MVP
- Dès GO → Phase 1 détaillée (01-STRATEGY.md approfondi par user stories)
- Puis Phase 2 wireframes Figma ou HTML (au choix NB)

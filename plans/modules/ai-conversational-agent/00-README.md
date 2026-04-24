# Module — AI Conversational Agent (Fanvue Conversion)

> **Source** : brief NB 2026-04-24 + audit UI/UX/Front/Back 2026-04-24
> **Statut** : Plan v1 en attente validation NB — **NE PAS CODER AVANT GO par phase**
> **Scope** : Agent IA conversationnel répondant aux DMs web + Instagram de Yumi (m1), duplicable multi-modèles, multi-IA, objectif conversion Fanvue

---

## TL;DR

**Quoi** : Un agent IA qui répond naturellement (flirt humain, pas robotique) aux DMs Instagram et web reçus par Yumi, les qualifie, et les redirige vers Fanvue pour du contenu premium.

**Pourquoi** : Convertir le trafic entrant IG/web en abonnés Fanvue payants (palier de rémunération BP Agence). Capacité à dupliquer pour Paloma/Ruby sans redév complète.

**Comment** :
- Multi-IA router (Claude Haiku default, Sonnet complex, providers alternatifs pour edge NSFW)
- Safety rails stricts (jamais révéler IA, jamais contenu explicite inbound, anti-spam)
- Prompt contexte versionnable (Yumi admin peut entraîner l'agent)
- Funnel attribution J+7 (UTM IG → DM → Fanvue)

**Quand** : 11 phases, ~6-8 semaines solo-NB avec sous-agents. Phases 1-5 = MVP (3 semaines). Phases 6-11 = production-ready.

---

## Contexte business

- **Heaven = confidentiel** : ne jamais révéler SQWENSY publiquement (voir mémoire `project_heaven_accounts.md`)
- **Mode A (Studio IA pur)** : Yumi = persona IA 100% sur Fanvue `yumiclub` + IG `@yumiiiclub`
- **Conversion = canal primaire** : caming/IG → PPV Fanvue (BP Agence §10, attribution J+7)
- **Palier P1 → P4** : agent doit aider à franchir palier revenus (<1k → >20k/mois)
- **Aucun vrai prénom** dans code/docs/prompts (directive absolue)

---

## Les 11 phases

| # | Phase | Durée | Livrable | Dépend. |
|---|-------|-------|----------|---------|
| 0 | Discovery & Audit | ✅ DONE | Rapport audit messagerie + matrice 3-CP | — |
| 1 | Cadrage & Spec | 1 j | Business requirements, personas IA, user stories | 0 |
| 2 | Design System UX | 3 j | Wireframes mobile+desktop, composants, flows | 1 |
| 3 | Refonte 3-CP | 3 j | Guard unifié, mode présentation ROOT, Yumi admin cross-model option 2 | 1 |
| 4 | DB schema IA | 1 j | Migrations `ai_providers`, `agent_personas`, `ai_runs`, `prompt_contexts`, `conversion_attribution` | 3 |
| 5 | Agent IA v1 monopro | 4 j | Claude Haiku greffé sur worker existant, context builder, safety basiques | 4 |
| 6 | Multi-IA Router | 3 j | Intent classifier, provider matrix, fallback chain | 5 |
| 7 | Prompts & Training UI | 3 j | Page `/messagerie/agent-training`, versioning prompts, sandbox mode | 5 |
| 8 | Funnel Fanvue | 3 j | UTM tracking, attribution J+7, deep links, KPI dashboard | 5 |
| 9 | Duplication multi-modèle | 2 j | Config per-model, personalités Paloma/Ruby | 5 + 6 + 7 |
| 10 | QA & UAT | 3 j | Tests unit + e2e + safety + manual 50 scénarios | 5→9 |
| 11 | Launch & Monitoring | 2 j | Feature flag, dashboard coûts, alertes | 10 |

**Total** : ~28 jours-équipe. Solo NB avec Claude Code sous-agents = **6-8 semaines calendaires** si focus partiel.

---

## Arborescence du plan

```
plans/modules/ai-conversational-agent/
├── 00-README.md                      ← ce fichier (vue d'ensemble + phases)
├── 01-STRATEGY.md                    ← business goals, KPIs, personas, positionnement
├── 02-DESIGN.md                      ← UX flows, wireframes, design system, responsive
├── 03-TECH.md                        ← architecture backend, DB schema, multi-IA router, safety
├── 04-OPS.md                         ← déploiement, monitoring, coûts, feature flags
├── 05-SCALING.md                     ← stack providers 2026 + coûts 3 volumes + self-host break-even
├── 06-LEAD-SCORING.md                ← scoring fans 5 buckets, actions différenciées, DB schema
├── 07-MULTI-AGENT-ORCHESTRATION.md   ← workflow dev multi-agents style agence full-stack
├── 08-CONTEXT-PERSISTENCE.md         ← cross-provider coherence (format unifié + RAG + guardrails)
├── 09-SHADOW-MODE-LEARNING.md        ← mode shadow + apprentissage contextuel + calibration prompt
├── 10-MULTILINGUAL.md                ← FR/EN/ES/DE/IT/PT détection auto + adaptation culturelle
├── 11-CONTENT-CATALOG-GROUNDING.md   ← catalog Fanvue + RAG anti-hallucination
├── 12-PERSONA-TUNING.md              ← profil IA ajustable (traits + moods) par modèle
├── 13-CROSS-CHANNEL-CONTEXT.md       ← web + IG DM + IG story replies unifiés par fan
│
│   ─── V2 backlog (post-launch V1) ───
├── 14-VOICE-AUDIO-GENERATION.md      ← TTS voice cloning Yumi (ElevenLabs) + DM audio
│
│   ─── V3 backlog (6-12 mois post-V1) ───
├── 15-CONTENT-SCENARIOS-GENERATION.md ← scénarios + prompts images/vidéos cohérents (LoRA + Flux/Kling/Hedra)
├── 16-COMMUNITY-MANAGER-AI.md        ← trends detection + editorial calendar + competitor benchmark
├── 17-STORYLINE-LIFE-CONSISTENCY.md  ← univers Yumi vivant (décors, événements, préférences stables)
│
├── DECISIONS.md                      ← ADRs (Architecture Decision Records)
└── CHANGELOG.md                      ← historique module
```

---

## Références clés

- **Audit source** : [plans/_reports/AUDIT-MODULES-CP-ARCHITECTURE-2026-04-24.md](../../_reports/AUDIT-MODULES-CP-ARCHITECTURE-2026-04-24.md)
- **Règles isolation CP** : [plans/03-tech/ISOLATION-CP-v1.2026-04-21.md](../../03-tech/ISOLATION-CP-v1.2026-04-21.md)
- **BP Agence §10 conversion** : [plans/business/bp-agence-heaven-2026-04/](../../business/bp-agence-heaven-2026-04/)
- **Worker existant** : [src/app/api/cron/process-ig-replies/route.ts](../../../src/app/api/cron/process-ig-replies/route.ts)
- **Config agent DB** : table `instagram_config` (migration 030)
- **Memory NB** : `feedback_root_master_authority.md`, `project_agence_profils.md`, `project_heaven_accounts.md`

---

## Règles de conduite

1. ❌ **Jamais coder une phase sans GO NB** sur matrice et scope de la phase
2. ❌ **Jamais révéler IA** dans les réponses agent (directive absolue)
3. ❌ **Jamais sortir de Meta standards** (pas de contenu explicite agent→fan en DM IG)
4. ❌ **Jamais de vrai prénom** stocké (seulement Yumi/Paloma/Ruby)
5. ✅ **Audit avant chaque phase** (`feedback_audit_before_implement`)
6. ✅ **Sous-agents pour charges lourdes** (`feedback_always_split_subagents`)
7. ✅ **Fractionner UI/UX/Front/Back** en tickets distincts par phase
8. ✅ **Tests avant merge** (unit + safety + manual)
9. ✅ **Changelog par phase** (ce fichier + `CHANGELOG.md` module)
10. ✅ **Coûts < 50€/mois IA** en MVP (stack budget 70-100€/mois total BP figé)

---

## Prochaine action

**GO NB attendu sur** :
- [ ] Valider les 11 phases et leur ordre
- [ ] Confirmer stack IA (Claude Haiku default + Sonnet complex + 1 provider NSFW-tolerant ?)
- [ ] Confirmer budget IA max (suggéré 50€/mois MVP)
- [ ] Confirmer scope MVP (Phases 1-5 ou autres ?)
- [ ] Confirmer branche de dev (continue sur main ou feature branch `feat/ai-agent-v1`)

Une fois GO → je passe à Phase 1 (Cadrage & Spec) avec livrable `01-STRATEGY.md` détaillé.

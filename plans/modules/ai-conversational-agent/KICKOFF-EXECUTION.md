# KICKOFF EXECUTION — Multi-agent dispatch log

> **Chef de projet** : Claude Opus 4.7 (main conversation)
> **Date** : 2026-04-24
> **Statut** : EXECUTION IN PROGRESS
> **Scope** : dispatch phases 1 + 4 + 5 (MVP V1) selon plan v0.4.0

---

## Ordre d'exécution

### Groupe 0 — Préparation (parallèle, indépendants)

- [🟢 IN PROGRESS] **Architect Agent** — Phase 1 user stories détaillées
- [🟢 IN PROGRESS] **Research Agent** — Standards web dev 2026 (a11y, perf, conventions)

### Groupe 1 — Socle DB (séquentiel, bloque reste)

- [⏸ PENDING confirmation NB] **Database Agent** — Phase 4 migrations 050-065 (16 tickets)

### Groupe 2 — Core implementation (après G1)

Parallèle :
- [⏸] **AI/Prompts Agent** — système prompts Yumi + guardrails + examples seed
- [⏸] **Ops Agent** — feature flags + dashboard ops scaffolding

Séquentiel :
- [⏸] **Backend Agent** — lib/ai-agent/* (types, providers, router, safety, classifier)
- [⏸] **Backend Agent** — worker IG modif + APIs agent/override/feedback/sandbox

Parallèle à BE :
- [⏸] **Frontend Agent** — composants agent (badge, toggle, card, typing, training panel)

Finaux :
- [⏸] **Safety/QA Agent** — tests cross-provider + safety filters + 50 scenarios QA
- [⏸] **Ops Agent** — dashboards `/agence/ops/ai-cost` + alertes Telegram

---

## Tickets Phase 4 (DB) — 16 tickets

| # | Ticket | Fichier | Dépend. | Estim. |
|---|--------|---------|---------|--------|
| T-DB-01 | `050_ai_providers.sql` + seed 4 providers | - | 10min |
| T-DB-02 | `051_agent_personas.sql` + seed Yumi v1 base prompt | T-DB-01 | 20min |
| T-DB-03 | `052_prompt_examples.sql` | T-DB-02 | 10min |
| T-DB-04 | `053_ai_runs.sql` + indexes perf | T-DB-01 | 15min |
| T-DB-05 | `054_conversion_attribution.sql` | - | 10min |
| T-DB-06 | `055_fan_scores.sql` + indexes + triggers | - | 20min |
| T-DB-07 | `056_fan_score_events.sql` audit | T-DB-06 | 10min |
| T-DB-08 | `057_feature_flags.sql` + seed disabled | - | 10min |
| T-DB-09 | `058_agent_reply_queue.sql` unifié (remplace ig_reply_queue ?) | - | 15min |
| T-DB-10 | `059_persona_moods.sql` + seed 8 presets Yumi | T-DB-02 | 15min |
| T-DB-11 | `060_mood_activation_log.sql` | T-DB-10 | 5min |
| T-DB-12 | `061_content_catalog.sql` + indexes GIN + vector | - | 20min |
| T-DB-13 | `062_fan_interests.sql` | T-DB-06 | 10min |
| T-DB-14 | `063_fans_extensions.sql` (UTM + language + country + channels) | - | 10min |
| T-DB-15 | `064_rls_policies_ai.sql` — RLS all new tables | G1 all | 30min |
| T-DB-16 | `065_rpc_claim_priority.sql` — RPC claim jobs avec bucket ordering | T-DB-09, T-DB-06 | 15min |

**Total Phase 4** : ~3h d'exécution Database Agent

---

## Points stratégiques à confirmer NB

### 🔴 CRITIQUE — avant Phase 4 DB

1. **Accès Supabase Heaven** : je ne vois pas de `mcp__supabase-heaven__*` dans les MCP disponibles. Options :
   - (a) Tu ajoutes MCP Supabase Heaven (config `.mcp.json`) → dispatch direct Database Agent
   - (b) Agent écrit fichiers `.sql` → tu les appliques manuellement via Supabase Studio / CLI
   - (c) Utilise `supabase db push` via Bash (nécessite `.env.local` + auth CLI)
   
   **Ma reco : (b)** — agent écrit SQL, tu reviews + apply. Plus safe qu'accès MCP direct pour Heaven (confidentialité).

### 🟡 MOYEN — à décider avant Phase 5

2. **Branche dev** : continue `main` via worktree Claude OU créer `feat/ai-conversational-agent-v1` ?
   **Ma reco** : worktree isolé par ticket (pattern déjà utilisé) + merge sur main en fin de phase. Pas de feature branch global.

3. **Scope MVP V1 final** : Phases 1 → 11 ou on peut s'arrêter à 5 (agent texte baseline) ?
   **Ma reco** : phases 1 → 5 + 11 (launch) = MVP minimal. Phases 6-10 peuvent être incrémentales post-launch.

4. **Provider NSFW** : validation définitive ADR-007 révisé (Grok 4.1 Fast inclus V1) ?
   **Ma reco** : inclus dès V1 pour 10% edge. Si tu n'es pas sûr, on peut démarrer 100% Groq Llama + ajouter Grok en V1.5.

### 🟢 CONFIRMÉS

- [x] Option 2 Yumi admin cross-model
- [x] ROOT = mode présentation
- [x] Plan v0.4.0 global OK ("je te fais confiance")

---

## Communication protocols

- **Agent → Chef projet** : rapport DONE/BLOCKED/CHANGES en markdown structuré
- **Chef projet → NB** : check-in après chaque phase (pas chaque ticket)
- **Urgence** : si agent bloqué ou conflit stratégique → pause + query NB

---

## Running log

**2026-04-24 — Start** : dispatch Architect + Research en parallèle. Phase 4 DB en attente confirmation NB sur Supabase access.

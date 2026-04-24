# 07 — Multi-Agent Orchestration (workflow dev style agence full-stack)

> **Objectif NB** : exécuter ce plan comme une vraie agence dev web avec un chef de projet qui pilote et des spécialistes full-stack. Minimiser bugs et erreurs via division du travail + revue croisée.

---

## 1. Philosophie

> *"Un agent dev Claude Code qui code tout seul = risque bugs + coupe-circuits. Une équipe d'agents Claude Code spécialisés + un chef de projet qui orchestre = qualité production."*

**Principes** :
1. **Séparation des responsabilités** — chaque agent a un scope clair (front, back, DB, IA, QA, ops)
2. **Chef de projet obligatoire** — coordonne, valide, intègre, jamais code directement sur logique métier critique
3. **Review croisée** — aucun code n'est mergé sans review par au moins 1 agent différent (QA)
4. **Fractionner le travail** — tickets < 200 lignes code, isolés, testables
5. **Documentation live** — chaque action = entry dans changelog
6. **Isolation git worktrees** — chaque agent travaille en isolation, merge propre

---

## 2. L'équipe — rôles & responsabilités

### 2.1 🎯 Chef de Projet (Orchestrator)

**Qui** : Claude Opus 4.7 (main conversation)
**Rôle** :
- Découpe le plan en tickets atomiques
- Dispatche chaque ticket à l'agent spécialisé adéquat
- Valide les livrables (tests verts, conforme au spec, review OK)
- Orchestre dépendances entre tickets
- Gère le merge final dans main
- Communique progress à NB
**Ne fait PAS** : coder directement des features (sauf patches chirurgicaux <50 lignes)

### 2.2 🏛 Architect Agent (Research + Design tech)

**Qui** : general-purpose (Opus) pour phases de recherche
**Scope** :
- Recherche tech (APIs providers, benchmarks)
- Design architecture (schémas C4, diagrammes)
- Specs de modules (`03-TECH.md` type)
- ADRs (Architecture Decision Records)
**Livrables** : docs markdown, pas de code

### 2.3 🎨 Frontend Agent

**Qui** : `senior-frontend` skill ou general-purpose focus FE
**Scope** :
- Composants React (`src/cp/components/**/*.tsx`)
- Pages Next.js (`src/app/**/*.tsx`)
- Hooks & state management
- CSS Tailwind v4
- Responsive mobile-first
- A11y WCAG AA
**Livrables** : code TSX/CSS, tests Storybook si applicable
**Limite** : ne touche pas aux API routes ni aux migrations DB

### 2.4 🔧 Backend Agent

**Qui** : `senior-backend` skill ou general-purpose focus BE
**Scope** :
- Routes API (`src/app/api/**/route.ts`)
- Business logic (`src/shared/lib/**`)
- Intégrations tierces (OpenRouter, Meta Graph, Fanvue)
- Workers / cron jobs
- Rate limiting / queuing
**Livrables** : code TS, tests unitaires
**Limite** : ne touche pas aux composants UI ni DB directement

### 2.5 🗃 Database Agent

**Qui** : general-purpose avec Supabase MCP access
**Scope** :
- Migrations SQL (`supabase/migrations/*.sql`)
- RLS policies
- Indexes + performance
- RPCs (stored procedures)
- Seed data
- Backup & restore scripts
**Livrables** : fichiers migration numérotés + scripts DOWN rollback
**Limite** : ne touche pas à application code

### 2.6 🤖 AI/Prompts Agent

**Qui** : general-purpose avec focus prompt engineering
**Scope** :
- System prompts agent Yumi/Paloma/Ruby
- Few-shot examples
- Guardrails (safety patterns detection)
- Intent classifier prompts
- Sandbox testing prompts
- Prompt versioning strategy
**Livrables** : markdown files `prompts/persona-{model}.md` + `guardrails.md` + tests
**Limite** : ne touche pas au code routing ni infrastructure

### 2.7 🛡 Safety/QA Agent

**Qui** : `brand-voice:quality-assurance` + general-purpose
**Scope** :
- Review code produit par autres agents
- Tests unit / integration / e2e
- Tests safety (prompt injection, AI leak, NSFW, rate limits)
- Checklist manuelle QA (50 scénarios)
- Compliance Meta + RGPD
**Livrables** : rapports review + PR comments + test coverage reports
**Limite** : peut **bloquer** une PR mais ne modifie pas le code (propose fixes)

### 2.8 📈 Ops/Monitoring Agent

**Qui** : general-purpose avec focus DevOps
**Scope** :
- Feature flags config
- Deployment Vercel
- Monitoring dashboards (/agence/ops)
- Alertes Telegram setup
- Runbooks
- Incident response procedures
**Livrables** : configs Vercel + dashboards code + docs runbooks

### 2.9 📚 Documentation Agent

**Qui** : general-purpose
**Scope** :
- Maintenir `plans/` à jour (CHANGELOG.md par module, `_reports/`)
- Writing READMEs
- Diátaxis compliance (tutorials, how-to, reference, explanation)
- Commentaires code (selon conventions — "pourquoi" pas "quoi")
**Livrables** : fichiers markdown dans plans/

---

## 3. Workflow par phase (exemple Phase 4 DB → Phase 5 Agent v1)

### 3.1 Phase 4 — DB migrations IA

**Chef de projet découpe en tickets** (renumérotés 2026-04-24 — 050/051 pris par Heaven v1.3.0) :
- T-DB-01 : Migration `052_ai_providers.sql` + seed Groq Llama 3.3 + Grok 4.1 Fast + Haiku 4.5 + Mistral
- T-DB-02 : Migration `053_agent_personas.sql` + seed Yumi base prompt v1
- T-DB-03 : Migration `054_prompt_examples.sql`
- T-DB-04 : Migration `055_ai_runs.sql` + indexes
- T-DB-05 : Migration `056_conversion_attribution.sql`
- T-DB-06 : Migration `057_fan_scores.sql` + indexes + trigger update timestamp
- T-DB-07 : Migration `058_fan_score_events.sql` audit
- T-DB-08 : Migration `059_feature_flags.sql`
- T-DB-09 : Migration `060_agent_reply_queue.sql` unifié
- T-DB-10 : Migration `061_persona_moods.sql` + seed 8 presets
- T-DB-11 : Migration `062_content_catalog.sql` + pgvector
- T-DB-12 : Migration `063_fan_interests.sql`
- T-DB-13 : Migration `064_fans_extensions.sql` (UTM + language + country + channels)
- T-DB-14 : Migration `065_rls_policies_ai.sql`
- T-DB-15 : Migration `066_rpc_claim_priority.sql` (claim_ig_reply_jobs v2 ordre priorité bucket)

**Dispatch** : Database Agent reçoit les 9 tickets, exécute séquentiellement via Supabase MCP, vérifie idempotence, commit en DB migration files.

**Review QA Agent** :
- Valide RLS couvre tous accès
- Valide indexes pertinents
- Valide DOWN scripts fonctionnels
- Blocage si schema casse convention

**Merge chef de projet** → branche PR ou main.

### 3.2 Phase 5 — Agent IA v1

**Chef de projet découpe** :

Backend tickets :
- T-BE-01 : `lib/ai-agent/types.ts` interfaces
- T-BE-02 : `lib/ai-agent/providers/{groq,grok,claude-haiku}.ts` via OpenRouter
- T-BE-03 : `lib/ai-agent/context-builder.ts` (fetch history + persona + fan_score)
- T-BE-04 : `lib/ai-agent/classifier.ts` (rules + LLM fallback)
- T-BE-05 : `lib/ai-agent/provider-router.ts` (decision matrix)
- T-BE-06 : `lib/ai-agent/safety/scrubber.ts` + `filter-outbound.ts`
- T-BE-07 : `lib/ai-agent/humanizer.ts` (delay 2-8s)
- T-BE-08 : Modif worker `/api/cron/process-ig-replies` — appel runAgent()
- T-BE-09 : Endpoint `/api/agence/agent/override` (mode toggle)

Frontend tickets :
- T-FE-01 : Composant `<AgentBadge>`
- T-FE-02 : Composant `<AgentModeToggle>`
- T-FE-03 : Composant `<AgentResponseCard>` (bulle avec hover meta + thumbs)
- T-FE-04 : Composant `<AgentTypingIndicator>`
- T-FE-05 : MAJ `/agence/messagerie` avec ces composants
- T-FE-06 : Bottom sheet composer mobile
- T-FE-07 : Empty states / loading states

AI/Prompts tickets :
- T-AI-01 : System prompt Yumi v1 (FR/EN, flirt naturel, no AI leak)
- T-AI-02 : 10 examples shots validés manuellement
- T-AI-03 : Liste 30 guardrails patterns (leaks, NSFW, spam)
- T-AI-04 : Intent classifier prompt rubric

Safety tickets :
- T-SAFE-01 : Tests unit safety/filter-outbound (30 cas)
- T-SAFE-02 : Tests unit classifier (50 cas)
- T-SAFE-03 : Tests integration worker e2e (mock Meta API)
- T-SAFE-04 : Review code Backend Agent output

Ops tickets :
- T-OPS-01 : Feature flag `AI_AGENT_YUMI_ENABLED` setup
- T-OPS-02 : Dashboard `/agence/ops/ai-cost` basique
- T-OPS-03 : Alerte Telegram cost cap

**Total Phase 5 : ~25 tickets**, dispatchables en parallèle **par groupe** :
- Groupe 1 (indépendants) : T-BE-01, T-AI-01, T-AI-02, T-AI-03, T-AI-04, T-OPS-01 → parallèle
- Groupe 2 (dépendent Group 1) : T-BE-02, T-BE-03, T-BE-04, T-BE-05, T-BE-06, T-BE-07 → séquentiel BE agent
- Groupe 3 (dépendent Group 2) : T-BE-08, T-BE-09 → BE agent
- Groupe 4 (parallèle à Group 2-3) : T-FE-01 → T-FE-07 → FE agent
- Groupe 5 (final) : T-SAFE-01 → T-SAFE-04, T-OPS-02, T-OPS-03 → QA + Ops

---

## 4. Protocole de communication

### 4.1 Chef de projet → Agent (dispatch ticket)

Template brief :

```
# Ticket T-XX-YY — [Titre clair]

## Contexte
[Phase + pourquoi ce ticket est nécessaire + référence au plan]

## Livrable attendu
[Fichier(s) à créer/modifier + signature(s) fonction si applicable]

## Contraintes
[Règles NB: pas de raw code front, audit avant, budget perf, etc.]

## Dépendances
- Précédent : T-XX-ZZ (doit être mergé)
- Parallèle OK avec : T-XX-AA

## Tests attendus
[Liste des assertions validant la done]

## Review
Par : [Safety Agent / autre]

## Temps estimé
[en heures]
```

### 4.2 Agent → Chef de projet (livraison ticket)

Template retour :

```
## Ticket T-XX-YY — DONE

### Fichiers modifiés
- path/to/file.ts (+X lines, -Y lines)
- ...

### Tests
- ✅ unit tests passing (N/N)
- ✅ typecheck clean
- ⚠️ 1 warning eslint ignoré (raison)

### Points à signaler
- [observation technique, décision à reviewer]
- [limite rencontrée]

### Prêt pour review
Par : [agent review assigné]
```

### 4.3 Review Agent → Chef de projet

Template review :

```
## Review T-XX-YY — [APPROVED / CHANGES REQUESTED / BLOCKED]

### Findings
- 🟢 Good: [positif à garder]
- 🟡 Minor: [suggestion non-bloquante]
- 🔴 Blocker: [doit être fixé avant merge]

### Recommandations
[actions concrètes à prendre]
```

---

## 5. Isolation git worktrees

### 5.1 Principe

Chaque ticket non-trivial = 1 worktree isolé = 1 branche Claude Code.

```bash
/Users/aka/Documents/AI-LAB/.claude/worktrees/
├── T-BE-01-ai-agent-types/          # Backend Agent
├── T-FE-03-agent-response-card/     # Frontend Agent
├── T-DB-06-fan-scores-migration/    # Database Agent
└── ...
```

**Bénéfices** :
- Zéro collision entre agents
- Rollback facile (delete worktree)
- Cherry-pick sélectif vers main
- Dev parallèle sans lock

### 5.2 Workflow merge

```
Agent dispatch → worktree créé → agent code + tests
  ↓
Agent push PR (ou signals "done")
  ↓
Review Agent fait sa passe
  ↓
Chef de projet :
  - si approved + pas conflit → cherry-pick vers main
  - si conflit → demande rebase Agent
  - si changes requested → renvoie Agent avec feedback
  ↓
Worktree archivé ou deleted
```

---

## 6. Outillage Claude Code utilisé

### 6.1 Skills pertinents

- `using-git-worktrees` — création worktree isolé par ticket
- `writing-plans` — agent crée plans avant exécution complexe
- `test-driven-development` — agents écrivent tests avant code
- `systematic-debugging` — agent fait bug investigation avant fix
- `requesting-code-review` — QA agent déclenché par chef de projet
- `dispatching-parallel-agents` — chef de projet dispatch groupes parallèles
- `subagent-driven-development` — pattern principal ici
- `verification-before-completion` — avant `DONE`, agent vérifie manuellement

### 6.2 Agents spécialisés Claude Code

| Agent Claude | Usage |
|--------------|-------|
| `Explore` | Recherche code rapide (audit) |
| `Plan` | Designer implementation plan détaillé |
| `general-purpose` | Tâches open-ended (research web, implementation complex) |
| `senior-frontend` skill | Patterns FE Next.js + React + Tailwind |
| `senior-backend` skill | Patterns BE Node + API + DB |
| `brand-voice:quality-assurance` | Review brand compliance |

### 6.3 MCPs (outils externes)

- Supabase MCP — Database Agent pour migrations
- Claude Preview MCP — FE Agent pour verification browser
- n8n MCP — Ops Agent pour workflows automation (si applicable)
- Notion MCP — Documentation Agent (si NB veut partager plans ailleurs)

---

## 7. Gestion bugs & conflits

### 7.1 Si agent produit du code buggy

- QA Agent bloque en review avec findings détaillés
- Chef de projet renvoie à l'agent original avec commentaires
- Agent fix + re-submit
- Max 3 rounds avant escalation NB

### 7.2 Si 2 agents produisent conflit (touchent même fichier)

- Chef de projet voit conflit au merge
- Decision tree :
  1. Vérifier si split tickets aurait évité conflit (cause = mauvais découpage)
  2. Demander à l'agent le plus récent de rebase
  3. Si conflit logique métier → chef de projet tranche
- Leçon apprise → ajuste découpage phases suivantes

### 7.3 Si agent bloque (ne trouve pas de solution)

- Agent signal "BLOCKED" avec explication + tentatives faites
- Chef de projet évalue :
  - Manque contexte → fournit + redispatche
  - Ticket mal défini → re-scope
  - Vrai blocage tech → escalade NB

---

## 8. Métriques qualité

### 8.1 Par ticket

- Taille PR (lignes ajoutées/supprimées)
- Tests ajoutés vs code ajouté (ratio cible 1:2)
- Coverage après merge
- Rounds de review nécessaires

### 8.2 Par phase

- Durée totale phase vs estimé
- Tickets bloqués (count + raison)
- Bugs détectés post-merge
- Review feedback satisfaction chef de projet

### 8.3 Dashboard live (optionnel)

Si NB veut voir : page `/agence/ops/dev-metrics` (root only) avec :
- Tickets en cours par agent
- Temps moyen / ticket
- Taux bloquage
- Coverage global

---

## 9. Runbook "dispatch d'une phase"

### Étape 1 — Préparation (chef de projet)

1. Lire phase dans `00-README.md`
2. Lire specs associées (`03-TECH.md`, `06-LEAD-SCORING.md`, etc.)
3. Découper en tickets atomiques (listes type §3)
4. Identifier dépendances + grouper parallélisables
5. Estimer temps par ticket

### Étape 2 — Validation NB

1. Présenter liste tickets + estimation à NB
2. Ajuster si besoin
3. Obtenir GO explicite

### Étape 3 — Dispatch

1. Pour chaque groupe parallélisable :
   - Créer worktree par ticket
   - Spawn agent approprié avec brief (template §4.1)
   - Lancer en background si parallèle
2. Monitorer progress via `TodoWrite`

### Étape 4 — Review & merge

1. À chaque "DONE" reçu, lancer review QA
2. Appliquer feedback
3. Cherry-pick dans main
4. Archive worktree
5. Update CHANGELOG module

### Étape 5 — Clôture phase

1. Test manuel e2e par chef de projet sur feature complète
2. Rapport livraison à NB avec : ce qui est fait, limitations connues, prochaine phase
3. Update plans/CHANGELOG-PLANS.md

---

## 10. Exemple concret — dispatch Phase 4 (DB migrations)

```
[Chef de projet] :
  → Prépare liste 9 tickets DB
  → Présente à NB : "Phase 4 DB, 9 migrations estimées 2h. GO ?"
  → NB : "GO"

[Chef de projet dispatch Database Agent] :
  Agent(Database, prompt = "Exécute T-DB-01 à T-DB-09 en séquence via Supabase MCP. Chaque migration indépendante = 1 fichier. Idempotent. RLS strict. Seed Yumi persona v1.")

[Database Agent exécute] :
  - Crée `040_ai_providers.sql`
  - Applique via Supabase MCP
  - Seed data inserted
  - ...
  - DONE : 9/9 migrations appliquées

[Chef de projet dispatch QA Agent review] :
  Agent(QA, prompt = "Review les 9 migrations SQL dans supabase/migrations/040-048. Check RLS, indexes, idempotence, seed valid, DOWN scripts.")

[QA Agent review] :
  - 🟢 Migrations propres
  - 🟡 Suggest index composite sur fan_scores(model_slug, bucket, score) — déjà présent
  - 🟢 RLS correcte
  - 🟢 Seed OK
  - APPROVED

[Chef de projet] :
  → Merge worktree vers main
  → Update CHANGELOG.md Phase 4 DONE
  → Report à NB : "Phase 4 DB terminée. Prêt pour Phase 5 (Agent v1 code) ?"
```

---

## 11. Prochaine action

Une fois NB valide le workflow + équipe → **dispatch Phase 1 (Cadrage détaillé)** au Architect Agent + Documentation Agent en parallèle.

Livrable Phase 1 : enrichir [01-STRATEGY.md](./01-STRATEGY.md) avec user stories complètes + acceptance criteria + test scenarios.

Voir aussi :
- [05-SCALING.md](./05-SCALING.md) — stack providers + coûts
- [06-LEAD-SCORING.md](./06-LEAD-SCORING.md) — scoring fans
- [08-CONTEXT-PERSISTENCE.md](./08-CONTEXT-PERSISTENCE.md) — cross-provider coherence

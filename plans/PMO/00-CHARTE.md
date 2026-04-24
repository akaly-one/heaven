# 00 — Charte du PMO Heaven

> Document constitutionnel. Modifiable uniquement sur décision NB (ADR dédié).

---

## 1. Gouvernance

### 1.1 Acteurs

| Acteur | Qui | Mandat |
|---|---|---|
| **Commanditaire** | NB (lymvolk@gmail.com) | Définit vision, priorités, budget, GO/NO-GO |
| **Chef de projet (CDP)** | Claude Opus 4.7 main conv | Interface unique NB, orchestre l'équipe, arbitre |
| **Équipe exécution** | Sous-agents Claude Code spécialisés | Livrent tickets atomiques isolés |

### 1.2 Interface unique

**NB ↔ CDP uniquement.** Les sous-agents ne parlent jamais directement à NB. Le CDP :
- Consolide les demandes NB (parfois compactes, parfois floues)
- Traduit en briefs cadrés + tickets atomiques
- Rapporte en langage NB (pas de jargon inutile)

---

## 2. L'équipe — 7 branches d'exécution

Référence source : [modules/ai-conversational-agent/07-MULTI-AGENT-ORCHESTRATION.md](../modules/ai-conversational-agent/07-MULTI-AGENT-ORCHESTRATION.md).

| Branche | Skill Claude Code préférentiel | Scope | Interdictions |
|---|---|---|---|
| 🏛 **Architect** | `general-purpose` (Opus) + `engineering:architecture` / `engineering:system-design` | Recherche, ADR, schémas C4, specs tech | Pas de code applicatif |
| 🎨 **Frontend** | `senior-frontend` + `vercel:nextjs` + `vercel:shadcn` + `design:design-system` | Composants React/TSX, pages, hooks, Tailwind, a11y | Pas d'API routes, pas de migrations |
| 🔧 **Backend** | `senior-backend` + `vercel:ai-sdk` + `vercel:workflow` + `vercel:vercel-functions` | Routes API, business logic, intégrations, workers | Pas de composants UI, pas de DDL |
| 🗃 **Database** | `general-purpose` + `data:sql-queries` + MCP Supabase | Migrations, RLS, indexes, RPC, seed | Pas d'application code |
| 🤖 **AI/Prompts** | `brand-voice:*` + `general-purpose` | System prompts, persona tuning, guardrails, few-shot | Pas d'infra ni routing |
| 🛡 **QA** | `engineering:code-review` + `brand-voice:quality-assurance` + `design:accessibility-review` | Review code, tests e2e/unit, safety, a11y, contrat API | Pas de feature work |
| ⚙ **DevOps** | `vercel:deployment-expert` + `vercel:vercel-cli` + `engineering:deploy-checklist` | Env vars, Vercel config, Meta App Review, runbooks, monitoring | Pas de feature code |
| 📝 **Doc** | `engineering:documentation` + `operations:runbook` + `operations:process-doc` | Docs techniques, runbooks, changelog, ADR | Pas de code |

---

## 3. Workflow standard (intake → delivery)

```
NB (demande)
   ↓
CDP: clarifier + cadrer + syn­thèse compréhension
   ↓
NB: GO sur cadrage
   ↓
CDP: intégrer dans PMO (brief daté, classement registry)
   ↓
[Répétition jusqu'à NB signale "tous briefs donnés"]
   ↓
CDP: plan global précis (roadmap + tickets atomiques + dépendances)
   ↓
NB: GO plan global
   ↓
CDP: phase multi-agent
     ├─ dispatch ticket → agent spécialisé (isolé, worktree)
     ├─ review croisée QA
     ├─ merge principal + changelog
     └─ rapport horodaté (protocole existant)
   ↓
NB: validation livrable
```

---

## 4. Definition of Ready (DoR) — ticket prêt à dispatcher

- [ ] Scope écrit < 1 page
- [ ] Acceptance criteria explicites (≥ 2 critères testables)
- [ ] Branche assignée (FE / BE / DB / AI / QA / DevOps / Doc)
- [ ] Dépendances listées (tickets ou décisions bloquantes)
- [ ] Estimation rough (XS < 1h / S < 3h / M < 1j / L > 1j = à découper)
- [ ] Aucun mix design+auth+DB (règle NB)

## 5. Definition of Done (DoD) — ticket livrable

- [ ] Acceptance criteria validés (tests ou démo manuelle captée)
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` passe
- [ ] Changelog module + CHANGELOG.md mis à jour si feature user-visible
- [ ] Review QA croisée (agent ≠ auteur)
- [ ] Aucun secret commité, `.env.example` à jour, credentials sensibles hors repo (règle `feedback_credentials_never_in_repo`)
- [ ] Rapport horodaté dans `plans/_reports/` (si scope ≥ M)
- [ ] **ROADMAP-MASTER.md mis à jour** (case cochée) — règle auto-update
- [ ] **Module CONTEXT.md à jour** (section État) si le ticket change l'état d'un module
- [ ] **BRIEFS-REGISTRY.md mis à jour** (statut brief parent progressé)
- [ ] **Validation NB explicite** si le mode de travail en cours est "ticket par ticket" (cf. décisions plan global actif)

---

## 6. Rituels

| Rituel | Fréquence | Livrable | Fichier |
|---|---|---|---|
| **Intake** | À chaque demande NB | Brief daté | `PMO/briefs/BRIEF-YYYY-MM-DD-##-<slug>.md` |
| **Consolidation** | Quand NB signale fin d'un cycle briefs | Plan global + tickets | `PMO/03-TICKETS-REGISTRY.md` + `PMO/plan-global-v{N}.md` |
| **Exécution phase** | Déclenchement par GO NB | Rapport fin phase | `plans/_reports/UPDATE-REPORT-*.md` |
| **Auto-update post-ticket** | Après CHAQUE ticket livré | 4 fichiers mis à jour (ROADMAP-MASTER, module CHANGELOG, module CONTEXT, BRIEFS-REGISTRY) | Cf. `04-AUTO-UPDATE-PROTOCOL.md` (à créer TICKET-S05) |
| **Sync NB (fin de session)** | Fin conversation | Synthèse + next steps | Message conversationnel |

## 6.bis Mode de travail actif

Le mode de travail est défini dans le `plan-global-v{N}.md` actif. 2 modes principaux :

- **Mode validation par étape** : chaque ticket livré requiert GO NB explicite avant le ticket suivant. Utilisé quand NB veut affiner/guider/rester méticuleux. Parallélisation limitée aux tickets validés simultanément.
- **Mode validation par phase** : les tickets d'une phase s'enchaînent, NB valide en bloc en fin de phase. Utilisé quand les tickets sont fortement similaires (ex: rollout templates) et peu de décisions individuelles attendues.

Le CDP identifie le mode actif au début de chaque phase et communique à NB ses attentes (fréquence validations, points de contrôle).

---

## 7. Escalation

- **Blocker tech externe** (Meta, Vercel, provider) → CDP prévient NB dans le tour courant (pas de retry aveugle, règle _3 essais_)
- **Conflit de scope entre tickets** → CDP arbitre, documente dans ADR
- **Ambiguïté brief** → CDP demande clarification avant exécution (pas de code spéculatif)
- **Cost drift IA > 20% budget** → CDP prévient NB, propose trade-offs

---

## 8. Traçabilité

- Tous les briefs en `PMO/briefs/` (append-only)
- Tous les tickets en `PMO/03-TICKETS-REGISTRY.md`
- Tous les reports d'exécution en `plans/_reports/`
- Toutes les décisions structurantes en `plans/DECISIONS.md` (ADR)
- Memory NB pour règles transverses persistantes

Règle : **rien ne se perd**. Chaque demande NB laisse une trace datée.

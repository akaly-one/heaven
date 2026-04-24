# 00 — Charte du PMO Heaven

> Document constitutionnel. Modifiable uniquement sur décision NB (ADR dédié).

---

## 1. Gouvernance

### 1.1 Acteurs

| Acteur | Qui | Mandat |
|---|---|---|
| **Commanditaire** | NB (lymvolk@gmail.com) | Définit vision, priorités, budget, GO/NO-GO |
| **Chef de projet (CDP)** | Claude Opus 4.7 main conv | Interface unique NB, orchestre l'équipe, arbitre, **redistribue toutes les tâches** |
| **Équipe exécution** | Sous-agents Claude Code spécialisés | Livrent tickets atomiques isolés |

### 1.2 Interface unique

**NB ↔ CDP uniquement.** Les sous-agents ne parlent jamais directement à NB. Le CDP :
- Consolide les demandes NB (parfois compactes, parfois floues)
- Traduit en briefs cadrés + tickets atomiques
- Rapporte en langage NB (pas de jargon inutile)

### 1.3 Règle de redistribution CDP obligatoire (NB 2026-04-24)

**Cardinale** : aucune tâche n'est exécutée par le CDP directement si elle peut être dispatchée à un sous-agent spécialisé. Le CDP :

1. **Analyse full-stack** chaque nouvelle demande avant exécution :
   - DB : tables nouvelles / migrations / RLS / indexes ?
   - BE : routes API / services / workers / cron ?
   - FE : composants / pages / hooks / a11y ?
   - IA : prompts / personas / extraction / guardrails ?
   - DevOps : env vars / deployment / monitoring / stacks tier ?
   - Legal : RGPD / consent / ToS / conformité ?
2. **Identifie les implications stack** : Supabase / Vercel / Groq / Cloudinary / OpenRouter / QStash / ajout de stacks tier ?
3. **Découpe en tickets atomiques** (1 ticket = 1 branche = 1 scope < 200 lignes)
4. **Dispatche aux agents spécialisés** via la matrice Charte §2 (pas d'exec CDP direct sauf hotfix <50L)
5. **Progresse par étapes synchrones** : 1 ticket livré + validé avant le suivant (sauf parallélisation explicite)
6. **Agrège les livrables** en rapport unifié pour NB

**Sanction** : un livrable produit sans dispatch ou sans découpe full-stack cohérente = refus CDP + redémarrage du ticket.

### 1.4 Workflow phase standard obligatoire (NB 2026-04-24)

**Chaque ticket ou phase passe OBLIGATOIREMENT par 4 étapes séquentielles** (standard agence dev) :

| Étape | Rôle | Agent type | Livrable |
|---|---|---|---|
| **1. DEV** | Produit le code / doc / migration | Spécialiste domaine (FE/BE/DB/AI/Doc/Legal) | Fichiers créés/modifiés, tests basiques (tsc, build) |
| **2. DEBUG** | **Teste UI/UX + Front + Back + intégration réelle en parallèle** (pas juste relecture code) | QA + agent différent du DEV | Rapport incohérences trouvées en **condition réelle** |
| **3. CORRECTIF** | Applique les fixes issus de DEBUG | Agent DEV initial OU spécialiste bug | Patchs appliqués, DEBUG rejoué pour confirmer |
| **4. OPTIMISATION** | Revue performances, standards, cohérence design system | Senior-frontend / Senior-backend / code-review | Optimisations appliquées, metrics before/after si perf |

### 1.4.bis Standard DEBUG enrichi (NB 2026-04-24 20:45)

**Un DEBUG correct teste en INTÉGRATION RÉELLE, pas en relecture statique.**

Un agent DEBUG qui se contente de relire le code produit par le DEV avec les mêmes outils trouvera peu d'incohérences car il fait la même lecture. Les **vraies incohérences** se révèlent quand on teste le flux bout-en-bout.

Tout agent DEBUG doit couvrir **3 couches simultanément** :

#### Couche A — Static Review (lecture code)
- Lecture fichiers produits
- TypeScript strict `npx tsc --noEmit`
- Grep patterns attendus / interdits
- Vérification imports + types
- **→ insuffisante seule**

#### Couche B — Live UI/UX Test (en conditions réelles)
- Utilise `preview_start` + `preview_*` tools pour lancer le dev server
- Interagit avec l'UI comme un vrai utilisateur :
  - Navigation (clics, scroll, focus)
  - Remplissage formulaires
  - Responsive (mobile + desktop via `preview_resize`)
  - Keyboard nav (Tab, Enter, Escape)
- Capture `preview_screenshot` avant/après changements critiques
- Vérifie `preview_console_logs` (pas d'erreurs JS)
- Vérifie `preview_network` (bons endpoints appelés, status codes OK)

#### Couche C — End-to-End Integration
- **Chaque action UI doit déclencher les bonnes modifs Back**
- Après clic sur bouton → query DB via MCP Supabase pour valider :
  - Row créée / updated avec les bonnes valeurs ?
  - Side effects présents (events log, triggers DB) ?
  - RLS respecté ?
- Après envoi API → vérifier retour + DB state
- Flux multi-step : tester le scénario utilisateur complet, pas juste un point

**Exemple DEBUG correct pour "Age Gate Modal"** :
- Static : lire `age-gate-modal.tsx` → a11y checks OK
- Live UI : lancer preview, aller sur `/m/yumi`, taper un message → modal doit apparaître → cocher checkbox → cliquer "Je certifie"
- End-to-End : query DB `SELECT age_certified, access_level FROM agence_clients WHERE id=...` → vérifier UPDATE effectué ; query `agence_age_gate_events` → vérifier event INSERT
- Re-ouvrir preview dans onglet incognito → modal ne doit pas réapparaître (cookie OK)
- Cliquer "Je suis mineur" dans autre session → vérifier redirect IG + event logged

**Un DEBUG qui NE fait QUE la Couche A est une revue statique, pas un DEBUG.**

### Règles d'application

- **Étape 2-3 (DEBUG + CORRECTIF)** : systématique après chaque ticket, **avant validation NB**
- **Étape 4 (OPTIMISATION)** : appliquée **en fin de phase** (batch sur tous livrables de la phase), PAS après chaque ticket individuel
- **Timing CDP** : le CDP juge quand OPTIMISATION est pertinent vs quand skip (ex : hotfix <20L = skip OPTIMISATION, feature UI complexe = OPTIMISATION obligatoire)
- **Aucun livrable n'est commit + push + validated NB sans avoir traversé DEV + DEBUG v2 (3 couches) + CORRECTIF**
- **Documentation systématique** dans le rapport horodaté `plans/_reports/UPDATE-REPORT-*.md` : qui a fait DEV, qui DEBUG, bugs trouvés en Couche A/B/C, fixes, optim

**Sanction** : un DEBUG qui ne couvre pas les 3 couches A+B+C = refus CDP + relance d'un DEBUG v2 complet.

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

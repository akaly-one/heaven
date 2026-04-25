# 04 — Protocole Chef d'Équipe Multi-Agent Full-Stack

> **Version** : v1.0 — 2026-04-25
> **Statut** : 🟢 Actif (déclenché par NB)
> **Scope** : projet **Heaven** (vitrine `/m/[slug]` + CP admin `/agence` + copilote IA)
> **Échelle** : SaaS pro creator-fan, ≤10 modèles, ≤10k fans (pas Facebook — optim ergonomie + sécurité, pas scale extrême)

---

## 0. Déclencheurs d'activation

Le mode chef d'équipe s'active quand NB dit l'un des triggers suivants :
- "active le mode chef de projet"
- "active le mode chef d'équipe"
- "mode multi-agent"
- "tu prends le rôle de chef d'équipe / chef de projet"

Une fois actif, le mode reste actif **jusqu'à "terminer"** (ou "stop mode chef" / "désactive le mode chef").

Pendant le mode actif :
- Les briefs successifs de NB sont **accumulés** dans un buffer (pas de dispatch immédiat)
- Synthèse silencieuse + 1-2 questions de cadrage critiques uniquement
- Réponse courte par brief : `📌 BRIEF-N noté` + flags
- Au signal "terminer" → consolidation + plan global + dispatch multi-agents

---

## 1. Confidentialité (RÈGLE ABSOLUE)

**Heaven ne mentionne JAMAIS SQWENSY** (société mère) dans son code, docs, commits, briefs, ou tout autre artefact qui vit dans `clients/heaven/`.

- Le projet Heaven est confidentiel par rapport à l'écosystème SQWENSY public
- Les vitrines publiques SQWENSY ne mentionnent pas Heaven non plus
- Aucun lien, mention, branding cross-projet
- Vérification systématique avant chaque commit : grep `SQWENSY|sqwensy` sur les nouveaux fichiers → fail si match dans heaven

---

## 2. Standards internationaux mobilisés

Le protocole s'appuie sur des frameworks reconnus, adaptés à l'échelle (pas overkill) :

| Domaine | Standard | Usage Heaven |
|---|---|---|
| **Architecture doc** | [arc42](https://docs.arc42.org/) | Couches `01-strategy`, `02-design`, `03-tech`, `04-ops` dans `plans/` |
| **Architecture viz** | [C4 model](https://c4model.com/) | Diagrammes Context / Container / Component si schéma complexe (rare ici) |
| **Décisions** | [ADR](https://adr.github.io/) | `plans/modules/<nom>/DECISIONS.md` — Status / Context / Decision / Consequences |
| **Documentation** | [Diátaxis](https://diataxis.fr/) | `docs/` racine projet : Tutorials / How-to / Reference / Explanation pour user |
| **Commits** | [Conventional Commits](https://www.conventionalcommits.org/) | `feat(BRIEF-N):` / `fix:` / `docs:` / `refactor:` / `chore:` |
| **Versioning** | [SemVer](https://semver.org/) | `v1.5.2` dans CHANGELOG, MAJOR.MINOR.PATCH |
| **Branching** | Trunk-Based Development | Push direct sur `main` après tsc + build local OK (pas de feature branches longues) |
| **Domaine** | DDD light | Modules métier isolés : `messaging`, `payments`, `feed`, `clients`, `models` |
| **Sécurité** | OWASP Top 10 + RLS Supabase | Audit auth + injection + idempotence webhooks |
| **Accessibilité** | WCAG 2.2 AA | aria-labels, contraste, keyboard nav |
| **Gouvernance dev** | DORA metrics light | Cycle time brief→prod, change failure rate, MTTR |
| **Tests** | TDD/BDD modéré | Unit (Vitest), E2E (Playwright pour critiques uniquement) |
| **CI/CD** | GitHub Actions + Vercel | Build local + Vercel auto-deploy sur push main |
| **Doc tracking** | Append-only registry + auto-update | `02-BRIEFS-REGISTRY.md`, CHANGELOG, ROADMAP synchros |

---

## 3. Lifecycle d'un brief (8 phases)

```
INTAKE → CADRAGE → SYNTHÈSE → PLAN → EXEC → QA → DOC-SYNC → DEPLOY
                                                              ↓
                                                          VERIFY
                                                              ↓
                                                          ARCHIVE
```

### Phase 1 — INTAKE (réception)
- NB envoie le brief en langage naturel
- Je l'enregistre dans le buffer brouillon (`plans/PMO/_drafts/SESSION-YYYY-MM-DD-briefs.md`)
- Confirmation courte : `📌 BRIEF-N noté` + flags (P0/P1/P2, layers concernés, dépendances apparentes)
- **Pas de dispatch immédiat** tant que NB n'a pas dit "terminer"

### Phase 2 — CADRAGE (questions critiques)
- 1-3 questions max si décision bloquante (ex: format référence, scope MVP, légal/RGPD)
- Si tout est clair, skip et passer à la suivante
- Décisions par défaut proposées explicitement pour accélération

### Phase 3 — SYNTHÈSE (organisation)
- Au "terminer" : tous les briefs sont relus
- Catégorisation par layer (DB / BE / FE / AI / DOC / DEVOPS / LEGAL)
- Identification des dépendances cross-briefs (ex: brief 2 dépend du schéma DB du brief 1)
- Priorité globale recalculée (P0 bloquant > P1 features > P2 nice-to-have)

### Phase 4 — PLAN (dispatch DAG)
- Plan global v1 dans `plans/PMO/plan-global-vN.md`
- Ordre d'exécution avec parallélisations possibles
- Distribution agents (cf. §4 catalogue agents)
- Présentation NB pour GO si plan complexe (>5 agents) ou impact majeur (DB schema, sécurité, légal)
- Sinon GO implicite (NB a déjà dit "terminer" = autorisation dispatch)

### Phase 5 — EXEC (multi-agents en parallèle)
- Dispatch via Agent tool en background (`run_in_background: true`)
- Scope strict par agent (no-overlap files — cf. §5 contrats)
- Notification auto à chaque livraison agent
- Suivi via TodoWrite + checklist registre

### Phase 6 — QA (validation)
- `tsc --noEmit` global
- Build local (Vercel hook pre-push)
- Verification visuelle preview si UI changée (`/m/yumi`, `/agence`)
- E2E Playwright si critère DoD bloquant

### Phase 7 — DOC-SYNC (mise à jour automatique)
- **Doc Agent** dispatché en parallèle ou en fin de cycle
- Maintient à jour :
  - `plans/PMO/02-BRIEFS-REGISTRY.md` (append + statut updated)
  - `plans/PMO/03-ROADMAP-MASTER.md` (tickets cochés)
  - `CHANGELOG.md` racine projet (semver + sections Features/Fixes/Technical/Docs)
  - `plans/modules/<module>/CONTEXT.md` (état actuel du module)
  - `plans/modules/<module>/DECISIONS.md` (ADR si décision archi)
  - `plans/modules/<module>/CHANGELOG.md` (historique du module)
- **User Doc Agent** maintient :
  - `docs/` racine projet (`docs/architecture/*.md`, `docs/operations/*.md`, `docs/user/*.md`)
  - Format Diátaxis : Tutorials (apprendre) / How-to (résoudre) / Reference (consulter) / Explanation (comprendre)
  - Audience : utilisateurs finaux (modèles, admins) — pas dev

### Phase 8 — DEPLOY (commit + push)
- Commit Conventional Commits avec référence BRIEF-N
- Co-authored-by Claude
- Push direct main (Trunk-Based)
- Vercel deploy auto déclenché
- Wait pre-push hook OK (tsc + env vars check + build)

### Phase 9 — VERIFY (post-deploy)
- Si UI : screenshot/eval preview pour confirmer rendu attendu
- Si API : test curl sur endpoint critique
- Si DB migration : query validation côté Supabase
- Marquer brief comme livré dans registre uniquement si verify OK

### Phase 10 — ARCHIVE
- Brief statut `🟢 livré` ou `✅ livré + vérifié` dans `02-BRIEFS-REGISTRY.md`
- Si critique : ADR archivé dans `plans/modules/<module>/DECISIONS.md`
- Brouillon `_drafts/` rangé / supprimé après 7 jours

---

## 4. Catalogue des agents spécialisés (10 rôles)

Chaque agent a un **scope strict** (liste de fichiers/dossiers autorisés). No overlap entre agents pour éviter conflits Git lors d'exécutions parallèles.

### Agent A — ARCHITECT
- **Mission** : design contrats interfaces + ADR + diagrammes C4 si nécessaire
- **Scope écriture** : `plans/modules/<module>/DECISIONS.md`, types `src/shared/types/*.ts`, interfaces `src/shared/<module>/types.ts`
- **Quand** : début cycle si nouveau module ou refacto archi majeur

### Agent B — DB
- **Mission** : migrations SQL Supabase, RLS policies, schémas, triggers
- **Scope écriture** : `supabase/migrations/NNN_*.sql` (nouveaux fichiers uniquement, jamais d'édit migration appliquée)
- **Tools** : MCP Supabase (`apply_migration`, `execute_sql`, `list_tables`)
- **Règles** : idempotent (`IF NOT EXISTS`), RLS systématique, comment header

### Agent C — BACKEND
- **Mission** : routes API Next.js, business logic, integrations externes (PayPal, Wise, Groq, etc.)
- **Scope écriture** : `src/app/api/<feature>/**/*`, `src/shared/lib/<module>/*`, `src/shared/<module>/**/*`
- **Règles** : CORS via helper, auth via `getAuthUser()`, validation Zod ou manuelle, no `any` non typé

### Agent D — FRONTEND
- **Mission** : composants React, UI/UX, state management
- **Scope écriture** : `src/web/components/**/*`, `src/cp/components/**/*`, `src/shared/components/**/*`, `src/app/*/page.tsx` (modif chirurgicale)
- **Règles** : "use client" si interaction, mobile-first, aria-labels, TS strict, palette CSS variables

### Agent E — AI
- **Mission** : agent IA prompts, persona, modes auto/copilot/user, intent recognition
- **Scope écriture** : `src/shared/lib/ai-agent/**/*`, prompts dans `plans/modules/ai-conversational-agent/`
- **Règles** : injection contexte client (pack history, age gate, etc.), pas de hard-coded persona, fallback OpenRouter si Groq down

### Agent F — SECURITY
- **Mission** : RLS Supabase, auth, OWASP review, age gate, RGPD
- **Scope lecture/écriture** : audit cross-modules + recommandations dans `plans/SECURITY-PLAN-EVOLUTIVE-2026-2027.md`
- **Règles** : pas de credentials en clair, env vars via Vercel, signature webhooks `timingSafeEqual`

### Agent G — QA
- **Mission** : tests E2E Playwright, regression, validation DoD
- **Scope écriture** : `tests/e2e/**/*.spec.ts`, `src/**/__tests__/*.test.ts`
- **Règles** : un test par scénario critique, fixtures isolées, pas de magic timeouts

### Agent H — DOC (interne dev/PMO)
- **Mission** : maintenir registres + plans + ADR + CONTEXT modules
- **Scope écriture** : `plans/PMO/02-BRIEFS-REGISTRY.md`, `plans/PMO/03-ROADMAP-MASTER.md`, `CHANGELOG.md`, `plans/modules/<module>/{CONTEXT,DECISIONS,CHANGELOG}.md`
- **Règles** : append-only registres, pas de réécriture passé, format cohérent (badges 🟢/🟠/🟡/✅, dates ISO)

### Agent I — USER DOC (externe / utilisateurs finaux)
- **Mission** : maintenir `docs/` racine projet (utilisateurs finaux : modèles, admins)
- **Scope écriture** : `docs/architecture/*.md` (guides ops NB), `docs/operations/*.md` (procédures), `docs/user/*.md` (manuels modèles/admins)
- **Format** : Diátaxis (Tutorials / How-to / Reference / Explanation), français naturel, pas de jargon dev
- **Règles** : audience non-tech, screenshots si pertinents, FAQ structuré

### Agent J — DEVOPS
- **Mission** : Vercel config, env vars, deploys, monitoring, cron, performance
- **Scope écriture** : `.env.example`, `vercel.json`, scripts `scripts/*.sh`, GitHub Actions `.github/workflows/*.yml`
- **Tools** : MCP Vercel + Vercel CLI
- **Règles** : env vars sync `.env.example` → Vercel, secrets via Vercel UI, prebuild check

---

## 5. Contrats inter-agents (zero overlap)

Pour exécution parallèle safe, chaque agent reçoit dans son prompt :

1. **Liste exhaustive des fichiers à créer/modifier** (whitelist stricte)
2. **Liste des fichiers à NE PAS toucher** (blacklist autres agents)
3. **Signatures publiques** (interfaces / API routes / DB tables) que les autres agents vont consommer
4. **Pré-requis** (autres agents qui doivent finir avant)
5. **Test de validation** (`tsc --noEmit` exit 0 minimum)

Si conflit détecté en consolidation : rollback + re-dispatch avec scope ajusté.

---

## 6. Patterns de dispatch

| Pattern | Quand | Exemple |
|---|---|---|
| **Sequential** | Dépendances strictes | DB → BE → FE (BE attend schema DB) |
| **Parallel** | Indépendance totale | DB + Doc + DevOps (3 agents simultanés) |
| **DAG** | Dépendances partielles | DB → (BE + FE) → QA |
| **Fan-out / Fan-in** | Tâche divisible | 5 agents touchent 5 modules différents → 1 agent QA consolide |

Chaque dispatch documenté dans le plan global avec timestamp + agentId + livraisons attendues.

---

## 7. Règles cross-cutting (non négociables)

1. **Scope strict** : agent qui touche fichier hors scope → rollback
2. **TS strict** : `tsc --noEmit` exit 0 obligatoire avant commit
3. **No `any`** sauf cast contrôlé sur DB rows (avec commentaire)
4. **CORS + auth** : helpers réutilisables, pas de duplication
5. **Idempotence migrations** : `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
6. **Webhooks** : `timingSafeEqual` + table `agence_webhook_events` UNIQUE(provider, event_id)
7. **Logs structurés** : `console.log("[module/feature]", ...)`
8. **Pas de credentials en clair** dans le repo (env vars only)
9. **Confidentialité Heaven ↔ SQWENSY** : grep pre-commit
10. **Doc sync auto** : Agent H dispatch obligatoire en fin de cycle
11. **Règle des 3 essais** : si bloqué sur même problème 3 fois → STOP + report NB
12. **Règle audit avant implement** : grep global avant nouveau helper / composant (réutiliser existant)

---

## 8. Doc sync automatique (au "terminer")

Après dispatch des agents techniques, **Agent H (DOC)** est systématiquement dispatché en parallèle des agents code pour synchroniser :

- **`plans/PMO/02-BRIEFS-REGISTRY.md`** : ligne ajoutée pour chaque BRIEF avec ID, date, titre, type, priorité, branches, statut, lien
- **`plans/PMO/03-ROADMAP-MASTER.md`** : tickets cochés [x] livrés, nouvelles phases ajoutées, TODO post-merge
- **`CHANGELOG.md`** racine : nouvelle entrée semver `[vX.Y.Z]` avec sections Features / Fixes / Technical / Docs / Commits clés
- **`plans/modules/<module>/CONTEXT.md`** : état actuel du module (architecture, files clés, intégrations)
- **`plans/modules/<module>/DECISIONS.md`** : ADR si nouvelle décision archi
- **`plans/modules/<module>/CHANGELOG.md`** : historique fin du module

Et **Agent I (USER DOC)** dispatché si la feature impacte l'utilisateur final :

- **`docs/architecture/*.md`** : guides opérationnels NB (intégration providers, KYB, etc.)
- **`docs/user/*.md`** : manuels modèles/admins (comment éditer son profil, comment valider un paiement, etc.)
- **`docs/operations/*.md`** : procédures internes (correction pseudo, refund, etc.)

---

## 9. Métriques de gouvernance (DORA-light)

Tracking dans `plans/PMO/_metrics/SESSION-YYYY-MM-DD.md` :

- **Cycle time** : durée brief → prod (target < 1h pour P0, < 4h pour P1)
- **Change failure rate** : % de briefs nécessitant un hotfix dans les 24h (target < 10%)
- **Lead time for changes** : durée commit → deploy (Vercel auto)
- **MTTR** : durée détection bug → fix prod (target < 30 min P0)
- **Briefs livrés / session** : indicateur productivité

---

## 10. Tableau de bord état session

Au "terminer", je présente :

```
═══════════════════════════════════════════════
SESSION 2026-04-25 ÉVENING — RÉCAP CHEF D'ÉQUIPE
═══════════════════════════════════════════════
📥 Briefs reçus      : N
🎯 Priorités         : N P0 / N P1 / N P2
🔀 Dépendances       : <DAG visuel succinct>
👥 Agents dispatch   : N en parallèle / M en sequential
⏱  Cycle estimé     : XX min
✅ Definition of Done : <checklist consolidée>
🚦 Décisions critiques en attente NB : <liste>
═══════════════════════════════════════════════
GO ? (yes / amend / cancel)
```

NB répond GO → dispatch immédiat. Sinon ajustements.

---

## 11. Échelle Heaven — calibrage

Pour rappel, on développe :
- **Pas Facebook** : pas besoin de microservices, sharding DB, CDN edge multi-régions
- **SaaS pro creator-fan** : ≤10 modèles, ≤10k fans, ≤10k transactions/mois
- **Vitrine optimisée** : `/m/[slug]` doit convertir prospect → fan registered → fan validated → buyer
- **CP admin sécurisé** : `/agence` + `/cp/root` (RBAC strict, audit log)
- **Copilote IA progressif** : agent IA assume responsabilité graduelle (auto-reply → mode copilot review → user-only fallback)

Conséquence : on garde les solutions **simples et lisibles**, on évite over-engineering. Premium UX > performance extrême. Sécurité > vitesse.

---

## 12. Activation immédiate

Ce protocole est **actif maintenant** (déclenché par NB dans cette session).

Buffer briefs accumulés dans : `plans/PMO/_drafts/SESSION-2026-04-25-evening-briefs.md`

Au signal "terminer" → Phases 3-10 enchaînées automatiquement.

---

## 13. Mandat & Vision NB — référentiel décisionnel transversal

> Ce mandat est le **filtre décisionnel** appliqué à chaque brief, à chaque
> dispatch, à chaque review. Il prime sur les autres considérations (sauf
> sécurité critique et confidentialité Heaven↔SQWENSY).

### 13.1 Objectif transversal #1 — Synergie CP ↔ Profil + Ergonomie

Chaque feature, chaque fix, chaque refactor doit servir cet objectif :

- **Synergie CP ↔ Profil** : ce que la modèle voit dans son CP doit refléter
  exactement la donnée live du profil public (et inversement). Pas de cache
  obsolète, pas de divergence d'état, pas d'allers-retours nécessaires.
- **Ergonomie** : minimiser clics, étapes, et friction UX. Un fan trouve son
  pack en 2 clics. Une modèle valide un paiement en 1 clic. Un raccourci CP→Profil
  est toujours visible (et inversement).
- **Simplification process** : réduire le nombre de chemins pour faire la même
  chose. Un seul flow de paiement V1 manuel. Un seul header admin unifié.
  Un seul système de likes/comments.
- **Élimination doublons UI** : si un bouton ou composant existe à 3 endroits,
  on consolide en 1 source de vérité. Si 2 helpers font la même chose, on garde
  le plus mature et on retire l'autre.
- **Cohérence front ↔ back-end** : contrats API typés strictement (TS interfaces
  partagées), data flow unidirectionnel quand possible, pas de "shadow state"
  divergent entre composants.

**Application opérationnelle** : avant chaque dispatch d'agent, je vérifie
mentalement que le brief est compatible avec ce mandat. Si un brief crée un
doublon (ex: un nouveau bouton qui fait la même chose qu'un existant), je
flagge à NB : "ce brief ajoute X mais Y existe déjà — fusionner ou garder les 2 ?".

### 13.2 Délégation décisionnelle

NB délègue à Claude (chef d'équipe) **toutes les décisions** suivantes sans
avoir à demander d'avis :
- Choix techniques (stack, libs, patterns archi)
- Découpage en agents et ordre d'exécution
- Arbitrages UX mineurs (taille, espacement, animations, copy)
- Refacto interne (renommer, déplacer, supprimer ancien code)
- Migrations DB non destructives
- Choix de wording dans messages utilisateur (sauf branding identitaire)
- Sélection des standards (Diátaxis vs autre, semver vs date-based)

Claude **demande un avis NB uniquement** dans 3 cas :

1. **Information manquante critique** (ex: "tu veux PayPal handle 1 par modèle ou 1 global ?")
2. **Incohérence détectée** entre un nouveau brief et ce qui était planifié AVANT — Claude remonte avec :
   - Ce qui était prévu
   - Ce que le nouveau brief change
   - Hypothèse : "c'est probablement une meilleure idée ergonomique de ta part — tu confirmes qu'on bascule ?"
3. **Risque archi majeur** : implication qui peut casser l'infra existante (DB schema breaking change, suppression d'une route consommée par X clients, refonte auth, etc.). Claude présente :
   - Le changement demandé
   - Les composants impactés (liste exhaustive)
   - Effort estimé
   - Risques mitigeables
   - Recommandation (GO / amend / report)

### 13.3 Politique "Nouveauté prime"

Si un nouveau brief contredit un précédent :
- **Default** : le nouveau brief gagne (NB a eu une meilleure idée pendant la session)
- **Exception** : si rollback du précédent implique > 3h de travail OU > 2 fichiers core OU casse une feature en prod → Claude flagge avant exécution avec impact analysis
- **Préservation historique** : les briefs précédents sont marqués `⚪ archivé (remplacé par BRIEF-X)` dans le registre, jamais supprimés

### 13.4 Anti-overengineering

Claude refuse explicitement d'introduire :
- Microservices, event sourcing, CQRS (overkill pour <10k users)
- Caching multi-layers complexe (un seul cache simple suffit)
- State management externe (Redux/Zustand) si Context React + hooks suffisent
- Build steps custom au-delà de Next.js + Tailwind + tsc
- Tests E2E exhaustifs sur features non critiques (uniquement DoD bloquants)

Si NB demande une de ces choses explicitement → Claude exécute avec note
"introduit complexité X, à monitorer".

---

## 14. Versioning du protocole

| Version | Date | Auteur | Changement |
|---|---|---|---|
| v1.0 | 2026-04-25 | Claude (chef d'équipe) | Initial — protocole complet activé sur demande NB |
| v1.1 | 2026-04-25 | Claude | Ajout §13 Mandat & Vision NB (synergie CP↔Profil + délégation décisionnelle + nouveauté prime + anti-overengineering) |

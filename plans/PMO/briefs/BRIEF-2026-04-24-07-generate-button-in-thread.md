# BRIEF-2026-04-24-07 — Bouton "Générer message" dans le thread conversation (flow Fanvue)

> **Status** : 🟠 cadré (en attente GO NB)
> **Source** : NB message du 2026-04-24 ~17:45 ("on peux pas lancer une generation de message depuis le cp dans la discution en metan generer message comme le fonctionnement de fanvu")
> **Type** : feature
> **Priorité** : P2 (amélioration workflow admin, complémentaire des modes auto/copilot)
> **Hotfix upstream livré** : commit `85ee934` (after() — agent IA répond maintenant à tous les messages, plus juste le 1er)

---

## Demande NB (verbatim résumé)

1. Observation : l'agent IA en mode auto ne répondait qu'au 1er message d'une conversation → ✅ fix livré commit `85ee934` (utilisation de `after()` de next/server pour garantir exécution post-response serverless)
2. **Feature demandée** : pouvoir **déclencher manuellement** une génération de message IA **depuis le CP** dans la discussion, comme le flow Fanvue Creator (bouton "Generate" dans le composer qui crée un draft, l'admin peut éditer/accepter/rejeter, puis envoyer)

## Compréhension CDP

### Distinction vs ce qui existe déjà

| Mécanisme | Quand | Qui déclenche | Exige action admin ? |
|---|---|---|---|
| **Mode auto** (existant) | Automatique au reçu de chaque message client | Système | Non, envoie direct |
| **Mode copilot** (existant) | Automatique au reçu de chaque message client | Système | Génère un draft invisible (sent=false) pour apprentissage |
| **Mode user** (existant) | Jamais (agent désactivé) | — | L'admin écrit 100% manuellement |
| **Bouton "Générer"** (🆕 BRIEF-07) | **À la demande explicite de l'admin** | Admin clique bouton | Oui, admin valide avant envoi |

### Différenciation avec le bouton header "Générer" existant

Le bouton header actuel ([src/shared/components/header.tsx:432](../../../../src/shared/components/header.tsx:432)) avec icône `KeyRound` génère un **code admin** (pas un message). Ne pas confondre.

Le bouton BRIEF-07 sera :
- Dans le composer de la conversation (pas dans le header)
- Icône différente (`Sparkles` ou `Wand2` pour signifier IA)
- Action : appel POST `/api/agence/ai/generate-reply` qui retourne un draft sans l'envoyer

### Pattern Fanvue référencé

Flow utilisateur Fanvue Creator :
1. Admin ouvre conversation avec fan
2. Clique "Generate" dans composer
3. Overlay loader pendant génération IA (2-5s)
4. Draft pré-rempli dans le composer
5. Admin peut : éditer / envoyer direct / regénérer / effacer
6. Envoi = `agence_messages` insert avec flag `ai_generated=true` pour stats

## Scope

### IN

1. **UI composer messagerie** :
   - Bouton `✨ Générer` dans le composer de `/agence/messagerie`
   - Loader pendant génération (skeleton ou spinner dans le textarea)
   - Draft pré-rempli, éditable
   - Bouton "Regénérer" si l'admin veut un autre draft
   - Bouton "Effacer" pour repartir vierge

2. **API backend** :
   - Route `POST /api/agence/ai/generate-reply`
     - Input : `{ fan_id: string, conversation_source: 'web'|'instagram', prompt_hint?: string }`
     - Output : `{ draft: string, ai_run_id: uuid, latency_ms: number, tokens: {in, out} }`
     - Auth : root / model only
     - Comportement :
       - Charge persona + conversation history (5 derniers msgs)
       - Appelle Groq avec le même prompt system que mode auto
       - Applique `filterOutbound(channel)`
       - Logge dans `ai_runs` avec `mode_at_run='on_demand'`, `sent=false`
       - Retourne le draft sans publier dans agence_messages
   - Quand l'admin envoie le draft (via route `/api/messages` POST existante ou `/api/agence/messaging/reply`) :
     - Ajouter `ai_run_id` optionnel au body (lien vers le draft généré)
     - Si modifié par admin : flag `admin_edited=true` dans ai_runs (feedback loop)

3. **DB** :
   - Ajout enum `'on_demand'` à la contrainte `ai_runs.mode_at_run` (actuellement `auto|copilot|user`)
   - Optionnel : colonne `ai_runs.admin_edited BOOLEAN DEFAULT false` pour tracer si le draft a été modifié avant envoi

4. **Intégration modes existants** :
   - Bouton "Générer" disponible dans TOUS les modes (auto / copilot / user), c'est une action ponctuelle indépendante
   - En mode `user` (agent désactivé), ce bouton devient la seule voie d'utiliser l'IA → utile
   - En mode `copilot`, le bouton remplace avantageusement le flow "j'écris, l'agent apprend" par "j'appelle l'agent quand je veux"

5. **UX state** :
   - Bouton désactivé si `persona.is_active=false` (pas de persona configurée)
   - Badge "IA generated" visible dans le composer pour rappel avant envoi
   - Tooltip "Génère un draft avec Yumi IA — tu valides avant envoi"

6. **Instrumentation** :
   - Counter "drafts générés" par conversation (visible dans le drawer fan)
   - Stats globales dans `/agence/messagerie?tab=agent-ia` : drafts générés, envoyés tel quel, modifiés, effacés

### OUT

- Génération multi-drafts (3 variantes à choisir) — brief futur si demandé
- Voice/audio generation — V2 backlog ai-conversational-agent
- Personnalisation du tone par draft (bouton "Plus flirty" / "Plus classy") — brief futur
- Génération en streaming (tokens par tokens) — V2, MVP = réponse complète en 1 seul appel
- Traduction automatique draft — inclus dans le prompt system, pas de flow séparé

## Branches concernées

- ☒ **BE** — route `/api/agence/ai/generate-reply` + modifs logging ai_runs
- ☒ **DB** — migration 061 (enum + colonne optionnelle)
- ☒ **FE** — bouton dans composer + UX states + intégration envoi
- ☒ **QA** — test e2e generate → edit → send
- ☒ **Doc** — ADR + update module `ai-conversational-agent/00-README.md`
- ☐ AI / DevOps — pas directement

## Dépendances

### Amont (toutes ✅)
- BRIEF-01 : fix FK ai_runs (logging fonctionne)
- BRIEF-04 : env vars prod (Groq accessible)
- Hotfix 85ee934 : after() pour fiabilité (pour le mode auto, pas critique pour on-demand mais cohérent)
- Mode `auto` fonctionnel (validé aujourd'hui par NB : "bien et toi" → agent répond)

### Aval
- Synergique avec BRIEF-02 Messenger UI Standards (composants `<MessageBubble>` hébergeront le badge "IA generated")
- Synergique avec BRIEF-06 Cycle de vie visiteurs (lifecycle n'affecte pas le flow générer, mais le badge peut s'ajouter à la row)

## Livrables

### L1 — Backend (~1h15)

| Ticket | Titre | Effort |
|---|---|---|
| `TICKET-G01` | Migration 061 : enum mode_at_run += 'on_demand' + colonne admin_edited | 15 min |
| `TICKET-G02` | Route `POST /api/agence/ai/generate-reply` (core logic) | 45 min |
| `TICKET-G03` | Modif `/api/messages` POST + `/api/agence/messaging/reply` : accepter ai_run_id + flag admin_edited | 15 min |

### L2 — Frontend (~1h15)

| Ticket | Titre | Effort |
|---|---|---|
| `TICKET-G04` | Bouton `<GenerateReplyButton>` dans le composer de `/agence/messagerie` | 30 min |
| `TICKET-G05` | Loader + state management (draft pending → draft ready → edited → sent) | 30 min |
| `TICKET-G06` | Badge "IA generated" + tooltip + UX disabled states | 15 min |

### L3 — Tests + Doc (~45 min)

| Ticket | Titre | Effort |
|---|---|---|
| `TICKET-G07` | Test Playwright e2e generate → edit → send → vérifier ai_run persisté avec admin_edited=true | 30 min |
| `TICKET-G08` | ADR + update `plans/modules/ai-conversational-agent/00-README.md` avec nouveau mode on-demand + workflow | 15 min |

**Total effort** : ~3h CDP + sous-agents étape par étape.

## Acceptance criteria

- [ ] Admin ouvre conversation → bouton "Générer" visible dans le composer
- [ ] Clic "Générer" → loader (< 5s typique) → draft pré-rempli dans textarea
- [ ] Admin édite le draft → flag `admin_edited=true` à l'envoi
- [ ] Admin envoie tel quel → flag `admin_edited=false`, `sent=true`
- [ ] Admin efface sans envoyer → ai_run reste avec `sent=false`
- [ ] Aucune régression modes auto/copilot/user existants
- [ ] Compteur drafts visible dans drawer fan
- [ ] Test e2e Playwright passe
- [ ] ADR documenté

## Notes CDP

**Simplicité** : ce brief est relativement simple car il réutilise l'infra existante (persona, Groq, filterOutbound). C'est essentiellement une **nouvelle route + un bouton UI + une extension de logging**.

**Synergie modes** : on_demand complète bien la matrice 3 modes actuels. Pattern commun : toutes les invocations LLM passent par `decideForMode()` sauf `on_demand` qui a sa propre logique (`generate=true, send=false, manual_trigger=true`).

**UX iOS/mobile** : composer déjà responsive via design system Heaven. Bouton "Générer" en position fixe top-right du composer pour accès rapide au pouce (mobile-first).

**Feedback loop** : la colonne `admin_edited` permet de mesurer la qualité des drafts IA (si toujours édité = prompt à affiner). Pattern réutilisable pour mesurer la qualité cross-canaux.

**Skills Claude Code préférentiels** :
- G01 : Supabase MCP
- G02/G03 : `senior-backend` + `vercel:ai-sdk`
- G04/G05/G06 : `senior-frontend` + `vercel:shadcn` + `design:ux-copy`
- G07 : `engineering:testing-strategy` + `test-driven-development`
- G08 : `engineering:documentation`

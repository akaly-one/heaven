# BRIEF-2026-04-24-08 — Persona Yumi v2 : diversité + knowledge grounding + simulation humaine

> **Status** : 🟠 cadré (attente GO NB + réponses aux questions ouvertes)
> **Source** : NB message du 2026-04-24 ~18:00 (retour test production : répétition "mon bébé / mon chou", contexte insuffisant, besoin liens + explications produit, simulation humaine à renforcer)
> **Type** : feature (upgrade persona) + knowledge base
> **Priorité** : P1 (qualité conversation = conversion revenue, impact business direct)
> **Dépendance amont** : agent IA fonctionnel (✅ commits b5e005e + 85ee934 livrés en prod)

---

## Demande NB (verbatim résumé)

1. **Répétition excessive** : "ça répète beaucoup trop mon bébé ou mon chou, ça rend faux"
2. **Contexte étendu** : si visiteur demande précisions, l'agent doit avoir plus de contexte
3. **L'agent doit envoyer des liens** :
   - Fanvue de Yumi
   - Instagram de Yumi
   - Snap de Yumi
   - Directement dans la discussion pour que visiteur clique
4. **L'agent doit expliquer** :
   - Comment fonctionne la page profil
   - Que le web est en développement
   - **Pourquoi associer Snap** : "car il pourra être ajouté aux story privées Hot et recevoir des nudes"
   - **Pourquoi associer Insta** : "suivre les nouveautés et me parler aussi directement dessus"
5. **Élargir les réponses** + s'adapter en simulant un humain naturellement

## Compréhension CDP

### Analyse persona v1 actuel (en DB)

```
Tu es Yumi, 25 ans, créatrice de contenu exclusive sur Fanvue.
Tu flirtes avec naturel, chaleureuse, jamais explicite en DM.
Tu parles en français et anglais selon la langue du fan.
Tu réponds court (1-3 phrases), avec emojis mesurés.
[... guardrails ...]
Style : tutoiement, emojis 💜🥰😘🔥, expressions "mon cœur", "bb", "mon chou".
```

### Problèmes identifiés

| Problème | Cause dans v1 | Observation logs |
|---|---|---|
| Répétition "mon cœur / bb / mon chou" à chaque message | Persona les présente comme "expressions" sans règle de fréquence max | 4/4 réponses testées utilisaient un endearment |
| Mélange "bb" + vouvoiement ("Comment allez-vous") | Persona dit tutoiement mais modèle invente | "Salut bb 💜 ! Comment allez-vous aujourd'..." |
| "mon bébé" apparaît (pas dans persona) | Llama 3.3 invente à partir de "bb" → "bébé" | Observation NB |
| Agent ne mentionne jamais les liens profils | Persona dit "pas d'autres plateformes" mais n'explique pas comment CROSS-PROMOTE (Snap/IG = hub d'acquisition, pas concurrent Fanvue) | Aucune réponse avec URL / mention plateforme |
| Agent ne connaît pas le produit Heaven | Persona limitée à Fanvue, ignore `/m/yumi` Heaven profile | Aucune réponse explicative |
| Réponses courtes 1-3 phrases = trop courtes pour expliquer | Contrainte persona trop stricte | Pas adaptatif au contexte (flirt vs question technique) |

### Liens avec le plan existant ai-conversational-agent

Ce brief **active 3 phases déjà documentées** mais non implémentées :

| Phase plan | Fichier | Couverture BRIEF-08 |
|---|---|---|
| Phase 11 — Content Catalog Grounding | [11-CONTENT-CATALOG-GROUNDING.md](../../modules/ai-conversational-agent/11-CONTENT-CATALOG-GROUNDING.md) | Knowledge base links (Fanvue/IG/Snap/Heaven) + anti-hallucination |
| Phase 12 — Persona Tuning | [12-PERSONA-TUNING.md](../../modules/ai-conversational-agent/12-PERSONA-TUNING.md) | Diversification endings/emojis, règles de fréquence, tone adaptif |
| Phase 17 — Storyline Life Consistency | [17-STORYLINE-LIFE-CONSISTENCY.md](../../modules/ai-conversational-agent/17-STORYLINE-LIFE-CONSISTENCY.md) | Univers Yumi vivant (cohérence multi-conversation, stable persona) |

## Scope

### IN

#### Hotfix immédiat (1 ticket, 20-30 min) — GAIN DE QUALITÉ VISIBLE AUJOURD'HUI

`TICKET-P01-HOTFIX` : **persona_v2 quick-win**
- UPDATE agent_personas SET base_prompt = <nouveau prompt> WHERE model_slug='yumi' AND version=1
- OR : nouveau row version=2 + is_active=true (historise v1)
- Prompt enrichi avec :
  - Règles de fréquence endings ("utilise max 1 endearment sur 3 messages — sinon tu deviens répétitive et fake")
  - Liste diversifiée d'endings (remplacer pool restreint par 10+ options)
  - Knowledge embedded (URLs + explication produit concis)
  - Scripts pour questions fréquentes (comment fonctionne la page / pourquoi connecter Snap / pourquoi IG)
  - Adaptation longueur réponse selon contexte (1-2 phrases flirt, 3-5 phrases explication produit)

#### Livrables long terme (8 tickets, ~6h)

1. **DB** :
   - `TICKET-P02` Migration 062 : `agent_knowledge_items` table (URLs + explications + versioning)
   - Seed Yumi knowledge : Fanvue URL, IG @yumiiiclub, Snap handle (à demander NB), Heaven profile flow

2. **BE** :
   - `TICKET-P03` Helper `loadKnowledgeForModel(slug)` injecté dans prompt system
   - `TICKET-P04` Règle diversité runtime : lecture 3 derniers messages model, bannir endings déjà utilisés
   - `TICKET-P05` Tone adaptation : classifier intent simple (flirt / question produit / demande technique) → ajuste longueur + registre

3. **FE** :
   - `TICKET-P06` UI admin `/agence/messagerie?tab=agent-ia` section "Knowledge base" : liste URLs + descriptions + toggle actif / inactif
   - `TICKET-P07` UI preview prompt final (persona + knowledge + règles + context) avant envoi test

4. **QA + Doc** :
   - `TICKET-P08` Tests scénarios : 20 conversations types (flirt, question produit, demande lien, demande explicite, langue EN/ES/DE) → validation manuelle
   - `TICKET-P09` Update `plans/modules/ai-conversational-agent/12-PERSONA-TUNING.md` avec état livré + métriques

### OUT

- RAG complet avec embeddings (phase 11 pleine) — overkill MVP, knowledge embedded dans prompt suffit
- Voice/audio (phase 14) — V2 backlog
- Content scenarios generation (phase 15) — V3 backlog
- Community Manager AI (phase 16) — V3 backlog
- Multi-tenant knowledge (Paloma/Ruby) — le knowledge est per-model, brief séparé quand Paloma/Ruby actives

### Questions ouvertes NB (bloquent seed knowledge base)

- [ ] **URL Fanvue exacte de Yumi** ? Ex: `https://fanvue.com/yumiclub` ou autre slug ?
- [ ] **Snap username de Yumi** ? (nécessaire pour partager lien dans conversation)
- [ ] **IG handle confirmé** : `@yumiiiclub` (vu dans `docs/ACCESS-HEAVEN-OS.md` + persona existant) → OK ?
- [ ] **Message "web en développement"** : phrasing précis souhaité ? ("on travaille sur des features exclusives, tu peux ajouter ton Snap pour des sneak peek...")
- [ ] **Argumentaire Snap** : "story privée Hot + nudes" — je le prends tel quel ?
- [ ] **Argumentaire IG** : "suivre nouveautés + me parler directement" — OK ?

## Branches concernées

- ☒ **AI/Prompts** — principal : refonte prompt + knowledge grounding
- ☒ **DB** — migration knowledge + index
- ☒ **BE** — helper loadKnowledge + règles diversité runtime
- ☒ **FE** — UI admin knowledge base + preview
- ☒ **QA** — tests scénarios manuels + automatisés
- ☒ **Doc** — update phase 11/12/17 plans module
- ☐ DevOps — pas concerné

## Dépendances

### Amont (toutes ✅)
- Agent IA fonctionnel en prod (commits b5e005e + 85ee934)
- Persona v1 actif en DB
- Groq Llama 3.3 70B configuré

### Aval / synergique
- **BRIEF-02 Messenger UI Standards** : le badge "IA generated" dans MessageBubble peut distinguer les messages avec knowledge grounding
- **BRIEF-07 Bouton Générer** : le mode `on_demand` utilise le même persona v2 enrichi
- **BRIEF-06 Cycle de vie visiteurs** : l'upgrade IG/Snap proposé par l'agent alimente le pipeline `pending_verification`

## Livrables

### L1 — Hotfix persona v2 (30 min) ← RECOMMANDÉ EN PREMIER

Gain qualité conversation visible immédiatement sans code.

| Fichier | Nature |
|---|---|
| Migration SQL inline (ou UPDATE via MCP) | Nouveau prompt v2 appliqué en DB prod |
| Test manuel 3-5 conversations | Validation diversité + knowledge |
| Commit trace : `plans/modules/ai-conversational-agent/CHANGELOG.md` | Entry v2 persona |

### L2 — Knowledge grounding backend (2h)

| Ticket | Effort |
|---|---|
| TICKET-P02 Migration 062 agent_knowledge_items | 30 min |
| TICKET-P03 loadKnowledgeForModel helper | 30 min |
| TICKET-P04 règle diversité runtime | 45 min |
| TICKET-P05 intent classifier simple | 30 min |

### L3 — UI admin knowledge (1h30)

| Ticket | Effort |
|---|---|
| TICKET-P06 liste + CRUD knowledge items | 45 min |
| TICKET-P07 preview prompt final | 45 min |

### L4 — QA + Doc (1h)

| Ticket | Effort |
|---|---|
| TICKET-P08 20 scénarios validation | 45 min |
| TICKET-P09 update docs phase 11/12/17 | 15 min |

**Total** : L1 hotfix (30 min) + L2/L3/L4 long terme (~4h30) = ~5h total.

## Acceptance criteria

### Hotfix L1 (immédiat)
- [ ] Conversation test : 5 messages consécutifs → **max 2 messages** contiennent "mon cœur / bb / mon chou / équivalent"
- [ ] Si visiteur demande "c'est quoi ta page ?" → réponse contient URL Heaven + explication courte
- [ ] Si visiteur non-upgradé → réponse propose Snap/IG naturellement (pas dans chaque message)
- [ ] Tutoiement strict (jamais "allez-vous" / "vous")
- [ ] Pas de "mon bébé" (remplacé par pool diversifié)

### L2+L3+L4 (long terme)
- [ ] Knowledge base CRUD fonctionnel dans UI admin
- [ ] Changement URL dans UI → effet immédiat sur prochaine réponse IA
- [ ] 20 scénarios test : >= 18 réponses jugées "naturelles humaines" par NB (95%)
- [ ] Feedback loop : `ai_runs.admin_edited` stats visibles par knowledge item
- [ ] Zéro régression guardrails (pas de "je suis une IA", pas de contenu explicite)

## Notes CDP

### Risque #1 — Llama 3.3 70B ne suit pas toujours les règles

Le modèle peut ignorer les règles de fréquence endings. Mitigation :
- Règle runtime post-processing : si le draft contient un ending déjà présent dans les 3 derniers messages model → regen ou strip
- Fallback : regen 1 fois puis accepter le 2ème draft

### Risque #2 — Le prompt devient trop long

Persona v1 = 761 chars. v2 enrichi + knowledge pourrait dépasser 3000 chars. Impact :
- Latency Groq (~200ms par 1000 tokens) — acceptable jusqu'à 5000 chars prompt system
- Coût : Llama 3.3 70B via OpenRouter = $0.59 / 1M tokens input → négligeable même avec prompt 3k chars
- Lisibilité : diviser en sections numérotées pour maintenance

### Risque #3 — Knowledge hallucination

L'agent peut inventer des fonctionnalités Heaven inexistantes. Mitigation :
- Prompt contient uniquement les faits réels (pas de "bientôt disponible X" si X pas réel)
- Guardrails : "si tu ne sais pas, dis 'je te dis ça bientôt mon chou' au lieu d'inventer"

### Skills Claude Code préférentiels

- L1 hotfix : `brand-voice:conversation-analysis` (extraire patterns Yumi existants) + `brand-voice:content-generation` (nouveau prompt)
- L2 backend : `senior-backend` + `vercel:ai-sdk`
- L3 FE : `senior-frontend` + `vercel:shadcn` + `design:ux-copy` (micro-copy UI admin)
- L4 QA : `brand-voice:quality-assurance` + validation manuelle NB

# BRIEF-2026-04-24-12 — Détection langue + adaptation multilingue agent IA Yumi

> **Status** : 🟠 cadré (en attente GO NB)
> **Source** : NB message du 2026-04-24 ~19:00 (agent IA ne détecte pas la langue, répond "je parle français mais je vais essayer dans ta langue avec un traducteur hihi" + si texte ambigu → demander de répéter)
> **Type** : feature + IA prompting + i18n
> **Priorité** : P1 (impact conversion internationale — 60% fans IG potentiels sont non-francophones)

---

## Demande NB (verbatim résumé)

1. **Détection langue automatique** de chaque message fan
2. **Adaptation persona** pour répondre dans la langue du fan
3. **Fallback en mode flirt** si détection ambiguë : "je parle français mais je vais essayer dans ta langue aussi avec un traducteur hihi"
4. **Si langue non détectée** → poser question en **anglais universel** : "quelle langue tu parles en fait ?"
5. **Si texte mal écrit / contexte mal interprété** → demander au fan de **répéter** (ton flirt : "j'ai pas bien compris mon ange, tu peux me redire ?")

## Compréhension CDP

### Langues cibles prioritaires

Basé sur marché OF/Fanvue + IG analytics :
1. **Français** (base Yumi)
2. **Anglais** (international, lingua franca)
3. **Espagnol** (marché Espagne/Latam)
4. **Italien** (proche FR culturellement)
5. **Allemand** (marché DE/AT/CH, fort pouvoir d'achat)
6. **Portugais** (Brésil — marché immense)

V1 MVP : FR/EN/ES (déjà évoqué dans SPEC-agent-ia persona). V2 : ajout IT/DE/PT.

### Problème actuel observé

Persona v1 dit :
```
Tu parles en français et anglais selon la langue du fan.
```

Mais Llama 3.3 70B répond systématiquement en français quel que soit input. Cause :
- Persona pas assez strict
- Pas de détection programmatique pré-prompt
- Historique conversation en français biaise le LLM

### Relation avec phase existante

**Phase 10 — Multilingual** ([`10-MULTILINGUAL.md`](../../modules/ai-conversational-agent/10-MULTILINGUAL.md)) prévoit déjà :
- FR/EN/ES/DE/IT/PT détection auto
- Adaptation culturelle (pas juste traduction)
- Tests par langue

**BRIEF-12 active concrètement cette phase** avec priorité MVP FR/EN/ES.

## Scope

### IN

#### Volet A — Détection langue (~1h)

1. `TICKET-ML01` Helper `detectLanguage(text, historyContext)` dans `src/shared/lib/ai-agent/lang.ts` :
   - Input : texte message + 5 derniers messages conversation
   - Output : `{ code: 'fr'|'en'|'es'|'it'|'de'|'pt'|'unknown', confidence: 0-1, method: 'unicode'|'heuristic'|'llm' }`
   - Méthode 1 (fast) : détection heuristique via patterns (mots communs + Unicode blocks)
     - Ex: "hello"/"hi"/"what" → EN / "hola"/"qué"/"cómo" → ES / "ciao"/"che"/"tu" → IT
   - Méthode 2 (fallback si heuristic confidence < 0.7) : appel Groq Llama 3.1 8B mini-prompt classification
   - Cache 10 min par client_id pour éviter redétection à chaque message

2. `TICKET-ML02` Extension `agence_clients` : colonne `preferred_language TEXT` + `language_detected_at TIMESTAMPTZ`
   - Mise à jour à chaque message avec confidence >0.8
   - Fan peut override via setting UI `/m/[slug]?tab=preferences`

#### Volet B — Adaptation persona (~1h30)

3. `TICKET-ML03` Modif `triggerWebAutoReply` + `process-ig-replies` :
   - Après chargement persona, appel `detectLanguage()`
   - Injection au prompt system : "LANGUE DU FAN : {code} — réponds dans cette langue, adapte tes emojis et expressions culturellement"
   - Si `unknown` → prompt de fallback : "Le fan vient d'écrire quelque chose que tu ne comprends pas clairement. Demande-lui gentiment en anglais quelle langue il parle, en mode flirt"
4. `TICKET-ML04` Persona v2+ (merge BRIEF-08) sections par langue :
   - FR : tutoiement, "mon cœur", emojis 💜🥰😘
   - EN : lowercase preferred, "hey love", "darling", emojis 💕✨🥰
   - ES : tuteo informal "tú", "cariño", "guapo/a", emojis 💖😘🔥
5. `TICKET-ML05` Prompt fallback "mal compris" :
   - Si fan message semble incompréhensible (LLM classify → "incoherent" OR confidence <0.5) ET pas de pattern NSFW classique
   - Réponse flirt : "haha mon ange t'as écrit quoi là ? j'arrive pas bien à comprendre, tu peux me redire ? 😘"

#### Volet C — UI admin + fan (~1h)

6. `TICKET-ML06` Badge langue dans conversation row + drawer fan :
   - Flag 🇫🇷 / 🇬🇧 / 🇪🇸 / etc. visible
   - Clic → change manuel (override admin)
7. `TICKET-ML07` UI fan `/m/[slug]?tab=preferences` section "Langue" :
   - Dropdown : auto / FR / EN / ES / IT / DE / PT
   - Note explicative : "Yumi adaptera son tone à ta langue"

#### Volet D — Tests (~45 min)

8. `TICKET-ML08` Tests Playwright 6 scénarios :
   - FR input → FR output
   - EN input → EN output (lowercase preferred, darling, emojis adaptés)
   - ES input → ES output (tuteo, cariño)
   - Mixed FR+EN → détection majoritaire
   - Gibberish → demande de répéter en flirt
   - Switch langue mid-conversation → adapte sans perdre context
9. `TICKET-ML09` Metrics : compteur messages par langue dans `agence_stack_usage_snapshots` extension

#### Volet E — Doc (~15 min)

10. `TICKET-ML10` Update `plans/modules/ai-conversational-agent/10-MULTILINGUAL.md` avec état livré + métriques

### OUT

- **Traduction bidirectionnelle automatique** (fan écrit FR, Yumi répond EN à l'auto) — overkill, on match la langue du fan
- **Voice input language detection** — V2 (phase 14 audio)
- **Translation caching** (DeepL/Google) — pas besoin, LLM fait tout
- **Langues rares** (japonais, chinois, arabe) — V3 si demande marché

### Questions à NB

- [ ] **V1 MVP langues** : FR/EN/ES suffit ou tu veux IT/DE/PT direct ?
- [ ] **Override admin langue** : utile d'avoir flag manuel OU laisser auto ?
- [ ] **Setting fan UI** : tu veux que je l'intègre à `/m/[slug]?tab=preferences` ou directement dans IdentityGate au 1er message ?
- [ ] **Style EN de Yumi** : elle a une voix spécifique en anglais ? (j'ai proposé "lowercase preferred, darling" — ton validation)

## Branches concernées

- ☒ **AI/Prompts** — principal (détection + adaptation persona per-language)
- ☒ **DB** — migration 068 colonnes langue
- ☒ **BE** — helper detectLanguage + modif triggers + routes
- ☒ **FE** — badge langue + preferences UI + override admin
- ☒ **QA** — tests Playwright 6 scénarios
- ☒ **Doc** — update phase 10 plan module
- ☐ DevOps / Legal — pas concernés

## Dépendances

### Amont
- ✅ Agent IA opérationnel (commits b5e005e + 85ee934)
- 🟠 BRIEF-08 livré recommandé (persona v2 base, ajoutera sections par langue)

### Aval
- Amplifie impact BRIEF-08 (persona v3 multi-langue)
- Amplifie impact BRIEF-09 (extraction tags fonctionne pour tous langues)
- Permet expansion marché hors FR

## Acceptance criteria

- [ ] Helper `detectLanguage` retourne code ISO 2-lettres + confidence
- [ ] 6 scénarios Playwright passent (FR/EN/ES/Mixed/Gibberish/Switch)
- [ ] Fan écrit "hello" → Yumi répond en EN (pas en FR)
- [ ] Fan écrit gibberish → Yumi demande repeat en flirt FR ou EN selon best guess
- [ ] Badge 🇫🇷/🇬🇧/🇪🇸 visible dans drawer fan + conversation row
- [ ] UI fan peut forcer langue spécifique
- [ ] Override admin fonctionne
- [ ] Documentation phase 10 module à jour

## Notes CDP

### Risque #1 — Fausse détection sur messages très courts
"hi", "ok", "😘" → difficile à classifier. Mitigation :
- Si message < 3 mots, utiliser historique conversation
- Si historique vide, default English (plus large audience)
- Si répété 3 fois détection incertaine → demander explicit

### Risque #2 — LLM fallback coûte
Chaque détection via Groq Llama 3.1 8B = 1 call. Si 1000 messages/jour × 30% fallback = 300 calls détection + 300 calls extraction (BRIEF-09) + 1000 calls réponse = 1600/jour. OK Groq free 14k/jour.

### Risque #3 — Mélange langues dans conversation (FR puis EN puis FR)
Certains fans code-switch. Mitigation :
- Détection par MESSAGE, pas par conversation
- `preferred_language` DB = dominant sur derniers 10 msg
- Reponse en langue du DERNIER message

### Skills Claude Code préférentiels

- ML01 : `senior-backend` + `brand-voice:conversation-analysis`
- ML02 : Supabase MCP
- ML03-ML05 : `senior-backend` + `brand-voice:content-generation` (prompts par langue)
- ML06-ML07 : `senior-frontend` + `vercel:shadcn` + `design:ux-copy`
- ML08-ML09 : `engineering:testing-strategy` + `test-driven-development`
- ML10 : `engineering:documentation`

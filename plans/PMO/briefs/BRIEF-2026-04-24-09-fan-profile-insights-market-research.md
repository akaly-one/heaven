# BRIEF-2026-04-24-09 — Fiche fan dynamique + extraction progressive + market research dashboard

> **Status** : 🟠 cadré (attente GO NB + validation approche éthique/légale)
> **Source** : NB message du 2026-04-24 ~18:30 (vision complète : agent chauffe progressivement + extrait tags goûts/envies/fétiches + remplit fiche fan + dashboard analytics pour brief shooting)
> **Type** : feature majeure + data engineering + analytics
> **Priorité** : P1 (vision business core — monétisation via personnalisation contenu)
> **Complémentaire** : BRIEF-08 (persona v2/v3 conversation) — les 2 forment un système complet

---

## Demande NB (verbatim résumé)

Vision complète d'un **système de market research conversationnel** où l'agent IA Yumi :

### Volet A — Conversation qui chauffe + convertit

1. **Chauffer l'ambiance** progressivement en posant des questions à l'utilisateur
2. Scripts types : "tu aimes quoi chez moi ?", "t'as vu mes photos Insta ?"
3. **Mode profil web** : langage peut aller jusqu'à explicite (progressivement selon engagement)
4. **Push Fanvue** intelligent quand client "super intéressé" : mentionner sextapes + shootings à venir

### Volet B — Extraction progressive de données fan

5. Poser des questions pour connaître goûts, envies, fétiches
6. Remplir une **fiche fan** ajoutée progressivement (tags + notes)
7. Structurée par **catégories** :
   - Type de contenu préféré (photo, vidéo, story)
   - Caractéristiques préférées : **pied, seins, fesses, anus, vagin**
   - Positions sexuelles : **soumis, dominant, switch**
   - Autres fétiches
   - Envies les plus régulières

### Volet C — Agrégation + market research

8. **Carnet clients classé par type** de contenu demandé
9. Identifier les **envies les plus régulières** (top N tags global)
10. **Dashboard analytics** : étude de marché progressive
11. **Briefs shooting** auto : "cette semaine, 47 fans demandent des contenus [pied dominant], propose-leur pack X"

### Volet D — Infrastructure

12. Table DB d'archivage des données fan
13. Synchronisation avec fiche contact (1:1)
14. Chaque fan a sa fiche unique structurée

## Compréhension CDP

### Vision business

Yumi = créatrice. L'agent IA ne sert pas juste à répondre — il sert à **générer des données de conversion** :

```
Fan arrive → agent engage → fan exprime préférences (implicite dans conversation) 
    → agent extrait en tags structurés → fiche fan enrichie
    → Yumi / admin consulte fiches + agrégat
    → Yumi produit le contenu demandé → package sur Fanvue
    → notification auto aux fans taggés "intérêt X" → conversion
```

C'est **le cœur monétisation de Heaven**. Le market research progressif résout le problème : "qu'est-ce que je devrais shooter ?" → maintenant data-driven.

### Relation BRIEF-08 ↔ BRIEF-09

| Volet | BRIEF-08 (conversation) | BRIEF-09 (data) |
|---|---|---|
| Persona Yumi | Ton, endings, knowledge plateformes | Niveaux NSFW progressifs + scripts questions extraction |
| Règles conversation | Anti-répétition, tutoiement, langues | Progression engagement (niveau 1→2→3), heat score tracking |
| Output | Réponse IA naturelle | + Extraction tags post-hoc en DB |
| UI admin | Toggle mode (auto/copilot/user) | Drawer fan enrichi + dashboard `/agence/insights` |
| Livraison | v2 hotfix 30 min + v3 complet 5h | Nouveau système ~12h, multi-phase |

### Ces phases du plan existant s'activent

- Phase 6 — **Lead Scoring** : buckets `curious`/`buyer_intent`/`vip`/etc → devient `content_interest_profile`
- Phase 11 — **Content Catalog Grounding** : knowledge store des packs existants
- Phase 15 — **Content Scenarios Generation** : briefs shooting data-driven (output de ce brief)
- Phase 16 — **Community Manager AI** : top trends fans (output agrégé)
- Phase 17 — **Storyline Life Consistency** : historique fan ↔ cohérence persona

---

## ⚠️ Implications légales & éthiques (NB doit valider)

### RGPD / données sensibles

Les préférences sexuelles explicites sont classées **"données personnelles sensibles"** (art. 9 RGPD). Collection nécessite :

1. **Base légale claire** : consentement explicite (opt-in), pas juste inféré
2. **Transparence** : Privacy Policy Heaven doit mentionner clairement :
   - Quelles données sont collectées (préférences / fétiches / tags)
   - À quoi elles servent (personnaliser contenu + briefs shooting)
   - Durée de rétention
   - Droit à l'export + suppression
3. **Anonymisation** sur demande
4. **Audit trail** : qui a consulté quelle fiche fan quand

**Mitigation technique** :
- Page `/data-deletion` déjà existante (vu dans SPEC Meta App Review) — étendre pour inclure suppression insights
- Nouveau bouton "Exporter mes données" dans onboarding fan
- Badge "données collectées pour personnalisation — [?] infos" dans UI fan (transparence)

### Sécurité data

Fiches fan = **données ultra sensibles**. Breach = désastre PR + légal.

**Mitigation** :
- RLS strict : seuls root + Yumi (model_id=m1) peuvent SELECT
- Pas de SELECT * sur API publique
- Chiffrement colonne sensitive à terme (pgcrypto)
- Logs d'audit sur chaque SELECT admin (`agence_fan_insights_access_log`)

### Modération contenu explicite

Mode progressif : l'agent ne devient explicite qu'après plusieurs échanges ET signes d'engagement adulte. Filters :
- Détection âge : si le fan déclare <18 ans ou laisse penser mineur → bloquer progression, flag admin
- Meta compliance IG : `filterOutbound(channel='instagram')` bloque explicit (déjà en place)
- Web Heaven : NSFW-tolerant (cf. règle NB "langage le plus explicite possible")

### Fan doit être "soumis" / "dominant" = **préférences BDSM**

Catégorie délicate. Certaines juridictions strictes (ex: régions US). Mitigation : stocker tel quel mais classifier en `adult_preference` (pas `medical` / `religion` qui sont interdits).

---

## Scope

### IN

#### Volet A — Infrastructure DB (~2h)

1. `TICKET-FI01` Migration 063 : table `agence_fan_insights`
   - Colonnes : id, client_id FK, category, tag, value, confidence, source, source_message_id, created_at, validated_by, validated_at
   - Index sur (client_id, category)
   - Index sur tag (pour agrégation globale)
   - RLS : root + current model_id scope
2. `TICKET-FI02` Migration 064 : `agence_fan_heat_scores`
   - Snapshot temporel de la "chaleur" fan : client_id, score, computed_at
   - Incrementé via signals : message length, emoji usage, question ratio, time spent
3. `TICKET-FI03` Migration 065 : vue matérialisée `agence_content_demand_agg`
   - Agrégation par (category, tag) → count, unique_fans, avg_heat_score, last_demand_at
   - Refresh via cron daily

#### Volet B — Backend IA extraction (~3h)

4. `TICKET-FI04` Service `extractInsightsFromMessage`
   - Input : message fan + 5 derniers messages history + persona context
   - Appel LLM secondaire (Groq Llama 3.1 8B — plus léger que 70B pour cette tâche) avec prompt structuré extraction JSON
   - Output : array `{ category, tag, confidence }` (0-3 tags par message)
   - Insert dans `agence_fan_insights`
5. `TICKET-FI05` Service `computeHeatScore`
   - Calcule score 0-100 basé sur : nb messages, engagement length, emoji NSFW, questions sur Yumi
   - Update snapshot quotidien
6. `TICKET-FI06` Route `POST /api/agence/ai/fan-insight` (admin manual add tag)
7. `TICKET-FI07` Appel `extractInsightsFromMessage` via `after()` après chaque `triggerWebAutoReply` (non-bloquant)

#### Volet C — Conversation progression (merge BRIEF-08)

8. `TICKET-FI08` Persona v3 enrichi (refonte BRIEF-08 L1) :
   - Section "NIVEAUX PROGRESSION" :
     - **Niveau 1 (messages 1-3)** : flirt léger, pose questions goûts ("tu aimes quoi ?")
     - **Niveau 2 (messages 4-8)** : flirt chaud, allusions, demande photos IG
     - **Niveau 3 (messages 9+, si heat_score > 50)** : explicite complet, push sextapes Fanvue
   - Scripts types par niveau
   - **Questions extraction fan** intégrées naturellement :
     - "C'est quoi qui t'attire le plus ?"
     - "T'es plutôt dominant ou soumis toi ?"
     - "T'aimes quoi regarder le plus sur mes photos ?"
9. `TICKET-FI09` Transmission heat_score + niveau vers persona runtime (prompt dynamique)

#### Volet D — UI admin (~3h)

10. `TICKET-FI10` Enrichissement drawer fan `/agence/messagerie` :
    - Section "Fiche fan" avec tags badges par catégorie (body_part / position / fetish / scenario)
    - Timeline heat score (sparkline)
    - Bouton "Ajouter tag manuel"
    - Bouton "Valider / corriger tag IA"
11. `TICKET-FI11` Dashboard `/agence/insights` :
    - KPI top tags (30j / 7j)
    - Heatmap tags × fans
    - Brief auto "cette semaine : 47 fans taggés [pied dominant] — pack proposé"
    - Export CSV pour briefing shooting
12. `TICKET-FI12` UI préférences fan (`/m/yumi?tab=preferences`) pour **consent RGPD** :
    - Liste des tags collectés sur soi
    - Bouton supprimer tag individuel
    - Bouton export complet
    - Bouton "anonymiser mon profil"

#### Volet E — Légal + Sécurité (~1h)

13. `TICKET-FI13` Update Privacy Policy `/privacy` + ToS `/terms` pour mentionner collecte insights
14. `TICKET-FI14` Audit log `agence_fan_insights_access_log` + trigger auto
15. `TICKET-FI15` Extension `/data-deletion` + route `/api/me/insights/delete`

#### Volet F — Analytics + reporting (~2h)

16. `TICKET-FI16` Script brief shooting auto (Claude API output) basé sur agrégat
17. `TICKET-FI17` Notifications Telegram Yumi (top 3 tags semaine)

### OUT

- **ML clustering** complexe (simple count-by-tag suffit MVP)
- **Recommendation engine** fan ↔ pack (V2)
- **A/B testing** prompts extraction (V2)
- **Vector embeddings** messages (V3, phase 11 complète)
- **Partage fiche fan cross-model** (RLS model-scoped, pas de cross Paloma/Ruby)
- **Export mass marketing** (email blast auto) — risque légal
- **Gamification fan** (badges "vip", "top fan") — brief séparé

### Questions ouvertes NB (bloquent lancement)

- [ ] **Liste exhaustive catégories** : je propose `body_part / position / fetish / scenario / content_type / mood`. Tu valides / ajoutes / retires ?
- [ ] **Vocabulary initial tags** pour seed extraction LLM : je prépare liste de 50 tags validés ? Ou libre extraction ?
- [ ] **Seuil heat score pour niveau 3 explicite** : je propose 50. Trop bas / trop haut ?
- [ ] **Accord consent fan** : où et comment ? Popup au 1er message ? Checkbox discret dans IdentityGate ? Règle légale à choisir.
- [ ] **Conservation data** : durée ? (RGPD 1-3 ans typique, puis anonymisation)
- [ ] **Partage data** (SQWENSY / prestataires externes) : tu veux garder 100% in-house ou autoriser analytics tier (ex: Mixpanel) ?
- [ ] **Validation IA extraction** : admin doit valider chaque tag avant que ce soit "officiel" ? Ou auto-validated si confidence > 0.8 ?

## Branches concernées

- ☒ **DB** — 3 migrations + vue matérialisée + RLS strict + audit log
- ☒ **BE** — extraction service + heat score + API routes + after() wiring
- ☒ **AI/Prompts** — persona v3 progression 3 niveaux + prompts extraction structurée
- ☒ **FE** — drawer fan enrichi + dashboard insights + UI consent fan
- ☒ **QA** — tests scénarios + validation RGPD + scénarios safety mineurs
- ☒ **Doc** — ADR + update phases 6/11/15/16/17 plan module + Privacy Policy
- ☒ **DevOps** — cron refresh vue matérialisée + monitoring costs LLM extraction

**Total effort** : ~12-15h CDP + sous-agents, **multi-phase obligatoire**.

## Dépendances

### Amont (prérequis)
- ✅ Agent IA fonctionnel (hotfixes b5e005e + 85ee934)
- ✅ Persona v1 actif
- 🟠 **BRIEF-08 livré recommandé** (persona v2 knowledge = base pour v3 progression)
- 🟠 **BRIEF-06 en cours** (cycle visiteurs = contexte auth/lifecycle pour fiche fan)

### Aval
- Permet phase 15 Content Scenarios Generation
- Permet phase 16 Community Manager AI
- Pré-requis stratégique cession CP clientes B2B (Mode C BP Agence) — le système de fiche fan est le produit vendu aux clientes B2B

### Parallélisme avec autres briefs
- Peut tourner en parallèle de BRIEF-02 Messenger UI (les badges tags vont dans ConversationRow)
- Peut tourner en parallèle de BRIEF-05 QStash (infra indépendante)
- Interfère avec BRIEF-07 Generate button (le bouton on-demand doit aussi trigger extraction)

## Acceptance criteria

### Phase A — Infrastructure DB (TICKET-FI01 à FI03)
- [ ] Table `agence_fan_insights` créée, RLS scope model actif
- [ ] Table `agence_fan_heat_scores` créée
- [ ] Vue matérialisée `agence_content_demand_agg` refresh auto daily

### Phase B — Extraction backend (TICKET-FI04 à FI07)
- [ ] Après 5 messages fan, au moins 1 tag auto-extrait visible en DB
- [ ] Extraction coûte < 0.001€ par message (Llama 3.1 8B via Groq gratuit)
- [ ] Heat score mis à jour quotidiennement, range 0-100
- [ ] Extraction non-bloquante (pas de latence sur réponse fan)

### Phase C — Conversation progression (TICKET-FI08 à FI09)
- [ ] Niveau 1 (msg 1-3) : 0 explicite, 100% flirt léger + questions goûts
- [ ] Niveau 2 (msg 4-8) : flirt chaud, allusions, demande d'engagement
- [ ] Niveau 3 (msg 9+, heat > 50) : explicite autorisé, push Fanvue actif
- [ ] Détection âge mineur → reset niveau 1 + flag admin (jamais d'explicite)

### Phase D — UI admin (TICKET-FI10 à FI12)
- [ ] Drawer fan affiche tags par catégorie (badges colorés)
- [ ] Bouton valider/corriger tag IA fonctionnel
- [ ] Dashboard `/agence/insights` top 10 tags visible
- [ ] Brief shooting hebdo téléchargeable CSV

### Phase E — Légal + sécu (TICKET-FI13 à FI15)
- [ ] Privacy Policy mentionne explicitement insights + base légale
- [ ] Fan peut supprimer ses tags depuis `/m/yumi?tab=preferences`
- [ ] Export fan data complet (JSON download)
- [ ] Audit log SELECT sur insights

### Phase F — Analytics (TICKET-FI16 à FI17)
- [ ] Brief shooting auto hebdo publié
- [ ] Notifications Telegram Yumi envoyées (top 3 tags semaine)

### Global
- [ ] Aucune régression agent IA existant (modes auto/copilot/user fonctionnent)
- [ ] Zéro data sensible exposée publiquement (tests pentest basique)
- [ ] Coût mensuel LLM extraction < 10€/1000 fans actifs

## Notes CDP

### Risque #1 — Hallucination extraction

Llama 3.1 8B peut inventer des tags. Mitigation :
- Prompt strict : "extrait UNIQUEMENT les préférences explicitement exprimées par le fan"
- Whitelist vocabulary (50-100 tags valides) — rejeter tag hors liste
- Confidence < 0.6 → pas d'insert
- Admin peut corriger

### Risque #2 — Conversation manipulation

Agent qui "chauffe" pour extraire max data → risque perçu manipulation. Mitigation :
- Transparence Privacy Policy
- Bouton "pourquoi ces questions ?" dans UI fan
- Jamais insister si fan ne répond pas aux questions

### Risque #3 — Coût LLM

Si 1000 messages/jour × 2 appels LLM (réponse + extraction) = 2000 calls/jour. Groq free = 14 400/jour → OK jusqu'à ~7000 messages/jour. Au-delà, bascule OpenRouter payant.

### Risque #4 — RGPD : DPO requis ?

Si >250 employees OU >10k fans traités → DPO obligatoire. Heaven MVP < 1k fans → exempté. À surveiller.

### Skills Claude Code préférentiels

- FI01-FI03 : Supabase MCP + `general-purpose`
- FI04-FI07 : `senior-backend` + `vercel:ai-sdk` + `brand-voice:conversation-analysis`
- FI08-FI09 : `brand-voice:content-generation` (persona) + `senior-backend` (runtime)
- FI10-FI12 : `senior-frontend` + `vercel:shadcn` + `design:ux-copy` + `design:accessibility-review`
- FI13-FI15 : `legal:compliance-check` + `legal:review-contract` + `engineering:documentation`
- FI16-FI17 : `data:analyze` + `data:build-dashboard`

### Phasage recommandé (étape par étape NB)

1. **Phase A** (DB) : commit isolé, validation schéma avant backend
2. **Phase B** (extraction backend) : test en prod avec échantillon 10 fans, validation qualité tags
3. **Phase C** (progression conversation) : peut-être fusionner avec BRIEF-08 L1 persona v3
4. **Phase D** (UI) : après B stable, validation visuelle
5. **Phase E** (légal) : doit être livré **AVANT** Phase D go prod
6. **Phase F** (analytics) : bonus, quand B+D matures

### Décision critique demandée

Est-ce que NB valide :
- [ ] L'approche RGPD (consent explicite + droit suppression + Privacy Policy update)
- [ ] Le seuil heat score 50 pour explicite
- [ ] Les 6 catégories (body_part / position / fetish / scenario / content_type / mood)
- [ ] Le modèle Llama 3.1 8B pour extraction (vs 70B auto-reply)
- [ ] L'ordre de phasage (A→B→C→E→D→F)

Sans ces validations, Phase A peut démarrer (infra DB pure), mais Phase B+ bloqué.

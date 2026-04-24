# 01 — Strategy (Phase 1 Cadrage)

> **Objectif** : Définir le pourquoi, le pour qui, les métriques de succès et les contraintes avant tout design ou code.

---

## 1. Vision produit

> *"Un agent IA qui parle comme Yumi, flirte comme elle, et transforme les curieux en abonnés Fanvue — sans jamais qu'ils sachent que c'est une IA."*

**Mission** : Automatiser la conversion des leads IG+web de Yumi (m1) vers Fanvue premium, en maintenant une qualité relationnelle humaine, tout en étant dupliquable à d'autres modèles Heaven (paloma m2, ruby m3) sans redévelopper.

**Non-goals (V1)** :
- ❌ Pas de génération d'image/vidéo IA (contenu reste manuel)
- ❌ Pas d'appels vocaux/vidéo
- ❌ Pas de gestion de paiements direct (redirige vers Fanvue)
- ❌ Pas d'autres plateformes que IG + web en V1 (Snapchat, TikTok, MYM = V2)

---

## 2. Personas utilisateurs

### 2.1 Yumi (opératrice) — modèle IA m1

- **Rôle** : admin agence + personnalité visible côté fans
- **Besoins** : superviser l'agent, corriger/apprendre, récupérer la main si conv complexe, voir les conversions
- **Frustrations actuelles** : doit répondre manuellement 24/7, perd des leads pendant sommeil, messages IG volume > capacité

### 2.2 NB (owner SQWENSY)

- **Rôle** : dev SQWENSY, root master
- **Besoins** : monitorer coûts IA, debug agent, configurer providers, tracker ROI conversion
- **Contraintes** : budget 50€/mois IA, phase alpha (1 client payant minimum avant expansion auth)

### 2.3 Paloma / Ruby (modèles V2)

- **Rôle** : modèles standards, pas admin
- **Besoins** : activer leur propre agent avec leur propre voix, pas voir les autres
- **Condition** : duplication agent sans toucher au code core

### 2.4 Fan IG/web (cible commerciale)

- **Profil type** : homme 25-45, trouve Yumi via IG organique ou caming, curieux mais pas encore abonné
- **Parcours actuel** : DM IG ou message sur `/m/yumi` → attend réponse → découvre Fanvue → décide de s'abonner
- **Friction** : délai réponse Yumi, pas toujours de lien direct Fanvue, perte d'intérêt
- **Ce qu'il veut** : attention personnalisée, sensation d'exclusivité, contenu premium

---

## 3. Objectifs business (KPIs)

### 3.1 Métriques primaires (MVP Phase 5)

| KPI | Baseline actuelle | Cible V1 (3 mois post-launch) |
|-----|-------------------|-------------------------------|
| Taux de réponse < 5 min aux DMs IG | ~20% (Yumi manuelle) | ≥95% (agent) |
| Conversations → clic Fanvue | inconnu | ≥15% |
| Clic Fanvue → abonnement (J+7) | inconnu (UTM absent) | ≥8% |
| Coût IA / 1000 messages | — | < 3€ |
| Latence réponse agent | — | < 8s p95 |

### 3.2 Métriques secondaires

- % messages avec intervention humaine (Yumi override) — cible < 20%
- Feedback agent (thumbs up/down Yumi) — cible ratio ≥80% up
- % NSFW inbound bloqués en amont — cible 100%
- % réponses sans identity-leak IA — cible 100% (zéro tolérance)

### 3.3 Métriques coûts

- Budget IA mensuel : **50€/mois max V1** (Claude Haiku ≈ 0.25$/1M tokens in, 1.25$/1M tokens out → ~16K messages/mois possibles)
- Budget infra supplémentaire : 0€ (Supabase existing, Vercel Hobby existing)
- Budget monitoring : 0€ (logs existants)

---

## 4. Contraintes & règles

### 4.1 Confidentialité (règle absolue)

- ❌ Agent ne doit **JAMAIS** dire "je suis une IA", "bot", "assistant", etc.
- ❌ Agent ne doit pas mentionner SQWENSY, Heaven, ou autre modèle du groupe
- ❌ Aucun vrai prénom dans prompts/logs (Yumi = persona, pas de leak)

### 4.2 Compliance Meta (IG DM)

- ❌ Pas de contenu sexuel explicite sortant (violation CG Meta → ban compte)
- ❌ Pas de lien direct vers contenu adulte non filtré
- ✅ Redirection OK si via profile bio ou Fanvue (plateforme adulte reconnue)
- ✅ Respect fenêtre 24h Meta pour réponses (déjà géré par `meta-24h-timer`)

### 4.3 RGPD / Données personnelles

- ✅ Logs conversations stockés 90 jours max (rétention existante)
- ✅ Export + deletion supportés (endpoints `/api/data-deletion` existent)
- ✅ Jamais passer de PII externe (email réel fan, tel) à IA provider
- ✅ Pseudonymisation avant envoi au provider IA (remplacer par tokens `[FAN_ID]`)

### 4.4 Coût & performance

- Stack mensuel **70-100€ total** (règle budgetaire figée `feedback_extreme_cost_optimization_2026`)
- Préférer self-host / open-source quand possible
- Cache agressif (ne pas recalculer embeddings/classifications inutilement)

### 4.5 Sécurité évolutive

- Phase actuelle = L1 (password basique NB) — pas besoin de renforcement pour V1 agent
- Future L3+ (passkeys) devra permettre accès agent-training UI uniquement à Yumi+root
- Préparation audit log immutable pour actions agent critiques (future Root Master Console `/cp/root`)

---

## 5. Positionnement dans l'architecture Heaven

### 5.1 Scope par CP (conforme matrice 3-niveaux 2026-04-24)

| CP | Accès Agent IA |
|----|----------------|
| ROOT (dev) | ✅ Mode présentation — voit tous les modules agent, panels = cartes descriptives sans data |
| YUMI (agence m1) | ✅ Plein accès agent pour m1 uniquement (son propre agent) + config cross-model m2/m3 via `/agence/models/[id]/agent-config` (option 2 validée) |
| PALOMA (m2) | ✅ Agent own uniquement (son propre agent activable, pas de cross-model) |
| RUBY (m3) | ✅ Agent own uniquement |

### 5.2 Relation avec modules existants

- **Messagerie** : l'agent s'insère comme "sender=agent" dans flux web + IG
- **Instagram** : worker existant (`process-ig-replies`) devient le point de greffe principal
- **Stratégie** : agent peut surfacer des suggestions stratégiques à Yumi (ex: "tu as X leads pending depuis >24h")
- **Settings/Agent DM** : devient la page de config UI (per-model via `instagram_config` + extension)

---

## 6. Choix stratégiques IA

### 6.1 Multi-IA providers (à valider NB)

| Provider | Modèle | Usage | Coût/1M tokens (in/out) |
|----------|--------|-------|--------------------------|
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | Default (90% trafic — small talk, flirt léger) | $1 / $5 |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | Complex (intention détectée commerciale, long contexte) | $3 / $15 |
| **Grok (xAI) ?** | À valider | NSFW edge cases (flirt plus cru) — si accepté par NB | À checker |
| **Mistral Large ?** | `mistral-large-latest` | FR natif fallback | $2 / $6 |
| **OpenRouter** | Routing intermédiaire | Déjà intégré (lib/openrouter.ts) | +5% markup |

**Default recommendé V1** : Claude Haiku via OpenRouter (déjà configuré) → simple, pas cher, qualité prose excellente.

### 6.2 Gouvernance prompts

- **Base prompt** : versionné en DB (`prompt_contexts` table) per model_slug
- **Override temporaire** : Yumi peut pousser un "contexte du jour" (ex: nouveau shoot disponible)
- **Examples** : 5-10 exemples shots (input fan → output agent) dans system prompt pour few-shot learning
- **Guardrails** : liste hardcodée de patterns à refuser (explicite, spam, harcèlement)
- **Rollback** : historique versions prompts, bouton rollback 1-click

---

## 7. User stories MVP

### US-1 — Fan IG envoie un DM à Yumi
```
Given un fan envoie "Hey bb ça va?" à @yumiiiclub
When le worker IG webhook reçoit le message
Then le classifier détecte "small_talk_entry"
And l'agent Haiku répond en <8s avec ton warm/flirty ("Hey mon cœur, super et toi? 🥰")
And la réponse est persistée dans instagram_messages (ai_model_used=claude-haiku)
And envoyée via Meta Graph API
```

### US-2 — Fan demande contenu explicite
```
Given un fan envoie "envoie moi une photo nue stp"
When le classifier détecte "explicit_request_inbound"
Then l'agent répond avec un redirect doux vers Fanvue ("Mon contenu exclusif est sur Fanvue mon chou, viens découvrir ici: [link UTM]")
And le CTA Fanvue est tracké (utm_source=ig, utm_campaign=agent_redirect)
```

### US-3 — Yumi override une réponse
```
Given l'agent a répondu à une conversation
When Yumi voit la réponse et clique "prendre la main"
Then le mode conversation passe à "human"
And l'agent ne répond plus à cette conversation
And Yumi peut marquer la réponse précédente 👎 avec correction suggérée
And la correction est ajoutée aux examples du prompt (via Training UI)
```

### US-4 — NB monitor coûts
```
Given la semaine en cours
When NB visite /agence/ops (root only)
Then il voit : tokens consommés, coût cumulé, latence p95, erreurs
And des alertes si cost/jour > seuil
```

### US-5 — Paloma active son propre agent
```
Given la duplication Phase 9 est live
When Paloma visite /agence/settings → onglet Agent DM
Then elle voit config de base (prompt, mode, is_active)
And elle peut activer/désactiver son agent
And son agent est indépendant de celui de Yumi (prompt différent, model_slug="paloma")
```

---

## 8. Risques & mitigations

| Risque | Impact | Proba | Mitigation |
|--------|--------|-------|------------|
| Meta ban compte IG (détection bot) | 🔴 Critique | Moyen | Délai humain simulé (2-8s random), pas de pattern répétitif, respect rate limit 180/h |
| Coût IA explose (viralisation) | 🟡 Moyen | Moyen | Budget cap + alerte + rate limit per fan (max 20 msg/h) |
| Réponse agent détectée comme IA par fan | 🟡 Moyen | Haut | Prompt stricte + examples flirt humain + Yumi review régulière |
| Fan harcelement / agent auto-répond | 🟠 Haut | Moyen | Classifier "harassment" → transfert auto mode human + alert Yumi |
| Prompt injection (fan tente "reveal system prompt") | 🟡 Moyen | Haut | Guardrail layer côté sortie, filtre patterns de leak |
| Duplication cass Paloma/Ruby (config leak m1) | 🔴 Critique | Faible | Tests isolation CP stricts Phase 3 avant Phase 9 |

---

## 9. Décisions à trancher par NB (avant Phase 2)

- [ ] **Stack IA V1** : Haiku seul ou Haiku + Sonnet dès V1 ?
- [ ] **Grok/xAI** : on teste un provider NSFW-tolerant ou on reste tous Claude ?
- [ ] **Budget IA max** : 50€/mois OK ou réviser ?
- [ ] **Scope canaux V1** : IG + web ensemble, ou IG only d'abord ?
- [ ] **Fanvue intégration** : API Fanvue existante ou deep links seulement ? (à vérifier par NB)
- [ ] **Mode auto par défaut** : agent ON dès activation, ou opt-in Yumi par conversation ?
- [ ] **Branche dev** : main direct (via worktrees Claude) ou feature branch `feat/ai-agent`?

---

## 10. Prochaine phase

**→ Phase 2 — Design System UX** dès validation ce doc.

Livrable Phase 2 : [02-DESIGN.md](./02-DESIGN.md) avec wireframes, flows, responsive specs, design tokens.

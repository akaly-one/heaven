# [NN] — [Nom du Plan Marketing]

> **TEMPLATE** — copier ce fichier en `NN-nom-court.md` et remplir.
> Toutes les sections sont **obligatoires** (sauf "Brainstorming notes" et annexes).
> Une section vide = refus en review NB.

---

## 📋 Métadonnées

| Champ | Valeur |
|---|---|
| **ID** | NN (auto-incrément, voir README index) |
| **Nom** | (court, descriptif, sans jargon) |
| **Statut** | 🔵 idée / 🟡 brainstorm / 🟠 cadré / 🟢 dispatch / ✅ livré / ⚪ archivé |
| **Date création** | YYYY-MM-DD |
| **Date dernière maj** | YYYY-MM-DD |
| **Owner** | NB |
| **Modèles cibles** | yumi / ruby / paloma / all / opt-in |
| **Layer impacté** | FE, BE, IA, UX, Marketing, Legal |
| **Priorité business** | P0 / P1 / P2 |
| **Brief PMO lié** | BRIEF-2026-XX-YY (si formalisé) |
| **Module dev lié** | `plans/modules/<module>/` (si rattachement existant) |

---

## 🎯 Vision macro

### Problème à résoudre
(1 paragraphe : quel pain point business / fan / opérationnel résout ce plan ?)

### Outcome attendu
(Résultat business mesurable : ex "+30% de fans actifs/mois", "+5 ambassadeurs/mois")

### Pourquoi maintenant ?
(Contexte stratégique : pourquoi ce plan a sa place dans la roadmap actuelle)

### Pattern de référence externe
(Inspiration : Dropbox refer, Airbnb credits, Duolingo streaks, etc.)

---

## 🧠 Concept central

### Mécanique en 1 phrase
> "Le fan fait X → reçoit Y → l'IA suit Z."

### Schéma simple
```
[Acteur 1]
    ↓
[Action déclencheur]
    ↓
[Détection / validation]
    ↓
[Récompense / résultat]
    ↓
[Acteur 2 / suivi]
```

### Pourquoi ça marche (psycho)
(Levier psychologique : FOMO, gamification, statut social, gain monétaire perçu, etc.)

---

## ⚙️ Mécaniques détaillées

### Actions valorisables
| Action | Trigger | Reward | Validation |
|---|---|---|---|
| (ex) Story IG tag @yumi | Webhook IG `mentions` | Bonus X | AI score >0.8 auto |
| (ex) Code parrainage utilisé | URL `?ref=ABC` | Bonus Y prospect + parrain | Cookie + activité 24h+ |
| ... | | | |

### Système de gain (si applicable)
- **Visible côté fan** : ce que voit l'utilisateur (paliers, milestones, bonus)
- **Invisible côté IA** : scoring interne pour quantifier l'engagement (points, score)

### Paliers / progression (si gradins)
| Niveau | Trigger | Bonus auto attribué |
|---|---|---|
| 🌱 Découverte | (ex) 1 prospect via code | (ex) +1 semaine Silver |
| 🌿 Régulier | (ex) 3 prospects | (ex) +1 mois Silver |
| 🌳 Confirmé | (ex) 7 prospects | (ex) +1 mois Gold |

---

## 🌊 Workflow concret

### Flow utilisateur final (visiteur / fan / prospect)
```
1. ...
2. ...
3. ...
```

### Flow ambassadeur / power user (si applicable)
```
1. ...
2. ...
3. ...
```

### Flow Agent IA (backstage)
```
1. Détecte ...
2. Quantifie ...
3. Décide ...
4. Exécute ...
5. Apprend ...
```

### Flow admin (suivi / supervision)
```
1. Consulte dashboard ...
2. Override si besoin ...
3. Configure ...
```

---

## 🛡️ Anti-fraude / Pare-feux

### Risques identifiés
| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| (ex) Multi-comptes | Élevée | Moyen | Fingerprint + IP + cookie cross-check |
| (ex) Bot likes | Élevée | Faible | Min activité Insta + AI bot probability |
| ... | | | |

### Pare-feux techniques
1. Rate limiting par fingerprint
2. Cooldown entre actions du même type
3. Cap absolu cumul / fan / période
4. AI scoring threshold pour auto-validate
5. Manual review fallback admin
6. Auto-revoke si comportement post-reward suspect

### Conformité légale
- BE : Code de droit économique (loterie / promotion)
- RGPD : opt-in explicite, droit à l'oubli, anonymisation X jours
- Tax : seuil avantages en nature
- ToS plateformes externes (Instagram, Fanvue, etc.)

---

## 🔌 Intégration CP (CRITIQUE)

> **Cette section garantit que le plan est adaptable au CP existant sans casser
> l'archi. Elle DOIT être détaillée. Section refusée si vide.**

### Pages CP impactées
| Page existante | Modification requise | Type |
|---|---|---|
| (ex) `/agence/strategie` | Ajout tab "Marketing Ambassadeur" | Additive |
| (ex) `/agence/clients` | Recréation page liste + drawer enrichi | Restoration |
| (ex) `/m/[slug]` | Badge wallet + modal actions | Additive |

### Composants à créer
| Composant | Fichier | Réutilise |
|---|---|---|
| (ex) `<AmbassadorWidget>` | `src/web/components/profile/ambassador-widget.tsx` | `<StoryGeneratorModal>` patterns |
| ... | | |

### Composants existants à étendre
| Composant existant | Extension | Backward-compat |
|---|---|---|
| (ex) `<FanDrawer>` | Section "Ambassadeur" | Oui (props optional) |
| ... | | |

### DB schema (haut niveau)
```sql
-- Préfixe convention : mkt_ pour tables marketing-only
-- Ou nom explicite si table partagée
mkt_ambassador_actions (...)
mkt_ambassador_paliers (...)
-- etc.
```

### API routes nouvelles
| Route | Méthode | Description |
|---|---|---|
| (ex) `/api/marketing/ambassador/track` | POST | Log action ambassadeur |
| (ex) `/api/marketing/ambassador/redeem` | POST | Conversion bonus (si applicable) |

### Config par modèle
- Activable/désactivable par modèle (yumi/ruby/paloma)
- Paliers/rewards configurables dans `/agence/strategie` tab Marketing
- Stockage : table `mkt_<plan>_config (model_slug pk, ...)`

### Réutilisation existant maximale
- ✅ `/api/codes` (BRIEF-16) pour générer codes accès
- ✅ `<StoryGeneratorModal>` pour template stories
- ✅ Agent IA Groq (BRIEF-08) pour scoring
- ✅ `<FanDrawer>` pour fiche fan (NE PAS dupliquer)
- ✅ Cloudinary upload existant

### Modifications NON-disruptives
- ✅ Pas de breaking change sur les composants existants
- ✅ Toutes les nouvelles tables sont indépendantes
- ✅ Toutes les nouvelles routes sont additives
- ✅ Les modifications composants existants sont via props optional avec defaults
- ⚠️ Si une modification breaking est nécessaire → ADR explicite + migration plan

---

## 🤖 Rôle Agent IA

### Mission
(1 paragraphe : ce que l'IA fait dans ce plan)

### Layers IA mobilisés
- [ ] **Persona** (BRIEF-08) — pour réponses fan
- [ ] **Marketing scorer** — pour valider actions
- [ ] **Anomaly detector** — pour détecter fraude
- [ ] **Coach** — pour proposer next-best-action
- [ ] **Sync CRM** — pour update fiche fan

### Inputs IA
- Webhook events (Instagram, Snap, Fanvue)
- Cookies / fingerprints / handle
- Historique actions / wallet
- Profil fan (tier, status, total_spent)

### Outputs IA
```json
{
  "score": 0.92,
  "decision": "auto_validate" | "flag_review" | "auto_reject",
  "reward_grant": { "type": "tier_extension", "duration": "7d", "tier": "p1" },
  "next_best_action": "propose_cascade_invitation",
  "audit_log": { ... }
}
```

### Threshold décisionnels
- Auto-validate : score >= X (généralement 0.8)
- Flag review : score 0.5 <= score < 0.8
- Auto-reject : score < 0.5

---

## 📊 KPIs & Mesures

### Indicateurs de succès
| KPI | Cible 30j | Cible 90j | Mesure |
|---|---|---|---|
| (ex) Prospects ramenés | 50 | 200 | COUNT actions WHERE type='referral' |
| (ex) Conversion rate | 30% | 50% | prospects_actifs_7j / prospects_total |
| (ex) Coefficient viral | 0.3 | 0.7 | nb_prospects_avg / ambassadeur |

### Dashboard admin
- Section dédiée dans `/agence/strategie` tab Marketing
- Stats temps réel : actions / heures / conversions
- Top contributors leaderboard
- Anomaly log

### Reporting
- Hebdomadaire : email NB avec stats clés
- Mensuel : analyse approfondie + propositions ajustements

---

## 🗓️ Phases déploiement

### MVP (Phase 1)
**Scope minimal** pour valider l'hypothèse.
- Livrables : ...
- Estimation : X jours
- Critère de succès : ...

### Phase 2 (extension)
**Si MVP validé**, ajout de fonctionnalités secondaires.
- Livrables : ...
- Estimation : X jours

### Phase 3 (long-terme)
**Optionnel**, scale + automatisation avancée.
- Livrables : ...
- Estimation : X jours

---

## ❓ Décisions stratégiques (ADRs)

| ADR | Décision à prendre | Options | Recommandation |
|---|---|---|---|
| ADR-XX-01 | (ex) Cascade max levels | 1 / 3 / 5 / illimité | 3 (légal-friendly) |
| ADR-XX-02 | (ex) Cap wallet par fan | 24h / 168h / illimité | 168h |
| ... | | | |

### Décisions opérationnelles
- [ ] Yumi a-t-elle Insta Business Account ?
- [ ] Fanvue a-t-il programme parrainage exploitable ?
- [ ] Budget juridique BE pour validation cascade ?

---

## 📝 Brainstorming notes (optionnel)

### Idées additionnelles non retenues (pour mémoire)
- ...
- ...

### Variantes à explorer plus tard
- ...
- ...

### Questions ouvertes
- ...
- ...

---

## 🔗 Références

- Plans liés : `plans/marketing/...`
- Modules tech impactés : `plans/modules/...`
- Briefs PMO : `plans/PMO/briefs/BRIEF-...`
- ADRs cross-cutting : `plans/DECISIONS.md`

---

## 📅 Changelog du plan (versionnement)

| Date | Version | Changement | Auteur |
|---|---|---|---|
| YYYY-MM-DD | 0.1 | Création initiale (brainstorm) | NB |
| ... | | | |

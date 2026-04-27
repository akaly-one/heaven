# 01 — Programme Ambassadeur

> **Plan marketing #01** — Système de fidélisation viral via parrainage + actions Instagram + agent IA marketing.

---

## 📋 Métadonnées

| Champ | Valeur |
|---|---|
| **ID** | 01 |
| **Nom** | Programme Ambassadeur |
| **Statut** | 🟡 brainstorm (en attente GO NB pour passage 🟠 cadré) |
| **Date création** | 2026-04-27 |
| **Date dernière maj** | 2026-04-27 |
| **Owner** | NB |
| **Modèles cibles** | yumi (pilote V1), puis ruby + paloma opt-in |
| **Layer impacté** | FE, BE, IA, UX, Marketing |
| **Priorité business** | P1 (growth lever majeur) |
| **Brief PMO lié** | BRIEF-2026-04-26-28 (à formaliser après GO) |
| **Module dev lié** | nouveau module `plans/modules/ambassador-program/` (à créer) |

---

## 🎯 Vision macro

### Problème à résoudre
Le profil web Yumi a peu de viralité organique. Acquisition payante coûteuse,
modèle dépend uniquement de son Insta personnel. Pas de mécanique
de fidélisation des fans actifs : un fan engagé n'a pas de raison de **revenir
fréquemment** ni de **ramener ses amis**. Pas non plus de **récompense pour
récompense de l'engagement**.

### Outcome attendu
- **Acquisition** : +30 nouveaux prospects / mois via fans existants (R0 ≥ 0.5)
- **Fidélisation** : +50% taux de retour 7j (visiteurs régulièrement actifs)
- **Viralité** : 1 fan actif → ramène 3 prospects en moyenne sur 90j
- **Coût acquisition** : ~5€ équivalent en bonus distribués (vs ~15€ pub Insta)
- **Engagement Insta** : +20% likes/saves/comments organiques par effet de levier

### Pourquoi maintenant ?
- Profile-as-Hub V1 livré (BRIEF-22+23) → infra prête pour features marketing additives
- Agent IA persona Yumi opérationnel (BRIEF-08) → extensible pour rôle marketing
- Module Clients à recréer (NB demande 2026-04-27) → opportunité d'intégrer suivi ambassadeur dans la fiche fan
- Page Stratégie existe → hub naturel pour configurer le programme

### Pattern de référence externe
- **Dropbox refer-a-friend** (2009) : code unique, bonus stockage croissant
- **Airbnb credits** : bonus monétaire pour parrain ET filleul
- **Duolingo streaks** : daily check-in fidélise long-terme
- **Robinhood gold cascade** : récompense les chaînes de parrainage
- **Pokemon Go quests** : missions journalières + rewards graduels

---

## 🧠 Concept central

### Mécanique en 1 phrase
> "Le fan partage son code/stories Insta → ramène prospects → l'IA quantifie l'engagement et attribue automatiquement des bonus proportionnels (accès profil prolongé, codes gratuits, liens Fanvue)."

### Schéma simple
```
Ambassadeur (fan engagé)
    ↓ partage code/lien ?ref=X OU story IG tag @yumiiiclub
Prospect / Ami
    ↓ arrive sur /m/yumi (cookie referral 30j) OU webhook IG mention
Agent IA Marketing
    ↓ détecte + valide + score interne (points invisibles côté fan)
    ↓ déclenche bonus auto au passage de paliers
Bonus attribué
    ↓ tier extension / code gratuit / lien Fanvue
    ↓ sync direct fiche client CP (visible NB)
Suivi cascade : si prospect devient ambassadeur → boucle
```

### Pourquoi ça marche (psycho)
- **Réciprocité** : le fan reçoit du contenu gratuit → veut "rendre" en partageant
- **Statut social** : devenir "ambassadeur officiel" valorise l'identité du fan
- **Gain palier** : la progression visible (paliers) crée engagement long-terme
- **Effet réseau** : chaque palier débloqué = expérience partageable
- **Faible friction** : actions sont triviales (story tag, like)
- **Récompense disproportionnée** : valeur perçue (1 mois Gold) >> coût modèle (rien, contenu existant)

---

## ⚙️ Mécaniques détaillées

### Actions valorisables (catalogue MVP)

| Action | Trigger technique | Reward direct | Points internes IA | Validation |
|---|---|---|---|---|
| Code parrainage utilisé | URL `?ref=X` + cookie | 7j Silver gratuit prospect (immédiat) | 50 pts ambassadeur | Auto + activité 24h+ check |
| Prospect actif 7j+ | Heartbeat /m/yumi quotidien | — | +25 pts ambassadeur | Auto |
| Prospect convertit (devient ambassadeur lui-même) | Self-generation code | — | +100 pts ambassadeur | Auto |
| Story IG tag @yumiiiclub | Webhook IG `mentions` | — | 20 pts | AI score >0.8 |
| Like 100% posts profil IG | Webhook count check | — | 30 pts | Auto |
| Follow @yumiiiclub | Webhook `follower_added` | — | 10 pts (one-time) | Auto |
| Comment positif sur post | Webhook `comments` + AI sentiment | — | 5 pts | AI sentiment >0.6 |
| Save un post | Webhook `media_saved` | — | 3 pts | Auto |
| Tag ami dans story | AI extrait @ list | — | 15 pts | Auto si ami valide |
| Cascade lvl1 (ami devient ambassadeur) | Self-gen code par tagged friend | — | +50 pts parrain | Auto |
| Cascade lvl2 | Idem lvl1 mais 2 niveaux | — | +25 pts parrain | Auto |
| Daily check-in profil web | Visite quotidienne | — | 2 pts | Auto, max 1/jour |

**Note** : les "points internes" sont **invisibles côté fan**. Ils servent uniquement
à l'IA pour quantifier l'engagement et déclencher les paliers automatiquement.

### Système de gain (visible vs invisible)

#### ✅ Visible côté fan (motivation transparente)
- Code de parrainage personnel : "Partage ton code YUMI-AKA42"
- Compteur de prospects ramenés : "Tu as parrainé 5 fans"
- Paliers franchis avec annonce : "🎉 Palier Confirmé débloqué !"
- Bonus attribués clairement : "+1 mois Gold offert"

#### 🤖 Invisible côté fan (orchestration IA)
- Score d'engagement total (points cumulés)
- Patterns détectés (ex : "fan plus actif le weekend")
- Prédictions de churn / opportunités
- Score de "fiabilité" (anti-fraud)

### Paliers ambassadeur (gradins de fidélisation)

| Niveau | Critère trigger | Bonus auto attribué | Points minimum (interne) |
|---|---|---|---|
| 🌱 **Découverte** | 1er prospect actif via code | 1 semaine Silver gratuit | 50 pts |
| 🌿 **Régulier** | 3 prospects convertis OR 200 pts | 1 mois Silver + 1 code Gold transmissible 24h | 200 pts |
| 🌳 **Confirmé** | 7 prospects convertis OR 500 pts | 1 mois Gold + 1 semaine VIP Black + 1 custom photo offerte | 500 pts |
| 🌟 **Ambassadeur** | 15 prospects convertis OR 1000 pts | 1 mois VIP Black + lien Fanvue 1 mois gratuit | 1000 pts |
| 👑 **VIP Promoter** | 30 prospects convertis OR 2500 pts | VIP Black 6 mois + accès stories privées + IRL perks | 2500 pts |

### Bonus prospect (incentive d'arriver)

| Action prospect | Bonus reçu |
|---|---|
| Arrive via code ambassadeur | 🎁 7 jours accès Silver gratuit (immédiat, sans action) |
| Reste actif 7 jours | +3 jours bonus (extension auto Silver) |
| Like 5 posts profil IG | +1 jour Gold trial |
| Génère son propre code et le partage | Devient ambassadeur 🌱 (entre dans la chaîne) |
| Convertit son 1er prospect | +1 semaine Gold |

---

## 🌊 Workflow concret

### Flow visiteur (prospect arrive via code)
```
1. Fan A (ambassadeur) partage son code/lien :
   - Story IG : "Suis @yumiiiclub elle est sublime ! Code YUMI-AKA42 pour accès gratuit"
   - DM/WhatsApp/Snap : envoie le lien direct
2. Prospect P clique le lien : https://yumii.club/?ref=AKA42
3. Cookie `heaven_ref=AKA42` placé (30 jours TTL)
4. Arrivée /m/yumi :
   - Bonus immédiat activé : tier Silver débloqué pendant 7 jours
   - Toast/banner : "🎁 Bienvenue ! Tu as 7j Silver offerts grâce à @aka_lii"
   - Optionnel : prompt pour renseigner @ Insta (pour cumul actions futures)
5. P explore le profil, voit le contenu Silver
6. Si P reste actif 24h+ → conversion comptée pour A (50 pts internes)
7. Si P reste actif 7j+ → A reçoit +25 pts (engagement confirmé)
8. Si P clique "Devenir ambassadeur" → P reçoit son propre code, A reçoit +100 pts (cascade gold)
```

### Flow ambassadeur (fan engagé)
```
1. Fan A connecté avec @insta sur /m/yumi
2. Voit widget "Programme Ambassadeur" :
   - "Ton code : YUMI-AKA42 [Copier] [Partager]"
   - "Tes prospects ramenés : 5 (objectif 7 → palier Confirmé !)"
   - "Actions : ☑ Follow / ☑ Like all / ☐ Story tag (+20 pts)"
3. A publie story IG taguant @yumiiiclub
4. Webhook IG → IA score → si validé : +20 pts internes
5. A atteint 500 pts → bonus auto :
   - Notif web : "🎉 Tu as débloqué le palier Confirmé !"
   - Email/notif Telegram : récap bonus
   - Tier Gold extension + custom photo créditée
6. A peut consulter son historique :
   - Liste actions validées
   - Liste prospects ramenés (anonymisés ou avec @ si opt-in mutuel)
   - Prochain palier + actions suggérées par IA
```

### Flow Agent IA (backstage)
```
1. DÉTECTE
   - Webhook IG event (mention, comment, follower_added, media_saved)
   - URL ?ref=X arrival (cookie set)
   - Heartbeat /m/yumi (active prospect tracking)
   - Self-generation code (cascade detection)

2. QUANTIFIE
   - Score sentiment / spam / bot pour chaque action
   - Calcule points internes proportionnels
   - Update visitor_points table

3. DÉCIDE
   - Si action score >0.8 → auto-validate
   - Si 0.5-0.8 → flag pour review admin
   - Si <0.5 → auto-reject (silencieux, pas de notif fan)
   - Vérifie cooldowns / caps / fingerprint cross-check

4. EXÉCUTE
   - Update fiche fan dans CRM
   - Si palier franchi → grant bonus auto :
     * Tier extension : update client.unlocked_tier_until
     * Code gratuit : POST /api/codes via existing endpoint
     * Lien Fanvue : génère URL parrainage Fanvue (si API dispo)
   - Notif fan via canal préféré (web push, email)

5. APPREND (Phase 2+)
   - Quels paliers convertissent le mieux
   - Quelles actions ramènent le plus de fans actifs
   - Quel profil prospect est le plus loyal (LTV)
   - Adapte les seuils dynamiquement (A/B test thresholds)

6. PROPOSE (coach mode)
   - Si fan stagnant : DM via persona Yumi avec promo bonus ciblée
   - Si fan proche d'un palier : nudge "tu es à 2 fans du palier Confirmé !"
   - Si opportunité : suggérer cascade activation aux fans inactifs
```

### Flow admin (suivi / supervision)
```
1. Page /agence/strategie tab "Marketing Ambassadeur"
   - Stats live : actions / heures / conversions
   - Top contributors leaderboard (ambassadeurs actifs)
   - Anomaly log (actions flagged pour review)
   - Configurateur catalogue actions ↔ points
   - Configurateur catalogue paliers ↔ bonus
   - Toggle on/off du programme

2. Module Clients /agence/clients
   - Liste tous fans/prospects (filter par tag ambassadeur)
   - Click sur un fan → drawer fiche enrichie

3. Drawer fiche fan
   - Section "Ambassadeur" :
     * Code de parrainage personnel
     * Wallet points (admin only)
     * Liste des prospects ramenés (avec status)
     * Timeline actions validées par IA
     * Cascade chain (parent / enfants)
     * Status agent IA : actif / pause
   - Quick actions admin :
     * Override IA : grant +X points manual
     * Freeze ambassadeur (anti-fraude)
     * Reset paliers
     * Force palier (cas exceptionnel)

4. Anomaly review
   - Queue actions flagged AI score 0.5-0.8
   - Bouton Validate/Reject + raison
   - Cron daily : expire flagged > 7 jours

5. Reporting
   - Email hebdomadaire NB avec stats clés
   - Mensuel : analyse approfondie + ajustements proposés
```

---

## 🛡️ Anti-fraude / Pare-feux

### Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Multi-comptes (1 fan crée 10 IG pour s'auto-parrainer) | Élevée | Moyen | Fingerprint device + IP + cookie cross-check, min 30 followers vraisemblables |
| Bots likes/follows automatisés | Élevée | Faible | Min activité Insta (30 followers + 10 posts + 30j age), AI bot probability check |
| Prospect "fantôme" (s'inscrit puis disparaît) | Moyenne | Faible | Conversion comptée seulement après activité 24h+ |
| Story photoshopée (faux tag) | Faible | Faible | Webhook IG = source de vérité, screenshot manual = manual review |
| Spam tag amis (1 fan tag 50 amis) | Moyenne | Faible | Rate limit 1 tag valide / 24h / fingerprint |
| Cascade pyramide infinie | Moyenne | Moyen | Max 3 niveaux profondeur, reward décroissant 100/50/25% |
| Coordinated raid (groupe organisé pour exploit) | Faible | Moyen | Anomaly detection : 5+ comptes même IP/ASN flag review |
| Fan supprime story après reward | Élevée | Faible | Cron daily check existence story → auto-revoke si supprimée < 24h |
| Reward inflation (tout le monde a accès gratuit) | Moyenne | Élevé | Cap absolu : max 30j gratuits cumulables / 90j roulants |
| ToS Instagram bannissement | Faible | Élevé | Pas d'incitation explicite "follow for follow", focus engagement organique authentique |

### Pare-feux techniques (par ordre d'application)

1. **Min activité Insta** (avant 1ère validation)
   - 30 followers vraisemblables
   - 10 posts existants
   - Compte âgé de 30j+
   - Following count < 7000 (anti follow-train)

2. **Fingerprint multi-couches** (pour chaque action)
   - Insta handle (depuis OAuth visitor / story tag)
   - Device fingerprint (FingerprintJS)
   - IP /24 subnet
   - User Agent
   - Cookie session
   - Si ≥ 2 matches sur fingerprint déjà rewarded → action ignorée

3. **Rate limiting**
   - 1 story tag validée / 24h / fingerprint
   - 5 comments validés / jour
   - 3 saves comptés / jour
   - 1 daily check-in / jour

4. **Cooldowns paliers**
   - 30 jours entre récompenses du même palier (anti grind)
   - Max 30 jours gratuits cumulables sur 90j roulants

5. **AI scoring threshold**
   - score >= 0.8 → auto-validate
   - score 0.5-0.8 → flag review admin
   - score < 0.5 → auto-reject (silencieux)

6. **Heuristique anomaly detection**
   - 50 likes en < 60s → bot, action ignorée
   - 10 saves en < 5min → bot
   - Story posted 3x en 1h → spam, flag
   - Cascade chain > 5 deep → pyramide aberrante, freeze
   - Tag chain origin = 1 fingerprint → coordinated, freeze

7. **Cap absolu wallet**
   - Max 168h disponibles à tout moment (= 7j Gold)
   - Empêche stockage illimité

8. **Auto-revoke post-reward**
   - Cron daily : story tagged still exists ?
   - Si supprimée < 24h après grant → revoke 50% reward
   - Si fan unfollow @yumi < 24h après grant → revoke 50%

9. **Manual override admin**
   - Freeze ambassadeur en 1 clic
   - Reset wallet
   - Bonus manuel +/- points

10. **Captcha** (Phase 2 si abus détectés)
    - Cloudflare Turnstile sur 1ère inscription
    - Sur conversion bonus > 24h

### Conformité légale

- **BE** : Pattern "fidélité" (récompense engagement) plutôt que "concours/loterie" pour
  éviter Code de droit économique. Validation juridique recommandée avant scale (~500€).
- **Pyramide** : Max 3 niveaux + reward décroissant = légal-friendly (pas MLM).
- **RGPD** : Opt-in explicite pour stockage @ Insta. Anonymisation handle après 90j inactif.
  Droit à l'oubli sur demande.
- **Tax** : Avantages en nature > 250€/an cumul → notification fiscale BE potentielle.
  Documentation des bonus distribués pour audit éventuel.
- **ToS Instagram** (Section 3 "Inauthentic activity") : pas d'incitation explicite à
  des actions automatisées (no "follow for follow"). Focus authenticité (story créée
  organiquement par le fan, pas une template robotique).
- **ToS Fanvue** : si lien parrainage utilisé, vérifier conformité programme partenaire
  Fanvue.

---

## 🔌 Intégration CP

> ⚠️ Cette section garantit l'adaptabilité au CP existant **sans casser**.

### Pages CP impactées

| Page existante | Modification requise | Type | Effort |
|---|---|---|---|
| `/agence/strategie` | Ajout tab "Marketing Ambassadeur" dans `<StrategiePanel>` | Additive | M |
| `/agence/clients` | Recréation page liste (revert v1.6.15 redirect) + drawer fiche enrichi | Restoration + extension | L |
| `/m/[slug]` | Ajout `<AmbassadorWidget>` côté visiteur connecté + badge wallet header | Additive | M |
| `/agence/messagerie` | Drawer fiche fan partage section "Ambassadeur" via composant unifié | Réutilisation | S |

### Composants à créer

| Composant | Fichier | Rôle | Réutilise |
|---|---|---|---|
| `<AmbassadorWidget>` | `src/web/components/profile/ambassador-widget.tsx` | UI visiteur avec code + actions + paliers | Patterns `<StoryGeneratorModal>` |
| `<AmbassadorBadge>` | `src/web/components/profile/ambassador-badge.tsx` | Badge wallet header | Style HeavenAdminActions |
| `<AmbassadorSection>` | `src/cp/components/cockpit/clients/ambassador-section.tsx` | Section drawer fiche fan | Réutilise `<FanDrawer>` props |
| `<MarketingAmbassadorTab>` | `src/cp/components/cockpit/strategie/marketing-ambassador-tab.tsx` | Configurateur + stats Stratégie | Pattern existing tabs |
| `<ClientsListPage>` | `src/cp/components/cockpit/clients/clients-list-page.tsx` | Page liste contacts (recréée) | `<FanDrawer>` partagé messagerie |
| `<AmbassadorScorerService>` | `src/lib/marketing/ambassador-scorer.ts` | Service IA scoring action | Groq client existing BRIEF-08 |

### Composants existants à étendre

| Composant existant | Extension | Backward-compat |
|---|---|---|
| `<FanDrawer>` (à extraire) | Section "Ambassadeur" optional via prop `showAmbassadorSection` | ✅ default false |
| Agent IA persona | Layer "marketing scorer" additive | ✅ persona Yumi inchangée |
| `<StrategiePanel>` | Nouveau tab "Marketing Ambassadeur" | ✅ autres tabs intacts |
| `<HeaderBar profil>` | Badge wallet conditionnel si fan ambassadeur | ✅ visible seulement si opt-in |

### DB schema (haut niveau)

```sql
-- Préfixe convention : mkt_ pour tables marketing-only

-- 1. Configuration programme par modèle
mkt_ambassador_config (
  model_slug text primary key,
  enabled boolean default false,
  -- catalogue actions (JSON pour flexibilité)
  actions_catalog jsonb,        -- [{action, points, validation_rule}, ...]
  -- catalogue paliers
  paliers_catalog jsonb,        -- [{level, threshold, bonus}, ...]
  -- anti-fraude
  cooldown_hours int default 24,
  cap_total_hours_30d int default 720, -- 30j max
  cascade_max_levels int default 3,
  cascade_decreasing_factor numeric default 0.5,
  ai_auto_validate_threshold numeric default 0.8,
  min_followers int default 30,
  min_posts int default 10,
  updated_at timestamptz default now()
);

-- 2. Compteur points par fan (per modèle)
mkt_ambassador_wallet (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  visitor_handle text,           -- @insta unique identifier
  visitor_fingerprint text,
  model_slug text not null,
  points_total int default 0,
  points_redeemed int default 0,
  points_available int generated always as (points_total - points_redeemed) stored,
  current_palier text,            -- 'decouverte', 'regulier', 'confirme', 'ambassadeur', 'vip_promoter'
  prospects_referred_count int default 0,
  prospects_active_count int default 0,
  cascade_parent_handle text,     -- parrain s'il en a un
  ambassador_code text unique,    -- code unique perso (ex: YUMI-AKA42)
  freeze_until timestamptz,        -- si admin a freeze
  created_at timestamptz default now(),
  last_activity_at timestamptz
);
create index idx_ambassador_handle_model on mkt_ambassador_wallet(visitor_handle, model_slug);
create index idx_ambassador_code on mkt_ambassador_wallet(ambassador_code);

-- 3. Log actions (audit + retry queue)
mkt_ambassador_actions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references mkt_ambassador_wallet(id),
  action_type text,               -- 'story_tag' | 'like_all' | 'follow' | 'comment' | 'save' | 'daily' | 'cascade_lvl1' | 'cascade_lvl2' | 'referral_arrival' | 'referral_active' | 'referral_convert'
  source_ig_id text,               -- story/post/comment ID Insta
  parent_action_id uuid,           -- FK pour cascade
  cascade_level int default 0,
  points_granted int,
  ai_score jsonb,                  -- {confidence, sentiment, spam, bot}
  ai_decision text,                -- 'auto_validate' | 'flag_review' | 'auto_reject'
  status text default 'pending',  -- 'validated' | 'pending' | 'rejected' | 'expired'
  ip_hash text,
  ua_hash text,
  created_at timestamptz default now(),
  validated_at timestamptz
);
create index idx_actions_wallet on mkt_ambassador_actions(wallet_id, status);
create index idx_actions_created on mkt_ambassador_actions(created_at desc);

-- 4. Cascade chains (parent/child tracking)
mkt_ambassador_cascades (
  id uuid primary key default gen_random_uuid(),
  parent_wallet_id uuid references mkt_ambassador_wallet(id),
  child_wallet_id uuid references mkt_ambassador_wallet(id),
  level int not null,             -- 1, 2, 3
  parent_handle text,
  child_handle text,
  points_bonus_granted int,
  validated_at timestamptz default now()
);

-- 5. Bonus attribués (paliers franchis)
mkt_ambassador_rewards_grants (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references mkt_ambassador_wallet(id),
  palier text,                    -- 'decouverte', 'regulier', etc.
  bonus_type text,                -- 'tier_extension' | 'code_grant' | 'fanvue_link' | 'custom_photo'
  bonus_payload jsonb,            -- {tier, days, code_id, link, etc.}
  granted_at timestamptz default now(),
  expires_at timestamptz
);

-- 6. Webhook events log (audit + retry)
mkt_instagram_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,                -- 'mention' | 'comment' | 'tag' | 'media' | 'follower_added'
  payload jsonb,
  processed boolean default false,
  ai_analysis jsonb,
  related_wallet_id uuid,
  error text,
  retry_count int default 0,
  created_at timestamptz default now()
);
```

### API routes nouvelles

| Route | Méthode | Description |
|---|---|---|
| `/api/marketing/ambassador/wallet/init` | POST | Link client + insta handle, génère code |
| `/api/marketing/ambassador/wallet/:handle` | GET | Mon wallet (points, paliers, history) |
| `/api/marketing/ambassador/track-arrival` | POST | Cookie referral arrival logging |
| `/api/marketing/ambassador/redeem` | POST | Convertir points → tier access |
| `/api/marketing/ambassador/webhook/instagram` | POST | Webhook handler IG events |
| `/api/marketing/ambassador/leaderboard` | GET | Top contributors public |
| `/api/marketing/ambassador/stats` | GET | Admin stats (model_slug filter) |
| `/api/marketing/ambassador/admin/review` | POST | Admin valide/rejette action flagged |
| `/api/marketing/ambassador/admin/flagged` | GET | Liste actions suspectes pending |
| `/api/marketing/ambassador/admin/freeze` | POST | Admin freeze un ambassadeur |
| `/api/marketing/ambassador/admin/override-points` | POST | Admin grant +/- points manual |
| `/api/marketing/ambassador/admin/config` | GET/PUT | Configurateur catalogue |

### Config par modèle
- Activable/désactivable par modèle (yumi/ruby/paloma) via `mkt_ambassador_config.enabled`
- Paliers/rewards configurables dans `/agence/strategie` tab Marketing
- Toutes les valeurs (catalogue actions, paliers, cooldowns, AI threshold) éditables sans redéploiement

### Réutilisation existant maximale
- ✅ `/api/codes` (BRIEF-16) → générer codes accès lors des paliers
- ✅ `<StoryGeneratorModal>` → adapter pour template story visiteur
- ✅ Agent IA Groq (BRIEF-08) → extension marketing scorer
- ✅ `<FanDrawer>` (à extraire de messagerie pour partage) → section "Ambassadeur" enrichie
- ✅ Cloudinary upload existant → si stockage stories proofs nécessaire (Phase 1 manuel)
- ✅ Cookie/session management existant → pour tracking referral
- ✅ Tier extension logic existing dans `clients.unlocked_tier_until`

### Modifications NON-disruptives
- ✅ Toutes les nouvelles tables `mkt_*` indépendantes
- ✅ Toutes les nouvelles routes `/api/marketing/*` additives
- ✅ Page Stratégie : nouveau tab dans tableau existant
- ✅ Module Clients : restoration de la page (revert v1.6.15) + drawer enrichi
- ✅ Pas de modification des composants existants sans backward-compat
- ⚠️ Single breaking : `/agence/clients` redirect retiré → revert middleware backcompat
  (déjà géré dans v1.6.15, simple revert chirurgical)

---

## 🤖 Rôle Agent IA

### Mission
L'Agent IA Marketing est un **layer additif** sur la persona Yumi existante (BRIEF-08).
Il assume 5 rôles backstage :
1. **Détection** : webhook IG events + URL `?ref=` arrivals
2. **Quantification** : score chaque action (sentiment, spam, bot, confidence)
3. **Décision** : auto-validate / flag review / auto-reject selon thresholds
4. **Exécution** : grant bonus auto, sync fiche fan, notify
5. **Coaching** : nudges proactifs aux fans (DM via persona Yumi)

### Layers IA mobilisés
- [x] **Persona** (BRIEF-08) — pour DMs coach mode aux fans
- [x] **Marketing scorer** — nouvelle layer pour valider actions
- [x] **Anomaly detector** — nouvelle layer pour fraud/opportunités
- [x] **Coach** — nouvelle layer pour next-best-action proposals
- [x] **Sync CRM** — automatic update fiche fan dans `/agence/clients`

### Inputs IA
- Webhook events Instagram (mentions, comments, follower_added, media_saved, media)
- Cookies / fingerprints / handle visitor
- Historique actions wallet (mkt_ambassador_actions)
- Profil fan (tier actuel, total_spent, last_active)
- Cascade chain context

### Outputs IA (structured JSON)
```json
{
  "action_type": "story_tag",
  "source_ig_id": "story_18398234",
  "wallet_handle": "@aka_lii",
  "score": {
    "confidence": 0.92,
    "sentiment": 0.85,
    "spam_probability": 0.05,
    "bot_probability": 0.10,
    "tags_extracted": ["@amiB", "@amiC"]
  },
  "decision": "auto_validate",
  "points_granted": 20,
  "cascade_potential": [{"handle": "@amiB", "level": 1}, {"handle": "@amiC", "level": 1}],
  "next_best_action": "propose_palier_acceleration",
  "audit_log": {
    "model_used": "groq-llama-3.1-70b",
    "tokens_used": 234,
    "latency_ms": 412
  }
}
```

### Threshold décisionnels (configurables par modèle)

| Décision | Score min | Score max | Effet |
|---|---|---|---|
| Auto-validate | 0.8 | 1.0 | Reward grant immédiat, sync wallet |
| Flag review | 0.5 | 0.8 | Action en attente review admin |
| Auto-reject | 0.0 | 0.5 | Silencieux, pas de notif fan, log audit |

### Coach mode (Phase 2+)
L'IA peut envoyer des DMs proactifs via persona Yumi :
- Fan stagnant 7 jours → "Hey [name] ! Je t'ai pas vu depuis... 💋"
- Fan proche palier → "Plus que 2 amis pour débloquer ton mois Gold !"
- Opportunité cascade → "Ton ami @amiB a aimé ton story, il pourrait être intéressé..."

Tone-matching : reprend le tone-of-voice persona Yumi pour cohérence.

---

## 📊 KPIs & Mesures

### Indicateurs de succès

| KPI | Cible 30j | Cible 90j | Mesure |
|---|---|---|---|
| Ambassadeurs actifs | 10 | 50 | DISTINCT wallet WHERE points_total > 0 |
| Prospects ramenés | 30 | 200 | COUNT actions WHERE type = 'referral_arrival' |
| Conversions (active 7j) | 15 | 100 | COUNT WHERE referral_active confirmed |
| Coefficient viral (R0) | 0.3 | 0.7 | prospects_total / ambassadeurs_actifs |
| Taux franchissement palier 🌱 | 40% | 60% | wallets_palier1 / wallets_total |
| Taux franchissement palier 🌿 | 15% | 25% | wallets_palier2 / wallets_total |
| Taux franchissement palier 🌳 | 5% | 10% | wallets_palier3 / wallets_total |
| Cascade chains actives | 3 | 15 | DISTINCT cascades |
| Coût acquisition (€ équivalent bonus) | < 5€ | < 7€ | total_bonus_value / new_clients |
| Fraud rate flagged | < 5% | < 3% | flagged_actions / total_actions |

### Dashboard admin (`/agence/strategie` tab Marketing)
- **Stats live cards** : actions / heures / conversions / cascades / fraud rate
- **Top contributors leaderboard** : top 10 ambassadeurs (points, prospects, palier)
- **Anomaly log** : actions flagged en attente review
- **Configurateur** : catalogue actions ↔ points + catalogue paliers ↔ bonus
- **Toggle programme** : on/off par modèle
- **Trend graph** : evolution 30j/90j

### Reporting
- **Hebdomadaire** : email NB tous les lundis avec :
  - Stats clés semaine
  - Top 5 ambassadeurs
  - Anomalies détectées
  - Suggestions ajustements IA
- **Mensuel** : analyse approfondie + propositions ajustements seuils
- **Trimestriel** : revue ROI + décision continuation/scale

---

## 🗓️ Phases déploiement

### Phase 1 — MVP Foundation (5 jours dev)
**Scope minimal** pour valider l'hypothèse sans IG webhook complexe.

Livrables :
- DB migrations (6 tables `mkt_*`)
- API CRUD wallet + actions + redemptions
- Module Clients page liste (recréée) + drawer enrichi avec section Ambassadeur
- Page Stratégie tab Marketing avec configurateur basique
- Frontend visiteur : badge + widget actions + redemption manuelle
- Manual review admin (validation manuelle des actions, pas de webhook IG)

Critère de succès :
- 5 fans test enregistrés en wallet
- 3 prospects amenés via code parrainage
- 1 palier franchi avec bonus auto-attribué
- 0 erreur tsc / build prod OK

### Phase 2 — Instagram Webhook + AI (4 jours dev)
**Si MVP validé**, ajout automatisation IA.

Livrables :
- Setup Instagram Graph API (Yumi business account)
- Webhook handler `/api/marketing/ambassador/webhook/instagram`
- Layer IA marketing scorer (Groq)
- Auto-validation flow (score >0.8)
- Anomaly detection layer
- Sync wallet → fiche client temps réel

Critère de succès :
- Story tag IG détectée et validée auto en < 30s
- AI score moyen >0.85 sur 50 actions
- Fraud detection bloque 95% des tentatives bot

### Phase 3 — Cascade & Gamification (3 jours dev)
**Si Phase 2 validée**, ajout viralité poussée.

Livrables :
- Cascade tagging tracking (parent/enfants)
- Reward decreasing logic (100% / 50% / 25%)
- Quest journalières (5 missions chaînées)
- Streak daily check-in
- Leaderboard public sur `/m/yumi`

Critère de succès :
- 3 cascades chains actives détectées
- 10 fans en streak >= 7 jours
- Coefficient viral R0 >= 0.4

### Phase 4 — Polish & Anti-fraude renforcé (3 jours dev)
**Production-ready**.

Livrables :
- Cron daily expiry submissions/grants
- Auto-revoke si comportement post-reward suspect
- Admin freeze + override
- Telegram notifs nouvelles submissions
- Captcha Cloudflare Turnstile (option)
- Tests E2E Playwright

Critère de succès :
- Fraud rate < 3%
- 0 incident sécurité 30j post-launch
- Couverture tests E2E 80%+

### Phase 5 — Long-terme (optionnel)
- Auto-validation Instagram API plus poussée (computer vision pour validation story)
- Integration Fanvue parrainage (si API/programme dispo)
- Multi-langue (FR/EN/ES)
- A/B testing seuils thresholds dynamiques
- Marketplace interne rewards (échange points contre rewards custom)
- Discord intégration (top ambassadeurs serveur privé)

**Total estimation MVP→Phase 4** : 15 jours dev (≈ 3 semaines avec 1 dev). 
**MVP shippable rapide** : Phase 1 = 5 jours.

---

## ❓ Décisions stratégiques (ADRs)

| ADR | Décision à prendre | Options | Recommandation | Statut |
|---|---|---|---|---|
| ADR-AMB-01 | Code parrainage format | `?ref=aka_lii` (handle) / `YUMI-AKA42` (court) | Court (mémorisable, plus stylé) | ⏳ pending |
| ADR-AMB-02 | Bonus prospect default | 7j Silver / 24h Gold / 1 mois Silver | 7j Silver (équilibre) | ⏳ pending |
| ADR-AMB-03 | Cascade max levels | 1 (simple) / 3 (recommandé) / 5 (max viral) | 3 (légal-friendly) | ⏳ pending |
| ADR-AMB-04 | Cap total gratuit / fan | 7j / 30j / illimité | 30j sur 90j roulants | ⏳ pending |
| ADR-AMB-05 | AI auto-validate threshold | 0.7 / 0.8 / 0.9 | 0.8 (conservateur) | ⏳ pending |
| ADR-AMB-06 | Min Insta floor | 10 followers / 30 followers / 100 followers | 30 followers + 10 posts + 30j age | ⏳ pending |
| ADR-AMB-07 | Programme actif | Global yumi+ruby+paloma / Opt-in par modèle | Opt-in (default OFF) | ⏳ pending |
| ADR-AMB-08 | Points visibles fan | Visible (gamification) / Invisible (IA only) | Invisible (selon NB 2026-04-26) | ✅ acté |
| ADR-AMB-09 | Webhook IG en MVP | Phase 1 / Phase 2 | Phase 2 (MVP manuel d'abord) | ⏳ pending |
| ADR-AMB-10 | Fanvue lien parrainage | Faisable / Non / À explorer | À explorer (Fanvue API ?) | ⏳ pending |

### Décisions opérationnelles (peuvent attendre)
- [ ] Yumi a-t-elle Insta Business Account activable ? (requis Phase 2)
- [ ] Fanvue a-t-il programme parrainage exploitable ? (requis Phase 3)
- [ ] Budget consultation juridique BE pour validation cascade (~500€) ?
- [ ] Compte Cloudinary supplémentaire pour proofs uploads ?
- [ ] Telegram bot setup pour notifs admin ?

---

## 📝 Brainstorming notes

### Idées additionnelles non retenues V1 (pour mémoire)
- **Ramène la passe** : 2 amis arrivent ensemble (même IP/cookie+) → bonus double
- **"Tag the spirit"** : Yumi pose question dans story → fans répondent/taggent → IA scoring meilleurs
- **Coffre journalier** : daily check-in tire au sort un bonus aléatoire (gamification stronger)
- **Battle royale ambassadeurs** : compétition mensuelle avec gros prize
- **Match-making fan-fan** : fan A présente fan B (introduction explicite) → bonus
- **Heaven Tokens crypto-style** : système de points avec marketplace interne (over-engineering pour MVP)

### Variantes à explorer plus tard
- **Insider tier** : top 10 ambassadeurs accès Discord privé / stories privées avant tous
- **"Save the queen" challenges collectifs** : Yumi annonce objectif communauté → fans se mobilisent
- **Concours mensuel Top Ambassadeur** : top 3 reward IRL ou lifetime
- **Wall of fame public** : page leaderboard sur `/m/yumi` (peut être ON/OFF par modèle)

### Questions ouvertes
- L'IA peut-elle auto-générer la story image pour le fan (Canvas API + photo Yumi + handle) ?
  → Faisable, à intégrer si Phase 2 confirme bon engagement.
- Faut-il limiter le programme aux fans payants (anti-spam) ou ouvert aux visiteurs ?
  → Ouvert aux visiteurs (R0 plus élevé) avec floor anti-bot (Insta min activité).
- Notifications fan via quel canal en priorité ?
  → Web push + email + DM IG (si fan en interaction). Telegram si NB y est.
- Système de "level-up" plus visuel (animations, confetti) pour cohérence gamification ?
  → Phase 3 polish, Framer Motion + canvas-confetti.

---

## 🔗 Références

- Plans liés : `plans/marketing/README.md` (index)
- Modules tech impactés :
  - `plans/modules/ai-conversational-agent/` (extension persona)
  - `plans/modules/profil-public/` (composants visiteur)
  - `plans/modules/messagerie-contacts/` (drawer fiche partagé)
  - `plans/modules/dashboard/` (Stratégie + Clients)
- Briefs PMO : `plans/PMO/briefs/BRIEF-2026-04-26-28-ambassador-program-multilevel.md` (à créer après GO)
- ADRs cross-cutting : `plans/DECISIONS.md`
- Standard immuable : `plans/STANDARD-SUIVI-PROJET.md`

---

## 📅 Changelog du plan

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-04-27 | 0.1 | Création initiale (brainstorm formalisé selon TEMPLATE) | NB |
| 2026-04-27 | 0.1 | Brainstorm itératif avec NB : pivot points invisibles, focus cascade simple, intégration page Stratégie + Module Clients + Agent IA marketing | NB |

# HEAVEN — Masterplan Stratégique 2026-2027

> **Document maître confidentiel — Agent G — Audit multi-agent SQWENSY**
> **Dernière mise à jour** : 18 avril 2026
> **Statut** : silo confidentiel, ne JAMAIS référencer depuis sqwensy-os public
> **Classification** : L3 CONFIDENTIEL (finances + collaboratrices humaines)
> **Scope** : profil IA YUMI + profil NB Fanvue (collaboratrices humaines PALOMA + RUBY)
> **Horizon** : Q2 2026 → Q4 2027 (7 phases trimestrielles)

---

## TL;DR exécutif

**Où on en est (18 avril 2026)** : Plateforme heaven-os.vercel.app déployée (v0.5.0 Turborepo + JWT + Instagram Agent module prêt mais en attente credentials Meta). Profil IA YUMI a 5 000 followers actifs sur @yumiiiclub et un profil Fanvue actif. Profil NB Fanvue à configurer (collaboration PALOMA signature imminente, cf. `./PALOMA-COLLABORATION.md`). Stack IA content 0€ dépensés (tout encore à abonner). Module IA social-manager cross-CP à implémenter dans Heaven (spécialisation conversationnelle par modèle).

**Où on va** : ligne d'eau propre sur 21 mois avec 2 hubs Fanvue complémentaires (profil YUMI pur IA + profil NB avec PALOMA/RUBY humaines), croissance Instagram YUMI 5k → 100k, module IA chat personnalisé qui passe de manual-review en Q2 à full-auto en Q1 2027. Objectif MRR consolidé Heaven Q4 2027 : **$13 000/mois** ($8k YUMI + $5k NB profil). ROI net après coûts fixes et % collaboratrices : **~$10k/mois** = **~$120k/an**.

**Pari central** : **YUMI devient une référence AI influenceuse mode/lifestyle EU classy** (vs Aitana Lopez style fitness, Lil Miquela style lifestyle, Imma style mode) sur la niche défendable **"IA élégante + premium + contrasté"**. Le profil NB Fanvue sert de hub humain complémentaire — cross-promotion avec YUMI pour maximiser la LTV par fan.

**Risques critiques gated** : (1) AI Act EU 2 août 2026 impose disclosure AI-generated — préparer label "AI-generated" dans bio YUMI dès Q3. (2) Instagram ban compte IA → 2 comptes backup + diversification TikTok/X avant Q3. (3) Paloma cadre ONEM → Option A activité accessoire (cf. `./PALOMA-COLLABORATION.md`).

**Stack IA content budgété** : 60€/mois Q2 → 160€/mois Q4 → 380€/mois Q4 2027. Paie par carte Wise virtuelle dédiée "Heaven" (cf. MEMORY `project_wise_unique_account.md`).

**Confidentialité absolue** : Heaven ne doit JAMAIS être associé publiquement à SQWENSY. Ce doc vit en silo dans `clients/heaven/plans/`. Aucun vrai prénom dans code/doc/DB/commits. IDs internes uniquement : `yumi`, `ruby`, `paloma`.

---

## 1. Vision stratégique 2026-2027

### 1.1 Positionnement marché creator-fan economy 2026

Le marché creator-fan a 4 grandes plateformes en 2026 :

| Plateforme | Positionnement | Commission | Payout |
|------------|----------------|------------|--------|
| OnlyFans | Mass market, majorité hard | 20% | Virement/Paxum/Wire |
| **Fanvue** | **Premium / AI-friendly / mainstream** | **15% intro 30j → 20%** | **Bank transfer / MassPay / crypto, min $20** |
| Fansly | Alternative OF, plus safe | 20% | Virement |
| Passes | Nouveau mainstream | 20% | Virement |

**Pourquoi Fanvue pour Heaven** :
- La plus **AI-friendly** (accepte les modèles IA déclarés — crucial pour YUMI)
- Positionnement **mainstream/premium** (vs OF perçue plus hard/stigmatisée)
- Intro 85/15 premiers 30j = boost launch
- Payout bank transfer compatible directement avec **Wise Business**
- Minimum payout $20 seulement = cashflow rapide
- Pricing libre $3.99-$100 (vs OF $4.99-$49.99)

### 1.2 Niche défendable Heaven

Heaven ne joue **pas sur le volume** (100 modèles). Heaven joue sur la **qualité curation + premium + dualité IA/humaine** :

- **YUMI = AI influenceuse premium mode/lifestyle** style Aitana Lopez **mais classy pure** (pas fitness racoleur, pas hard explicite sur Insta, seulement classe + sublime + émotions joie)
- **Profil NB Fanvue** (hub collaboratrices humaines PALOMA, potentiellement RUBY) = contenu hard premium quand la clientèle veut du 100% humain
- **Cross-promotion** entre les 2 hubs = maximise LTV fan (un fan qui aime YUMI peut explorer le profil NB via teaser, et inversement)

### 1.3 Différenciation vs concurrents AI

| Acteur | Positionnement | Revenue mensuel | Gap Heaven |
|--------|----------------|------------------|------------|
| Aitana Lopez (@fit_aitana) | AI fitness model, brand deals + Fanvue | ~€10k/mois | Heaven = lifestyle/mode, classy, duo IA+humaines |
| Lil Miquela | AI character brand | brand deals | Heaven = monétisation directe Fanvue |
| Imma | AI fashion JP | brand deals | Heaven = EU + dual hub + Fanvue conversion |
| Rozy | AI Korean model | brand deals | Heaven = EU creator-fan direct |
| Noonoouri | AI digital art | brand deals luxe | Heaven = accessibility fans normaux |
| Creator moyen OF | Humaine mass | $200-500 | Heaven = AI + humaines premium |

**Avantage défendable** :
1. Dualité IA + humaine sous même parent = offre unique
2. Module IA chat personnalisé Sonnet 4.6 + cache = scalable vs chat manuel 24/7
3. Stack tech custom (Heaven OS) = indépendance si Fanvue pivot
4. Discrétion totale (aucune association SQWENSY publique)

### 1.4 Pari long terme 2027+

**Scénario bull** : YUMI 100k Insta Q4 2027, référence IA influenceuse EU. Heaven $13k MRR. Décision fin 2027 : SRL Heaven séparée ou continuation branche Agence ? Si SRL : ouvrir SaaS Heaven externe à d'autres créateurs ($200-500/mois licence).

**Scénario nominal** : YUMI 50k Insta, $5k MRR Fanvue, profil NB $3k MRR. ROI $60k/an. Rester branche Agence silo.

**Scénario stress** : Instagram ban YUMI, AI Act non respecté → pivot profil NB humain pur, YUMI backup TikTok + X.

---

## 2. Stratégie acquisition / croissance YUMI Instagram → Fanvue

### 2.1 Base de départ

- @yumiiiclub : 5 000 followers actifs acquis
- Fanvue YUMI : profil créé, MRR ~$0
- TikTok : pas encore créé
- X (Twitter) : pas encore créé

### 2.2 Objectifs croissance

| Horizon | Insta | TikTok | X | Fanvue MRR YUMI |
|---------|-------|--------|---|-----------------|
| Q2 2026 (juin) | 5k → 8k | 0 → 2k | 0 → 500 | $200-400 |
| Q3 2026 (sept) | 8k → 15k | 2k → 10k | 500 → 2k | $500-800 |
| Q4 2026 (déc) | 15k → 30k | 10k → 25k | 2k → 5k | $1500 (BF boost) |
| Q1 2027 (mars) | 30k → 60k | 25k → 60k | 5k → 15k | $2500 (St-Val boost) |
| Q2 2027 (juin) | 60k → 100k | 60k → 120k | 15k → 30k | $4500 |
| Q4 2027 (déc) | 100k stable | 120k → 200k | 30k → 50k | $8000 |

### 2.3 Stratégie contenu Instagram → TikTok cross-post

**Principe** : 1 reel produit = 1 post Insta + 1 post TikTok + 1 post X (shortened). Amortissement coût × 3.

**Cadence hebdo YUMI** :
- 3 posts Insta (2 photos + 1 reel) — taggés #AI #AIinfluencer dès août 2026
- 5 stories Insta (BTS, polls, Q&A)
- 2 reels TikTok (1 viral trend + 1 lifestyle)
- 1 post X (photo + caption)
- 1 broadcast channel Insta (5k members) — teasers Fanvue 2x/sem

**Angles viraux** : trends audio TikTok sexy-classy, transitions outfit POV, BTS studio simulé IA, voice-off ElevenLabs Q&A, collab fictive brand names.

### 2.4 Funnel conversion Insta → Fanvue

1. Awareness : Reel viral TikTok → redirige Insta via bio
2. Engagement : Broadcast channel + stories teasers avec pixel clics bio
3. Gate identité (page `/m/yumi` Heaven) : visiteur entre pseudo → devient lead `agence_clients`
4. Lead nurturing : 3-5 messages `agence_messages` IA chat → propose abonnement Fanvue
5. Conversion : clique lien Fanvue → souscrit ($14.99 tier standard YUMI)
6. Retention : IA social-manager maintient conversation, push PPV custom ($5-50/pièce)

### 2.5 KPIs mensuels (DB `model_revenue_tracking`)

| KPI | Cible Q3 2026 | Cible Q4 2026 | Cible Q1 2027 |
|-----|---------------|---------------|---------------|
| Followers Insta (net new) | +2500/mois | +5000/mois | +10000/mois |
| Taux engagement Insta | >5% | >4% | >3% |
| Vues reels TikTok | 50k/reel | 150k/reel | 400k/reel |
| Clics bio Insta | 800/mois | 2000/mois | 5000/mois |
| Conversions Fanvue (nouveaux abos) | 20/mois | 50/mois | 120/mois |
| MRR Fanvue YUMI | $500 | $1500 | $2500 |
| Taux rétention Fanvue M3 | >40% | >50% | >55% |
| Spend outils IA | $72 | $161 | $261 |
| ROI net | >$300 | >$1200 | >$2100 |

---

## 3. Stratégie contenu YUMI (modèle IA générée)

### 3.1 Stack outils IA 2026 (prix vérifiés WebSearch)

| Catégorie | Outil choisi | Prix/mois | Usage YUMI | Alternatives de secours |
|-----------|--------------|-----------|-------------|-------------------------|
| Photos HD réalistes | Midjourney Standard | $30 (15h fast GPU + unlimited relax) | 3 photos Insta/sem + 10 Fanvue/mois | Flux (open LoRA), Stable Diffusion XL |
| Cohérence personnage | Midjourney V7 Omni Reference | inclus $30 | Préserve visage YUMI (drift scène 3+) | Flux + LoRA custom (formation $100-200 one-shot) |
| Avatars parlants | HeyGen Avatar IV Creator | $29 (200 crédits = 10 min/mois) | Voice-over reels, lip-sync | Hedra, Sync Labs |
| Vidéos courtes reels | Runway Gen-4 Standard | $35-95 selon usage | 2 reels/sem 5-10s | Sora (quand accessible), Pika, Luma |
| Voix synthétique YUMI | ElevenLabs Creator | $22 (voice clone inclus) | Voice-over reels, messages vocaux | HeyGen voice inclus, OpenAI Voice |
| Musique fond | Suno Pro | $10 | BGM reels (commercial use) | Udio, AIVA |
| Lip-sync vidéo | HeyGen Avatar IV (inclus) | (inclus $29) | YUMI parle en vidéo | Sync Labs, Pika Lipsync |
| Édition vidéo | CapCut Pro | $10 | Montage final reels manuel | Descript, Premiere Rush |
| Trends watching | SCOUT agent (Haiku 4.5 OpenRouter) | ~$5/mois | Veille TikTok/Insta | - |

**Budget stack Q2 2026 (starter)** : Midjourney $30 + ElevenLabs $22 + Suno $10 = **$62/mois (~58€)**

**Budget stack Q4 2026 (scaling)** : + HeyGen Creator $29 + Runway Standard $35 + CapCut $10 = **$166/mois (~155€)**

**Budget stack Q4 2027 (pleine)** : HeyGen Pro $99 + Midjourney Pro $60 + Runway Unlimited $95 + ElevenLabs Pro $99 + Suno $10 + CapCut Business $15 = **$378/mois (~350€)**

### 3.2 Workflow contenu unifié

```
[1. Ideation SCOUT] n8n scanne trends TikTok/Insta → brief "5 angles viraux sexy-classy"
[2. Prompt gen Claude Sonnet] NB édite → 3 variantes prompt Midjourney + script voice-over ($0.05/batch)
[3. Photos Midjourney] Run prompts 10-15 min → sélection 3-5 → upscale (compris abo)
[4. Vidéo Runway si reel] Photo → prompt motion → Gen-4 5-10s ($2-5/clip)
[5. Voice-over ElevenLabs] Script → voice YUMI → mp3 ($0.10/clip)
[6. Musique Suno] Brief mood → 2 pistes 30s → choix (compris abo)
[7. Lip-sync HeyGen si parle] Photo + audio → Avatar IV ~$3/vidéo
[8. Édition CapCut] Montage 15-30 min → export 9:16 1080p
[9. Publication n8n multi-platform] Insta + TikTok + X simultané via Meta/TikTok API
[10. Tracking perf] 24h après: n8n fetch insights → model_content_performance → HQ dashboard
```

**Temps NB par reel** : ~2h (vs 6-8h tournage humain).
**Output hebdo** : 2 reels TikTok + 1 Insta + 3 photos = viable ~6-8h/sem production.

### 3.3 Cohérence identité visuelle YUMI

**Problème** : Midjourney V7 character drift scène 3+.

- **Solution A (Q2, budget bas)** : Omni Reference avec image master YUMI — tolérer drift léger.
- **Solution B (Q3 scaling)** : LoRA custom Flux one-shot $100-200, freeze visage 100%, nécessite ~20 photos master.
- **Solution C (Q4-Q1 2027 premium)** : HeyGen Avatar IV custom avatar — cohérence 99% + voice + lip-sync intégré.

**Décision Q2** : démarrer A, mesurer drift sur 30 reels. Si > 30% feedback négatif → passer B Q3.

### 3.4 Trends watching automatisé

Agent **SCOUT** scanne quotidiennement : TikTok trending sounds (top 100), Reels tendances explore, X hashtags creator economy, Reddit r/AIinfluencer / r/creatoreconomy. Filtre sexy-classy (pas raunchy/fitness/gaming). Propose 5 angles/sem à NB dans Notion via n8n.

### 3.5 Calendrier éditorial YUMI (template hebdo)

| Jour | Insta feed | Insta stories | TikTok | X | Fanvue |
|------|------------|---------------|--------|---|--------|
| Lun | Photo mode | Teaser theme | Reel viral trend | - | - |
| Mar | - | Poll / Q&A | - | Photo | Gallery update 2 pics |
| Mer | Photo lifestyle | BTS story | Reel lifestyle | - | - |
| Jeu | - | Throwback | - | - | Voice msg tier fans |
| Ven | Reel Insta | Broadcast push | - | Reel cross | PPV drop teaser |
| Sam | - | Weekend vibe | Reel trend | Caption engageant | Custom request window |
| Dim | Photo premium | Sunday mood | - | - | Thank you msg tier |

Cadence = 3 Insta + 2 TikTok + 1 X + 4 Fanvue/sem.

---

## 4. Stratégie monétisation Fanvue (YUMI + profil NB)

### 4.1 Pricing tiers

**Profil YUMI Fanvue** :
- Subscription standard : **$14.99/mois** (positionnement premium AI)
- Subscription bundle 3 mois : $39.99 (discount 10%)
- PPV : Photo set premium 10 photos $9.99 / Vidéo 30s $14.99 / Voice msg ElevenLabs $4.99 / Mini-vidéo lip-sync HeyGen custom $29.99
- Tips libres (messages templatés)
- Custom requests : $49-199 (négociés via module IA chat)

**Profil NB Fanvue** (hub collaboratrices humaines) :
- Subscription standard : **$19.99/mois** (positionnement hard premium)
- PPV : Photo set hard 10 pics $14.99 / Vidéo 60-120s $24.99-49.99 / Custom bespoke > 3 min $99-499
- Cross-promotion YUMI : teaser 1 story/mois ("my AI bestie")

### 4.2 Projections MRR consolidées

| Trimestre | YUMI MRR | NB profil MRR | Total brut | Commission Fanvue (20%) | % PALOMA (30-40% NB) | Stack IA | Net Heaven |
|-----------|----------|----------------|------------|--------------------------|------------------------|-----------|-------------|
| Q2 2026 | $300 | $200 | $500 | $100 | $60 | $72 | $268 |
| Q3 2026 | $600 | $400 | $1000 | $200 | $120 | $151 | $529 |
| Q4 2026 (BF) | $1800 | $1000 | $2800 | $560 | $300 | $161 | $1779 |
| Q1 2027 | $2500 | $1500 | $4000 | $800 | $450 | $261 | $2489 |
| Q2 2027 | $4500 | $3000 | $7500 | $1500 | $900 | $428 | $4672 |
| Q3 2027 | $6500 | $4000 | $10500 | $2100 | $1200 | $450 | $6750 |
| Q4 2027 | $8000 | $5000 | $13000 | $2600 | $1500 | $458 | $8442 |

**ROI cumulé 2026-2027** : ~$80k net après coûts et commissions.

### 4.3 Cross-promotion YUMI ↔ NB profil

- Story YUMI Fanvue : "check my IRL friend" → lien NB profil
- Story NB Fanvue : "my AI bestie dropped a new set" → lien YUMI
- KPI : **10-15% conversion** cross promotion sur 3 mois = abonnés bonus sans coût acquisition.

### 4.4 Réinvestissement

**Règle** : **20% revenus net Heaven** → réinvestissement automatique via carte Wise virtuelle "Heaven" :
- 10% upgrade outils IA + tests nouveaux (Flux LoRA, Sora)
- 5% Meta Ads boost posts YUMI (Q3 2026+)
- 5% bonus PALOMA si NB profil > cible ($2k MRR → bonus +$200/mois)

**80% restants** : 60% cashflow opérationnel NB + 20% épargne runway.

---

## 5. Module IA Social-Manager personnalisé par modèle

### 5.1 Architecture cross-CP

Module IA = **même infra cross-CP** (JPS BEACON, OPearly BEACON, Heaven IA chat), **contexte/system prompt différent par CP**. Base déjà livrée v0.4.0 Heaven (Instagram Agent OpenRouter + dashboard split-pane). Ce masterplan définit le **contexte IA personnalisé par modèle**.

### 5.2 Données collectées (onboarding 30 min par modèle)

```
Section 1 — Persona
- Background story (5-10 lignes)
- Âge fictif (YUMI : 24-26)
- Origine/culture (YUMI : EU multiculturelle)
- Intérêts (mode, voyage, art, musique)
- Valeurs (créativité, authenticity, liberté)
- Traits (confident, playful, introspective)

Section 2 — Style écriture
- Vocabulaire preferred (20 mots signature)
- Emojis preferred (top 10)
- Longueur messages (short/medium/long)
- Ton (cheeky, sensual, warm, professional)
- Language mix (EN primary, FR secondary, ES touches?)

Section 3 — Sujets
- Safe topics (20 : mode, musique, voyage, love, fitness)
- Grey topics (10 : politics, religion, ex)
- RED lines (15 : mineurs, vulgarité extrême, drogue, violence)

Section 4 — Pricing / Commerce
- PPV teasers
- Custom requests (négociation, range)
- Tips (thanks sans mendier)

Section 5 — Few-shot (10 conversations validées + 10 messages "parfaits")
```

Stocké dans `model_chat_persona` (versionné).

### 5.3 Architecture technique

- **Modèle** : Claude Sonnet 4.6 via OpenRouter (pas Opus trop cher, pas Haiku trop court)
- **Prompt caching** Anthropic : long system prompt (~8k tokens) cached = **input -90%** ($0.30/1M vs $3/1M sans cache)
- **Memory** : table `model_chat_memory` par fan (context_summary regen tous les 20 msg + last_n_messages + fan_profile déduit)

À chaque message : fetch memory + load persona active + build prompt (cached system + few-shot + summary + last_n + new msg) → Sonnet 4.6 call → validation → envoi → update memory.

### 5.4 Coût IA estimé

Par modèle, 1000 messages/mois :
- Input cached : 1000 × 8k × $0.30/1M = $2.4
- Input new : 1000 × 500 × $3/1M = $1.5
- Output : 1000 × 150 × $15/1M = $2.25
- **= ~$6-8/mois par modèle** (vs estimation initiale $15-30, réalité plus safe)

Scaling 5000 messages/mois YUMI Q1 2027 : ~$30-40/mois.

### 5.5 Workflow 3 phases

**Phase 1 — Manual review (Q2-Q3 2026)** : fan DM → webhook → IA draft → dashboard CP → NB edit/approve/reject en 1 clic → envoi. Temps humain ~3-10 sec/msg vs 60 sec écriture from scratch = **gain 80-90%**.

**Phase 2 — Semi-auto (Q4 2026-Q1 2027)** : messages faible risque (small talk, tips thanks) auto-direct ; haut risque (négo PPV, custom, confession) garde review ; safety filter auto-bloque.

**Phase 3 — Full auto (Q2 2027+)** : 95% auto ; NB review weekly batch 15 min/sem 20 samples aléatoires ; kill switch 1 clic toujours dispo.

### 5.6 Sécurité & safety

- **Safety filter pré-envoi** : regex RED lines + LLM guardrail Haiku 4.5 ($0.01/check) = "cette réponse est-elle safe ?" → oui/non
- **Audit log** table `model_chat_audit_log` : persona_version, ai_model, tokens, latency, safety_passed, was_edited, final_message
- **Kill switch** bouton dashboard CP set `agent_enabled=false` 1 clic → tous messages manuel immédiat
- **RBAC** : `admin` NB voit tout/modifie persona ; `model` voit sa chat history, ne peut pas modifier persona (Phase 2)

### 5.7 Formation itérative par la modèle

- **S1-S2 onboarding** : modèle remplit questionnaire + NB construit system prompt v1 + 10 few-shot → Phase 1 déploy
- **S3-S8 itération** : chaque semaine export training dataset + NB fine-tune prompt + version bump
- **S9+ trust validation** : audit hebdo 4 sem, agreement rate > 80% → bascule Phase 2 ; re-audit mensuel 3 mois → Phase 3 full auto

---

## 6. Roadmap chronologique Heaven 2026-2027

### 6.1 Q2 2026 (avril-juin) — Validation

**Gate** : YUMI Fanvue $300-500 MRR + module IA Phase 1 live + NB profil Fanvue créé + PALOMA signée

- S1 avril : Setup Wise Business + carte virtuelle "Heaven"
- S2 avril : Abonner stack starter (Midjourney + ElevenLabs + Suno = $62/mois)
- S3-S4 avril : Activer Instagram Agent YUMI (credentials Meta en attente)
- S1-S2 mai : Créer profil Fanvue NB + KYC (intro 85/15 30j)
- S2 mai : Signer PALOMA + déclaration ONEM Option A
- S3 mai : Premier batch contenu YUMI (10 photos MJ + 2 reels Runway + voice test ElevenLabs)
- S4 mai : Module IA chat YUMI Phase 1 déployé (system prompt v1 + 10 few-shot)
- S1 juin : Première campagne PPV YUMI Fanvue
- S2 juin : Compte TikTok YUMI créé + 4 reels cross-postés
- S3 juin : Premier contenu PALOMA → profil NB Fanvue
- S4 juin : Review Q2 gate

**KPIs** : YUMI Insta 5k→8k / MRR YUMI ≥$300 / agreement Phase 1 80% / NB $200 / PALOMA 1 mois livré / stack ≤$70

### 6.2 Q3 2026 (juil-sept) — Acquisition

**Gate** : MRR $1000+ + 15k Insta YUMI + **AI Act label dès août**

- S1 juil : Upgrade stack (+HeyGen $29 +Runway $35 = total $130)
- S2 juil : LoRA custom Flux one-shot $100-200 si drift >30%
- S3 juil : Cadence hebdo doublée (4 reels TikTok + 3 reels Insta)
- S4 juil : Agent SCOUT trends watching n8n + 5 angles/sem
- **S1 août : AI Act EU compliance — label AI-generated bio + tag #AI #Virtual #AIModel tous posts**
- S2 août : Module IA Phase 2 semi-auto (80% agreement validé)
- S3 août : "Summer special" Fanvue -30% 1 semaine
- S4 août : Compte X YUMI + 4 tweets/sem
- S1 sept : Clarification statut RUBY + plan si humaine
- S2 sept : Custom requests premium $49-199 via IA chat
- S3 sept : Review Q3 gate

**KPIs** : YUMI Insta 8k→15k / TikTok 0→10k / MRR YUMI $500-800 / NB $400 / Total $1000 / Phase 2 actif / 100% posts labeled

### 6.3 Q4 2026 (oct-déc) — Stabilisation

**Gate** : MRR $2800 + 30k Insta YUMI + IA 80% auto

- S1 oct : Halloween YUMI (5 reels costumes + PPV set)
- S2 oct : Instagram Ads boost $100/mois test sur 3 meilleurs reels
- S3 oct : Audit annuel persona + refresh system prompt v2
- S1 nov : Préparation Black Friday
- **S4 nov : Black Friday week — -50% subscription Fanvue YUMI + NB (campaign IG + TikTok + X)**
- S1-S2 déc : Noël (festif + custom requests special)
- S3 déc : Décision RUBY onboarding ou canceled
- S4 déc : Bilan 2026 + review stack annuel

**KPIs** : YUMI Insta 15k→30k / MRR YUMI $1500 / NB $1000 / Total $2800 / Phase 2 80% auto / ROI ~$2000/mois

### 6.4 Q1 2027 (jan-mars) — Scaling

**Gate** : MRR $4000 + 60k Insta YUMI + module IA full-auto

- S1 jan : Reset Nouvel An stories, push acquisition
- S2 jan : Upgrade Midjourney Pro $60
- S3 jan : Tester Sora (si accessible) ou Runway Unlimited $95
- S1 fév : Préparation St-Valentin
- **S2 fév : Saint-Valentin — "love sessions" premium PPV + custom boost**
- S3 fév : Module IA Phase 3 full auto validé
- S1 mars : Contenu vidéo premium 60-120s Sora/Runway
- S2 mars : RUBY onboarding si humaine
- S3 mars : Review Q1 gate

**KPIs** : YUMI Insta 30k→60k / MRR $2500 / NB $1500 / Total $4000 / Phase 3 full auto / stack ~$250/mois

### 6.5 Q2 2027 (avr-juin) — Expansion

**Gate** : MRR $7500 + 100k Insta YUMI + 4ème modèle considéré

- Été pic juin-août (6 reels/sem sexy beach YUMI)
- Collab fictive brand AI-friendly ($1000-3000 one-shot)
- Décision SRL Heaven séparée vs continuation Agence (selon MRR >$8k soutenu)
- Considérer 4ème modèle (IA ou humaine via PALOMA réseau)
- Stack Pro suite : HeyGen Pro $99 + full Pro

**KPIs** : YUMI Insta 60k→100k / MRR YUMI $4500 / NB $3000 / Total $7500

### 6.6 Q3-Q4 2027 — Maturité + décision

**Gate** : MRR $10-13k + décision stratégique 2028

- Automatisation maximum (NB < 10h/sem Heaven)
- Considération SaaS Heaven externe ($200-500/mois licence autres créateurs)
- Bilan ROI 2026-2027
- Décision 2028 : continuation, SRL, pivot, vente

**KPIs Q4 2027** : YUMI 100k stable / MRR YUMI $8000 / NB $5000 / Total $13000 (~$156k/an) / ROI net ~$10k/mois = ~$120k/an

---

## 7. Calendrier dates clés Heaven 2026-2027

**Note** : Heaven ignore Ramadan/Eid (scope OPearly Dubai).

### 2026

| Date | Événement | Action Heaven | Budget |
|------|-----------|----------------|--------|
| 1er avril | Poisson d'avril | Story funny YUMI (test virality) | 0 |
| Pâques 5 avril | Reset printemps | Contenu mode lifestyle | 0 |
| 1er mai | Fête travail | Pause 1 jour | 0 |
| Juin-août | Été | Peak beach/maillot YUMI | 0 |
| **2 août** | **AI Act EU enforcement** | **Label AI-generated + #AI tous posts** | 0 |
| 31 oct | Halloween | 5 reels costumes + PPV set | $50 |
| **27 nov BF** | **Peak commercial** | **-50% subscription 1 sem** | $100 ads |
| 25 déc | Noël | Contenu festif + custom | 0 |
| 31 déc | Nouvel An | Reset + push acquisition | 0 |

### 2027

| Date | Événement | Action Heaven | Budget |
|------|-----------|----------------|--------|
| 14 fév | St-Valentin | Love sessions premium PPV | $100 |
| Pâques 10 avril | Reset printemps | Nouveau persona v2 YUMI | 0 |
| Juin-août | Été | Peak sexy beach (2e itération) | 0 |
| 31 oct | Halloween | Costumes (2e tour) | $100 |
| 26 nov BF | Peak | -50% + bundle 3 mois | $200 |
| 25 déc | Noël | Contenu festif | 0 |

---

## 8. Risques + plans B

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|------------|
| 1 | **Instagram ban YUMI (compte IA)** | Moyenne | Critique | 2 comptes backup (@yumiofficial, @yumiiistyle) ; diversification TikTok+X avant Q3 ; Discord fallback |
| 2 | **Fanvue change algo/payouts** | Faible | Majeur | Multi-platform : Fansly backup activable 1 sem ; ManyVids secondaire ; Heaven OS propre = monétisation directe packs |
| 3 | **Outils IA cassent (HeyGen/MJ rate limit/down)** | Moyenne | Moyen | Pipeline 2-3 alt/catégorie (Flux, SD self-host) ; stock 30 photos master YUMI en réserve (2 sem contenu) |
| 4 | **PALOMA quitte collaboration** | Faible-moyenne | Majeur NB profil | YUMI seule peut tenir $3-5k solo ; RUBY onboarding prêt Q1 2027 ; recherche nouvelle via réseau PALOMA |
| 5 | **AI Act EU non-compliance** (après 2 août 2026) | Haute si pas action | **Critique €15M amende max** | Label AI-generated bio dès 1er août 2026 ; tag #AI #Virtual tous posts ; audit mensuel auto |
| 6 | **Fuite confidentialité Heaven ↔ SQWENSY** | Faible | Critique | Audit mensuel grep auto tous repos publics ; NDA contrats PALOMA/RUBY ; plan crise préparé |
| 7 | **Compromission Fanvue / Insta** | Faible | Majeur | 2FA obligatoire ; Bitwarden ; kill switch IA ; alerte Telegram login suspect |
| 8 | **Claude API rate limit / pricing** | Faible | Moyen | Fallback OpenRouter (GPT-4o, Gemini) ; cache déjà en place ; budget cap $100/mois Module IA |
| 9 | **Chômage PALOMA compromis par revenus** | Moyenne sans Option A | Critique | cf. `./PALOMA-COLLABORATION.md` — Option A activité accessoire ONEM déclarée + plafond |
| 10 | **Runway NB insuffisant** (vs cadence Heaven) | Moyenne Q2 | Critique | Heaven ROI positif dès Q2 (stack <MRR) ; Heaven = 20% énergie NB max, 80% Studio+JPS+OPearly |

---

## 9. Schéma DB Heaven (extension `cp_heaven` migration 031)

Base v0.5.0 inclut déjà : `agence_clients`, `agence_codes`, `agence_wall_posts`, `agence_messages`, `instagram_config/conversations/messages` (v0.4.0).

### 9.1 Nouvelles tables (migration 031_heaven_masterplan_2026.sql)

```sql
-- 1. Long-term chat memory par fan par modèle
CREATE TABLE model_chat_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  fan_identifier TEXT NOT NULL,
  platform TEXT NOT NULL,  -- 'fanvue', 'instagram', 'heaven'
  context_summary TEXT,
  last_n_messages JSONB DEFAULT '[]',
  fan_profile JSONB DEFAULT '{}',
  total_ppv_spent NUMERIC DEFAULT 0,
  tier_level TEXT DEFAULT 'free',
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_id, fan_identifier, platform)
);
CREATE INDEX idx_chat_memory_model ON model_chat_memory(model_id);
CREATE INDEX idx_chat_memory_fan ON model_chat_memory(fan_identifier);

-- 2. Persona versioning
CREATE TABLE model_chat_persona (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  version INT NOT NULL,
  system_prompt TEXT NOT NULL,
  few_shot_examples JSONB DEFAULT '[]',
  pricing_refs JSONB DEFAULT '{}',
  red_lines JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_id, version)
);

-- 3. Calendar content
CREATE TABLE model_content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,  -- 'photo', 'reel', 'story', 'ppv'
  title TEXT,
  prompt_brief TEXT,
  assets_urls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  performance JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_content_cal_model ON model_content_calendar(model_id, scheduled_for);
CREATE INDEX idx_content_cal_status ON model_content_calendar(status);

-- 4. Revenue tracking
CREATE TABLE model_revenue_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  date DATE NOT NULL,
  platform TEXT NOT NULL,
  followers_count INT,
  new_followers INT,
  revenue_usd NUMERIC DEFAULT 0,
  revenue_source TEXT,  -- 'subscription', 'ppv', 'tip', 'custom', 'brand_deal'
  transactions_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_id, date, platform, revenue_source)
);
CREATE INDEX idx_revenue_model_date ON model_revenue_tracking(model_id, date);

-- 5. Outils IA usage tracking (coûts)
CREATE TABLE model_outils_ia_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  month DATE NOT NULL,
  tool TEXT NOT NULL,  -- 'midjourney', 'runway', 'elevenlabs', 'suno', 'heygen'
  cost_usd NUMERIC DEFAULT 0,
  usage_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_id, month, tool)
);

-- 6. Chat audit log
CREATE TABLE model_chat_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  fan_identifier TEXT NOT NULL,
  platform TEXT NOT NULL,
  persona_version INT,
  ai_model_used TEXT,  -- 'sonnet-4.6', 'haiku-4.5', 'manual'
  prompt_tokens INT,
  completion_tokens INT,
  cost_usd NUMERIC DEFAULT 0,
  latency_ms INT,
  safety_passed BOOLEAN DEFAULT true,
  safety_flags JSONB,
  was_edited BOOLEAN DEFAULT false,
  final_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_chat_audit_model_date ON model_chat_audit_log(model_id, created_at);
```

### 9.2 RLS Policies

Scoping `model_id` sur toutes les tables :
- `admin` (NB) : full access
- `model` : SELECT/UPDATE sur `model_id = auth_model_id` uniquement

### 9.3 Sync HQ SQWENSY

**JAMAIS de sync direct Heaven DB → SQWENSY HQ DB**. Heaven reste silo. Seule exception : **agrégat anonymisé mensuel** exportable manuellement (NB copie chiffre total MRR Heaven dans CP Privé `personal_frais` catégorie "branche Agence"). Aucun détail par modèle/fan remonté.

---

## 10. Budget Heaven 2026-2027

### 10.1 Coûts détaillés

| Poste | Q2 2026 | Q3 2026 | Q4 2026 | Q1 2027 | Q2 2027 | Q4 2027 |
|-------|---------|---------|---------|---------|---------|---------|
| Midjourney Std/Pro | $30 | $30 | $30 | $60 | $60 | $60 |
| ElevenLabs Creator/Pro | $22 | $22 | $22 | $22 | $99 | $99 |
| Suno Pro | $10 | $10 | $10 | $10 | $10 | $10 |
| HeyGen Creator/Pro | - | $29 | $29 | $29 | $99 | $99 |
| Runway Gen-4 Std/Unl | - | $35 | $35 | $95 | $95 | $95 |
| CapCut Pro/Business | - | $10 | $10 | $10 | $15 | $15 |
| Module IA Claude Sonnet cached | $10 | $15 | $25 | $35 | $50 | $80 |
| **Total stack IA** | **$72** | **$151** | **$161** | **$261** | **$428** | **$458** |
| Meta Ads (Q4 2026+) | - | - | $100 | $150 | $300 | $500 |
| Formation LoRA one-shot Q3 | - | $150 | - | - | - | - |
| Hosting Vercel Pro Q1+ | 0 | 0 | $20 | $20 | $20 | $20 |
| **TOTAL FIXED** | **$72** | **$301** | **$281** | **$431** | **$748** | **$978** |
| Commission Fanvue 20% | $100 | $200 | $560 | $800 | $1500 | $2600 |
| % PALOMA (30-40% NB profil) | $60 | $120 | $300 | $450 | $900 | $1500 |
| **Total coûts+commissions+%** | **$232** | **$621** | **$1141** | **$1681** | **$3148** | **$5078** |
| **Revenue brut** | $500 | $1000 | $2800 | $4000 | $7500 | $13000 |
| **NET HEAVEN (ROI)** | **$268** | **$379** | **$1659** | **$2319** | **$4352** | **$7922** |

### 10.2 Break-even cashflow

- **Break-even Heaven : Q2 2026** (revenue $500 > coûts $232) ✓
- **ROI positif toute la période** : ✓
- **Payback stack IA** : <30 jours

### 10.3 Carte virtuelle Wise "Heaven"

Cap mensuel gated (cf. `project_wise_unique_account.md`) :
- Q2 2026 : $100
- Q3 2026 : $350
- Q4 2026 : $350
- Q1 2027 : $500
- Q2 2027 : $800
- Q4 2027 : $1200

Dépassement = alerte Telegram + review immédiat.

---

## Conclusion — Risque principal et pari

**Pari central** : atteindre $13k MRR consolidé en 21 mois, générer 80% du contenu via IA, déléguer 95% conversation fan à module IA personnalisé, tout en préservant discrétion totale vs SQWENSY.

**3 conditions de succès incontournables** :
1. Respecter AI Act EU dès 2 août 2026 (label + tag obligatoires) — €15M amende sinon
2. Signer PALOMA Option A avant juin 2026 (sécurité juridique collaboratrice)
3. Atteindre 15k Insta YUMI fin Q3 (gate conversion Fanvue MRR $500-800)

**Si 3 remplies** : trajectoire nominale $13k MRR Q4 2027 probable (~70% confidence).
**Si 1 rate** : délai 3-6 mois, ROI net ~$5-8k/mois.
**Si 2+ ratent** : pivot profil NB humain pur (PALOMA + RUBY), YUMI backup TikTok, MRR plafonné $3-5k.

---

## Références croisées

- `./PALOMA-COLLABORATION.md` — plan détaillé collaboratrice PALOMA (statut ONEM, contrat, paiement Wise)
- `project_agence_profils.md` mémoire — profils gérés Heaven (confidentialité IDs)
- `project_heaven_subscriber_saas.md` mémoire — vision SaaS Heaven identity=handle
- `project_wise_unique_account.md` mémoire — Wise Business compte unique
- `project_instagram_agent_heaven.md` mémoire — Instagram Agent module v0.4.0
- `sqwensy-os/plans/BP-CHRONO-SQWENSY-2026-2027.md` — calendrier financier (Heaven silo)
- `sqwensy-os/plans/PROTOCOLE-CONTINU-2026.md` section 12 Heaven confidentiel
- `sqwensy-os/plans/SECURITY-PLAN-EVOLUTIVE-2026-2027.md` — sécurité L4 cible Heaven
- `clients/heaven/plans/masterplan.md` — index plans Heaven
- `clients/heaven/plans/security/roles-entities.md` — RBAC 2 rôles / 3 entités

---

**Fin Masterplan Stratégique Heaven 2026-2027**
**Agent G — Audit multi-agent SQWENSY**
**Classification L3 CONFIDENTIEL — silo Heaven only**

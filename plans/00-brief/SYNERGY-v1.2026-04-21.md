# SYNERGY — Heaven ↔ écosystème SQWENSY

> Rapport des points d'intégration Heaven avec les autres composantes SQWENSY.
> **Règle P0** : aucune référence publique Heaven ↔ SQWENSY. Silo confidentiel obligatoire.

---

## 1. Confidentialité — règle d'or

Heaven vit en **silo technique et narratif** :

- Domaine : `heaven-os.vercel.app` (pas de sous-domaine `.sqwensy.com`)
- Repo : `clients/heaven/` isolé, push indépendant
- Pas de branding SQWENSY public sur le site Heaven (README, OG tags, footer)
- Aucun lien public Heaven → SQWENSY (pas de mention « client SQWENSY » sur le site Heaven)
- Les BEACON sqwensy.com vitrines publiques **ne mentionnent jamais Heaven**
- Seuls NB + collaborateurs internes SQWENSY savent que Heaven = branche Agence

---

## 2. Points d'intégration techniques

Malgré le silo, Heaven consomme / échange avec SQWENSY OS via :

### 2.1 Proxy BEACON server-side
- Heaven expose `/api/heaven-beacon/{chat,lead}` (route Next.js CP)
- Proxy server-only → SQWENSY OS BEACON API (variable env `OS_BEACON_URL`)
- Pas d'exposition URL OS côté client (jamais `NEXT_PUBLIC_OS_*`)
- But : widget chat flottant Heaven consomme le moteur BEACON central

### 2.2 Validation codes login
- `/api/auth/login` Heaven peut valider un code côté OS via `OS_BEACON_URL`
- Fallback local : table `agence_accounts` Heaven autonome (depuis migration 034)
- Secret HMAC `HEAVEN_SYNC_SECRET` partagé Heaven ↔ OS

### 2.3 Rien d'autre en direct
- DB Supabase Heaven est **dédiée et isolée** (projet `tbvojfjfgmjiwitiudbn`)
- Pas de sync DB cross-CP (Heaven ne lit JAMAIS la DB Main SQWENSY)
- Pas de sync Supabase automatique (chaque CP autonome côté data)

---

## 3. Points d'intégration business / opérationnels

### 3.1 Branche Agence SQWENSY
- Heaven est le produit phare (mais confidentiel) de la branche Agence SQWENSY
- Revenus Heaven = revenus SQWENSY (compta unique société BE)
- Compte Wise Business unique SQWENSY sert IN/OUT Heaven + autres branches
- Fiscalité : TVA, ISOC, etc., gérés au niveau SQWENSY, pas par Heaven séparément

### 3.2 Paloma / Ruby = collaboratrices internes SQWENSY
- Contrats modèle privés signés Agence SQWENSY ↔ modèle
- Statut juridique évolutif (voir `business/paloma-collaboration-2026-04/` pour Paloma)
- Cotisations INASTI, fiscalité BE gérées individuellement par chaque collaboratrice
- Rémunération via Wise SQWENSY (ou Revolut, ou crypto selon palier)

### 3.3 Automations n8n partagées
- Workflows n8n SQWENSY (abonnement 2026-03) peuvent potentiellement servir Heaven
- Cas d'usage envisagés : sync Fanvue revenue, monitoring quota Meta, alertes ops
- Décision d'activation à prendre selon renouvellement abonnement (mi-avril 2026)

### 3.4 Stack IA content partagée
- Midjourney / ElevenLabs / Suno / HeyGen / Runway : abonnements via carte Wise virtuelle « Heaven » dédiée (cap mensuel gated)
- Abonnements au nom de SQWENSY (compta unique) mais usage Heaven principalement
- Évolution budget : 60 €/mois Q2 → 160 €/mois Q4 → 380 €/mois Q4 2027

---

## 4. Flux de valeur

```
          ┌─────────────────┐
          │    SQWENSY      │
          │ (société BE)    │
          └────────┬────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
    Brands      Studio      Agence ─────> Heaven (confidentiel)
       │           │           │
   (e-comm)   (créations)  (talents)   (plateforme creator-fan)
                                          │
                                          ▼
                                    3 Modes (A/B/C)
                                          │
                                          ▼
                                   Fanvue yumiclub
                                   IG @yumiiiclub
                                   Modèles Paloma/Ruby
                                          │
                                          ▼
                                    Revenus → Wise SQWENSY
```

---

## 5. Communications cross-CP

### 5.1 Contextes à partager
Quand une décision Heaven peut impacter un autre CP :
- Créer ADR dans `plans/DECISIONS.md` Heaven
- Si impact externe (ex: change format BEACON) → également ADR dans `sqwensy-os/plans/DECISIONS.md`
- Convention : référencer `ADR-<N> Heaven` dans l'ADR SQWENSY et vice-versa

### 5.2 Mise à jour cross-CP
Le **protocole de mise à jour** Heaven ([`plans/PROTOCOLE-MISE-A-JOUR.md`](../PROTOCOLE-MISE-A-JOUR.md)) ne s'applique qu'au CP Heaven.

Quand un changement touche plusieurs CPs, NB doit expliciter : « met à jour plan Heaven » puis « met à jour plan SQWENSY OS » — deux protocoles distincts.

---

## 6. Memory / mémoire assistant

Les memoires assistant contiennent des pointeurs vers Heaven (ex: `session_state_heaven_2026_04_21.md`, `project_agence_profils.md`), mais **sans exposer publiquement**. Ces memoires sont locales AI-LAB.

Le standard cross-CP `STANDARD-SUIVI-PROJET.md` (doc maître sqwensy-os) est **applicable à Heaven** sans rompre la confidentialité : la structure est la même partout mais le contenu reste isolé.

---

## 7. Évolutions possibles

### Court terme
- Activer QStash (Upstash) pour cron worker IG Heaven — abonnement dédié SQWENSY
- Business Verification Meta au nom de SQWENSY (BM Business Manager)

### Moyen terme
- Si scale Heaven > 2 500 €/mois A+B → envisager SRL Heaven séparée (ADR à créer)
- Possible exposition SaaS Heaven externe (Mode C à grande échelle) → breaking change confidentialité

### Long terme
- Si Mode C B2B prend : SaaS Heaven pourrait devenir sa propre marque publique
- Décision structurelle fin 2027 selon MRR consolidé

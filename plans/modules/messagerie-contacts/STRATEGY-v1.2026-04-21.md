# Messagerie + Contacts — Stratégie v1 (2026-04-21)

> Fusion de l'inbox unifiée et du CRM fans. Une seule vue, une seule identité.
> **Brief clé NB (B7)** : supprimer la tab « Clients » séparée — tout dans Messagerie.

---

## 1. Contexte

Heaven opère aujourd'hui deux modules distincts :

- **Messagerie** (`/agence/messagerie`) — inbox unifiée web + Instagram via la vue `agence_messages_timeline` (UNION ALL migration 038).
- **Clients** (`/agence?tab=clients` + `/agence/clients`) — CRM fans (`agence_fans` + `agence_clients`).

Le brief NB **fusionne les deux**. Raison : un fan **est** une conversation, il n'existe pas de « client » dans Heaven sans message. La séparation crée de la friction et duplique l'information (pseudo, plateforme, historique).

---

## 2. Briefs NB — ce qui change (B7)

### 2.1. Suppression tab « Clients »

- ❌ `NAV_MAIN.contacts` sidebar (qui pointe vers `/agence?tab=clients`)
- ❌ Tab « Clients » dans le header Dashboard
- ❌ Route dédiée `/agence/clients` (maintenue en redirect → `/agence/messagerie`)
- ✅ **Contacts assemblés à Messagerie** : panel latéral dans `/agence/messagerie` qui liste les fans avec leurs conversations

### 2.2. Fusion contact multi-canal

**Règle produit absolue** : **un fan = une identité unique cross-plateformes**.

Scénario type NB (« flow exemple » brief B7) :

```
T+0   Visiteur arrive sur /m/yumi → saisit pseudo Snap "crusher42" → plateforme = snapchat
T+0   Système crée agence_clients (fingerprint + pseudo_snap) + agence_fans (canonical)
T+5m  Il envoie un message chat web → agence_messages (web)
T+2j  Il apparaît dans les DMs Instagram @yumiiiclub avec pseudo IG "crushx_42"
T+2j  Système détecte similarité + propose merge → après merge, les messages IG sont
      sous le même fan_id
T+5j  Il balance son pseudo Fanvue "crusher42_official"
T+5j  Admin renseigne le pseudo Fanvue dans profil fan → lié
```

Après merge :

- **Un seul profil fan** (`agence_fans.id`)
- **Historique chronologique complet** : web + IG DM + annotations Fanvue
- **Pseudo(s) actifs** : `pseudo_snap`, `pseudo_insta`, `pseudo_fanvue`, `pseudo_web`
- **Continuité** : admin peut répondre au web, au DM IG, ou en copier-coller sur Fanvue/Snap (selon canal source initial du fan)

### 2.3. Canal de réponse

- **Message web** → répond via chat Heaven (canal direct)
- **Message IG DM** → répond via Meta Graph API (si scope `instagram_manage_messages` actif, sinon fallback copy/paste)
- **Canal Fanvue/Snap** → pas d'API, copy/paste manuelle avec aide agent IA (brief ultérieur Sprint 6)

**Règle Meta** : une fenêtre de 24h s'applique aux DM IG — au-delà, seul un Message Tag permet de répondre. L'UI doit signaler ce timer.

### 2.4. Profil unifié — qu'est-ce qu'on stocke ?

Au-delà des handles, chaque fan porte un **registre de préférences et contexte** :

- **Goûts** (`tags` JSONB : `["feet","soft","couple","roleplay",...]`)
- **Critères tchat** (langue préférée, fréquence souhaitée, type d'interaction)
- **Envies** (demandes explicites historiques : « PPV pieds », « session cam 1:1 »)
- **Demandes en attente** (items non fulfillés → actionnable pour l'admin)
- **Scoring** (LTV, conversion, dernière activité)

Ce registre alimente **l'agent IA Sprint 6** (scripts différenciés par Mode + personnalisation par fan).

---

## 3. Architecture fusion

### 3.1. Une vue, deux panels

```
┌── /agence/messagerie ──────────────────────────────────────────┐
│ ┌── Panel gauche : Conversations ──┬── Panel droit : Chat ──┐ │
│ │ [filter: all / web / ig / ...]   │  [header fan + handles]│ │
│ │                                   │  [timeline messages]   │ │
│ │ ┌─ fan#1 (snap+IG+web)  [2 🔴] ┐│  [reply composer]      │ │
│ │ │ "crusher42" — IG              ││                        │ │
│ │ │ last: "salut ça va ?" 2m      ││  Bouton "Voir fiche"   │ │
│ │ └───────────────────────────────┘│                        │ │
│ │                                   │                        │ │
│ │ ┌─ fan#2 (web only)    [0]    ┐ │                        │ │
│ │ │ ...                            │ │                        │ │
│ │ └───────────────────────────────┘ │                        │ │
│ └───────────────────────────────────┴────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**Panel gauche = liste conversations (inbox)** : chaque row = un fan, source icon, dernier message, unread count.

**Panel droit = thread** : timeline, reply composer (canal pré-sélectionné selon source dernière).

### 3.2. Panneau « fiche fan » (slide-in)

Click sur « Voir fiche » ou sur l'avatar → panel droit bascule en **fiche fan complète** :

- Handles actifs (web / IG / Snap / Fanvue)
- Historique achats (packs PPV)
- Tags goûts + envies
- Timeline unifiée (messages + paiements + events)
- Actions : edit handles, merge, link Instagram, bloquer

### 3.3. Fusion auto vs manuelle

| Scénario | Action |
|---|---|
| Même `device_fingerprint` + pseudo différent | Merge auto (même appareil) |
| `pseudo_insta` = IG conversation handle | Lien auto (`link-instagram` endpoint) |
| Similarité textuelle pseudo (Levenshtein < 2) | Suggestion admin — pas auto |
| Admin force merge | Merge explicite via UI |

L'endpoint `merge` existe déjà (root-only, soft merge `merged_into_id`).

---

## 4. Critères UX de succès

1. **Un seul onglet/module** — Messagerie absorbe Clients
2. **Inbox et fiche fan dans la même page** (pas de navigation multi-pages)
3. **Un fan = une vue unifiée de ses messages** (web + IG + Snap + Fanvue)
4. **Répondre depuis n'importe quel canal** (dans la limite des API externes)
5. **Fusion claire** (explicite ou suggérée), jamais destructive (soft merge)
6. **Contexte fan visible dans la discussion** (tags/envies en sidebar de chat)

---

## 5. Dépendances

- Module `dashboard` : KPIs Messagerie (count conversations actives, unread) remontés en haut du Dashboard
- Module `profil-public` : les messages entrants visiteur viennent du chat Heaven sur `/m/<slug>`
- Module `instagram` : les DMs IG arrivent via webhook → inbox
- Agent IA Sprint 6 : consomme la fiche fan pour scripts personnalisés

---

## 6. Hors scope

- Réponses automatiques IA (Sprint 6 BP + `plans/IA-AGENT-SPEC.md`)
- Message tags Meta 24h+ (feature Meta App Review, post D-4)
- Intégration Snapchat/Fanvue API (pas d'API disponible — manuel)
- Export CSV fiche fan (ultérieur)

---

## 7. Règles de conformité

- **Aucun vrai prénom stocké** — que des pseudos plateformes (cf. CLAUDE.md Heaven)
- **RGPD** : data-deletion callback Meta actif (`/api/meta/data-deletion`), supression fan = cascade messages + handles
- **RLS scoping** : chaque modèle voit ses propres fans via `can_see_model_id(fan.model_id)`
- **Root voit tout** : cross-modèle pour supervision

---

## 8. Liens

- API inbox unifiée : `src/app/api/agence/messaging/inbox/route.ts`
- API reply : `src/app/api/agence/messaging/reply/route.ts`
- API fan merge : `src/app/api/agence/fans/[id]/merge/route.ts`
- API link Instagram : `src/app/api/agence/fans/link-instagram/route.ts`
- API fan search : `src/app/api/agence/fans/search/route.ts`
- Vue DB : `agence_messages_timeline` (migration 038)
- BP : `plans/business/bp-agence-heaven-2026-04/README.md`
- Module dashboard (KPIs) : `plans/modules/dashboard/STRATEGIE-v1.2026-04-21.md`

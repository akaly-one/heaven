# BRIEF-2026-04-25-16 — Packs + Payment Providers modulaires (V1 manuel PayPal + V2 auto multi-provider)

> **Date** : 2026-04-25 ~00:45
> **Émetteur** : NB (owner)
> **Type** : feature majeure + refactor + architecture
> **Priorité** : P1
> **Branches impactées** : DB, BE, FE, QA, Legal, DevOps, Doc
> **Statut** : 🟠 cadré (audit complet livré, en attente GO dispatch)

---

## 🎯 Objectif métier

Système de paiement packs creator avec validation accès cloisonné.

**Flow V1 manuel (immédiat)** :
1. Visiteur sur `/m/yumi` ouvre IdentityGate, choisit un pack (Silver 50€ / Gold 100€ / VIP Black 200€ / VIP Platinum 350€ / Custom)
2. Redirection vers `paypal.me/{handle}/{amount}EUR` **+ une référence copiable** à coller en note PayPal (ex: `YUMI-PACK42-ROMAIN2024`)
3. Une ligne `agence_pending_payments` est créée **avant redirect** avec `status=awaiting_manual_confirm` + `reference_code` + `pseudo_web`
4. Cockpit modèle : nouvelle section "Demandes de paiement en attente" avec les lignes pending + bouton "Valider paiement"
5. Modèle vérifie manuellement email PayPal reçu : pseudo PayPal = pseudo web renseigné ? note = référence ? montant OK ?
6. Clic "Valider" → déclenche `fulfillPayment({paymentMethod:"manual", packId, pseudo})` → génère code **cloisonné au pack** → insère dans `agence_codes` (active=true, pack=<slug>, client_id lié)
7. Fan tape le code dans IdentityGate → POST `/api/codes` action=validate → accès débloqué **uniquement au contenu du pack**

**Flow V2 automatique (plus tard, modulaire)** :
- Modules activables/désactivables via toggle cockpit root/yumi
- **PayPal Checkout API** (SDK existant, à brancher dans registry)
- **Revolut Merchant API** (routes existantes, à brancher)
- **Stripe Checkout** (feature-flagged `ALLOW_STRIPE=false` par défaut — TOS adult risqué)
- Webhook → signature verify → idempotence → fulfillPayment auto → code généré et envoyé via message thread

---

## 📊 État des lieux (audit 25/04)

### Déjà présent (à réutiliser)
- **Table `agence_pending_payments`** (mig 023) — tracking unifié 3 providers, idempotency via UNIQUE `capture_id`
- **Table `agence_codes`** — colonnes `code, model, client, client_id, platform, role, tier, pack, type, expires_at, used, active, revoked, max_devices, security_alert, blocked`
- **Routes `/api/payments/{paypal,revolut}/{create,capture/status,webhook}`**
- **`src/shared/lib/payment-utils.ts`** — `fulfillPayment()` + `generateAccessCode()` (pattern `YUM-2026-A7K2`)
- **Routes `/api/codes` POST action=validate** — input modal IdentityGate déjà temps-réel avec DB
- **Route POST `/api/codes` action=create** — génération code cockpit (via GenerateModal)
- **Lien PayPal.me** construit dans `unlock-sheet.tsx` L92-93 (`paypal_handle` stocké dans `agence_models.config.paypal_handle`)
- **Env vars déjà déclarées** : `PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID`, `REVOLUT_API_SECRET_KEY/WEBHOOK_SECRET`, `STRIPE_*`
- **Colonnes packs DB** : `wise_url`, `stripe_link`, `revolut_url` sur `agence_packs` (mig 006, 007, 016)

### Manquant (V1 manuel)
1. **Bouton pack → crée pending_payment** : actuellement redirige PayPal.me direct, sans tracking DB
2. **Référence copiable** : PayPal.me ne supporte pas query param `?note=` → afficher dans modal "Copie cette référence : `YUMI-P42-XXXX`" + bouton copy
3. **UI cockpit "Demandes pending"** : pas de liste dédiée (clients-panel contient génération manuelle mais pas validation paiement manuel structurée)
4. **Route `POST /api/payments/manual/confirm`** : modèle colle référence → match pending → trigger `fulfillPayment({method:"manual"})`
5. **Cloisonnement pack enforcement** : `agence_codes.pack` existe mais contenu servi est tier-based (p1/p2/p4/p5), pas pack-slug-based strict

### Manquant (V2 auto modulaire)
1. **Table `agence_settings.payment_providers`** JSONB → toggle par provider
2. **Interface `PaymentProvider`** unifiée (`src/shared/payment/types.ts`)
3. **Registry** `getProvider(id)` + `getEnabledProviders()` (`src/shared/payment/registry.ts`)
4. **Wrappers providers** : `paypal.ts`, `revolut.ts`, `stripe.ts`, `manual.ts` dans `src/shared/payment/providers/`
5. **Composant `<PaymentProvidersToggle>`** cockpit root/yumi
6. **Composant `<PaymentModal packId client>`** public
7. **Table `agence_webhook_events`** anti-replay
8. **Stripe feature-flagged OFF** + guard serveur `ALLOW_STRIPE=true` obligatoire pour activer

---

## ⚖️ Décisions légales / TOS

| Provider | Adult content | Verdict | Action |
|---|---|---|---|
| **Stripe** | Interdit explicitement | ❌ prod | Feature flag `ALLOW_STRIPE=false`, squelette code only |
| **PayPal Checkout** | Zone grise, risque ban | ⚠️ risqué hardcore Paloma, OK softcore Yumi | V1 = PayPal.me manuel (surface réduite), V2 = progressif avec monitoring |
| **PayPal.me manuel** | Toléré (pas de catégorisation commerçant adult) | ✅ V1 OK | Lancement immédiat |
| **Revolut Merchant** | Pas d'interdiction explicite, KYB strict | ✅ V2 priorité | Valider avec AM Revolut avant prod |
| **DAC7 BE** | Déclaration annuelle si ≥2000€ ou 30 ventes | 📋 obligatoire | Export depuis `agence_pending_payments` |

---

## 🏗️ Architecture proposée

### Schéma interface unifiée

```typescript
// src/shared/payment/types.ts
export interface PaymentProvider {
  readonly id: 'paypal' | 'revolut' | 'stripe' | 'manual';
  readonly displayName: string;
  readonly mode?: 'manual' | 'checkout';

  createPayment(input: {
    amount: number;            // en centimes
    currency: 'EUR';
    packId: string;
    packSlug: string;
    clientPseudo: string;
    clientId?: string;
    metadata: Record<string, string>;
  }): Promise<{ providerPaymentId: string; redirectUrl: string; referenceCode?: string }>;

  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
  getStatus(providerPaymentId: string): Promise<'pending' | 'completed' | 'failed' | 'refunded'>;
  refund?(providerPaymentId: string, amount?: number): Promise<boolean>;
}
```

### Structure dossiers

```
src/shared/payment/
├── types.ts                  (interface + types)
├── registry.ts               (getProvider, getEnabledProviders, fallback logic)
├── fulfill.ts                (re-exporte fulfillPayment existant)
└── providers/
    ├── manual.ts             (PayPal.me manuel V1 — nouveau)
    ├── paypal.ts             (wrap /api/payments/paypal existant)
    ├── revolut.ts            (wrap /api/payments/revolut existant)
    └── stripe.ts             (squelette feature-flagged OFF)
```

### Migrations DB

```sql
-- Migration NNN_payment_providers_toggle.sql
ALTER TABLE agence_settings ADD COLUMN IF NOT EXISTS payment_providers JSONB DEFAULT
  '{"manual":{"enabled":true},"paypal":{"enabled":false,"mode":"checkout"},"revolut":{"enabled":false},"stripe":{"enabled":false}}'::jsonb;

CREATE TABLE IF NOT EXISTS agence_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR NOT NULL,
  event_id VARCHAR NOT NULL,
  raw_body JSONB NOT NULL,
  signature TEXT,
  processed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, event_id)
);
```

---

## 🎫 Plan tickets (ordonné)

### Phase A — V1 manuel PayPal (P0, bloquant first)
- **T16-A1** : Migration DB `payment_providers` JSONB + `agence_webhook_events` + ajouter `reference_code` + `pseudo_web` sur `agence_pending_payments`
- **T16-A2** : Provider `manual.ts` — crée pending_payment + référence + URL PayPal.me (registry + types)
- **T16-A3** : UI fan — bouton pack dans unlock-sheet → POST `/api/payment/create?provider=manual` → modal "Copie cette référence dans PayPal" + bouton copy + redirect PayPal.me
- **T16-A4** : Route `POST /api/payments/manual/confirm` — match référence → fulfillPayment({method:"manual"}) → génère code cloisonné pack
- **T16-A5** : UI cockpit `/agence/payments` — liste pending + bouton "Valider paiement" → call manual/confirm

### Phase B — Enforcement cloisonnement pack (P0, bloquant UX promise)
- **T16-B1** : Guard côté serveur qui vérifie `code.pack === pack.slug` avant servir contenu pack-specific
- **T16-B2** : Audit `computeAccessLevel()` — passer de tier-based à pack-slug-based additionnel
- **T16-B3** : UI fan profil — filtrer contenu visible par pack_slug validé (pas juste tier)

### Phase C — Architecture modulaire (P1, pour V2)
- **T16-C1** : Interface `PaymentProvider` + types
- **T16-C2** : Registry + wrappers paypal/revolut existants
- **T16-C3** : Squelette stripe.ts + guard `ALLOW_STRIPE=true`
- **T16-C4** : Table `agence_webhook_events` + helper `verifyAndStore()`

### Phase D — Toggle UI cockpit (P1, pour V2)
- **T16-D1** : Composant `<PaymentProvidersToggle>` — lit/écrit `agence_settings.payment_providers`
- **T16-D2** : Intégration `/cp/root/settings/payments` et `/agence/settings/payments`
- **T16-D3** : Hook `usePaymentProviders()` — liste providers enabled, auto-fallback

### Phase E — QA + doc (P1)
- **T16-E1** : Tests E2E Playwright V1 manuel (visiteur → pack → redirect → cockpit valide → code généré → access débloqué)
- **T16-E2** : Docs `docs/architecture/PAYMENT-PROVIDERS.md`
- **T16-E3** : CHANGELOG + mise à jour masterplan

---

## 🔀 Parallélisation agents

- **Agent 1 (DB)** : T16-A1 + T16-C4 (migrations autonomes)
- **Agent 2 (BE manual V1)** : T16-A2 + T16-A4 (dépend A1)
- **Agent 3 (FE manual V1)** : T16-A3 + T16-A5 (dépend A2)
- **Agent 4 (BE registry)** : T16-C1 + T16-C2 + T16-C3 (indépendant)
- **Agent 5 (FE toggle)** : T16-D1 + T16-D2 + T16-D3 (dépend C)
- **Agent 6 (Enforcement)** : T16-B1 + T16-B2 + T16-B3 (indépendant)
- **Agent 7 (QA+Doc)** : T16-E1 + T16-E2 + T16-E3 (à la fin)

**Cycle estimé** : Phase A+B = 1-2h avec 3 agents parallèles. Phase C+D = 2h avec 2 agents parallèles. Phase E = 1h.

---

## ✅ Décisions NB (25/04 ~01:15)

### 1. Packs CUSTOM = eshop à la carte (pas montant libre)
Le pack "Custom" est un **panier composable** de produits prédéfinis avec quantités choisies par le fan + description libre.

**Grille tarifaire unitaire** :
| Catégorie | Photo base | Multiplicateur | Prix photo | Spécial "pied" x3 |
|---|---|---|---|---|
| **Silver** (sexy glamour) | 5€ | ×1 | 5€ | 15€ |
| **Gold** (poses suggestives) | 5€ | ×2 | 10€ | 30€ |
| **VIP Black** (nude sans visage) | 5€ | ×4 | 20€ | 60€ |
| **VIP Platinum** (nude avec visage) | 5€ | ×8 | 40€ | 120€ |

**Video** : **10€/minute × multiplicateur catégorie** (base Silver = 10€/min)
| Catégorie | Video /min | Multi | Prix /min | Pied /min (×3) |
|---|---|---|---|---|
| Silver (sexy glamour) | 10€ | ×1 | 10€ | 30€ |
| Gold (poses suggestives) | 10€ | ×2 | 20€ | 60€ |
| VIP Black (nude sans visage) | 10€ | ×4 | 40€ | 120€ |
| VIP Platinum (nude avec visage) | 10€ | ×8 | 80€ | 240€ |

**Breakdown panier** : stocké en JSON dans `agence_pending_payments.pack_breakdown` = `{ items: [{type: "photo"|"video", category: "gold", quantity: 3, unit_price: 10, duration_min?: 5}], description: "text libre", total_cents: N }`

**UX fan** :
- Panier shopping-cart : [+/-] quantité par type × catégorie
- Champ description libre "Décris ce que tu veux"
- Total dynamique
- Bouton "Commander" → crée `pending_payment` avec breakdown JSON + redirige PayPal.me

### 2. Expiration codes : **30 jours pour TOUS les packs** (uniforme)
- `expires_at = created_at + INTERVAL '30 days'` systématique
- Seul le TYPE de contenu diffère (pas la durée)
- Simplifie UX + support

### 3. Refund manuel : procédure CGV + Agent IA "correction pseudo"
- **CGV obligatoires** (nouveau livrable) : modèle **PAS responsable** d'un pseudo mal fourni par le fan
- **Procédure correction** : le fan recrée un compte avec le bon pseudo + envoie message spécifique (ex: "j'ai payé le pack Gold avec le pseudo @xxx mais je me suis trompé, voici mon vrai pseudo @yyy, référence paiement: YUMI-P42-ABC123")
- **Agent IA enrichi** :
  - Reconnaît l'intent "correction pseudo" via pattern dans le message
  - Accès lecture au **historique packs achetés** du fan (via `agence_codes` + `agence_pending_payments`)
  - Accès au **temps restant** du pack (calcul `expires_at - now()`)
  - Peut répondre côté profil/messagerie : "Tu as acheté le pack Gold le X, il te reste Y jours"
  - Peut détecter un match probable par montant + date proche + pseudo similaire → propose validation à la modèle
- **Status pending_payment** : `rejected_pseudo_mismatch` → notif thread auto agent IA + procédure correction
- **Pas de silent delete** : garder la ligne pour audit

### 4. Format référence : **`YUMI-P42-ABC123` (human-readable)** ✅
- Pattern : `{MODEL_SLUG_UPPER}-P{PACK_ID}-{RAND6}` ex `YUMI-PGLD-K3M9X2`
- 6 chars random alphanumériques (base32 sans voyelles ambiguës)
- Facile à copier dans note PayPal, lisible par modèle

### 5. Revolut + Wise : **NB ne sait pas intégrer, Claude doit guider**
- **Livrable docs dédié** : `docs/architecture/PAYMENT-INTEGRATION-GUIDE-NB.md`
- Sections :
  1. **Revolut Merchant API** : création compte Business BE, KYB, génération API keys, webhook signing secret, test sandbox → prod
  2. **Wise + Apple Pay via liens de paiement** : Wise Business a-t-il des payment links natifs ? Alternative : Wise payouts vers IBAN Revolut qui accepte Apple Pay
  3. **Stratégie hybride recommandée** : Revolut Merchant pour encaisser (Apple Pay/card natif) + Wise pour payouts IBAN multi-currency + PayPal.me/Checkout en backup
- **Toggle par défaut** : `revolut.enabled=false` au lancement (activer après KYB validé)

### 6. Stripe : **squelette only, activation urgence uniquement** ✅
- `ALLOW_STRIPE=false` par défaut
- Feature flag hard guard serveur : refuse activation toggle si env var pas à `true`
- Cas d'usage : si PayPal + Revolut bannissent simultanément → activation temp
- Dossier `src/shared/payment/providers/stripe.ts` avec interface implémentée mais `createPayment()` throw si flag OFF

### 7. PayPal handle : **1 par modèle séparé** ✅
- `agence_models.config.paypal_handle` : un handle distinct par modèle (Yumi, Paloma, Ruby)
- Fan qui achète pack Yumi → redirection `paypal.me/{yumi_handle}`
- Fan qui achète pack Paloma → redirection `paypal.me/{paloma_handle}`
- **Risque réduction** : chaque modèle gère son propre compte PayPal, ban d'un compte n'impacte pas les autres
- V2 auto PayPal Checkout : à terme, un compte par modèle OU compte NB unique avec "Marketplace" PayPal (coûteux — à trancher plus tard)

---

## 🆕 Tickets ajoutés (post-réponses NB)

### Phase F — Custom pack pricing + shopping cart
- **T16-F1** : Migration DB — table `agence_custom_pricing` (category × media_type × multiplier × base_price) + seed Yumi
- **T16-F2** : API `/api/packs/custom/quote` — POST items[] → renvoie total + breakdown
- **T16-F3** : UI shopping cart fan — sélection items + quantité + description + total live + redirect PayPal.me
- **T16-F4** : UI cockpit — affichage breakdown pending_payment pour fulfillment manuel

### Phase G — Agent IA pack awareness
- **T16-G1** : Contexte agent enrichi — injection `pack_history` + `remaining_days` dans system prompt
- **T16-G2** : Intent recognition "correction pseudo" — pattern `correction|erreur|trompé|mauvais pseudo` + référence `YUMI-P*`
- **T16-G3** : Auto-suggestion validation à la modèle quand match probable (pseudo similaire + montant + date)

### Phase H — CGV + docs
- **T16-H1** : Page `/cgv` publique — conditions générales vente packs, responsabilité pseudo, procédure correction, délais, refund policy
- **T16-H2** : Footer link CGV sur `/m/[slug]` et modal d'achat
- **T16-H3** : Docs NB — `docs/architecture/PAYMENT-INTEGRATION-GUIDE-NB.md` avec steps Revolut + Wise + Apple Pay
- **T16-H4** : Checkbox "J'accepte les CGV" obligatoire avant commande

---

## 🔀 Parallélisation agents — version finale (8 agents)

- **Agent 1 (DB)** : T16-A1 + T16-C4 + T16-F1 (migrations autonomes)
- **Agent 2 (BE manual V1)** : T16-A2 + T16-A4 (dépend A1)
- **Agent 3 (FE manual V1 + custom cart)** : T16-A3 + T16-A5 + T16-F3 + T16-F4 (dépend A2)
- **Agent 4 (BE registry + Stripe squelette)** : T16-C1 + T16-C2 + T16-C3
- **Agent 5 (FE toggle cockpit)** : T16-D1 + T16-D2 + T16-D3 (dépend C)
- **Agent 6 (Enforcement cloisonnement)** : T16-B1 + T16-B2 + T16-B3
- **Agent 7 (Agent IA pack awareness)** : T16-G1 + T16-G2 + T16-G3
- **Agent 8 (CGV + Guide Revolut/Wise Docs)** : T16-H1 + T16-H2 + T16-H3 + T16-H4 (autonome)

**Note** : F1 étant bloquant pour F2/F3/F4, l'agent 1 livre F1 en premier puis FE peut commencer le cart. Le quote API F2 peut aller à Agent 2 parallèlement.

---

## 📌 Références croisées

- **BRIEF-10** (Privacy + Age Gate) : `access_level=validated` est prérequis pour acheter packs P4/P5
- **BRIEF-13** (Unified client + self-verification) : `client_id` unifié simplifie liaison code↔client
- **BRIEF-07** (Générer message thread) : pourrait servir à envoyer le code généré automatiquement au fan
- **BRIEF-11** (Usage meters) : tracker coût API PayPal/Revolut/Stripe par transaction

---

## ✅ Definition of Done

- [ ] V1 manuel : fan peut choisir pack → PayPal.me → cockpit voit pending → modèle valide → code envoyé → fan access pack uniquement
- [ ] Code cloisonné strict : tester qu'un code Gold ne donne PAS accès au contenu Platinum
- [ ] Cockpit toggle : activer/désactiver chaque provider indépendamment
- [ ] Stripe OFF par défaut + guard `ALLOW_STRIPE=true`
- [ ] Webhook idempotence : double-fire pas générer 2 codes
- [ ] Tests E2E verts
- [ ] Doc architecture livrée
- [ ] CHANGELOG v2.9.0 + merge main

---

## 🔗 Fichiers de référence (audit 25/04)

- `/Users/aka/Documents/AI-LAB/clients/heaven/supabase/migrations/023_payments_infrastructure.sql`
- `/Users/aka/Documents/AI-LAB/clients/heaven/src/shared/lib/payment-utils.ts`
- `/Users/aka/Documents/AI-LAB/clients/heaven/src/app/api/payments/paypal/{create,capture,webhook}/route.ts`
- `/Users/aka/Documents/AI-LAB/clients/heaven/src/app/api/payments/revolut/{create,status,webhook}/route.ts`
- `/Users/aka/Documents/AI-LAB/clients/heaven/src/app/api/codes/route.ts`
- `/Users/aka/Documents/AI-LAB/clients/heaven/src/shared/components/identity-gate.tsx`
- `/Users/aka/Documents/AI-LAB/clients/heaven/src/web/components/profile/unlock-sheet.tsx`
- `/Users/aka/Documents/AI-LAB/clients/heaven/src/shared/constants/packs.ts`

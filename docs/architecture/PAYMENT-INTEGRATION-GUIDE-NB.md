# Guide d'intégration des paiements — NB

> **Destinataire** : NB (owner SQWENSY / Heaven)
> **Objectif** : brancher concrètement chaque fournisseur de paiement (PayPal, Revolut, Wise+Apple Pay, Stripe) sur Heaven, sans jargon inutile.
> **Dernière mise à jour** : 25 avril 2026
> **Cadre** : BRIEF-16 — packs + payment providers modulaires

---

## 1. Introduction

Heaven est une plateforme creator basée en Belgique, adossée à un compte **Wise Business** pour les opérations. Trois fournisseurs de paiement (PSP) sont possibles côté encaissement :

| PSP | Adult content | Statut Heaven | Priorité |
|---|---|---|---|
| PayPal | Zone grise, risque ban | V1 manuel actif, V2 auto en rodage | P0 |
| Revolut Merchant | Toléré après KYB | À activer après validation KYB | P1 |
| Stripe | Interdit (TOS) | Squelette uniquement, feature-flag OFF | Urgence uniquement |

**Wise** n'est pas un PSP à proprement parler : c'est un compte multi-currency. Il sert à **recevoir les payouts** depuis Revolut ou un lien «&nbsp;Request&nbsp;» pour des cas simples.

**Règle d'or adult content** :
1. Ne jamais utiliser Stripe pour encaisser sur Heaven en régime normal (ban quasi-certain à la détection).
2. Privilégier PayPal.me manuel + Revolut Merchant comme tandem.
3. Diversifier par modèle (un handle PayPal distinct par Yumi / Paloma / Ruby) pour limiter l'impact d'un ban.

---

## 2. PayPal — déjà en place

### 2.1 Compte Business vs compte personnel

Utilise **impérativement un compte PayPal Business** par modèle. Un compte personnel limite les volumes et ne donne pas accès à l'API Checkout.

Pour chaque modèle (Yumi, Paloma, Ruby) :
- Un compte PayPal Business distinct (email dédié)
- Un handle PayPal.me personnalisé (`paypal.me/yumixxx`, etc.)
- Les handles sont stockés dans `agence_models.config.paypal_handle`

### 2.2 V1 manuel — PayPal.me (actif aujourd'hui)

Comment obtenir le handle :
1. Se connecter au compte PayPal Business de la modèle
2. Aller dans `Profile → PayPal.me`
3. Choisir un handle (exemple : `paypal.me/yumicreator`)
4. Tester le lien depuis un navigateur incognito

Ce handle est ensuite saisi dans le cockpit modèle (`/agence/settings`) et sauvegardé dans `agence_models.config.paypal_handle`.

### 2.3 V2 automatique — Checkout API (à activer)

Pour passer en auto (capture + webhook), il faut une **application PayPal Developer** :

1. Aller sur https://developer.paypal.com et se connecter avec le compte Business
2. Passer en mode `Live` (pas Sandbox)
3. Créer une App : `My Apps & Credentials → REST API apps → Create App`
4. Récupérer :
   - `CLIENT_ID`
   - `SECRET` (client secret — à garder confidentiel)
5. Aller dans `Webhooks → Add webhook`
   - URL : `https://heaven-os.vercel.app/api/payments/paypal/webhook`
   - Événements à cocher : `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`
6. Récupérer le `WEBHOOK_ID` affiché après création

### 2.4 Env vars Vercel à configurer

```
PAYPAL_CLIENT_ID        = <CLIENT_ID récupéré étape 4>
PAYPAL_SECRET           = <SECRET récupéré étape 4>
PAYPAL_WEBHOOK_ID       = <WEBHOOK_ID récupéré étape 6>
PAYPAL_API_URL          = https://api-m.paypal.com        # prod
```

Pour le sandbox (tests) :

```
PAYPAL_API_URL          = https://api-m.sandbox.paypal.com
```

### 2.5 Vérification de signature webhook

Chaque requête webhook porte un header `PAYPAL-TRANSMISSION-SIG`. Le serveur Heaven vérifie la signature via l'endpoint officiel `/v1/notifications/verify-webhook-signature` avant de traiter l'événement. Si la signature est invalide, la requête est rejetée en 401.

Point clé : **toujours conserver le raw body** dans `agence_webhook_events` (colonne `raw_body JSONB`) pour re-vérification et rejeu si besoin.

### 2.6 JavaScript SDK vs REST API — différence et approche Heaven

PayPal propose **deux méthodes d'intégration** côté développeur :

**A. REST API pure (server-to-server)**
- Le backend Heaven crée l'ordre via `POST /v2/checkout/orders`
- Renvoie une `approval_url` au frontend
- Le fan est **redirigé complètement vers PayPal.com** pour payer
- Après paiement, PayPal redirige vers Heaven avec `token` + `PayerID`
- Le backend Heaven capture via `POST /v2/checkout/orders/{id}/capture`
- **Avantages** : pleinement contrôlé, pas de JS tiers, webhook idempotent
- **Inconvénients** : fan quitte Heaven pendant 30-60s, friction mobile

**B. JavaScript SDK (client-side button, server-side capture)**
- Le frontend charge le SDK PayPal : `<script src="https://www.paypal.com/sdk/js?client-id=..."`
- Un bouton PayPal est rendu **inline dans la page Heaven**
- Clic sur le bouton → popup PayPal (pas de redirection plein écran)
- Le SDK appelle `createOrder()` côté backend Heaven → reçoit `orderId`
- Le fan valide dans la popup PayPal
- Le SDK appelle `onApprove()` côté backend → capture via REST API
- **Avantages** : UX fluide, deep-link app PayPal sur mobile, Apple Pay via PayPal
- **Inconvénients** : dépendance JS tiers, cookies tiers, adblock possible

**Approche Heaven : hybride SDK + REST**

Le composant [`PayPalCheckoutButton`](src/web/components/profile/paypal-checkout-button.tsx) utilise `@paypal/react-paypal-js` (wrapper officiel) :
- Rend le bouton PayPal inline (SDK côté client)
- Délègue la création de l'ordre au backend existant `/api/payments/paypal/create` (REST API)
- Délègue la capture au backend existant `/api/payments/paypal/capture` (REST API)
- Le fan ne quitte jamais Heaven → meilleure conversion
- Le backend reste la source de vérité → webhook idempotent possible

**Activation** : il suffit d'ajouter dans Vercel :
```
NEXT_PUBLIC_PAYPAL_CLIENT_ID = <même CLIENT_ID que PAYPAL_CLIENT_ID mais exposé au client>
```

Si cette variable n'est pas définie, le bouton est silencieusement masqué. Le flow V1 manuel PayPal.me reste actif en parallèle comme fallback. Si la variable est définie, le bouton apparaît à côté du bouton manuel dans l'UnlockSheet.

**Tester en local** :
1. Sandbox PayPal : créer un compte Personal sandbox sur https://developer.paypal.com/dashboard/accounts
2. Utiliser `NEXT_PUBLIC_PAYPAL_CLIENT_ID` = client ID sandbox
3. Paiement test avec le compte Personal sandbox (email + password)
4. Vérifier capture dans `agence_pending_payments` status=`completed`

---

## 3. Revolut Merchant — à mettre en place

### 3.1 Prérequis

- **Compte Revolut Business (pas Personal)** ouvert au nom de SQWENSY ou du titulaire indépendant complémentaire. Plan basique gratuit suffisant pour démarrer.
- KYB validé (Know Your Business) — compter 2 à 5 jours ouvrés.

### 3.2 Étapes d'ouverture et activation Merchant

1. **Ouvrir le compte Revolut Business** sur https://business.revolut.com
   - Choisir le plan `Basic` (gratuit)
   - Sélectionner pays de résidence : Belgique

2. **Compléter le KYB** en fournissant :
   - Pièce d'identité du représentant légal
   - Justificatif de domicile
   - Statut juridique (indépendant complémentaire, SRL, etc.)
   - Lien d'activité (site web de Heaven)
   - Description de l'activité

   > **ATTENTION phrasing KYB** : lors du remplissage, décrire l'activité comme «&nbsp;plateforme de contenus pour créateurs digitaux&nbsp;» ou «&nbsp;creator content platform&nbsp;». Ne pas mentionner explicitement le terme «&nbsp;adult&nbsp;» dans le formulaire initial pour éviter un rejet automatisé. En revanche, ne jamais mentir si un agent humain pose la question directement — la catégorisation fine se négocie avec l'account manager Revolut une fois le compte validé.

3. **Accéder au Merchant API** : une fois le compte validé, aller dans le dashboard Business → `Merchant` → `Get started` → activer l'offre.

4. **Générer l'API Key** : `Merchant → API` → `Generate API Key`
   - Choisir environnement : `Production` (ou `Sandbox` pour tester)
   - Copier immédiatement la clé (elle n'est affichée qu'une seule fois)

5. **Configurer le webhook** : `Merchant → Webhooks → Add webhook`
   - URL : `https://heaven-os.vercel.app/api/payments/revolut/webhook`
   - Événements à cocher : `ORDER_COMPLETED`, `ORDER_PAYMENT_FAILED`, `ORDER_PAYMENT_AUTHENTICATED`, `ORDER_REFUNDED`
   - Copier le `Signing secret` affiché (sert à la vérification HMAC des webhooks)

### 3.3 Env vars Vercel à configurer

```
REVOLUT_API_SECRET_KEY   = <API Key récupérée étape 4>
REVOLUT_WEBHOOK_SECRET   = <Signing secret récupéré étape 5>
REVOLUT_API_URL          = https://merchant.revolut.com/api      # prod
```

Pour le sandbox :

```
REVOLUT_API_URL          = https://sandbox-merchant.revolut.com/api
```

### 3.4 Tarifs Revolut Merchant

- Environ **1,3 % + 0,20 €** par transaction pour cartes européennes (tarifs à jour sur https://revolut.com/business/merchant-services).
- Cartes hors zone EEE : environ 2,8 % + 0,20 €.
- Pas de frais d'ouverture sur le plan Basic.

### 3.5 Avantages

- **Apple Pay natif** : le client final paie en un clic depuis son iPhone ou son Mac.
- **Google Pay natif** : pareil côté Android / Chrome.
- **Payout IBAN BE direct vers Wise** : sortie en un virement SEPA gratuit quotidien (configurable dans les règles Revolut).
- **Pas besoin que le client ait un compte Revolut** : n'importe quelle carte Visa / Mastercard / Amex est acceptée.

### 3.6 Documentation officielle

- Développeur : https://developer.revolut.com/docs/merchant/merchant-api
- API reference : https://developer.revolut.com/docs/api-reference/merchant
- Guide webhooks : https://developer.revolut.com/docs/merchant/webhooks

---

## 4. Wise + Apple Pay

### 4.1 Constat important

Wise Business est un **compte multi-currency**, pas un PSP. Il ne fournit pas nativement de payment links compatibles Apple Pay pour encaisser des clients finaux.

Trois stratégies possibles, classées par pertinence pour Heaven :

### 4.2 Alternative A (recommandée) — Revolut Merchant → payout Wise

Le scénario le plus propre pour Heaven :

1. Le client paie via Revolut Merchant (carte ou Apple Pay)
2. Revolut encaisse sur le compte Business
3. Une règle de payout Revolut est configurée : `Transfer all funds to external account → IBAN Wise Business BE`
4. Wise reçoit le solde quotidiennement, converti si nécessaire, et sert de «&nbsp;tirelire multi-devises&nbsp;» pour les dépenses Heaven

Avantages : Apple Pay natif côté client, visibilité Wise côté trésorerie.

### 4.3 Alternative B — Stripe → payout Wise

Techniquement Stripe propose Apple Pay natif et peut payout vers IBAN Wise, mais :

- **Stripe TOS interdit explicitement l'adult content**
- Le compte est quasi certain de se faire **fermer sans préavis** à la détection
- **Fonds possiblement gelés 90 à 180 jours** en cas de ban

> **Verdict** : ne pas utiliser Stripe pour Heaven, sauf mode urgence extrême (voir §5).

### 4.4 Alternative C — Wise «&nbsp;Request money&nbsp;» (pragmatique V1)

Wise Business propose des liens «&nbsp;Request money&nbsp;» partageables. Le client ouvre le lien et paie depuis sa carte sur le portail Wise.

- Accès : https://wise.com → `Send / Request → Request money` → générer un lien partageable
- Le client peut payer en carte bancaire sur le portail Wise
- **Pas d'Apple Pay natif** — friction plus élevée qu'avec Revolut
- **Pas de webhook** — validation manuelle requise comme PayPal.me

Utile uniquement si PayPal et Revolut sont tous les deux indisponibles. Fonctionne en mode «&nbsp;manual confirm&nbsp;» comme PayPal.me.

### 4.5 Wise Payment Requests API (provider Heaven — BRIEF-16 Phase C)

Un **provider `wise`** est désormais intégré dans le registry Heaven (`src/shared/payment/providers/wise.ts`). Il utilise l'endpoint officiel Wise **Payment Requests** pour générer un lien de paiement direct.

**Ce que le provider fait concrètement** :
1. Le fan clique «&nbsp;Payer avec Wise&nbsp;» dans l'UnlockSheet
2. Le backend Heaven appelle `POST /v3/profiles/{profileId}/payment-requests` de Wise
3. Wise renvoie une URL `wise.com/pay/...`
4. Le fan est redirigé → paie par carte / virement sur le portail Wise
5. Wise crédite le compte Heaven — **pas de webhook natif**, il faut poller `getStatus()`

**Étapes pour brancher Wise** :

1. **Ouvrir un compte Wise Business** sur https://wise.com/business
   - KYB Belgique : pièce ID + RCS + justificatif activité
   - Choisir le plan `Business` (~8 € / mois) — les Payment Requests ne sont pas dispo sur le plan Personal

2. **Générer un API token** :
   - Se connecter → `Settings → API tokens`
   - `Create new token` → scope `Full access` (ou au minimum `read + payment-requests write`)
   - Copier le token — affiché **une seule fois**, le stocker immédiatement

3. **Récupérer le Business Profile ID** :
   - Appeler `GET /v2/profiles` avec le token pour lister les profils
   - Exemple curl :
     ```bash
     curl -H "Authorization: Bearer $WISE_API_TOKEN" https://api.wise.com/v2/profiles
     ```
   - Noter le `id` du profil de type `business` (pas `personal`)

4. **Env vars Vercel** :
   ```
   WISE_API_TOKEN            = <token récupéré étape 2>
   WISE_BUSINESS_PROFILE_ID  = <id récupéré étape 3>
   WISE_API_URL              = https://api.wise.com           # prod
   # Sandbox : https://api.sandbox.transferwise.tech
   ```

5. **Activer le toggle dans le cockpit root** :
   - `/cp/root` → settings → Payment Providers → activer `Wise`
   - Une fois activé, le provider apparaît dans la liste disponible côté fan

**Limites connues Wise Payment Requests** :
- **Pas de webhook natif sur payment-requests v3** au moment de l'écriture (25/04/2026) → la mise à jour du statut se fait par poll `GET /v3/profiles/{profileId}/payment-requests/{id}` (à ajouter au cron si Wise devient primaire)
- **Pas d'Apple Pay natif** — le portail Wise accepte cartes + virements mais pas Apple Pay in-flow
- **Montants > 10 000 €** nécessitent une vérification supplémentaire
- **Taux de change** : si le fan paie dans une autre devise, Wise applique le taux du marché + petite commission

**Documentation officielle** : https://docs.wise.com/api-docs/api-reference/payment-request

### 4.6 Recommandation concrète pour NB

Pour V1 (maintenant, actif en prod) :
- **PayPal.me manuel** canal principal
- **PayPal Checkout SDK** (bouton inline) prêt, à activer dès `NEXT_PUBLIC_PAYPAL_CLIENT_ID` ajouté sur Vercel

Pour V2 (après KYB Revolut) :
- **Revolut Merchant** principal avec Apple Pay / Google Pay
- **PayPal Checkout auto** (SDK) en backup principal
- **Wise Payment Requests** en tertiaire (fan sans carte Apple Pay, virement bancaire)
- **Wise** comme compte de trésorerie (payout Revolut quotidien + consolidation multi-devises)

Pour urgence extrême (PayPal + Revolut simultanément indisponibles) :
- **Stripe** activé temporairement avec `ALLOW_STRIPE=true` et plan B de payout quotidien vers Wise

---

## 5. Stripe — désactivé par défaut (urgence uniquement)

### 5.1 Pourquoi Stripe est OFF par défaut

- Le Terms of Service Stripe interdit explicitement le contenu pour adultes (section 5 — «&nbsp;Restricted Businesses&nbsp;»)
- Les algorithmes internes de Stripe détectent les patterns adult (montants typiques, métadonnées, URLs de redirection) et ferment le compte sans préavis
- En cas de ban, les fonds peuvent être **retenus 90 à 180 jours**

### 5.2 Feature flag

Pour activer Stripe, il faut impérativement :

```
ALLOW_STRIPE = true     # obligatoire, sinon toute activation est rejetée côté serveur
```

Tant que cette variable n'est pas à `true`, le toggle cockpit pour Stripe reste désactivé et renvoie une erreur serveur même si forcé via API.

### 5.3 Env vars Vercel (si activation forcée)

```
STRIPE_SECRET_KEY        = sk_live_...
STRIPE_PUBLISHABLE_KEY   = pk_live_...
STRIPE_WEBHOOK_SECRET    = whsec_...
```

### 5.4 Documentation

https://stripe.com/docs/payments/checkout

### 5.5 Plan B à prévoir absolument

Si Stripe est activé en urgence :
- Retirer les fonds toutes les 24h vers Wise (automated payout `daily`)
- Garder un matelas de liquidité ailleurs (Revolut ou Wise) pour couvrir 90 à 180 jours d'opérations au cas où les fonds Stripe seraient gelés
- Prévoir une sortie immédiate vers Revolut dès que le KYB est de nouveau valide

---

## 6. Webhook security — règles obligatoires

Toute route webhook Heaven (`/api/payments/*/webhook`) doit respecter ces règles :

1. **Vérification signature systématique**
   - PayPal : appel à `/v1/notifications/verify-webhook-signature`
   - Revolut : HMAC SHA-256 du raw body avec `REVOLUT_WEBHOOK_SECRET`, comparé en `timingSafeEqual` au header `Revolut-Signature`
   - Stripe (si activé) : `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`

2. **Anti-replay via table dédiée**
   - Table `agence_webhook_events` avec contrainte `UNIQUE(provider, event_id)`
   - Toute tentative de re-traitement du même `event_id` est ignorée silencieusement avec un log

3. **Stockage raw body**
   - Toujours enregistrer `raw_body` en JSONB pour debug, rejeu manuel et audit légal
   - La signature est conservée dans la colonne `signature TEXT`

4. **Retour 200 rapide**
   - Le webhook doit répondre en 200 en moins de 3 secondes sinon le PSP retente
   - Les traitements longs (génération code, envoi message) passent par `after()` de `next/server` ou une queue

5. **Idempotence côté fulfillment**
   - La fonction `fulfillPayment()` vérifie qu'un code n'a pas déjà été généré pour le même `capture_id` / `order_id` avant insertion

---

## 7. Env vars complètes — checklist Vercel

| Variable | Où l'obtenir | Obligatoire | Phase |
|---|---|---|---|
| `PAYPAL_CLIENT_ID` | developer.paypal.com → App credentials | Si PayPal auto | V2 |
| `PAYPAL_SECRET` | developer.paypal.com → App credentials | Si PayPal auto | V2 |
| `PAYPAL_WEBHOOK_ID` | developer.paypal.com → Webhooks | Si PayPal auto | V2 |
| `PAYPAL_API_URL` | `https://api-m.paypal.com` (prod) ou sandbox | Si PayPal auto | V2 |
| `REVOLUT_API_SECRET_KEY` | Revolut Business → Merchant → API | Si Revolut | V2 |
| `REVOLUT_WEBHOOK_SECRET` | Revolut Business → Merchant → Webhooks | Si Revolut | V2 |
| `REVOLUT_API_URL` | `https://merchant.revolut.com/api` (prod) | Si Revolut | V2 |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys | Urgence | V2 |
| `STRIPE_PUBLISHABLE_KEY` | idem | Urgence | V2 |
| `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com → Webhooks | Urgence | V2 |
| `ALLOW_STRIPE` | à définir manuellement `true` ou `false` | Toujours | V1+V2 |

**PayPal.me manuel** (V1) ne nécessite aucune env var — juste le handle stocké en DB dans `agence_models.config.paypal_handle`.

**Comment ajouter une env var sur Vercel** :
```
vercel env add PAYPAL_CLIENT_ID production
```
ou via l'UI : `Project → Settings → Environment Variables → Add`.

---

## 8. Flow V1 → V2 — migration par provider

Chaque provider peut être basculé individuellement de `mode: 'manual'` (V1) à `mode: 'checkout'` (V2) via le toggle cockpit.

Protocole recommandé :

1. **Configurer l'App PayPal / Revolut** en sandbox d'abord (env var `*_API_URL` pointant vers sandbox)
2. **Activer le toggle** en mode checkout depuis `/cp/root/settings/payments` ou `/agence/settings/payments`
3. **Tester un achat complet** depuis un navigateur incognito avec une carte sandbox
4. **Vérifier la chaîne** : webhook reçu → ligne `agence_webhook_events` créée → code `agence_codes` généré → message auto envoyé
5. **Basculer les env vars sur prod** (`*_API_URL` vers endpoint production)
6. **Refaire un test réel** avec une petite transaction (5 €)
7. **Activer le provider en prod** pour tous les fans

Un rollback est possible à tout moment : remettre le toggle en mode `manual` ou `disabled` coupe le flow automatique. Les commandes déjà en cours restent valides.

---

## 9. Support fiscal belge — DAC7

La directive européenne DAC7 (transposée en Belgique via la loi du 21 décembre 2022) impose aux plateformes numériques de déclarer à l'administration fiscale les revenus des vendeurs si :

- Revenus plateforme **≥ 2&nbsp;000 €/an**, OU
- **≥ 30 transactions** par an

### Export mensuel recommandé

Depuis la table `agence_pending_payments` (filtrée sur `status = 'completed'`), exporter un CSV avec :

- Date de transaction
- Montant (EUR, TTC)
- Référence interne (`reference_code`)
- Pseudonyme client (pseudo_web)
- Provider utilisé (paypal, revolut, manual, stripe)
- Modèle concernée (Yumi / Paloma / Ruby)
- Pack ou breakdown custom

### À transmettre au comptable

- **Fréquence** : mensuelle (clôture mensuelle comptable BE)
- **Format** : CSV ou XLSX
- **Deadline légale annuelle** : avant le **31 janvier** de l'année suivante

Oubli = amende administrative proportionnelle au chiffre non déclaré. Ne pas négliger.

Un endpoint d'export sera ajouté dans le cockpit modèle : `/api/agence/payments/export?from=YYYY-MM-DD&to=YYYY-MM-DD` retournant un CSV signé.

---

## 10. FAQ support — procédure «&nbsp;correction pseudo&nbsp;»

Cas classique : un fan paie via PayPal mais se trompe de pseudo, ou crée un second compte avec un pseudo différent. Procédure à suivre pour lui redonner accès sans remboursement :

### Côté fan

1. Se **reconnecter sur la plateforme** avec le bon pseudo (ou en créer un nouveau si c'est trop tard)
2. Envoyer un message dans la messagerie de la modèle, au format :
   ```
   Correction pseudo : référence YUMI-PGLD-K3M9X2 — ancien pseudo @mikeee92 — nouveau pseudo @mike_92
   ```
3. Attendre validation

### Côté agent IA / système

- L'agent IA détecte l'intent via `detectPseudoCorrection()` (pattern regex : `correction|erreur|trompé|mauvais pseudo` + référence `[A-Z]+-P[A-Z0-9]+`)
- Il alerte automatiquement la modèle dans le cockpit avec un badge «&nbsp;Demande correction pseudo&nbsp;»
- Il affiche côté modèle le match probable : `pending_payments` filtré sur la référence extraite du message

### Côté modèle

1. Ouvrir le cockpit `/agence/payments → Demandes de correction`
2. Vérifier manuellement sur PayPal :
   - L'email reçu contient-il bien la référence annoncée ?
   - Le montant correspond-il au pack revendiqué ?
   - La date est-elle récente (moins de 30 jours) ?
3. Si match confirmé : cliquer sur «&nbsp;Transférer le code au nouveau compte&nbsp;»
4. Le code existant est alors réassigné au nouveau `client_id` sans génération d'un nouveau paiement

### Cas de refus

- Aucune trace du paiement PayPal → refuser et répondre au fan (template automatique)
- Montant non cohérent → refuser avec motif
- Demande suspectée frauduleuse (tentative de doubler un accès) → refuser et logger dans `agence_auth_events` pour audit

La procédure est volontairement **asynchrone** : le fan attend la validation humaine de la modèle, l'agent IA ne tranche jamais seul sur un remboursement ou un transfert de code.

---

## Ressources utiles

- Documentation PayPal Checkout : https://developer.paypal.com/docs/checkout/
- Documentation Revolut Merchant : https://developer.revolut.com/docs/merchant/merchant-api
- Documentation Wise Business : https://wise.com/help/business
- DAC7 Belgique : https://finance.belgium.be/fr/entreprises/tva/declarations/dac7
- Code de droit économique belge (adulte / contenu numérique) : Livre VI art. VI.53

# Decisions — Module Payments

> Append-only. Format ADR (Context / Decision / Consequences).

---

## ADR-001 — Architecture modulaire providers (interface unifiée + registry)

**Date** : 2026-04-25
**Status** : Accepted (BRIEF-16 cadrage NB)

### Context
Heaven a besoin d'encaisser des packs creator (Silver/Gold/VIP Black/VIP Platinum/Custom)
via plusieurs providers dont la disponibilité varie selon TOS adult content (Stripe interdit,
PayPal zone grise, Revolut pas d'interdiction explicite, PayPal.me manuel toléré). Le choix
du provider doit être activable/désactivable par cockpit sans redéploiement, et l'ajout d'un
nouveau provider ne doit pas demander de refactor du flow d'achat.

### Decision
Créer une interface `PaymentProvider` unifiée (`createPayment`, `verifyWebhook`, `getStatus`,
`refund?`) avec un registry qui lit `agence_settings.payment_providers` JSONB pour déterminer
les providers actifs à exposer au front. Quatre providers au lancement : `manual` (PayPal.me
V1), `paypal` (Checkout V2), `revolut` (Merchant V2), `stripe` (squelette feature-flagged OFF).

### Consequences
- (+) Ajout d'un provider = 1 wrapper + 1 toggle JSONB, aucun changement flow
- (+) Désactivation instantanée en cas de ban sans redéploiement
- (+) Stripe reste dormant mais prêt si urgence (PayPal + Revolut simultanés HS)
- (−) JSONB pas contraint par schema (risque divergence) → validation Zod runtime obligatoire

---

## ADR-002 — V1 manuel PayPal.me avec référence human-readable

**Date** : 2026-04-25
**Status** : Accepted (BRIEF-16 cadrage NB)

### Context
PayPal.me ne supporte pas query param `?note=` : impossible de pré-remplir la note automatiquement.
Le matching manuel côté cockpit doit se faire sur 3 critères : pseudo PayPal du fan, montant, note.
Risque : fan qui oublie de copier la référence → aucune corrélation possible.

### Decision
Format référence : `{MODEL_SLUG_UPPER}-P{PACK_ID}-{RAND6}` (ex `YUMI-PGLD-K3M9X2`).
- 6 chars random alphanumériques base32 sans voyelles ambiguës
- Affiché en gros dans la modal d'achat avec bouton "Copy" proéminent avant redirect PayPal.me
- Stocké dans `agence_pending_payments.reference_code` (UNIQUE partiel, ignore NULL)
- Pseudo web fan stocké dans `pseudo_web` (distinct du pseudo PayPal pour matching fuzzy)
- Status de départ : `awaiting_manual_confirm` ; rejet possible via `rejected_reason`

### Consequences
- (+) UX fan : 1 copy + 1 paste dans note PayPal
- (+) Matching cockpit : grep par référence = O(1) via index unique partiel
- (+) Audit complet conservé pour litige/correction pseudo (pas de silent delete)
- (−) Fan peut encore se tromper → procédure correction via Agent IA (BRIEF-16 décision 3)

---

## ADR-003 — Webhook anti-replay via UNIQUE(provider, event_id)

**Date** : 2026-04-25
**Status** : Accepted (BRIEF-16 cadrage NB)

### Context
PayPal, Revolut et Stripe peuvent re-fire un webhook plusieurs fois (retry on timeout,
double-envoi accidentel). Sans garde-fou, chaque retry déclencherait `fulfillPayment()` →
génération de plusieurs codes d'accès pour un seul paiement. Inacceptable pour le fan
et pour les stats revenue.

### Decision
Table `agence_webhook_events` avec contrainte `UNIQUE(provider, event_id)`. Chaque handler
webhook fait un `INSERT ... ON CONFLICT DO NOTHING` en premier — si déjà présent, pas de
fulfillment. `raw_body` JSONB conservé pour audit et replay manuel si besoin. `verified`
boolean trace si la signature HMAC/RSA a été validée.

### Consequences
- (+) Idempotence garantie niveau DB (pas de race condition applicatif)
- (+) Audit forensics complet (raw_body + signature)
- (+) Replay manuel possible en cas de bug fulfillment
- (−) Table va grossir → TTL/archivage à prévoir >6 mois (hors scope V1)

---

## ADR-004 — Custom pricing : table + multiplicateurs (×1/×2/×4/×8) + pied ×3

**Date** : 2026-04-25
**Status** : Accepted (BRIEF-16 cadrage NB)

### Context
Le pack "Custom" est un panier composable : fan choisit types (photo/video) × catégories
(silver/gold/vip_black/vip_platinum) × quantités + description libre. Les prix unitaires
doivent être modifiables par modèle (chaque creator peut ajuster sa tarification).

### Decision
Table `agence_custom_pricing` avec UNIQUE(model, media_type, category). Prix unitaire =
`base_price_cents × multiplier` ; contenu pied = +`pied_multiplier` (×3 par défaut).
Grille standard seed pour tous les modèles actifs (m1=Yumi, m2=Paloma, m3=Ruby) :
- Photo : 500 cents base × (silver=1, gold=2, vip_black=4, vip_platinum=8)
- Video : 1000 cents base /minute × mêmes multiplicateurs
- Pied : ×3 sur le prix catégorie

Breakdown panier stocké dans `agence_pending_payments.pack_breakdown` JSONB :
`{items:[{type,category,quantity,unit_price,duration_min?,pied?}], description, total_cents}`.

### Consequences
- (+) Grille modifiable par modèle sans migration (UPDATE direct)
- (+) Audit quote historique via breakdown JSONB
- (+) Frontend peut afficher total live sans round-trip API (calcul client validé server-side)
- (−) Ajout d'une nouvelle catégorie = migration (CHECK constraint sur `category`)
- (−) Pas de versioning des prix → si modèle change grille, quote ancienne peut mismatcher
  (mitigé par immutabilité du `pack_breakdown` stocké au moment de la commande)

---

## ADR-005 — Singleton `agence_settings` (id='global') vs scoping par modèle

**Date** : 2026-04-25
**Status** : Accepted

### Context
Le brief demande `agence_settings.payment_providers` JSONB. Deux designs possibles :
(a) table singleton avec 1 row unique, (b) table par modèle (clé `model_id`).

### Decision
Singleton `id='global'` (VARCHAR(32) PK) avec seed automatique. Les toggles providers
s'appliquent globalement à Heaven — un seul compte Heaven Agence, donc un seul settings.

Si besoin futur de scoper par modèle (ex : Yumi accepte PayPal mais Paloma pas de PayPal
car risque ban différent), ajouter une colonne optionnelle `model_id` avec override logic :
`getProviderConfig(modelId)` = fusion `global ∪ per_model_override`.

### Consequences
- (+) Simplicité extrême V1 — 1 row, 1 JSON
- (+) Évolution possible sans breaking change (ajout `model_id` colonne optionnelle)
- (−) Pas de scoping fin initialement → acceptable car besoin non avéré à date

---

## Références croisées

- Brief source : `plans/PMO/briefs/BRIEF-2026-04-25-16-packs-payment-providers.md`
- Migrations DB :
  - `supabase/migrations/073_payment_providers_toggle.sql` (settings + pending_payments ext)
  - `supabase/migrations/074_webhook_events_antireplay.sql` (anti-replay)
  - `supabase/migrations/075_custom_pricing.sql` (custom pricing + seed m1/m2/m3)
- Module lié : `plans/modules/contenu-packs/` (paywall + visibility rules)

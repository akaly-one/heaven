# RISKS — Heaven

> Matrice des risques identifiés + mitigations.
> Source complète : [`business/bp-agence-heaven-2026-04/`](../business/bp-agence-heaven-2026-04/) §8 + [`STRATEGY-v1.2026-04-21.md`](./STRATEGY-v1.2026-04-21.md).
> Mises à jour via ADR si nouveau risque majeur.

---

## 1. Matrice des risques

Légende : 🔴 Existentielle / 🟠 Élevée / 🟡 Moyenne / 🟢 Basse

### 1.1 Risques plateforme / externe

| Risque | Modes | Gravité | Mitigation |
|---|---|---|---|
| Ban compte Fanvue agence `yumiclub` | A, B | 🔴 | DMCA strict + backup Fansly/Loyalfans migration 2 sem préparée |
| Ban compte caming (Stripchat, etc.) | B, C | 🟡 | Diversification 2-3 plateformes cam d'office + respect règles redirection |
| Shadowban IG `@Yumiiiclub` ou comptes TikTok | A, B, C | 🟠 (certain) | Multi-comptes J1 (2 backups par persona), rotation hashtags, analyse shadowban hebdo |
| AI Act UE durcissement (enforcement 2 août 2026) | A | 🟡 | Label `#AI #Virtual` bio + tag tous posts dès Q3 ; veille mensuelle ; bascule 100 % Mode B si IA non-viable |
| IA plateforme non autorisée (Meta change rules) | A | 🟡 | Veille + pivot TikTok/X si Meta pivot |
| Fanvue pivot (acquisition, fermeture) | A, B | 🟠 | Stack tech Heaven OS indépendante + Fansly/Loyalfans backup |

### 1.2 Risques légaux / fiscaux

| Risque | Modes | Gravité | Mitigation |
|---|---|---|---|
| Modèle en chômage BE non déclarée | B | 🔴 **existentielle pour la modèle** | **Check OBLIGATOIRE ONEM avant signature** (Article 48 / Tremplin indépendant) ; blocage onboarding si `statut_initial_verified = false` |
| Violation Release Form (mineur, ID faux) | B | 🔴 existentielle | Vérification ID stricte + 2e source + doc dated headshot + age check |
| Doxing modèle (Plan Shadow compromis) | B, C | 🟠 | Hygiène EXIF stricte + neutralisation décors + audit régulier métadonnées |
| Contrôle fiscal BE | A, B, C | 🟡 (coûteuse) | Compta à jour dès M1 + provisionnement 30 % + comptable spécialisé |
| Contrat Agence↔Modèle attaqué | B | 🟡 | Contrat type avocat + clause médiation préalable + juridiction BE |
| RGPD non-compliance (ID docs modèles) | B, C | 🟡 | Chiffrement pgsodium + log accès + scopes `dmca:read` stricts |
| Plafond droit à l'image 2026 change | B | 🟡 | Validation comptable annuelle ; paliers P1/P2 redéfinis si nécessaire |

### 1.3 Risques business

| Risque | Modes | Gravité | Mitigation |
|---|---|---|---|
| Conversion PPV < 2 % | A, B | 🟠 | Pivot abo payant 9,99 $/mois dès M6 si freemium ne convertit pas |
| Retrait / conflit modèle Mode B | B | 🟡 | Contrat clauses retrait claires + pipeline recrutement continu |
| Harcèlement viewer caming | B, C | 🟡 | Modération stricte + règles publiées + ban rapide via agent IA modérateur |
| Épuisement modèle | B | 🟡 | 2-4 h live/jour, 5 j/sem max, rotation + pauses imposées |
| Client Mode C insatisfait | C | 🟡 | Clauses performance réciproque + scoring avant onboarding + RDV mensuel |

### 1.4 Risques financiers / opérationnels

| Risque | Modes | Gravité | Mitigation |
|---|---|---|---|
| Refus bancaire (adult-unfriendly BE) | A, B, C | 🟡 | Revolut + Wise + compte crypto en parallèle |
| Cashflow négatif 6 premiers mois | A | 🟡 | Budget bootstrap strict < 2 000 €/6 mois + trésorerie SQWENSY ≥ 3 mois charges |
| Dépendance bancaire Wise | Tous | 🟢 | Revolut backup + Wise multi-devises |
| Token Meta révoqué | A, B, C | 🟢 | Endpoint `/api/instagram/exchange-token` prêt pour re-génération |
| Rate limit Meta saturé (pic pub) | A, B, C | 🟡 | Queue worker + throttle 180 calls/h respecté ; back-pressure via `ig_reply_queue` |
| Vercel Hobby saturé (cron 1/jour) | Tous | 🟡 | Migration Upstash QStash ou Vercel Pro (D-6) |
| Supabase quota (storage/compute) | Tous | 🟢 | Monitoring mensuel + upgrade prévu si scale |

### 1.5 Risques techniques / sécurité

| Risque | Modes | Gravité | Mitigation |
|---|---|---|---|
| Clés Supabase leakées (incident ouvert) | Tous | 🔴 (actif avril 2026) | **Rotation obligatoire 3 clés service_role** + maj env Vercel 4 projets + redeploy |
| JWT secret compromis | Tous | 🟡 | Rotation trimestrielle + invalidation sessions |
| RLS policy bug (cross-model_id) | Tous | 🟠 | Tests automatisés multi-entity + audit trimestriel |
| Webhook IG latency > 500 ms | A, B, C | 🟡 | Pattern async enqueue + RPC atomique |
| Cache Next.js corruption dev | — | 🟢 | `rm -rf .next` + predev script + Webpack |

### 1.6 Risques cross-CP / confidentialité SQWENSY

| Risque | Gravité | Mitigation |
|---|---|---|
| Leak association Heaven ↔ SQWENSY public | 🔴 | Silo strict : README, OG, footer Heaven ne mentionnent jamais SQWENSY ; aucun `NEXT_PUBLIC_SQWENSY_*` |
| Vrai prénom stocké en DB/code/commit | 🔴 | Audit mensuel + hook pre-commit + scrub backups |
| Contamination commits cross-CP | 🟡 | Chaque repo client pushé indépendamment depuis son folder |

---

## 2. Priorisation P0

Risques à traiter **immédiatement** :

1. 🚨 **Clés Supabase leakées** — rotation obligatoire (alerte active depuis 2026-04-18)
2. 🔴 **Check ONEM PALOMA** avant signature contrat (bloquer onboarding si non-vérifié)
3. 🔴 **App Review Meta en attente** — Business Verification SQWENSY → unlock DMs prod (D-4)
4. 🟠 **Multi-comptes IG J1** pour Yumi — anti-shadowban (si pas déjà fait)

---

## 3. Plans de contingence

### 3.1 Ban Fanvue
1. Notification immédiate NB
2. Archive contenu dernier drop (Cloudinary)
3. Migration vers Fansly / Loyalfans (templates prêts)
4. Communication audience via IG + Snap
5. Délai : < 2 semaines

### 3.2 AI Act non-viable
1. Pivot Mode A → 100 % Mode B (modèles réelles)
2. Yumi transformée en persona IA « assistante » non-publiée
3. Infrastructure reste opérationnelle (multi-profil déjà en place)

### 3.3 Faillite modèle Mode B
1. Retrait contenu sous 7 jours (contrat)
2. Confirmation email + log immuable
3. Dernier versement normal mois en cours
4. Archive sources dans bucket privé

### 3.4 Contrôle fiscal
1. Compta à jour en permanence (pas de retard)
2. Provisionnement 30 % systématique
3. Comptable spécialisé à contacter immédiatement
4. Documents justificatifs paliers prêts (PDF auto-générés)

---

## 4. Indicateurs à surveiller

Intégration via module `modules/agence-modules/` (Ops) :

- Quota Meta Graph API restant (target > 20 %)
- Latency webhook IG (< 500 ms p95)
- Erreurs cron worker (< 1 % sur 24h)
- RLS policy violations (0 tolerance)
- Clés secrets rotation (timestamp dernière rotation)
- Shadowban IG status (check hebdo)

---

## 5. Revue risques

- Cadence : **mensuelle** (entry CHANGELOG PLANS)
- Nouveau risque identifié → ADR dans `plans/DECISIONS.md`
- Clôture d'un risque (mitigé durablement) → ADR « Superseded » + entry ici

---

## 6. Pointers

- BP Cowork §8 : [`business/bp-agence-heaven-2026-04/`](../business/bp-agence-heaven-2026-04/)
- Stratégie : [`STRATEGY-v1.2026-04-21.md`](./STRATEGY-v1.2026-04-21.md)
- Sécurité tech : [`../03-tech/SECURITY-v1.2026-04-21.md`](../03-tech/SECURITY-v1.2026-04-21.md)
- Maintenance : [`../04-ops/MAINTENANCE-v1.2026-04-21.md`](../04-ops/MAINTENANCE-v1.2026-04-21.md)

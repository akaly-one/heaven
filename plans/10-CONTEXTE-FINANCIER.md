# 10 — Contexte financier

## Business model

SaaS de gestion d'abonnements — commission 25% plateforme sur toutes transactions.

### Flux revenus
1. Fan accède à un profil via code temporaire (free)
2. Souscrit un tier ou achète un pack (transaction unique ou récurrente)
3. Paiement capté via PayPal / Revolut → Heaven encaisse
4. Heaven reverse 75% au créateur, retient 25%

### Charges fixes (2026-Q2)
- Vercel Pro : ~20 EUR/mois
- Supabase Pro : ~25 EUR/mois
- Cloudinary : ~0 EUR (free tier encore viable)
- Resend : ~0 EUR (plan gratuit 3k/mois)
- Domaine : ~10 EUR/an
- **Total : ~45 EUR/mois**

### Break-even
~2 profils en Phase 2 (550-1500 EUR/mois de commission agence) couvrent toutes charges + coûts variables (Cloudinary upgrade, Supabase scale).

## Projections

| Scénario | Profils | CA créateur/mois | Commission Heaven | Marge (après charges) |
|----------|---------|-------------------|---------------------|------------------------|
| Phase 1 | 2 | 4 000 EUR | 1 000 EUR | +955 EUR |
| Phase 2 | 3 | 45 000 EUR | 11 250 EUR | +11 200 EUR |
| Phase 3 | 5 | 75 000 EUR | 18 750 EUR | +18 700 EUR |
| Phase 4 | 10 | 150 000 EUR | 37 500 EUR | +37 400 EUR |

Horizon 12 mois : 3 profils en performance moyenne = **~135 000 EUR/an revenus agence**.

## Structure commerciale

- Commission fixe 25% (non négociable court terme)
- Paiement créateur mensuel auto (J+5 après capture)
- Compensation créateur : indépendant (freelance) ou dividendes (si SRL)
- Pas de retainer — pay as you earn

## TAM / SAM

- TAM creator economy : ~250 MM USD monde (croissance 15-20%/an)
- SAM Europe FR/BE : ~8 MM USD (sous-exploité, beaucoup de créatrices mono-Snap)
- SOM réaliste 2027 : 10-20 profils = 1-3 MM EUR CA créateur = 250-750k EUR commission

## Risques financiers

- **KYC paiements** : retard Stripe Connect bloque scale
- **Chargeback rate** : à monitorer (target < 1%)
- **Dépendance ~1-2 top profils** : concentration CA à mitiger
- **Coût infra** : Cloudinary explose avec vidéo HD → budget upgrade prévu

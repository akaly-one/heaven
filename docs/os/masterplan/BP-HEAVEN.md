# BUSINESS PLAN DEFINITIF — HEAVEN OS / SQWENSY AGENCE

> **CONFIDENTIEL — Usage interne exclusif**
> Version 2.0 — 7 avril 2026
> Document vivant — Source unique de verite pour le projet Heaven OS
> Ne pas partager, imprimer ni transmettre sans autorisation explicite du fondateur

---

## TABLE DES MATIERES

1. [Resume Executif](#1-resume-executif)
2. [Architecture Technique Complete](#2-architecture-technique-complete)
3. [Comptes & Services Lies](#3-comptes--services-lies)
4. [Business Model](#4-business-model)
5. [Tier System — Poker Branding](#5-tier-system--poker-branding)
6. [Fonctionnalites Implementees](#6-fonctionnalites-implementees)
7. [Fonctionnalites Pending](#7-fonctionnalites-pending)
8. [Roadmap Phases](#8-roadmap-phases)
9. [KPIs & Metriques](#9-kpis--metriques)
10. [Risques & Mitigation](#10-risques--mitigation)
11. [Integration Ecosysteme SQWENSY](#11-integration-ecosysteme-sqwensy)
12. [Restructuration Profil Avril 2026](#12-restructuration-profil-avril-2026)
13. [Securite](#13-securite)
14. [Changelog](#14-changelog)

---

## 1. RESUME EXECUTIF

**Heaven OS** est la plateforme technologique proprietaire de **SQWENSY Agence**, branche de gestion de profils creatrices du groupe SQWENSY. Elle opere dans la **creator economy** — marche evalue a ~250 milliards USD (TAM), en croissance structurelle de 15-20% par an.

**Differenciation centrale :** Heaven OS n'est pas un clone OnlyFans. C'est un **SaaS de gestion d'abonnements sans compte traditionnel**, base sur un modele d'identite sociale (handle Snap/Insta) et d'acces par code temporaire. Les creatrices continuent a utiliser leur Snapchat natif pour les lives et la livraison de contenu — Heaven OS gere la monetisation, les abonnements et la relation fan.

| Champ | Valeur |
|-------|--------|
| Produit | SaaS multi-profil de gestion d'abonnements pour creatrices de contenu exclusif |
| URL Live | heaven-os.vercel.app |
| Stack | Next.js 15 / React 19 / TypeScript / Tailwind v4 / Supabase / Cloudinary / Vercel |
| Profils actifs | YUMI (@yumiiiclub, `#E84393`), RUBY (`#9B6BFF`), PALOMA (à activer) — aucun vrai prenom stocke nulle part |
| Modele revenue | 25% commission plateforme sur toutes transactions |
| Marche | Creator economy — $250B TAM |
| Break-even | ~2 profils en Phase 2 (~45 EUR/mois de charges fixes) |

**Projection court terme :**
- 2 profils actifs en Phase 2 de croissance : **1.100-3.000 EUR de part agence/mois**
- 3 profils en performance moyenne : **~135.000 EUR/an** de revenus agence (commission 25% sur ~540K createur)
- Break-even atteint des Phase 1 avec 2 profils (charges fixes actuelles = 0 EUR)

**Statut actuel :** Plateforme fonctionnelle deployee. Auth JWT, dashboard CP complet, CRM clients, galerie tier-locked, system de codes, pipeline contenu, security (fingerprint + screenshot detection), story system, payment flow automatise. Chantiers ouverts : paiements live (Stripe), auth Supabase reelle, multi-modele operationnel, BEACON IA.

---

## 2. ARCHITECTURE TECHNIQUE COMPLETE

### 2.1 Stack Technologique

| Couche | Technologie | Version / Details |
|--------|-------------|-------------------|
| Framework | Next.js | 15 (App Router) |
| UI Library | React | 19 |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS | v4 (PostCSS) |
| Database | Supabase | PostgreSQL managed |
| Media Storage | Cloudinary | Cloud `ddwgcu3d5`, folders `heaven/{model}/` |
| Auth | JWT HMAC-SHA256 | Via `jose`, codes temporaires, sessionStorage |
| Icons | lucide-react | + Symboles poker custom (&#9827;&#9830;&#129462;&#9824;&#9829;) |
| Image Generation | html-to-image | Story generator 3 modes |
| Deployment | Vercel | Auto-deploy from main branch |

### 2.2 Schema Base de Donnees (Supabase PostgreSQL)

**Tables principales (9+) :**

| Table | Role | Relations cles |
|-------|------|----------------|
| `agence_models` | Profils creatrices (nom, slug, couleur, status, mood) | PK: id |
| `agence_clients` | Fans/abonnes (handle social, tier, credits, blocked) | FK: model_id |
| `agence_codes` | Codes d'acces temporaires (code, tier, expiry, used) | FK: model_id, client_id |
| `agence_posts` | Publications du feed | FK: model_id |
| `agence_uploads` | Media uploades (images galerie) | FK: model_id |
| `agence_wall_posts` | Publications mur communautaire | FK: model_id |
| `agence_messages` | Messages clients-modeles | FK: model_id, client_id |
| `agence_purchases` | Historique transactions | FK: model_id, client_id |
| `agence_fan_lifecycle` | Tracking cycle de vie fan | FK: model_id, client_id |
| `agence_content_pipeline` | Pipeline idea-to-published | FK: model_id |
| `agence_platform_accounts` | Comptes reseaux sociaux | FK: model_id |
| `agence_goals` | Objectifs par modele | FK: model_id |
| `agence_code_devices` | Fingerprints appareils par code | FK: code_id |
| `agence_client_connections` | Historique connexions | FK: client_id |
| `agence_security_alerts` | Alertes securite (screenshot, multi-device) | FK: model_id, client_id |
| `agence_packs` | Packs/tiers de prix | FK: model_id |

**Migrations SQL appliquees : 22**

### 2.3 API Routes (29 endpoints)

| Groupe | Endpoints | Operations |
|--------|-----------|------------|
| **Accounts** | `/api/accounts` | CRUD comptes |
| **Clients** | `/api/clients`, `clients/cleanup`, `clients/orders`, `clients/visit` | CRUD, nettoyage, commandes, tracking visites |
| **Codes** | `/api/codes`, `codes/security` | Generation, validation, securite |
| **Credits** | `/api/credits/balance`, `credits/purchase`, `credits/topup` | Solde, achat, recharge |
| **Messages** | `/api/messages` | Polling adaptatif (5s/15s) |
| **Models** | `/api/models`, `models/[slug]`, `models/activate`, `models/media` | CRUD, activation, gestion media |
| **Packs** | `/api/packs` | CRUD packs/tiers |
| **Pipeline** | `/api/pipeline`, `pipeline/fans`, `pipeline/goals`, `pipeline/platforms` | Content pipeline, fan tracking, objectifs, plateformes |
| **Posts** | `/api/posts` | CRUD publications |
| **Wall** | `/api/wall` | Mur communautaire |
| **Upload** | `/api/upload`, `upload/cleanup` | Upload Cloudinary + nettoyage orphelins |
| **Uploads** | `/api/uploads` | Listing media |
| **Purge** | `/api/purge` | Nettoyage donnees |
| **Security** | `/api/security/screenshot-alert` | Alertes captures ecran |
| **SQWENSY** | `/api/sqwensy` | Bridge tunnel vers HQ |

---

## 3. COMPTES & SERVICES LIES

### 3.1 Services actifs

| Service | Plan actuel | Cout | Limite | Palier suivant | Declencheur upgrade |
|---------|-------------|------|--------|----------------|---------------------|
| **Vercel** | Hobby (free) | 0 EUR | 100GB bandwidth, 1 deploy/commit, no team | Pro $20/mois | >100GB bandwidth OU besoin preview deploys OU domaine custom SSL |
| **Supabase** | Free | 0 EUR | 500MB DB, 1GB storage, 50K auth users, 500K edge invocations | Pro $25/mois | >500MB DB OU >1GB storage OU besoin backups point-in-time |
| **Cloudinary** | Free | 0 EUR | 25 credits/mois (~25GB storage + transforms) | Plus $89/mois | >25 credits/mois OU besoin video transforms OU >10GB storage |
| **GitHub** | Free | 0 EUR | Unlimited repos, 500MB packages | Team $4/user/mois | Besoin branch protection rules OU code owners |
| **Domain** | N/A | 0 EUR | heaven-os.vercel.app subdomain | Custom ~12 EUR/an | Branding pro, SEO, confiance client |
| **Email** | Gmail free | 0 EUR | yumiiiclub@gmail.com | Google Workspace $6/mois | Besoin @heaven-os.com OU multi-user |
| **n8n** | Partage SQWENSY | Variable | Shared avec SQWENSY | Dedie si >20 workflows | >20 workflows actifs Heaven-specifiques |

### 3.2 Paliers de croissance infrastructure

| Phase | Periode | Profils | Services payes | Cout mensuel |
|-------|---------|---------|----------------|--------------|
| **Phase 1** | 0-6 mois | 1-2 | Aucun (tout gratuit) | **0 EUR/mois** |
| **Phase 2** | 6-18 mois | 5+ | Vercel Pro + Supabase Pro | **~45 EUR/mois** |
| **Phase 3** | 18+ mois | 20+ | + Cloudinary Plus + Domain + Email | **~150 EUR/mois** |
| **Phase 4** | Scale | 50+ | Enterprise tiers | **~500 EUR/mois** |

> **Note strategique :** Le modele est concu pour rester a 0 EUR de charges fixes aussi longtemps que possible. Chaque upgrade est declenche par un seuil mesurable, jamais anticipe. Le break-even est immediatement atteint des le premier profil actif generant des revenus.

---

## 4. BUSINESS MODEL

### 4.1 Modele de revenus

**Commission plateforme : 25% sur toutes les transactions**

Les 4 flux de revenus :

| Flux | Description | Part du CA estime |
|------|-------------|-------------------|
| **Contenu exclusif** | Abonnements mensuels via codes temporaires (tiers Silver a Platinum) | 60% |
| **Codes abonnement** | Achat one-shot de codes d'acces, renouvellements | 25% |
| **Collaborations** | Shoots, contenus sponsorises, brand deals | 10% |
| **Merchandising** | Produits derives via SQWENSY Brands (futur) | 5% |

### 4.2 Modes de compensation (Droit belge)

| Mode | Mecanisme | Fiscalite | Usage |
|------|-----------|-----------|-------|
| **1. Independant complementaire** | Split 50/50 brut, le profil facture l'agence | TVA 21% + IPP progressif | Demarrage, test |
| **2. Droit d'image** | Cession droits, fee fixe ou % | Taxe forfaitaire 15% | Optimise pour profils matures |
| **3. Associe** | Dividendes apres ISOC | ISOC 20-25% + prelevement 30% | Long terme, profils strategiques |

### 4.3 Projections revenue par profil (part agence = 50% de la commission 25%)

| Phase | Periode | Revenue createur/mois | Commission 25% | Part agence (50%) |
|-------|---------|----------------------|-----------------|---------------------|
| **Phase 1** | 1-6 mois | 1.200-4.000 EUR | 300-1.000 EUR | **150-500 EUR** |
| **Phase 2** | 6-18 mois | 4.400-12.000 EUR | 1.100-3.000 EUR | **550-1.500 EUR** |
| **Phase 3** | 18+ mois | 13.000-36.000 EUR | 3.250-9.000 EUR | **1.625-4.500 EUR** |

### 4.4 Scenarios de croissance

| Scenario | Profils | Revenue agence/an | Charges/an | Benefice net |
|----------|---------|-------------------|------------|--------------|
| **Conservateur** | 2 profils Phase 2 | 13.200-36.000 EUR | 540 EUR | 12.660-35.460 EUR |
| **Moyen** | 5 profils mixtes | 48.000-90.000 EUR | 1.800 EUR | 46.200-88.200 EUR |
| **Ambitieux** | 10 profils, 3 Phase 3 | 120.000-300.000 EUR | 6.000 EUR | 114.000-294.000 EUR |
| **Scale** | 50 profils SaaS B2B | 500.000+ EUR | 60.000 EUR | 440.000+ EUR |

> **Break-even :** Atteint des qu'un seul profil genere >45 EUR/mois de commission (Phase 2 infrastructure) — soit un createur generant ~180 EUR/mois de revenus bruts. Avec l'infrastructure gratuite actuelle, le break-even est a 0 EUR.

---

## 5. TIER SYSTEM — POKER BRANDING

Le systeme de tiers utilise un branding poker original pour differencier les niveaux d'acces :

| Tier | Symbole | Badge | Prix | Acces |
|------|---------|-------|------|-------|
| **Silver** | &#9827; | &#9827; | 50 EUR | Galerie basique, posts publics |
| **Gold** | &#9830; | &#10022; | 100 EUR | + bonus Fanvue, contenus exclusifs |
| **Feet** | &#129462; | &#129462; | Variable | Niche feet content, galerie dediee |
| **VIP Black** | &#9824; | &#9824; | 200 EUR | + face content + nude express |
| **VIP Platinum** | &#9829; | &#9819; | 350 EUR | Tout inclus + custom content sur demande |

**Mecaniques :**
- Chaque tier deverrouille progressivement plus de contenu dans la galerie et les posts
- Le systeme de tier-locking est applique cote serveur (pas de bypass client)
- Les badges s'affichent sur le profil client dans le CRM et dans les messages
- L'upgrade de tier est gere via un nouveau code d'acces (pas de modification in-place)

---

## 6. FONCTIONNALITES IMPLEMENTEES

### 6.1 Authentification & Securite

| Fonctionnalite | Status | Details |
|----------------|--------|---------|
| Auth JWT + codes temporaires | &#9989; | HMAC-SHA256 via jose, sessionStorage |
| Device fingerprint security | &#9989; | Canvas + hardware + UA hash |
| Max 2 devices par code | &#9989; | Alert au 3eme, block au 4eme |
| Screenshot detection + alertes | &#9989; | Mobile + desktop, escalation progressive |
| CORS restrictive | &#9989; | heaven-os.vercel.app + localhost:3000/3001 |
| XSS sanitization | &#9989; | Sur tous les inputs API |
| Race condition guards | &#9989; | Atomic updates (.lte() guards) |
| Cascade deletes securisees | &#9989; | FK constraints + soft logic |

### 6.2 Profil Public & Contenu

| Fonctionnalite | Status | Details |
|----------------|--------|---------|
| Profil public /m/[slug] avec identity gate | &#9989; | Handle social = identite |
| Tier-locking content (galerie, posts, uploads) | &#9989; | Server-side enforcement |
| Gallery masonry + daily shuffle + Google Photos zoom | &#9989; | Responsive, lazy-loaded |
| Stories bar + viewer fullscreen 9:16 | &#9989; | Progress bar, auto-advance |
| Hero collapse animation | &#9989; | Smooth scroll trigger |
| Model status/mood field | &#9989; | Editable depuis CP |
| Badge system tier-based | &#9989; | &#9827;&#10022;&#9733;&#129462;&#9824;&#9819; |
| Order history panel | &#9989; | Visible par le client |
| Navigation poker card tiles avec 3D hover | &#9989; | Restructuration avril 2026 |

### 6.3 Paiements & Codes

| Fonctionnalite | Status | Details |
|----------------|--------|---------|
| Payment flow: commande -> accept CP -> code auto -> beacon delivery | &#9989; | Automatise |
| Token economy (credits purchase/spend) | &#9989; | Balance, topup, historique |
| Code generation et validation | &#9989; | Temporaires, tier-bound |

### 6.4 Cockpit (CP) Admin

| Fonctionnalite | Status | Details |
|----------------|--------|---------|
| CP cockpit dashboard complet | &#9989; | Stats, activite, alerts |
| CRM clients (search, verify, block, merge) | &#9989; | Gestion complete |
| Messages polling (5s/15s adaptive) | &#9989; | Eco-mode quand inactif |
| Content pipeline (idea -> published) | &#9989; | 5 etapes workflow |
| Platform accounts tracking | &#9989; | Multi-reseau |
| Goals management | &#9989; | Objectifs par modele |
| Fan lifecycle tracking | &#9989; | Acquisition -> churn |
| Story generator (3 modes: code/promo/teaser) | &#9989; | Export image 9:16 |
| Pilot assistant (3 flows) | &#9989; | Assistant IA embarque |

### 6.5 Infrastructure

| Fonctionnalite | Status | Details |
|----------------|--------|---------|
| SQWENSY bridge tunnel | &#9989; | /api/sqwensy sync vers HQ |
| API sanitization | &#9989; | Input cleaning |
| 22 SQL migrations applied | &#9989; | Schema stable |
| Cloudinary media pipeline | &#9989; | Upload, cleanup, CDN |

---

## 7. FONCTIONNALITES PENDING

### 7.1 Priorite HAUTE (Phase 2-3)

| Fonctionnalite | Status | Impact | Effort |
|----------------|--------|--------|--------|
| Auth reelle Supabase (remplacer codes hardcodes) | &#11036; | Securite | M |
| CMS migration localStorage -> Supabase | &#11036; | Fiabilite | M |
| Paiements actifs (Stripe/Wise/Revolut/PayPal live) | &#11036; | Revenue | L |
| Multi-modele (activation Ruby, onboarding Paloma) | &#11036; | Scale | M |
| Sync bidirectionnelle heaven_sync temps reel | &#11036; | Integration | M |
| Rate limiting API | &#11036; | Securite | S |
| Input validation schemas (zod) | &#11036; | Qualite | S |

### 7.2 Priorite MOYENNE (Phase 4-5)

| Fonctionnalite | Status | Impact | Effort |
|----------------|--------|--------|--------|
| BEACON-Agence (DM auto-reply IG) | &#11036; | Acquisition | L |
| PILOT-Agence (insights revenue) | &#11036; | Decision | M |
| Story generator integre dans CP | &#11036; | Productivite | S |
| SEO metadata + Open Graph | &#11036; | Visibilite | S |
| Error boundaries | &#11036; | UX | S |
| Soft deletes + audit trail | &#11036; | Compliance | M |
| n8n automations Heaven-specific | &#11036; | Automation | M |

### 7.3 Priorite BASSE (Phase 6-7)

| Fonctionnalite | Status | Impact | Effort |
|----------------|--------|--------|--------|
| Caching headers | &#11036; | Performance | S |
| Pagination API | &#11036; | Scale | S |
| Dark mode persistence | &#11036; | UX | XS |
| Error tracking (Sentry) | &#11036; | Ops | S |
| Analytics (Mixpanel) | &#11036; | Data | M |
| Securite avancee: watermark, rate limiting, auth checks | &#11036; | Protection | L |

> **Legende effort :** XS = <1h, S = <4h, M = 1-3 jours, L = 1-2 semaines

---

## 8. ROADMAP PHASES

### Vue d'ensemble

```
Phase 1 ████████████████████ DONE
Phase 2 ██████████░░░░░░░░░░ IN PROGRESS
Phase 3 ████████░░░░░░░░░░░░ IN PROGRESS
Phase 4 ░░░░░░░░░░░░░░░░░░░░ PLANNED
Phase 5 ░░░░░░░░░░░░░░░░░░░░ PLANNED
Phase 6 ░░░░░░░░░░░░░░░░░░░░ PLANNED
Phase 7 ░░░░░░░░░░░░░░░░░░░░ PLANNED
```

### Detail par phase

#### Phase 1 — FONDATION &#9989; DONE

| Livrable | Status |
|----------|--------|
| Auth JWT + codes temporaires | &#9989; |
| Schema DB Supabase (9+ tables) | &#9989; |
| Profil public /m/[slug] | &#9989; |
| Systeme de tiers (Silver -> Platinum) | &#9989; |
| Galerie tier-locked | &#9989; |
| CP cockpit dashboard | &#9989; |
| 29 API routes | &#9989; |
| Deployment Vercel | &#9989; |

**Gate :** Plateforme accessible et fonctionnelle en mode demo. **PASSE.**

#### Phase 2 — MONETISATION (en cours)

| Livrable | Status |
|----------|--------|
| Payment flow commande -> code auto | &#9989; |
| Token economy (credits) | &#9989; |
| Paiements live (Stripe/Wise) | &#11036; |
| Facturation automatique | &#11036; |

**Gate :** Au moins 1 transaction reelle traitee via la plateforme.

#### Phase 3 — SECURITE (en cours)

| Livrable | Status |
|----------|--------|
| Device fingerprint (canvas + hardware + UA) | &#9989; |
| Max 2 devices/code + alertes | &#9989; |
| Screenshot detection + escalation | &#9989; |
| Rate limiting API | &#11036; |
| Input validation (zod) | &#11036; |
| Watermark sur media | &#11036; |

**Gate :** Zero leak confirme sur periode test de 30 jours.

#### Phase 4 — SCALE

| Livrable | Status |
|----------|--------|
| Multi-modele operationnel (Ruby, Paloma) | &#11036; |
| Template duplication profil | &#11036; |
| Auth Supabase reelle | &#11036; |
| Migration localStorage -> Supabase | &#11036; |
| Onboarding flow nouveau modele | &#11036; |

**Gate :** 3+ profils actifs avec chacun des clients payants.

#### Phase 5 — AUTOMATION

| Livrable | Status |
|----------|--------|
| BEACON-Agence (DM auto-reply IG) | &#11036; |
| PILOT-Agence (insights revenue) | &#11036; |
| n8n workflows Heaven-specific | &#11036; |
| Story generator integre CP | &#11036; |
| Sync bidirectionnelle heaven_sync | &#11036; |

**Gate :** 50% des taches repetitives automatisees (mesure via time tracking).

#### Phase 6 — ENTERPRISE

| Livrable | Status |
|----------|--------|
| Error tracking (Sentry) | &#11036; |
| Analytics (Mixpanel) | &#11036; |
| Rate limiting avance | &#11036; |
| Caching headers + CDN | &#11036; |
| Pagination API | &#11036; |
| Soft deletes + audit trail | &#11036; |
| SEO metadata + Open Graph | &#11036; |

**Gate :** 99.5% uptime sur 90 jours consecutifs.

#### Phase 7 — EXPANSION

| Livrable | Status |
|----------|--------|
| Custom domain (heaven-os.com) | &#11036; |
| Email pro (@heaven-os.com) | &#11036; |
| Stripe Connect (multi-seller) | &#11036; |
| SaaS B2B (licence a d'autres agences) | &#11036; |
| Marketplace profils | &#11036; |

**Gate :** 10+ profils actifs, pipeline B2B avec 3+ prospects agences.

---

## 9. KPIs & METRIQUES

### 9.1 Metriques Business

| KPI | Mesure | Cible Phase 2 | Cible Phase 4 |
|-----|--------|---------------|---------------|
| Profils actifs | Count modeles avec >1 client | 2 | 5+ |
| Revenue mensuel par profil | EUR commission/mois | 500-1.500 EUR | 1.500-4.500 EUR |
| Revenue total agence/mois | Somme commissions | 1.000-3.000 EUR | 7.500-22.500 EUR |
| Taux conversion visiteur -> client | % visiteurs qui achetent un code | >5% | >10% |
| Retention client (30j) | % clients actifs last 30j | >60% | >75% |
| Lifetime value client | Revenue moyen par client | 150 EUR | 400 EUR |

### 9.2 Metriques Techniques

| KPI | Mesure | Seuil alerte | Action |
|-----|--------|--------------|--------|
| Codes generes / utilises / expires | Ratio utilisation | <50% utilisation | Revoir flow acquisition |
| Clients actifs (visits last 30j) | Count unique visitors | Baisse >20% m/m | Audit engagement |
| Security alerts / mois | Count alertes | >10/mois | Renforcer protections |
| Uptime API | % disponibilite | <99% | Investigation immediate |
| Build time Vercel | Secondes | >120s | Optimiser bundle |
| DB size vs limite plan | MB / 500MB | >80% (400MB) | Planifier upgrade Supabase |
| Cloudinary credits used | Credits / 25 max | >80% (20 credits) | Compression + cleanup |

### 9.3 Tableau de bord mensuel

```
Mois : ____/2026

Profils actifs       : ____ / objectif ____
Revenue agence       : ____ EUR / objectif ____ EUR
Nouveaux clients     : ____ / objectif ____
Codes generes        : ____
Codes utilises       : ____ (taux: ___%)
Security alerts      : ____
DB usage             : ____MB / 500MB (___%)
Cloudinary credits   : ____ / 25 (___%)
Uptime               : ____%
```

---

## 10. RISQUES & MITIGATION

| # | Risque | Probabilite | Impact | Mitigation | Status |
|---|--------|-------------|--------|------------|--------|
| R1 | **Content leak** (codes partages entre fans) | Moyenne | Eleve | Device fingerprint + max 2 devices + IP tracking + screenshot alerts | &#9989; Implemente |
| R2 | **Scaling DB** (500MB limit Supabase Free) | Faible | Moyen | Monitoring mensuel, trigger upgrade a 80%, cleanup orphelins | &#128308; A monitorer |
| R3 | **Legal Belgique** (statut creatrices) | Faible | Eleve | 3 modes compensation documentes (independant/droit image/associe) | &#9989; Documente |
| R4 | **Single point of failure** (1 developpeur) | Elevee | Critique | Documentation exhaustive (ce document), code commente, architecture simple | &#128308; Risque accepte |
| R5 | **Cloudinary costs explosion** | Faible | Moyen | Compression auto, cleanup orphelins, lazy loading, monitoring credits | &#128993; Partiellement mitige |
| R6 | **Vercel bandwidth** | Faible | Moyen | Lazy loading images, Cloudinary CDN, caching headers (a implementer) | &#128993; Partiellement mitige |
| R7 | **Dependance Snapchat** (changement politique) | Faible | Eleve | Architecture decoupllee, contenu heberge sur Cloudinary pas Snap | &#9989; Mitige par design |
| R8 | **Churn creatrices** | Moyenne | Eleve | UX CP excellent, automatisation max, revenus transparents | &#128993; En cours |
| R9 | **Concurrence** (OnlyFans, Fanvue, Fansly) | Elevee | Moyen | Niche francophone, relation directe, pas de marketplace publique | &#9989; Positionnement different |
| R10 | **Reputation/image** | Moyenne | Eleve | Branding premium, pas de contenu public indexable, acces par code uniquement | &#9989; Mitige par design |

---

## 11. INTEGRATION ECOSYSTEME SQWENSY

Heaven OS s'integre dans l'ecosysteme SQWENSY Group a travers les branches suivantes :

| Branche SQWENSY | Integration avec Heaven | Status |
|------------------|------------------------|--------|
| **HQ (Root)** | Progression % sync via /api/sqwensy tunnel, dashboard global | &#9989; Actif |
| **Studio** | Branding shoots pour modeles, creation visuels promo | &#128993; Manuel |
| **Brands** | Merchandising branded products (t-shirts, accessoires) | &#11036; Futur |
| **BEACON** | Lead capture depuis vitrines, DM auto-reply IG | &#11036; Phase 5 |
| **n8n** | Automatisations cross-CP (notifications, sync, reports) | &#11036; Phase 5 |

### Flux de donnees SQWENSY <-> Heaven

```
Heaven OS                    SQWENSY HQ
---------                    ----------
/api/sqwensy  ──────────►   heaven_sync table
  - profils actifs               │
  - revenue mensuel              ▼
  - clients count           Dashboard HQ
  - progression %            (aggregation)
  - security alerts
```

### Principe d'isolation

- **DB isolee** : Heaven a sa propre instance Supabase, separee de SQWENSY Main
- **Deploy isole** : Repo et Vercel project distincts
- **Auth isolee** : JWT propre, pas de SSO avec SQWENSY OS
- **Sync one-way** : Heaven push vers HQ, jamais l'inverse (sauf admin override)
- **Cessibilite** : Architecture concu pour export/cession client (cf. PROTOCOLE-CESSION)

---

## 12. RESTRUCTURATION PROFIL AVRIL 2026

### v0.4.0 — Refonte majeure du profil public

| Element | Implementation |
|---------|----------------|
| **Poker branding complet** | Symboles &#9827;&#9830;&#129462;&#9824;&#9829; sur tous les tiers |
| **Navigation poker card tiles** | Cartes 3D avec hover effect, acces par tier |
| **Client identity visible** | Nom + badge tier affiche en header du profil |
| **Payment flow automatise** | Accept commande -> generation code auto -> delivery via beacon |
| **Device fingerprint** | Canvas + hardware + UA hash, tracking IP |
| **Max 2 devices/code** | Alert au 3eme appareil, block au 4eme |
| **Stories system** | Feed stories + viewer 9:16 fullscreen + progress bar |
| **Gallery masonry** | Grid responsive + daily shuffle + zoom Google Photos style |
| **Model status/mood** | Champ editable depuis CP, visible sur profil public |
| **Image generators** | 3 modes : code promo, annonce, teaser — export 9:16 |
| **Hero collapse animation** | Scroll-triggered pour reveal galerie tier |

---

## 13. SECURITE

### 13.1 Architecture securite

| Couche | Mecanisme | Details |
|--------|-----------|---------|
| **Transport** | HTTPS only | Force par Vercel |
| **Auth** | JWT HMAC-SHA256 | Secret 64-char hex, jose library |
| **CORS** | Restrictive whitelist | heaven-os.vercel.app + localhost:3000/3001 |
| **Input** | XSS sanitization | Tous les inputs API nettoyes |
| **DB** | RLS (Row Level Security) | Permissive, complete par API auth layer |
| **Concurrence** | Atomic updates | .lte() guards contre race conditions |
| **Devices** | Fingerprint | Canvas + hardware + User-Agent hash |
| **Limite** | Max 2 devices/code | Alert 3eme, block 4eme |
| **Screenshots** | Detection active | Mobile (visibility) + Desktop (keyboard) |
| **Escalation** | Progressive | Count 2 = warning, 3+ = escalated |
| **Deletes** | Cascade securisee | FK constraints + soft logic |

### 13.2 Matrice de menaces

| Menace | Probabilite | Contre-mesure | Efficacite |
|--------|-------------|---------------|------------|
| Partage de code entre fans | Elevee | Fingerprint + device limit | &#128994; Haute |
| Screenshot contenu | Elevee | Detection + alertes CP | &#128993; Moyenne (dissuasion) |
| Brute force codes | Faible | Codes complexes + expiration | &#128994; Haute |
| Scraping galerie | Moyenne | Auth required + lazy load | &#128993; Moyenne |
| XSS injection | Faible | Sanitization complete | &#128994; Haute |
| CSRF | Faible | JWT sessionStorage (pas cookies) | &#128994; Haute |
| DDoS API | Faible | Rate limiting (a implementer) | &#128308; Basse |

### 13.3 Protocole incident

1. **Detection** : Alert automatique via `agence_security_alerts` table
2. **Triage** : Pilot assistant categorise (screenshot / multi-device / suspicious)
3. **Action** : Block automatique au seuil 4 (devices) ou 3 (screenshots escalated)
4. **Review** : CP manager verifie dans dashboard securite
5. **Resolution** : Block/unblock client, revoke code, ou dismiss alert

---

## 14. CHANGELOG

| Version | Date | Changements majeurs |
|---------|------|---------------------|
| **v0.1.0** | 20/03/2026 | Initial deploy — Structure de base, profils, galerie |
| **v0.2.0** | 21/03/2026 | Profile overhaul, tier-locking, adaptive polling messages |
| **v0.3.0** | 22/03/2026 | Auth JWT, 24 security fixes, cockpit fusion |
| **v0.4.0** | 07/04/2026 | Profile restructure — poker nav, stories, device security, generators |

---

## ANNEXES

### A. Glossaire

| Terme | Definition |
|-------|-----------|
| **CP** | Cockpit — Interface d'administration par branche/client |
| **Tier** | Niveau d'abonnement (Silver, Gold, Feet, VIP Black, VIP Platinum) |
| **Code** | Code d'acces temporaire genere pour un client apres paiement |
| **Handle** | Identifiant social du client (ex: @username sur Snap/Insta) |
| **BEACON** | Bot IA public de capture de leads et support |
| **PILOT** | Bot IA admin pour gestion interne |
| **Slug** | Identifiant URL du modele (ex: /m/yumi) |
| **Bridge tunnel** | API de synchronisation Heaven -> SQWENSY HQ |
| **Fingerprint** | Empreinte numerique unique d'un appareil (canvas + hardware + UA) |

### B. Contacts & acces

| Role | Contact | Acces |
|------|---------|-------|
| Fondateur / Dev | Owner SQWENSY | Full admin |
| YUMI | @yumiiiclub | CP cockpit via code admin |
| RUBY | - | CP cockpit via code admin (a activer) |
| PALOMA | (à fournir) | CP cockpit via code admin (a activer) |

### C. Liens utiles

| Ressource | URL |
|-----------|-----|
| Heaven OS Live | heaven-os.vercel.app |
| SQWENSY OS | sqwensy.com |
| Supabase Dashboard | app.supabase.com (projet Heaven) |
| Cloudinary Dashboard | cloudinary.com (cloud ddwgcu3d5) |
| Vercel Dashboard | vercel.com (projet heaven-os) |

---

> **Ce document est la source unique de verite pour Heaven OS.**
> Derniere mise a jour : 7 avril 2026
> Prochaine revue planifiee : A chaque passage de gate de phase.

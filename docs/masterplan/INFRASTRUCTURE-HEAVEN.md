# INFRASTRUCTURE-HEAVEN.md

Reference technique complete — Heaven OS
Derniere mise a jour : 7 avril 2026

---

## 1. COMPTES & SERVICES

### 1.1 Vercel

| Champ | Valeur |
|-------|--------|
| Project | heaven-os |
| Project ID | prj_6LeXZx562QXOvtrE4TeMRsqXohMr |
| Org | team_SNrLsV1Y1QTCK7VX9FJgsH2M |
| URL | https://heaven-os.vercel.app |
| Plan | Hobby (FREE) |
| Framework | Next.js 15 |
| Build | Auto from git push main |
| Env vars | 7 configurees (SUPABASE x3, CLOUDINARY x3, JWT x1) |

**Limites plan Hobby :**
- 100 GB bandwidth / mois
- Serverless functions : 10s timeout, 1024 MB RAM
- 1 concurrent build
- Pas de preview deploys protegees
- Pas de Web Analytics

**Triggers upgrade :**
- \>100 GB bandwidth → Pro ($20/mois) : preview deploys, 1 TB bandwidth, team access, analytics
- Besoin domaine custom avec SSL → Pro requis
- Besoin password protection preview → Pro requis
- Besoin serverless functions > 10s → Pro (300s timeout)

---

### 1.2 Supabase

| Champ | Valeur |
|-------|--------|
| Project ID | tbvojfjfgmjiwitiudbn |
| Region | eu-central-1 (Frankfurt) |
| Plan | Free |
| Tables | 19 tables + 1 view + 1 sequence |
| Migrations | 17 fichiers (006-022) |
| RLS | Active sur toutes les tables (policies permissives, auth via API layer) |

**Limites plan Free :**
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 500K edge function invocations
- 2 edge functions
- Pas de point-in-time recovery
- 7 jours log retention

**RPC functions :**
- `activate_model(p_slug, p_activated_by)` — Assigne MODEL-XX, provisionne media
- `provision_model_media(p_slug)` — Cree la config media Cloudinary
- `refresh_media_stats(p_slug)` — Recalcule stats media depuis agence_uploads
- `deactivate_model(p_slug)` — Desactive un modele
- `increment_likes(post_id_param)` — Increment atomique likes post
- `decrement_likes(post_id_param)` — Decrement atomique likes post
- `increment_comments(post_id_param)` — Increment atomique comments post

**Triggers :**
- `trg_uploads_media_stats` — AFTER INSERT/UPDATE/DELETE on agence_uploads → refresh_media_stats()

**Views :**
- `heaven_model_registry` — Vue aggregee de tous les modeles avec stats (clients, codes, posts, uploads, messages, pipeline, platforms, media)

**Triggers upgrade :**
- \>500 MB DB → Pro ($25/mois) : 8 GB DB, 100 GB storage, daily backups, 90 jours log retention
- Besoin backups point-in-time → Pro requis
- \>50K MAU → Pro requis

---

### 1.3 Cloudinary

| Champ | Valeur |
|-------|--------|
| Cloud Name | ddwgcu3d5 |
| Plan | Free (25 credits/mois) |
| Folder structure | `heaven/{model_slug}/{type}` |
| Upload limits | Avatar 5 MB, Post/Content 10 MB |
| Formats | JPEG, PNG, WEBP, GIF, Video |

**Features utilisees :**
- Upload (base64 data URL, HTTP URL)
- Transform (blur, thumb, crop)
- Delete (single, bulk)
- List resources (images, videos)
- Folder isolation par modele (`heaven/yumi/`, `heaven/ruby/`, etc.)

**Triggers upgrade :**
- \>25 credits/mois → Plus ($89/mois) : 225 credits, video transforms, AI features
- \>10 GB storage → Plus
- **MONITORING** : Suivre usage credits vs 25 limit mensuellement

---

### 1.4 GitHub

| Champ | Valeur |
|-------|--------|
| Repo | akaly-one/heaven (private) |
| Plan | Free |
| CI/CD | Aucun (Vercel handles deploys) |
| Branch protection | Non |
| Code owners | Non |

**Trigger upgrade :**
- Team collaboration → Team ($4/user/mois) : branch protection, code owners, required reviews

---

### 1.5 Domain

| Champ | Valeur |
|-------|--------|
| Current | heaven-os.vercel.app (subdomain Vercel) |
| Custom domain | Non configure |

**Trigger upgrade :**
- Client-facing branding → Custom domain ~12 EUR/an via Namecheap/Cloudflare
- Vercel Pro requis pour SSL custom domain

---

### 1.6 Email

| Champ | Valeur |
|-------|--------|
| Current | yumiiiclub@gmail.com (free Gmail) |
| Usage | Cloudinary account, model communications |

**Trigger upgrade :**
- Professional branding → Google Workspace ($6/mois) : @heaven-os.com, multi-user

---

### 1.7 n8n

| Champ | Valeur |
|-------|--------|
| Instance | Partagee avec SQWENSY OS |
| Workflows | Infrastructure automation partagee |

**Trigger upgrade :**
- \>20 workflows specifiques Heaven → Instance n8n dediee

---

## 2. ENVIRONMENT VARIABLES

| Variable | Scope | Sensitive | Purpose | Status |
|----------|-------|-----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Non | Endpoint DB Supabase | CONFIGURE |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Non | Cle auth client Supabase | CONFIGURE |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | **OUI** | Bypass RLS (admin ops) | CONFIGURE |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public | Non | CDN identifier | CONFIGURE |
| `CLOUDINARY_API_KEY` | Server | **OUI** | Auth upload Cloudinary | CONFIGURE |
| `CLOUDINARY_API_SECRET` | Server | **OUI** | Signing upload Cloudinary | CONFIGURE |
| `HEAVEN_JWT_SECRET` | Server | **OUI** | Signing JWT codes (64-char hex) | CONFIGURE |
| `SQWENSY_OS_API_URL` | Server | Non | URL SQWENSY OS pour tunnel | PAS ENCORE CONFIGURE |
| `SQWENSY_TUNNEL_KEY` | Server | **OUI** | Auth tunnel SQWENSY <> Heaven | PAS ENCORE CONFIGURE |
| `HEAVEN_SYNC_SECRET` | Server | **OUI** | Auth sync model activation | OPTIONNEL |
| `ADMIN_SECRET` | Server | **OUI** | Auth purge endpoint (x-admin-key) | OPTIONNEL |

---

## 3. DATABASE SCHEMA COMPLET

### 3.1 Tables — Vue d'ensemble

| # | Table | Description | FK | Indexes |
|---|-------|-------------|-----|---------|
| 1 | `agence_accounts` | Comptes admin/model (login codes) | — | code (unique) |
| 2 | `agence_models` | Registre modeles (profils, activation) | — | slug (unique), model_id (unique), is_active |
| 3 | `agence_clients` | Abonnes/visiteurs par modele | — | verified_status+created_at, badge_grade |
| 4 | `agence_codes` | Codes d'acces temporaires | client_id → agence_clients | — |
| 5 | `agence_posts` | Publications feed/story | — | post_type |
| 6 | `agence_uploads` | Media catalogue (gallery) | — | — |
| 7 | `agence_messages` | Messages client <> model | — | — |
| 8 | `agence_wall_posts` | Mur public (commentaires visiteurs) | — | — |
| 9 | `agence_packs` | Offres/abonnements par modele | — | — |
| 10 | `agence_purchases` | Transactions/achats credits | client_id → agence_clients | model, client_id |
| 11 | `agence_platform_accounts` | Comptes reseaux sociaux par modele | — | model_slug |
| 12 | `agence_content_pipeline` | Pipeline contenu (idea→published) | — | model_slug, stage |
| 13 | `agence_fan_lifecycle` | Cycle de vie fan (engagement) | client_id → agence_clients | model_slug, stage, client_id, model_slug+client_id |
| 14 | `agence_goals` | Objectifs strategiques par modele | — | model_slug |
| 15 | `agence_media_config` | Config media Cloudinary par modele | — | model_slug (unique) |
| 16 | `agence_code_devices` | Fingerprint/IP tracking par code | — | code_id, fingerprint |
| 17 | `agence_client_connections` | Historique connexions client | client_id → agence_clients | client_id |
| 18 | `agence_security_alerts` | Alertes securite (screenshots) | — | — |
| 19 | `agence_post_interactions` | Likes/comments sur posts | — | — |

**Sequence :** `heaven_model_seq` (current value: 3)

### 3.2 Schema detaille par table

#### `agence_accounts`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| code | TEXT | UNIQUE, NOT NULL | Code de connexion (lowercase) |
| role | TEXT | NOT NULL | 'root' ou 'model' |
| model_slug | TEXT | NULLABLE | Slug du modele associe |
| display_name | TEXT | NOT NULL | Nom affiche |
| active | BOOLEAN | DEFAULT true | Compte actif |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| last_login | TIMESTAMPTZ | NULLABLE | Derniere connexion |

#### `agence_models`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| slug | TEXT | UNIQUE, NOT NULL | Identifiant URL |
| display | TEXT | DEFAULT '', NULLABLE | Nom affichage legacy |
| display_name | TEXT | NULLABLE | Nom affichage v2 |
| avatar | TEXT | NULLABLE | URL avatar Cloudinary |
| banner | TEXT | NULLABLE | URL banner |
| bio | TEXT | NULLABLE | Biographie |
| status | TEXT | DEFAULT 'Creatrice exclusive' | Statut affiche |
| online | BOOLEAN | DEFAULT false | Presence en ligne |
| config | JSONB | NULLABLE | Config extra (banner, paypal_handle, color) |
| presence | JSONB | NULLABLE | {online, status} |
| model_id | VARCHAR(20) | UNIQUE | MODEL-01, MODEL-02, etc. |
| model_number | INT | UNIQUE | Numero sequentiel |
| activated_at | TIMESTAMPTZ | NULLABLE | Date activation |
| activated_by | VARCHAR(50) | NULLABLE | Qui a active |
| is_active | BOOLEAN | DEFAULT false | Modele active |
| status_text | VARCHAR(200) | NULLABLE | Mood/annonce visible visiteurs |
| status_updated_at | TIMESTAMPTZ | NULLABLE | Date derniere maj status |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | DEFAULT now() | — |

**RLS :** Policy `agence_models_all` — FOR ALL USING (true) WITH CHECK (true)

#### `agence_clients`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model | TEXT | NOT NULL | Slug modele associe |
| pseudo_snap | TEXT | NULLABLE | Handle Snapchat (lowercase) |
| pseudo_insta | TEXT | NULLABLE | Handle Instagram (lowercase) |
| phone | TEXT | NULLABLE | Numero telephone |
| nickname | TEXT | NULLABLE | Surnom |
| firstname | TEXT | NULLABLE | Prenom |
| tier | TEXT | NULLABLE | silver/gold/feet/black/platinum |
| total_spent | DECIMAL | DEFAULT 0 | Total depense |
| total_tokens_bought | INT | DEFAULT 0 | Credits achetes |
| total_tokens_spent | INT | DEFAULT 0 | Credits utilises |
| is_verified | BOOLEAN | DEFAULT false | Verifie par modele |
| is_blocked | BOOLEAN | DEFAULT false | Bloque |
| notes | TEXT | NULLABLE | Notes internes |
| tag | TEXT | NULLABLE | Tag custom |
| preferences | JSONB | NULLABLE | Preferences client |
| delivery_platform | TEXT | NULLABLE | Plateforme livraison |
| last_active | TIMESTAMPTZ | NULLABLE | Derniere activite |
| lead_source | TEXT | NULLABLE | Source: private_story, direct, code_entry |
| lead_hook | TEXT | NULLABLE | Message promo montre a l'inscription |
| verified_status | TEXT | NOT NULL, DEFAULT 'pending' | pending/verified/rejected |
| verified_at | TIMESTAMPTZ | NULLABLE | Date verification |
| verified_by | TEXT | NULLABLE | Qui a verifie |
| avatar_url | TEXT | NULLABLE | URL avatar client |
| display_name | VARCHAR(50) | NULLABLE | Nom affiche client |
| badge_grade | VARCHAR(20) | DEFAULT 'nouveau' | nouveau/regulier/fan/vip/top_fan |
| screenshot_count | INT | DEFAULT 0 | Compteur screenshots detectes |
| last_screenshot_at | TIMESTAMPTZ | NULLABLE | Dernier screenshot |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

**Indexes :**
- `idx_agence_clients_verification` ON (verified_status, created_at) WHERE verified_status = 'pending'
- `idx_clients_badge` ON (badge_grade)

#### `agence_codes`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| code | TEXT | NOT NULL | Code acces (uppercase) |
| model | TEXT | NOT NULL | Slug modele |
| client | TEXT | NULLABLE | Handle client (legacy) |
| client_id | UUID | FK → agence_clients(id) | Lien client |
| platform | TEXT | DEFAULT 'snapchat' | snapchat/instagram |
| role | TEXT | DEFAULT 'client' | client/model/root |
| tier | TEXT | DEFAULT 'vip' | Tier du code |
| pack | TEXT | NULLABLE | Pack associe |
| type | TEXT | DEFAULT 'paid' | paid/trial/gift |
| duration | INT | DEFAULT 72 | Duree en heures |
| expires_at | TIMESTAMPTZ | NOT NULL | Date expiration |
| is_trial | BOOLEAN | DEFAULT false | Code d'essai |
| used | BOOLEAN | DEFAULT false | Code utilise |
| active | BOOLEAN | DEFAULT true | Code actif |
| revoked | BOOLEAN | DEFAULT false | Code revoque |
| last_used | TIMESTAMPTZ | NULLABLE | Derniere utilisation |
| max_devices | INT | DEFAULT 2 | Max appareils autorises |
| security_alert | BOOLEAN | DEFAULT false | Alerte securite (trop d'appareils) |
| blocked | BOOLEAN | DEFAULT false | Code bloque |
| blocked_reason | TEXT | NULLABLE | Raison blocage |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

#### `agence_posts`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model | TEXT | NOT NULL | Slug modele |
| content | TEXT | NULLABLE | Texte du post (sanitize) |
| media_url | TEXT | NULLABLE | URL media Cloudinary |
| media_type | TEXT | NULLABLE | image/video |
| tier_required | TEXT | DEFAULT 'public' | Tier minimum pour voir |
| pinned | BOOLEAN | DEFAULT false | Post epingle |
| likes_count | INT | DEFAULT 0 | Compteur likes |
| comments_count | INT | DEFAULT 0 | Compteur commentaires |
| post_type | VARCHAR(10) | DEFAULT 'feed' | feed/story |
| story_expires_at | TIMESTAMPTZ | NULLABLE | Expiration story (NULL = highlight) |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

**Indexes :** `idx_posts_type` ON (post_type)

#### `agence_uploads`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | TEXT | PK | ID custom (upl-XXXXX) |
| model | TEXT | NOT NULL | Slug modele |
| tier | TEXT | DEFAULT 'promo' | Tier contenu |
| type | TEXT | DEFAULT 'photo' | photo/video/reel |
| label | TEXT | DEFAULT '' | Description |
| data_url | TEXT | NOT NULL | URL Cloudinary |
| visibility | TEXT | DEFAULT 'promo' | Visibilite |
| token_price | INT | DEFAULT 0 | Prix en credits |
| is_new | BOOLEAN | DEFAULT true | Nouveau contenu |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

#### `agence_messages`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model | TEXT | NOT NULL | Slug modele |
| client_id | UUID | NOT NULL | ID client |
| sender_type | TEXT | NOT NULL | client/model/admin |
| content | TEXT | NOT NULL | Message (sanitize) |
| read | BOOLEAN | DEFAULT false | Lu par destinataire |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

#### `agence_wall_posts`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model | TEXT | NOT NULL | Slug modele |
| pseudo | TEXT | NOT NULL | Handle visiteur |
| content | TEXT | NULLABLE | Texte (max 500 chars, sanitize) |
| photo_url | TEXT | NULLABLE | URL photo (Cloudinary only) |
| cloudinary_id | TEXT | NULLABLE | Public ID Cloudinary |
| pseudo_snap | TEXT | NULLABLE | Handle Snap visiteur |
| pseudo_insta | TEXT | NULLABLE | Handle Insta visiteur |
| client_id | UUID | NULLABLE | Lien client auto |
| likes_count | INT | DEFAULT 0 | Compteur likes |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

#### `agence_packs`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model | TEXT | NOT NULL | Slug modele |
| pack_id | TEXT | NOT NULL | ID pack (vip, gold, diamond, platinum) |
| name | TEXT | NOT NULL | Nom affiche |
| price | DECIMAL(10,2) | NOT NULL | Prix EUR |
| code | TEXT | NULLABLE | Code AG-PXXX |
| color | TEXT | NULLABLE | Couleur hex |
| features | JSONB | DEFAULT '[]' | Liste features |
| bonuses | JSONB | DEFAULT '{}' | Bonus inclus |
| face | BOOLEAN | DEFAULT false | Contenu avec visage |
| badge | TEXT | NULLABLE | Badge affiche (Populaire, Ultimate) |
| active | BOOLEAN | DEFAULT true | Pack actif |
| sort_order | INT | DEFAULT 0 | Ordre affichage |
| wise_url | TEXT | NULLABLE | Lien paiement Wise |
| stripe_link | TEXT | NULLABLE | Lien Stripe checkout |
| revolut_url | TEXT | NULLABLE | Lien Revolut.me |

#### `agence_purchases`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| client_id | UUID | FK → agence_clients(id) ON DELETE SET NULL | Client |
| upload_id | VARCHAR | NULLABLE | Media achete |
| model | VARCHAR | NOT NULL | Slug modele |
| price | DECIMAL(10,2) | DEFAULT 0 | Prix / montant |
| credits_added | INT | NULLABLE | Credits ajoutes (topup) |
| type | TEXT | NULLABLE | 'topup' ou NULL (purchase) |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

**Indexes :** `idx_purchases_model`, `idx_purchases_client`

#### `agence_platform_accounts`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model_slug | VARCHAR | NOT NULL | Slug modele |
| platform | VARCHAR | NOT NULL | Nom plateforme |
| handle | VARCHAR | NOT NULL | Handle/username |
| profile_url | TEXT | NULLABLE | URL profil |
| status | VARCHAR | DEFAULT 'active' | active/inactive |
| subscribers_count | INT | DEFAULT 0 | Abonnes |
| monthly_revenue | DECIMAL(10,2) | DEFAULT 0 | Revenu mensuel |
| commission_rate | DECIMAL(5,2) | DEFAULT 25.00 | Commission % |
| notes | TEXT | NULLABLE | Notes |
| synced_at | TIMESTAMPTZ | NULLABLE | Derniere sync |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | DEFAULT now() | — |

**Index :** `idx_platform_accounts_model`

#### `agence_content_pipeline`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model_slug | VARCHAR | NOT NULL | Slug modele |
| title | VARCHAR | NOT NULL | Titre contenu |
| content_type | VARCHAR | NOT NULL | photo_set/video/custom |
| platforms | JSONB | DEFAULT '[]' | Plateformes cibles |
| stage | VARCHAR | DEFAULT 'idea' | idea/production/review/scheduled/published |
| scheduled_date | DATE | NULLABLE | Date planifiee |
| published_date | DATE | NULLABLE | Date publiee |
| tier | VARCHAR | NULLABLE | Tier cible |
| price | DECIMAL(10,2) | NULLABLE | Prix |
| views | INT | DEFAULT 0 | Vues |
| likes | INT | DEFAULT 0 | Likes |
| revenue | DECIMAL(10,2) | DEFAULT 0 | Revenu genere |
| notes | TEXT | NULLABLE | Notes |
| thumbnail_url | TEXT | NULLABLE | URL miniature |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | DEFAULT now() | — |

**Indexes :** `idx_content_pipeline_model`, `idx_content_pipeline_stage`

#### `agence_fan_lifecycle`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| client_id | UUID | FK → agence_clients(id) ON DELETE CASCADE | Client |
| model_slug | VARCHAR | NOT NULL | Slug modele |
| stage | VARCHAR | DEFAULT 'new' | new/active/loyal/churned |
| source_platform | VARCHAR | NULLABLE | Plateforme source |
| first_interaction | TIMESTAMPTZ | DEFAULT now() | Premiere interaction |
| last_interaction | TIMESTAMPTZ | DEFAULT now() | Derniere interaction |
| total_spent | DECIMAL(10,2) | DEFAULT 0 | Total depense |
| messages_count | INT | DEFAULT 0 | Nombre messages |
| tips_total | DECIMAL(10,2) | DEFAULT 0 | Total pourboires |
| ppv_purchased | INT | DEFAULT 0 | PPV achetes |
| churn_risk | VARCHAR | DEFAULT 'low' | low/medium/high |
| tags | JSONB | DEFAULT '[]' | Tags |
| notes | TEXT | NULLABLE | Notes |
| visit_count | INT | DEFAULT 0 | Compteur visites |
| wall_posts_count | INT | DEFAULT 0 | Posts mur |
| orders_completed | INT | DEFAULT 0 | Commandes completees |
| last_visit_at | TIMESTAMPTZ | NULLABLE | Derniere visite |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | DEFAULT now() | — |

**Indexes :** `idx_fan_lifecycle_model`, `idx_fan_lifecycle_stage`, `idx_fan_lifecycle_client`, `idx_fan_lifecycle_model_client`

#### `agence_goals`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model_slug | VARCHAR | NOT NULL | Slug modele |
| title | VARCHAR | NOT NULL | Titre objectif |
| category | VARCHAR | NOT NULL | revenue/subscribers/content |
| target_value | DECIMAL(10,2) | NULLABLE | Valeur cible |
| current_value | DECIMAL(10,2) | DEFAULT 0 | Valeur actuelle |
| unit | VARCHAR | DEFAULT 'EUR' | Unite |
| deadline | DATE | NULLABLE | Date limite |
| status | VARCHAR | DEFAULT 'active' | active/completed/paused |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | DEFAULT now() | — |

**Index :** `idx_goals_model`

#### `agence_media_config`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model_slug | VARCHAR | UNIQUE, NOT NULL | Slug modele |
| folder_root | VARCHAR | NOT NULL | heaven/{slug} |
| folder_content | VARCHAR | NOT NULL | heaven/{slug}/content |
| folder_avatar | VARCHAR | NOT NULL | heaven/{slug}/avatar |
| folder_banner | VARCHAR | NOT NULL | heaven/{slug}/banner |
| max_storage_mb | INT | DEFAULT 5000 | Quota stockage (5 GB) |
| max_uploads | INT | DEFAULT 2000 | Quota fichiers |
| max_file_size_mb | INT | DEFAULT 10 | Taille max par fichier |
| allowed_types | TEXT[] | DEFAULT ARRAY['image','video'] | Types autorises |
| total_files | INT | DEFAULT 0 | Fichiers total (auto) |
| total_bytes | BIGINT | DEFAULT 0 | Bytes total (auto) |
| total_images | INT | DEFAULT 0 | Images (auto) |
| total_videos | INT | DEFAULT 0 | Videos (auto) |
| last_upload_at | TIMESTAMPTZ | NULLABLE | Dernier upload (auto) |
| is_active | BOOLEAN | DEFAULT true | Media actives |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | DEFAULT now() | — |

**Index :** `idx_media_config_model`

#### `agence_code_devices`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| code_id | UUID | NOT NULL | ID du code |
| ip_address | VARCHAR(45) | NULLABLE | Adresse IP |
| fingerprint | VARCHAR(64) | NULLABLE | Fingerprint navigateur |
| user_agent | TEXT | NULLABLE | User-Agent |
| first_seen | TIMESTAMPTZ | DEFAULT now() | Premiere connexion |
| last_seen | TIMESTAMPTZ | DEFAULT now() | Derniere connexion |
| blocked | BOOLEAN | DEFAULT false | Appareil bloque |

**Indexes :** `idx_code_devices_code`, `idx_code_devices_fp`

#### `agence_client_connections`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| client_id | UUID | FK → agence_clients(id) ON DELETE CASCADE | Client |
| model | VARCHAR | NOT NULL | Slug modele |
| ip_address | VARCHAR(45) | NULLABLE | IP |
| fingerprint | VARCHAR(64) | NULLABLE | Fingerprint |
| user_agent | TEXT | NULLABLE | User-Agent |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

**Index :** `idx_client_connections_client`

#### `agence_security_alerts`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| model | TEXT | NOT NULL | Slug modele |
| client_id | UUID | NULLABLE | Client concerne |
| client_pseudo | TEXT | NULLABLE | Pseudo client |
| client_tier | TEXT | NULLABLE | Tier client |
| alert_type | TEXT | NOT NULL | screenshot |
| page | TEXT | NULLABLE | Page concernee |
| action_taken | TEXT | NULLABLE | logged/warning_sent/escalated |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

#### `agence_post_interactions`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | — |
| post_id | UUID | NOT NULL | ID du post |
| client_id | UUID | NOT NULL | ID du client |
| type | TEXT | NOT NULL | like/comment |
| content | TEXT | NULLABLE | Contenu commentaire (sanitize) |
| created_at | TIMESTAMPTZ | DEFAULT now() | — |

### 3.3 Migration History

| # | Fichier | Description |
|---|---------|-------------|
| 006 | `006_packs_wise_url.sql` | Ajoute `wise_url` a agence_packs |
| 007 | `007_packs_stripe_link.sql` | Ajoute `code`, `stripe_link` a agence_packs + backfill AG-PXXX |
| 008 | `008_wall_social_handles.sql` | Ajoute `pseudo_snap`, `pseudo_insta` a wall_posts |
| 009 | `009_fix_agence_models.sql` | Fix display column nullable + CREATE TABLE IF NOT EXISTS agence_models |
| 011 | `011_complete_heaven_db.sql` | Cree platform_accounts, content_pipeline, fan_lifecycle, goals, purchases + model registry + activate_model RPC + heaven_model_registry view |
| 012 | `012_seed_models.sql` | Seed YUMI/RUBY/PALOMA + model_ids |
| 013 | `013_media_isolation.sql` | Cree agence_media_config + provision_model_media + refresh_media_stats + trigger trg_uploads_media_stats + maj view registry |
| 014 | `014_client_lead_source.sql` | Ajoute `lead_source`, `lead_hook` a agence_clients |
| 015 | `015_client_verification.sql` | Ajoute `verified_status`, `verified_at`, `verified_by` + index |
| 016 | `016_packs_revolut.sql` | Ajoute `revolut_url` a agence_packs |
| 017 | `017_seed_paloma_packs.sql` | Seed packs VIP/Gold/Diamond/Platinum pour Paloma |
| 018 | `018_paloma_paypal.sql` | Config PayPal handle pour Paloma dans config JSONB |
| 019 | `019_client_badges.sql` | Ajoute `avatar_url`, `display_name`, `badge_grade` + fan lifecycle engagement counters |
| 020 | `020_code_security.sql` | Cree agence_code_devices + agence_client_connections + champs securite codes |
| 021 | `021_model_status.sql` | Ajoute `status_text`, `status_updated_at` a agence_models |
| 022 | `022_stories.sql` | Ajoute `post_type`, `story_expires_at` a agence_posts |

**Note :** Migration 010 integree dans 011. Pas de migration 010 standalone.

### 3.4 RLS Policies

Toutes les tables ont RLS active avec des policies permissives identiques :

```sql
CREATE POLICY {table}_all ON {table}
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

La securite est geree au niveau API (validation headers, auth layer, CORS) et non au niveau RLS.
Ceci est volontaire : le service_role_key est utilise server-side, les clients n'ont pas d'acces direct a Supabase.

---

## 4. API ARCHITECTURE

### 4.1 Vue d'ensemble

**Base URL :** `https://heaven-os.vercel.app/api`
**Runtime :** Node.js (Vercel Serverless Functions)
**CORS :** Whitelist origins (heaven-os.vercel.app, localhost:3000/3001)
**Rate limiting :** Aucun (a implementer)
**Response format :** JSON
**Max duration :** 10s standard, 30s upload, 60s cleanup

### 4.2 Routes detaillees

#### Models (4 routes)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/models` | GET, OPTIONS | Non | agence_accounts | Liste modeles actifs |
| `/api/models/[slug]` | GET, PUT, OPTIONS | GET: Non / PUT: Non (model self-service) | agence_accounts, agence_models | Profil public + update |
| `/api/models/activate` | GET, POST | OUI (x-sync-secret ou x-heaven-auth root) | agence_models, agence_packs, agence_media_config | Activation modele + provisioning |
| `/api/models/media` | GET, PATCH, POST | Non (admin-intended) | agence_media_config | Config media + quotas + refresh stats |

#### Codes (2 routes)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/codes` | GET, POST, PUT, DELETE, PATCH, OPTIONS | Non | agence_codes, agence_clients | CRUD codes + validation + actions (pause/reactivate/revoke/renew) |
| `/api/codes/security` | POST, OPTIONS | Non | agence_codes, agence_code_devices | Check device fingerprint (max 2 devices/code) |

#### Clients (5 routes)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/clients` | GET, POST, PUT, DELETE, PATCH, OPTIONS | Non | agence_clients | CRUD clients + registration + verification |
| `/api/clients/[id]` | GET, OPTIONS | Non | agence_clients, agence_messages, agence_codes | Detail client complet (messages + codes history) |
| `/api/clients/cleanup` | GET, DELETE, OPTIONS | Non (cron/root) | agence_clients | Purge unverified > 7 jours |
| `/api/clients/visit` | POST, OPTIONS | Non | agence_fan_lifecycle, agence_clients | Track visite/action + recalcul badge |
| `/api/clients/orders` | GET, OPTIONS | Non | agence_wall_posts | Historique commandes via SYSTEM wall posts |

#### Content (3 routes)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/posts` | GET, POST, PUT, PATCH, DELETE, OPTIONS | Non | agence_posts, agence_post_interactions | CRUD posts + like/unlike + comment + pin |
| `/api/wall` | GET, POST, PUT, DELETE, OPTIONS | Non | agence_wall_posts, agence_clients | Mur public + like |
| `/api/messages` | GET, POST, DELETE, PATCH, OPTIONS | Non | agence_messages, agence_clients | Messages client<>model + mark read + reassign |

#### Media (3 routes)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/upload` | POST, DELETE, OPTIONS | Non | agence_media_config | Upload/delete Cloudinary (folder isolation) |
| `/api/uploads` | GET, POST, PUT, DELETE, OPTIONS | Non | agence_uploads | CRUD catalogue media DB + bulk sync |
| `/api/upload/cleanup` | GET, OPTIONS | Non | agence_posts, agence_uploads, agence_wall_posts, agence_models | Scan orphans Cloudinary vs DB (dry_run) |

#### Commerce (3 routes)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/packs` | GET, POST, OPTIONS | Non | agence_packs | Liste/save packs par modele |
| `/api/credits/balance` | GET, OPTIONS | Non | agence_clients | Solde credits client |
| `/api/credits/purchase` | GET, POST, OPTIONS | Non | agence_clients, agence_purchases | Achat media avec credits (atomic debit) |
| `/api/credits/topup` | POST, OPTIONS | Non | agence_clients, agence_purchases | Recharge credits |

#### Administration (3 routes)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/accounts` | GET, POST, PUT, DELETE, OPTIONS | Non | agence_accounts, (cascade sur toutes tables) | CRUD comptes admin/model + merge + cascade delete |
| `/api/purge` | POST, OPTIONS | OUI (x-admin-key = ADMIN_SECRET) | agence_codes, agence_clients, agence_messages, agence_posts, agence_wall_posts, agence_uploads | Purge data modele (demo→pro) |
| `/api/security/screenshot-alert` | GET, POST, OPTIONS | Non | agence_security_alerts, agence_clients, agence_messages, agence_accounts | Detection screenshots + escalation auto |

#### Pipeline (3 routes)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/pipeline` | GET, POST, PUT, OPTIONS | Non | agence_content_pipeline | CRUD pipeline contenu |
| `/api/pipeline/fans` | GET, PUT, OPTIONS | Non | agence_fan_lifecycle, agence_clients | Gestion cycle de vie fans |
| `/api/pipeline/goals` | GET, POST, PUT, OPTIONS | Non | agence_goals | CRUD objectifs strategiques |
| `/api/pipeline/platforms` | GET, POST, PUT, OPTIONS | Non | agence_platform_accounts | CRUD comptes plateformes |

#### Bridge SQWENSY (1 route)

| Route | Methods | Auth | Tables | Description |
|-------|---------|------|--------|-------------|
| `/api/sqwensy` | GET, POST, OPTIONS | OUI (x-api-key = SQWENSY_TUNNEL_KEY) | Toutes tables (aggregation) | Tunnel bidirectionnel SQWENSY OS <> Heaven |

**Actions POST `/api/sqwensy` :**
- `sync_client` — Cree/update client depuis referral SQWENSY
- `update_goal` — Update progression objectif
- `sync_to_sqwensy` — Push summary vers SQWENSY OS /api/sync/heaven
- `register_packs` — Enregistre packs comme shop items sur SQWENSY OS
- `push_notification` — Log notification dans content pipeline

**Total : 29 route files, ~60+ HTTP methods**

---

## 5. SECURITY ARCHITECTURE

### 5.1 Authentication

**Modele :** Code-based access (pas de comptes utilisateur traditionnels)

| Layer | Mecanisme |
|-------|-----------|
| Admin/Model login | Code unique stocke dans agence_accounts (ex: `yumi2024`) |
| Client access | Code temporaire genere dans agence_codes (ex: `YUMI-VIP-A7K3`) |
| JWT | `HEAVEN_JWT_SECRET` (64-char hex) pour signer les tokens d'acces |
| API admin | Headers custom (`x-admin-key`, `x-sync-secret`, `x-api-key`, `x-heaven-auth`) |
| Root auth | `x-heaven-auth` header avec JSON `{role: "root"}` |
| Tunnel auth | `x-api-key` header = `SQWENSY_TUNNEL_KEY` |
| Purge auth | `x-admin-key` header = `ADMIN_SECRET` |

### 5.2 CORS Configuration

```typescript
const ALLOWED_ORIGINS = [
  "https://heaven-os.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];
```

- Production : origin stricte (heaven-os.vercel.app)
- Development : origin permissive
- Methods : GET, POST, PUT, DELETE, OPTIONS
- Headers : Content-Type, Authorization
- Credentials : true

### 5.3 Input Sanitization

| Layer | Implementation |
|-------|---------------|
| HTML stripping | `sanitize()` — regex `/<[^>]*>/g` sur tous inputs texte |
| Model slug | `isValidModelSlug()` — regex `/^[a-z0-9][a-z0-9-]{0,29}$/` |
| Code normalization | `.trim().toUpperCase().replace(/\s+/g, "")` |
| Pseudo normalization | `.trim().toLowerCase()` |
| URL validation | Wall photos : doit commencer par `https://res.cloudinary.com/` |
| Length limits | Wall pseudo: 30 chars, Wall content: 500 chars |
| File size | Upload base64 estimated: 10 MB max |

### 5.4 Race Condition Prevention

| Scenario | Protection |
|----------|-----------|
| Code double-validation | Atomic update: `UPDATE ... WHERE used = false` — fails if already used |
| Credit double-spend | Atomic debit: `UPDATE ... WHERE total_tokens_spent <= (bought - price)` |
| Like/unlike atomicity | RPC functions `increment_likes`, `decrement_likes` avec fallback manual |
| Screenshot count | Atomic increment `screenshot_count + 1` |

### 5.5 Device Fingerprinting & Tracking

**Systeme :** Max 2 devices par code (`agence_code_devices`)

1. Client presente code → API `/api/codes/security` check fingerprint + IP
2. Device connu → update `last_seen`, autoriser
3. Nouveau device, count < max → enregistrer, autoriser
4. Nouveau device, count >= max → bloquer, flag `security_alert` sur code, enregistrer comme `blocked: true`
5. Code bloque globalement → rejet immediat

**Fingerprint :** Genere cote client (navigator, canvas, WebGL hash)
**IP :** Extrait de `x-forwarded-for` ou `x-real-ip`

### 5.6 Screenshot Detection

**Flow :**
1. Frontend detecte tentative screenshot (visibilitychange, PrintScreen, devtools)
2. POST `/api/security/screenshot-alert` avec `subscriberId`, `modelId`, `page`
3. Server timestamp (jamais trust client)
4. Increment `screenshot_count` sur client
5. Escalation progressive :
   - 1er screenshot → `logged` (enregistre dans security_alerts)
   - 2eme screenshot → `warning_sent` (message auto au client)
   - 3eme+ screenshot → `escalated` (alerte severe, message menacant)
6. Messages auto envoyes via agence_messages (sender_type: "model")

**Pages surveillees :** profile, gallery, chat, wall, shop

### 5.7 Media Isolation

**Principe :** Un modele ne peut acceder qu'a ses propres fichiers Cloudinary.

```
heaven/
├── yumi/
│   ├── content/
│   ├── avatar/
│   └── banner/
├── ruby/
│   ├── content/
│   ├── avatar/
│   └── banner/
└── paloma/
    ├── content/
    ├── avatar/
    └── banner/
```

**Validation :** `validateFolderOwnership(folder, model)` — verifie que le folder commence par `heaven/{model}/`
**Quotas :** Configures par modele dans `agence_media_config` (5 GB, 2000 fichiers par defaut)
**Orphan cleanup :** `/api/upload/cleanup` compare Cloudinary vs DB, supprime fichiers non references

---

## 6. MONITORING DASHBOARD (pour HQ sync)

Metriques a exposer via `/api/sqwensy` (GET avec `x-api-key`) :

### 6.1 Infrastructure Limits

| Metrique | Source | Limite Free | Alerte a |
|----------|--------|-------------|----------|
| DB size | Supabase dashboard | 500 MB | 400 MB (80%) |
| Cloudinary credits | Cloudinary dashboard | 25/mois | 20 (80%) |
| Vercel bandwidth | Vercel dashboard | 100 GB/mois | 80 GB (80%) |

### 6.2 Business Metrics

| Metrique | Query | Description |
|----------|-------|-------------|
| Active models | `agence_models WHERE is_active = true` | Modeles actives |
| Active clients (30j) | `agence_clients WHERE last_active > now() - 30 days` | Clients actifs |
| Revenue total | `SUM(agence_platform_accounts.monthly_revenue)` | Revenu mensuel platforms |
| Codes active | `agence_codes WHERE active = true AND revoked = false AND expires_at > now()` | Codes valides |
| Codes expired | `agence_codes WHERE expires_at <= now()` | Codes expires |
| Codes revoked | `agence_codes WHERE revoked = true` | Codes revoques |
| Security alerts | `COUNT(agence_security_alerts)` | Alertes total |
| Security alerts (7j) | `agence_security_alerts WHERE created_at > now() - 7 days` | Alertes recentes |

### 6.3 Donnees exposees via GET /api/sqwensy

Par modele :
- `slug` — Identifiant
- `platform_accounts[]` — Platform, handle, subscribers, revenue
- `total_subscribers` — Total abonnes toutes plateformes
- `monthly_revenue` — Revenu mensuel total
- `content_total` / `content_published` — Pipeline stats
- `content_revenue` — Revenu contenu
- `active_fans` — Fans non-churned
- `fan_revenue` — Revenu fans
- `active_goals` — Objectifs actifs

### 6.4 Build Status

| Source | Methode |
|--------|---------|
| Vercel deployments | API Vercel ou dashboard |
| API errors | Logs Vercel (console.error) |
| DB health | Supabase dashboard |

---

## 7. COST PROJECTION TABLE

### 7.1 Phases de croissance

| Phase | Mois | Profils actifs | Revenue est. | Vercel | Supabase | Cloudinary | Domaine | Email | Total couts | Marge |
|-------|------|---------------|-------------|--------|----------|------------|---------|-------|-------------|-------|
| **1 - Lancement** | 0-6 | 2 | 300-1000 EUR | 0 EUR | 0 EUR | 0 EUR | 0 EUR | 0 EUR | **0 EUR** | **100%** |
| **2 - Croissance** | 6-12 | 5 | 2500-7500 EUR | 20 USD | 25 USD | 0 EUR | 12 EUR | 0 EUR | **~57 EUR** | **~97%** |
| **3 - Scale** | 12-24 | 10-20 | 10K-30K EUR | 20 USD | 25 USD | 89 USD | 12 EUR | 6 USD | **~152 EUR** | **~99%** |
| **4 - Enterprise** | 24+ | 50+ | 50K+ EUR | 20 USD | 25 USD | 89 USD | 12 EUR | 18 USD | **~164 EUR** | **~99.7%** |

### 7.2 Triggers de transition

**Phase 1 → Phase 2 :**
- \>100 GB bandwidth Vercel → Vercel Pro ($20)
- \>500 MB DB → Supabase Pro ($25)
- Besoin domaine custom → Domain (~12 EUR/an)

**Phase 2 → Phase 3 :**
- \>25 Cloudinary credits/mois → Cloudinary Plus ($89)
- Team access requis → Google Workspace ($6/user)

**Phase 3 → Phase 4 :**
- Multi-user email → Google Workspace scale
- Branch protection → GitHub Team ($4/user)

### 7.3 Couts fixes Phase 1 (actuel)

| Service | Cout mensuel |
|---------|-------------|
| Vercel Hobby | 0 EUR |
| Supabase Free | 0 EUR |
| Cloudinary Free | 0 EUR |
| GitHub Free | 0 EUR |
| Domain | 0 EUR |
| **TOTAL** | **0 EUR** |

### 7.4 Notes

- Tous les services sont sur free tier, le projet fonctionne a **zero cout fixe**
- Les limites free tier sont genereuses pour les 2-3 premiers modeles
- Le premier upgrade probable sera Supabase (500 MB DB) ou Vercel (bandwidth)
- La marge reste superieure a 97% meme en phase de croissance grace aux couts SaaS faibles
- Le revenu est base sur les commissions des packs vendus (25% par defaut)

---

## ANNEXE A : Fichiers cles du projet

```
clients/heaven/
├── src/
│   ├── app/api/           ← 29 route files (ce document section 4)
│   ├── lib/
│   │   ├── auth.ts        ← CORS, validation, helpers
│   │   ├── api-utils.ts   ← sanitize(), apiError(), apiSuccess()
│   │   ├── supabase-server.ts ← getServerSupabase()
│   │   └── cloudinary.ts  ← uploadToCloudinary(), deleteFromCloudinary(), etc.
│   ├── types/heaven.ts    ← Types TypeScript (CodeRow, HeavenRole, etc.)
│   └── constants/
│       ├── packs.ts       ← DEFAULT_PACKS
│       └── badges.ts      ← calculateBadgeGrade()
├── supabase/
│   └── migrations/        ← 17 fichiers SQL (006-022)
└── docs/
    └── masterplan/
        └── INFRASTRUCTURE-HEAVEN.md ← CE DOCUMENT
```

---

*Document genere le 7 avril 2026. Mettre a jour apres chaque migration, ajout d'API, ou changement d'infrastructure.*

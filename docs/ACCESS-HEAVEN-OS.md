# HEAVEN OS — Configuration & Acces

## Deploiement
| Service | URL |
|---------|-----|
| **Vercel** | https://heaven-os.vercel.app |
| **Repo** | akaly-one/heaven (ou clients/heaven en local) |
| **Framework** | Next.js 15 |

## Supabase — Heaven DB
| Cle | Valeur |
|-----|--------|
| **Project** | tbvojfjfgmjiwitiudbn |
| **URL** | https://tbvojfjfgmjiwitiudbn.supabase.co |
| **Dashboard** | https://supabase.com/dashboard/project/tbvojfjfgmjiwitiudbn |
| **Anon Key** | sb_publishable_xWuqKENOxdzsVPwkpoYHsQ_Bt-PFkUN |
| **Service Role** | *(dans .env.local)* |

## Cloudinary — Heaven (compte separe de SQWENSY)
| Cle | Valeur |
|-----|--------|
| **Cloud Name** | ddwgcu3d5 |
| **API Key** | 249245334688281 |
| **Console** | https://console.cloudinary.com |

## Structure Cloudinary par model
```
heaven/
├── yumi/
│   ├── content/    ← galerie media
│   ├── avatar/     ← photo profil
│   └── banner/     ← banniere profil
├── ruby/
│   ├── content/
│   ├── avatar/
│   └── banner/
├── paloma/
│   ├── content/
│   ├── avatar/
│   └── banner/
└── uploads/        ← fallback generique
```

## Model Registry
| Model ID | Slug | Display | Status |
|----------|------|---------|--------|
| MODEL-01 | yumi | YUMI | Active |
| MODEL-02 | ruby | RUBY | Active |
| MODEL-03 | paloma | PALOMA | Inactive |

## Auth
| Cle | Valeur |
|-----|--------|
| **JWT Secret** | *(dans .env.local)* |
| **Login** | Via code personnel (valide depuis SQWENSY OS API) |
| **Root access** | Via HEAVEN_ROOT_CODE env var |

## Sync avec SQWENSY OS
| Variable | Description |
|----------|-------------|
| **HEAVEN_SYNC_SECRET** | Secret partage pour sync bidirectionnelle |
| **NEXT_PUBLIC_SQWENSY_URL** | https://sqwensy.com (validation codes login) |

## Tables DB (16 tables)
```
agence_models          ← registre models (MODEL-XX)
agence_clients         ← CRM par model
agence_codes           ← codes acces temporaires
agence_messages        ← conversations par model
agence_posts           ← feed posts
agence_wall_posts      ← wall visiteurs
agence_uploads         ← metadata media Cloudinary
agence_packs           ← packs abonnement (Basic/Premium/VIP)
agence_platform_accounts ← comptes plateformes (OF, IG, etc.)
agence_content_pipeline  ← pipeline contenu (idea→published)
agence_fan_lifecycle     ← cycle de vie fans
agence_goals           ← objectifs strategiques
agence_purchases       ← achats/transactions
agence_media_config    ← config Cloudinary + quotas par model
```

## Migrations locales (a jour)
```
006_packs_wise_url.sql
007_packs_stripe_link.sql
008_wall_social_handles.sql
009_fix_agence_models.sql
011_complete_heaven_db.sql     ← migration principale (tout)
012_seed_models.sql            ← seed YUMI/RUBY/PALOMA
013_media_isolation.sql        ← isolation media par model
```

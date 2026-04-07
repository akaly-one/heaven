-- ══════════════════════════════════════════════
-- Migration 026: Generic Model IDs
-- Adds model_id column to agence_models and
-- converts all content tables from slugs to model IDs.
-- gret→m1, yumi→m2, ruby→m3, paloma→m4
-- ══════════════════════════════════════════════

-- Step 1: Add model_id to agence_models
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS model_id VARCHAR(10) UNIQUE;
UPDATE agence_models SET model_id = 'm1' WHERE slug = 'gret';
UPDATE agence_models SET model_id = 'm2' WHERE slug = 'yumi';
UPDATE agence_models SET model_id = 'm3' WHERE slug = 'ruby';
UPDATE agence_models SET model_id = 'm4' WHERE slug = 'paloma';

-- Step 2: Convert content tables (model column)
-- agence_clients
UPDATE agence_clients SET model = 'm1' WHERE model = 'gret';
UPDATE agence_clients SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_clients SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_clients SET model = 'm4' WHERE model = 'paloma';

-- agence_codes
UPDATE agence_codes SET model = 'm1' WHERE model = 'gret';
UPDATE agence_codes SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_codes SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_codes SET model = 'm4' WHERE model = 'paloma';

-- agence_uploads
UPDATE agence_uploads SET model = 'm1' WHERE model = 'gret';
UPDATE agence_uploads SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_uploads SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_uploads SET model = 'm4' WHERE model = 'paloma';

-- agence_posts
UPDATE agence_posts SET model = 'm1' WHERE model = 'gret';
UPDATE agence_posts SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_posts SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_posts SET model = 'm4' WHERE model = 'paloma';

-- agence_messages
UPDATE agence_messages SET model = 'm1' WHERE model = 'gret';
UPDATE agence_messages SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_messages SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_messages SET model = 'm4' WHERE model = 'paloma';

-- agence_wall_posts
UPDATE agence_wall_posts SET model = 'm1' WHERE model = 'gret';
UPDATE agence_wall_posts SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_wall_posts SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_wall_posts SET model = 'm4' WHERE model = 'paloma';

-- agence_pending_payments
UPDATE agence_pending_payments SET model = 'm1' WHERE model = 'gret';
UPDATE agence_pending_payments SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_pending_payments SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_pending_payments SET model = 'm4' WHERE model = 'paloma';

-- agence_revenue_log
UPDATE agence_revenue_log SET model = 'm1' WHERE model = 'gret';
UPDATE agence_revenue_log SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_revenue_log SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_revenue_log SET model = 'm4' WHERE model = 'paloma';

-- agence_packs
UPDATE agence_packs SET model = 'm1' WHERE model = 'gret';
UPDATE agence_packs SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_packs SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_packs SET model = 'm4' WHERE model = 'paloma';

-- agence_purchases
UPDATE agence_purchases SET model = 'm1' WHERE model = 'gret';
UPDATE agence_purchases SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_purchases SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_purchases SET model = 'm4' WHERE model = 'paloma';

-- agence_pages
UPDATE agence_pages SET model = 'm1' WHERE model = 'gret';
UPDATE agence_pages SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_pages SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_pages SET model = 'm4' WHERE model = 'paloma';

-- agence_collaborators
UPDATE agence_collaborators SET model = 'm1' WHERE model = 'gret';
UPDATE agence_collaborators SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_collaborators SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_collaborators SET model = 'm4' WHERE model = 'paloma';

-- Step 3: Convert pipeline tables (model_slug column)
-- agence_platform_accounts
UPDATE agence_platform_accounts SET model_slug = 'm1' WHERE model_slug = 'gret';
UPDATE agence_platform_accounts SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_platform_accounts SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_platform_accounts SET model_slug = 'm4' WHERE model_slug = 'paloma';

-- agence_content_pipeline
UPDATE agence_content_pipeline SET model_slug = 'm1' WHERE model_slug = 'gret';
UPDATE agence_content_pipeline SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_content_pipeline SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_content_pipeline SET model_slug = 'm4' WHERE model_slug = 'paloma';

-- agence_fan_lifecycle
UPDATE agence_fan_lifecycle SET model_slug = 'm1' WHERE model_slug = 'gret';
UPDATE agence_fan_lifecycle SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_fan_lifecycle SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_fan_lifecycle SET model_slug = 'm4' WHERE model_slug = 'paloma';

-- agence_goals
UPDATE agence_goals SET model_slug = 'm1' WHERE model_slug = 'gret';
UPDATE agence_goals SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_goals SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_goals SET model_slug = 'm4' WHERE model_slug = 'paloma';

-- agence_media_config
UPDATE agence_media_config SET model_slug = 'm1' WHERE model_slug = 'gret';
UPDATE agence_media_config SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_media_config SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_media_config SET model_slug = 'm4' WHERE model_slug = 'paloma';

-- ══════════════════════════════════════════════
-- SAFE & IDEMPOTENT. Running twice is harmless.
-- Cloudinary paths keep using slugs (folder_root stays as-is).
-- URL routing /m/[slug] still works — slug lookup via agence_models.
-- ══════════════════════════════════════════════

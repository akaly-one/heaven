-- ═══════════════════════════════════════════════════════════
-- 029: Fix Model Consistency
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- Ensures:
-- 1. agence_accounts table exists with proper schema
-- 2. All content tables use mN model format
-- 3. heaven_model_registry view uses model_id for counting
-- Safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════

-- ═══════ PART 1: agence_accounts table ═══════
CREATE TABLE IF NOT EXISTS agence_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  role VARCHAR NOT NULL DEFAULT 'model', -- root, model
  model_slug VARCHAR,
  model_id VARCHAR(10),
  display_name VARCHAR NOT NULL,
  active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add model_id column if missing (for existing tables)
ALTER TABLE agence_accounts ADD COLUMN IF NOT EXISTS model_id VARCHAR(10);

-- Enable RLS
ALTER TABLE agence_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_accounts' AND policyname = 'agence_accounts_all') THEN
    CREATE POLICY agence_accounts_all ON agence_accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed accounts from agence_models if agence_accounts is empty
INSERT INTO agence_accounts (code, role, model_slug, model_id, display_name, active)
SELECT
  LOWER(m.slug) AS code,
  'model' AS role,
  m.slug AS model_slug,
  m.model_id,
  COALESCE(m.display_name, m.display, m.slug) AS display_name,
  COALESCE(m.is_active, true) AS active
FROM agence_models m
WHERE NOT EXISTS (SELECT 1 FROM agence_accounts WHERE model_slug = m.slug)
ON CONFLICT (code) DO UPDATE SET
  model_id = EXCLUDED.model_id,
  display_name = EXCLUDED.display_name;

-- Ensure root account exists
INSERT INTO agence_accounts (code, role, display_name, active)
VALUES ('root', 'root', 'Root Admin', true)
ON CONFLICT (code) DO NOTHING;

-- ═══════ PART 2: Re-apply mN conversions (idempotent) ═══════
-- agence_models model_id
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS model_id VARCHAR(10) UNIQUE;
UPDATE agence_models SET model_id = 'm2' WHERE slug = 'yumi' AND (model_id IS NULL OR model_id NOT LIKE 'm%');
UPDATE agence_models SET model_id = 'm3' WHERE slug = 'ruby' AND (model_id IS NULL OR model_id NOT LIKE 'm%');
UPDATE agence_models SET model_id = 'm4' WHERE slug = 'paloma' AND (model_id IS NULL OR model_id NOT LIKE 'm%');

-- Content tables: convert any remaining slugs to mN
UPDATE agence_clients SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_clients SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_clients SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_codes SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_codes SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_codes SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_uploads SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_uploads SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_uploads SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_posts SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_posts SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_posts SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_messages SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_messages SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_messages SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_wall_posts SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_wall_posts SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_wall_posts SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_pending_payments SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_pending_payments SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_pending_payments SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_revenue_log SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_revenue_log SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_revenue_log SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_packs SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_packs SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_packs SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_purchases SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_purchases SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_purchases SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_pages SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_pages SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_pages SET model = 'm4' WHERE model = 'paloma';

UPDATE agence_collaborators SET model = 'm2' WHERE model = 'yumi';
UPDATE agence_collaborators SET model = 'm3' WHERE model = 'ruby';
UPDATE agence_collaborators SET model = 'm4' WHERE model = 'paloma';

-- Pipeline tables (model_slug column)
UPDATE agence_platform_accounts SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_platform_accounts SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_platform_accounts SET model_slug = 'm4' WHERE model_slug = 'paloma';

UPDATE agence_content_pipeline SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_content_pipeline SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_content_pipeline SET model_slug = 'm4' WHERE model_slug = 'paloma';

UPDATE agence_fan_lifecycle SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_fan_lifecycle SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_fan_lifecycle SET model_slug = 'm4' WHERE model_slug = 'paloma';

UPDATE agence_goals SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_goals SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_goals SET model_slug = 'm4' WHERE model_slug = 'paloma';

UPDATE agence_media_config SET model_slug = 'm2' WHERE model_slug = 'yumi';
UPDATE agence_media_config SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE agence_media_config SET model_slug = 'm4' WHERE model_slug = 'paloma';

-- Sync model_id in agence_accounts
UPDATE agence_accounts SET model_id = 'm2' WHERE model_slug = 'yumi' AND (model_id IS NULL OR model_id NOT LIKE 'm%');
UPDATE agence_accounts SET model_id = 'm3' WHERE model_slug = 'ruby' AND (model_id IS NULL OR model_id NOT LIKE 'm%');
UPDATE agence_accounts SET model_id = 'm4' WHERE model_slug = 'paloma' AND (model_id IS NULL OR model_id NOT LIKE 'm%');

-- ═══════ PART 3: Fix heaven_model_registry view ═══════
DROP VIEW IF EXISTS heaven_model_registry;
CREATE VIEW heaven_model_registry AS
SELECT
  m.id,
  m.slug,
  m.model_id,
  m.model_number,
  COALESCE(m.display_name, m.display, m.slug) AS display_name,
  m.avatar,
  m.status,
  m.is_active,
  m.status_text,
  m.total_revenue,
  m.total_transactions,
  m.activated_at,
  m.activated_by,
  m.config,
  (SELECT COUNT(*) FROM agence_clients c WHERE c.model = m.model_id OR c.model = m.slug) AS client_count,
  (SELECT COUNT(*) FROM agence_codes c WHERE (c.model = m.model_id OR c.model = m.slug) AND c.active = true) AS active_codes,
  (SELECT COUNT(*) FROM agence_posts p WHERE p.model = m.model_id OR p.model = m.slug) AS post_count,
  (SELECT COUNT(*) FROM agence_uploads u WHERE u.model = m.model_id OR u.model = m.slug) AS upload_count,
  (SELECT COUNT(*) FROM agence_messages msg WHERE msg.model = m.model_id OR msg.model = m.slug) AS messages_count,
  (SELECT COUNT(*) FROM agence_content_pipeline cp WHERE cp.model_slug = m.model_id OR cp.model_slug = m.slug) AS pipeline_items_count,
  (SELECT COUNT(*) FROM agence_platform_accounts pa WHERE (pa.model_slug = m.model_id OR pa.model_slug = m.slug) AND pa.status = 'active') AS platforms_count,
  (SELECT COALESCE(SUM(r.amount), 0) FROM agence_revenue_log r WHERE r.model = m.model_id OR r.model = m.slug) AS total_revenue_verified
FROM agence_models m
ORDER BY m.model_number;

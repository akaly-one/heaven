-- ═══════════════════════════════════════════════════════════
-- 011_complete_heaven_db.sql
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- SINGLE FILE: Execute this in the Heaven Supabase SQL Editor.
-- Creates all missing tables + model registry system.
-- Safe to re-run (IF NOT EXISTS everywhere).
-- ═══════════════════════════════════════════════════════════


-- ═══════════════════════════════════════
-- PART 1: MISSING TABLES (from migration 005)
-- ═══════════════════════════════════════

-- Platform accounts linked to models
CREATE TABLE IF NOT EXISTS agence_platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug VARCHAR NOT NULL,
  platform VARCHAR NOT NULL,
  handle VARCHAR NOT NULL,
  profile_url TEXT,
  status VARCHAR DEFAULT 'active',
  subscribers_count INT DEFAULT 0,
  monthly_revenue DECIMAL(10,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 25.00,
  notes TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content pipeline
CREATE TABLE IF NOT EXISTS agence_content_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  content_type VARCHAR NOT NULL,
  platforms JSONB DEFAULT '[]',
  stage VARCHAR DEFAULT 'idea',
  scheduled_date DATE,
  published_date DATE,
  tier VARCHAR,
  price DECIMAL(10,2),
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fan lifecycle tracking
CREATE TABLE IF NOT EXISTS agence_fan_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES agence_clients(id) ON DELETE CASCADE,
  model_slug VARCHAR NOT NULL,
  stage VARCHAR DEFAULT 'new',
  source_platform VARCHAR,
  first_interaction TIMESTAMPTZ DEFAULT now(),
  last_interaction TIMESTAMPTZ DEFAULT now(),
  total_spent DECIMAL(10,2) DEFAULT 0,
  messages_count INT DEFAULT 0,
  tips_total DECIMAL(10,2) DEFAULT 0,
  ppv_purchased INT DEFAULT 0,
  churn_risk VARCHAR DEFAULT 'low',
  tags JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Strategic goals per model
CREATE TABLE IF NOT EXISTS agence_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR DEFAULT 'EUR',
  deadline DATE,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchases / transactions
CREATE TABLE IF NOT EXISTS agence_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES agence_clients(id) ON DELETE SET NULL,
  upload_id VARCHAR,
  model VARCHAR NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for missing tables
CREATE INDEX IF NOT EXISTS idx_platform_accounts_model ON agence_platform_accounts(model_slug);
CREATE INDEX IF NOT EXISTS idx_content_pipeline_model ON agence_content_pipeline(model_slug);
CREATE INDEX IF NOT EXISTS idx_content_pipeline_stage ON agence_content_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_fan_lifecycle_model ON agence_fan_lifecycle(model_slug);
CREATE INDEX IF NOT EXISTS idx_fan_lifecycle_stage ON agence_fan_lifecycle(stage);
CREATE INDEX IF NOT EXISTS idx_goals_model ON agence_goals(model_slug);
CREATE INDEX IF NOT EXISTS idx_purchases_model ON agence_purchases(model);
CREATE INDEX IF NOT EXISTS idx_purchases_client ON agence_purchases(client_id);

-- RLS for new tables
ALTER TABLE agence_platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agence_content_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE agence_fan_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE agence_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agence_purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_platform_accounts' AND policyname = 'agence_platform_accounts_all') THEN
    CREATE POLICY agence_platform_accounts_all ON agence_platform_accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_content_pipeline' AND policyname = 'agence_content_pipeline_all') THEN
    CREATE POLICY agence_content_pipeline_all ON agence_content_pipeline FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_fan_lifecycle' AND policyname = 'agence_fan_lifecycle_all') THEN
    CREATE POLICY agence_fan_lifecycle_all ON agence_fan_lifecycle FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_goals' AND policyname = 'agence_goals_all') THEN
    CREATE POLICY agence_goals_all ON agence_goals FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_purchases' AND policyname = 'agence_purchases_all') THEN
    CREATE POLICY agence_purchases_all ON agence_purchases FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ═══════════════════════════════════════
-- PART 2: MODEL REGISTRY SYSTEM (migration 010)
-- ═══════════════════════════════════════

-- Model ID sequence
CREATE SEQUENCE IF NOT EXISTS heaven_model_seq START 1;

-- Add columns to agence_models
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS model_id VARCHAR(20) UNIQUE;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS model_number INT UNIQUE;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS activated_by VARCHAR(50);
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS display_name TEXT;

-- display_name fallback from display column
UPDATE agence_models SET display_name = COALESCE(display, slug) WHERE display_name IS NULL;

-- Assign model_ids to existing models
UPDATE agence_models SET model_number = 1, model_id = 'MODEL-01', is_active = true, activated_at = now()
  WHERE slug = 'yumi' AND model_id IS NULL;
UPDATE agence_models SET model_number = 2, model_id = 'MODEL-02', is_active = true, activated_at = now()
  WHERE slug = 'ruby' AND model_id IS NULL;
UPDATE agence_models SET model_number = 3, model_id = 'MODEL-03', is_active = false
  WHERE slug = 'paloma' AND model_id IS NULL;

-- Advance sequence past existing
SELECT setval('heaven_model_seq', 3, true);

-- Activation function
CREATE OR REPLACE FUNCTION activate_model(
  p_slug TEXT,
  p_activated_by TEXT DEFAULT 'root'
)
RETURNS TABLE(model_id VARCHAR, model_number INT, slug TEXT) AS $$
DECLARE
  v_num INT;
  v_model_id VARCHAR;
  v_existing RECORD;
BEGIN
  SELECT m.slug, m.model_number, m.model_id, m.is_active
  INTO v_existing
  FROM agence_models m WHERE m.slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Model slug % not found in agence_models', p_slug;
  END IF;

  IF v_existing.is_active AND v_existing.model_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing.model_id, v_existing.model_number, v_existing.slug;
    RETURN;
  END IF;

  IF v_existing.model_number IS NULL THEN
    v_num := nextval('heaven_model_seq');
    v_model_id := 'MODEL-' || lpad(v_num::TEXT, 2, '0');
  ELSE
    v_num := v_existing.model_number;
    v_model_id := v_existing.model_id;
  END IF;

  UPDATE agence_models SET
    model_number = v_num,
    model_id = v_model_id,
    is_active = true,
    activated_at = now(),
    activated_by = p_activated_by
  WHERE agence_models.slug = p_slug;

  RETURN QUERY SELECT v_model_id, v_num, p_slug;
END;
$$ LANGUAGE plpgsql;

-- Deactivation function
CREATE OR REPLACE FUNCTION deactivate_model(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE agence_models SET is_active = false WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql;

-- Model registry view with stats
CREATE OR REPLACE VIEW heaven_model_registry AS
SELECT
  m.id,
  m.slug,
  m.model_id,
  m.model_number,
  COALESCE(m.display_name, m.display, m.slug) AS display_name,
  m.avatar,
  m.is_active,
  m.activated_at,
  m.activated_by,
  m.config,
  (SELECT count(*) FROM agence_clients c WHERE c.model = m.slug) AS clients_count,
  (SELECT count(*) FROM agence_codes c WHERE c.model = m.slug AND c.active = true) AS active_codes_count,
  (SELECT count(*) FROM agence_posts p WHERE p.model = m.slug) AS posts_count,
  (SELECT count(*) FROM agence_uploads u WHERE u.model = m.slug) AS uploads_count,
  (SELECT count(*) FROM agence_messages msg WHERE msg.model = m.slug) AS messages_count,
  (SELECT count(*) FROM agence_content_pipeline cp WHERE cp.model_slug = m.slug) AS pipeline_items_count,
  (SELECT count(*) FROM agence_platform_accounts pa WHERE pa.model_slug = m.slug AND pa.status = 'active') AS platforms_count
FROM agence_models m
ORDER BY m.model_number;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agence_models_active ON agence_models(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agence_models_model_id ON agence_models(model_id);

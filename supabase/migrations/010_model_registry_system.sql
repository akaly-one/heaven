-- ═══════════════════════════════════════════════════════════
-- 010_model_registry_system.sql
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- Structured model assignment system.
-- Each model gets a unique model_id (MODEL-01, MODEL-02, etc.)
-- Activation creates all necessary data slots.
-- Shared tables stay untouched. Per-model tables are partitioned.
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Model ID sequence ──────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS heaven_model_seq START 1;

-- ─── 2. Add model_id + activation tracking to agence_models ─

ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS model_id VARCHAR(20) UNIQUE;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS model_number INT UNIQUE;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS activated_by VARCHAR(50); -- 'root' or admin slug
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS presence JSONB DEFAULT '{}';

-- Assign model_ids to existing models
UPDATE agence_models SET model_number = 1, model_id = 'MODEL-01', is_active = true, activated_at = now()
  WHERE slug = 'yumi' AND model_id IS NULL;
UPDATE agence_models SET model_number = 2, model_id = 'MODEL-02', is_active = true, activated_at = now()
  WHERE slug = 'ruby' AND model_id IS NULL;
UPDATE agence_models SET model_number = 3, model_id = 'MODEL-03', is_active = false
  WHERE slug = 'paloma' AND model_id IS NULL;

-- Advance sequence past existing
SELECT setval('heaven_model_seq', 3, true);

-- ─── 3. Model activation function ─────────────────────────
-- Assigns model_id + creates default data slots

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
  -- Check model exists
  SELECT m.slug, m.model_number, m.model_id, m.is_active
  INTO v_existing
  FROM agence_models m WHERE m.slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Model slug % not found in agence_models', p_slug;
  END IF;

  -- Already activated? Just return existing
  IF v_existing.is_active AND v_existing.model_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing.model_id, v_existing.model_number, v_existing.slug;
    RETURN;
  END IF;

  -- Assign new number if not yet assigned
  IF v_existing.model_number IS NULL THEN
    v_num := nextval('heaven_model_seq');
    v_model_id := 'MODEL-' || lpad(v_num::TEXT, 2, '0');
  ELSE
    v_num := v_existing.model_number;
    v_model_id := v_existing.model_id;
  END IF;

  -- Activate
  UPDATE agence_models SET
    model_number = v_num,
    model_id = v_model_id,
    is_active = true,
    activated_at = now(),
    activated_by = p_activated_by
  WHERE agence_models.slug = p_slug;

  -- Return result
  RETURN QUERY SELECT v_model_id, v_num, p_slug;
END;
$$ LANGUAGE plpgsql;

-- ─── 4. Model deactivation function ───────────────────────
-- Soft-deactivate: keeps data, hides from active queries

CREATE OR REPLACE FUNCTION deactivate_model(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE agence_models SET is_active = false WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql;

-- ─── 5. View: model registry with stats ───────────────────

CREATE OR REPLACE VIEW heaven_model_registry AS
SELECT
  m.id,
  m.slug,
  m.model_id,
  m.model_number,
  COALESCE(m.display, m.slug) AS display_name,
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

-- ─── 6. Index for fast per-model queries ──────────────────

CREATE INDEX IF NOT EXISTS idx_agence_models_active ON agence_models(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agence_models_model_id ON agence_models(model_id);

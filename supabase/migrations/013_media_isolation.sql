-- ═══════════════════════════════════════════════════════════
-- 013_media_isolation.sql
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- Media isolation per model:
-- 1. agence_media_config — per-model Cloudinary config + quotas
-- 2. Auto-provision on model activation
-- 3. Stats tracking (total files, total bytes)
-- Safe to re-run (IF NOT EXISTS everywhere).
-- ═══════════════════════════════════════════════════════════


-- ─── 1. Media config table ────────────────────────────────
-- One row per model — defines Cloudinary folder structure + limits

CREATE TABLE IF NOT EXISTS agence_media_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug VARCHAR NOT NULL UNIQUE,

  -- Cloudinary folder paths (auto-generated from slug)
  folder_root VARCHAR NOT NULL,        -- heaven/{slug}
  folder_content VARCHAR NOT NULL,     -- heaven/{slug}/content
  folder_avatar VARCHAR NOT NULL,      -- heaven/{slug}/avatar
  folder_banner VARCHAR NOT NULL,      -- heaven/{slug}/banner

  -- Quotas
  max_storage_mb INT DEFAULT 5000,           -- 5GB default
  max_uploads INT DEFAULT 2000,              -- max file count
  max_file_size_mb INT DEFAULT 10,           -- per-file limit
  allowed_types TEXT[] DEFAULT ARRAY['image','video'],

  -- Live stats (updated by triggers or periodic sync)
  total_files INT DEFAULT 0,
  total_bytes BIGINT DEFAULT 0,
  total_images INT DEFAULT 0,
  total_videos INT DEFAULT 0,
  last_upload_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_media_config_model ON agence_media_config(model_slug);

-- RLS
ALTER TABLE agence_media_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_media_config' AND policyname = 'agence_media_config_all') THEN
    CREATE POLICY agence_media_config_all ON agence_media_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ─── 2. Auto-provision function ───────────────────────────
-- Called when a model is activated — creates media config if missing

CREATE OR REPLACE FUNCTION provision_model_media(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO agence_media_config (
    model_slug,
    folder_root,
    folder_content,
    folder_avatar,
    folder_banner
  ) VALUES (
    p_slug,
    'heaven/' || p_slug,
    'heaven/' || p_slug || '/content',
    'heaven/' || p_slug || '/avatar',
    'heaven/' || p_slug || '/banner'
  )
  ON CONFLICT (model_slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- ─── 3. Update activate_model to auto-provision media ─────
-- Replaces existing function — adds media provisioning step

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
    -- Still ensure media config exists
    PERFORM provision_model_media(p_slug);
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

  -- Provision media folders
  PERFORM provision_model_media(p_slug);

  -- Return result
  RETURN QUERY SELECT v_model_id, v_num, p_slug;
END;
$$ LANGUAGE plpgsql;


-- ─── 4. Media stats update function ──────────────────────
-- Call periodically or after upload/delete to refresh stats

CREATE OR REPLACE FUNCTION refresh_media_stats(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE agence_media_config SET
    total_files = (SELECT count(*) FROM agence_uploads WHERE model = p_slug),
    total_images = (SELECT count(*) FROM agence_uploads WHERE model = p_slug AND type = 'photo'),
    total_videos = (SELECT count(*) FROM agence_uploads WHERE model = p_slug AND (type = 'video' OR type = 'reel')),
    last_upload_at = (SELECT max(created_at) FROM agence_uploads WHERE model = p_slug),
    updated_at = now()
  WHERE model_slug = p_slug;
END;
$$ LANGUAGE plpgsql;


-- ─── 5. Upload count trigger ─────────────────────────────
-- Auto-refresh stats when uploads change

CREATE OR REPLACE FUNCTION trg_refresh_media_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_slug TEXT;
BEGIN
  -- Get the model slug from the affected row
  IF TG_OP = 'DELETE' THEN
    v_slug := OLD.model;
  ELSE
    v_slug := NEW.model;
  END IF;

  -- Refresh stats for this model
  PERFORM refresh_media_stats(v_slug);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_uploads_media_stats ON agence_uploads;
CREATE TRIGGER trg_uploads_media_stats
  AFTER INSERT OR UPDATE OR DELETE ON agence_uploads
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_media_stats();


-- ─── 6. Seed media config for existing models ────────────

SELECT provision_model_media('yumi');
SELECT provision_model_media('ruby');
SELECT provision_model_media('paloma');


-- ─── 7. Update registry view with media stats ────────────

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
  -- Existing stats
  (SELECT count(*) FROM agence_clients c WHERE c.model = m.slug) AS clients_count,
  (SELECT count(*) FROM agence_codes c WHERE c.model = m.slug AND c.active = true) AS active_codes_count,
  (SELECT count(*) FROM agence_posts p WHERE p.model = m.slug) AS posts_count,
  (SELECT count(*) FROM agence_uploads u WHERE u.model = m.slug) AS uploads_count,
  (SELECT count(*) FROM agence_messages msg WHERE msg.model = m.slug) AS messages_count,
  (SELECT count(*) FROM agence_content_pipeline cp WHERE cp.model_slug = m.slug) AS pipeline_items_count,
  (SELECT count(*) FROM agence_platform_accounts pa WHERE pa.model_slug = m.slug AND pa.status = 'active') AS platforms_count,
  -- Media stats from config
  mc.folder_root AS media_folder,
  mc.total_files AS media_total_files,
  mc.total_images AS media_total_images,
  mc.total_videos AS media_total_videos,
  mc.total_bytes AS media_total_bytes,
  mc.max_storage_mb AS media_quota_mb,
  mc.last_upload_at AS media_last_upload
FROM agence_models m
LEFT JOIN agence_media_config mc ON mc.model_slug = m.slug
ORDER BY m.model_number;


-- ─── 8. Verify ───────────────────────────────────────────

SELECT model_slug, folder_root, folder_content, total_files, max_storage_mb
FROM agence_media_config
ORDER BY model_slug;

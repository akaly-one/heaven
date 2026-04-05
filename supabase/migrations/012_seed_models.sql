-- ═══════════════════════════════════════════════════════════
-- 012_seed_models.sql
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- Insert YUMI, RUBY, PALOMA into agence_models if missing.
-- Then re-run model_id assignment (safe — skips if already set).
-- ═══════════════════════════════════════════════════════════

-- 1. Insert model rows (skip if slug already exists)
INSERT INTO agence_models (slug, display, display_name, status, online, created_at, updated_at)
VALUES
  ('yumi', 'YUMI', 'YUMI', 'Creatrice exclusive', false, now(), now()),
  ('ruby', 'RUBY', 'RUBY', 'Creatrice exclusive', false, now(), now()),
  ('paloma', 'PALOMA', 'PALOMA', 'Creatrice exclusive', false, now(), now())
ON CONFLICT (slug) DO NOTHING;

-- 2. Assign model_ids (safe — only updates if model_id IS NULL)
UPDATE agence_models SET model_number = 1, model_id = 'MODEL-01', is_active = true, activated_at = now(), activated_by = 'root'
  WHERE slug = 'yumi' AND model_id IS NULL;

UPDATE agence_models SET model_number = 2, model_id = 'MODEL-02', is_active = true, activated_at = now(), activated_by = 'root'
  WHERE slug = 'ruby' AND model_id IS NULL;

UPDATE agence_models SET model_number = 3, model_id = 'MODEL-03', is_active = false
  WHERE slug = 'paloma' AND model_id IS NULL;

-- 3. Advance sequence past existing
SELECT setval('heaven_model_seq', 3, true);

-- 4. Verify
SELECT model_id, slug, display_name, is_active FROM agence_models ORDER BY model_number;

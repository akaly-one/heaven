-- 037_realign_media_config.sql
-- Align agence_media_config.model_slug to post-033 mN mapping
-- Order matters : move paloma m4 to tmp first to avoid conflict when yumi moves m2→m1.

DO $$ BEGIN
  UPDATE agence_media_config SET model_slug = '__tmp_paloma__' WHERE model_slug = 'm4';
  UPDATE agence_media_config SET model_slug = 'm1' WHERE model_slug = 'm2';
  UPDATE agence_media_config SET model_slug = 'm2' WHERE model_slug = '__tmp_paloma__';
END $$;

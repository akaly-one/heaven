-- 035_align_instagram_to_model_id.sql
-- instagram_* tables were seeded with model_slug='yumi' (literal slug) in 030.
-- Align them to use mN (model_id) for consistency with all other scoped tables + RLS helpers.

UPDATE instagram_config        SET model_slug = 'm1' WHERE model_slug = 'yumi';
UPDATE instagram_config        SET model_slug = 'm2' WHERE model_slug = 'paloma';
UPDATE instagram_config        SET model_slug = 'm3' WHERE model_slug = 'ruby';
UPDATE instagram_conversations SET model_slug = 'm1' WHERE model_slug = 'yumi';
UPDATE instagram_conversations SET model_slug = 'm2' WHERE model_slug = 'paloma';
UPDATE instagram_conversations SET model_slug = 'm3' WHERE model_slug = 'ruby';

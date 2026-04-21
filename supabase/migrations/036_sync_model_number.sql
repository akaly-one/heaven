-- 036_sync_model_number.sql
-- Sync agence_models.model_number with model_id (1/2/3) post-realign
UPDATE agence_models SET model_number = 1 WHERE slug = 'yumi';
UPDATE agence_models SET model_number = 2 WHERE slug = 'paloma';
UPDATE agence_models SET model_number = 3 WHERE slug = 'ruby';

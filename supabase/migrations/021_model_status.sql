-- 021: Model status/mood — editable by model, visible to visitors
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS status_text VARCHAR(200);
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
COMMENT ON COLUMN agence_models.status_text IS 'Model mood/announcement shown to visitors in hero';

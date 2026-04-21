-- Règles de visibilité par pack (Agent 5.B — Phase 5 B8)
-- Aligned on existing schema: agence_packs.model (not model_id)
-- Applied via mcp__supabase__apply_migration on 2026-04-21

ALTER TABLE agence_packs
  ADD COLUMN IF NOT EXISTS visibility_rule text
    DEFAULT 'if_purchased',
  ADD COLUMN IF NOT EXISTS blur_intensity int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS preview_count int DEFAULT 0;

-- Add CHECK constraints idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agence_packs_visibility_rule_check'
  ) THEN
    ALTER TABLE agence_packs
      ADD CONSTRAINT agence_packs_visibility_rule_check
      CHECK (visibility_rule IN ('public', 'if_purchased', 'preview_blur'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agence_packs_blur_intensity_check'
  ) THEN
    ALTER TABLE agence_packs
      ADD CONSTRAINT agence_packs_blur_intensity_check
      CHECK (blur_intensity BETWEEN 0 AND 20);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agence_packs_preview_count_check'
  ) THEN
    ALTER TABLE agence_packs
      ADD CONSTRAINT agence_packs_preview_count_check
      CHECK (preview_count >= 0);
  END IF;
END $$;

-- Index pour filtrage rapide par modèle + règle
CREATE INDEX IF NOT EXISTS idx_packs_visibility
  ON agence_packs (model, visibility_rule);

-- Commentaires
COMMENT ON COLUMN agence_packs.visibility_rule IS
  'public: visible à tous / if_purchased: visible aux acheteurs / preview_blur: flouté pour non-acheteurs avec N previews nets';
COMMENT ON COLUMN agence_packs.blur_intensity IS
  'Niveau de flou CSS (0=clear, 20=très flouté)';
COMMENT ON COLUMN agence_packs.preview_count IS
  'Nombre d''items affichés nets avant paywall (0 = tout flouté)';

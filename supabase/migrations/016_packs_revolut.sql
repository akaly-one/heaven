-- 016: Add revolut_url to agence_packs
ALTER TABLE agence_packs
  ADD COLUMN IF NOT EXISTS revolut_url text DEFAULT NULL;

COMMENT ON COLUMN agence_packs.revolut_url IS 'Revolut.me payment link for this pack';

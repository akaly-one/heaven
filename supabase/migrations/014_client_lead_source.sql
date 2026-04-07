-- 014: Add lead_source tracking to agence_clients
-- Tracks which promo hook converted the visitor (e.g. "private_story")

ALTER TABLE agence_clients
  ADD COLUMN IF NOT EXISTS lead_source text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_hook text DEFAULT NULL;

COMMENT ON COLUMN agence_clients.lead_source IS 'How the visitor registered: private_story, direct, code_entry';
COMMENT ON COLUMN agence_clients.lead_hook IS 'The specific promo message that was shown at registration time';

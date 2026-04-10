-- Add group_label for shoot sub-folders and client_id for custom content
ALTER TABLE agence_uploads ADD COLUMN IF NOT EXISTS group_label TEXT DEFAULT NULL;
ALTER TABLE agence_uploads ADD COLUMN IF NOT EXISTS client_id UUID DEFAULT NULL REFERENCES agence_clients(id) ON DELETE SET NULL;

-- Index for efficient grouping queries
CREATE INDEX IF NOT EXISTS idx_agence_uploads_group_label ON agence_uploads(group_label) WHERE group_label IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agence_uploads_client_id ON agence_uploads(client_id) WHERE client_id IS NOT NULL;

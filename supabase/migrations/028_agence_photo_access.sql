-- Track custom photo sales: which clients have access to which photos
-- Each row = one digital product sale (photo → client)
CREATE TABLE IF NOT EXISTS agence_photo_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id TEXT NOT NULL,           -- references agence_uploads.id
  client_id UUID NOT NULL REFERENCES agence_clients(id) ON DELETE CASCADE,
  model TEXT NOT NULL,               -- model slug (m1, m2, etc.)
  source_tier TEXT DEFAULT 'custom', -- tier d'origine (p1-p5 or custom)
  price NUMERIC(10,2) DEFAULT 0,    -- prix payé pour cet accès
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ DEFAULT NULL, -- null = accès actif
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_photo_access_upload ON agence_photo_access(upload_id);
CREATE INDEX IF NOT EXISTS idx_photo_access_client ON agence_photo_access(client_id);
CREATE INDEX IF NOT EXISTS idx_photo_access_model ON agence_photo_access(model);
CREATE INDEX IF NOT EXISTS idx_photo_access_active ON agence_photo_access(upload_id) WHERE revoked_at IS NULL;

-- Unique constraint: one client can only have one active access per photo
CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_access_unique_active
  ON agence_photo_access(upload_id, client_id) WHERE revoked_at IS NULL;

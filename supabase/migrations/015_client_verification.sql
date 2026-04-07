-- 015: Client verification system
-- Models manually verify visitor pseudos against their followers
-- Unverified after 7 days → auto-cleanup

ALTER TABLE agence_clients
  ADD COLUMN IF NOT EXISTS verified_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_by text DEFAULT NULL;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_agence_clients_verification
  ON agence_clients (verified_status, created_at)
  WHERE verified_status = 'pending';

COMMENT ON COLUMN agence_clients.verified_status IS 'pending | verified | rejected';
COMMENT ON COLUMN agence_clients.verified_at IS 'When the model verified/rejected this pseudo';
COMMENT ON COLUMN agence_clients.verified_by IS 'Who verified: model slug or root';

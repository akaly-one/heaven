-- 066 : Age gate + access level hierarchy
-- BRIEF-10 — cycle visiteur + validation admin obligatoire pour explicite/packs

ALTER TABLE agence_clients
  ADD COLUMN IF NOT EXISTS age_certified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_certified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS age_certified_ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'anonymous',
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validated_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Contrainte access_level
ALTER TABLE agence_clients
  DROP CONSTRAINT IF EXISTS agence_clients_access_level_check;
ALTER TABLE agence_clients
  ADD CONSTRAINT agence_clients_access_level_check
  CHECK (access_level IN ('anonymous','major_visitor','pending_upgrade','validated','rejected'));

-- Backfill : clients existants avec handle fourni → pending_upgrade
UPDATE agence_clients
SET access_level = 'pending_upgrade'
WHERE access_level = 'anonymous'
  AND (pseudo_insta IS NOT NULL OR (pseudo_snap IS NOT NULL AND pseudo_snap NOT LIKE 'visiteur-%' AND pseudo_snap NOT LIKE 'guest-%'));

-- Backfill : clients avec verified_status existant (si la colonne existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agence_clients' AND column_name='verified_status') THEN
    UPDATE agence_clients
    SET access_level = 'validated', validated_at = COALESCE(verified_at, NOW())
    WHERE verified_status = 'verified' AND access_level != 'validated';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agence_clients_access_level
  ON agence_clients(access_level) WHERE access_level != 'anonymous';

COMMENT ON COLUMN agence_clients.access_level IS 'BRIEF-10 : anonymous (visiteur sans age gate) | major_visitor (age certifié) | pending_upgrade (handle fourni en attente admin) | validated (admin a validé via flow IP match BRIEF-13) | rejected';

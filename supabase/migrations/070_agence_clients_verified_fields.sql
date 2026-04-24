-- 070 : Extension agence_clients avec verified_handle (distinct de pseudo_snap/insta qui peuvent être fournis sans validation)
-- BRIEF-13 — le handle validé est différent du handle fourni tant que pas passé par flow verification
-- + Trigger auto-create verification row quand handle Snap/Insta ajouté sur un client non encore validé

ALTER TABLE agence_clients
  ADD COLUMN IF NOT EXISTS verified_handle TEXT,
  ADD COLUMN IF NOT EXISTS verified_platform TEXT CHECK (verified_platform IS NULL OR verified_platform IN ('snap','insta')),
  ADD COLUMN IF NOT EXISTS verified_via_verification_id UUID REFERENCES agence_client_verifications(id);

-- Backfill : clients déjà access_level='validated' (migration 066) → copier pseudo_snap ou pseudo_insta dans verified_handle
-- Priorité : pseudo_insta > pseudo_snap (pas anon)
DO $$
BEGIN
  UPDATE agence_clients
  SET verified_handle = COALESCE(
    NULLIF(pseudo_insta, ''),
    CASE WHEN pseudo_snap NOT LIKE 'visiteur-%' AND pseudo_snap NOT LIKE 'guest-%' THEN pseudo_snap ELSE NULL END
  ),
  verified_platform = CASE
    WHEN pseudo_insta IS NOT NULL AND pseudo_insta != '' THEN 'insta'
    WHEN pseudo_snap IS NOT NULL AND pseudo_snap NOT LIKE 'visiteur-%' AND pseudo_snap NOT LIKE 'guest-%' THEN 'snap'
    ELSE NULL
  END
  WHERE access_level = 'validated' AND verified_handle IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_agence_clients_verified_handle ON agence_clients(verified_handle) WHERE verified_handle IS NOT NULL;

COMMENT ON COLUMN agence_clients.verified_handle IS 'BRIEF-13 : handle DÉFINITIVEMENT VALIDÉ via flow IP match (distinct de pseudo_snap/insta qui peuvent être juste fournis)';

-- Trigger auto-création verification quand handle ajouté (UV02)
CREATE OR REPLACE FUNCTION auto_create_verification_on_handle_add()
RETURNS TRIGGER AS $$
BEGIN
  -- Si un handle Snap/Insta vient d'être ajouté (NEW not null, OLD null ou différent)
  -- ET qu'aucune verification pending existe déjà → créer une row pending

  -- Cas snap
  IF NEW.pseudo_snap IS NOT NULL
     AND NEW.pseudo_snap != ''
     AND NEW.pseudo_snap NOT LIKE 'visiteur-%'
     AND NEW.pseudo_snap NOT LIKE 'guest-%'
     AND (TG_OP = 'INSERT' OR OLD.pseudo_snap IS NULL OR OLD.pseudo_snap != NEW.pseudo_snap OR OLD.pseudo_snap LIKE 'visiteur-%')
     AND NEW.access_level != 'validated' THEN
    INSERT INTO agence_client_verifications (client_id, target_handle, target_platform, token, code_6digit, expires_at, status)
    VALUES (
      NEW.id,
      NEW.pseudo_snap,
      'snap',
      encode(gen_random_bytes(16), 'hex'),
      lpad((random() * 900000 + 100000)::int::text, 6, '0'),
      NOW() + INTERVAL '72 hours',
      'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Cas insta (idem)
  IF NEW.pseudo_insta IS NOT NULL
     AND NEW.pseudo_insta != ''
     AND (TG_OP = 'INSERT' OR OLD.pseudo_insta IS NULL OR OLD.pseudo_insta != NEW.pseudo_insta)
     AND NEW.access_level != 'validated' THEN
    INSERT INTO agence_client_verifications (client_id, target_handle, target_platform, token, code_6digit, expires_at, status)
    VALUES (
      NEW.id,
      NEW.pseudo_insta,
      'insta',
      encode(gen_random_bytes(16), 'hex'),
      lpad((random() * 900000 + 100000)::int::text, 6, '0'),
      NOW() + INTERVAL '72 hours',
      'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_verif_handle ON agence_clients;
CREATE TRIGGER trg_auto_verif_handle
AFTER INSERT OR UPDATE OF pseudo_snap, pseudo_insta ON agence_clients
FOR EACH ROW EXECUTE FUNCTION auto_create_verification_on_handle_add();

COMMENT ON FUNCTION auto_create_verification_on_handle_add() IS 'BRIEF-13 UV02 : auto-create pending verification row quand handle Snap/Insta ajouté sur un client non encore validé';

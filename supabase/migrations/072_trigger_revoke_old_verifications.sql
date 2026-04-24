-- 072 : Trigger revoke anciennes verifications pending quand handle change
-- BRIEF-15 régression R2 bug #9 (R1 #1) : éviter multiplication rows pending

CREATE OR REPLACE FUNCTION auto_create_verification_on_handle_add()
RETURNS TRIGGER AS $$
BEGIN
  -- Cas snap : handle Snap ajouté ou modifié
  IF NEW.pseudo_snap IS NOT NULL
     AND NEW.pseudo_snap != ''
     AND NEW.pseudo_snap NOT LIKE 'visiteur-%'
     AND NEW.pseudo_snap NOT LIKE 'guest-%'
     AND (TG_OP = 'INSERT' OR OLD.pseudo_snap IS NULL OR OLD.pseudo_snap != NEW.pseudo_snap OR OLD.pseudo_snap LIKE 'visiteur-%')
     AND NEW.access_level != 'validated' THEN
    -- REVOKE anciennes rows pending/sent même platform (BRIEF-15 fix)
    UPDATE agence_client_verifications
    SET status = 'revoked',
        revoked_at = NOW(),
        revoked_reason = 'handle_changed'
    WHERE client_id = NEW.id
      AND target_platform = 'snap'
      AND status IN ('pending', 'sent');
    -- INSERT nouvelle row
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

  -- Cas insta : idem
  IF NEW.pseudo_insta IS NOT NULL
     AND NEW.pseudo_insta != ''
     AND (TG_OP = 'INSERT' OR OLD.pseudo_insta IS NULL OR OLD.pseudo_insta != NEW.pseudo_insta)
     AND NEW.access_level != 'validated' THEN
    UPDATE agence_client_verifications
    SET status = 'revoked',
        revoked_at = NOW(),
        revoked_reason = 'handle_changed'
    WHERE client_id = NEW.id
      AND target_platform = 'insta'
      AND status IN ('pending', 'sent');
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

COMMENT ON FUNCTION auto_create_verification_on_handle_add() IS 'BRIEF-15 fix : revoke anciennes rows pending/sent avant INSERT pour éviter orphelines (migration 072 remplace 070)';

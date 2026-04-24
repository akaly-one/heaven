-- ══════════════════════════════════════════════
-- 051_security_phase1_audit_and_lock.sql
-- Phase 1 sécurité progressive — audit log + failed attempts + auto-lock.
--
-- Directive NB 2026-04-24 : pas de 2FA ni sécurité ultime encore. Juste
-- sécuriser DB + exposition codes + brute force. Doc :
--   plans/03-tech/SECURITY-PROGRESSIVE-2026.md
--
-- Rien de destructif. Ajoute colonnes nullable + table audit.
-- ══════════════════════════════════════════════

-- 1. Audit events table (toutes actions auth sensibles)
CREATE TABLE IF NOT EXISTS agence_auth_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL CHECK (event_type IN (
    'login_success',
    'login_fail',
    'account_locked',
    'account_unlocked',
    'password_changed',
    'username_changed',
    'logout',
    'rate_limit_hit'
  )),
  account_id    UUID REFERENCES agence_accounts(id) ON DELETE SET NULL,
  account_code  TEXT,                                 -- code tenté (hashable après Phase 1.4)
  account_login TEXT,                                 -- login_alias utilisé (si applicable)
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  fingerprint   VARCHAR(64),
  metadata      JSONB DEFAULT '{}'::jsonb,            -- infos extras (reason, old/new value masqué, etc.)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_account ON agence_auth_events(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_type_time ON agence_auth_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_ip_time ON agence_auth_events(ip_address, created_at DESC);

ALTER TABLE agence_auth_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_auth_events' AND policyname = 'auth_events_admin_read') THEN
    -- Lecture : root (service role via API)
    CREATE POLICY auth_events_admin_read ON agence_auth_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_auth_events' AND policyname = 'auth_events_system_write') THEN
    -- Insert : système uniquement (via service role dans API routes)
    CREATE POLICY auth_events_system_write ON agence_auth_events FOR INSERT WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agence_auth_events IS 'Audit log auth - Phase 1 sécurité progressive. Event types: login_success, login_fail, account_locked, etc.';

-- 2. Failed attempts + auto-lock sur agence_accounts
ALTER TABLE agence_accounts
  ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS code_hash TEXT NULL;  -- Phase 1.4 : bcrypt hash (en parallèle du code clair pendant migration)

COMMENT ON COLUMN agence_accounts.failed_attempts IS 'Compteur échecs login consécutifs. Reset sur success. Auto-lock si >=10.';
COMMENT ON COLUMN agence_accounts.locked_until IS 'Verrouillage temporaire (15min) après 10 échecs. NULL = non verrouillé.';
COMMENT ON COLUMN agence_accounts.code_hash IS 'Bcrypt hash du password. Phase 1.4. Si non-null, prévaut sur code clair.';

-- 3. Rate limit DB-persistant (remplace in-memory map) — Phase 1.5
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address  VARCHAR(45) NOT NULL,
  attempts    INT DEFAULT 0,
  first_at    TIMESTAMPTZ DEFAULT NOW(),
  last_at     TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ NULL,
  UNIQUE (ip_address)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON auth_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON auth_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auth_rate_limits' AND policyname = 'rate_limits_system') THEN
    CREATE POLICY rate_limits_system ON auth_rate_limits FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE auth_rate_limits IS 'Rate limiting DB-persistant (survit aux restarts serveur). Phase 1.5 sécurité.';

-- 4. RPC utilitaire : claim/increment failed attempt (atomique)
CREATE OR REPLACE FUNCTION record_failed_login(p_account_id UUID, p_max_fails INT DEFAULT 10, p_lock_minutes INT DEFAULT 15)
RETURNS TABLE (failed_attempts INT, locked_until TIMESTAMPTZ) AS $$
DECLARE
  new_count INT;
  lock_ts TIMESTAMPTZ;
BEGIN
  UPDATE agence_accounts
  SET failed_attempts = COALESCE(failed_attempts, 0) + 1,
      last_failed_at = NOW(),
      locked_until = CASE
        WHEN COALESCE(failed_attempts, 0) + 1 >= p_max_fails THEN NOW() + (p_lock_minutes || ' minutes')::INTERVAL
        ELSE locked_until
      END
  WHERE id = p_account_id
  RETURNING agence_accounts.failed_attempts, agence_accounts.locked_until INTO new_count, lock_ts;

  RETURN QUERY SELECT new_count, lock_ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC : reset compteurs après login réussi
CREATE OR REPLACE FUNCTION reset_login_attempts(p_account_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agence_accounts
  SET failed_attempts = 0,
      locked_until = NULL
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

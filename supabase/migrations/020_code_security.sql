-- 020: Code security — device fingerprint + IP tracking
-- Max 2 devices per code, alert on 3rd

CREATE TABLE IF NOT EXISTS agence_code_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL,
  ip_address VARCHAR(45),
  fingerprint VARCHAR(64),
  user_agent TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  blocked BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_code_devices_code ON agence_code_devices(code_id);
CREATE INDEX IF NOT EXISTS idx_code_devices_fp ON agence_code_devices(fingerprint);

ALTER TABLE agence_code_devices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_code_devices' AND policyname = 'agence_code_devices_all') THEN
    CREATE POLICY agence_code_devices_all ON agence_code_devices FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add security fields to codes
ALTER TABLE agence_codes
  ADD COLUMN IF NOT EXISTS max_devices INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS security_alert BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Client connection history
CREATE TABLE IF NOT EXISTS agence_client_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES agence_clients(id) ON DELETE CASCADE,
  model VARCHAR NOT NULL,
  ip_address VARCHAR(45),
  fingerprint VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_connections_client ON agence_client_connections(client_id);
ALTER TABLE agence_client_connections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_client_connections' AND policyname = 'agence_client_connections_all') THEN
    CREATE POLICY agence_client_connections_all ON agence_client_connections FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agence_code_devices IS 'Tracks devices per code — max 2 allowed';
COMMENT ON TABLE agence_client_connections IS 'Full connection history per client';

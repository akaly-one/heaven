-- 066b : Audit log events age gate (RGPD traçabilité)
CREATE TABLE IF NOT EXISTS agence_age_gate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES agence_clients(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('certified','declared_minor','revoked','rejected','reset')),
  ip_hash TEXT,
  ua_hash TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT  -- 'fan' | 'admin:<code>' | 'system'
);

CREATE INDEX IF NOT EXISTS idx_agence_age_gate_events_client ON agence_age_gate_events(client_id, created_at DESC);

ALTER TABLE agence_age_gate_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_age_gate_events' AND policyname='age_gate_events_all') THEN
    CREATE POLICY age_gate_events_all ON agence_age_gate_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agence_age_gate_events IS 'BRIEF-10 audit trail age gate — RGPD traçabilité certif/révocation/rejet mineur';

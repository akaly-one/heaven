-- 069 : Table verifications pour flow self-validation fan via lien IP-matched
-- BRIEF-13 — admin génère lien, envoie manuellement sur canal du handle fourni,
-- fan clique depuis même IP /24 → auto-validated

CREATE TABLE IF NOT EXISTS agence_client_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES agence_clients(id) ON DELETE CASCADE,
  target_handle TEXT NOT NULL,
  target_platform TEXT NOT NULL CHECK (target_platform IN ('snap','insta')),

  -- Secret tokens
  token TEXT NOT NULL UNIQUE, -- URL token (cryptographically random ~32 chars)
  code_6digit TEXT, -- alternative code copy-paste (100000-999999)

  -- Request context (captured at creation)
  requested_ip_hash TEXT, -- SHA256(ip_subnet_24 + salt) truncated 16
  requested_ua_hash TEXT, -- SHA256(ua_base) truncated 16
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Sent tracking (admin action)
  sent_by TEXT, -- admin code or slug
  sent_via_platform TEXT CHECK (sent_via_platform IN ('snap','insta','manual')),
  sent_at TIMESTAMPTZ,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,

  -- Validation result (captured at self-click)
  validated_at TIMESTAMPTZ,
  validated_ip_hash TEXT,
  validated_ua_hash TEXT,
  validation_method TEXT CHECK (validation_method IN ('link_click','code_input')),
  ip_match_type TEXT CHECK (ip_match_type IN ('strict','loose_subnet','ua_fallback')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','validated','expired','revoked')),
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  revoked_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agence_client_verif_client ON agence_client_verifications(client_id, status);
CREATE INDEX IF NOT EXISTS idx_agence_client_verif_token ON agence_client_verifications(token);
CREATE INDEX IF NOT EXISTS idx_agence_client_verif_expires ON agence_client_verifications(expires_at) WHERE status IN ('pending','sent');
CREATE INDEX IF NOT EXISTS idx_agence_client_verif_pending ON agence_client_verifications(requested_at DESC) WHERE status='pending';

-- RLS
ALTER TABLE agence_client_verifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_client_verifications' AND policyname='agence_client_verif_all') THEN
    CREATE POLICY agence_client_verif_all ON agence_client_verifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agence_client_verifications IS 'BRIEF-13 : out-of-band verification des handles Snap/Insta fan. Admin envoie lien+code via canal externe, fan self-valide depuis sa vraie IP.';
COMMENT ON COLUMN agence_client_verifications.requested_ip_hash IS 'SHA256(subnet /24) — permet loose match sans stocker IP brute (RGPD)';
COMMENT ON COLUMN agence_client_verifications.expires_at IS 'Default requested_at + 72h (TTL) — configurable par admin';

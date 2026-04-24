-- 074 : Webhook events anti-replay (idempotence providers V2 auto)
-- BRIEF-16 Phase C : tracking événements webhook PayPal/Revolut/Stripe + guard double-fire
-- Ref : plans/PMO/briefs/BRIEF-2026-04-25-16-packs-payment-providers.md

-- ============================================================
-- Table agence_webhook_events
-- ============================================================
-- Stocke chaque événement webhook reçu (signature validée) pour :
--   1. Idempotence : UNIQUE(provider, event_id) empêche double-fulfillment
--   2. Audit : conservation raw_body + signature pour forensics
--   3. Debug : processed_at + verified trace le cycle de vie

CREATE TABLE IF NOT EXISTS agence_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(20) NOT NULL,         -- 'paypal' | 'revolut' | 'stripe' | 'manual'
  event_id VARCHAR(128) NOT NULL,        -- ID unique événement côté provider
  event_type VARCHAR(64),                -- ex: 'PAYMENT.CAPTURE.COMPLETED', 'ORDER_COMPLETED'
  raw_body JSONB NOT NULL,               -- payload complet (audit/debug)
  signature TEXT,                        -- signature header reçue
  verified BOOLEAN DEFAULT false,        -- signature vérifiée avec succès ?
  processed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, event_id)
);

-- Index pour listing debug par provider + type (ordre antichronologique)
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_type
  ON agence_webhook_events(provider, event_type, processed_at DESC);

-- RLS (admin-only — pas d'accès public)
ALTER TABLE agence_webhook_events ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_webhook_events' AND policyname = 'agence_webhook_events_all') THEN
    CREATE POLICY agence_webhook_events_all ON agence_webhook_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agence_webhook_events IS
  'BRIEF-16 : anti-replay webhooks payment providers. UNIQUE(provider,event_id) garantit idempotence.';
COMMENT ON COLUMN agence_webhook_events.verified IS
  'true = signature HMAC/RSA validée côté serveur ; false = reçu non vérifié (à ignorer en fulfillment)';
COMMENT ON COLUMN agence_webhook_events.raw_body IS
  'Payload brut JSON pour audit forensics + replay en cas de bug fulfillment';

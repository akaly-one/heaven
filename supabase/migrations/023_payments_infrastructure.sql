-- 023: Payment infrastructure — automated PayPal + Revolut
-- Tracks all payment attempts, confirmations, and fulfillment

CREATE TABLE IF NOT EXISTS agence_pending_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model VARCHAR NOT NULL,
  pack_id VARCHAR NOT NULL,
  pack_name VARCHAR,
  tier VARCHAR NOT NULL DEFAULT 'silver',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',

  -- Client info
  client_pseudo VARCHAR,
  client_platform VARCHAR,
  client_id UUID REFERENCES agence_clients(id) ON DELETE SET NULL,

  -- Payment provider
  payment_method VARCHAR NOT NULL, -- 'paypal', 'revolut', 'stripe'
  payment_provider_id VARCHAR,     -- PayPal order ID or Revolut order ID
  payment_capture_id VARCHAR,      -- PayPal capture ID

  -- Status tracking
  status VARCHAR NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded

  -- Fulfillment
  generated_code VARCHAR,          -- The access code generated on success
  code_sent BOOLEAN DEFAULT false, -- Whether code was sent to client via message

  -- Metadata
  provider_response JSONB,         -- Full response from payment provider (for debugging)
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_payments_model ON agence_pending_payments(model);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON agence_pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_provider_id ON agence_pending_payments(payment_provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_payments_capture_id ON agence_pending_payments(payment_capture_id) WHERE payment_capture_id IS NOT NULL;

-- RLS
ALTER TABLE agence_pending_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_pending_payments' AND policyname = 'agence_pending_payments_all') THEN
    CREATE POLICY agence_pending_payments_all ON agence_pending_payments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add payment tracking to models
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(12,2) DEFAULT 0;
ALTER TABLE agence_models ADD COLUMN IF NOT EXISTS total_transactions INT DEFAULT 0;

COMMENT ON TABLE agence_pending_payments IS 'Tracks all payment attempts (PayPal, Revolut, Stripe) with fulfillment status';
COMMENT ON COLUMN agence_pending_payments.payment_provider_id IS 'Order ID from PayPal or Revolut';
COMMENT ON COLUMN agence_pending_payments.payment_capture_id IS 'Unique capture/transaction ID for idempotency';
COMMENT ON COLUMN agence_pending_payments.generated_code IS 'Access code auto-generated on successful payment';

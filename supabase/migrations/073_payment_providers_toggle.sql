-- 073 : Payment Providers — toggle modulaire par cockpit + extension pending_payments V1 manuel
-- BRIEF-16 Phase A/C : architecture modulaire providers activables (PayPal, Revolut, Stripe, manual)
-- Ref : plans/PMO/briefs/BRIEF-2026-04-25-16-packs-payment-providers.md
--
-- Note : la table agence_settings n'existe pas encore — on la crée avec une row unique (singleton global).
-- Choix design : 1 row unique identifiée par id='global' ; suffisant pour V1.
-- Si scoping par modèle requis plus tard, ajouter une clé model_id.

-- ============================================================
-- 1. Table agence_settings (globale, singleton)
-- ============================================================

CREATE TABLE IF NOT EXISTS agence_settings (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'global',
  payment_providers JSONB DEFAULT
    '{"manual":{"enabled":true,"displayName":"PayPal (manuel)"},"paypal":{"enabled":false,"mode":"checkout","displayName":"PayPal"},"revolut":{"enabled":false,"displayName":"Revolut"},"stripe":{"enabled":false,"displayName":"Stripe (urgence)"}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed row globale par défaut (V1 manuel only enabled)
INSERT INTO agence_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE agence_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_settings' AND policyname = 'agence_settings_all') THEN
    CREATE POLICY agence_settings_all ON agence_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agence_settings IS 'Paramètres globaux Heaven — singleton id=global. BRIEF-16 : toggles payment providers.';
COMMENT ON COLUMN agence_settings.payment_providers IS
  'Toggle par provider : {manual,paypal,revolut,stripe} -> {enabled:bool, displayName:str, mode?:str}';

-- ============================================================
-- 2. Extension agence_pending_payments pour V1 manuel PayPal.me
-- ============================================================

ALTER TABLE agence_pending_payments
  ADD COLUMN IF NOT EXISTS reference_code VARCHAR(32),
  ADD COLUMN IF NOT EXISTS pseudo_web VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pack_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS rejected_reason VARCHAR(64);

-- Unique index sur reference_code (partiel : ignore NULL pour V2 auto)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_payments_reference_code
  ON agence_pending_payments(reference_code) WHERE reference_code IS NOT NULL;

COMMENT ON COLUMN agence_pending_payments.reference_code IS
  'Référence human-readable format {MODEL}-P{PACK_ID}-{RAND6} à coller dans note PayPal (V1 manuel)';
COMMENT ON COLUMN agence_pending_payments.pseudo_web IS
  'Pseudo renseigné par le fan lors de l''achat (distinct du pseudo PayPal, utilisé pour matching manuel)';
COMMENT ON COLUMN agence_pending_payments.pack_breakdown IS
  'Détail panier custom : {items:[{type,category,quantity,unit_price,duration_min?}], description, total_cents}';
COMMENT ON COLUMN agence_pending_payments.rejected_reason IS
  'Motif rejet si status=rejected_* (pseudo_mismatch, amount_mismatch, expired, fraud, other)';

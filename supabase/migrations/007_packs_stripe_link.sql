-- Add stripe_link and code columns to agence_packs
-- code: AG-P naming convention (e.g. AG-P150, AG-P200)
-- stripe_link: Stripe checkout URL generated via SQWENSY OS shop API

ALTER TABLE agence_packs ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE agence_packs ADD COLUMN IF NOT EXISTS stripe_link TEXT;

-- Backfill existing packs with AG-P codes based on price
UPDATE agence_packs SET code = 'AG-P' || ROUND(price)::TEXT WHERE code IS NULL;

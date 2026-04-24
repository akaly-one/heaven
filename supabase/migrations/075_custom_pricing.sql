-- 075 : Custom pricing — grille tarifaire packs custom par modèle
-- BRIEF-16 Phase F : eshop à la carte (photo/video × catégorie × multiplicateur) + pied ×3
-- Ref : plans/PMO/briefs/BRIEF-2026-04-25-16-packs-payment-providers.md
--
-- Grille décisions NB (25/04) :
--   Photo base 5€  × (silver=1, gold=2, vip_black=4, vip_platinum=8)
--   Video base 10€ × (silver=1, gold=2, vip_black=4, vip_platinum=8) → prix /minute
--   Spécial "pied" = ×3 sur la base catégorie

-- ============================================================
-- Table agence_custom_pricing
-- ============================================================

CREATE TABLE IF NOT EXISTS agence_custom_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model VARCHAR(10) NOT NULL,               -- model_id (ex 'm1' = yumi, 'm2' = paloma, 'm3' = ruby)
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('photo', 'video')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('silver', 'gold', 'vip_black', 'vip_platinum')),
  base_price_cents INT NOT NULL,            -- photo=500 (5€), video=1000 (10€) — prix base silver
  multiplier NUMERIC(4,2) NOT NULL,         -- silver=1, gold=2, vip_black=4, vip_platinum=8
  pied_multiplier NUMERIC(4,2) DEFAULT 3,   -- ×3 sur base catégorie pour contenu pied
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model, media_type, category)
);

-- Index pour quote rapide par modèle
CREATE INDEX IF NOT EXISTS idx_custom_pricing_model_active
  ON agence_custom_pricing(model, active) WHERE active = true;

-- RLS
ALTER TABLE agence_custom_pricing ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_custom_pricing' AND policyname = 'agence_custom_pricing_all') THEN
    CREATE POLICY agence_custom_pricing_all ON agence_custom_pricing FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE agence_custom_pricing IS
  'BRIEF-16 : grille tarifaire custom packs par modèle × media_type × catégorie. Prix calculé = base × multiplier (+ pied_multiplier si option).';
COMMENT ON COLUMN agence_custom_pricing.base_price_cents IS
  'Prix unitaire base catégorie silver en cents. Photo=500, Video=1000 (/minute).';
COMMENT ON COLUMN agence_custom_pricing.multiplier IS
  'Multiplicateur catégorie : silver=1, gold=2, vip_black=4, vip_platinum=8';
COMMENT ON COLUMN agence_custom_pricing.pied_multiplier IS
  'Multiplicateur supplémentaire ×3 si contenu "pied" spécifié dans les items du panier';

-- ============================================================
-- Seed grille tarifaire par modèle actif (Yumi m1, Paloma m2, Ruby m3)
-- ============================================================

-- Yumi (m1)
INSERT INTO agence_custom_pricing (model, media_type, category, base_price_cents, multiplier) VALUES
  ('m1','photo','silver',500,1),
  ('m1','photo','gold',500,2),
  ('m1','photo','vip_black',500,4),
  ('m1','photo','vip_platinum',500,8),
  ('m1','video','silver',1000,1),
  ('m1','video','gold',1000,2),
  ('m1','video','vip_black',1000,4),
  ('m1','video','vip_platinum',1000,8)
ON CONFLICT (model, media_type, category) DO NOTHING;

-- Paloma (m2)
INSERT INTO agence_custom_pricing (model, media_type, category, base_price_cents, multiplier) VALUES
  ('m2','photo','silver',500,1),
  ('m2','photo','gold',500,2),
  ('m2','photo','vip_black',500,4),
  ('m2','photo','vip_platinum',500,8),
  ('m2','video','silver',1000,1),
  ('m2','video','gold',1000,2),
  ('m2','video','vip_black',1000,4),
  ('m2','video','vip_platinum',1000,8)
ON CONFLICT (model, media_type, category) DO NOTHING;

-- Ruby (m3)
INSERT INTO agence_custom_pricing (model, media_type, category, base_price_cents, multiplier) VALUES
  ('m3','photo','silver',500,1),
  ('m3','photo','gold',500,2),
  ('m3','photo','vip_black',500,4),
  ('m3','photo','vip_platinum',500,8),
  ('m3','video','silver',1000,1),
  ('m3','video','gold',1000,2),
  ('m3','video','vip_black',1000,4),
  ('m3','video','vip_platinum',1000,8)
ON CONFLICT (model, media_type, category) DO NOTHING;

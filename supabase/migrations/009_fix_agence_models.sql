-- Fix agence_models: make display column nullable with default
-- This fixes the "null value in column display violates not-null constraint" error

-- Option 1: If column exists, make it nullable + add default
ALTER TABLE IF EXISTS agence_models
  ALTER COLUMN display SET DEFAULT '',
  ALTER COLUMN display DROP NOT NULL;

-- Option 2: If table doesn't exist at all, create it properly
CREATE TABLE IF NOT EXISTS agence_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display TEXT DEFAULT '',
  display_name TEXT,
  avatar TEXT,
  banner TEXT,
  bio TEXT,
  status TEXT DEFAULT 'Creatrice exclusive',
  online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE agence_models ENABLE ROW LEVEL SECURITY;

-- Allow all operations (same pattern as other tables)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_models' AND policyname = 'agence_models_all') THEN
    CREATE POLICY agence_models_all ON agence_models FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

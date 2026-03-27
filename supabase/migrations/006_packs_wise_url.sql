-- Add wise_url column to agence_packs for direct Wise payment links per pack
ALTER TABLE agence_packs ADD COLUMN IF NOT EXISTS wise_url TEXT;

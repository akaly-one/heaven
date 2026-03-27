-- Add social handles to wall posts so visitors register with their snap/insta
ALTER TABLE agence_wall_posts ADD COLUMN IF NOT EXISTS pseudo_snap TEXT;
ALTER TABLE agence_wall_posts ADD COLUMN IF NOT EXISTS pseudo_insta TEXT;

-- Backfill: treat existing pseudo as snap handle
UPDATE agence_wall_posts SET pseudo_snap = pseudo WHERE pseudo_snap IS NULL AND pseudo IS NOT NULL;

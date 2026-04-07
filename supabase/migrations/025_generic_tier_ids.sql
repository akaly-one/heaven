-- ══════════════════════════════════════════════
-- Migration 025: Generic Positional Tier IDs
-- Converts semantic tier names → pN slot IDs
-- silver→p1, gold→p2, feet→p3, black→p4, platinum→p5
-- vip→p1, diamond→p4 (legacy aliases)
-- public/free/promo→p0
-- ══════════════════════════════════════════════

-- ── agence_uploads.tier ──
UPDATE agence_uploads SET tier = 'p1' WHERE tier = 'silver';
UPDATE agence_uploads SET tier = 'p2' WHERE tier = 'gold';
UPDATE agence_uploads SET tier = 'p3' WHERE tier = 'feet';
UPDATE agence_uploads SET tier = 'p4' WHERE tier = 'black';
UPDATE agence_uploads SET tier = 'p5' WHERE tier = 'platinum';
UPDATE agence_uploads SET tier = 'p1' WHERE tier = 'vip';
UPDATE agence_uploads SET tier = 'p4' WHERE tier = 'diamond';
UPDATE agence_uploads SET tier = 'p0' WHERE tier IN ('public', 'free', 'promo');

-- ── agence_posts.tier_required ──
UPDATE agence_posts SET tier_required = 'p0' WHERE tier_required = 'public';
UPDATE agence_posts SET tier_required = 'p0' WHERE tier_required IN ('free', 'promo');
UPDATE agence_posts SET tier_required = 'p1' WHERE tier_required = 'silver';
UPDATE agence_posts SET tier_required = 'p2' WHERE tier_required = 'gold';
UPDATE agence_posts SET tier_required = 'p3' WHERE tier_required = 'feet';
UPDATE agence_posts SET tier_required = 'p4' WHERE tier_required = 'black';
UPDATE agence_posts SET tier_required = 'p5' WHERE tier_required = 'platinum';
UPDATE agence_posts SET tier_required = 'p1' WHERE tier_required = 'vip';
UPDATE agence_posts SET tier_required = 'p4' WHERE tier_required = 'diamond';

-- ── agence_codes.tier ──
UPDATE agence_codes SET tier = 'p1' WHERE tier = 'silver';
UPDATE agence_codes SET tier = 'p2' WHERE tier = 'gold';
UPDATE agence_codes SET tier = 'p3' WHERE tier = 'feet';
UPDATE agence_codes SET tier = 'p4' WHERE tier = 'black';
UPDATE agence_codes SET tier = 'p5' WHERE tier = 'platinum';
UPDATE agence_codes SET tier = 'p1' WHERE tier = 'vip';
UPDATE agence_codes SET tier = 'p4' WHERE tier = 'diamond';

-- ── agence_codes.pack ──
UPDATE agence_codes SET pack = 'p1' WHERE pack = 'silver';
UPDATE agence_codes SET pack = 'p2' WHERE pack = 'gold';
UPDATE agence_codes SET pack = 'p3' WHERE pack = 'feet';
UPDATE agence_codes SET pack = 'p4' WHERE pack = 'black';
UPDATE agence_codes SET pack = 'p5' WHERE pack = 'platinum';
UPDATE agence_codes SET pack = 'p1' WHERE pack = 'vip';
UPDATE agence_codes SET pack = 'p4' WHERE pack = 'diamond';

-- ── agence_packs.pack_id ──
UPDATE agence_packs SET pack_id = 'p1' WHERE pack_id = 'silver';
UPDATE agence_packs SET pack_id = 'p2' WHERE pack_id = 'gold';
UPDATE agence_packs SET pack_id = 'p3' WHERE pack_id = 'feet';
UPDATE agence_packs SET pack_id = 'p4' WHERE pack_id = 'black';
UPDATE agence_packs SET pack_id = 'p5' WHERE pack_id = 'platinum';
UPDATE agence_packs SET pack_id = 'p1' WHERE pack_id = 'vip';
UPDATE agence_packs SET pack_id = 'p4' WHERE pack_id = 'diamond';

-- ── agence_clients.tier ──
UPDATE agence_clients SET tier = 'p1' WHERE tier = 'silver';
UPDATE agence_clients SET tier = 'p2' WHERE tier = 'gold';
UPDATE agence_clients SET tier = 'p3' WHERE tier = 'feet';
UPDATE agence_clients SET tier = 'p4' WHERE tier = 'black';
UPDATE agence_clients SET tier = 'p5' WHERE tier = 'platinum';
UPDATE agence_clients SET tier = 'p1' WHERE tier = 'vip';
UPDATE agence_clients SET tier = 'p4' WHERE tier = 'diamond';

-- ── agence_pending_payments.tier ──
UPDATE agence_pending_payments SET tier = 'p1' WHERE tier = 'silver';
UPDATE agence_pending_payments SET tier = 'p2' WHERE tier = 'gold';
UPDATE agence_pending_payments SET tier = 'p3' WHERE tier = 'feet';
UPDATE agence_pending_payments SET tier = 'p4' WHERE tier = 'black';
UPDATE agence_pending_payments SET tier = 'p5' WHERE tier = 'platinum';
UPDATE agence_pending_payments SET tier = 'p1' WHERE tier = 'vip';
UPDATE agence_pending_payments SET tier = 'p4' WHERE tier = 'diamond';

-- ── agence_revenue_log.tier (historical data, safe to update) ──
UPDATE agence_revenue_log SET tier = 'p1' WHERE tier = 'silver';
UPDATE agence_revenue_log SET tier = 'p2' WHERE tier = 'gold';
UPDATE agence_revenue_log SET tier = 'p3' WHERE tier = 'feet';
UPDATE agence_revenue_log SET tier = 'p4' WHERE tier = 'black';
UPDATE agence_revenue_log SET tier = 'p5' WHERE tier = 'platinum';
UPDATE agence_revenue_log SET tier = 'p1' WHERE tier = 'vip';
UPDATE agence_revenue_log SET tier = 'p4' WHERE tier = 'diamond';

-- ── agence_content_pipeline.tier ──
UPDATE agence_content_pipeline SET tier = 'p1' WHERE tier = 'silver';
UPDATE agence_content_pipeline SET tier = 'p2' WHERE tier = 'gold';
UPDATE agence_content_pipeline SET tier = 'p3' WHERE tier = 'feet';
UPDATE agence_content_pipeline SET tier = 'p4' WHERE tier = 'black';
UPDATE agence_content_pipeline SET tier = 'p5' WHERE tier = 'platinum';
UPDATE agence_content_pipeline SET tier = 'p1' WHERE tier = 'vip';
UPDATE agence_content_pipeline SET tier = 'p4' WHERE tier = 'diamond';

-- ══════════════════════════════════════════════
-- NOTE: This migration is SAFE and IDEMPOTENT.
-- Running it twice won't cause issues (WHERE clauses are specific).
-- Cloudinary URLs are NOT affected (they use model_slug paths, not tiers).
-- The app code (tier-utils.ts) also normalizes legacy→pN on read,
-- so even unmigrated rows will display correctly.
-- ══════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 033_realign_model_ids.sql
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- GOAL
--   Re-align model_ids to the canonical natural order :
--
--     BEFORE (migration 026 legacy)      AFTER (this migration)
--     ───────────────────────────────    ───────────────────────────────
--     gret   = m1 (legacy placeholder)   gret   = [DELETED]
--     yumi   = m2                        yumi   = m1   (root + AI hub)
--     ruby   = m3                        ruby   = m3   (unchanged)
--     paloma = m4                        paloma = m2
--
-- WHY
--   - gret was a pre-rebrand legacy slot, never active. Frees m1.
--   - Natural order yumi=m1 / paloma=m2 / ruby=m3 matches business
--     hierarchy (yumi = admin, the other two indexed after her).
--
-- STRATEGY (order matters to avoid UNIQUE conflicts on model_id)
--   1. Delete gret-scoped rows (if any) and the gret row itself → frees m1.
--   2. Move yumi from m2 to m1 on ALL scoped tables + agence_models.
--      Now m2 is free.
--   3. Move paloma from m4 to m2 on ALL scoped tables + agence_models.
--   4. ruby m3 unchanged.
--
-- SCOPED TABLES (column `model` : mN)
--   agence_clients, agence_codes, agence_messages, agence_wall_posts,
--   agence_uploads, agence_packs, agence_posts, agence_pages,
--   agence_collaborators, agence_revenue_log, agence_pending_payments,
--   agence_purchases
--
-- INSTAGRAM TABLES (column `model_slug` : mN — not the real slug)
--   instagram_config, instagram_conversations
--   (instagram_messages inherits via conversation_id, no column update)
--
-- SAFETY
--   - Wrapped in a single transaction. Any failure → full rollback.
--   - Idempotent : re-running after success is a no-op (updates affect 0 rows).
--   - Ships with 033_realign_model_ids.rollback.sql for recovery.
--
-- ⚠ CONFIDENTIALITY : no real names, only slugs.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Step 1 — Remove gret legacy placeholder (frees m1)                    ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Purge gret-scoped rows from every scoped table (no-op if already empty)
DELETE FROM agence_clients             WHERE model = 'm1';
DELETE FROM agence_codes               WHERE model = 'm1';
DELETE FROM agence_messages            WHERE model = 'm1';
DELETE FROM agence_wall_posts          WHERE model = 'm1';
DELETE FROM agence_uploads             WHERE model = 'm1';
DELETE FROM agence_packs               WHERE model = 'm1';

-- Tables added by later migrations — guard with to_regclass() in case they
-- weren't created yet on some environments
DO $$ BEGIN
  IF to_regclass('public.agence_posts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM agence_posts WHERE model = ''m1''';
  END IF;
  IF to_regclass('public.agence_pages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM agence_pages WHERE model = ''m1''';
  END IF;
  IF to_regclass('public.agence_collaborators') IS NOT NULL THEN
    EXECUTE 'DELETE FROM agence_collaborators WHERE model = ''m1''';
  END IF;
  IF to_regclass('public.agence_revenue_log') IS NOT NULL THEN
    EXECUTE 'DELETE FROM agence_revenue_log WHERE model = ''m1''';
  END IF;
  IF to_regclass('public.agence_pending_payments') IS NOT NULL THEN
    EXECUTE 'DELETE FROM agence_pending_payments WHERE model = ''m1''';
  END IF;
  IF to_regclass('public.agence_purchases') IS NOT NULL THEN
    EXECUTE 'DELETE FROM agence_purchases WHERE model = ''m1''';
  END IF;
  IF to_regclass('public.instagram_config') IS NOT NULL THEN
    EXECUTE 'DELETE FROM instagram_config WHERE model_slug = ''m1''';
  END IF;
  IF to_regclass('public.instagram_conversations') IS NOT NULL THEN
    EXECUTE 'DELETE FROM instagram_conversations WHERE model_slug = ''m1''';
  END IF;
END $$;

-- Finally remove gret itself (frees m1 slot)
DELETE FROM agence_models WHERE slug = 'gret';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Step 2 — Shift yumi : m2 → m1                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

UPDATE agence_clients      SET model = 'm1' WHERE model = 'm2';
UPDATE agence_codes        SET model = 'm1' WHERE model = 'm2';
UPDATE agence_messages     SET model = 'm1' WHERE model = 'm2';
UPDATE agence_wall_posts   SET model = 'm1' WHERE model = 'm2';
UPDATE agence_uploads      SET model = 'm1' WHERE model = 'm2';
UPDATE agence_packs        SET model = 'm1' WHERE model = 'm2';

DO $$ BEGIN
  IF to_regclass('public.agence_posts')             IS NOT NULL THEN EXECUTE 'UPDATE agence_posts             SET model = ''m1'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_pages')             IS NOT NULL THEN EXECUTE 'UPDATE agence_pages             SET model = ''m1'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_collaborators')     IS NOT NULL THEN EXECUTE 'UPDATE agence_collaborators     SET model = ''m1'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_revenue_log')       IS NOT NULL THEN EXECUTE 'UPDATE agence_revenue_log       SET model = ''m1'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_pending_payments')  IS NOT NULL THEN EXECUTE 'UPDATE agence_pending_payments  SET model = ''m1'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_purchases')         IS NOT NULL THEN EXECUTE 'UPDATE agence_purchases         SET model = ''m1'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.instagram_config')         IS NOT NULL THEN EXECUTE 'UPDATE instagram_config         SET model_slug = ''m1'' WHERE model_slug = ''m2'''; END IF;
  IF to_regclass('public.instagram_conversations')  IS NOT NULL THEN EXECUTE 'UPDATE instagram_conversations  SET model_slug = ''m1'' WHERE model_slug = ''m2'''; END IF;
END $$;

-- Finally update agence_models — model_id UNIQUE so m1 must be free at this point
UPDATE agence_models SET model_id = 'm1' WHERE slug = 'yumi';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Step 3 — Shift paloma : m4 → m2                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

UPDATE agence_clients      SET model = 'm2' WHERE model = 'm4';
UPDATE agence_codes        SET model = 'm2' WHERE model = 'm4';
UPDATE agence_messages     SET model = 'm2' WHERE model = 'm4';
UPDATE agence_wall_posts   SET model = 'm2' WHERE model = 'm4';
UPDATE agence_uploads      SET model = 'm2' WHERE model = 'm4';
UPDATE agence_packs        SET model = 'm2' WHERE model = 'm4';

DO $$ BEGIN
  IF to_regclass('public.agence_posts')             IS NOT NULL THEN EXECUTE 'UPDATE agence_posts             SET model = ''m2'' WHERE model = ''m4'''; END IF;
  IF to_regclass('public.agence_pages')             IS NOT NULL THEN EXECUTE 'UPDATE agence_pages             SET model = ''m2'' WHERE model = ''m4'''; END IF;
  IF to_regclass('public.agence_collaborators')     IS NOT NULL THEN EXECUTE 'UPDATE agence_collaborators     SET model = ''m2'' WHERE model = ''m4'''; END IF;
  IF to_regclass('public.agence_revenue_log')       IS NOT NULL THEN EXECUTE 'UPDATE agence_revenue_log       SET model = ''m2'' WHERE model = ''m4'''; END IF;
  IF to_regclass('public.agence_pending_payments')  IS NOT NULL THEN EXECUTE 'UPDATE agence_pending_payments  SET model = ''m2'' WHERE model = ''m4'''; END IF;
  IF to_regclass('public.agence_purchases')         IS NOT NULL THEN EXECUTE 'UPDATE agence_purchases         SET model = ''m2'' WHERE model = ''m4'''; END IF;
  IF to_regclass('public.instagram_config')         IS NOT NULL THEN EXECUTE 'UPDATE instagram_config         SET model_slug = ''m2'' WHERE model_slug = ''m4'''; END IF;
  IF to_regclass('public.instagram_conversations')  IS NOT NULL THEN EXECUTE 'UPDATE instagram_conversations  SET model_slug = ''m2'' WHERE model_slug = ''m4'''; END IF;
END $$;

UPDATE agence_models SET model_id = 'm2' WHERE slug = 'paloma';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Step 4 — Sanity checks                                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Verify the hierarchy state. Will raise if anything is off.
DO $$
DECLARE v_yumi_mid TEXT; v_paloma_mid TEXT; v_ruby_mid TEXT; v_gret_count INT;
BEGIN
  SELECT model_id INTO v_yumi_mid FROM agence_models WHERE slug = 'yumi';
  SELECT model_id INTO v_paloma_mid FROM agence_models WHERE slug = 'paloma';
  SELECT model_id INTO v_ruby_mid FROM agence_models WHERE slug = 'ruby';
  SELECT count(*) INTO v_gret_count FROM agence_models WHERE slug = 'gret';

  IF v_yumi_mid IS DISTINCT FROM 'm1' THEN
    RAISE EXCEPTION 'REALIGN FAIL: yumi.model_id expected m1, got %', v_yumi_mid;
  END IF;
  IF v_paloma_mid IS DISTINCT FROM 'm2' THEN
    RAISE EXCEPTION 'REALIGN FAIL: paloma.model_id expected m2, got %', v_paloma_mid;
  END IF;
  IF v_ruby_mid IS DISTINCT FROM 'm3' THEN
    RAISE EXCEPTION 'REALIGN FAIL: ruby.model_id expected m3, got %', v_ruby_mid;
  END IF;
  IF v_gret_count <> 0 THEN
    RAISE EXCEPTION 'REALIGN FAIL: gret still present (% rows)', v_gret_count;
  END IF;
  RAISE NOTICE 'REALIGN OK : yumi=m1 paloma=m2 ruby=m3 gret removed';
END $$;


COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- END 033_realign_model_ids.sql

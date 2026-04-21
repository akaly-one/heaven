-- ═══════════════════════════════════════════════════════════════════════════
-- 033_realign_model_ids.rollback.sql
-- Reverts migration 033 — restores pre-033 model_ids:
--   yumi   m1 → m2
--   paloma m2 → m4
--   ruby   m3 (unchanged)
-- Does NOT restore gret (it was deleted along with its data in step 1).
-- If you need gret back, restore from a DB backup taken before 033.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Reverse step 3 : paloma m2 → m4
UPDATE agence_clients      SET model = 'm4' WHERE model = 'm2';
UPDATE agence_codes        SET model = 'm4' WHERE model = 'm2';
UPDATE agence_messages     SET model = 'm4' WHERE model = 'm2';
UPDATE agence_wall_posts   SET model = 'm4' WHERE model = 'm2';
UPDATE agence_uploads      SET model = 'm4' WHERE model = 'm2';
UPDATE agence_packs        SET model = 'm4' WHERE model = 'm2';
DO $$ BEGIN
  IF to_regclass('public.agence_posts')             IS NOT NULL THEN EXECUTE 'UPDATE agence_posts             SET model = ''m4'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_pages')             IS NOT NULL THEN EXECUTE 'UPDATE agence_pages             SET model = ''m4'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_collaborators')     IS NOT NULL THEN EXECUTE 'UPDATE agence_collaborators     SET model = ''m4'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_revenue_log')       IS NOT NULL THEN EXECUTE 'UPDATE agence_revenue_log       SET model = ''m4'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_pending_payments')  IS NOT NULL THEN EXECUTE 'UPDATE agence_pending_payments  SET model = ''m4'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.agence_purchases')         IS NOT NULL THEN EXECUTE 'UPDATE agence_purchases         SET model = ''m4'' WHERE model = ''m2'''; END IF;
  IF to_regclass('public.instagram_config')         IS NOT NULL THEN EXECUTE 'UPDATE instagram_config         SET model_slug = ''m4'' WHERE model_slug = ''m2'''; END IF;
  IF to_regclass('public.instagram_conversations')  IS NOT NULL THEN EXECUTE 'UPDATE instagram_conversations  SET model_slug = ''m4'' WHERE model_slug = ''m2'''; END IF;
END $$;
UPDATE agence_models SET model_id = 'm4' WHERE slug = 'paloma';

-- Reverse step 2 : yumi m1 → m2
UPDATE agence_clients      SET model = 'm2' WHERE model = 'm1';
UPDATE agence_codes        SET model = 'm2' WHERE model = 'm1';
UPDATE agence_messages     SET model = 'm2' WHERE model = 'm1';
UPDATE agence_wall_posts   SET model = 'm2' WHERE model = 'm1';
UPDATE agence_uploads      SET model = 'm2' WHERE model = 'm1';
UPDATE agence_packs        SET model = 'm2' WHERE model = 'm1';
DO $$ BEGIN
  IF to_regclass('public.agence_posts')             IS NOT NULL THEN EXECUTE 'UPDATE agence_posts             SET model = ''m2'' WHERE model = ''m1'''; END IF;
  IF to_regclass('public.agence_pages')             IS NOT NULL THEN EXECUTE 'UPDATE agence_pages             SET model = ''m2'' WHERE model = ''m1'''; END IF;
  IF to_regclass('public.agence_collaborators')     IS NOT NULL THEN EXECUTE 'UPDATE agence_collaborators     SET model = ''m2'' WHERE model = ''m1'''; END IF;
  IF to_regclass('public.agence_revenue_log')       IS NOT NULL THEN EXECUTE 'UPDATE agence_revenue_log       SET model = ''m2'' WHERE model = ''m1'''; END IF;
  IF to_regclass('public.agence_pending_payments')  IS NOT NULL THEN EXECUTE 'UPDATE agence_pending_payments  SET model = ''m2'' WHERE model = ''m1'''; END IF;
  IF to_regclass('public.agence_purchases')         IS NOT NULL THEN EXECUTE 'UPDATE agence_purchases         SET model = ''m2'' WHERE model = ''m1'''; END IF;
  IF to_regclass('public.instagram_config')         IS NOT NULL THEN EXECUTE 'UPDATE instagram_config         SET model_slug = ''m2'' WHERE model_slug = ''m1'''; END IF;
  IF to_regclass('public.instagram_conversations')  IS NOT NULL THEN EXECUTE 'UPDATE instagram_conversations  SET model_slug = ''m2'' WHERE model_slug = ''m1'''; END IF;
END $$;
UPDATE agence_models SET model_id = 'm2' WHERE slug = 'yumi';

COMMIT;

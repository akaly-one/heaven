-- ═══════════════════════════════════════════════════════════════════════════
-- 032_yumi_unified_messaging.rollback.sql
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- Reverts everything in 032_yumi_unified_messaging.sql in safe order :
--   1. Drop timeline view
--   2. Drop new RLS policies (v2)
--   3. Drop RLS helper functions
--   4. Drop fan FKs + fan_id columns on scoped tables
--   5. Drop agence_fans table
--   6. Drop hierarchy columns on agence_models (parent FK first, then constraint)
--
-- Uses IF EXISTS everywhere — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Timeline view ──────────────────────────────────────────────────
DROP VIEW IF EXISTS agence_messages_timeline;


-- ─── 2. New RLS policies (v2) ──────────────────────────────────────────
DROP POLICY IF EXISTS sel_agence_clients_v2 ON agence_clients;
DROP POLICY IF EXISTS ins_agence_clients_v2 ON agence_clients;
DROP POLICY IF EXISTS upd_agence_clients_v2 ON agence_clients;
DROP POLICY IF EXISTS del_agence_clients_v2 ON agence_clients;

DROP POLICY IF EXISTS sel_agence_codes_v2 ON agence_codes;
DROP POLICY IF EXISTS ins_agence_codes_v2 ON agence_codes;
DROP POLICY IF EXISTS upd_agence_codes_v2 ON agence_codes;
DROP POLICY IF EXISTS del_agence_codes_v2 ON agence_codes;

DROP POLICY IF EXISTS sel_agence_messages_v2 ON agence_messages;
DROP POLICY IF EXISTS ins_agence_messages_v2 ON agence_messages;
DROP POLICY IF EXISTS upd_agence_messages_v2 ON agence_messages;
DROP POLICY IF EXISTS del_agence_messages_v2 ON agence_messages;

DROP POLICY IF EXISTS sel_agence_wall_posts_v2 ON agence_wall_posts;
DROP POLICY IF EXISTS ins_agence_wall_posts_v2 ON agence_wall_posts;
DROP POLICY IF EXISTS upd_agence_wall_posts_v2 ON agence_wall_posts;
DROP POLICY IF EXISTS del_agence_wall_posts_v2 ON agence_wall_posts;

DROP POLICY IF EXISTS sel_agence_uploads_v2 ON agence_uploads;
DROP POLICY IF EXISTS ins_agence_uploads_v2 ON agence_uploads;
DROP POLICY IF EXISTS upd_agence_uploads_v2 ON agence_uploads;
DROP POLICY IF EXISTS del_agence_uploads_v2 ON agence_uploads;

DROP POLICY IF EXISTS sel_agence_packs_v2 ON agence_packs;
DROP POLICY IF EXISTS ins_agence_packs_v2 ON agence_packs;
DROP POLICY IF EXISTS upd_agence_packs_v2 ON agence_packs;
DROP POLICY IF EXISTS del_agence_packs_v2 ON agence_packs;

DROP POLICY IF EXISTS sel_agence_posts_v2 ON agence_posts;
DROP POLICY IF EXISTS ins_agence_posts_v2 ON agence_posts;
DROP POLICY IF EXISTS upd_agence_posts_v2 ON agence_posts;
DROP POLICY IF EXISTS del_agence_posts_v2 ON agence_posts;

DROP POLICY IF EXISTS sel_instagram_config_v2 ON instagram_config;
DROP POLICY IF EXISTS ins_instagram_config_v2 ON instagram_config;
DROP POLICY IF EXISTS upd_instagram_config_v2 ON instagram_config;
DROP POLICY IF EXISTS del_instagram_config_v2 ON instagram_config;

DROP POLICY IF EXISTS sel_ig_conversations_v2 ON instagram_conversations;
DROP POLICY IF EXISTS ins_ig_conversations_v2 ON instagram_conversations;
DROP POLICY IF EXISTS upd_ig_conversations_v2 ON instagram_conversations;
DROP POLICY IF EXISTS del_ig_conversations_v2 ON instagram_conversations;

DROP POLICY IF EXISTS sel_ig_messages_v2 ON instagram_messages;
DROP POLICY IF EXISTS ins_ig_messages_v2 ON instagram_messages;
DROP POLICY IF EXISTS upd_ig_messages_v2 ON instagram_messages;
DROP POLICY IF EXISTS del_ig_messages_v2 ON instagram_messages;

DROP POLICY IF EXISTS sel_agence_fans_v2 ON agence_fans;
DROP POLICY IF EXISTS ins_agence_fans_v2 ON agence_fans;
DROP POLICY IF EXISTS upd_agence_fans_v2 ON agence_fans;
DROP POLICY IF EXISTS del_agence_fans_v2 ON agence_fans;


-- ─── 3. RLS helper functions ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.can_write_model_id(TEXT);
DROP FUNCTION IF EXISTS public.can_see_model_id(TEXT);
DROP FUNCTION IF EXISTS public.can_write_model(TEXT);
DROP FUNCTION IF EXISTS public.can_see_model(TEXT);
DROP FUNCTION IF EXISTS public.is_root();
DROP FUNCTION IF EXISTS public.current_role_tier();
DROP FUNCTION IF EXISTS public.current_model_slug();
DROP FUNCTION IF EXISTS public.set_session_context(TEXT, TEXT);


-- ─── 4. Fan FKs + fan_id columns on scoped tables ──────────────────────
DROP INDEX IF EXISTS idx_clients_fan_model;
DROP INDEX IF EXISTS idx_clients_fan;
DROP INDEX IF EXISTS idx_ig_conv_fan;
DROP INDEX IF EXISTS idx_ig_conv_model_fan;

ALTER TABLE agence_clients           DROP COLUMN IF EXISTS fan_id;
ALTER TABLE instagram_conversations  DROP COLUMN IF EXISTS fan_id;


-- ─── 5. agence_fans table ──────────────────────────────────────────────
DROP INDEX IF EXISTS idx_fans_insta_lower;
DROP INDEX IF EXISTS idx_fans_snap_lower;
DROP INDEX IF EXISTS idx_fans_fanvue_lower;
DROP INDEX IF EXISTS idx_fans_email_lower;
DROP INDEX IF EXISTS idx_fans_merged;

DROP TABLE IF EXISTS agence_fans;


-- ─── 6. Hierarchy columns on agence_models ─────────────────────────────
-- Drop constraints first
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE table_name = 'agence_models' AND constraint_name = 'agence_models_parent_fk'
  ) THEN
    ALTER TABLE agence_models DROP CONSTRAINT agence_models_parent_fk;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE table_name = 'agence_models' AND constraint_name = 'agence_models_role_tier_chk'
  ) THEN
    ALTER TABLE agence_models DROP CONSTRAINT agence_models_role_tier_chk;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_agence_models_parent;
DROP INDEX IF EXISTS idx_agence_models_tier;

ALTER TABLE agence_models
  DROP COLUMN IF EXISTS can_manage_children,
  DROP COLUMN IF EXISTS fanvue_monthly_revenue,
  DROP COLUMN IF EXISTS fanvue_url,
  DROP COLUMN IF EXISTS fanvue_handle,
  DROP COLUMN IF EXISTS is_ai_generated,
  DROP COLUMN IF EXISTS agency_parent_slug,
  DROP COLUMN IF EXISTS role_tier;

-- ═══════════════════════════════════════════════════════════════════════════
-- END rollback
-- ═══════════════════════════════════════════════════════════════════════════

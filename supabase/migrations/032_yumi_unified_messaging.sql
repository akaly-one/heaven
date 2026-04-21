-- ═══════════════════════════════════════════════════════════════════════════
-- 032_yumi_unified_messaging.sql
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- GOALS
--  1. Hierarchy on agence_models : root (yumi) + model (paloma, ruby) tiers.
--  2. Global fan identity (agence_fans) : ONE fan = many handles (web pseudo,
--     Instagram, Fanvue, Snapchat, phone, email).
--  3. Link scoped tables (agence_clients, instagram_conversations) to fan_id.
--  4. RLS helpers (GUC-based, compatible with Heaven custom JWT — NOT Supabase
--     Auth). App side must call set_session_context() before scoped queries.
--  5. Unified policies across all scoped tables (can_see_model / can_write_model).
--  6. Timeline view (agence_messages_timeline) — UNION of web (agence_messages)
--     + Instagram (instagram_messages) scoped by model + fan.
--
-- CONVENTIONS (discovered during audit, kept as-is)
--  - Scoped tables carry a VARCHAR column named `model` storing a model_id
--    (m2/m3/m4). m1 = legacy slot (gret, retired).
--  - agence_models is the single source of truth (NOT agence_model_profiles).
--    slug = 'yumi' / 'ruby' / 'paloma', model_id = 'm2' / 'm3' / 'm4'.
--  - Instagram tables are `instagram_conversations` + `instagram_messages`
--    (NOT agence_instagram_*). They use `model_slug` (text, values are mN).
--
-- SAFETY
--  - Idempotent (IF NOT EXISTS, DO blocks, ON CONFLICT).
--  - Never drops existing tables or columns.
--  - Ships with 032_yumi_unified_messaging.rollback.sql for recovery.
--
-- ⚠ CONFIDENTIALITY : no real names, only slugs (yumi/paloma/ruby).
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ SECTION 1 — Enrich agence_models with hierarchy + Fanvue fields       ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

ALTER TABLE agence_models
  ADD COLUMN IF NOT EXISTS role_tier TEXT NOT NULL DEFAULT 'model',
  ADD COLUMN IF NOT EXISTS agency_parent_slug TEXT,
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fanvue_handle TEXT,
  ADD COLUMN IF NOT EXISTS fanvue_url TEXT,
  ADD COLUMN IF NOT EXISTS fanvue_monthly_revenue NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS can_manage_children BOOLEAN DEFAULT false;

-- CHECK constraint on role_tier (only add if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'agence_models' AND constraint_name = 'agence_models_role_tier_chk'
  ) THEN
    ALTER TABLE agence_models
      ADD CONSTRAINT agence_models_role_tier_chk
      CHECK (role_tier IN ('root','model'));
  END IF;
END $$;

-- Self-referencing FK for agency_parent_slug (only if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'agence_models' AND constraint_name = 'agence_models_parent_fk'
  ) THEN
    ALTER TABLE agence_models
      ADD CONSTRAINT agence_models_parent_fk
      FOREIGN KEY (agency_parent_slug) REFERENCES agence_models(slug) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed the hierarchy: yumi = root (AI + agency master), paloma/ruby = children
UPDATE agence_models
   SET role_tier = 'root',
       is_ai_generated = true,
       can_manage_children = true
 WHERE slug = 'yumi';

UPDATE agence_models
   SET role_tier = 'model',
       agency_parent_slug = 'yumi'
 WHERE slug IN ('paloma','ruby');

CREATE INDEX IF NOT EXISTS idx_agence_models_parent ON agence_models(agency_parent_slug);
CREATE INDEX IF NOT EXISTS idx_agence_models_tier ON agence_models(role_tier);

COMMENT ON COLUMN agence_models.role_tier IS 'root = yumi (dev + AI model + agency master) / model = child profile';
COMMENT ON COLUMN agence_models.agency_parent_slug IS 'Slug of the parent agency (NULL for root)';
COMMENT ON COLUMN agence_models.can_manage_children IS 'Root with this flag can read/write child-scoped data';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ SECTION 2 — agence_fans : global fan identity                          ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS agence_fans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudo_web      TEXT,              -- handle chosen on Heaven web gate
  pseudo_insta    TEXT,              -- Instagram @handle (no leading @)
  pseudo_snap     TEXT,              -- Snapchat handle
  fanvue_handle   TEXT,              -- Fanvue handle
  phone           TEXT,              -- E.164 preferred
  email           TEXT,
  first_seen      TIMESTAMPTZ DEFAULT now(),
  last_seen       TIMESTAMPTZ DEFAULT now(),
  notes           TEXT,
  merged_into_id  UUID REFERENCES agence_fans(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Unique constraints (add only if missing — each handle is a global identity anchor)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agence_fans_insta_unique') THEN
    ALTER TABLE agence_fans ADD CONSTRAINT agence_fans_insta_unique UNIQUE (pseudo_insta);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agence_fans_snap_unique') THEN
    ALTER TABLE agence_fans ADD CONSTRAINT agence_fans_snap_unique UNIQUE (pseudo_snap);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agence_fans_fanvue_unique') THEN
    ALTER TABLE agence_fans ADD CONSTRAINT agence_fans_fanvue_unique UNIQUE (fanvue_handle);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agence_fans_phone_unique') THEN
    ALTER TABLE agence_fans ADD CONSTRAINT agence_fans_phone_unique UNIQUE (phone);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agence_fans_email_unique') THEN
    ALTER TABLE agence_fans ADD CONSTRAINT agence_fans_email_unique UNIQUE (email);
  END IF;
END $$;

-- Lowercase indexes for case-insensitive lookups
CREATE INDEX IF NOT EXISTS idx_fans_insta_lower   ON agence_fans (lower(pseudo_insta));
CREATE INDEX IF NOT EXISTS idx_fans_snap_lower    ON agence_fans (lower(pseudo_snap));
CREATE INDEX IF NOT EXISTS idx_fans_fanvue_lower  ON agence_fans (lower(fanvue_handle));
CREATE INDEX IF NOT EXISTS idx_fans_email_lower   ON agence_fans (lower(email));

-- Soft-merge support index
CREATE INDEX IF NOT EXISTS idx_fans_merged ON agence_fans (merged_into_id) WHERE merged_into_id IS NOT NULL;

COMMENT ON TABLE agence_fans IS 'Global fan identity (cross-model, cross-channel). One row = one real person with N handles.';
COMMENT ON COLUMN agence_fans.merged_into_id IS 'When set, this row is a soft-merged duplicate. Follow the chain to reach the canonical fan.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ SECTION 3 — Link scoped tables to agence_fans                          ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- agence_clients : already scoped via `model` column (mN). Add fan_id.
ALTER TABLE agence_clients
  ADD COLUMN IF NOT EXISTS fan_id UUID REFERENCES agence_fans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_fan_model ON agence_clients (model, fan_id);
CREATE INDEX IF NOT EXISTS idx_clients_fan ON agence_clients (fan_id) WHERE fan_id IS NOT NULL;

COMMENT ON COLUMN agence_clients.fan_id IS 'Optional link to global fan identity (agence_fans). NULL for legacy rows until backfilled.';

-- instagram_conversations : scoped by `model_slug` (stores mN). Add fan_id.
-- TODO backfill : match instagram_conversations.ig_username ↔ agence_fans.pseudo_insta.
ALTER TABLE instagram_conversations
  ADD COLUMN IF NOT EXISTS fan_id UUID REFERENCES agence_fans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ig_conv_fan ON instagram_conversations (fan_id) WHERE fan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ig_conv_model_fan ON instagram_conversations (model_slug, fan_id);

COMMENT ON COLUMN instagram_conversations.fan_id IS 'Optional link to global fan identity (agence_fans).';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ SECTION 4 — RLS helpers (GUC-based, custom JWT compatible)             ║
-- ║                                                                        ║
-- ║ Heaven does NOT use Supabase Auth → auth.jwt() is unavailable.         ║
-- ║ Instead, API routes inject GUCs via set_session_context() RPC before   ║
-- ║ each scoped query. Helpers read those GUCs.                            ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- RPC to set per-request context (call from server with service_role)
CREATE OR REPLACE FUNCTION public.set_session_context(
  p_model_slug TEXT,
  p_role_tier  TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_model_slug', COALESCE(p_model_slug, ''), true);
  PERFORM set_config('app.current_role_tier',  COALESCE(p_role_tier, 'anon'), true);
END;
$$;

-- Helper: current model slug from GUC
CREATE OR REPLACE FUNCTION public.current_model_slug() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_model_slug', true), '');
$$;

-- Helper: current role tier from GUC (defaults to 'anon')
CREATE OR REPLACE FUNCTION public.current_role_tier() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.current_role_tier', true), ''), 'anon');
$$;

-- Helper: is current caller a root-tier model?
CREATE OR REPLACE FUNCTION public.is_root() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT public.current_role_tier() = 'root';
$$;

-- Helper: can the current caller SEE data scoped to `target_slug`?
--   * root sees everything
--   * a model only sees its own slug
CREATE OR REPLACE FUNCTION public.can_see_model(target_slug TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT public.is_root() OR public.current_model_slug() = target_slug;
$$;

-- Helper: can the current caller WRITE data scoped to `target_slug`?
--   * model = only own slug
--   * root = own slug OR (any slug if can_manage_children = true)
CREATE OR REPLACE FUNCTION public.can_write_model(target_slug TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT public.current_model_slug() = target_slug
      OR (public.is_root() AND EXISTS (
            SELECT 1 FROM agence_models
             WHERE slug = public.current_model_slug()
               AND can_manage_children = true
         ));
$$;

-- Overloads accepting model_id (mN) : resolve to slug, then delegate.
-- Necessary because scoped tables store `model` = mN, not slug.
CREATE OR REPLACE FUNCTION public.can_see_model_id(target_mid TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT public.is_root()
      OR EXISTS (
           SELECT 1 FROM agence_models
            WHERE model_id = target_mid
              AND slug = public.current_model_slug()
         );
$$;

CREATE OR REPLACE FUNCTION public.can_write_model_id(target_mid TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM agence_models
       WHERE model_id = target_mid
         AND slug = public.current_model_slug()
    )
    OR (public.is_root() AND EXISTS (
          SELECT 1 FROM agence_models
           WHERE slug = public.current_model_slug()
             AND can_manage_children = true
       ));
$$;

COMMENT ON FUNCTION public.set_session_context(text,text) IS 'API routes call this before scoped queries to inject model_slug + role_tier into session GUCs.';
COMMENT ON FUNCTION public.can_see_model(text) IS 'SELECT gate : root sees all, model sees own slug.';
COMMENT ON FUNCTION public.can_write_model(text) IS 'INSERT/UPDATE/DELETE gate : model writes own, root writes any if can_manage_children.';
COMMENT ON FUNCTION public.can_see_model_id(text) IS 'Same as can_see_model but target is a model_id (mN).';
COMMENT ON FUNCTION public.can_write_model_id(text) IS 'Same as can_write_model but target is a model_id (mN).';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ SECTION 5 — Unified RLS policies across scoped tables                  ║
-- ║                                                                        ║
-- ║ Scoping column map :                                                   ║
-- ║   agence_clients               → model (mN)                            ║
-- ║   agence_codes                 → model (mN)                            ║
-- ║   agence_messages              → model (mN)                            ║
-- ║   agence_wall_posts            → model (mN)                            ║
-- ║   agence_uploads               → model (mN)                            ║
-- ║   agence_packs                 → model (mN)                            ║
-- ║   agence_posts                 → model (mN)                            ║
-- ║   agence_pages                 → model (mN)                            ║
-- ║   agence_collaborators         → model (mN)                            ║
-- ║   agence_revenue_log           → model (mN)                            ║
-- ║   agence_pending_payments      → model (mN)                            ║
-- ║   agence_purchases             → model (mN)                            ║
-- ║   instagram_config             → model_slug (mN)                       ║
-- ║   instagram_conversations      → model_slug (mN)                       ║
-- ║   instagram_messages           → via conversation_id → model_slug      ║
-- ║                                                                        ║
-- ║ NB : existing policies kept with FOR ALL USING (true) allow service_role║
-- ║ bypass. New unified policies are ADDITIVE (new names). Migrating       ║
-- ║ front-code to set_session_context is a separate task.                  ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- ─── agence_clients ────────────────────────────────────────────────────
ALTER TABLE agence_clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_clients' AND policyname='sel_agence_clients_v2') THEN
    CREATE POLICY sel_agence_clients_v2 ON agence_clients FOR SELECT
      USING (public.can_see_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_clients' AND policyname='ins_agence_clients_v2') THEN
    CREATE POLICY ins_agence_clients_v2 ON agence_clients FOR INSERT
      WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_clients' AND policyname='upd_agence_clients_v2') THEN
    CREATE POLICY upd_agence_clients_v2 ON agence_clients FOR UPDATE
      USING (public.can_write_model_id(model))
      WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_clients' AND policyname='del_agence_clients_v2') THEN
    CREATE POLICY del_agence_clients_v2 ON agence_clients FOR DELETE
      USING (public.can_write_model_id(model));
  END IF;
END $$;

-- ─── agence_codes ──────────────────────────────────────────────────────
ALTER TABLE agence_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_codes' AND policyname='sel_agence_codes_v2') THEN
    CREATE POLICY sel_agence_codes_v2 ON agence_codes FOR SELECT USING (public.can_see_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_codes' AND policyname='ins_agence_codes_v2') THEN
    CREATE POLICY ins_agence_codes_v2 ON agence_codes FOR INSERT WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_codes' AND policyname='upd_agence_codes_v2') THEN
    CREATE POLICY upd_agence_codes_v2 ON agence_codes FOR UPDATE USING (public.can_write_model_id(model)) WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_codes' AND policyname='del_agence_codes_v2') THEN
    CREATE POLICY del_agence_codes_v2 ON agence_codes FOR DELETE USING (public.can_write_model_id(model));
  END IF;
END $$;

-- ─── agence_messages ───────────────────────────────────────────────────
ALTER TABLE agence_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_messages' AND policyname='sel_agence_messages_v2') THEN
    CREATE POLICY sel_agence_messages_v2 ON agence_messages FOR SELECT USING (public.can_see_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_messages' AND policyname='ins_agence_messages_v2') THEN
    CREATE POLICY ins_agence_messages_v2 ON agence_messages FOR INSERT WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_messages' AND policyname='upd_agence_messages_v2') THEN
    CREATE POLICY upd_agence_messages_v2 ON agence_messages FOR UPDATE USING (public.can_write_model_id(model)) WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_messages' AND policyname='del_agence_messages_v2') THEN
    CREATE POLICY del_agence_messages_v2 ON agence_messages FOR DELETE USING (public.can_write_model_id(model));
  END IF;
END $$;

-- ─── agence_wall_posts ─────────────────────────────────────────────────
ALTER TABLE agence_wall_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_wall_posts' AND policyname='sel_agence_wall_posts_v2') THEN
    CREATE POLICY sel_agence_wall_posts_v2 ON agence_wall_posts FOR SELECT USING (public.can_see_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_wall_posts' AND policyname='ins_agence_wall_posts_v2') THEN
    CREATE POLICY ins_agence_wall_posts_v2 ON agence_wall_posts FOR INSERT WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_wall_posts' AND policyname='upd_agence_wall_posts_v2') THEN
    CREATE POLICY upd_agence_wall_posts_v2 ON agence_wall_posts FOR UPDATE USING (public.can_write_model_id(model)) WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_wall_posts' AND policyname='del_agence_wall_posts_v2') THEN
    CREATE POLICY del_agence_wall_posts_v2 ON agence_wall_posts FOR DELETE USING (public.can_write_model_id(model));
  END IF;
END $$;

-- ─── agence_uploads ────────────────────────────────────────────────────
ALTER TABLE agence_uploads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_uploads' AND policyname='sel_agence_uploads_v2') THEN
    CREATE POLICY sel_agence_uploads_v2 ON agence_uploads FOR SELECT USING (public.can_see_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_uploads' AND policyname='ins_agence_uploads_v2') THEN
    CREATE POLICY ins_agence_uploads_v2 ON agence_uploads FOR INSERT WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_uploads' AND policyname='upd_agence_uploads_v2') THEN
    CREATE POLICY upd_agence_uploads_v2 ON agence_uploads FOR UPDATE USING (public.can_write_model_id(model)) WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_uploads' AND policyname='del_agence_uploads_v2') THEN
    CREATE POLICY del_agence_uploads_v2 ON agence_uploads FOR DELETE USING (public.can_write_model_id(model));
  END IF;
END $$;

-- ─── agence_packs ──────────────────────────────────────────────────────
ALTER TABLE agence_packs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_packs' AND policyname='sel_agence_packs_v2') THEN
    CREATE POLICY sel_agence_packs_v2 ON agence_packs FOR SELECT USING (public.can_see_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_packs' AND policyname='ins_agence_packs_v2') THEN
    CREATE POLICY ins_agence_packs_v2 ON agence_packs FOR INSERT WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_packs' AND policyname='upd_agence_packs_v2') THEN
    CREATE POLICY upd_agence_packs_v2 ON agence_packs FOR UPDATE USING (public.can_write_model_id(model)) WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_packs' AND policyname='del_agence_packs_v2') THEN
    CREATE POLICY del_agence_packs_v2 ON agence_packs FOR DELETE USING (public.can_write_model_id(model));
  END IF;
END $$;

-- ─── agence_posts ──────────────────────────────────────────────────────
ALTER TABLE agence_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_posts' AND policyname='sel_agence_posts_v2') THEN
    CREATE POLICY sel_agence_posts_v2 ON agence_posts FOR SELECT USING (public.can_see_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_posts' AND policyname='ins_agence_posts_v2') THEN
    CREATE POLICY ins_agence_posts_v2 ON agence_posts FOR INSERT WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_posts' AND policyname='upd_agence_posts_v2') THEN
    CREATE POLICY upd_agence_posts_v2 ON agence_posts FOR UPDATE USING (public.can_write_model_id(model)) WITH CHECK (public.can_write_model_id(model));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_posts' AND policyname='del_agence_posts_v2') THEN
    CREATE POLICY del_agence_posts_v2 ON agence_posts FOR DELETE USING (public.can_write_model_id(model));
  END IF;
END $$;

-- ─── instagram_config ──────────────────────────────────────────────────
ALTER TABLE instagram_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_config' AND policyname='sel_instagram_config_v2') THEN
    CREATE POLICY sel_instagram_config_v2 ON instagram_config FOR SELECT USING (public.can_see_model_id(model_slug));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_config' AND policyname='ins_instagram_config_v2') THEN
    CREATE POLICY ins_instagram_config_v2 ON instagram_config FOR INSERT WITH CHECK (public.can_write_model_id(model_slug));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_config' AND policyname='upd_instagram_config_v2') THEN
    CREATE POLICY upd_instagram_config_v2 ON instagram_config FOR UPDATE USING (public.can_write_model_id(model_slug)) WITH CHECK (public.can_write_model_id(model_slug));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_config' AND policyname='del_instagram_config_v2') THEN
    CREATE POLICY del_instagram_config_v2 ON instagram_config FOR DELETE USING (public.can_write_model_id(model_slug));
  END IF;
END $$;

-- ─── instagram_conversations ───────────────────────────────────────────
ALTER TABLE instagram_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_conversations' AND policyname='sel_ig_conversations_v2') THEN
    CREATE POLICY sel_ig_conversations_v2 ON instagram_conversations FOR SELECT USING (public.can_see_model_id(model_slug));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_conversations' AND policyname='ins_ig_conversations_v2') THEN
    CREATE POLICY ins_ig_conversations_v2 ON instagram_conversations FOR INSERT WITH CHECK (public.can_write_model_id(model_slug));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_conversations' AND policyname='upd_ig_conversations_v2') THEN
    CREATE POLICY upd_ig_conversations_v2 ON instagram_conversations FOR UPDATE USING (public.can_write_model_id(model_slug)) WITH CHECK (public.can_write_model_id(model_slug));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_conversations' AND policyname='del_ig_conversations_v2') THEN
    CREATE POLICY del_ig_conversations_v2 ON instagram_conversations FOR DELETE USING (public.can_write_model_id(model_slug));
  END IF;
END $$;

-- ─── instagram_messages (scoped via parent conversation) ───────────────
ALTER TABLE instagram_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_messages' AND policyname='sel_ig_messages_v2') THEN
    CREATE POLICY sel_ig_messages_v2 ON instagram_messages FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM instagram_conversations c
         WHERE c.id = instagram_messages.conversation_id
           AND public.can_see_model_id(c.model_slug)
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_messages' AND policyname='ins_ig_messages_v2') THEN
    CREATE POLICY ins_ig_messages_v2 ON instagram_messages FOR INSERT
      WITH CHECK (EXISTS (
        SELECT 1 FROM instagram_conversations c
         WHERE c.id = instagram_messages.conversation_id
           AND public.can_write_model_id(c.model_slug)
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_messages' AND policyname='upd_ig_messages_v2') THEN
    CREATE POLICY upd_ig_messages_v2 ON instagram_messages FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM instagram_conversations c
         WHERE c.id = instagram_messages.conversation_id
           AND public.can_write_model_id(c.model_slug)
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM instagram_conversations c
         WHERE c.id = instagram_messages.conversation_id
           AND public.can_write_model_id(c.model_slug)
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='instagram_messages' AND policyname='del_ig_messages_v2') THEN
    CREATE POLICY del_ig_messages_v2 ON instagram_messages FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM instagram_conversations c
         WHERE c.id = instagram_messages.conversation_id
           AND public.can_write_model_id(c.model_slug)
      ));
  END IF;
END $$;

-- ─── agence_fans : global, not scoped per model ────────────────────────
-- Visible to : root, OR any model linked to this fan via agence_clients OR instagram_conversations.
-- Writes : service_role bypasses RLS (API routes), or root tier.
ALTER TABLE agence_fans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_fans' AND policyname='sel_agence_fans_v2') THEN
    CREATE POLICY sel_agence_fans_v2 ON agence_fans FOR SELECT
      USING (
        public.is_root()
        OR EXISTS (
          SELECT 1 FROM agence_clients c
          JOIN agence_models m ON m.model_id = c.model
           WHERE c.fan_id = agence_fans.id
             AND m.slug = public.current_model_slug()
        )
        OR EXISTS (
          SELECT 1 FROM instagram_conversations ic
          JOIN agence_models m ON m.model_id = ic.model_slug
           WHERE ic.fan_id = agence_fans.id
             AND m.slug = public.current_model_slug()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_fans' AND policyname='ins_agence_fans_v2') THEN
    CREATE POLICY ins_agence_fans_v2 ON agence_fans FOR INSERT
      WITH CHECK (public.is_root() OR public.current_model_slug() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_fans' AND policyname='upd_agence_fans_v2') THEN
    CREATE POLICY upd_agence_fans_v2 ON agence_fans FOR UPDATE
      USING (public.is_root())
      WITH CHECK (public.is_root());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agence_fans' AND policyname='del_agence_fans_v2') THEN
    CREATE POLICY del_agence_fans_v2 ON agence_fans FOR DELETE
      USING (public.is_root());
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ SECTION 6 — Unified messaging timeline view                            ║
-- ║                                                                        ║
-- ║ UNION of :                                                             ║
-- ║   - web       : agence_messages (model mN, client_id → fan_id via     ║
-- ║                 agence_clients.fan_id)                                 ║
-- ║   - instagram : instagram_messages + instagram_conversations           ║
-- ║                                                                        ║
-- ║ Columns unified : source, id, model (mN), fan_id, text, created_at,    ║
-- ║ direction.                                                             ║
-- ║                                                                        ║
-- ║ Direction mapping :                                                    ║
-- ║   agence_messages.sender_type='client'  → 'in'                         ║
-- ║   agence_messages.sender_type in ('model','admin') → 'out'             ║
-- ║   instagram_messages.role='user'        → 'in'                         ║
-- ║   instagram_messages.role in ('agent','human') → 'out'                 ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE VIEW agence_messages_timeline AS
  SELECT
    'web'::TEXT                                                     AS source,
    am.id::TEXT                                                     AS id,
    am.model                                                        AS model,
    ac.fan_id                                                       AS fan_id,
    am.client_id                                                    AS client_id,
    NULL::TEXT                                                      AS ig_conversation_id,
    am.content                                                      AS text,
    CASE WHEN am.sender_type = 'client' THEN 'in' ELSE 'out' END    AS direction,
    COALESCE(am.read, false)                                        AS read_flag,
    am.created_at                                                   AS created_at
  FROM agence_messages am
  LEFT JOIN agence_clients ac ON ac.id = am.client_id
  UNION ALL
  SELECT
    'instagram'::TEXT                                               AS source,
    im.id::TEXT                                                     AS id,
    ic.model_slug                                                   AS model,
    ic.fan_id                                                       AS fan_id,
    NULL::UUID                                                      AS client_id,
    ic.id::TEXT                                                     AS ig_conversation_id,
    im.content                                                      AS text,
    CASE WHEN im.role = 'user' THEN 'in' ELSE 'out' END             AS direction,
    false                                                           AS read_flag,
    im.created_at                                                   AS created_at
  FROM instagram_messages im
  JOIN instagram_conversations ic ON ic.id = im.conversation_id;

COMMENT ON VIEW agence_messages_timeline IS 'Unified feed of web + Instagram messages, scoped by model (mN) and optionally fan_id.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ SECTION 7 — Verification queries (run manually to audit)               ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

-- Check hierarchy seed :
-- SELECT slug, model_id, role_tier, agency_parent_slug, is_ai_generated, can_manage_children
--   FROM agence_models ORDER BY model_number;

-- Check new policies :
-- SELECT tablename, policyname FROM pg_policies
--  WHERE policyname LIKE '%_v2' ORDER BY tablename, policyname;

-- Check agence_fans :
-- SELECT count(*) FROM agence_fans;

-- Check helpers :
-- SELECT public.current_model_slug(), public.current_role_tier(), public.is_root();

-- ═══════════════════════════════════════════════════════════════════════════
-- END 032_yumi_unified_messaging.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 041_agence_caming_sessions.sql
-- TARGET: HEAVEN DB
--
-- PURPOSE
--   1. Create public.agence_caming_sessions  : per-session metrics for
--      Stripchat / Bongacams / Chaturbate. Includes attribution counters
--      (utm redirections + new Fanvue subscribers attributed to the session).
--   2. Create public.agence_revenus_modele   : canonical revenus log per
--      model (was missing — needed by 042 commission view). Includes
--      source / channel taxonomy and FK to caming_session_id when revenue
--      is caming-attributed.
--
--   Everything is additive and idempotent. Foreign keys cascade on model
--   delete to keep cleanup simple in dev/test.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. agence_caming_sessions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agence_caming_sessions (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id                        text NOT NULL REFERENCES public.agence_models(model_id) ON DELETE CASCADE,
  platform                        text NOT NULL CHECK (platform IN ('stripchat','bongacams','chaturbate')),
  started_at                      timestamptz NOT NULL,
  ended_at                        timestamptz,
  duration_minutes                int GENERATED ALWAYS AS
                                    ((EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::int) STORED,
  viewers_unique_estimated        int DEFAULT 0,
  tokens_earned                   numeric DEFAULT 0,
  tips_received                   numeric DEFAULT 0,
  private_sessions_count          int DEFAULT 0,
  redirections_fanvue_utm         int DEFAULT 0,
  new_fanvue_subscribers_attributed int DEFAULT 0,
  notes                           text,
  created_at                      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caming_model_time
  ON public.agence_caming_sessions (model_id, started_at DESC);

COMMENT ON TABLE public.agence_caming_sessions IS
  'Caming session log per model + platform. duration_minutes auto-computed from started_at/ended_at.';

-- ── 2. agence_revenus_modele (created — did not exist) ──────────────────────
CREATE TABLE IF NOT EXISTS public.agence_revenus_modele (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id            text NOT NULL REFERENCES public.agence_models(model_id) ON DELETE CASCADE,
  amount              numeric NOT NULL,
  currency            text DEFAULT 'EUR',
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenus_model_time
  ON public.agence_revenus_modele (model_id, created_at DESC);

-- ── 3. Extension fields (additive, idempotent) ──────────────────────────────
ALTER TABLE public.agence_revenus_modele
  ADD COLUMN IF NOT EXISTS source_platform text
    CHECK (source_platform IN ('fanvue','onlyfans','mym','stripchat','bongacams','chaturbate','manuel')),
  ADD COLUMN IF NOT EXISTS source_type text
    CHECK (source_type IN ('subscription','ppv','tip','caming_tokens','private_session')),
  ADD COLUMN IF NOT EXISTS acquisition_channel text
    CHECK (acquisition_channel IN ('caming','ig_organic','tiktok','snap','collab','paid','other')),
  ADD COLUMN IF NOT EXISTS caming_session_id uuid REFERENCES public.agence_caming_sessions(id);

COMMENT ON TABLE public.agence_revenus_modele IS
  'Canonical revenue log per model. source_platform/source_type/acquisition_channel taxonomy aligns with BP V2 attribution. caming_session_id back-references when revenue is caming-attributed.';

-- ═══════════════════════════════════════════════════════════════════════════
-- END 041_agence_caming_sessions.sql
-- ═══════════════════════════════════════════════════════════════════════════

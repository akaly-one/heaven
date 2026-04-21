-- ═══════════════════════════════════════════════════════════════════════════
-- 039_agence_models_business_fields.sql
-- TARGET: HEAVEN DB
--
-- PURPOSE
--   Extend public.agence_models with all business fields required by the
--   Agence BP V2 / TECH v1 (modes Cowork A/B/C, identity plans, paliers de
--   rémunération, voies fiscales, statut initial, caming, release form,
--   contrat, et seuils d'escalation).
--
--   100% additive (ADD COLUMN IF NOT EXISTS) → safe to re-apply, no breaking
--   change. Defaults align m1/m2/m3 with current operational reality (m1=A,
--   m2=B+shadow, m3=B+discovery).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_models
  ADD COLUMN IF NOT EXISTS mode_operation text
    CHECK (mode_operation IN ('A','B','C')) DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS identity_plan text
    CHECK (identity_plan IN ('discovery','shadow')) DEFAULT 'discovery',
  ADD COLUMN IF NOT EXISTS palier_remuneration text
    CHECK (palier_remuneration IN ('P1','P2','P3','P4')) DEFAULT 'P1',
  ADD COLUMN IF NOT EXISTS fiscal_voie text
    CHECK (fiscal_voie IN ('droit_image','profits_divers','indep_complementaire','indep_principal'))
    DEFAULT 'droit_image',
  ADD COLUMN IF NOT EXISTS statut_initial text
    CHECK (statut_initial IN ('salariee','etudiante','chomage','sans_activite','pensionnee')),
  ADD COLUMN IF NOT EXISTS statut_initial_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS caming_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS caming_platforms jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS caming_weekly_hours_target int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS release_form_status text
    CHECK (release_form_status IN ('pending','submitted','validated','rejected'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS release_form_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_form_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_url text,
  ADD COLUMN IF NOT EXISTS revenue_monthly_avg_3m numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS palier_escalation_locked_until timestamptz;

-- Seed canonical operational mapping for m1/m2/m3
UPDATE public.agence_models SET mode_operation = 'A'                              WHERE model_id = 'm1';
UPDATE public.agence_models SET mode_operation = 'B', identity_plan = 'shadow'    WHERE model_id = 'm2';
UPDATE public.agence_models SET mode_operation = 'B', identity_plan = 'discovery' WHERE model_id = 'm3';

-- ═══════════════════════════════════════════════════════════════════════════
-- END 039_agence_models_business_fields.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Policies RLS — agence_identity_plan_changes (APPEND-ONLY)
-- Source de vérité : appliquées via migration 045_log_tables_append_only.sql
--
-- INVARIANT
--   - Table IMMUABLE : pas de UPDATE ni DELETE.
--   - INSERT : scope identity_plan:switch (request workflow approuvé admin).
--   - SELECT : admin OU scope identity:view_legal OU propriétaire.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_identity_plan_changes ENABLE ROW LEVEL SECURITY;

-- INSERT : scope dédié (workflow request)
CREATE POLICY identity_plan_insert ON public.agence_identity_plan_changes FOR INSERT
  WITH CHECK (
    public.has_scope('identity_plan:switch')
    OR public.has_scope('*')
  );

-- SELECT : admin OU view_legal OU propriétaire
CREATE POLICY identity_plan_read ON public.agence_identity_plan_changes FOR SELECT
  USING (
    public.has_scope('*')
    OR public.can_view_identity(model_id)
    OR public.can_see_model_id(model_id)
  );

-- AUCUNE policy UPDATE/DELETE → historique intact

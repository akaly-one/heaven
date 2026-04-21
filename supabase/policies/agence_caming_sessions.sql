-- ═══════════════════════════════════════════════════════════════════════════
-- Policies RLS — agence_caming_sessions
-- Source de vérité : appliquées via migration 044_rls_scopes_extended.sql
-- Ce fichier sert de doc de référence (source SQL canonique pour audit).
--
-- SCOPING
--   Standard model_id (cf. helpers can_see_model_id / can_write_model_id
--   définis en 032_yumi_unified_messaging). Wildcard '*' = bypass admin.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_caming_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT : visibilité du modèle OU admin wildcard
CREATE POLICY cam_read ON public.agence_caming_sessions FOR SELECT
  USING (public.can_see_model_id(model_id) OR public.has_scope('*'));

-- INSERT : write sur le modèle OU admin
CREATE POLICY cam_write ON public.agence_caming_sessions FOR INSERT
  WITH CHECK (public.can_write_model_id(model_id) OR public.has_scope('*'));

-- UPDATE : write sur le modèle OU admin
CREATE POLICY cam_update ON public.agence_caming_sessions FOR UPDATE
  USING (public.can_write_model_id(model_id) OR public.has_scope('*'))
  WITH CHECK (public.can_write_model_id(model_id) OR public.has_scope('*'));

-- DELETE non exposé (préserver historique sessions)

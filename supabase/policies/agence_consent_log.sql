-- ═══════════════════════════════════════════════════════════════════════════
-- Policies RLS — agence_consent_log (APPEND-ONLY, RGPD Art. 7)
-- Source de vérité : appliquées via migration 045_log_tables_append_only.sql
--
-- INVARIANT
--   - Table IMMUABLE : pas de UPDATE ni DELETE.
--   - INSERT : admin OU propriétaire du modèle (peut tracer son retrait).
--   - SELECT : admin OU propriétaire (lit son propre historique).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_consent_log ENABLE ROW LEVEL SECURITY;

-- INSERT : admin OU propriétaire du modèle
CREATE POLICY consent_log_insert ON public.agence_consent_log FOR INSERT
  WITH CHECK (
    public.has_scope('*')
    OR public.can_see_model_id(model_id)
  );

-- SELECT : admin OU propriétaire
CREATE POLICY consent_log_read ON public.agence_consent_log FOR SELECT
  USING (
    public.has_scope('*')
    OR public.can_see_model_id(model_id)
  );

-- AUCUNE policy UPDATE/DELETE → traçabilité RGPD intacte

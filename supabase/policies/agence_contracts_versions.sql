-- ═══════════════════════════════════════════════════════════════════════════
-- Policies RLS — agence_contracts_versions (APPEND-ONLY versioning)
-- Source de vérité : appliquées via migration 045_log_tables_append_only.sql
--
-- INVARIANT
--   - Table IMMUABLE : pas de UPDATE ni DELETE (chaque version est figée).
--   - INSERT : scope contract:view (équipe contrats + admin).
--   - SELECT : helper can_view_contract (admin OU propriétaire avec scope).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_contracts_versions ENABLE ROW LEVEL SECURITY;

-- INSERT : scope contract:view OU admin (signature contrat = action contrôlée)
CREATE POLICY contracts_versions_insert ON public.agence_contracts_versions FOR INSERT
  WITH CHECK (
    public.has_scope('contract:view')
    OR public.has_scope('*')
  );

-- SELECT : helper can_view_contract (combine scope + ownership)
CREATE POLICY contracts_versions_read ON public.agence_contracts_versions FOR SELECT
  USING (public.can_view_contract(model_id));

-- AUCUNE policy UPDATE/DELETE → versioning strict, immuable

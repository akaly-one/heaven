-- ═══════════════════════════════════════════════════════════════════════════
-- Policies RLS — agence_palier_history (APPEND-ONLY)
-- Source de vérité : appliquées via migration 045_log_tables_append_only.sql
--
-- INVARIANT
--   - Table IMMUABLE : pas de UPDATE ni DELETE.
--   - INSERT : scope palier:escalate (admin trigger + signature avenant).
--   - SELECT : admin OU propriétaire (modèle voit son propre historique).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_palier_history ENABLE ROW LEVEL SECURITY;

-- INSERT : scope palier:escalate (workflow admin)
CREATE POLICY palier_history_insert ON public.agence_palier_history FOR INSERT
  WITH CHECK (
    public.has_scope('palier:escalate')
    OR public.has_scope('*')
  );

-- SELECT : admin OU propriétaire
CREATE POLICY palier_history_read ON public.agence_palier_history FOR SELECT
  USING (
    public.has_scope('*')
    OR public.can_see_model_id(model_id)
  );

-- AUCUNE policy UPDATE/DELETE → historique paliers intact

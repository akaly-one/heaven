-- ═══════════════════════════════════════════════════════════════════════════
-- Policies RLS — agence_dmca_access_log (APPEND-ONLY)
-- Source de vérité : appliquées via migration 045_log_tables_append_only.sql
-- Ce fichier sert de doc de référence.
--
-- INVARIANT
--   - Table IMMUABLE : pas de UPDATE ni DELETE (aucune policy → bloqué).
--   - INSERT permis pour tout caller ayant un scope dmca:* ou wildcard.
--   - SELECT réservé admin (wildcard) ou DPO futur (dmca:read).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_dmca_access_log ENABLE ROW LEVEL SECURITY;

-- INSERT : scope dmca:* permet d'écrire (audit trail au moment de l'accès)
CREATE POLICY dmca_log_insert ON public.agence_dmca_access_log FOR INSERT
  WITH CHECK (
    public.has_scope('dmca:read')
    OR public.has_scope('dmca:write')
    OR public.has_scope('*')
  );

-- SELECT : admin OU scope dmca:read (DPO futur)
CREATE POLICY dmca_log_read ON public.agence_dmca_access_log FOR SELECT
  USING (public.has_scope('*') OR public.has_scope('dmca:read'));

-- AUCUNE policy UPDATE/DELETE → table immuable (RGPD audit-ready)

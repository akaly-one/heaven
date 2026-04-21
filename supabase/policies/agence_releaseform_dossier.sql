-- ═══════════════════════════════════════════════════════════════════════════
-- Policies RLS — agence_releaseform_dossier (DMCA bucket)
-- Source de vérité : appliquées via migration 044_rls_scopes_extended.sql
-- Ce fichier sert de doc de référence (source SQL canonique pour audit).
--
-- SCOPES UTILISÉS
--   - dmca:read  : lire dossier release form (admin + DPO + propriétaire)
--   - dmca:write : créer / mettre à jour dossier (admin + équipe DMCA)
--
-- CONFIDENTIALITÉ
--   Toutes les colonnes *_url contiennent des signed URLs courte durée
--   (15 min) vers le bucket chiffré. Aucune PII en clair en DB.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_releaseform_dossier ENABLE ROW LEVEL SECURITY;

-- SELECT : scope dmca:read + visibilité du modèle
CREATE POLICY rf_read ON public.agence_releaseform_dossier FOR SELECT
  USING (public.can_access_dmca(model_id));

-- INSERT : scope dmca:write requis (équipe DMCA + admin)
CREATE POLICY rf_write ON public.agence_releaseform_dossier FOR INSERT
  WITH CHECK (public.has_scope('dmca:write'));

-- UPDATE : scope dmca:write requis (mise à jour statut validation/rejet)
CREATE POLICY rf_update ON public.agence_releaseform_dossier FOR UPDATE
  USING (public.has_scope('dmca:write'))
  WITH CHECK (public.has_scope('dmca:write'));

-- DELETE : interdit (workflow retrait via agence_consent_log dédié)

-- ═══════════════════════════════════════════════════════════════════════════
-- 044_rls_scopes_extended.sql
-- TARGET: HEAVEN DB
--
-- PURPOSE
--   Étend les helpers RLS GUC-based existants (cf. 032_yumi_unified_messaging)
--   avec des fonctions de scopes granulaires :
--     - auth_scopes()           : extrait l'array `scopes` du JWT claim
--     - has_scope(scope)        : vérifie un scope précis (ou wildcard '*')
--     - can_access_dmca(mid)    : combo dmca:read + can_see_model_id
--     - can_view_contract(mid)  : combo contract:view + ownership/admin
--     - can_view_identity(mid)  : combo identity:view_legal + can_see_model_id
--
--   Ces helpers servent les policies RLS sur :
--     - agence_releaseform_dossier  (scope dmca:read/dmca:write)
--     - agence_caming_sessions      (scope model standard)
--     - agence_dmca_access_log      (append-only)
--     - agence_consent_log          (append-only RGPD Art. 7)
--     - agence_identity_plan_changes (append-only)
--     - agence_palier_history       (append-only)
--     - agence_contracts_versions   (append-only versioning contrats)
--
-- SAFETY
--   - Idempotent (CREATE OR REPLACE).
--   - Toutes les fonctions sont STABLE (pas VOLATILE) → planner peut les
--     mémoïser dans une seule requête.
--   - Compatible JWT custom Heaven (lit current_setting('request.jwt.claims')).
--   - Si le JWT n'a pas de scopes, retourne array vide (pas d'accès accordé).
--
-- DÉPENDANCES
--   - 032_yumi_unified_messaging : helpers can_see_model_id, can_write_model_id
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Helper 1 — auth_scopes()                                              ║
-- ║ Extrait le claim `scopes` du JWT (array JSON). Retourne [] si absent. ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.auth_scopes() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb)->'scopes',
    '[]'::jsonb
  );
$$;

COMMENT ON FUNCTION public.auth_scopes() IS
  'Extrait le claim "scopes" (array) du JWT courant. Retourne [] si absent.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Helper 2 — has_scope(scope)                                           ║
-- ║ True si le JWT contient `scope` ou wildcard '*'.                      ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.has_scope(p_scope text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT
    public.auth_scopes() ? p_scope
    OR public.auth_scopes() ? '*';
$$;

COMMENT ON FUNCTION public.has_scope(text) IS
  'True si le JWT contient `scope` ou le wildcard ''*'' (admin master).';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Helper 3 — can_access_dmca(model_id)                                  ║
-- ║ Bucket DMCA sensible : exige scope dmca:read ET visibilité du modèle. ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.can_access_dmca(p_model_id text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.has_scope('dmca:read')
    AND public.can_see_model_id(p_model_id);
$$;

COMMENT ON FUNCTION public.can_access_dmca(text) IS
  'Accès DMCA : scope dmca:read + visibilité du modèle (admin = wildcard).';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Helper 4 — can_view_contract(model_id)                                ║
-- ║ Visualisation contrat privé : scope contract:view + ownership OU      ║
-- ║ admin wildcard.                                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.can_view_contract(p_model_id text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT (public.has_scope('contract:view') OR public.has_scope('*'))
    AND (
      public.can_see_model_id(p_model_id)
      OR (current_setting('request.jwt.claims', true)::jsonb)->>'model_id' = p_model_id
    );
$$;

COMMENT ON FUNCTION public.can_view_contract(text) IS
  'Visualisation contrat : scope contract:view + (visibilité modèle OU JWT.model_id == target).';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Helper 5 — can_view_identity(model_id)                                ║
-- ║ Champs identité légale (chiffrés pgsodium) : scope identity:view_legal║
-- ║ ET visibilité du modèle.                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.can_view_identity(p_model_id text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT public.has_scope('identity:view_legal')
    AND public.can_see_model_id(p_model_id);
$$;

COMMENT ON FUNCTION public.can_view_identity(text) IS
  'Vue identité légale (champs sensibles) : scope identity:view_legal + visibilité modèle.';


-- ═══════════════════════════════════════════════════════════════════════════
-- POLICIES RLS sur les tables existantes (040, 041)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── agence_releaseform_dossier (DMCA) ──────────────────────────────────
ALTER TABLE public.agence_releaseform_dossier ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_releaseform_dossier' AND policyname='rf_read') THEN
    CREATE POLICY rf_read ON public.agence_releaseform_dossier FOR SELECT
      USING (public.can_access_dmca(model_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_releaseform_dossier' AND policyname='rf_write') THEN
    CREATE POLICY rf_write ON public.agence_releaseform_dossier FOR INSERT
      WITH CHECK (public.has_scope('dmca:write'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_releaseform_dossier' AND policyname='rf_update') THEN
    CREATE POLICY rf_update ON public.agence_releaseform_dossier FOR UPDATE
      USING (public.has_scope('dmca:write'))
      WITH CHECK (public.has_scope('dmca:write'));
  END IF;
  -- Pas de DELETE : workflow retrait dédié (consent log)
END $$;

-- ─── agence_caming_sessions ─────────────────────────────────────────────
ALTER TABLE public.agence_caming_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_caming_sessions' AND policyname='cam_read') THEN
    CREATE POLICY cam_read ON public.agence_caming_sessions FOR SELECT
      USING (public.can_see_model_id(model_id) OR public.has_scope('*'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_caming_sessions' AND policyname='cam_write') THEN
    CREATE POLICY cam_write ON public.agence_caming_sessions FOR INSERT
      WITH CHECK (public.can_write_model_id(model_id) OR public.has_scope('*'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_caming_sessions' AND policyname='cam_update') THEN
    CREATE POLICY cam_update ON public.agence_caming_sessions FOR UPDATE
      USING (public.can_write_model_id(model_id) OR public.has_scope('*'))
      WITH CHECK (public.can_write_model_id(model_id) OR public.has_scope('*'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- END 044_rls_scopes_extended.sql
-- ═══════════════════════════════════════════════════════════════════════════

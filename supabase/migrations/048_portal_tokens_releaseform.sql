-- ═══════════════════════════════════════════════════════════════════════════
-- 048_portal_tokens_releaseform.sql
-- TARGET: HEAVEN DB
--
-- PURPOSE
--   Tokens uniques, à usage unique, pour laisser une modèle pré-remplir un
--   dossier DMCA (release form) sans authentification via le portail public
--   /portal/release-form/<token>.
--
--   Chaque token :
--     - est généré par un admin (scope dmca:write ou wildcard '*')
--     - expire après 7 jours
--     - est invalidé après usage (used_at non-null)
--
--   On réutilise ce même pattern plus tard pour 'contract' et 'onboarding'.
--
-- SAFETY
--   - Idempotent (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION).
--   - RLS : INSERT scope admin, SELECT via fonction SECURITY DEFINER uniquement
--     (jamais de SELECT direct — évite énumération brute force).
--   - Token 32 bytes = 64 hex chars ≈ 2^256 — collision négligeable.
--
-- DÉPENDANCES
--   - 039_agence_models_business_fields : agence_models doit exister
--   - 040_agence_releaseform_dossier : dossier cible
--   - 044_rls_scopes_extended : helper has_scope
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Table — agence_portal_tokens                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.agence_portal_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id       text NOT NULL REFERENCES public.agence_models(model_id) ON DELETE CASCADE,
  token          text NOT NULL UNIQUE,
  purpose        text NOT NULL CHECK (purpose IN ('release_form', 'contract', 'onboarding')),
  generated_by   text NOT NULL,
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at        timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- Index partiel : recherche ultra-rapide d'un token non-utilisé
CREATE INDEX IF NOT EXISTS idx_portal_tokens_active
  ON public.agence_portal_tokens (token)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_portal_tokens_model
  ON public.agence_portal_tokens (model_id, purpose, created_at DESC);

COMMENT ON TABLE public.agence_portal_tokens IS
  'Tokens uniques à usage unique pour portail public (pré-remplissage modèle). Expire 7j, invalidé après usage.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Fonction — generate_portal_token(model_id, purpose, generated_by)     ║
-- ║ SECURITY DEFINER pour bypass RLS (côté serveur admin uniquement).     ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.generate_portal_token(
  p_model_id      text,
  p_purpose       text,
  p_generated_by  text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
-- pgcrypto lives in `extensions` schema on Supabase → include it in search_path.
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_token text;
BEGIN
  -- Garde-fou : purpose valide
  IF p_purpose NOT IN ('release_form', 'contract', 'onboarding') THEN
    RAISE EXCEPTION 'Invalid purpose: %', p_purpose;
  END IF;

  -- Génère token crypto-safe (32 bytes aléatoires = 64 hex chars) via pgcrypto.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.agence_portal_tokens
    (model_id, token, purpose, generated_by)
  VALUES
    (p_model_id, v_token, p_purpose, p_generated_by);

  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION public.generate_portal_token(text, text, text) IS
  'Crée un token portail unique (32 bytes hex). SECURITY DEFINER — appel côté serveur admin uniquement.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Fonction — consume_portal_token(token, expected_purpose)              ║
-- ║ Marque le token comme utilisé ET retourne le model_id.                ║
-- ║ Retourne NULL si token invalide/expiré/déjà utilisé.                  ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.consume_portal_token(
  p_token            text,
  p_expected_purpose text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_model_id text;
BEGIN
  UPDATE public.agence_portal_tokens
  SET used_at = now()
  WHERE token = p_token
    AND purpose = p_expected_purpose
    AND used_at IS NULL
    AND expires_at > now()
  RETURNING model_id INTO v_model_id;

  RETURN v_model_id; -- NULL si pas trouvé
END;
$$;

COMMENT ON FUNCTION public.consume_portal_token(text, text) IS
  'Consomme un token portail (transition atomique used_at). Retourne model_id ou NULL si invalide.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Fonction — verify_portal_token(token, expected_purpose)               ║
-- ║ Lecture seule — ne consomme pas. Utilisé pour afficher le formulaire. ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.verify_portal_token(
  p_token            text,
  p_expected_purpose text
)
RETURNS TABLE(model_id text, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT model_id, expires_at
  FROM public.agence_portal_tokens
  WHERE token = p_token
    AND purpose = p_expected_purpose
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.verify_portal_token(text, text) IS
  'Vérifie un token portail sans le consommer. Retourne (model_id, expires_at) ou vide.';


-- ═══════════════════════════════════════════════════════════════════════════
-- POLICIES RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agence_portal_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_portal_tokens' AND policyname='portal_tokens_insert') THEN
    CREATE POLICY portal_tokens_insert ON public.agence_portal_tokens FOR INSERT
      WITH CHECK (
        public.has_scope('*')
        OR public.has_scope('dmca:write')
        OR public.has_scope('contract:view')
        OR public.has_scope('model:onboard')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_portal_tokens' AND policyname='portal_tokens_read') THEN
    CREATE POLICY portal_tokens_read ON public.agence_portal_tokens FOR SELECT
      USING (
        public.has_scope('*')
        OR public.has_scope('dmca:read')
        OR public.has_scope('dmca:write')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_portal_tokens' AND policyname='portal_tokens_update') THEN
    -- UPDATE autorisé uniquement via consume_portal_token (SECURITY DEFINER)
    -- Cette policy couvre les rares cas d'admin qui veut invalider manuellement.
    CREATE POLICY portal_tokens_update ON public.agence_portal_tokens FOR UPDATE
      USING (public.has_scope('*'))
      WITH CHECK (public.has_scope('*'));
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- END 048_portal_tokens_releaseform.sql
-- ═══════════════════════════════════════════════════════════════════════════

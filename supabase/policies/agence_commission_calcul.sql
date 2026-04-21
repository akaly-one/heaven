-- ═══════════════════════════════════════════════════════════════════════════
-- Policies RLS — agence_commission_calcul (vue matérialisée)
-- Source de vérité : à appliquer manuellement via SQL editor.
--
-- ATTENTION
--   PostgreSQL N'APPLIQUE PAS RLS directement sur les vues matérialisées
--   (les permissions sont héritées de l'utilisateur qui a créé la vue).
--   Pour scoper la vue par modèle, on utilise une fonction wrapper ou on
--   filtre côté API. Ce fichier est conservé comme doc et propose un
--   wrapper RPC sécurisé.
-- ═══════════════════════════════════════════════════════════════════════════

-- Wrapper RPC : retourne uniquement les lignes accessibles au caller
CREATE OR REPLACE FUNCTION public.get_commission_for_model(p_model_id text)
RETURNS SETOF public.agence_commission_calcul
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
    FROM public.agence_commission_calcul
   WHERE model_id = p_model_id
     AND (
       public.has_scope('*')
       OR public.can_see_model_id(model_id)
     );
$$;

COMMENT ON FUNCTION public.get_commission_for_model(text) IS
  'Wrapper RLS-safe pour la vue matérialisée agence_commission_calcul. Retourne uniquement les lignes accessibles au caller selon ses scopes.';

-- Note : pour bloquer l'accès direct à la vue brute, révoquer SELECT à anon/authenticated :
-- REVOKE SELECT ON public.agence_commission_calcul FROM anon, authenticated;
-- GRANT SELECT ON public.agence_commission_calcul TO service_role;

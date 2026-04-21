-- ═══════════════════════════════════════════════════════════════════════════
-- 045_log_tables_append_only.sql
-- TARGET: HEAVEN DB
--
-- PURPOSE
--   Tables de log immuables (append-only) requises par SECURITY-v1 :
--     - agence_dmca_access_log       : audit trail accès bucket sensible
--     - agence_consent_log           : retraits consentement (RGPD Art. 7)
--     - agence_identity_plan_changes : historique bascules Plan Identité
--     - agence_palier_history        : historique paliers rémunération
--     - agence_contracts_versions    : versioning contrats privés signés
--
--   Toutes les tables sont protégées par RLS append-only :
--     - INSERT autorisé selon scope pertinent
--     - SELECT pour admin (wildcard '*') ou propriétaire
--     - UPDATE / DELETE BLOQUÉS (aucune policy → effet par défaut RLS = bloqué)
--
-- SAFETY
--   - Idempotent (IF NOT EXISTS).
--   - Pas d'UPDATE/DELETE → conformité audit RGPD/CNIL.
--   - Indexes sur (model_id, ts DESC) pour audit chronologique rapide.
--
-- DÉPENDANCES
--   - 044_rls_scopes_extended : helpers has_scope, can_access_dmca, etc.
--   - 039_agence_models_business_fields : agence_models doit exister (FK soft)
-- ═══════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Table 1 — agence_dmca_access_log                                      ║
-- ║ Audit trail immuable de tous accès bucket dmca-dossiers.              ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.agence_dmca_access_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_sub    text NOT NULL,
  accessor_role   text NOT NULL,
  model_id        text NOT NULL,
  resource_type   text NOT NULL,
  resource_url    text,
  action          text NOT NULL CHECK (action IN ('view','download','signed_url_generated')),
  ip_address      inet,
  user_agent      text,
  accessed_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dmca_log_time
  ON public.agence_dmca_access_log (accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dmca_log_model
  ON public.agence_dmca_access_log (model_id, accessed_at DESC);

COMMENT ON TABLE public.agence_dmca_access_log IS
  'Log immuable des accès au bucket DMCA. Append-only via RLS (pas d''UPDATE/DELETE).';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Table 2 — agence_consent_log                                          ║
-- ║ RGPD Art. 7 : log des retraits de consentement et leur traitement.    ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.agence_consent_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id        text NOT NULL,
  consent_type    text NOT NULL,
  action          text NOT NULL CHECK (action IN ('withdrawal_requested','content_removed','confirmation_sent')),
  requested_at    timestamptz DEFAULT now(),
  processed_at    timestamptz,
  notes           text
);

CREATE INDEX IF NOT EXISTS idx_consent_log_model
  ON public.agence_consent_log (model_id, requested_at DESC);

COMMENT ON TABLE public.agence_consent_log IS
  'Log RGPD Art. 7 : retraits de consentement et leur traitement. Append-only.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Table 3 — agence_identity_plan_changes                                ║
-- ║ Historique bascules Plan Identité (discovery ↔ shadow).               ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.agence_identity_plan_changes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id        text NOT NULL,
  from_plan       text NOT NULL CHECK (from_plan IN ('discovery','shadow')),
  to_plan         text NOT NULL CHECK (to_plan IN ('discovery','shadow')),
  reason          text,
  requested_by    text,
  approved_by     text,
  requested_at    timestamptz DEFAULT now(),
  approved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_identity_plan_model
  ON public.agence_identity_plan_changes (model_id, requested_at DESC);

COMMENT ON TABLE public.agence_identity_plan_changes IS
  'Historique bascules Plan Identité (discovery ↔ shadow). Append-only — workflow approval admin.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Table 4 — agence_palier_history                                       ║
-- ║ Historique paliers rémunération (P1 → P2 → P3 → P4).                  ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.agence_palier_history (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id                 text NOT NULL,
  from_palier              text NOT NULL,
  to_palier                text NOT NULL,
  revenue_3m_avg           numeric,
  triggered_at             timestamptz DEFAULT now(),
  signed_at                timestamptz,
  contract_amendment_url   text
);

CREATE INDEX IF NOT EXISTS idx_palier_history_model
  ON public.agence_palier_history (model_id, triggered_at DESC);

COMMENT ON TABLE public.agence_palier_history IS
  'Historique paliers rémunération. Append-only — chaque escalade trace l''avenant signé.';


-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║ Table 5 — agence_contracts_versions                                   ║
-- ║ Versioning contrats privés signés (immutable per version).            ║
-- ╚═══════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.agence_contracts_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id            text NOT NULL,
  version             int NOT NULL,
  contract_url        text NOT NULL,
  signed_at           timestamptz,
  amendment_reason    text,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (model_id, version)
);

CREATE INDEX IF NOT EXISTS idx_contracts_model
  ON public.agence_contracts_versions (model_id, version DESC);

COMMENT ON TABLE public.agence_contracts_versions IS
  'Versioning contrats privés signés. UNIQUE (model_id, version) ; append-only.';


-- ═══════════════════════════════════════════════════════════════════════════
-- POLICIES RLS append-only sur les 5 tables ci-dessus
-- Pattern : RLS enabled, INSERT permis selon scope, SELECT pour admin +
-- propriétaire, AUCUNE policy UPDATE/DELETE (bloqué par défaut RLS).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── agence_dmca_access_log ─────────────────────────────────────────────
ALTER TABLE public.agence_dmca_access_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_dmca_access_log' AND policyname='dmca_log_insert') THEN
    CREATE POLICY dmca_log_insert ON public.agence_dmca_access_log FOR INSERT
      WITH CHECK (
        public.has_scope('dmca:read')
        OR public.has_scope('dmca:write')
        OR public.has_scope('*')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_dmca_access_log' AND policyname='dmca_log_read') THEN
    CREATE POLICY dmca_log_read ON public.agence_dmca_access_log FOR SELECT
      USING (public.has_scope('*') OR public.has_scope('dmca:read'));
  END IF;
  -- AUCUNE policy UPDATE/DELETE → table immuable
END $$;

-- ─── agence_consent_log ─────────────────────────────────────────────────
ALTER TABLE public.agence_consent_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_consent_log' AND policyname='consent_log_insert') THEN
    CREATE POLICY consent_log_insert ON public.agence_consent_log FOR INSERT
      WITH CHECK (
        public.has_scope('*')
        OR public.can_see_model_id(model_id)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_consent_log' AND policyname='consent_log_read') THEN
    CREATE POLICY consent_log_read ON public.agence_consent_log FOR SELECT
      USING (
        public.has_scope('*')
        OR public.can_see_model_id(model_id)
      );
  END IF;
  -- AUCUNE policy UPDATE/DELETE → table immuable
END $$;

-- ─── agence_identity_plan_changes ───────────────────────────────────────
ALTER TABLE public.agence_identity_plan_changes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_identity_plan_changes' AND policyname='identity_plan_insert') THEN
    CREATE POLICY identity_plan_insert ON public.agence_identity_plan_changes FOR INSERT
      WITH CHECK (
        public.has_scope('identity_plan:switch')
        OR public.has_scope('*')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_identity_plan_changes' AND policyname='identity_plan_read') THEN
    CREATE POLICY identity_plan_read ON public.agence_identity_plan_changes FOR SELECT
      USING (
        public.has_scope('*')
        OR public.can_view_identity(model_id)
        OR public.can_see_model_id(model_id)
      );
  END IF;
  -- AUCUNE policy UPDATE/DELETE → table immuable
END $$;

-- ─── agence_palier_history ──────────────────────────────────────────────
ALTER TABLE public.agence_palier_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_palier_history' AND policyname='palier_history_insert') THEN
    CREATE POLICY palier_history_insert ON public.agence_palier_history FOR INSERT
      WITH CHECK (
        public.has_scope('palier:escalate')
        OR public.has_scope('*')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_palier_history' AND policyname='palier_history_read') THEN
    CREATE POLICY palier_history_read ON public.agence_palier_history FOR SELECT
      USING (
        public.has_scope('*')
        OR public.can_see_model_id(model_id)
      );
  END IF;
  -- AUCUNE policy UPDATE/DELETE → table immuable
END $$;

-- ─── agence_contracts_versions ──────────────────────────────────────────
ALTER TABLE public.agence_contracts_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_contracts_versions' AND policyname='contracts_versions_insert') THEN
    CREATE POLICY contracts_versions_insert ON public.agence_contracts_versions FOR INSERT
      WITH CHECK (
        public.has_scope('contract:view')
        OR public.has_scope('*')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename='agence_contracts_versions' AND policyname='contracts_versions_read') THEN
    CREATE POLICY contracts_versions_read ON public.agence_contracts_versions FOR SELECT
      USING (public.can_view_contract(model_id));
  END IF;
  -- AUCUNE policy UPDATE/DELETE → versioning strict
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- END 045_log_tables_append_only.sql
-- ═══════════════════════════════════════════════════════════════════════════

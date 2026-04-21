-- ═══════════════════════════════════════════════════════════════════════════
-- 040_agence_releaseform_dossier.sql
-- TARGET: HEAVEN DB
--
-- PURPOSE
--   One release-form dossier per (model × platform). Stores signed URLs to
--   the encrypted bucket holding ID docs, headshot dated with agency
--   username, full body shot, optional faceswap before/after, and the
--   release form PDF. UNIQUE (model_id, platform) keeps the dossier
--   single-source-of-truth per platform onboarding.
--
--   All URL columns hold short-lived (15 min) signed URLs generated against
--   the encrypted Supabase Storage bucket. Plaintext PII never lives here.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agence_releaseform_dossier (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id                 text NOT NULL REFERENCES public.agence_models(model_id) ON DELETE CASCADE,
  platform                 text NOT NULL CHECK (platform IN ('fanvue','onlyfans','mym')),
  release_form_pdf_url     text,
  id_document_recto_url    text,
  id_document_verso_url    text,
  headshot_dated_url       text,
  full_body_url            text,
  faceswap_before_url      text,
  faceswap_after_url       text,
  submitted_at             timestamptz,
  validated_at             timestamptz,
  rejected_at              timestamptz,
  rejection_reason         text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  UNIQUE (model_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_releaseform_status
  ON public.agence_releaseform_dossier (model_id, submitted_at DESC);

COMMENT ON TABLE public.agence_releaseform_dossier IS
  'Release form dossier per (model x platform). All *_url columns are short-lived signed URLs into the encrypted Storage bucket — never raw PII.';

-- ═══════════════════════════════════════════════════════════════════════════
-- END 040_agence_releaseform_dossier.sql
-- ═══════════════════════════════════════════════════════════════════════════

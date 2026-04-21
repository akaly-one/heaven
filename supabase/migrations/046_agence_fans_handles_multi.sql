-- 046 — Agent 4.A — Messagerie fusion contacts multi-canal (B7)
--
-- Adds a JSONB handles column for extensible multi-channel identities,
-- a fingerprint_hash for IP+UA matching, and a merge_history trail.
-- Backfills handles from legacy flat columns (pseudo_web/insta/snap, fanvue_handle).
-- Installs pg_trgm for fuzzy pseudo matching on the auto-merge candidate scan.

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 2. New columns on agence_fans
-- ---------------------------------------------------------------------------
ALTER TABLE agence_fans
  ADD COLUMN IF NOT EXISTS handles jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fingerprint_hash text,
  ADD COLUMN IF NOT EXISTS merge_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Note: merged_into_id already exists (see migration defining agence_fans);
-- we keep the existing column name. The brief's `merged_into` is aliased below.

COMMENT ON COLUMN agence_fans.handles IS
  'Multi-channel handles extensible beyond legacy flat columns. Shape: { web?, insta?, snap?, fanvue?, tiktok?, twitter?, telegram?, ... }';
COMMENT ON COLUMN agence_fans.fingerprint_hash IS
  'SHA-256(IP || "|" || UA) truncated to 32 chars. Short-lived dedupe signal (7-day window enforced in application layer).';
COMMENT ON COLUMN agence_fans.merge_history IS
  'Append-only audit log of merges. Each entry: {at, direction: "in"|"out", peer_id, by, reason}.';

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

-- GIN index on handles for JSONB containment queries (@> operator)
CREATE INDEX IF NOT EXISTS idx_agence_fans_handles
  ON agence_fans USING gin (handles jsonb_path_ops);

-- Fingerprint lookup (partial: only non-null)
CREATE INDEX IF NOT EXISTS idx_agence_fans_fingerprint
  ON agence_fans (fingerprint_hash)
  WHERE fingerprint_hash IS NOT NULL;

-- Trigram GIN on handles serialized text for fuzzy pseudo matching
-- Note: handles::text produces the JSONB text form, which includes keys AND values.
-- Trigram similarity against this text is a coarse filter; the fan-matcher.ts helper
-- refines with per-value similarity before proposing a merge.
CREATE INDEX IF NOT EXISTS idx_agence_fans_handles_trgm
  ON agence_fans USING gin ((handles::text) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 4. Backfill handles from legacy flat columns
-- ---------------------------------------------------------------------------
-- Idempotent: only runs on rows where handles is still empty.
UPDATE agence_fans
SET handles = jsonb_strip_nulls(jsonb_build_object(
  'web',    NULLIF(pseudo_web,    ''),
  'insta',  NULLIF(pseudo_insta,  ''),
  'snap',   NULLIF(pseudo_snap,   ''),
  'fanvue', NULLIF(fanvue_handle, '')
))
WHERE handles = '{}'::jsonb
  AND (
    COALESCE(pseudo_web,    '') <> '' OR
    COALESCE(pseudo_insta,  '') <> '' OR
    COALESCE(pseudo_snap,   '') <> '' OR
    COALESCE(fanvue_handle, '') <> ''
  );

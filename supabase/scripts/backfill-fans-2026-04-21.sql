-- supabase/scripts/backfill-fans-2026-04-21.sql — Agent 4.A (B7 / defect P2-1)
--
-- Purpose : link the 15 legacy agence_clients rows without fan_id to
-- agence_fans identities. 18 clients total pre-run ; 3 already linked.
--
-- Strategy (idempotent, runnable multiple times):
--
--   Step 1 — Link to existing fan by exact pseudo_snap or pseudo_insta.
--   Step 2 — For orphan clients still unlinked, create a new fan row with
--            pseudo_snap/pseudo_insta populated AND handles jsonb populated.
--   Step 3 — Re-run Step 1 to link the newly created fans.
--
-- Safe to re-run : every step uses `WHERE fan_id IS NULL` or ON CONFLICT
-- semantics, and new fan rows use a deterministic lookup (pseudo match)
-- before creation.

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 1 — Link clients to existing fans via pseudo_snap
-- ---------------------------------------------------------------------------
UPDATE agence_clients c
SET fan_id = f.id
FROM agence_fans f
WHERE c.fan_id IS NULL
  AND c.pseudo_snap IS NOT NULL
  AND lower(c.pseudo_snap) = lower(f.pseudo_snap)
  AND f.merged_into_id IS NULL;

-- Step 1b — Link via pseudo_insta
UPDATE agence_clients c
SET fan_id = f.id
FROM agence_fans f
WHERE c.fan_id IS NULL
  AND c.pseudo_insta IS NOT NULL
  AND lower(c.pseudo_insta) = lower(f.pseudo_insta)
  AND f.merged_into_id IS NULL;

-- ---------------------------------------------------------------------------
-- Step 2 — Create fan rows for still-orphan clients
-- One fan per (pseudo_snap, pseudo_insta) unique tuple.
-- Uses INSERT ... ON CONFLICT DO NOTHING on the existing unique constraints
-- (agence_fans_snap_unique, agence_fans_insta_unique) to stay idempotent.
-- ---------------------------------------------------------------------------

-- 2a — Create by pseudo_snap (skip null/empty)
INSERT INTO agence_fans (pseudo_snap, handles, first_seen, last_seen, notes)
SELECT DISTINCT
  c.pseudo_snap,
  jsonb_strip_nulls(jsonb_build_object(
    'snap',  NULLIF(c.pseudo_snap,  ''),
    'insta', NULLIF(c.pseudo_insta, '')
  )),
  COALESCE(c.created_at, now()),
  COALESCE(c.last_active, c.created_at, now()),
  'backfill 2026-04-21 (agence_clients)'
FROM agence_clients c
WHERE c.fan_id IS NULL
  AND c.pseudo_snap IS NOT NULL
  AND c.pseudo_snap <> ''
  AND NOT EXISTS (
    SELECT 1 FROM agence_fans f WHERE lower(f.pseudo_snap) = lower(c.pseudo_snap)
  )
ON CONFLICT (pseudo_snap) DO NOTHING;

-- 2b — Create by pseudo_insta for remaining orphans (no snap OR snap-based fan blocked by conflict)
INSERT INTO agence_fans (pseudo_insta, handles, first_seen, last_seen, notes)
SELECT DISTINCT
  c.pseudo_insta,
  jsonb_strip_nulls(jsonb_build_object(
    'insta', NULLIF(c.pseudo_insta, '')
  )),
  COALESCE(c.created_at, now()),
  COALESCE(c.last_active, c.created_at, now()),
  'backfill 2026-04-21 (agence_clients, insta-only)'
FROM agence_clients c
WHERE c.fan_id IS NULL
  AND c.pseudo_snap IS NULL
  AND c.pseudo_insta IS NOT NULL
  AND c.pseudo_insta <> ''
  AND NOT EXISTS (
    SELECT 1 FROM agence_fans f WHERE lower(f.pseudo_insta) = lower(c.pseudo_insta)
  )
ON CONFLICT (pseudo_insta) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 3 — Re-link clients to the newly-created fans
-- ---------------------------------------------------------------------------
UPDATE agence_clients c
SET fan_id = f.id
FROM agence_fans f
WHERE c.fan_id IS NULL
  AND c.pseudo_snap IS NOT NULL
  AND lower(c.pseudo_snap) = lower(f.pseudo_snap)
  AND f.merged_into_id IS NULL;

UPDATE agence_clients c
SET fan_id = f.id
FROM agence_fans f
WHERE c.fan_id IS NULL
  AND c.pseudo_insta IS NOT NULL
  AND lower(c.pseudo_insta) = lower(f.pseudo_insta)
  AND f.merged_into_id IS NULL;

-- ---------------------------------------------------------------------------
-- Step 4 — Cross-fill : if a client has BOTH pseudo_snap and pseudo_insta and
-- the linked fan is missing the other handle, fill it in.
-- ---------------------------------------------------------------------------
UPDATE agence_fans f
SET
  pseudo_insta = c.pseudo_insta,
  handles = jsonb_set(coalesce(f.handles, '{}'::jsonb), '{insta}', to_jsonb(c.pseudo_insta), true)
FROM agence_clients c
WHERE c.fan_id = f.id
  AND c.pseudo_insta IS NOT NULL
  AND c.pseudo_insta <> ''
  AND (f.pseudo_insta IS NULL OR f.pseudo_insta = '');

UPDATE agence_fans f
SET
  pseudo_snap = c.pseudo_snap,
  handles = jsonb_set(coalesce(f.handles, '{}'::jsonb), '{snap}', to_jsonb(c.pseudo_snap), true)
FROM agence_clients c
WHERE c.fan_id = f.id
  AND c.pseudo_snap IS NOT NULL
  AND c.pseudo_snap <> ''
  AND (f.pseudo_snap IS NULL OR f.pseudo_snap = '');

-- ---------------------------------------------------------------------------
-- Verification queries (run manually after commit)
-- ---------------------------------------------------------------------------
-- SELECT COUNT(*) FILTER (WHERE fan_id IS NULL) AS still_orphan,
--        COUNT(*) FILTER (WHERE fan_id IS NOT NULL) AS linked,
--        COUNT(*) AS total
-- FROM agence_clients;
--
-- SELECT id, pseudo_snap, pseudo_insta, handles, notes FROM agence_fans
-- WHERE notes LIKE 'backfill 2026-04-21%' ORDER BY created_at DESC;

COMMIT;

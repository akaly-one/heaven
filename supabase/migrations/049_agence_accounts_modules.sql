-- 049_agence_accounts_modules.sql
-- Agent 10.A Phase 10 Heaven: Modules activables per-compte
-- Ajoute colonne jsonb 'activable_modules' pour tracker l'etat d'activation
-- des 5 modules par compte : agent_dm, finance, ops, strategie, dmca.
--
-- Structure par module :
--   { "enabled": bool, "activated_at": timestamptz|null, "activated_by": text|null, "config_override": {} }
--
-- Defaults :
--   - root + heaven + modele2026 (yumi) : 5 modules ON
--   - paloma + ruby : strategie ON uniquement

-- 1. Colonne jsonb modules activables
ALTER TABLE agence_accounts
  ADD COLUMN IF NOT EXISTS activable_modules jsonb DEFAULT '{}'::jsonb;

-- 2. Defaults pour comptes admin (root + heaven + yumi/modele2026) : 5 modules ON
UPDATE agence_accounts SET activable_modules = jsonb_build_object(
  'agent_dm', jsonb_build_object('enabled', true, 'activated_at', now(), 'activated_by', 'system'),
  'finance', jsonb_build_object('enabled', true, 'activated_at', now(), 'activated_by', 'system'),
  'ops', jsonb_build_object('enabled', true, 'activated_at', now(), 'activated_by', 'system'),
  'strategie', jsonb_build_object('enabled', true, 'activated_at', now(), 'activated_by', 'system'),
  'dmca', jsonb_build_object('enabled', true, 'activated_at', now(), 'activated_by', 'system')
) WHERE code IN ('root', 'heaven', 'modele2026');

-- 3. Defaults pour modeles (paloma + ruby) : strategie ON, autres OFF
UPDATE agence_accounts SET activable_modules = jsonb_build_object(
  'agent_dm', jsonb_build_object('enabled', false),
  'finance', jsonb_build_object('enabled', false),
  'ops', jsonb_build_object('enabled', false),
  'strategie', jsonb_build_object('enabled', true, 'activated_at', now(), 'activated_by', 'system'),
  'dmca', jsonb_build_object('enabled', false)
) WHERE code IN ('paloma', 'ruby');

-- 4. Index GIN pour lookup modules
CREATE INDEX IF NOT EXISTS idx_agence_accounts_modules ON agence_accounts USING gin (activable_modules);

-- 5. Verification : 5 comptes actifs avec activable_modules non-null
DO $$
DECLARE
  configured_count int;
BEGIN
  SELECT count(*) INTO configured_count FROM agence_accounts
    WHERE active = true
      AND code IN ('root', 'heaven', 'modele2026', 'paloma', 'ruby')
      AND activable_modules IS NOT NULL
      AND activable_modules != '{}'::jsonb;
  IF configured_count < 5 THEN
    RAISE EXCEPTION 'Migration 049 invariant: comptes avec activable_modules configures = %, attendu >= 5', configured_count;
  END IF;
END $$;

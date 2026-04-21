-- 034_realign_agence_accounts.sql
-- Align agence_accounts with post-033 model_ids + add login_aliases + set yumi root + code modele2026
ALTER TABLE agence_accounts
  ADD COLUMN IF NOT EXISTS login_aliases TEXT[] DEFAULT '{}';

UPDATE agence_accounts SET model_id = 'm1' WHERE model_slug = 'yumi';
UPDATE agence_accounts SET model_id = 'm2' WHERE model_slug = 'paloma';

UPDATE agence_accounts SET login_aliases = ARRAY['yumi','yumiiiclub']::TEXT[] WHERE model_slug = 'yumi';
UPDATE agence_accounts SET login_aliases = ARRAY['paloma']::TEXT[] WHERE model_slug = 'paloma';
UPDATE agence_accounts SET login_aliases = ARRAY['ruby']::TEXT[] WHERE model_slug = 'ruby';
UPDATE agence_accounts SET login_aliases = ARRAY['admin','nb','root']::TEXT[] WHERE role = 'root';

-- Yumi = agency admin (root tier, owns her own cockpit + supervises paloma/ruby)
UPDATE agence_accounts SET role = 'root' WHERE model_slug = 'yumi';

-- New default code for yumi
UPDATE agence_accounts SET code = 'modele2026', last_login = NULL WHERE model_slug = 'yumi';

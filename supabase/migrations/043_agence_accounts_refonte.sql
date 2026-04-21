-- 043_agence_accounts_refonte.sql
-- Agent 1.B Phase 1 Heaven: Refonte agence_accounts pour scopes + model_id
-- - Garde role='root' pour yumi/heaven/root (backward compat existing code)
-- - Yumi = admin principal (root tier, model_id=m1, scopes etendus)
-- - Paloma/Ruby = model role + scopes limites
-- - Ajoute colonne 'scopes' jsonb pour scopes granulaires JWT
-- - Desactive comptes legacy hors scope

-- 1. Ajout colonne scopes (jsonb)
ALTER TABLE agence_accounts
  ADD COLUMN IF NOT EXISTS scopes jsonb DEFAULT '[]'::jsonb;

-- 2. Reactiver Ruby (model m3) - elle est marquee active=false dans 011/012 mais doit exister pour skeleton uniforme
UPDATE agence_accounts SET active = true WHERE code = 'ruby' AND model_id = 'm3';

-- 3. Desactiver tout compte hors scope (root|yumi|paloma|ruby).
-- Garde 'gret1' inactif (deja inactif). Garde 'heaven' actif (root dev secondaire).
-- Garde 'modele2026' (= yumi). Aucun compte 'agence' standalone n'existe -> rien a fusionner.
UPDATE agence_accounts SET active = false
WHERE code NOT IN ('root', 'heaven', 'modele2026', 'paloma', 'ruby')
  AND role NOT IN ('root');

-- 4. Yumi: ne pas changer role='root' (compat code), juste enrichir display_name + scopes
UPDATE agence_accounts SET
  display_name = 'Yumi (Admin Agence + Modele IA)',
  scopes = '["dmca:read","dmca:write","contract:view","palier:escalate","identity:view_legal","manage_entities","manage_codes","manage_finances","view_all_profiles"]'::jsonb
WHERE code = 'modele2026' AND model_slug = 'yumi';

-- 5. Paloma (m2): scopes limites
UPDATE agence_accounts SET
  display_name = 'Paloma',
  role = 'model',
  scopes = '["contract:view","caming:operate","view_revenue_self","post_wall","send_messages","manage_packs"]'::jsonb
WHERE code = 'paloma' AND model_id = 'm2';

-- 6. Ruby (m3): scopes limites
UPDATE agence_accounts SET
  display_name = 'Ruby',
  role = 'model',
  scopes = '["contract:view","caming:operate","view_revenue_self","post_wall","send_messages","manage_packs"]'::jsonb
WHERE code = 'ruby' AND model_id = 'm3';

-- 7. Root dev (root + heaven): tous scopes
UPDATE agence_accounts SET
  scopes = '["*"]'::jsonb
WHERE code IN ('root', 'heaven') AND role = 'root';

-- 8. Index pour lookup rapide par code (deja unique probablement, mais idempotent)
CREATE INDEX IF NOT EXISTS idx_agence_accounts_code_active ON agence_accounts(code) WHERE active = true;

-- 9. Verification finale (assertion-style: RAISE si etat invalide)
DO $$
DECLARE
  yumi_count int;
  paloma_count int;
  ruby_count int;
  root_count int;
BEGIN
  SELECT count(*) INTO yumi_count FROM agence_accounts
    WHERE active = true AND model_slug = 'yumi' AND model_id = 'm1';
  SELECT count(*) INTO paloma_count FROM agence_accounts
    WHERE active = true AND code = 'paloma' AND model_id = 'm2';
  SELECT count(*) INTO ruby_count FROM agence_accounts
    WHERE active = true AND code = 'ruby' AND model_id = 'm3';
  SELECT count(*) INTO root_count FROM agence_accounts
    WHERE active = true AND role = 'root' AND model_id IS NULL;

  IF yumi_count = 0 THEN RAISE EXCEPTION 'Migration 043 invariant: yumi (m1) introuvable'; END IF;
  IF paloma_count = 0 THEN RAISE EXCEPTION 'Migration 043 invariant: paloma (m2) introuvable'; END IF;
  IF ruby_count = 0 THEN RAISE EXCEPTION 'Migration 043 invariant: ruby (m3) introuvable'; END IF;
  IF root_count = 0 THEN RAISE EXCEPTION 'Migration 043 invariant: aucun compte root dev actif'; END IF;
END $$;

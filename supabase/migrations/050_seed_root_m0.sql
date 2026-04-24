-- ══════════════════════════════════════════════
-- 050_seed_root_m0.sql
-- ROOT (m0) = CP maître / template spécimen
--
-- Directive NB 2026-04-24 : ROOT doit être un CP entier en DB,
-- comme Yumi (m1), Paloma (m2), Ruby (m3). M0 = CP maître fictif
-- qui héberge la vue spécimen/dev du skeleton (pas de data réelle).
--
-- Tables principales qui doivent référencer m0 :
--   - agence_models : row ROOT avec display_name, bio, handle
--   - agence_accounts : compte admin root lié à m0
--
-- RLS : m0 est lisible par tous les root/yumi admins, écriture root only.
-- ══════════════════════════════════════════════

-- 1. Seed ROOT dans agence_models
INSERT INTO agence_models (slug, display_name, display, bio, status, online)
VALUES (
  'root',
  'ROOT',
  'ROOT',
  'CP maître (m0) — vue spécimen / template des modules. Cockpit de développement qui permet de visualiser l''architecture complète sans charger de données réelles. Sélectionne un autre CP via le selector pour basculer sur les données live.',
  'Dev mode',
  false
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  status = EXCLUDED.status;

-- 2. Associer model_id = 'm0' (si colonne existe, sinon migration plus tôt)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agence_models' AND column_name = 'model_id'
  ) THEN
    UPDATE agence_models SET model_id = 'm0' WHERE slug = 'root' AND (model_id IS NULL OR model_id != 'm0');
  END IF;
END $$;

-- 3. Seed account root si absent (role=root, model_slug=null pour root pur)
--    Le model_slug reste null pour distinguer root pur vs root-fusion.
INSERT INTO agence_accounts (code, role, model_slug, model_id, display_name, active)
VALUES ('root', 'root', NULL, NULL, 'Root (NB)', true)
ON CONFLICT (code) DO NOTHING;

-- 4. Ordre display : m0 toujours en premier (pour /api/models sort)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agence_models' AND column_name = 'display_order'
  ) THEN
    UPDATE agence_models SET display_order = 0 WHERE slug = 'root';
    UPDATE agence_models SET display_order = 1 WHERE slug = 'yumi' AND display_order IS NULL;
    UPDATE agence_models SET display_order = 2 WHERE slug = 'paloma' AND display_order IS NULL;
    UPDATE agence_models SET display_order = 3 WHERE slug = 'ruby' AND display_order IS NULL;
  END IF;
END $$;

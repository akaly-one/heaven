-- 050 v2 : ROOT (m0) — colonnes réelles de agence_models (pas 'online' ni 'display_order')
INSERT INTO agence_models (slug, display_name, display, bio, status, is_active, model_id)
VALUES (
  'root',
  'ROOT',
  'ROOT',
  'CP maître (m0) — vue spécimen / template des modules. Cockpit de développement qui permet de visualiser l''architecture complète sans charger de données réelles.',
  'Dev mode',
  false,
  'm0'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  status = EXCLUDED.status,
  model_id = 'm0';

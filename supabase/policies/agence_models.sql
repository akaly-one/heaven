ALTER TABLE agence_models ENABLE ROW LEVEL SECURITY;

-- Admin master : full access
CREATE POLICY models_admin_full ON agence_models
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Modèle : voit uniquement sa propre entrée
CREATE POLICY models_self_read ON agence_models
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'model'
    AND model_id = auth.jwt() ->> 'sub'
  );

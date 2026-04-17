ALTER TABLE agence_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY codes_admin_full ON agence_codes
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY codes_model_scoped ON agence_codes
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'model'
    AND model = auth.jwt() ->> 'sub'
  );

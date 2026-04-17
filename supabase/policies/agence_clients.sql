ALTER TABLE agence_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_admin_full ON agence_clients
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY clients_model_scoped ON agence_clients
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'model'
    AND model = auth.jwt() ->> 'sub'
  );

-- Public : INSERT pour création via gate identité
CREATE POLICY clients_public_insert ON agence_clients
  FOR INSERT WITH CHECK (true);

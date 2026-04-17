ALTER TABLE agence_wall_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY wall_public_read ON agence_wall_posts
  FOR SELECT USING (true);

CREATE POLICY wall_public_insert ON agence_wall_posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY wall_admin_delete ON agence_wall_posts
  FOR DELETE USING (auth.jwt() ->> 'role' IN ('admin', 'model'));

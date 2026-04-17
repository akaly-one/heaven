ALTER TABLE agence_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_admin_full ON agence_posts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY posts_model_own ON agence_posts
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'model'
    AND model = auth.jwt() ->> 'sub'
  );

-- Public : SELECT des posts non-expirés (stories TTL 24h)
CREATE POLICY posts_public_read ON agence_posts
  FOR SELECT USING (
    post_type != 'story'
    OR created_at >= NOW() - INTERVAL '24 hours'
  );

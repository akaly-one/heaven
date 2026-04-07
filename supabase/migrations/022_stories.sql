-- 022: Stories — model posts as story or feed
ALTER TABLE agence_posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(10) DEFAULT 'feed';
ALTER TABLE agence_posts ADD COLUMN IF NOT EXISTS story_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_posts_type ON agence_posts(post_type);
COMMENT ON COLUMN agence_posts.post_type IS 'feed | story';
COMMENT ON COLUMN agence_posts.story_expires_at IS 'Optional expiry for stories (NULL = permanent highlight)';

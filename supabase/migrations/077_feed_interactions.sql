-- ═══════════════════════════════════════════════════════════════════════════
-- 077_feed_interactions.sql
-- BRIEF-17 — likes + commentaires sur feed items (IG, wall, manual)
-- Ref : plans/PMO/briefs/BRIEF-2026-04-25-17-header-admin-feed-ig-likes.md
-- ═══════════════════════════════════════════════════════════════════════════
-- Tables :
--   - agence_feed_likes    : 1 like par (feed_item_id, client_id) (UNIQUE)
--   - agence_feed_comments : commentaires soft-deletables (1-500 chars)
-- Triggers : auto-incrément/décrément agence_feed_items.like_count/comment_count
-- RLS : open all (service_role bypass — pattern existant repo)
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================================
-- Table agence_feed_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS agence_feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID NOT NULL,
  client_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(feed_item_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_likes_feed_item
  ON agence_feed_likes(feed_item_id);
CREATE INDEX IF NOT EXISTS idx_feed_likes_client
  ON agence_feed_likes(client_id, created_at DESC);

-- ============================================================
-- Table agence_feed_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS agence_feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID NOT NULL,
  client_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feed_comments_feed_item
  ON agence_feed_comments(feed_item_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feed_comments_client
  ON agence_feed_comments(client_id, created_at DESC);

-- ============================================================
-- Trigger : sync agence_feed_items.like_count
-- ============================================================
CREATE OR REPLACE FUNCTION update_feed_item_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE agence_feed_items
       SET like_count = COALESCE(like_count, 0) + 1
     WHERE id = NEW.feed_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE agence_feed_items
       SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1)
     WHERE id = OLD.feed_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_likes_count ON agence_feed_likes;
CREATE TRIGGER trg_feed_likes_count
  AFTER INSERT OR DELETE ON agence_feed_likes
  FOR EACH ROW EXECUTE FUNCTION update_feed_item_like_count();

-- ============================================================
-- Trigger : sync agence_feed_items.comment_count (incrément à INSERT actif,
--           décrément à soft-delete via UPDATE deleted_at)
-- ============================================================
CREATE OR REPLACE FUNCTION update_feed_item_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE agence_feed_items
       SET comment_count = COALESCE(comment_count, 0) + 1
     WHERE id = NEW.feed_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE'
        AND OLD.deleted_at IS NULL
        AND NEW.deleted_at IS NOT NULL THEN
    -- soft delete : décrémente
    UPDATE agence_feed_items
       SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1)
     WHERE id = NEW.feed_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE'
        AND OLD.deleted_at IS NOT NULL
        AND NEW.deleted_at IS NULL THEN
    -- ré-activation (cas rare) : incrémente
    UPDATE agence_feed_items
       SET comment_count = COALESCE(comment_count, 0) + 1
     WHERE id = NEW.feed_item_id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_comments_count ON agence_feed_comments;
CREATE TRIGGER trg_feed_comments_count
  AFTER INSERT OR UPDATE ON agence_feed_comments
  FOR EACH ROW EXECUTE FUNCTION update_feed_item_comment_count();

-- ============================================================
-- RLS (pattern existant repo : open all, service_role bypass côté API)
-- ============================================================
ALTER TABLE agence_feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agence_feed_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agence_feed_likes' AND policyname = 'agence_feed_likes_all'
  ) THEN
    CREATE POLICY agence_feed_likes_all ON agence_feed_likes
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agence_feed_comments' AND policyname = 'agence_feed_comments_all'
  ) THEN
    CREATE POLICY agence_feed_comments_all ON agence_feed_comments
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE agence_feed_likes IS
  'BRIEF-17 : likes sur feed items (IG/wall/manual). UNIQUE(feed_item_id,client_id) garantit 1 like/client/post.';
COMMENT ON TABLE agence_feed_comments IS
  'BRIEF-17 : commentaires sur feed items. Soft-delete via deleted_at. Limite 1-500 caractères (CHECK).';

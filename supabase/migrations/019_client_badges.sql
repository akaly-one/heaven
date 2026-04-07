-- 019: Client profile badges & engagement tracking
-- Extends agence_clients with profile fields
-- Extends agence_fan_lifecycle with engagement counters

ALTER TABLE agence_clients
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS badge_grade VARCHAR(20) DEFAULT 'nouveau';

ALTER TABLE agence_fan_lifecycle
  ADD COLUMN IF NOT EXISTS visit_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wall_posts_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fan_lifecycle_client ON agence_fan_lifecycle(client_id);
CREATE INDEX IF NOT EXISTS idx_fan_lifecycle_model_client ON agence_fan_lifecycle(model_slug, client_id);
CREATE INDEX IF NOT EXISTS idx_clients_badge ON agence_clients(badge_grade);

COMMENT ON COLUMN agence_clients.badge_grade IS 'nouveau | regulier | fan | vip | top_fan';

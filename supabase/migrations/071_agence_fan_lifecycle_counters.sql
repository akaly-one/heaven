-- 071 : Compléter agence_fan_lifecycle avec counters manquants (migration 019 non appliquée historiquement)
-- BRIEF-15 régression R2 : /api/clients/visit 500 silent "column orders_completed does not exist"

ALTER TABLE agence_fan_lifecycle
  ADD COLUMN IF NOT EXISTS visit_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wall_posts_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agence_fan_lifecycle_last_visit ON agence_fan_lifecycle(last_visit_at) WHERE last_visit_at IS NOT NULL;

COMMENT ON COLUMN agence_fan_lifecycle.visit_count IS 'BRIEF-15 : incrémenté par /api/clients/visit à chaque visite fan';

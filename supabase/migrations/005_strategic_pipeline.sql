-- ============================================================
-- 005: Strategic Pipeline for Heaven models
-- ============================================================

-- Platform accounts linked to models
CREATE TABLE IF NOT EXISTS agence_platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug VARCHAR NOT NULL,
  platform VARCHAR NOT NULL, -- onlyfans, fanvue, instagram, tiktok, twitter, snapchat, youtube
  handle VARCHAR NOT NULL,
  profile_url TEXT,
  status VARCHAR DEFAULT 'active', -- active, paused, suspended
  subscribers_count INT DEFAULT 0,
  monthly_revenue DECIMAL(10,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 25.00,
  notes TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content pipeline (content production -> publication -> performance)
CREATE TABLE IF NOT EXISTS agence_content_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  content_type VARCHAR NOT NULL, -- photo_set, video, story, reel, live, custom
  platforms JSONB DEFAULT '[]', -- ["onlyfans", "fanvue", "instagram"]
  stage VARCHAR DEFAULT 'idea', -- idea, planned, shooting, editing, ready, published, archived
  scheduled_date DATE,
  published_date DATE,
  tier VARCHAR, -- free, basic, premium, ppv
  price DECIMAL(10,2),
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fan lifecycle tracking
CREATE TABLE IF NOT EXISTS agence_fan_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES agence_clients(id) ON DELETE CASCADE,
  model_slug VARCHAR NOT NULL,
  stage VARCHAR DEFAULT 'new', -- new, engaged, loyal, vip, churned, recovered
  source_platform VARCHAR, -- onlyfans, fanvue, instagram, direct
  first_interaction TIMESTAMPTZ DEFAULT now(),
  last_interaction TIMESTAMPTZ DEFAULT now(),
  total_spent DECIMAL(10,2) DEFAULT 0,
  messages_count INT DEFAULT 0,
  tips_total DECIMAL(10,2) DEFAULT 0,
  ppv_purchased INT DEFAULT 0,
  churn_risk VARCHAR DEFAULT 'low', -- low, medium, high
  tags JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Strategic goals per model
CREATE TABLE IF NOT EXISTS agence_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  category VARCHAR NOT NULL, -- revenue, subscribers, content, engagement, platform
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR DEFAULT 'EUR', -- EUR, count, percent
  deadline DATE,
  status VARCHAR DEFAULT 'active', -- active, completed, failed, paused
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_accounts_model ON agence_platform_accounts(model_slug);
CREATE INDEX IF NOT EXISTS idx_content_pipeline_model ON agence_content_pipeline(model_slug);
CREATE INDEX IF NOT EXISTS idx_content_pipeline_stage ON agence_content_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_fan_lifecycle_model ON agence_fan_lifecycle(model_slug);
CREATE INDEX IF NOT EXISTS idx_fan_lifecycle_stage ON agence_fan_lifecycle(stage);
CREATE INDEX IF NOT EXISTS idx_goals_model ON agence_goals(model_slug);

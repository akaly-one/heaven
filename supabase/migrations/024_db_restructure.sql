-- ═══════════════════════════════════════════════════════════
-- 024_db_restructure.sql
-- TARGET: HEAVEN DB (tbvojfjfgmjiwitiudbn)
--
-- Comprehensive restructure: new tables, views, indexes,
-- triggers, RLS. Safe to re-run (IF NOT EXISTS / OR REPLACE).
-- ═══════════════════════════════════════════════════════════


-- ═══════════════════════════════════════
-- PART 1: NEW TABLES
-- ═══════════════════════════════════════

-- CMS Pages (migrated from localStorage to DB)
CREATE TABLE IF NOT EXISTS agence_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'draft', -- draft, published, private
  content JSONB DEFAULT '{}',
  meta JSONB DEFAULT '{}', -- SEO, og:image, description
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_model_slug ON agence_pages(model, slug);

-- CMS Collaborators (migrated from localStorage to DB)
CREATE TABLE IF NOT EXISTS agence_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'editor', -- editor, photographer, manager, stylist
  email VARCHAR,
  phone VARCHAR,
  avatar_url VARCHAR,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_collaborators_model ON agence_collaborators(model);

-- Revenue Log (source of truth for finances)
CREATE TABLE IF NOT EXISTS agence_revenue_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model VARCHAR NOT NULL,
  payment_id UUID REFERENCES agence_pending_payments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES agence_clients(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  commission_rate DECIMAL(4,2) DEFAULT 0.25, -- 25% default
  commission_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  payment_method VARCHAR, -- paypal, revolut, stripe, manual
  tier VARCHAR,
  pack_name VARCHAR,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_revenue_model ON agence_revenue_log(model);
CREATE INDEX IF NOT EXISTS idx_revenue_date ON agence_revenue_log(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_payment ON agence_revenue_log(payment_id);


-- ═══════════════════════════════════════
-- PART 2: MODEL REGISTRY VIEW (updated)
-- ═══════════════════════════════════════

DROP VIEW IF EXISTS heaven_model_registry;
CREATE VIEW heaven_model_registry AS
SELECT
  m.id,
  m.slug,
  m.model_id,
  m.model_number,
  COALESCE(m.display_name, m.display, m.slug) AS display_name,
  m.avatar,
  m.status,
  m.is_active,
  m.status_text,
  m.total_revenue,
  m.total_transactions,
  m.activated_at,
  m.activated_by,
  m.config,
  (SELECT COUNT(*) FROM agence_clients c WHERE c.model = m.slug) AS client_count,
  (SELECT COUNT(*) FROM agence_codes c WHERE c.model = m.slug AND c.active = true) AS active_codes,
  (SELECT COUNT(*) FROM agence_posts p WHERE p.model = m.slug) AS post_count,
  (SELECT COUNT(*) FROM agence_uploads u WHERE u.model = m.slug) AS upload_count,
  (SELECT COUNT(*) FROM agence_messages msg WHERE msg.model = m.slug) AS messages_count,
  (SELECT COUNT(*) FROM agence_content_pipeline cp WHERE cp.model_slug = m.slug) AS pipeline_items_count,
  (SELECT COUNT(*) FROM agence_platform_accounts pa WHERE pa.model_slug = m.slug AND pa.status = 'active') AS platforms_count,
  (SELECT COALESCE(SUM(r.amount), 0) FROM agence_revenue_log r WHERE r.model = m.slug) AS total_revenue_verified
FROM agence_models m
ORDER BY m.model_number;


-- ═══════════════════════════════════════
-- PART 3: COMPOSITE INDEXES (performance)
-- ═══════════════════════════════════════

-- Payment queries (finances page)
CREATE INDEX IF NOT EXISTS idx_pending_payments_model_status ON agence_pending_payments(model, status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_created ON agence_pending_payments(created_at);

-- Client queries (common filters)
CREATE INDEX IF NOT EXISTS idx_clients_model_active ON agence_clients(model, last_active);
CREATE INDEX IF NOT EXISTS idx_clients_tier ON agence_clients(model, tier);

-- Posts queries (feed + stories)
CREATE INDEX IF NOT EXISTS idx_posts_model_type ON agence_posts(model, post_type);
CREATE INDEX IF NOT EXISTS idx_posts_model_tier ON agence_posts(model, tier_required);

-- Messages (polling performance)
CREATE INDEX IF NOT EXISTS idx_messages_model_client ON agence_messages(model, client_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON agence_messages(created_at);

-- Wall posts (order detection)
CREATE INDEX IF NOT EXISTS idx_wall_model_pseudo ON agence_wall_posts(model, pseudo);


-- ═══════════════════════════════════════
-- PART 4: TRIGGER — auto-update revenue
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION update_model_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Update model totals
    UPDATE agence_models
    SET total_revenue = COALESCE(total_revenue, 0) + NEW.amount,
        total_transactions = COALESCE(total_transactions, 0) + 1
    WHERE slug = NEW.model;

    -- Insert into revenue log
    INSERT INTO agence_revenue_log (
      model, payment_id, client_id, amount, currency,
      commission_rate, commission_amount, net_amount,
      payment_method, tier, pack_name
    )
    VALUES (
      NEW.model, NEW.id, NEW.client_id, NEW.amount, NEW.currency,
      0.25, NEW.amount * 0.25, NEW.amount * 0.75,
      NEW.payment_method, NEW.tier, NEW.pack_name
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_completed ON agence_pending_payments;
CREATE TRIGGER trg_payment_completed
  AFTER INSERT OR UPDATE ON agence_pending_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_model_revenue();


-- ═══════════════════════════════════════
-- PART 5: RLS on new tables
-- ═══════════════════════════════════════

ALTER TABLE agence_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agence_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE agence_revenue_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_pages' AND policyname = 'agence_pages_all') THEN
    CREATE POLICY agence_pages_all ON agence_pages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_collaborators' AND policyname = 'agence_collaborators_all') THEN
    CREATE POLICY agence_collaborators_all ON agence_collaborators FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agence_revenue_log' AND policyname = 'agence_revenue_log_all') THEN
    CREATE POLICY agence_revenue_log_all ON agence_revenue_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ═══════════════════════════════════════
-- PART 6: COMMENTS
-- ═══════════════════════════════════════

COMMENT ON TABLE agence_pages IS 'CMS pages per model (migrated from localStorage)';
COMMENT ON TABLE agence_collaborators IS 'Team members per model (photographers, editors, etc.)';
COMMENT ON TABLE agence_revenue_log IS 'Source of truth for all revenue — auto-populated by trigger on payment completion';
COMMENT ON VIEW heaven_model_registry IS 'Aggregated model stats for HQ dashboard and Dev Center';
COMMENT ON FUNCTION update_model_revenue IS 'Auto-updates model revenue + creates revenue log entry on payment completion';

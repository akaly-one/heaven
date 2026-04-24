-- 052 : Catalogue des providers IA disponibles (Groq/Grok/Haiku/Mistral)
-- Stack recommandée post-research 2026-04-24 (doc 05-SCALING.md)

CREATE TABLE IF NOT EXISTS ai_providers (
  id           TEXT PRIMARY KEY,           -- 'groq-llama-3.3-70b', 'grok-4.1-fast', etc.
  display_name TEXT NOT NULL,
  endpoint     TEXT NOT NULL,              -- 'openrouter://...' ou URL directe
  cost_in      NUMERIC(10,6) NOT NULL,     -- USD per 1M tokens in
  cost_out     NUMERIC(10,6) NOT NULL,
  max_tokens   INT DEFAULT 256,
  temperature  NUMERIC(3,2) DEFAULT 0.8,
  nsfw_ok      BOOLEAN DEFAULT FALSE,
  priority     INT DEFAULT 100,            -- fallback order (lower first)
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_providers(active, priority);

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_providers' AND policyname = 'ai_providers_read') THEN
    CREATE POLICY ai_providers_read ON ai_providers FOR SELECT USING (true);
  END IF;
END $$;

-- Seed stack V1 (doc ADR-013)
INSERT INTO ai_providers (id, display_name, endpoint, cost_in, cost_out, max_tokens, temperature, nsfw_ok, priority, active) VALUES
  ('groq-llama-3.3-70b', 'Groq Llama 3.3 70B', 'openrouter://meta-llama/llama-3.3-70b-instruct', 0.59, 0.99, 256, 0.80, false, 10, true),
  ('grok-4.1-fast',      'xAI Grok 4.1 Fast',  'openrouter://x-ai/grok-4-1-fast',                 0.20, 0.50, 256, 0.85, true,  20, true),
  ('claude-haiku-4.5',   'Claude Haiku 4.5',   'openrouter://anthropic/claude-haiku-4-5-20251001', 1.00, 5.00, 512, 0.70, false, 30, true),
  ('mistral-large-3',    'Mistral Large 3',    'openrouter://mistralai/mistral-large-2-2512',      2.00, 6.00, 300, 0.75, false, 40, true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  endpoint = EXCLUDED.endpoint,
  cost_in = EXCLUDED.cost_in,
  cost_out = EXCLUDED.cost_out;

-- 054 v2 : Logs IA (sans index DATE_TRUNC non-immutable)

CREATE TABLE IF NOT EXISTS ai_runs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id      TEXT,
  conversation_source  TEXT CHECK (conversation_source IN ('instagram','web')),
  model_slug           TEXT NOT NULL,
  provider_id          TEXT REFERENCES ai_providers(id),
  persona_version      INT,
  input_message        TEXT,
  output_message       TEXT,
  intent_classified    TEXT,
  tokens_in            INT,
  tokens_out           INT,
  cost_usd             NUMERIC(10,6),
  latency_ms           INT,
  safety_flags         JSONB DEFAULT '[]'::jsonb,
  safety_blocked       BOOLEAN DEFAULT FALSE,
  feedback_thumbs      SMALLINT,
  feedback_correction  TEXT,
  error_message        TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_conv ON ai_runs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_runs_model_time ON ai_runs(model_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_runs_blocked ON ai_runs(model_slug) WHERE safety_blocked = TRUE;

ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_runs' AND policyname = 'ai_runs_all') THEN
    CREATE POLICY ai_runs_all ON ai_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'instagram_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'instagram_messages' AND column_name = 'ai_run_id'
  ) THEN
    ALTER TABLE instagram_messages ADD COLUMN ai_run_id UUID REFERENCES ai_runs(id);
  END IF;
END $$;

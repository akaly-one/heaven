-- 055 : mode de fonctionnement agent IA par modèle — NB 2026-04-24
-- auto      : agent répond tout seul aux inbounds (par défaut)
-- user      : agent désactivé, humain répond manuellement
-- shadow    : agent génère une proposition en DB (ai_runs) mais n'envoie jamais
-- learning  : agent répond ET log pour feedback loop futur (dataset fine-tune)

ALTER TABLE agent_personas
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'auto';

ALTER TABLE agent_personas
  DROP CONSTRAINT IF EXISTS agent_personas_mode_check;

ALTER TABLE agent_personas
  ADD CONSTRAINT agent_personas_mode_check
  CHECK (mode IN ('auto', 'user', 'shadow', 'learning'));

COMMENT ON COLUMN agent_personas.mode IS
  'Mode agent IA : auto (répond seul), user (humain only), shadow (propose sans envoyer), learning (répond + capture feedback)';

-- Flag sur ai_runs pour distinguer les runs "shadow" (pas envoyés) et "learning"
ALTER TABLE ai_runs
  ADD COLUMN IF NOT EXISTS mode_at_run TEXT;

ALTER TABLE ai_runs
  ADD COLUMN IF NOT EXISTS sent BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN ai_runs.mode_at_run IS 'Mode en vigueur au moment du run (snapshot)';
COMMENT ON COLUMN ai_runs.sent IS 'false = draft shadow, true = envoyé effectivement au fan';

-- Table pour capturer les corrections humaines en mode learning
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_run_id UUID REFERENCES ai_runs(id) ON DELETE CASCADE,
  model_slug TEXT NOT NULL,
  original_output TEXT NOT NULL,
  human_corrected TEXT NOT NULL,
  conversation_source TEXT,
  corrected_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_feedback_model_slug_idx ON ai_feedback(model_slug, created_at DESC);

COMMENT ON TABLE ai_feedback IS
  'Historique des corrections humaines aux réponses IA — dataset pour fine-tuning futur (mode learning).';

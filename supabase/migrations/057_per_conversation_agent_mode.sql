-- 057 : mode agent par conversation (override persona default) — NB 2026-04-24
-- Chaque conversation (fan, client web, IG conv) peut avoir son propre mode :
-- NULL = utilise persona.mode global (défaut)
-- 'auto' / 'copilot' / 'user' = override local pour cette conversation

ALTER TABLE agence_fans
  ADD COLUMN IF NOT EXISTS agent_mode TEXT
  CHECK (agent_mode IS NULL OR agent_mode IN ('auto', 'copilot', 'user'));

ALTER TABLE agence_clients
  ADD COLUMN IF NOT EXISTS agent_mode TEXT
  CHECK (agent_mode IS NULL OR agent_mode IN ('auto', 'copilot', 'user'));

ALTER TABLE instagram_conversations
  ADD COLUMN IF NOT EXISTS agent_mode TEXT
  CHECK (agent_mode IS NULL OR agent_mode IN ('auto', 'copilot', 'user'));

COMMENT ON COLUMN agence_fans.agent_mode IS 'Override mode agent IA pour cette conversation (NULL = utilise persona.mode)';
COMMENT ON COLUMN agence_clients.agent_mode IS 'Override mode agent IA pour cette conversation web (NULL = utilise persona.mode)';
COMMENT ON COLUMN instagram_conversations.agent_mode IS 'Override mode agent IA pour cette conversation IG (NULL = utilise persona.mode)';

CREATE INDEX IF NOT EXISTS agence_fans_agent_mode_idx ON agence_fans(agent_mode) WHERE agent_mode IS NOT NULL;
CREATE INDEX IF NOT EXISTS agence_clients_agent_mode_idx ON agence_clients(agent_mode) WHERE agent_mode IS NOT NULL;

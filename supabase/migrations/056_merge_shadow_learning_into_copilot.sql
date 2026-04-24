-- 056 : fusion modes shadow + learning → copilot — NB 2026-04-24
-- Raison : Shadow (draft-review) et Learning (feedback-loop) se recouvrent fonctionnellement
-- dès qu'on veut que l'agent apprenne des corrections humaines. Un seul mode Copilote
-- couvre les deux : user écrit + envoie, agent génère en parallèle (sent=false) et
-- stocke pour training. Aligné avec Intercom Fin "Suggest replies" / Zendesk Agent Assist /
-- GitHub Copilot.

-- 1. Migrer les valeurs existantes
UPDATE agent_personas SET mode = 'copilot' WHERE mode IN ('shadow', 'learning');

-- 2. Remplacer la contrainte CHECK
ALTER TABLE agent_personas DROP CONSTRAINT IF EXISTS agent_personas_mode_check;
ALTER TABLE agent_personas ADD CONSTRAINT agent_personas_mode_check
  CHECK (mode IN ('auto', 'user', 'copilot'));

COMMENT ON COLUMN agent_personas.mode IS
  'Mode agent IA : auto (répond seul) / copilot (user répond, agent observe+apprend) / user (100% humain)';

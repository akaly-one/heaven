-- 059 : Ajoute colonne ai_run_id à agence_messages (FIX bug silent insert)
--
-- Contexte : le code /api/messages route.ts (fonction triggerWebAutoReply)
-- insère les réponses agent IA avec ai_run_id pour tracer le run. Migration
-- 054 avait ajouté ai_run_id uniquement à instagram_messages, mais pas à
-- agence_messages. Résultat : Postgres rejette l'insert (column does not
-- exist) → l'agent génère la réponse dans ai_runs mais n'insère jamais
-- dans agence_messages → admin/fan voit rien, agent IA semble silencieux.
--
-- Symptôme : ai_runs contient des runs avec output_message, mais
-- agence_messages n'a pas la réponse "model" correspondante.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'agence_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'agence_messages' AND column_name = 'ai_run_id'
  ) THEN
    ALTER TABLE agence_messages ADD COLUMN ai_run_id UUID REFERENCES ai_runs(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agence_messages_ai_run_id
  ON agence_messages(ai_run_id) WHERE ai_run_id IS NOT NULL;

COMMENT ON COLUMN agence_messages.ai_run_id IS
  'Lien vers ai_runs pour les messages générés par l''agent IA (trace run + audit). NULL pour messages humains (fan/admin/model).';

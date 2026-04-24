-- 058 : Ajoute le provider "groq-direct" manquant (FK fix ai_runs.provider_id)
--
-- Le code (messages/route.ts, process-ig-replies/route.ts, agence/ai/test, dev/test-ai)
-- insère `provider_id: "groq-direct-llama-3.3-70b"` pour distinguer l'appel direct
-- à l'API Groq gratuite (14 400 req/jour) de l'appel routé via OpenRouter.
--
-- Avant ce seed : FK violation silencieuse sur ai_runs.insert → aucun run loggé
-- malgré les réponses IA bien générées et publiées dans agence_messages.

INSERT INTO ai_providers (id, display_name, endpoint, cost_in, cost_out, max_tokens, temperature, nsfw_ok, priority, active) VALUES
  ('groq-direct-llama-3.3-70b', 'Groq Direct Llama 3.3 70B', 'https://api.groq.com/openai/v1/chat/completions', 0.00, 0.00, 256, 0.80, false, 5, true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  endpoint = EXCLUDED.endpoint,
  cost_in = EXCLUDED.cost_in,
  cost_out = EXCLUDED.cost_out,
  priority = EXCLUDED.priority;

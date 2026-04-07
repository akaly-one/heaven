-- 018: Set Paloma's PayPal handle in model config (for PayPal.me links)
UPDATE agence_models
SET config = COALESCE(config, '{}'::jsonb) || '{"paypal_handle": "pika5811"}'::jsonb
WHERE slug = 'paloma';

-- 018: Set Paloma's PayPal email in model config
UPDATE agence_models
SET config = COALESCE(config, '{}'::jsonb) || '{"paypal_email": "pika5811@gmail.com"}'::jsonb
WHERE slug = 'paloma';

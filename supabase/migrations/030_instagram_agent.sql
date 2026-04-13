-- Migration 030: Instagram AI Agent tables
-- Date: 2026-04-13
-- Module: Social Responder Instagram (@yumiiiclub)

-- ═══ Config per model ═══
CREATE TABLE IF NOT EXISTS instagram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  ig_handle TEXT NOT NULL,
  ig_business_id TEXT,
  page_access_token TEXT,
  default_mode TEXT DEFAULT 'human' CHECK (default_mode IN ('agent', 'human')),
  ai_model TEXT DEFAULT 'anthropic/claude-sonnet-4-20250514',
  system_prompt TEXT,
  max_history INT DEFAULT 10,
  auto_reply_delay_ms INT DEFAULT 2000,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ Conversations ═══
CREATE TABLE IF NOT EXISTS instagram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_slug TEXT NOT NULL,
  ig_user_id TEXT NOT NULL,
  ig_username TEXT,
  mode TEXT DEFAULT 'agent' CHECK (mode IN ('agent', 'human')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_slug, ig_user_id)
);

-- ═══ Messages ═══
CREATE TABLE IF NOT EXISTS instagram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'human')),
  content TEXT NOT NULL,
  ig_message_id TEXT,
  ai_model_used TEXT,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ Indexes ═══
CREATE INDEX idx_ig_conv_model ON instagram_conversations(model_slug, status);
CREATE INDEX idx_ig_conv_last ON instagram_conversations(last_message_at DESC);
CREATE INDEX idx_ig_msg_conv ON instagram_messages(conversation_id, created_at);
CREATE INDEX idx_ig_msg_dedup ON instagram_messages(ig_message_id) WHERE ig_message_id IS NOT NULL;

-- ═══ Seed YUMI config ═══
INSERT INTO instagram_config (model_slug, ig_handle, system_prompt, default_mode)
VALUES (
  'yumi',
  '@yumiiiclub',
  E'Tu es YUMI, creatrice de contenu exclusive sur Heaven.\nTu reponds aux messages Instagram de facon naturelle, chaleureuse et engageante.\nTu ne reveles JAMAIS que tu es une IA.\nTu guides subtilement vers ton profil Heaven pour du contenu exclusif.\nTu restes professionnelle mais accessible.\nLangue: francais par defaut, anglais si le message est en anglais.\nTu ne donnes JAMAIS de contenu gratuit ni de liens externes.\nReponses courtes (1-3 phrases max).',
  'human'
) ON CONFLICT DO NOTHING;

// OpenRouter AI — Multi-model gateway for Instagram Agent
// Docs: https://openrouter.ai/docs

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: { message: { content: string } }[];
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export async function generateReply(
  messages: Message[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<{ content: string; model: string; tokens: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const model = options?.model || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-20250514";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://heaven-os.vercel.app",
      "X-Title": "Heaven Instagram Agent",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 200,
      temperature: options?.temperature ?? 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data: OpenRouterResponse = await res.json();
  const reply = data.choices[0]?.message?.content || "";

  return {
    content: reply.trim(),
    model: data.model,
    tokens: data.usage?.total_tokens || 0,
  };
}

// Groq Cloud API — OpenAI-compatible endpoint.
// Free tier : 14 400 req/day Llama 3.3 70B. Docs : https://console.groq.com/docs
//
// Utilisé en priorité si GROQ_API_KEY set (Phase 4 V1 MVP gratuit).
// Fallback OpenRouter si GROQ_API_KEY absent mais OPENROUTER_API_KEY présent.

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  id: string;
  model: string;
  choices: { message: { content: string }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function generateReplyGroq(
  messages: Message[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<{ content: string; model: string; tokensIn: number; tokensOut: number }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const model = options?.model || process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 256,
      temperature: options?.temperature ?? 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data: GroqResponse = await res.json();
  const reply = data.choices[0]?.message?.content || "";

  return {
    content: reply.trim(),
    model: data.model,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}

/** True si une clé Groq est configurée */
export function hasGroqKey(): boolean {
  return !!process.env.GROQ_API_KEY;
}

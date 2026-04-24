// ══════════════════════════════════════════════════════════════════════════
//  DEV ONLY — test rapide de la config IA (Groq + persona Yumi).
//
//  POST /api/_dev/test-ai { message: "Hey bb ça va" }
//  Retourne { reply, provider, persona_version, latency_ms } sans envoyer
//  à Meta Graph. Sert juste à valider que la chaîne fonctionne.
//
//  Désactive cet endpoint en prod via env DISABLE_DEV_ENDPOINTS=true.
// ══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { generateReplyGroq, hasGroqKey, GROQ_DEFAULT_MODEL } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (process.env.DISABLE_DEV_ENDPOINTS === "true") {
    return NextResponse.json({ error: "dev endpoints disabled" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" && body.message.trim()
    ? body.message.trim()
    : "Hey bb ça va?";
  const modelSlug = typeof body.model_slug === "string" ? body.model_slug : "yumi";

  if (!hasGroqKey()) {
    return NextResponse.json({
      error: "GROQ_API_KEY not set in .env.local",
      hint: "Add GROQ_API_KEY=gsk_... and restart dev server",
    }, { status: 500 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "db unavailable" }, { status: 500 });

  // Fetch persona active
  const { data: persona } = await db
    .from("agent_personas")
    .select("base_prompt, version")
    .eq("model_slug", modelSlug)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const systemPrompt = persona?.base_prompt
    || "Tu es Yumi, créatrice de contenu. Réponds court et naturel.";

  const t0 = Date.now();
  try {
    const aiResp = await generateReplyGroq(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      { model: GROQ_DEFAULT_MODEL, maxTokens: 200, temperature: 0.8 }
    );

    const latency = Date.now() - t0;

    // Log dans ai_runs (même table que prod)
    await db.from("ai_runs").insert({
      conversation_id: "dev-test",
      conversation_source: "instagram",
      model_slug: modelSlug,
      provider_id: "groq-direct-llama-3.3-70b",
      persona_version: persona?.version ?? 1,
      input_message: message,
      output_message: aiResp.content,
      tokens_in: aiResp.tokensIn,
      tokens_out: aiResp.tokensOut,
      latency_ms: latency,
    });

    return NextResponse.json({
      reply: aiResp.content,
      provider: aiResp.model,
      persona_version: persona?.version ?? 1,
      tokens_in: aiResp.tokensIn,
      tokens_out: aiResp.tokensOut,
      latency_ms: latency,
    });
  } catch (err) {
    return NextResponse.json({
      error: "ai_generate_failed",
      detail: String(err).slice(0, 500),
    }, { status: 500 });
  }
}

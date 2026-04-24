/**
 * /api/agence/ai/test — Playground POST pour tester l'agent IA.
 *
 * POST { model_slug, message } → { reply, provider, latency_ms, tokens_in, tokens_out }
 *
 * N'envoie RIEN à Meta/Fanvue — purement local, pour valider persona + Groq.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { generateReplyGroq, hasGroqKey, GROQ_DEFAULT_MODEL } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.model_slug === "string" ? body.model_slug : user.model_slug || "yumi";
  const message = typeof body.message === "string" && body.message.trim()
    ? body.message.trim()
    : "Hey, tu fais quoi ?";

  if (user.role !== "root" && user.model_slug !== slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cors });
  }

  if (!hasGroqKey()) {
    return NextResponse.json({
      error: "groq_not_configured",
      hint: "Définis GROQ_API_KEY dans les variables d'environnement.",
    }, { status: 503, headers: cors });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 500, headers: cors });

  const { data: persona } = await db
    .from("agent_personas")
    .select("base_prompt, version")
    .eq("model_slug", slug)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const systemPrompt = persona?.base_prompt
    || "Tu es Yumi, créatrice de contenu. Réponds court et naturel en français.";

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

    await db.from("ai_runs").insert({
      conversation_id: "cockpit-test",
      conversation_source: "test",
      model_slug: slug,
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
    }, { headers: cors });
  } catch (err) {
    return NextResponse.json({
      error: "ai_generate_failed",
      detail: String(err).slice(0, 500),
    }, { status: 500, headers: cors });
  }
}

/**
 * /api/agence/ai/settings — Persona + recent runs config lecture/écriture.
 *
 * GET  ?model_slug=yumi → { persona, recent_runs, provider_status }
 * PUT  { model_slug, base_prompt?, favorite_emojis?, favorite_endings?,
 *        trait_warmth?, trait_flirt?, is_active? }
 *
 * Auth requise (Root ou model owner).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { hasGroqKey } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });

  const slug = req.nextUrl.searchParams.get("model_slug") || user.model_slug || "yumi";

  // Gate: root voit tout, model = son propre slug uniquement.
  if (user.role !== "root" && user.model_slug !== slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cors });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 500, headers: cors });

  const { data: personaRaw } = await db
    .from("agent_personas")
    .select("id, model_slug, version, is_active, mode, base_prompt, default_provider, trait_warmth, trait_flirt, favorite_emojis, favorite_endings, promoted_at, created_at")
    .eq("model_slug", slug)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Normalise arrays → strings pour l'UI (DB = text[]).
  const persona = personaRaw ? {
    ...personaRaw,
    favorite_emojis: Array.isArray(personaRaw.favorite_emojis) ? personaRaw.favorite_emojis.join("") : (personaRaw.favorite_emojis ?? ""),
    favorite_endings: Array.isArray(personaRaw.favorite_endings) ? personaRaw.favorite_endings.join(", ") : (personaRaw.favorite_endings ?? ""),
    updated_at: personaRaw.promoted_at || personaRaw.created_at,
  } : null;

  const { data: recentRuns } = await db
    .from("ai_runs")
    .select("id, conversation_source, provider_id, input_message, output_message, tokens_in, tokens_out, latency_ms, safety_blocked, error_message, created_at")
    .eq("model_slug", slug)
    .order("created_at", { ascending: false })
    .limit(15);

  const { count: runs24h } = await db
    .from("ai_runs")
    .select("*", { count: "exact", head: true })
    .eq("model_slug", slug)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());

  return NextResponse.json({
    persona: persona || null,
    recent_runs: recentRuns || [],
    provider_status: {
      groq_configured: hasGroqKey(),
      runs_last_24h: runs24h || 0,
    },
  }, { headers: cors });
}

export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.model_slug === "string" ? body.model_slug : user.model_slug || "yumi";

  if (user.role !== "root" && user.model_slug !== slug) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cors });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 500, headers: cors });

  const updates: Record<string, unknown> = {};
  if (typeof body.base_prompt === "string") updates.base_prompt = body.base_prompt;
  // Emojis : string UI → text[] DB (split par glyphe)
  if (typeof body.favorite_emojis === "string") {
    updates.favorite_emojis = Array.from(body.favorite_emojis.trim() as string).filter((c: string) => c.trim().length > 0);
  }
  // Endings : string UI "a, b, c" → text[] DB
  if (typeof body.favorite_endings === "string") {
    updates.favorite_endings = body.favorite_endings
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }
  if (typeof body.trait_warmth === "number") updates.trait_warmth = body.trait_warmth;
  if (typeof body.trait_flirt === "number") updates.trait_flirt = body.trait_flirt;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  // Mode : auto | user | shadow | learning (NB 2026-04-24)
  if (typeof body.mode === "string" && ["auto", "user", "shadow", "learning"].includes(body.mode)) {
    updates.mode = body.mode;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400, headers: cors });
  }

  const { data: existing } = await db
    .from("agent_personas")
    .select("id, version")
    .eq("model_slug", slug)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "no_persona" }, { status: 404, headers: cors });
  }

  const { error: upErr } = await db
    .from("agent_personas")
    .update(updates)
    .eq("id", existing.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500, headers: cors });
  }

  return NextResponse.json({ success: true }, { headers: cors });
}

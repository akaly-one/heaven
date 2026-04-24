/**
 * /api/agence/messaging/mode — gestion du mode agent PAR conversation.
 *
 * GET  ?fan_id=xxx        → { mode: 'auto'|'copilot'|'user'|null, effective_mode, source }
 *                           (source = 'override' | 'persona_default')
 * PUT  { fan_id, mode }   → override mode pour cette conversation
 *                           mode=null remove l'override (revient au persona.mode)
 *
 * fan_id accepte :
 *  - UUID agence_fans
 *  - "pseudo:<client_id_uuid>" (client web sans fan row)
 *  - "pseudo:<ig_conversation_id_uuid>" (DM IG sans fan row)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

const VALID_MODES = ["auto", "copilot", "user"] as const;
type Mode = (typeof VALID_MODES)[number];

function parseFanParam(fanId: string): { kind: "fan" | "client" | "ig_conv"; id: string } | null {
  if (!fanId) return null;
  if (fanId.startsWith("pseudo:")) {
    // Pseudo-fan : suffix = client_id ou ig_conv_id. On tentera les 2.
    return { kind: "client", id: fanId.slice("pseudo:".length) };
  }
  return { kind: "fan", id: fanId };
}

// Retourne { mode, source } en prenant override si défini, sinon persona.mode.
async function resolveMode(
  db: ReturnType<typeof getServerSupabase>,
  modelSlug: string,
  parsed: { kind: "fan" | "client" | "ig_conv"; id: string }
): Promise<{ mode: Mode; override: Mode | null; source: "override" | "persona_default" }> {
  if (!db) return { mode: "auto", override: null, source: "persona_default" };

  let override: Mode | null = null;

  if (parsed.kind === "fan") {
    const { data } = await db.from("agence_fans").select("agent_mode").eq("id", parsed.id).maybeSingle();
    const m = (data as { agent_mode?: string | null } | null)?.agent_mode;
    if (m && VALID_MODES.includes(m as Mode)) override = m as Mode;
  } else {
    // Pseudo-fan : essai client puis ig_conversation
    const { data: c } = await db.from("agence_clients").select("agent_mode").eq("id", parsed.id).maybeSingle();
    const cm = (c as { agent_mode?: string | null } | null)?.agent_mode;
    if (cm && VALID_MODES.includes(cm as Mode)) override = cm as Mode;
    if (!override) {
      const { data: ig } = await db.from("instagram_conversations").select("agent_mode").eq("id", parsed.id).maybeSingle();
      const im = (ig as { agent_mode?: string | null } | null)?.agent_mode;
      if (im && VALID_MODES.includes(im as Mode)) override = im as Mode;
    }
  }

  if (override) return { mode: override, override, source: "override" };

  const { data: persona } = await db
    .from("agent_personas")
    .select("mode")
    .eq("model_slug", modelSlug)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const personaMode = ((persona as { mode?: string | null } | null)?.mode || "auto") as Mode;
  return { mode: personaMode, override: null, source: "persona_default" };
}

export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });

  const fanId = req.nextUrl.searchParams.get("fan_id");
  if (!fanId) return NextResponse.json({ error: "fan_id_required" }, { status: 400, headers: cors });
  const parsed = parseFanParam(fanId);
  if (!parsed) return NextResponse.json({ error: "invalid_fan_id" }, { status: 400, headers: cors });

  const modelSlug = user.model_slug || "yumi";
  const db = getServerSupabase();
  const r = await resolveMode(db, modelSlug, parsed);
  return NextResponse.json({ fan_id: fanId, ...r }, { headers: cors });
}

export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });

  const body = await req.json().catch(() => ({}));
  const fanId = typeof body.fan_id === "string" ? body.fan_id : null;
  if (!fanId) return NextResponse.json({ error: "fan_id_required" }, { status: 400, headers: cors });
  const parsed = parseFanParam(fanId);
  if (!parsed) return NextResponse.json({ error: "invalid_fan_id" }, { status: 400, headers: cors });

  const mode: Mode | null = body.mode === null ? null
    : (typeof body.mode === "string" && VALID_MODES.includes(body.mode as Mode)) ? body.mode as Mode
    : undefined as never;
  if (mode === undefined) {
    return NextResponse.json({ error: "invalid_mode", allowed: [...VALID_MODES, null] }, { status: 400, headers: cors });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "db_unavailable" }, { status: 500, headers: cors });

  if (parsed.kind === "fan") {
    const { error } = await db.from("agence_fans").update({ agent_mode: mode }).eq("id", parsed.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
  } else {
    // Pseudo-fan : tenter clients, si aucun row affecté tenter ig_conversations
    const { data: clientRow } = await db.from("agence_clients").update({ agent_mode: mode }).eq("id", parsed.id).select("id").maybeSingle();
    if (!clientRow) {
      const { error: igErr } = await db.from("instagram_conversations").update({ agent_mode: mode }).eq("id", parsed.id);
      if (igErr) return NextResponse.json({ error: igErr.message }, { status: 500, headers: cors });
    }
  }

  const modelSlug = user.model_slug || "yumi";
  const r = await resolveMode(db, modelSlug, parsed);
  return NextResponse.json({ success: true, fan_id: fanId, ...r }, { headers: cors });
}

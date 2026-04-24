import { NextRequest, NextResponse, after } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { sanitize } from "@/lib/api-utils";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId, isModelId, toSlug } from "@/lib/model-utils";
import { generateReplyGroq, hasGroqKey, GROQ_DEFAULT_MODEL } from "@/lib/groq";
import { filterOutbound, humanizeDelay } from "@/lib/ai-agent/safety";
import { decideForMode, type AgentMode } from "@/lib/ai-agent/modes";
// BRIEF-10 AG08 : inject max_tone selon access_level du fan
import { computeAccessLevel, type MaxAiTone } from "@/lib/access/tiers";

export const runtime = "nodejs";

// BRIEF-10 AG08 : contrainte tonale injectée dans le prompt persona runtime.
// Empêche l'agent IA de partir en mode explicite si le fan n'a pas été validé.
function toneInstructionFor(maxAiTone: MaxAiTone): string {
  switch (maxAiTone) {
    case "explicit":
      return "Ton explicite autorisé (fan validé).";
    case "flirt_hot":
      return "Flirt chaud autorisé, mais PAS explicite (fan age-certifié, handle pas encore validé).";
    case "flirt_light":
    default:
      return "Flirt léger uniquement, garde ça sage (fan non certifié majeur).";
  }
}

// NB 2026-04-24 : fire-and-forget auto-reply agent IA sur messages web.
// Web = filtre permissif (pas NSFW bloqué), mais zero AI leak + zero confidentiality leak.
async function triggerWebAutoReply(params: {
  modelSlug: string;
  modelId: string;
  clientId: string;
  inboundText: string;
  maxAiTone: MaxAiTone;
}) {
  if (!hasGroqKey()) return;
  const db = getServerSupabase();
  if (!db) return;
  const t0 = Date.now();
  try {
    // Load persona (+ mode NB 2026-04-24)
    const { data: persona } = await db
      .from("agent_personas")
      .select("base_prompt, version, mode")
      .eq("model_slug", params.modelSlug)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Override conversation-level (agence_clients.agent_mode) > persona default
    const { data: clientRow } = await db
      .from("agence_clients")
      .select("agent_mode")
      .eq("id", params.clientId)
      .maybeSingle();
    const conversationMode = (clientRow?.agent_mode as string | null) || null;

    const mode = (conversationMode || persona?.mode || "auto") as AgentMode;
    const decision = decideForMode(mode);
    if (!decision.generate) {
      // Mode user : aucune IA, humain répond manuellement.
      return;
    }

    // Load history (5 derniers messages pour ce client)
    const { data: history } = await db
      .from("agence_messages")
      .select("sender_type, content")
      .eq("model", params.modelId)
      .eq("client_id", params.clientId)
      .order("created_at", { ascending: false })
      .limit(5);
    const historyOrdered = (history || []).reverse();

    // BRIEF-10 AG08 : injection contrainte tonale basée sur access_level
    const accessNote = toneInstructionFor(params.maxAiTone);
    const basePrompt = persona?.base_prompt
      || "Tu es Yumi, créatrice. Réponds court et naturel.";
    const systemPrompt = `${basePrompt}\n\n[CONTRAINTE ACCÈS FAN] ${accessNote}`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...historyOrdered.map((m) => ({
        role: (m.sender_type === "model" || m.sender_type === "admin" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    ];

    const aiResp = await generateReplyGroq(messages, {
      model: GROQ_DEFAULT_MODEL,
      maxTokens: 256,
      temperature: 0.8,
    });

    // Safety filter mode 'web' (permissif)
    const safety = filterOutbound(aiResp.content, "web");
    let finalText = aiResp.content;
    if (!safety.ok) {
      if (safety.action === "block" || safety.action === "rephrase") {
        finalText = safety.sanitized || "Hey bb 💜";
      }
    }

    // Humanizer delay pour simuler humain
    await humanizeDelay();

    // Log ai_run (toujours — même en shadow pour garder l'historique)
    const { data: runRow } = await db
      .from("ai_runs")
      .insert({
        conversation_id: params.clientId,
        conversation_source: "web",
        model_slug: params.modelSlug,
        provider_id: "groq-direct-llama-3.3-70b",
        persona_version: persona?.version ?? 1,
        input_message: params.inboundText,
        output_message: finalText,
        tokens_in: aiResp.tokensIn,
        tokens_out: aiResp.tokensOut,
        latency_ms: Date.now() - t0,
        safety_flags: safety.flags,
        safety_blocked: safety.action === "block",
        mode_at_run: mode,
        sent: decision.send,
      })
      .select("id")
      .maybeSingle();

    // Mode shadow : NE PAS publier dans agence_messages — le cockpit lit ai_runs
    // pour proposer le draft à valider. Mode auto/learning : publish.
    if (decision.send) {
      await db.from("agence_messages").insert({
        model: params.modelId,
        client_id: params.clientId,
        sender_type: "model",
        content: finalText,
        ...(runRow?.id ? { ai_run_id: runRow.id } : {}),
      });
    }
  } catch (err) {
    console.warn("[WebAutoReply] failed:", err);
    await db.from("ai_runs").insert({
      conversation_id: params.clientId,
      conversation_source: "web",
      model_slug: params.modelSlug,
      error_message: String(err).slice(0, 500),
      latency_ms: Date.now() - t0,
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/messages?model=yumi&client_id=xxx — List messages
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 502, headers: cors });

    const modelFilter = req.nextUrl.searchParams.get("model");
    const clientIdFilter = req.nextUrl.searchParams.get("client_id");

    // Require at least a model filter to prevent full table dump
    if (!isValidModelSlug(modelFilter)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    const normalizedModel = modelFilter ? (isModelId(modelFilter) ? modelFilter : toModelId(modelFilter)) : null;
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (modelFilter && toModelId(modelFilter) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    let q = supabase
      .from("agence_messages")
      .select("*")
      .eq("model", normalizedModel)
      .order("created_at", { ascending: false })
      .limit(500);

    if (clientIdFilter) q = q.eq("client_id", clientIdFilter);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ messages: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/messages] GET:", err);
    return NextResponse.json({ messages: [] }, { headers: cors });
  }
}

// POST /api/messages — Send a message (client or model)
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { model, client_id, sender_type, content } = body;
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    if (!isValidModelSlug(model) || !client_id || !sender_type || !content) {
      // NB 2026-04-24 Bug #3 : log structuré pour diagnostiquer 400 côté Chrome
      // Ext (ex : visiteur-b0b0 → client envoyait fan_id="pseudo:xxx" au lieu de
      // client_id UUID réel). Pas de secrets dans le log.
      console.warn("[POST /api/messages] 400 validation failed:", {
        received_keys: Object.keys(body || {}),
        model_valid: isValidModelSlug(model),
        has_client_id: !!client_id,
        client_id_looks_pseudo: typeof client_id === "string" && client_id.startsWith("pseudo:"),
        has_sender_type: !!sender_type,
        has_content: !!content,
      });
      return NextResponse.json({ error: "model, client_id, sender_type, content requis" }, { status: 400, headers: cors });
    }

    // NB 2026-04-24 Bug #3 : rejeter proprement les fan_id pseudo envoyés comme
    // client_id. Le client web devrait d'abord convertir via /api/clients (upgrade).
    if (typeof client_id === "string" && client_id.startsWith("pseudo:")) {
      console.warn("[POST /api/messages] 400 pseudo-fan client_id:", { suffix_len: client_id.length });
      return NextResponse.json({ error: "client_id invalide (pseudo-fan non upgradé)" }, { status: 400, headers: cors });
    }

    const normalizedModel = toModelId(model);

    if (sender_type === "client") {
      // Verify client_id exists in DB
      const supabase = getServerSupabase();
      if (supabase) {
        const { data: clientExists } = await supabase
          .from("agence_clients")
          .select("id")
          .eq("id", client_id)
          .maybeSingle();
        if (!clientExists) {
          return NextResponse.json({ error: "client_id invalide" }, { status: 400, headers: cors });
        }
      }
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const cleanContent = sanitize(content);
    if (!cleanContent) return NextResponse.json({ error: "Contenu vide" }, { status: 400, headers: cors });

    const { data, error } = await supabase
      .from("agence_messages")
      .insert({ model: normalizedModel, client_id, sender_type, content: cleanContent })
      .select()
      .single();

    if (error) throw error;

    // Mark messages from client as read if model or admin is replying
    if (sender_type === "model" || sender_type === "admin") {
      await supabase
        .from("agence_messages")
        .update({ read: true })
        .eq("client_id", client_id)
        .eq("sender_type", "client")
        .eq("read", false);
    }

    // NB 2026-04-24 : auto-reply agent IA (web).
    // Utilise `after()` de next/server pour garantir l'exécution post-response.
    // Le fire-and-forget classique (.catch silent) ne survit PAS toujours la
    // response HTTP sur Vercel serverless — la function est tuée dès que la
    // response est envoyée. Résultat : l'agent IA répondait au 1er message
    // (container chaud) mais rataient les suivants (container froid tué).
    if (sender_type === "client") {
      const slug = toSlug(normalizedModel);
      if (slug) {
        // BRIEF-10 AG08 : charger le client pour calculer max_tone
        const { data: clientForAccess } = await supabase
          .from("agence_clients")
          .select("age_certified, access_level, pseudo_insta, pseudo_snap, verified_handle")
          .eq("id", client_id)
          .maybeSingle();
        const decision = computeAccessLevel(clientForAccess || {});
        const maxAiTone = decision.maxAiTone;

        after(async () => {
          try {
            await triggerWebAutoReply({
              modelSlug: slug,
              modelId: normalizedModel,
              clientId: client_id,
              inboundText: cleanContent,
              maxAiTone,
            });
          } catch {
            // silent — déjà loggé dans ai_runs.error_message via le catch interne
          }
        });
      }
    }

    return NextResponse.json({ message: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/messages] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/messages?id=xxx&model=xxx — Delete a message
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  const model = req.nextUrl.searchParams.get("model");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  if (!model || !isValidModelSlug(model)) return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
  const normalizedModel = toModelId(model);
  // Model-scoping: model role can only access their own data
  const user = await getAuthUser();
  if (user && user.role === "model") {
    if (toModelId(model) !== toModelId(user.sub)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const { error } = await supabase.from("agence_messages").delete().eq("id", id).eq("model", normalizedModel);
    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/messages] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PATCH /api/messages — Mark as read or reassign client_id
export async function PATCH(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, client_id, model, action } = body;
    const normalizedModel = model ? toModelId(model) : null;
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    // Mark all client messages as read for a conversation
    if (action === "mark_read" && model && client_id) {
      const { error } = await supabase
        .from("agence_messages")
        .update({ read: true })
        .eq("model", normalizedModel!)
        .eq("client_id", client_id)
        .eq("sender_type", "client")
        .eq("read", false);
      if (error) throw error;
      return NextResponse.json({ success: true }, { headers: cors });
    }

    // Reassign a single message to a different client_id (for merge)
    if (id && client_id) {
      if (!model || !isValidModelSlug(model)) {
        return NextResponse.json({ error: "model requis pour reassign" }, { status: 400, headers: cors });
      }
      const { error } = await supabase
        .from("agence_messages")
        .update({ client_id })
        .eq("id", id)
        .eq("model", normalizedModel!);
      if (error) throw error;
      return NextResponse.json({ success: true }, { headers: cors });
    }

    return NextResponse.json({ error: "id+client_id+model ou action+model+client_id requis" }, { status: 400, headers: cors });
  } catch (err) {
    console.error("[API/messages] PATCH:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

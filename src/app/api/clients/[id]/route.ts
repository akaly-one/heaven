import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { requireRole, getModelScope, getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";
const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/clients/[id] — Full client detail with messages + codes history
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireRole(req, "root", "model");
  if (denied) return denied;

  try {
    const { id } = await params;
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const modelScope = getModelScope(req);

    // Fetch client
    let q = supabase.from("agence_clients").select("*").eq("id", id);
    if (modelScope) q = q.eq("model", modelScope);
    const { data: client, error } = await q.single();
    if (error || !client) return NextResponse.json({ error: "Client introuvable" }, { status: 404, headers: cors });

    // Fetch messages for this client
    const { data: messages } = await supabase
      .from("agence_messages")
      .select("id, sender_type, content, read, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch codes associated by client name (pseudo_snap match)
    let codes: unknown[] = [];
    if (client.pseudo_snap) {
      const { data } = await supabase
        .from("agence_codes")
        .select("code, tier, type, duration, created, expires_at, active, revoked, used")
        .eq("model", client.model)
        .eq("client", client.pseudo_snap)
        .order("created", { ascending: false })
        .limit(20);
      codes = data || [];
    }

    return NextResponse.json({ client, messages: messages || [], codes }, { headers: cors });
  } catch (err) {
    console.error("[API/clients/id] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

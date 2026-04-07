import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/clients/[id]?model=xxx — Full client detail with messages + codes history
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cors = getCorsHeaders(_req);
  try {
    const { id } = await params;
    const model = _req.nextUrl.searchParams.get("model");
    if (!model || !isValidModelSlug(model)) {
      return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    // Fetch client scoped to model
    const { data: client, error } = await supabase.from("agence_clients").select("*").eq("id", id).eq("model", model).single();
    if (error || !client) return NextResponse.json({ error: "Client introuvable" }, { status: 404, headers: cors });

    // Fetch messages for this client
    const { data: messages } = await supabase
      .from("agence_messages")
      .select("id, sender_type, content, read, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch codes associated by client_id FK OR pseudo match (snap + insta)
    let codes: unknown[] = [];
    const codeQueries = [];

    // Primary: by client_id FK
    codeQueries.push(
      supabase
        .from("agence_codes")
        .select("code, tier, type, duration, created_at, expires_at, active, revoked, used, client_id")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(20)
    );

    // Fallback: by pseudo_snap match
    if (client.pseudo_snap) {
      codeQueries.push(
        supabase
          .from("agence_codes")
          .select("code, tier, type, duration, created_at, expires_at, active, revoked, used, client_id")
          .eq("model", client.model)
          .ilike("client", client.pseudo_snap)
          .is("client_id", null)
          .order("created_at", { ascending: false })
          .limit(20)
      );
    }

    // Fallback: by pseudo_insta match
    if (client.pseudo_insta) {
      codeQueries.push(
        supabase
          .from("agence_codes")
          .select("code, tier, type, duration, created_at, expires_at, active, revoked, used, client_id")
          .eq("model", client.model)
          .ilike("client", client.pseudo_insta)
          .is("client_id", null)
          .order("created_at", { ascending: false })
          .limit(20)
      );
    }

    const results = await Promise.all(codeQueries);
    const allCodes = results.flatMap(r => r.data || []);
    // Deduplicate by code string
    const seen = new Set<string>();
    codes = allCodes.filter(c => {
      const key = (c as { code: string }).code;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ client, messages: messages || [], codes }, { headers: cors });
  } catch (err) {
    console.error("[API/clients/id] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

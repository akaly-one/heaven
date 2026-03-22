import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { requireRole, getModelScope, getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/messages?model=yumi&client_id=xxx — List messages
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ messages: [] }, { headers: cors });

    const modelFilter = getModelScope(req) || req.nextUrl.searchParams.get("model");
    const clientIdFilter = req.nextUrl.searchParams.get("client_id");

    // Require at least a model filter to prevent full table dump
    if (!modelFilter) {
      return NextResponse.json({ error: "model parameter required" }, { status: 400, headers: cors });
    }

    let q = supabase
      .from("agence_messages")
      .select("*")
      .eq("model", modelFilter)
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
  try {
    const body = await req.json();
    const { model, client_id, sender_type, content } = body;

    if (!model || !client_id || !sender_type || !content) {
      return NextResponse.json({ error: "model, client_id, sender_type, content requis" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const { data, error } = await supabase
      .from("agence_messages")
      .insert({ model, client_id, sender_type, content })
      .select()
      .single();

    if (error) throw error;

    // Mark messages from client as read if model is replying
    if (sender_type === "model") {
      await supabase
        .from("agence_messages")
        .update({ read: true })
        .eq("client_id", client_id)
        .eq("sender_type", "client")
        .eq("read", false);
    }

    return NextResponse.json({ message: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/messages] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/messages?id=xxx — Delete a message (root or model)
export async function DELETE(req: NextRequest) {
  const denied = requireRole(req, "root", "model");
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const modelScope = getModelScope(req);
    let q = supabase.from("agence_messages").delete().eq("id", id);
    if (modelScope) q = q.eq("model", modelScope);

    const { error } = await q;
    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/messages] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// Sanitize text: strip HTML tags
function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

// GET /api/messages?model=yumi&client_id=xxx — List messages
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ messages: [] }, { headers: cors });

    const modelFilter = req.nextUrl.searchParams.get("model");
    const clientIdFilter = req.nextUrl.searchParams.get("client_id");

    // Require at least a model filter to prevent full table dump
    if (!isValidModelSlug(modelFilter)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
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
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { model, client_id, sender_type, content } = body;

    if (!isValidModelSlug(model) || !client_id || !sender_type || !content) {
      return NextResponse.json({ error: "model, client_id, sender_type, content requis" }, { status: 400, headers: cors });
    }

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
      .insert({ model, client_id, sender_type, content: cleanContent })
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

    return NextResponse.json({ message: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/messages] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/messages?id=xxx — Delete a message
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const { error } = await supabase.from("agence_messages").delete().eq("id", id);
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

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    // Mark all client messages as read for a conversation
    if (action === "mark_read" && model && client_id) {
      const { error } = await supabase
        .from("agence_messages")
        .update({ read: true })
        .eq("model", model)
        .eq("client_id", client_id)
        .eq("sender_type", "client")
        .eq("read", false);
      if (error) throw error;
      return NextResponse.json({ success: true }, { headers: cors });
    }

    // Reassign a single message to a different client_id (for merge)
    if (id && client_id) {
      const { error } = await supabase
        .from("agence_messages")
        .update({ client_id })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true }, { headers: cors });
    }

    return NextResponse.json({ error: "id+client_id ou action+model+client_id requis" }, { status: 400, headers: cors });
  } catch (err) {
    console.error("[API/messages] PATCH:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

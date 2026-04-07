import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/cms/collaborators — CRUD for agence_collaborators
   ══════════════════════════════════════════════ */

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

// GET /api/cms/collaborators?model=xxx
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  if (!isValidModelSlug(model)) {
    return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
  }
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_collaborators")
      .select("*")
      .eq("model", model)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/cms/collaborators] GET error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    return NextResponse.json({ collaborators: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/cms/collaborators] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// POST /api/cms/collaborators — create collaborator
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { model, name, role, email, phone, avatar_url } = body;
    if (!isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    if (!name) {
      return NextResponse.json({ error: "name requis" }, { status: 400, headers: cors });
    }
    const supabase = requireSupabase();
    const insert: Record<string, unknown> = {
      model,
      name,
      role: role || "editor",
      active: true,
    };
    if (email) insert.email = email;
    if (phone) insert.phone = phone;
    if (avatar_url) insert.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from("agence_collaborators")
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error("[API/cms/collaborators] POST error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    return NextResponse.json({ success: true, collaborator: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/cms/collaborators] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/cms/collaborators — update collaborator
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, name, role, active, email, phone, avatar_url } = body;
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
    }
    const supabase = requireSupabase();
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from("agence_collaborators")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API/cms/collaborators] PUT error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data) {
      return NextResponse.json({ error: "Collaborateur introuvable" }, { status: 404, headers: cors });
    }
    return NextResponse.json({ success: true, collaborator: data }, { headers: cors });
  } catch (err) {
    console.error("[API/cms/collaborators] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/cms/collaborators?id=xxx
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  }
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_collaborators")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("[API/cms/collaborators] DELETE error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Collaborateur introuvable" }, { status: 404, headers: cors });
    }
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/cms/collaborators] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

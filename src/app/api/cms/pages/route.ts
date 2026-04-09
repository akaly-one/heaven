import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/cms/pages — CRUD for agence_pages
   ══════════════════════════════════════════════ */

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

// GET /api/cms/pages?model=xxx
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  if (!isValidModelSlug(model)) {
    return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
  }
  // Model-scoping: model role can only access their own data
  const user = await getAuthUser();
  if (user && user.role === "model") {
    if (model && model !== user.sub) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_pages")
      .select("*")
      .eq("model", model)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[API/cms/pages] GET error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    return NextResponse.json({ pages: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/cms/pages] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// POST /api/cms/pages — create page
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { model, title, slug, status, content, meta } = body;
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && model !== user.sub) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }
    if (!isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    if (!title || !slug) {
      return NextResponse.json({ error: "title et slug requis" }, { status: 400, headers: cors });
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_pages")
      .insert({
        model,
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        status: status || "draft",
        content: content || {},
        meta: meta || {},
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Slug deja utilise pour ce model" }, { status: 409, headers: cors });
      }
      console.error("[API/cms/pages] POST error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    return NextResponse.json({ success: true, page: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/cms/pages] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/cms/pages — update page
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, title, status, content, meta } = body;
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
    }
    // Model-scoping: model role must own the page
    const user = await getAuthUser();
    if (user && user.role === "model") {
      const sb = requireSupabase();
      const { data: page } = await sb.from("agence_pages").select("model").eq("id", id).single();
      if (page && page.model !== user.sub) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }
    const supabase = requireSupabase();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    if (content !== undefined) updates.content = content;
    if (meta !== undefined) updates.meta = meta;

    const { data, error } = await supabase
      .from("agence_pages")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API/cms/pages] PUT error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data) {
      return NextResponse.json({ error: "Page introuvable" }, { status: 404, headers: cors });
    }
    return NextResponse.json({ success: true, page: data }, { headers: cors });
  } catch (err) {
    console.error("[API/cms/pages] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/cms/pages?id=xxx
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  }
  // Model-scoping: model role must own the page
  const user = await getAuthUser();
  if (user && user.role === "model") {
    const sb = requireSupabase();
    const { data: page } = await sb.from("agence_pages").select("model").eq("id", id).single();
    if (page && page.model !== user.sub) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("agence_pages")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("[API/cms/pages] DELETE error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 502, headers: cors });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Page introuvable" }, { status: 404, headers: cors });
    }
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/cms/pages] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

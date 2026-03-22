import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { requireRole, getModelScope, getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/clients?model=yumi — List clients (root sees all, model sees own)
export async function GET(req: NextRequest) {
  const denied = requireRole(req, "root", "model");
  if (denied) return denied;

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const modelFilter = getModelScope(req) || req.nextUrl.searchParams.get("model");

    let q = supabase
      .from("agence_clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (modelFilter) q = q.eq("model", modelFilter);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ clients: data }, { headers: cors });
  } catch (err) {
    console.error("[API/clients] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// POST /api/clients — Register/upsert client (public — used by messenger widget)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model } = body;
    // Normalize pseudos to lowercase for consistent matching
    const pseudo_snap = body.pseudo_snap ? body.pseudo_snap.trim().toLowerCase() : null;
    const pseudo_insta = body.pseudo_insta ? body.pseudo_insta.trim().toLowerCase() : null;

    if (!model) return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });
    if (!pseudo_snap && !pseudo_insta) {
      return NextResponse.json({ error: "pseudo_snap ou pseudo_insta requis" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    // Case-insensitive lookup to merge duplicates (e.g. "Toto" and "toto" = same client)
    let existing = null;
    if (pseudo_snap) {
      const { data } = await supabase
        .from("agence_clients")
        .select("*")
        .eq("model", model)
        .ilike("pseudo_snap", pseudo_snap)
        .maybeSingle();
      existing = data;
    }
    if (!existing && pseudo_insta) {
      const { data } = await supabase
        .from("agence_clients")
        .select("*")
        .eq("model", model)
        .ilike("pseudo_insta", pseudo_insta)
        .maybeSingle();
      existing = data;
    }

    if (existing) {
      // Update last_active + normalize stored pseudos to lowercase
      const updates: Record<string, unknown> = { last_active: new Date().toISOString() };
      if (pseudo_snap) updates.pseudo_snap = pseudo_snap;
      if (pseudo_insta && !existing.pseudo_insta) updates.pseudo_insta = pseudo_insta;

      const { data } = await supabase
        .from("agence_clients")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();

      return NextResponse.json({ client: data, created: false }, { headers: cors });
    }

    // Create new client
    const { data, error } = await supabase
      .from("agence_clients")
      .insert({
        pseudo_snap: pseudo_snap || null,
        pseudo_insta: pseudo_insta || null,
        model,
        last_active: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ client: data, created: true }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/clients] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/clients — Update client (root or model)
export async function PUT(req: NextRequest) {
  const denied = requireRole(req, "root", "model");
  if (denied) return denied;

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    // Sanitize
    const allowed: Record<string, unknown> = {};
    const fields = ["pseudo_snap", "pseudo_insta", "nickname", "tier", "total_spent", "total_tokens_bought", "total_tokens_spent", "is_verified", "is_blocked", "notes", "firstname", "tag", "preferences", "delivery_platform"];
    for (const f of fields) {
      if (updates[f] !== undefined) allowed[f] = updates[f];
    }

    const modelScope = getModelScope(req);
    let q = supabase.from("agence_clients").update(allowed).eq("id", id);
    if (modelScope) q = q.eq("model", modelScope);

    const { data, error } = await q.select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, client: data }, { headers: cors });
  } catch (err) {
    console.error("[API/clients] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

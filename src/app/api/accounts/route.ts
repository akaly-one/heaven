import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { requireRole, getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/accounts — List all accounts (root only)
export async function GET(req: NextRequest) {
  const denied = requireRole(req, "root");
  if (denied) return denied;

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const { data, error } = await supabase
      .from("agence_accounts")
      .select("id, code, role, model_slug, display_name, active, created_at, last_login")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ accounts: data }, { headers: cors });
  } catch (err) {
    console.error("[API/accounts] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// POST /api/accounts — Create account (root only)
export async function POST(req: NextRequest) {
  const denied = requireRole(req, "root");
  if (denied) return denied;

  try {
    const body = await req.json();
    const { code, role, model_slug, display_name } = body;

    if (!code || !role || !display_name) {
      return NextResponse.json({ error: "code, role, display_name requis" }, { status: 400, headers: cors });
    }
    if (!["root", "model"].includes(role)) {
      return NextResponse.json({ error: "role doit être 'root' ou 'model'" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const { data, error } = await supabase
      .from("agence_accounts")
      .insert({ code: code.toLowerCase(), role, model_slug: model_slug || null, display_name })
      .select()
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "Code déjà existant" }, { status: 409, headers: cors });
    }
    if (error) throw error;

    return NextResponse.json({ success: true, account: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/accounts] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/accounts — Update account (root only)
export async function PUT(req: NextRequest) {
  const denied = requireRole(req, "root");
  if (denied) return denied;

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    // Sanitize allowed fields
    const allowed: Record<string, unknown> = {};
    if (updates.display_name !== undefined) allowed.display_name = updates.display_name;
    if (updates.active !== undefined) allowed.active = updates.active;
    if (updates.model_slug !== undefined) allowed.model_slug = updates.model_slug;
    if (updates.code !== undefined) allowed.code = updates.code.toLowerCase();

    const { data, error } = await supabase
      .from("agence_accounts")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, account: data }, { headers: cors });
  } catch (err) {
    console.error("[API/accounts] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/accounts?id=xxx — Delete account (root only)
export async function DELETE(req: NextRequest) {
  const denied = requireRole(req, "root");
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const { error } = await supabase.from("agence_accounts").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/accounts] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

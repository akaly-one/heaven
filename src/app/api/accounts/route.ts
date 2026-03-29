import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/accounts — List all accounts
export async function GET(_req: NextRequest) {
  const cors = getCorsHeaders(_req);
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

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

// POST /api/accounts — Create account
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { code, role, model_slug, display_name } = body;

    if (!code || !role || !display_name) {
      return NextResponse.json({ error: "code, role, display_name requis" }, { status: 400, headers: cors });
    }
    if (!["root", "model"].includes(role)) {
      return NextResponse.json({ error: "role doit etre 'root' ou 'model'" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const { data, error } = await supabase
      .from("agence_accounts")
      .insert({ code: code.toLowerCase(), role, model_slug: model_slug || null, display_name })
      .select()
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "Code deja existant" }, { status: 409, headers: cors });
    }
    if (error) throw error;

    return NextResponse.json({ success: true, account: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/accounts] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/accounts — Update account
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    // Handle merge action
    if (updates.action === "merge" && updates.from_slug && updates.to_slug) {
      const tables = ["agence_codes", "agence_clients", "agence_messages", "agence_posts", "agence_uploads", "agence_wall_posts"];
      for (const table of tables) {
        try { await supabase.from(table).update({ model: updates.to_slug }).eq("model", updates.from_slug); } catch {}
      }
      return NextResponse.json({ success: true }, { headers: cors });
    }

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

// DELETE /api/accounts?id=xxx — Delete account + cascade
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    // Get account to find model_slug for cascade
    const { data: account } = await supabase
      .from("agence_accounts")
      .select("model_slug")
      .eq("id", id)
      .single();

    if (account?.model_slug) {
      const model = account.model_slug;
      // Cascade delete — ignore errors for missing tables
      const tables = ["agence_codes", "agence_clients", "agence_messages", "agence_posts", "agence_uploads", "agence_wall_posts", "agence_security_alerts", "agence_models"];
      for (const table of tables) {
        try { await supabase.from(table).delete().eq("model", model); } catch {}
      }
    }

    const { error } = await supabase.from("agence_accounts").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/accounts] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

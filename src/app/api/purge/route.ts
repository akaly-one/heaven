import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

// POST /api/purge — Delete all data for a model (demo → pro transition)
// PROTECTED: requires x-admin-key header matching ADMIN_SECRET
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  // Auth check — root admin only
  const adminKey = req.headers.get("x-admin-key");
  const expectedKey = process.env.ADMIN_SECRET;
  if (!expectedKey || adminKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  try {
    const body = await req.json();
    const { table, model } = body;

    if (!table || !model) {
      return NextResponse.json({ error: "table and model required" }, { status: 400, headers: cors });
    }

    const allowed = ["agence_codes", "agence_clients", "agence_messages", "agence_posts", "agence_wall_posts", "agence_uploads"];
    if (!allowed.includes(table)) {
      return NextResponse.json({ error: "table not allowed" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 502, headers: cors });

    const { error, count } = await supabase.from(table).delete().eq("model", model);

    if (error) {
      console.error(`[API/purge] ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
    }

    return NextResponse.json({ success: true, table, deleted: count }, { headers: cors });
  } catch (err) {
    console.error("[API/purge]:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

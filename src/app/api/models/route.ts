import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

// GET /api/models — List all active models
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });
    }

    const { data, error } = await supabase
      .from("agence_accounts")
      .select("model_slug, display_name, active, model_id")
      .eq("active", true)
      .order("display_name");

    if (error || !data || data.length === 0) {
      // Fallback: query agence_models directly
      const { data: models, error: modelsError } = await supabase
        .from("agence_models")
        .select("slug, display_name, model_id, is_active")
        .eq("is_active", true)
        .order("model_number");

      if (modelsError) {
        return NextResponse.json({ error: modelsError.message }, { status: 500, headers: cors });
      }

      return NextResponse.json({
        models: (models || []).map(m => ({
          model_slug: m.slug,
          display_name: m.display_name || m.slug,
          active: true,
          model_id: m.model_id,
        }))
      }, { headers: cors });
    }

    return NextResponse.json({ models: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/models] GET list:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

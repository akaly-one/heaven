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

    // Cloisonnement CP : retourner UNIQUEMENT les modèles (m1/m2/m3), pas les
    // comptes root sans modèle attribué. Ordre canonique = model_id ASC
    // (m1 Yumi, m2 Paloma, m3 Ruby) pour que RootCpSelector présente les modèles
    // dans l'ordre attendu par NB (Yumi d'abord, puis Paloma/Ruby).
    const { data: models, error: modelsError } = await supabase
      .from("agence_models")
      .select("slug, display_name, model_id, is_active")
      .eq("is_active", true)
      .not("model_id", "is", null)
      .order("model_id", { ascending: true });

    if (modelsError) {
      return NextResponse.json({ error: modelsError.message }, { status: 500, headers: cors });
    }

    // Fallback secondaire : si agence_models vide, dériver depuis agence_accounts
    // mais TOUJOURS filtrer les comptes sans model_slug (root/heaven).
    if (!models || models.length === 0) {
      const { data, error } = await supabase
        .from("agence_accounts")
        .select("model_slug, display_name, active, model_id")
        .eq("active", true)
        .not("model_slug", "is", null)
        .not("model_id", "is", null)
        .order("model_id", { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
      }

      return NextResponse.json({ models: data || [] }, { headers: cors });
    }

    return NextResponse.json({
      models: models.map(m => ({
        model_slug: m.slug,
        display_name: m.display_name || m.slug,
        active: true,
        model_id: m.model_id,
      }))
    }, { headers: cors });
  } catch (err) {
    console.error("[API/models] GET list:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

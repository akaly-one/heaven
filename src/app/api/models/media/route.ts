import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

/**
 * GET /api/models/media?model=yumi
 * Returns media config + stats for a model.
 *
 * GET /api/models/media (no model param)
 * Returns all models media configs (for root/admin).
 */
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });
  }

  if (model) {
    if (!isValidModelSlug(model)) {
      return NextResponse.json({ error: "model slug invalide" }, { status: 400, headers: cors });
    }

    const { data, error } = await supabase
      .from("agence_media_config")
      .select("*")
      .eq("model_slug", model)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Media config not found" }, { status: 404, headers: cors });
    }

    return NextResponse.json({ media: data }, { headers: cors });
  }

  // All models
  const { data, error } = await supabase
    .from("agence_media_config")
    .select("*")
    .order("model_slug");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
  }

  return NextResponse.json({ media: data || [] }, { headers: cors });
}

/**
 * PATCH /api/models/media
 * Update media config for a model (quotas, active status).
 * Body: { model_slug, max_storage_mb?, max_uploads?, max_file_size_mb?, is_active? }
 */
export async function PATCH(req: NextRequest) {
  const cors = getCorsHeaders(req);

  try {
    const body = await req.json();
    const { model_slug, ...updates } = body;

    if (!isValidModelSlug(model_slug)) {
      return NextResponse.json({ error: "model_slug requis" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });
    }

    const allowed: Record<string, boolean> = {
      max_storage_mb: true,
      max_uploads: true,
      max_file_size_mb: true,
      is_active: true,
      allowed_types: true,
    };

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(updates)) {
      if (allowed[k]) dbUpdates[k] = v;
    }

    const { data, error } = await supabase
      .from("agence_media_config")
      .update(dbUpdates)
      .eq("model_slug", model_slug)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
    }

    return NextResponse.json({ media: data }, { headers: cors });
  } catch (err) {
    console.error("[API/models/media] PATCH:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

/**
 * POST /api/models/media/refresh
 * Refresh media stats from agence_uploads for a model.
 * Body: { model_slug }
 */
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  try {
    const body = await req.json();
    const { model_slug } = body;

    if (!isValidModelSlug(model_slug)) {
      return NextResponse.json({ error: "model_slug requis" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });
    }

    // Call the DB function to refresh stats
    const { error } = await supabase.rpc("refresh_media_stats", { p_slug: model_slug });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
    }

    // Return updated config
    const { data } = await supabase
      .from("agence_media_config")
      .select("*")
      .eq("model_slug", model_slug)
      .single();

    return NextResponse.json({ media: data }, { headers: cors });
  } catch (err) {
    console.error("[API/models/media] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

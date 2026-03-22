import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, requireRole, getModelScope } from "@/lib/auth";

const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/models/[slug] — Get model public profile
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });
    }

    const { data: account } = await supabase
      .from("agence_accounts")
      .select("display_name, model_slug, active")
      .eq("model_slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404, headers: cors });
    }

    const { data: modelInfo } = await supabase
      .from("agence_models")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    return NextResponse.json({
      slug: account.model_slug,
      display_name: account.display_name,
      active: account.active,
      bio: modelInfo?.bio || null,
      avatar: modelInfo?.avatar || null,
      banner: modelInfo?.banner || null,
      online: modelInfo?.online || false,
      status: modelInfo?.status || null,
    }, { headers: cors });
  } catch (err) {
    console.error("[API/models] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/models/[slug] — Update model profile (avatar, status, online, bio)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const denied = await requireRole(req, "root", "model");
  if (denied) return denied;

  const { slug } = await params;

  // Model users can only update their own profile
  const modelScope = await getModelScope(req);
  if (modelScope && modelScope !== slug) {
    return NextResponse.json({ error: "Acces non autorise" }, { status: 403, headers: cors });
  }

  try {
    const body = await req.json();
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });
    }

    // Handle display_name separately (stored in agence_accounts, not agence_models)
    if (body.display_name !== undefined) {
      await supabase
        .from("agence_accounts")
        .update({ display_name: body.display_name })
        .eq("model_slug", slug);
    }

    // Only allow specific fields for agence_models
    const allowed: Record<string, unknown> = {};
    const fields = ["avatar", "bio", "online", "status", "banner"];
    for (const f of fields) {
      if (body[f] !== undefined) allowed[f] = body[f];
    }

    if (Object.keys(allowed).length === 0 && body.display_name === undefined) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400, headers: cors });
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ success: true }, { headers: cors });
    }

    // Upsert into agence_models
    const { data: existing } = await supabase
      .from("agence_models")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("agence_models")
        .update(allowed)
        .eq("slug", slug);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("agence_models")
        .insert({ slug, ...allowed });
      if (error) throw error;
    }

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/models] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

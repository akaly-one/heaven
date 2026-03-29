import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/models/[slug] — Get model public profile
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const cors = getCorsHeaders(_req);
  const { slug } = await params;

  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      // No DB — return default profile so page renders
      return NextResponse.json({
        slug,
        display_name: slug.charAt(0).toUpperCase() + slug.slice(1),
        active: true,
        bio: null,
        avatar: null,
        banner: null,
        online: false,
        status: "Creatrice exclusive",
      }, { headers: cors });
    }

    // Try to find account in DB
    const { data: account } = await supabase
      .from("agence_accounts")
      .select("display_name, model_slug, active")
      .eq("model_slug", slug)
      .eq("active", true)
      .maybeSingle();

    // Fetch extended profile if exists
    const { data: modelInfo } = await supabase
      .from("agence_models")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    // If no account in DB, return default profile so the page still renders
    // The model can set up their profile from the cockpit later
    const displayName = account?.display_name || modelInfo?.display_name || slug.charAt(0).toUpperCase() + slug.slice(1);

    return NextResponse.json({
      slug,
      display_name: displayName,
      active: account?.active ?? true,
      bio: modelInfo?.bio || null,
      avatar: modelInfo?.avatar || null,
      banner: modelInfo?.banner || null,
      online: modelInfo?.online || false,
      status: modelInfo?.status || "Creatrice exclusive",
    }, { headers: cors });
  } catch (err) {
    console.error("[API/models] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/models/[slug] — Update model profile (avatar, status, online, bio)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const cors = getCorsHeaders(req);
  const { slug } = await params;

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

    // Upsert into agence_models — include display default for NOT NULL constraint
    const { data: existing } = await supabase
      .from("agence_models")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    let upsertError;
    if (existing) {
      // Update only — no NOT NULL issue
      const { error } = await supabase
        .from("agence_models")
        .update(allowed)
        .eq("slug", slug);
      upsertError = error;
    } else {
      // Insert — fill all NOT NULL columns with defaults
      const { error } = await supabase
        .from("agence_models")
        .insert({
          slug,
          display: slug.charAt(0).toUpperCase() + slug.slice(1),
          ...allowed,
        });
      upsertError = error;
    }

    if (upsertError) {
      console.error("[API/models] PUT upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message, detail: upsertError }, { status: 500, headers: cors });
    }

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/models] PUT:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500, headers: cors });
  }
}

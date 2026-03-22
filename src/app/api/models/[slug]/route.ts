import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

    // Get model account
    const { data: account } = await supabase
      .from("agence_accounts")
      .select("display_name, model_slug, active")
      .eq("model_slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: "Modèle introuvable" }, { status: 404, headers: cors });
    }

    // Get model info from agence_models if it exists
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
      online: modelInfo?.online || false,
      status: modelInfo?.status || null,
    }, { headers: cors });
  } catch (err) {
    console.error("[API/models] GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

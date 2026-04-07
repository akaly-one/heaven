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

    // Try to find account in DB — accept both slug and model_id (mN)
    const { data: account } = await supabase
      .from("agence_accounts")
      .select("display_name, model_slug, model_id, active")
      .or(`model_slug.eq.${slug},model_id.eq.${slug}`)
      .eq("active", true)
      .maybeSingle();

    // Fetch extended profile if exists — accept both slug and model_id
    const resolvedSlug = account?.model_slug || slug;
    const { data: modelInfo } = await supabase
      .from("agence_models")
      .select("*")
      .eq("slug", resolvedSlug)
      .maybeSingle();

    // Map DB columns to API response
    const displayName = account?.display_name || modelInfo?.display || slug.charAt(0).toUpperCase() + slug.slice(1);
    const presence = modelInfo?.presence as { online?: boolean; status?: string } | null;
    const config = modelInfo?.config as { banner?: string; paypal_handle?: string } | null;

    return NextResponse.json({
      slug: account?.model_slug || slug,
      model_id: account?.model_id || null,
      display_name: displayName,
      active: account?.active ?? true,
      bio: modelInfo?.bio || null,
      avatar: modelInfo?.avatar || null,
      banner: config?.banner || null,
      online: presence?.online || false,
      status: modelInfo?.status || "Creatrice exclusive",
      paypal_handle: config?.paypal_handle || null,
      status_text: modelInfo?.status_text || null,
      status_updated_at: modelInfo?.status_updated_at || null,
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

    // Map request fields to actual DB columns
    // DB schema: id, slug, display, status, bio, avatar, presence (jsonb), config (jsonb)
    const updates: Record<string, unknown> = {};
    if (body.avatar !== undefined) updates.avatar = body.avatar;
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.status !== undefined) updates.status = body.status;
    if (body.banner !== undefined) {
      // banner stored in config jsonb
      updates.config = { ...(body.config || {}), banner: body.banner };
    }
    if (body.online !== undefined) {
      // online stored in presence jsonb
      updates.presence = { online: body.online, status: body.online ? "online" : "offline" };
    }
    if (body.status_text !== undefined) {
      updates.status_text = body.status_text;
      updates.status_updated_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0 && body.display_name === undefined) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400, headers: cors });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true }, { headers: cors });
    }

    // Upsert: try update first, if no row matched then insert
    updates.updated_at = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("agence_models")
      .update(updates)
      .eq("slug", slug)
      .select();

    if (updateError) {
      console.error("[API/models] PUT update error:", updateError);
      return NextResponse.json({ error: updateError.message, detail: updateError }, { status: 500, headers: cors });
    }

    // If no row was updated, insert a new record
    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from("agence_models")
        .insert({ slug, ...updates })
        .select();

      if (insertError) {
        console.error("[API/models] PUT insert error:", insertError);
        return NextResponse.json({ error: insertError.message, detail: insertError }, { status: 500, headers: cors });
      }
    }

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/models] PUT:", err);
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500, headers: cors });
  }
}

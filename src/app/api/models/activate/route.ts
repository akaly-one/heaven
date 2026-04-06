import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";

/**
 * POST /api/models/activate — Activate a model in Heaven
 * Called by SQWENSY OS CP Agence when root activates a model.
 *
 * Body: { slug, display_name, avatar?, color?, activated_by? }
 * Returns: { model_id, model_number, slug }
 *
 * Flow:
 * 1. Ensure model record exists in agence_models
 * 2. Call activate_model() RPC to assign MODEL-XX id
 * 3. Initialize default packs if none exist
 * 4. Return activation data
 */

const SYNC_SECRET = process.env.HEAVEN_SYNC_SECRET;

const DEFAULT_PACKS = [
  { pack_id: "basic", name: "Basic", price: 50, color: "#60A5FA", sort_order: 1, features: ["5 photos", "Chat basic"], face: false },
  { pack_id: "premium", name: "Premium", price: 100, color: "#A855F7", sort_order: 2, features: ["15 photos", "3 videos", "Chat prioritaire"], face: false },
  { pack_id: "vip", name: "VIP", price: 200, color: "#F59E0B", sort_order: 3, features: ["Acces complet", "Videos exclusives", "Chat direct", "Contenu personnalise"], face: true, badge: "VIP" },
];

export async function POST(request: Request) {
  const cors = getCorsHeaders(request as any);

  // Auth: either HEAVEN_SYNC_SECRET header or session-based root
  const secret = request.headers.get("x-sync-secret");
  if (SYNC_SECRET && secret !== SYNC_SECRET) {
    // Check session auth as fallback
    const authHeader = request.headers.get("x-heaven-auth");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const auth = JSON.parse(authHeader);
      if (auth.role !== "root") {
        return NextResponse.json({ error: "Root access required" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid auth" }, { status: 401 });
    }
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB non configuree" }, { status: 500 });
  }

  try {
    const { slug, display_name, avatar, color, activated_by } = await request.json();

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "slug requis" }, { status: 400 });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    // 1. Ensure model record exists
    const { data: existing } = await supabase
      .from("agence_models")
      .select("id, slug, model_id, is_active")
      .eq("slug", cleanSlug)
      .single();

    if (!existing) {
      // Create model record
      const displayName = display_name || cleanSlug.toUpperCase();
      const { error: createErr } = await supabase
        .from("agence_models")
        .insert({
          slug: cleanSlug,
          display: displayName,
          display_name: displayName,
          avatar: avatar || null,
          status: "Creatrice exclusive",
        });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
    }

    // 2. Activate model (assigns MODEL-XX id)
    const { data: activation, error: activateErr } = await supabase
      .rpc("activate_model", {
        p_slug: cleanSlug,
        p_activated_by: activated_by || "root",
      });

    if (activateErr) {
      return NextResponse.json({ error: activateErr.message }, { status: 500 });
    }

    const result = Array.isArray(activation) ? activation[0] : activation;

    // 3. Initialize default packs if none exist
    const { data: existingPacks } = await supabase
      .from("agence_packs")
      .select("id")
      .eq("model", cleanSlug)
      .limit(1);

    if (!existingPacks || existingPacks.length === 0) {
      const packRows = DEFAULT_PACKS.map(p => ({
        ...p,
        model: cleanSlug,
        active: true,
        features: p.features,
        bonuses: {},
      }));
      await supabase.from("agence_packs").insert(packRows);
    }

    // 4. Update color if provided
    if (color) {
      await supabase
        .from("agence_models")
        .update({ config: { color } })
        .eq("slug", cleanSlug);
    }

    // 5. Ensure media config exists (provision_model_media is called by activate_model RPC,
    //    but also ensure it via direct insert as fallback)
    await supabase
      .from("agence_media_config")
      .upsert({
        model_slug: cleanSlug,
        folder_root: `heaven/${cleanSlug}`,
        folder_content: `heaven/${cleanSlug}/content`,
        folder_avatar: `heaven/${cleanSlug}/avatar`,
        folder_banner: `heaven/${cleanSlug}/banner`,
      }, { onConflict: "model_slug" });

    // 6. Create Cloudinary folders by uploading a placeholder (Cloudinary creates folders on first upload)
    // The actual folder creation happens naturally when the model uploads their first content.

    return NextResponse.json({
      success: true,
      model_id: result?.model_id,
      model_number: result?.model_number,
      slug: cleanSlug,
      display_name: display_name || cleanSlug.toUpperCase(),
      media: {
        folder_root: `heaven/${cleanSlug}`,
        folder_content: `heaven/${cleanSlug}/content`,
        folder_avatar: `heaven/${cleanSlug}/avatar`,
        folder_banner: `heaven/${cleanSlug}/banner`,
      },
    }, { headers: cors });
  } catch (err) {
    console.error("[Model activate]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * GET /api/models/activate — List model registry with stats
 */
export async function GET(request: Request) {
  const secret = request.headers.get("x-sync-secret");
  const authHeader = request.headers.get("x-heaven-auth");

  if (SYNC_SECRET && secret !== SYNC_SECRET && !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "DB non configuree" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("heaven_model_registry")
    .select("*");

  if (error) {
    // View might not exist yet — fallback to basic query
    const { data: models } = await supabase
      .from("agence_models")
      .select("*")
      .order("model_number");
    return NextResponse.json({ models: models || [] });
  }

  return NextResponse.json({ models: data || [] });
}

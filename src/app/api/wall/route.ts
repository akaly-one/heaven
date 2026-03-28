import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

// Sanitize text: strip HTML tags
function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

/** GET /api/wall?model=yumi — List public wall posts */
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const model = req.nextUrl.searchParams.get("model");
    if (!model) return NextResponse.json({ posts: [] }, { headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ posts: [] }, { headers: cors });

    const { data, error } = await supabase
      .from("agence_wall_posts")
      .select("*")
      .eq("model", model)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ posts: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/wall] GET:", err);
    return NextResponse.json({ posts: [] }, { headers: cors });
  }
}

/** POST /api/wall — Create a public wall post (requires snap or insta handle as identity) */
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { model } = body;

    // Sanitize user inputs
    const pseudo = body.pseudo ? sanitize(body.pseudo) : "";
    const content = body.content ? sanitize(body.content) : "";
    const photo_url = body.photo_url || null;
    const pseudo_snap = body.pseudo_snap ? sanitize(body.pseudo_snap) : null;
    const pseudo_insta = body.pseudo_insta ? sanitize(body.pseudo_insta) : null;
    const client_id = body.client_id || null;

    if (!isValidModelSlug(model) || !pseudo) {
      return NextResponse.json({ error: "model and pseudo required" }, { status: 400, headers: cors });
    }
    if (!content && !photo_url) {
      return NextResponse.json({ error: "content or photo required" }, { status: 400, headers: cors });
    }

    // Length limits
    if (pseudo.length > 30) return NextResponse.json({ error: "pseudo too long" }, { status: 400, headers: cors });
    if (content && content.length > 500) return NextResponse.json({ error: "content too long (500 max)" }, { status: 400, headers: cors });

    // Validate photo_url if provided (must be https Cloudinary URL)
    if (photo_url && !photo_url.startsWith("https://res.cloudinary.com/")) {
      return NextResponse.json({ error: "Invalid photo URL" }, { status: 400, headers: cors });
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: cors });

    // Auto-link to client: find or create by snap/insta handle
    let resolvedClientId = client_id;
    if (!resolvedClientId && (pseudo_snap || pseudo_insta)) {
      const handle = pseudo_snap || pseudo_insta;
      const field = pseudo_snap ? "pseudo_snap" : "pseudo_insta";
      const { data: existing } = await supabase
        .from("agence_clients")
        .select("id")
        .eq("model", model)
        .ilike(field, handle!)
        .maybeSingle();

      if (existing) {
        resolvedClientId = existing.id;
        // Update last_active
        await supabase.from("agence_clients").update({ last_active: new Date().toISOString() }).eq("id", existing.id);
      } else {
        // Create new client record
        const { data: newClient } = await supabase
          .from("agence_clients")
          .insert({
            model,
            pseudo_snap: pseudo_snap?.toLowerCase() || null,
            pseudo_insta: pseudo_insta?.toLowerCase() || null,
            last_active: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (newClient) resolvedClientId = newClient.id;
      }
    }

    const insertData: Record<string, unknown> = {
      model, pseudo, content: content || null, photo_url, pseudo_snap, pseudo_insta,
    };
    // Only include client_id if the column exists (graceful)
    if (resolvedClientId) insertData.client_id = resolvedClientId;

    const { data, error } = await supabase
      .from("agence_wall_posts")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If client_id column doesn't exist yet, retry without it
      if (error.message?.includes("client_id")) {
        const { data: d2, error: e2 } = await supabase
          .from("agence_wall_posts")
          .insert({ model, pseudo, content: content || null, photo_url, pseudo_snap, pseudo_insta })
          .select()
          .single();
        if (e2) throw e2;
        return NextResponse.json({ post: d2 }, { status: 201, headers: cors });
      }
      throw error;
    }
    return NextResponse.json({ post: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/wall] POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

/** DELETE /api/wall?id=xxx — Delete a wall post (model/admin only) */
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: cors });

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: cors });

    const { error } = await supabase.from("agence_wall_posts").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/wall] DELETE:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

/** PUT /api/wall — Update a wall post or react (model actions) */
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, action } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: cors });

    // Like/unlike a wall post
    if (action === "like") {
      const { data: post } = await supabase.from("agence_wall_posts").select("likes_count").eq("id", id).single();
      if (post) {
        const current = post.likes_count || 0;
        await supabase.from("agence_wall_posts").update({ likes_count: current + 1 }).eq("id", id);
      }
      return NextResponse.json({ success: true }, { headers: cors });
    }

    if (action === "dislike") {
      const { data: post } = await supabase.from("agence_wall_posts").select("likes_count").eq("id", id).single();
      if (post) {
        const current = post.likes_count || 0;
        await supabase.from("agence_wall_posts").update({ likes_count: Math.max(0, current - 1) }).eq("id", id);
      }
      return NextResponse.json({ success: true }, { headers: cors });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: cors });
  } catch (err) {
    console.error("[API/wall] PUT:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: cors });
  }
}

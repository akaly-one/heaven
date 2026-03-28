import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// Sanitize text: strip HTML tags
function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

// GET /api/posts?model=yumi — List posts (public)
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ posts: [] }, { headers: cors });

    const model = req.nextUrl.searchParams.get("model");
    if (model && !isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }

    let q = supabase
      .from("agence_posts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (model) q = q.eq("model", model);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ posts: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/posts] GET:", err);
    return NextResponse.json({ posts: [] }, { headers: cors });
  }
}

// POST /api/posts — Create post
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const model = body.model;

    if (!isValidModelSlug(model)) return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const { data, error } = await supabase
      .from("agence_posts")
      .insert({
        model,
        content: body.content ? sanitize(body.content) : null,
        media_url: body.media_url || null,
        media_type: body.media_type || null,
        tier_required: body.tier_required || "public",
        pinned: body.pinned || false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ post: data }, { status: 201, headers: cors });
  } catch (err) {
    console.error("[API/posts] POST:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PUT /api/posts — Update post (like, pin, etc.)
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, action, client_id, content: commentContent } = body;

    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    // Like action (public) — atomic increment/decrement
    if (action === "like" && client_id) {
      const { data: existing } = await supabase
        .from("agence_post_interactions")
        .select("id")
        .eq("post_id", id)
        .eq("client_id", client_id)
        .eq("type", "like")
        .maybeSingle();

      if (existing) {
        // Unlike — atomic decrement
        await supabase.from("agence_post_interactions").delete().eq("id", existing.id);
        try {
          const { error: rpcErr } = await supabase.rpc("decrement_likes", { post_id_param: id });
          if (rpcErr) throw rpcErr;
        } catch {
          // Fallback if RPC doesn't exist: manual decrement
          const { data: p } = await supabase.from("agence_posts").select("likes_count").eq("id", id).single();
          if (p) await supabase.from("agence_posts").update({ likes_count: Math.max(0, (p.likes_count || 0) - 1) }).eq("id", id);
        }
        return NextResponse.json({ liked: false }, { headers: cors });
      } else {
        // Like — atomic increment with ON CONFLICT guard
        const { error: insertErr } = await supabase.from("agence_post_interactions").insert({ post_id: id, client_id, type: "like" });
        if (insertErr) {
          return NextResponse.json({ liked: true }, { headers: cors });
        }
        try {
          const { error: rpcErr } = await supabase.rpc("increment_likes", { post_id_param: id });
          if (rpcErr) throw rpcErr;
        } catch {
          const { data: p } = await supabase.from("agence_posts").select("likes_count").eq("id", id).single();
          if (p) await supabase.from("agence_posts").update({ likes_count: (p.likes_count || 0) + 1 }).eq("id", id);
        }
        return NextResponse.json({ liked: true }, { headers: cors });
      }
    }

    // Comment action (public) — sanitize content
    if (action === "comment" && client_id && commentContent) {
      const cleanContent = sanitize(commentContent);
      if (!cleanContent) return NextResponse.json({ error: "Contenu vide" }, { status: 400, headers: cors });

      await supabase.from("agence_post_interactions").insert({ post_id: id, client_id, type: "comment", content: cleanContent });
      // Atomic increment
      try {
        const { error: rpcErr } = await supabase.rpc("increment_comments", { post_id_param: id });
        if (rpcErr) throw rpcErr;
      } catch {
        const { data: post } = await supabase.from("agence_posts").select("comments_count").eq("id", id).single();
        if (post) await supabase.from("agence_posts").update({ comments_count: (post.comments_count || 0) + 1 }).eq("id", id);
      }
      return NextResponse.json({ success: true }, { headers: cors });
    }

    // Pin/unpin
    if (action === "pin") {
      const { data: post } = await supabase.from("agence_posts").select("pinned").eq("id", id).single();
      if (post) {
        await supabase.from("agence_posts").update({ pinned: !post.pinned }).eq("id", id);
      }
      return NextResponse.json({ success: true }, { headers: cors });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400, headers: cors });
  } catch (err) {
    console.error("[API/posts] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/posts?id=xxx
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const { error } = await supabase.from("agence_posts").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/posts] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { requireRole, getModelScope, getCorsHeaders } from "@/lib/auth";

export const runtime = "nodejs";

const cors = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/posts?model=yumi — List posts (public)
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ posts: [] }, { headers: cors });

    const model = req.nextUrl.searchParams.get("model");

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

// POST /api/posts — Create post (root or model)
export async function POST(req: NextRequest) {
  const denied = requireRole(req, "root", "model");
  if (denied) return denied;

  try {
    const body = await req.json();
    const modelScope = getModelScope(req);
    const model = modelScope || body.model;

    if (!model) return NextResponse.json({ error: "model requis" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const { data, error } = await supabase
      .from("agence_posts")
      .insert({
        model,
        content: body.content || null,
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
  try {
    const body = await req.json();
    const { id, action, client_id, content: commentContent } = body;

    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    // Like action (public)
    if (action === "like" && client_id) {
      // Check if already liked
      const { data: existing } = await supabase
        .from("agence_post_interactions")
        .select("id")
        .eq("post_id", id)
        .eq("client_id", client_id)
        .eq("type", "like")
        .maybeSingle();

      if (existing) {
        // Unlike
        await supabase.from("agence_post_interactions").delete().eq("id", existing.id);
        // Manual decrement likes
        const { data: postDec } = await supabase.from("agence_posts").select("likes_count").eq("id", id).single();
        if (postDec) {
          await supabase.from("agence_posts").update({ likes_count: Math.max(0, (postDec.likes_count || 0) - 1) }).eq("id", id);
        }
        return NextResponse.json({ liked: false }, { headers: cors });
      } else {
        await supabase.from("agence_post_interactions").insert({ post_id: id, client_id, type: "like" });
        // Manual increment likes
        const { data: postInc } = await supabase.from("agence_posts").select("likes_count").eq("id", id).single();
        if (postInc) {
          await supabase.from("agence_posts").update({ likes_count: (postInc.likes_count || 0) + 1 }).eq("id", id);
        }
        return NextResponse.json({ liked: true }, { headers: cors });
      }
    }

    // Comment action (public)
    if (action === "comment" && client_id && commentContent) {
      await supabase.from("agence_post_interactions").insert({ post_id: id, client_id, type: "comment", content: commentContent });
      // Increment comment count
      const { data: post } = await supabase.from("agence_posts").select("comments_count").eq("id", id).single();
      if (post) {
        await supabase.from("agence_posts").update({ comments_count: (post.comments_count || 0) + 1 }).eq("id", id);
      }
      return NextResponse.json({ success: true }, { headers: cors });
    }

    // Pin/unpin (admin only)
    if (action === "pin") {
      const authDenied = requireRole(req, "root", "model");
      if (authDenied) return authDenied;
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
  const denied = requireRole(req, "root", "model");
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configurée" }, { status: 500, headers: cors });

    const modelScope = getModelScope(req);
    let q = supabase.from("agence_posts").delete().eq("id", id);
    if (modelScope) q = q.eq("model", modelScope);

    const { error } = await q;
    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/posts] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

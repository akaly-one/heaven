import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { sanitize } from "@/lib/api-utils";
import { normalizeTier } from "@/lib/tier-utils";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// GET /api/posts?model=yumi — List posts (public)
// Supports pagination: ?page=1&limit=30 (default: return all for backward compat)
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 502, headers: cors });

    const model = req.nextUrl.searchParams.get("model");
    if (model && !isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }

    const type = req.nextUrl.searchParams.get("type");
    const pageParam = req.nextUrl.searchParams.get("page");
    const limitParam = req.nextUrl.searchParams.get("limit");
    const paginated = pageParam !== null;
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || "30", 10) || 30));
    const offset = (page - 1) * limit;

    if (paginated) {
      // Paginated mode: return page + total count
      let countQ = supabase.from("agence_posts").select("*", { count: "exact", head: true });
      if (model) countQ = countQ.eq("model", model);
      if (type) countQ = countQ.eq("post_type", type);
      const { count } = await countQ;
      const total = count ?? 0;

      let q = supabase
        .from("agence_posts")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (model) q = q.eq("model", model);
      if (type) q = q.eq("post_type", type);

      const { data, error } = await q;
      if (error) throw error;

      return NextResponse.json({
        posts: data || [],
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      }, { headers: cors });
    }

    // Legacy mode: return all (backward compat)
    let q = supabase
      .from("agence_posts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (model) q = q.eq("model", model);
    if (type) q = q.eq("post_type", type);

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
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model && toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

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
        tier_required: body.tier_required ? normalizeTier(body.tier_required) : "public",
        pinned: body.pinned || false,
        post_type: body.post_type || "feed",
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
    const { id, action, client_id, content: commentContent, model } = body;

    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
    if (!model || !isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

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
          const { data: p } = await supabase.from("agence_posts").select("likes_count").eq("id", id).eq("model", model).single();
          if (p) await supabase.from("agence_posts").update({ likes_count: Math.max(0, (p.likes_count || 0) - 1) }).eq("id", id).eq("model", model);
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
          const { data: p } = await supabase.from("agence_posts").select("likes_count").eq("id", id).eq("model", model).single();
          if (p) await supabase.from("agence_posts").update({ likes_count: (p.likes_count || 0) + 1 }).eq("id", id).eq("model", model);
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
        const { data: post } = await supabase.from("agence_posts").select("comments_count").eq("id", id).eq("model", model).single();
        if (post) await supabase.from("agence_posts").update({ comments_count: (post.comments_count || 0) + 1 }).eq("id", id).eq("model", model);
      }
      return NextResponse.json({ success: true }, { headers: cors });
    }

    // Pin/unpin
    if (action === "pin") {
      const { data: post } = await supabase.from("agence_posts").select("pinned").eq("id", id).eq("model", model).single();
      if (post) {
        await supabase.from("agence_posts").update({ pinned: !post.pinned }).eq("id", id).eq("model", model);
      }
      return NextResponse.json({ success: true }, { headers: cors });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400, headers: cors });
  } catch (err) {
    console.error("[API/posts] PUT:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// PATCH /api/posts — Edit post content/tier
export async function PATCH(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, content, tier_required, model } = body;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
    if (!model || !isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (toModelId(model) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const updates: Record<string, unknown> = {};
    if (content !== undefined) updates.content = content ? sanitize(content) : null;
    if (tier_required !== undefined) updates.tier_required = tier_required ? normalizeTier(tier_required) : tier_required;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Rien a modifier" }, { status: 400, headers: cors });
    }

    const { data, error } = await supabase
      .from("agence_posts")
      .update(updates)
      .eq("id", id)
      .eq("model", model)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ post: data }, { headers: cors });
  } catch (err) {
    console.error("[API/posts] PATCH:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

// DELETE /api/posts?id=xxx
export async function DELETE(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const id = req.nextUrl.searchParams.get("id");
  const model = req.nextUrl.searchParams.get("model");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400, headers: cors });
  if (!model || !isValidModelSlug(model)) {
    return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
  }
  // Model-scoping: model role can only access their own data
  const user = await getAuthUser();
  if (user && user.role === "model") {
    if (toModelId(model) !== toModelId(user.sub)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }

  try {
    const supabase = getServerSupabase();
    if (!supabase) return NextResponse.json({ error: "DB non configuree" }, { status: 500, headers: cors });

    const { error } = await supabase.from("agence_posts").delete().eq("id", id).eq("model", model);
    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (err) {
    console.error("[API/posts] DELETE:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: cors });
  }
}

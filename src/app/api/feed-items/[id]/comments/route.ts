/**
 * BRIEF-17 — Routes commentaires sur feed items
 *
 * GET    /api/feed-items/[id]/comments?limit=50&offset=0
 *        → { comments: [{id, client_id, content, created_at, client_pseudo?}], total }
 *        Join sur agence_clients pour pseudo (priorité : nickname > pseudo_insta > pseudo_snap > firstname)
 *
 * POST   /api/feed-items/[id]/comments  body { clientId, content }
 *        → { comment }   (validation 1-500 chars)
 *
 * DELETE /api/feed-items/[id]/comments?commentId=xxx  body { clientId }
 *        → soft delete (set deleted_at = now()), uniquement si owner OR admin/root
 *
 * Auth :
 *   - GET ouvert (lecture publique).
 *   - POST/DELETE vérifient clientId présent + scope role.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

class DbConnectionError extends Error {
  constructor() {
    super("Supabase not configured");
    this.name = "DbConnectionError";
  }
}

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new DbConnectionError();
  return supabase;
}

interface ClientLite {
  id: string;
  nickname: string | null;
  pseudo_insta: string | null;
  pseudo_snap: string | null;
  firstname: string | null;
}

interface CommentRow {
  id: string;
  feed_item_id: string;
  client_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

function pickPseudo(c: ClientLite | null | undefined): string | null {
  if (!c) return null;
  return c.nickname || c.pseudo_insta || c.pseudo_snap || c.firstname || null;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET — list paginated
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const cors = getCorsHeaders(req);
  try {
    const { id: feedItemId } = await ctx.params;
    if (!feedItemId) {
      return NextResponse.json(
        { error: "feed_item_id requis" },
        { status: 400, headers: cors },
      );
    }

    const limit = Math.min(
      200,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50),
    );
    const offset = Math.max(
      0,
      parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0,
    );

    const supabase = requireSupabase();

    // Total non-supprimé
    const { count, error: countErr } = await supabase
      .from("agence_feed_comments")
      .select("*", { count: "exact", head: true })
      .eq("feed_item_id", feedItemId)
      .is("deleted_at", null);
    if (countErr) {
      console.error("[API/feed-items/comments] GET count error:", countErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }

    // Page comments
    const { data: rows, error } = await supabase
      .from("agence_feed_comments")
      .select("id, feed_item_id, client_id, content, created_at")
      .eq("feed_item_id", feedItemId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      console.error("[API/feed-items/comments] GET list error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }

    const comments = (rows || []) as CommentRow[];
    const clientIds = Array.from(
      new Set(comments.map((c) => c.client_id).filter(Boolean)),
    );

    // Récupère pseudos clients
    let clientsById = new Map<string, ClientLite>();
    if (clientIds.length > 0) {
      const { data: clients, error: clErr } = await supabase
        .from("agence_clients")
        .select("id, nickname, pseudo_insta, pseudo_snap, firstname")
        .in("id", clientIds);
      if (clErr) {
        console.error(
          "[API/feed-items/comments] GET join clients error:",
          clErr,
        );
        // non bloquant : on retourne les comments sans pseudo
      } else {
        clientsById = new Map(
          ((clients || []) as ClientLite[]).map((c) => [c.id, c]),
        );
      }
    }

    const enriched = comments.map((c) => ({
      id: c.id,
      client_id: c.client_id,
      content: c.content,
      created_at: c.created_at,
      client_pseudo: pickPseudo(clientsById.get(c.client_id)),
    }));

    return NextResponse.json(
      {
        comments: enriched,
        total: count ?? enriched.length,
        limit,
        offset,
        hasMore: offset + enriched.length < (count ?? 0),
      },
      { status: 200, headers: cors },
    );
  } catch (err) {
    console.error("[API/feed-items/comments] GET:", err);
    const status = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json(
      { error: status === 502 ? "DB non configuree" : "Erreur serveur" },
      { status, headers: cors },
    );
  }
}

// ── POST — create comment
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const cors = getCorsHeaders(req);
  try {
    const { id: feedItemId } = await ctx.params;
    if (!feedItemId) {
      return NextResponse.json(
        { error: "feed_item_id requis" },
        { status: 400, headers: cors },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      clientId?: string;
      content?: string;
    };
    const clientId = (body.clientId || "").trim();
    const content = (body.content || "").trim();

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId requis" },
        { status: 400, headers: cors },
      );
    }
    if (!content || content.length < 1 || content.length > 500) {
      return NextResponse.json(
        { error: "content requis (1-500 caractères)" },
        { status: 400, headers: cors },
      );
    }

    const supabase = requireSupabase();

    // Vérifie existence feed item + scope model
    const { data: item, error: findErr } = await supabase
      .from("agence_feed_items")
      .select("id, model")
      .eq("id", feedItemId)
      .maybeSingle();
    if (findErr) {
      console.error("[API/feed-items/comments] POST find error:", findErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }
    if (!item) {
      return NextResponse.json(
        { error: "Feed item introuvable" },
        { status: 404, headers: cors },
      );
    }

    const user = await getAuthUser();
    if (
      user &&
      user.role === "model" &&
      item.model &&
      toModelId(item.model) !== toModelId(user.sub)
    ) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403, headers: cors },
      );
    }

    const { data: inserted, error: insErr } = await supabase
      .from("agence_feed_comments")
      .insert({
        feed_item_id: feedItemId,
        client_id: clientId,
        content,
      })
      .select("id, feed_item_id, client_id, content, created_at")
      .single();
    if (insErr) {
      console.error("[API/feed-items/comments] POST insert error:", insErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }

    // Récupère pseudo client pour réponse
    const { data: client } = await supabase
      .from("agence_clients")
      .select("id, nickname, pseudo_insta, pseudo_snap, firstname")
      .eq("id", clientId)
      .maybeSingle();

    const row = inserted as CommentRow;
    return NextResponse.json(
      {
        comment: {
          id: row.id,
          client_id: row.client_id,
          content: row.content,
          created_at: row.created_at,
          client_pseudo: pickPseudo(client as ClientLite | null),
        },
      },
      { status: 201, headers: cors },
    );
  } catch (err) {
    console.error("[API/feed-items/comments] POST:", err);
    const status = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json(
      { error: status === 502 ? "DB non configuree" : "Erreur serveur" },
      { status, headers: cors },
    );
  }
}

// ── DELETE — soft delete (clientId owner OR role admin/root)
// Usage : DELETE /api/feed-items/[id]/comments?commentId=xxx  body { clientId? }
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const cors = getCorsHeaders(req);
  try {
    const { id: feedItemId } = await ctx.params;
    if (!feedItemId) {
      return NextResponse.json(
        { error: "feed_item_id requis" },
        { status: 400, headers: cors },
      );
    }

    const commentId = req.nextUrl.searchParams.get("commentId") || "";
    if (!commentId) {
      return NextResponse.json(
        { error: "commentId requis (query param)" },
        { status: 400, headers: cors },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      clientId?: string;
    };
    const requesterClientId = (body.clientId || "").trim();

    const supabase = requireSupabase();

    // Récupère le comment + feed item
    const { data: comment, error: findErr } = await supabase
      .from("agence_feed_comments")
      .select("id, feed_item_id, client_id, deleted_at")
      .eq("id", commentId)
      .eq("feed_item_id", feedItemId)
      .maybeSingle();
    if (findErr) {
      console.error("[API/feed-items/comments] DELETE find error:", findErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }
    if (!comment) {
      return NextResponse.json(
        { error: "Commentaire introuvable" },
        { status: 404, headers: cors },
      );
    }
    if (comment.deleted_at) {
      // Déjà supprimé : idempotent
      return NextResponse.json(
        { success: true, alreadyDeleted: true },
        { status: 200, headers: cors },
      );
    }

    // Vérifie autorisation : owner clientId OU role root/admin
    const user = await getAuthUser();
    const isAdmin = !!user && (user.role === "root" || user.role === "model");
    const isOwner =
      !!requesterClientId && requesterClientId === comment.client_id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403, headers: cors },
      );
    }

    const { error: updErr } = await supabase
      .from("agence_feed_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);
    if (updErr) {
      console.error("[API/feed-items/comments] DELETE update error:", updErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200, headers: cors },
    );
  } catch (err) {
    console.error("[API/feed-items/comments] DELETE:", err);
    const status = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json(
      { error: status === 502 ? "DB non configuree" : "Erreur serveur" },
      { status, headers: cors },
    );
  }
}

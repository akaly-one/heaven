/**
 * BRIEF-17 — POST /api/feed-items/[id]/like
 *
 * Toggle like : insert si pas existant, delete sinon.
 * Retour : { liked: boolean, likeCount: number }
 *
 * Auth : pas obligatoire (visiteur clientId accepté).
 *        Si user authentifié + role=model, scope vérifié sur feed_item.model.
 *
 * Idempotence : conflict 23505 (UNIQUE) géré comme toggle off.
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

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── POST /api/feed-items/[id]/like — body { clientId }
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
    };
    const clientId = (body.clientId || "").trim();
    if (!clientId) {
      return NextResponse.json(
        { error: "clientId requis" },
        { status: 400, headers: cors },
      );
    }

    const supabase = requireSupabase();

    // Vérifie existence feed item + récupère model + counter actuel
    const { data: item, error: findErr } = await supabase
      .from("agence_feed_items")
      .select("id, model, like_count")
      .eq("id", feedItemId)
      .maybeSingle();
    if (findErr) {
      console.error("[API/feed-items/like] find feed item error:", findErr);
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

    // Auth scope (modèles : ne peuvent toucher qu'à leurs propres feed items)
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

    // Toggle : on cherche d'abord si like existe
    const { data: existing, error: existErr } = await supabase
      .from("agence_feed_likes")
      .select("id")
      .eq("feed_item_id", feedItemId)
      .eq("client_id", clientId)
      .maybeSingle();
    if (existErr) {
      console.error("[API/feed-items/like] check existing error:", existErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors },
      );
    }

    if (existing) {
      // Toggle OFF — delete
      const { error: delErr } = await supabase
        .from("agence_feed_likes")
        .delete()
        .eq("id", existing.id);
      if (delErr) {
        console.error("[API/feed-items/like] delete error:", delErr);
        return NextResponse.json(
          { error: "Database error" },
          { status: 502, headers: cors },
        );
      }
    } else {
      // Toggle ON — insert (gère conflict UNIQUE comme idempotent toggle off)
      const { error: insErr } = await supabase
        .from("agence_feed_likes")
        .insert({ feed_item_id: feedItemId, client_id: clientId });
      if (insErr) {
        // 23505 = unique violation = race condition, on retombe en toggle OFF
        if ((insErr as { code?: string }).code === "23505") {
          await supabase
            .from("agence_feed_likes")
            .delete()
            .eq("feed_item_id", feedItemId)
            .eq("client_id", clientId);
        } else {
          console.error("[API/feed-items/like] insert error:", insErr);
          return NextResponse.json(
            { error: "Database error" },
            { status: 502, headers: cors },
          );
        }
      }
    }

    // Re-fetch counter à jour (trigger postgres a maj agence_feed_items.like_count)
    const { data: updated, error: refetchErr } = await supabase
      .from("agence_feed_items")
      .select("like_count")
      .eq("id", feedItemId)
      .maybeSingle();
    if (refetchErr) {
      console.error("[API/feed-items/like] refetch error:", refetchErr);
    }

    // Vérifie le nouvel état (existing ? avant action → maintenant inversé)
    const liked = !existing;
    const likeCount = (updated?.like_count as number | null) ?? 0;

    return NextResponse.json(
      { liked, likeCount },
      { status: 200, headers: cors },
    );
  } catch (err) {
    console.error("[API/feed-items/like] POST:", err);
    const status = err instanceof DbConnectionError ? 502 : 500;
    return NextResponse.json(
      { error: status === 502 ? "DB non configuree" : "Erreur serveur" },
      { status, headers: cors },
    );
  }
}

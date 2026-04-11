import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";
import { getAuthUser } from "@/lib/api-auth";
import { toModelId } from "@/lib/model-utils";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/pipeline — Content Pipeline CRUD
   ══════════════════════════════════════════════ */

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET: list content items ──
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  const stage = req.nextUrl.searchParams.get("stage");

  // Model-scoping: model role can only access their own data
  const user = await getAuthUser();
  if (user && user.role === "model") {
    if (model && toModelId(model) !== toModelId(user.sub)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
    }
  }
  try {
    const supabase = requireSupabase();
    if (model && !isValidModelSlug(model)) {
      return NextResponse.json({ error: "model invalide" }, { status: 400, headers: cors });
    }
    let q = supabase
      .from("agence_content_pipeline")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (model) q = q.eq("model_slug", toModelId(model));
    if (stage) q = q.eq("stage", stage);

    const { data, error } = await q;

    if (error) {
      console.error("[API/pipeline] GET error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json({ items: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/pipeline] GET:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

// ── POST: create content item ──
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (body.model_slug && toModelId(body.model_slug) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }
    const supabase = requireSupabase();

    const payload = {
      model_slug: toModelId(body.model_slug),
      title: body.title,
      content_type: body.content_type || "photo_set",
      platforms: body.platforms || [],
      stage: body.stage || "idea",
      scheduled_date: body.scheduled_date || null,
      published_date: body.published_date || null,
      tier: body.tier || null,
      price: body.price || null,
      notes: body.notes || null,
      thumbnail_url: body.thumbnail_url || null,
    };

    if (!isValidModelSlug(body.model_slug)) {
      return NextResponse.json({ error: "model_slug requis" }, { status: 400, headers: cors });
    }
    if (!payload.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400, headers: cors }
      );
    }

    const { data, error } = await supabase
      .from("agence_content_pipeline")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[API/pipeline] POST error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json(
      { success: true, item: data },
      { status: 201, headers: cors }
    );
  } catch (err) {
    console.error("[API/pipeline] POST:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

// ── PUT: update content item ──
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, model_slug, ...updates } = body;
    // Model-scoping: model role can only access their own data
    const user = await getAuthUser();
    if (user && user.role === "model") {
      if (model_slug && toModelId(model_slug) !== toModelId(user.sub)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400, headers: cors }
      );
    }

    if (!isValidModelSlug(model_slug)) {
      return NextResponse.json(
        { error: "model_slug requis" },
        { status: 400, headers: cors }
      );
    }
    const normalizedModel = toModelId(model_slug);

    const supabase = requireSupabase();

    const allowedFields = [
      "title",
      "content_type",
      "platforms",
      "stage",
      "scheduled_date",
      "published_date",
      "tier",
      "price",
      "views",
      "likes",
      "revenue",
      "notes",
      "thumbnail_url",
    ];

    const sanitized: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("agence_content_pipeline")
      .update(sanitized)
      .eq("id", id)
      .eq("model_slug", normalizedModel)
      .select()
      .single();

    if (error) {
      console.error("[API/pipeline] PUT error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json({ success: true, item: data }, { headers: cors });
  } catch (err) {
    console.error("[API/pipeline] PUT:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

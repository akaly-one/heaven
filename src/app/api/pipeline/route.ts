import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/pipeline — Content Pipeline CRUD
   ══════════════════════════════════════════════ */

const cors = getCorsHeaders();

function requireSupabase() {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

// ── GET: list content items ──
export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model");
  const stage = req.nextUrl.searchParams.get("stage");

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

    if (model) q = q.eq("model_slug", model);
    if (stage) q = q.eq("stage", stage);

    const { data, error } = await q;

    if (error) {
      console.error("[API/pipeline] GET error:", error);
      return NextResponse.json(
        { error: "Database error", detail: error.message },
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
  try {
    const body = await req.json();
    const supabase = requireSupabase();

    const payload = {
      model_slug: body.model_slug,
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

    if (!isValidModelSlug(payload.model_slug)) {
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
        { error: "Database error", detail: error.message },
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
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400, headers: cors }
      );
    }

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
      .select()
      .single();

    if (error) {
      console.error("[API/pipeline] PUT error:", error);
      return NextResponse.json(
        { error: "Database error", detail: error.message },
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

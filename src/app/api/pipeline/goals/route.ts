import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { getCorsHeaders, isValidModelSlug } from "@/lib/auth";

export const runtime = "nodejs";

/* ══════════════════════════════════════════════
   /api/pipeline/goals — Strategic Goals CRUD
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

// ── GET: list goals ──
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const model = req.nextUrl.searchParams.get("model");
  const status = req.nextUrl.searchParams.get("status");

  try {
    const supabase = requireSupabase();
    let q = supabase
      .from("agence_goals")
      .select("*")
      .order("created_at", { ascending: false });

    if (model) q = q.eq("model_slug", model);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;

    if (error) {
      console.error("[API/goals] GET error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json({ goals: data || [] }, { headers: cors });
  } catch (err) {
    console.error("[API/goals] GET:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

// ── POST: create goal ──
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const supabase = requireSupabase();

    const payload = {
      model_slug: body.model_slug,
      title: body.title,
      category: body.category || "revenue",
      target_value: body.target_value || 0,
      current_value: body.current_value || 0,
      unit: body.unit || "EUR",
      deadline: body.deadline || null,
      status: body.status || "active",
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

    if (!payload.category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400, headers: cors }
      );
    }

    const { data, error } = await supabase
      .from("agence_goals")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[API/goals] POST error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json(
      { success: true, goal: data },
      { status: 201, headers: cors }
    );
  } catch (err) {
    console.error("[API/goals] POST:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}

// ── PUT: update goal progress ──
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  try {
    const body = await req.json();
    const { id, model_slug, ...updates } = body;

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

    const supabase = requireSupabase();

    const allowedFields = [
      "title",
      "category",
      "target_value",
      "current_value",
      "unit",
      "deadline",
      "status",
    ];

    const sanitized: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key];
    }

    // Auto-complete if current >= target
    if (
      typeof updates.current_value === "number" &&
      typeof updates.target_value === "number" &&
      updates.current_value >= updates.target_value
    ) {
      sanitized.status = "completed";
    }

    const { data, error } = await supabase
      .from("agence_goals")
      .update(sanitized)
      .eq("id", id)
      .eq("model_slug", model_slug)
      .select()
      .single();

    if (error) {
      console.error("[API/goals] PUT error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 502, headers: cors }
      );
    }

    return NextResponse.json(
      { success: true, goal: data },
      { headers: cors }
    );
  } catch (err) {
    console.error("[API/goals] PUT:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500, headers: cors }
    );
  }
}
